# Fix Invoicing & Delivery Notes - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all issues with invoices and delivery notes: missing customer address/fiscal data, missing IVA/tax breakdown, missing Santa Brisa logo, and unavailable PDF downloads in the sales flow page.

**Architecture:** The system has a Python backend (Frappe/ERPNext API at `sales.py`) that generates PDFs using Frappe Print Formats + Letterheads, and a React frontend (`SalesFlowPage.tsx`) that calls `get_invoice_pdf` / `get_delivery_note_pdf` endpoints. The PDF generation relies on Print Formats ("Santa Brisa - Factura" and "Santa Brisa - Albaran") and a Letterhead ("Santa Brisa") that must exist in ERPNext. The frontend already has the download buttons wired up, but likely fails silently when the print formats don't exist.

**Tech Stack:** Python (Frappe/ERPNext), React/TypeScript, Jinja2 templates, HTML/CSS for print formats

---

## Problems Identified

1. **No customer address/fiscal data on invoices**: `get_invoice_detail` returns `customerAddress: inv.address_display or ""` — `address_display` is only populated if the Sales Invoice has a `customer_address` link set. When creating invoices via `make_sales_invoice`, ERPNext may not auto-populate the address if the Customer doesn't have a default billing address.

2. **No IVA/tax on invoices**: When creating Sales Invoices via `create_sales_invoice`, the code uses `make_sales_invoice(order_id)` which copies items but may not apply a Sales Taxes and Charges Template. Need to ensure a default tax template ("Spain IVA 21%") is applied.

3. **No Santa Brisa logo**: The PDF generation uses `letterhead="Santa Brisa"` and `print_format="Santa Brisa - Factura"` / `"Santa Brisa - Albaran"`. These likely don't exist in the ERPNext database. Need to create them via fixtures or setup scripts.

4. **PDF download not working**: If the Print Format or Letterhead doesn't exist, `frappe.get_print()` will throw an error, which the frontend catches silently (`catch (err) { console.error(...) }`). Need to: (a) create the print formats, (b) add proper error handling with user-visible messages.

---

## Task 1: Create Santa Brisa Letterhead Setup Script

**Files:**
- Create: `frappe-app/workhub_frappe_app/setup/create_print_formats.py`

**Step 1: Write the setup script**

This script creates the Letter Head and Print Formats in ERPNext. It's idempotent (checks if they exist first).

