# Test Instructions: Command Center

These test-writing instructions are **framework-agnostic**. Adapt them to your testing setup.

## Overview

Test the executive dashboard, alert system, financial overview, and report generation.

---

## User Flow Tests

### Flow 1: Revision Ejecutiva

**Scenario:** Director reviews business status

**Steps:**
1. Navigate to `/` (root/dashboard)
2. View area cards with status
3. Identify areas with issues

**Expected Results:**
- [ ] Shows 6 area cards (Ventas, Operaciones, Produccion, Calidad, Finanzas, Marketing)
- [ ] Each card shows status indicator (green/yellow/red)
- [ ] Each card shows main KPI with label
- [ ] Clicking card calls `onNavigateToArea`

### Flow 2: Gestionar Alertas

**Scenario:** Director reviews and handles alerts

**Steps:**
1. View priority alerts section
2. Click on high priority alert
3. Review alert details
4. Take action or dismiss

**Expected Results:**
- [ ] Alerts sorted by priority (high first)
- [ ] High priority alerts have red styling
- [ ] `onViewAlert` called with alert ID when clicked
- [ ] `onDismissAlert` called when dismissed
- [ ] Alert disappears from list after dismiss

### Flow 3: Generar Reporte

**Scenario:** User generates monthly sales report

**Steps:**
1. Navigate to `/reportes`
2. Find "Ventas Mensual" template
3. Click generate (PDF)
4. Download file

**Expected Results:**
- [ ] Report templates list shows available reports
- [ ] Each template shows formats available (PDF/Excel icons)
- [ ] `onGenerateReport` called with template ID and format
- [ ] Download initiates

---

## Empty State Tests

### No Alerts

**Setup:**
- `alerts` array is empty

**Expected Results:**
- [ ] Shows "Todo en orden" (positive message!)
- [ ] Green checkmark icon
- [ ] No alert list displayed

### No Receivables

**Setup:**
- `receivables` array is empty

**Expected Results:**
- [ ] Shows "Sin cuentas por cobrar pendientes"
- [ ] Positive messaging

### No Payables

**Setup:**
- `payables` array is empty

**Expected Results:**
- [ ] Shows "Sin pagos programados"
- [ ] Table area shows empty state

---

## Component Interaction Tests

### ExecutiveDashboard

**Renders correctly:**
- [ ] 6 area cards in grid layout
- [ ] Each card shows area name and icon
- [ ] Status indicator visible and correct color
- [ ] Main KPI value prominent
- [ ] Change percentage shown

**Area status colors:**
- [ ] "green": Green indicator, area is healthy
- [ ] "yellow": Amber indicator, needs attention
- [ ] "red": Red indicator, critical issue

**Alert priority styling:**
- [ ] "high": Red background/border, urgent icon
- [ ] "medium": Amber styling
- [ ] "low": Gray/muted styling

### Financial Cards

**Renders correctly:**
- [ ] Revenue card shows positive value
- [ ] Expenses card shows value
- [ ] Cash Flow shows net (can be negative)
- [ ] Receivables shows total
- [ ] Payables shows total

### Receivables Table

**Renders correctly:**
- [ ] Columns: Customer, Amount, Due Date, Days Overdue, Status
- [ ] Overdue amounts highlighted
- [ ] Critical (>30 days) have red styling
- [ ] Clicking row calls `onViewReceivable`

---

## Edge Cases

- [ ] All areas green (happy path)
- [ ] All areas red (crisis mode)
- [ ] Mixed status across areas
- [ ] Alert with no actionUrl
- [ ] Receivable with 0 days overdue (current)
- [ ] Cash flow negative value

---

## Sample Test Data

```typescript
const mockAreaSummary = {
  id: "sales",
  name: "Ventas",
  icon: "TrendingUp",
  status: "green",
  mainKPI: {
    value: 2450000,
    change: 12.4,
    label: "Ventas del Mes",
    target: 2300000
  }
}

const mockAlert = {
  id: "alert-001",
  title: "CxC Cliente Distribuciones Norte vencida 45 dias",
  description: "$450,000 pendientes. Ultimo contacto hace 15 dias.",
  category: "finance",
  priority: "high",
  timestamp: "2024-12-30T08:00:00Z",
  actionUrl: "/finanzas/cobros/dist-001"
}

const mockFinancialSummary = {
  revenue: { value: 4850000, change: 15.5, label: "Ingresos" },
  expenses: { value: 3650000, change: 7.4, label: "Egresos" },
  cashFlow: { value: 1200000, change: 50.0, label: "Flujo Neto" }
}

const mockReceivable = {
  id: "ar-001",
  customerName: "Distribuciones Noreste SA",
  amount: 450000,
  dueDate: "2024-11-15",
  daysOverdue: 46,
  status: "critical"
}

// Empty states
const emptyAlerts: PriorityAlert[] = []
const emptyReceivables: AccountReceivable[] = []
const emptyPayables: AccountPayable[] = []
```
