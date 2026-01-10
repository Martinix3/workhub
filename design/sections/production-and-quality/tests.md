# Test Instructions: Production & Quality

These test-writing instructions are **framework-agnostic**. Adapt them to your testing setup.

## Overview

Test manufacturing and quality control: production orders, lot traceability, HACCP monitoring, and document management.

---

## User Flow Tests

### Flow 1: Crear Orden de Produccion

**Scenario:** User creates a new production order

**Steps:**
1. Navigate to `/produccion/ordenes`
2. Click "Nueva Orden"
3. Select product (BOM loads automatically)
4. Enter target quantity and scheduled date
5. Click "Crear"

**Expected Results:**
- [ ] Product dropdown shows available products
- [ ] Selecting product loads BOM/formulation info
- [ ] System assigns lot number automatically
- [ ] `onNewOrder` called with order data
- [ ] Order appears in list as "Programada"

### Flow 2: Monitorear Lote

**Scenario:** User views lot traceability

**Steps:**
1. Navigate to `/produccion/lotes`
2. Select a lot from the list
3. View lot detail

**Expected Results:**
- [ ] Shows lot number, product, status
- [ ] Shows timeline of events
- [ ] Shows consumed materials with supplier info
- [ ] Release/Hold buttons visible based on status
- [ ] `onViewLot` called with lot ID

### Flow 3: Registrar Lectura HACCP

**Scenario:** Operator records CCP measurement

**Steps:**
1. Navigate to `/calidad/haccp`
2. Locate CCP (e.g., "Pasteurizacion")
3. Click "Registrar Lectura"
4. Enter value (e.g., "87.5C")
5. Confirm

**Expected Results:**
- [ ] CCP shows current value and last reading time
- [ ] `onRecordReading` called with CCP ID
- [ ] If within limits: status stays "normal" (green)
- [ ] If out of limits: status changes to "warning" or "critical"

#### Failure Path: Critical Limit Exceeded

**Setup:**
- CCP critical limit is "85C minimo"
- User enters "82C"

**Expected Results:**
- [ ] Alert appears immediately
- [ ] Status indicator turns red
- [ ] Suggested corrective action shown
- [ ] Reading logged with "critical" status

### Flow 4: Subir Documento

**Scenario:** User uploads a new quality document

**Steps:**
1. Navigate to `/calidad/documentos`
2. Click "Subir Documento"
3. Select file
4. Fill metadata (type, category, effective date)
5. Assign approvers
6. Submit

**Expected Results:**
- [ ] File upload works
- [ ] Type dropdown shows options (SOP, Specification, Certificate, etc.)
- [ ] `onUploadDocument` called
- [ ] Document appears as "Pendiente Aprobacion"

---

## Empty State Tests

### No Production Orders

**Setup:**
- `orders` array is empty

**Expected Results:**
- [ ] Shows "Programa tu primera orden de produccion"
- [ ] CTA button visible

### No Lots

**Setup:**
- `lots` array is empty

**Expected Results:**
- [ ] Shows "Los lotes se crean automaticamente al iniciar ordenes"
- [ ] Explains lot creation process

### No Inspections Pending

**Setup:**
- `pendingInspections` array is empty

**Expected Results:**
- [ ] Shows "No hay inspecciones pendientes"
- [ ] This is a positive state

### No NCs Open

**Setup:**
- `openNCs` array is empty

**Expected Results:**
- [ ] Shows "Sin no-conformidades abiertas"
- [ ] This is a positive state (celebrate!)

### No Documents

**Setup:**
- `documents` array is empty

**Expected Results:**
- [ ] Shows "Sube tu primer documento de calidad"
- [ ] Upload button visible

---

## Component Interaction Tests

### ProductionDashboard

**Renders correctly:**
- [ ] Shows OEE percentage prominently
- [ ] Shows active orders count
- [ ] Shows units produced today
- [ ] Line status cards with color indicators

### LotManagement

**Renders correctly:**
- [ ] Lot list shows status badges
- [ ] Selected lot shows timeline
- [ ] Materials table shows supplier traceability
- [ ] Action buttons based on lot status

**Status transitions:**
- [ ] "in_production" lot: no release button
- [ ] "pending_inspection" lot: release/hold buttons disabled
- [ ] "released" lot: shows release date
- [ ] "held" lot: shows hold reason and date

### HACCPMonitor

**Renders correctly:**
- [ ] Grid of CCPs with status indicators
- [ ] Each CCP shows name, current value, last reading
- [ ] Active alerts section at top
- [ ] Trend chart per CCP (if available)

**Status colors:**
- [ ] "normal": green indicator
- [ ] "warning": amber/yellow indicator
- [ ] "critical": red indicator with pulsing animation

### DocumentLibrary

**Renders correctly:**
- [ ] Folder sidebar for navigation
- [ ] Document list with columns: Code, Title, Version, Status
- [ ] Status badges (Approved/Pending/Expired)
- [ ] Preview button for PDFs

---

## Edge Cases

- [ ] Lot with no materials yet (just created)
- [ ] CCP with no readings yet
- [ ] Document with multiple versions
- [ ] Expired document handling
- [ ] NC with 0 corrective actions

---

## Sample Test Data

```typescript
const mockProductionOrder = {
  id: "po-001",
  orderNumber: "PO-2024-00156",
  productName: "Salsa Chipotle 500ml",
  lotNumber: "L2024-1230-A",
  qtyTarget: 500,
  qtyProduced: 320,
  status: "in_progress",
  progress: 64
}

const mockLot = {
  id: "lot-001",
  lotNumber: "L2024-1230-B",
  productName: "Salsa Habanero 250ml",
  status: "released",
  materials: [
    { itemName: "Chile Habanero", lotNumber: "MP-2024-1220-01", supplier: "Agricola La Esperanza" }
  ],
  events: [
    { type: "created", description: "Lote creado", timestamp: "2024-12-30T06:00:00Z" }
  ]
}

const mockCCP = {
  id: "ccp-001",
  name: "Pasteurizacion",
  criticalLimit: "85C minimo",
  currentValue: "87.5C",
  status: "normal"
}

const mockDocument = {
  id: "doc-001",
  code: "SOP-PRD-001",
  title: "Procedimiento de Produccion de Salsas",
  status: "approved",
  currentVersion: "3.2"
}

// Empty states
const emptyOrders: ProductionOrder[] = []
const emptyLots: Lot[] = []
const emptyInspections: Inspection[] = []
const emptyNCs: NonConformance[] = []
const emptyDocuments: QualityDocument[] = []
```