```python
"""
Setup script for Santa Brisa print formats and letterhead.
Run via: bench execute workhub_frappe_app.setup.create_print_formats.setup_all
"""
import frappe
from frappe import _


def setup_all():
    """Create all print formats and letterhead for Santa Brisa."""
    create_letterhead()
    create_invoice_print_format()
    create_delivery_note_print_format()
    frappe.db.commit()
    print("✓ Santa Brisa print formats and letterhead created successfully")


def create_letterhead():
    """Create Santa Brisa letterhead with logo and company info."""
    if frappe.db.exists("Letter Head", "Santa Brisa"):
        print("  Letter Head 'Santa Brisa' already exists, updating...")
        doc = frappe.get_doc("Letter Head", "Santa Brisa")
    else:
        doc = frappe.new_doc("Letter Head")
        doc.name = "Santa Brisa"
        doc.letter_head_name = "Santa Brisa"

    # Use the SVG logo from the public assets
    logo_url = "/assets/workhub_frappe_app/img/logo.svg"

    doc.is_default = 1
    doc.source = "HTML"
    doc.content = f"""
<div style="display: flex; justify-content: space-between; align-items: flex-start; padding: 10px 0; border-bottom: 2px solid #E5A530;">
    <div>
        <img src="{logo_url}" alt="Santa Brisa" style="height: 50px; width: auto;">
    </div>
    <div style="text-align: right; font-size: 9px; color: #78716C; font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.5;">
        <strong style="font-size: 10px; color: #44403C;">Santa Brisa Europe SL</strong><br>
        CIF: B72846391<br>
        C/ Example Address 123<br>
        28001 Madrid, Spain<br>
        info@santabrisa.com | +34 600 000 000
    </div>
</div>
"""
    doc.footer = """
<div style="text-align: center; font-size: 8px; color: #A8A29E; padding: 8px 0; border-top: 1px solid #E8E6E3; font-family: 'Helvetica Neue', Arial, sans-serif;">
    Santa Brisa Europe SL · CIF: B72846391 · Inscrita en el Registro Mercantil de Madrid
</div>
"""
    doc.flags.ignore_permissions = True
    doc.save()
    print(f"  ✓ Letter Head 'Santa Brisa' {'updated' if frappe.db.exists('Letter Head', 'Santa Brisa') else 'created'}")


def create_invoice_print_format():
    """Create Santa Brisa invoice print format."""
    name = "Santa Brisa - Factura"
    if frappe.db.exists("Print Format", name):
        print(f"  Print Format '{name}' already exists, updating...")
        doc = frappe.get_doc("Print Format", name)
    else:
        doc = frappe.new_doc("Print Format")
        doc.name = name

    doc.doc_type = "Sales Invoice"
    doc.module = "WorkHub Frappe App"
    doc.print_format_type = "Jinja"
    doc.custom_format = 1
    doc.html = INVOICE_TEMPLATE
    doc.flags.ignore_permissions = True
    doc.save()
    print(f"  ✓ Print Format '{name}' saved")


def create_delivery_note_print_format():
    """Create Santa Brisa delivery note (albaran) print format."""
    name = "Santa Brisa - Albaran"
    if frappe.db.exists("Print Format", name):
        print(f"  Print Format '{name}' already exists, updating...")
        doc = frappe.get_doc("Print Format", name)
    else:
        doc = frappe.new_doc("Print Format")
        doc.name = name

    doc.doc_type = "Delivery Note"
    doc.module = "WorkHub Frappe App"
    doc.print_format_type = "Jinja"
    doc.custom_format = 1
    doc.html = DELIVERY_NOTE_TEMPLATE
    doc.flags.ignore_permissions = True
    doc.save()
    print(f"  ✓ Print Format '{name}' saved")


# ============================================================================
# JINJA TEMPLATES
# ============================================================================

INVOICE_TEMPLATE = """
{%- set company = frappe.get_doc("Company", doc.company) -%}
{%- set customer = frappe.get_doc("Customer", doc.customer) -%}
<style>
    @page { margin: 15mm; }
    .sb-invoice { font-family: 'Helvetica Neue', Arial, sans-serif; color: #44403C; font-size: 10px; }
    .sb-invoice h1 { font-size: 22px; font-weight: 600; color: #292524; margin: 0; }
    .sb-invoice .sb-subtitle { font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #78716C; }
    .sb-invoice table { width: 100%; border-collapse: collapse; }
    .sb-invoice th { background: #F5F4F2; color: #78716C; font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em; padding: 8px 10px; text-align: left; border-bottom: 1px solid #E8E6E3; }
    .sb-invoice td { padding: 8px 10px; border-bottom: 1px solid #E8E6E3; }
    .sb-invoice .text-right { text-align: right; }
    .sb-invoice .sb-total-row td { font-weight: 600; font-size: 12px; border-top: 2px solid #44403C; }
    .sb-invoice .sb-info-box { background: #F5F4F2; padding: 12px; border-radius: 2px; }
    .sb-invoice .sb-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em; color: #78716C; margin-bottom: 2px; }
    .sb-invoice .sb-value { font-size: 11px; color: #44403C; }
    .sb-invoice .sb-gold { color: #E5A530; }
</style>

<div class="sb-invoice">
    <!-- Header -->
    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px;">
        <div>
            <h1>FACTURA</h1>
            <p class="sb-subtitle" style="margin-top: 4px;">{{ doc.name }}</p>
        </div>
        <div style="text-align: right;">
            <p class="sb-label">Fecha de factura</p>
            <p class="sb-value">{{ frappe.format(doc.posting_date, {'fieldtype': 'Date'}) }}</p>
            <p class="sb-label" style="margin-top: 8px;">Fecha de vencimiento</p>
            <p class="sb-value">{{ frappe.format(doc.due_date, {'fieldtype': 'Date'}) if doc.due_date else '-' }}</p>
        </div>
    </div>

    <!-- Billing info: Company + Customer side by side -->
    <div style="display: flex; gap: 20px; margin-bottom: 24px;">
        <div class="sb-info-box" style="flex: 1;">
            <p class="sb-label">Emisor</p>
            <p class="sb-value" style="font-weight: 600;">{{ company.company_name or doc.company }}</p>
            <p class="sb-value">{{ company.tax_id or '' }}</p>
            {%- if doc.company_address %}
            <p class="sb-value">{{ frappe.get_doc("Address", doc.company_address).address_line1 or '' }}</p>
            <p class="sb-value">{{ frappe.get_doc("Address", doc.company_address).pincode or '' }} {{ frappe.get_doc("Address", doc.company_address).city or '' }}</p>
            {%- elif company.address %}
            <p class="sb-value">{{ company.address }}</p>
            {%- endif %}
        </div>
        <div class="sb-info-box" style="flex: 1;">
            <p class="sb-label">Cliente</p>
            <p class="sb-value" style="font-weight: 600;">{{ doc.customer_name }}</p>
            <p class="sb-value">{{ customer.tax_id or '' }}</p>
            {%- if doc.address_display %}
            <p class="sb-value">{{ doc.address_display }}</p>
            {%- elif doc.customer_address %}
            {%- set addr = frappe.get_doc("Address", doc.customer_address) %}
            <p class="sb-value">{{ addr.address_line1 or '' }}</p>
            <p class="sb-value">{{ addr.pincode or '' }} {{ addr.city or '' }}</p>
            {%- endif %}
        </div>
    </div>

    <!-- Items table -->
    <table>
        <thead>
            <tr>
                <th style="width: 50%;">Producto</th>
                <th class="text-right">Cant.</th>
                <th class="text-right">P. Unitario</th>
                <th class="text-right">Total</th>
            </tr>
        </thead>
        <tbody>
            {%- for item in doc.items %}
            <tr>
                <td>
                    <strong>{{ item.item_name }}</strong>
                    <br><span style="font-size: 9px; color: #A8A29E;">{{ item.item_code }}</span>
                </td>
                <td class="text-right">{{ item.qty }} {{ item.uom }}</td>
                <td class="text-right">{{ frappe.format(item.rate, {'fieldtype': 'Currency', 'options': doc.currency}) }}</td>
                <td class="text-right">{{ frappe.format(item.amount, {'fieldtype': 'Currency', 'options': doc.currency}) }}</td>
            </tr>
            {%- endfor %}
        </tbody>
    </table>

    <!-- Totals -->
    <div style="margin-top: 16px; display: flex; justify-content: flex-end;">
        <table style="width: 280px;">
            <tr>
                <td class="sb-label">Base imponible</td>
                <td class="text-right sb-value">{{ frappe.format(doc.net_total, {'fieldtype': 'Currency', 'options': doc.currency}) }}</td>
            </tr>
            {%- for tax in doc.taxes %}
            <tr>
                <td class="sb-label">{{ tax.description }}</td>
                <td class="text-right sb-value">{{ frappe.format(tax.tax_amount, {'fieldtype': 'Currency', 'options': doc.currency}) }}</td>
            </tr>
            {%- endfor %}
            {%- if not doc.taxes %}
            <tr>
                <td class="sb-label">IVA (0%)</td>
                <td class="text-right sb-value">{{ frappe.format(0, {'fieldtype': 'Currency', 'options': doc.currency}) }}</td>
            </tr>
            {%- endif %}
            <tr class="sb-total-row">
                <td>TOTAL</td>
                <td class="text-right">{{ frappe.format(doc.grand_total, {'fieldtype': 'Currency', 'options': doc.currency}) }}</td>
            </tr>
        </table>
    </div>

    <!-- Notes -->
    {%- if doc.remarks %}
    <div style="margin-top: 24px; padding: 10px; background: #FFF8E1; border-left: 3px solid #E5A530; font-size: 10px;">
        <p class="sb-label">Observaciones</p>
        <p>{{ doc.remarks }}</p>
    </div>
    {%- endif %}
</div>
"""

DELIVERY_NOTE_TEMPLATE = """
{%- set company = frappe.get_doc("Company", doc.company) -%}
{%- set customer = frappe.get_doc("Customer", doc.customer) -%}
<style>
    @page { margin: 15mm; }
    .sb-dn { font-family: 'Helvetica Neue', Arial, sans-serif; color: #44403C; font-size: 10px; }
    .sb-dn h1 { font-size: 22px; font-weight: 600; color: #292524; margin: 0; }
    .sb-dn .sb-subtitle { font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #78716C; }
    .sb-dn table { width: 100%; border-collapse: collapse; }
    .sb-dn th { background: #F5F4F2; color: #78716C; font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em; padding: 8px 10px; text-align: left; border-bottom: 1px solid #E8E6E3; }
    .sb-dn td { padding: 8px 10px; border-bottom: 1px solid #E8E6E3; }
    .sb-dn .text-right { text-align: right; }
    .sb-dn .sb-info-box { background: #F5F4F2; padding: 12px; border-radius: 2px; }
    .sb-dn .sb-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em; color: #78716C; margin-bottom: 2px; }
    .sb-dn .sb-value { font-size: 11px; color: #44403C; }
    .sb-dn .sb-signature { margin-top: 60px; display: flex; justify-content: space-between; }
    .sb-dn .sb-signature-line { border-top: 1px solid #44403C; width: 200px; padding-top: 4px; text-align: center; font-size: 9px; color: #78716C; }
</style>

<div class="sb-dn">
    <!-- Header -->
    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px;">
        <div>
            <h1>ALBARÁN DE ENTREGA</h1>
            <p class="sb-subtitle" style="margin-top: 4px;">{{ doc.name }}</p>
        </div>
        <div style="text-align: right;">
            <p class="sb-label">Fecha de entrega</p>
            <p class="sb-value">{{ frappe.format(doc.posting_date, {'fieldtype': 'Date'}) }}</p>
            {%- if doc.lr_no %}
            <p class="sb-label" style="margin-top: 8px;">N° Transporte</p>
            <p class="sb-value">{{ doc.lr_no }}</p>
            {%- endif %}
        </div>
    </div>

    <!-- Billing info: Company + Customer side by side -->
    <div style="display: flex; gap: 20px; margin-bottom: 24px;">
        <div class="sb-info-box" style="flex: 1;">
            <p class="sb-label">Remitente</p>
            <p class="sb-value" style="font-weight: 600;">{{ company.company_name or doc.company }}</p>
            {%- if doc.company_address %}
            <p class="sb-value">{{ frappe.get_doc("Address", doc.company_address).address_line1 or '' }}</p>
            <p class="sb-value">{{ frappe.get_doc("Address", doc.company_address).pincode or '' }} {{ frappe.get_doc("Address", doc.company_address).city or '' }}</p>
            {%- endif %}
        </div>
        <div class="sb-info-box" style="flex: 1;">
            <p class="sb-label">Destinatario</p>
            <p class="sb-value" style="font-weight: 600;">{{ doc.customer_name }}</p>
            {%- if doc.shipping_address %}
            {%- set addr = frappe.get_doc("Address", doc.shipping_address) %}
            <p class="sb-value">{{ addr.address_line1 or '' }}</p>
            <p class="sb-value">{{ addr.pincode or '' }} {{ addr.city or '' }}</p>
            {%- elif doc.address_display %}
            <p class="sb-value">{{ doc.address_display }}</p>
            {%- endif %}
        </div>
    </div>

    <!-- Items table -->
    <table>
        <thead>
            <tr>
                <th style="width: 55%;">Producto</th>
                <th class="text-right">Cantidad</th>
                <th class="text-right">UdM</th>
            </tr>
        </thead>
        <tbody>
            {%- for item in doc.items %}
            <tr>
                <td>
                    <strong>{{ item.item_name }}</strong>
                    <br><span style="font-size: 9px; color: #A8A29E;">{{ item.item_code }}</span>
                </td>
                <td class="text-right">{{ item.qty }}</td>
                <td class="text-right">{{ item.uom }}</td>
            </tr>
            {%- endfor %}
        </tbody>
    </table>

    <!-- Total items -->
    <div style="margin-top: 12px; text-align: right; font-size: 11px;">
        <strong>Total bultos: {{ doc.items | length }}</strong>
    </div>

    <!-- Notes -->
    {%- if doc.instructions %}
    <div style="margin-top: 16px; padding: 10px; background: #FFF8E1; border-left: 3px solid #E5A530; font-size: 10px;">
        <p class="sb-label">Instrucciones de entrega</p>
        <p>{{ doc.instructions }}</p>
    </div>
    {%- endif %}

    <!-- Signatures -->
    <div class="sb-signature">
        <div>
            <div class="sb-signature-line">Firma del remitente</div>
        </div>
        <div>
            <div class="sb-signature-line">Firma del destinatario</div>
        </div>
    </div>
</div>
"""
```

