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
    print("Santa Brisa print formats and letterhead created successfully")


def create_letterhead():
    """Create Santa Brisa letterhead with logo and company info."""
    if frappe.db.exists("Letter Head", "Santa Brisa"):
        print("  Letter Head 'Santa Brisa' already exists, updating...")
        doc = frappe.get_doc("Letter Head", "Santa Brisa")
    else:
        doc = frappe.new_doc("Letter Head")
        doc.name = "Santa Brisa"
        doc.letter_head_name = "Santa Brisa"

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
    Santa Brisa Europe SL - CIF: B72846391 - Inscrita en el Registro Mercantil de Madrid
</div>
"""
    doc.flags.ignore_permissions = True
    doc.save()
    print("  Letter Head 'Santa Brisa' saved")


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
    print(f"  Print Format '{name}' saved")


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
    print(f"  Print Format '{name}' saved")


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
</style>

<div class="sb-invoice">
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
    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px;">
        <div>
            <h1>ALBARAN DE ENTREGA</h1>
            <p class="sb-subtitle" style="margin-top: 4px;">{{ doc.name }}</p>
        </div>
        <div style="text-align: right;">
            <p class="sb-label">Fecha de entrega</p>
            <p class="sb-value">{{ frappe.format(doc.posting_date, {'fieldtype': 'Date'}) }}</p>
            {%- if doc.lr_no %}
            <p class="sb-label" style="margin-top: 8px;">N Transporte</p>
            <p class="sb-value">{{ doc.lr_no }}</p>
            {%- endif %}
        </div>
    </div>

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

    <div style="margin-top: 12px; text-align: right; font-size: 11px;">
        <strong>Total bultos: {{ doc.items | length }}</strong>
    </div>

    {%- if doc.instructions %}
    <div style="margin-top: 16px; padding: 10px; background: #FFF8E1; border-left: 3px solid #E5A530; font-size: 10px;">
        <p class="sb-label">Instrucciones de entrega</p>
        <p>{{ doc.instructions }}</p>
    </div>
    {%- endif %}

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