**Step 2: Create the `__init__.py` for the setup module**

```python
# frappe-app/workhub_frappe_app/setup/__init__.py
# (empty file)
```

**Step 3: Run the setup script on the bench**

```bash
cd /Users/martinjaimesamperiz/santabrisa/frappe-bench
bench --site santabrisa.localhost execute workhub_frappe_app.setup.create_print_formats.setup_all
```

Expected: Letter Head and Print Formats created in ERPNext DB.

**Step 4: Commit**

```bash
git add frappe-app/workhub_frappe_app/setup/
git commit -m "feat: add Santa Brisa print formats and letterhead setup script"
```

---

## Task 2: Ensure Tax Template Applied When Creating Sales Invoice

**Files:**
- Modify: `frappe-app/workhub_frappe_app/api/sales.py` (around line 1070-1095, the `create_sales_invoice` function)

**Step 1: Find and read the `create_sales_invoice` function**

Look at the existing function to understand how invoices are created.

**Step 2: Add tax template + address population**

After the invoice is created via `make_sales_invoice(order_id)` but before `doc.save()`, add:

```python
# Ensure tax template is applied (Spain IVA 21%)
if not doc.taxes_and_charges:
    default_tax = frappe.db.get_value(
        "Sales Taxes and Charges Template",
        {"is_default": 1, "company": doc.company},
        "name"
    )
    if default_tax:
        doc.taxes_and_charges = default_tax
        doc.run_method("set_other_charges")

# Ensure customer address is populated for the invoice
if not doc.customer_address and doc.customer:
    default_address = frappe.db.get_value(
        "Dynamic Link",
        {"link_doctype": "Customer", "link_name": doc.customer, "parenttype": "Address"},
        "parent"
    )
    if default_address:
        doc.customer_address = default_address
        doc.run_method("get_customer_address", {"customer_address": default_address})
```

**Step 3: Verify by creating a test invoice via the UI**

**Step 4: Commit**

```bash
git add frappe-app/workhub_frappe_app/api/sales.py
git commit -m "fix: ensure tax template and customer address on sales invoice creation"
```

---

## Task 3: Ensure Customer Address Populated on Delivery Note Creation

**Files:**
- Modify: `frappe-app/workhub_frappe_app/api/sales.py` (the `create_delivery_note` function)

**Step 1: Find and read the `create_delivery_note` function**

**Step 2: Add address population**

After the delivery note is created via `make_delivery_note(order_id)` but before `doc.save()`, add:

```python
# Ensure shipping address is populated
if not doc.shipping_address_name and doc.customer:
    default_address = frappe.db.get_value(
        "Dynamic Link",
        {"link_doctype": "Customer", "link_name": doc.customer, "parenttype": "Address"},
        "parent"
    )
    if default_address:
        doc.shipping_address_name = default_address
        doc.run_method("get_shipping_address", {"shipping_address_name": default_address})
```

**Step 3: Commit**

```bash
git add frappe-app/workhub_frappe_app/api/sales.py
git commit -m "fix: ensure shipping address on delivery note creation"
```

---

## Task 4: Add Error Handling for PDF Downloads in Frontend

**Files:**
- Modify: `web/src/pages/sales/SalesFlowPage.tsx` (lines 483-503)

**Step 1: Improve PDF download error handling with user-visible toast**

Replace the silent `console.error` with visible error feedback:

```typescript
const handleDownloadPDF = async (invoiceId: string) => {
    try {
        const response = await salesApi.getInvoicePDF(invoiceId)
        if (response.success && response.pdf_base64) {
            downloadBase64PDF(response.pdf_base64, response.filename || `${invoiceId}.pdf`)
        } else {
            alert('No se pudo generar el PDF de la factura. Verifica que el formato de impresión existe en ERPNext.')
        }
    } catch (err) {
        console.error('Error downloading invoice PDF:', err)
        alert('Error al descargar la factura. Verifica que los formatos de impresión "Santa Brisa - Factura" están configurados en ERPNext.')
    }
}

const handleDownloadDeliveryNote = async (deliveryNoteId: string) => {
    try {
        const response = await salesApi.getDeliveryNotePDF(deliveryNoteId)
        if (response.success && response.pdf_base64) {
            downloadBase64PDF(response.pdf_base64, response.filename || `${deliveryNoteId}.pdf`)
        } else {
            alert('No se pudo generar el PDF del albarán. Verifica que el formato de impresión existe en ERPNext.')
        }
    } catch (err) {
        console.error('Error downloading delivery note PDF:', err)
        alert('Error al descargar el albarán. Verifica que los formatos de impresión "Santa Brisa - Albaran" están configurados en ERPNext.')
    }
}
```

**Step 2: Commit**

```bash
git add web/src/pages/sales/SalesFlowPage.tsx
git commit -m "fix: show user-visible error when PDF download fails"
```

---

## Task 5: Add Fallback PDF Generation When Print Format Missing

**Files:**
- Modify: `frappe-app/workhub_frappe_app/api/sales.py` (lines 2263-2316)

**Step 1: Add fallback to `get_invoice_pdf`**

If the custom print format doesn't exist, fall back to the default ERPNext format:

```python
@frappe.whitelist()
def get_invoice_pdf(invoice_id):
    """Generate PDF for an invoice."""
    require_auth()
    if not invoice_id:
        frappe.throw(_("Invoice ID is required"))

    if not frappe.db.exists("Sales Invoice", invoice_id):
        frappe.throw(_("Sales Invoice {0} not found").format(invoice_id), frappe.DoesNotExistError)

    from frappe.utils.pdf import get_pdf
    import base64

    # Try custom print format first, fallback to default
    print_format = "Santa Brisa - Factura"
    letterhead = "Santa Brisa"

    if not frappe.db.exists("Print Format", print_format):
        print_format = None  # Use default
    if not frappe.db.exists("Letter Head", letterhead):
        letterhead = None  # Use default

    html = frappe.get_print("Sales Invoice", invoice_id, print_format=print_format, letterhead=letterhead)
    pdf_content = get_pdf(html)
    pdf_base64 = base64.b64encode(pdf_content).decode('utf-8')

    return {
        "success": True,
        "invoice_id": invoice_id,
        "pdf_base64": pdf_base64,
        "filename": f"{invoice_id}.pdf"
    }
```

**Step 2: Same for `get_delivery_note_pdf`**

```python
@frappe.whitelist()
def get_delivery_note_pdf(delivery_note_id):
    """Generate PDF for a delivery note (albarán)."""
    require_auth()
    if not delivery_note_id:
        frappe.throw(_("Delivery Note ID is required"))

    if not frappe.db.exists("Delivery Note", delivery_note_id):
        frappe.throw(_("Delivery Note {0} not found").format(delivery_note_id), frappe.DoesNotExistError)

    from frappe.utils.pdf import get_pdf
    import base64

    # Try custom print format first, fallback to default
    print_format = "Santa Brisa - Albaran"
    letterhead = "Santa Brisa"

    if not frappe.db.exists("Print Format", print_format):
        print_format = None
    if not frappe.db.exists("Letter Head", letterhead):
        letterhead = None

    html = frappe.get_print("Delivery Note", delivery_note_id, print_format=print_format, letterhead=letterhead)
    pdf_content = get_pdf(html)
    pdf_base64 = base64.b64encode(pdf_content).decode('utf-8')

    return {
        "success": True,
        "delivery_note_id": delivery_note_id,
        "pdf_base64": pdf_base64,
        "filename": f"{delivery_note_id}.pdf"
    }
```

**Step 3: Commit**

```bash
git add frappe-app/workhub_frappe_app/api/sales.py
git commit -m "fix: fallback to default print format when Santa Brisa format missing"
```

---

## Task 6: Enrich `get_invoice_detail` With Customer Fiscal Data

**Files:**
- Modify: `frappe-app/workhub_frappe_app/api/sales.py` (line 2183-2210)

**Step 1: Add tax_id and full address to the response**

In `get_invoice_detail`, add customer fiscal data:

```python
# Get customer tax ID
customer_tax_id = frappe.db.get_value("Customer", inv.customer, "tax_id") or ""

# Build full address if address_display is empty
customer_address = inv.address_display or ""
if not customer_address and inv.customer_address:
    addr = frappe.get_doc("Address", inv.customer_address)
    parts = [addr.address_line1, addr.address_line2, f"{addr.pincode} {addr.city}".strip(), addr.country]
    customer_address = "\n".join(p for p in parts if p)
elif not customer_address and inv.customer:
    # Try to find any address linked to this customer
    addr_name = frappe.db.get_value(
        "Dynamic Link",
        {"link_doctype": "Customer", "link_name": inv.customer, "parenttype": "Address"},
        "parent"
    )
    if addr_name:
        addr = frappe.get_doc("Address", addr_name)
        parts = [addr.address_line1, addr.address_line2, f"{addr.pincode} {addr.city}".strip(), addr.country]
        customer_address = "\n".join(p for p in parts if p)
```

Then add to the return dict:
```python
"customerAddress": customer_address,
"customerTaxId": customer_tax_id,
```

**Step 2: Update the TypeScript interface in `sales.ts`**

Add `customerTaxId?: string` to the `InvoiceDetail` interface.

**Step 3: Update `InvoiceDetailDrawer.tsx` to show tax ID**

In the customer info box, add:
```tsx
{invoice.customerTaxId && (
  <p className="text-xs text-[#78716C] font-mono">{invoice.customerTaxId}</p>
)}
```

**Step 4: Commit**

```bash
git add frappe-app/workhub_frappe_app/api/sales.py web/src/api/services/sales.ts web/src/pages/sales/components/InvoiceDetailDrawer.tsx
git commit -m "feat: show customer fiscal data (tax ID, address) in invoice detail"
```

---

## Task 7: Build Frontend & Verify

**Step 1: Build the web app**

```bash
cd /Users/martinjaimesamperiz/vibe-monorepo/apps/workhub/web
npm run build
```

**Step 2: Verify no TypeScript errors**

```bash
npx tsc --noEmit
```

**Step 3: Final commit if needed**

---

## Summary of Changes

| Problem | Root Cause | Fix |
|---------|-----------|-----|
| No address on invoices | `address_display` empty when no address linked | Populate `customer_address` during invoice creation + fallback lookup in `get_invoice_detail` |
| No fiscal data (NIF/CIF) | Not fetched from Customer doctype | Add `tax_id` lookup in `get_invoice_detail`, show in drawer |
| No IVA on invoices | No tax template applied during creation | Apply default "Sales Taxes and Charges Template" in `create_sales_invoice` |
| No logo | Print Format + Letterhead don't exist in DB | Create setup script with Santa Brisa letterhead + print formats |
| PDF download fails | `frappe.get_print` throws when format missing | Add fallback to default format + user-visible error messages |
