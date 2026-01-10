# Milestone 6: Command Center

> **Provide alongside:** `product-overview.md`
> **Prerequisites:** Milestone 1 (Foundation) complete, ideally other sections too

---

## About These Instructions

**What you're receiving:**
- Finished UI designs (React components with full styling)
- Data model definitions (TypeScript types and sample data)
- UI/UX specifications (user flows, requirements, screenshots)
- Design system tokens (colors, typography, spacing)
- Test-writing instructions for each section (for TDD approach)

**What you need to build:**
- Backend API endpoints and database schema
- Authentication and authorization
- Data fetching and state management
- Business logic and validation
- Integration of the provided UI components with real data

**Important guidelines:**
- **DO NOT** redesign or restyle the provided components - use them as-is
- **DO** wire up the callback props to your routing and API calls
- **DO** replace sample data with real data from your backend
- **DO** implement proper error handling and loading states
- **DO** implement empty states when no records exist
- **DO** use test-driven development - write tests first using `tests.md` instructions

---

## Goal

Implement the Command Center feature - centro de mando ejecutivo.

## Overview

Centro de mando ejecutivo que consolida KPIs de todas las areas en una sola vista. Proporciona vision 360 del negocio para toma de decisiones rapida. Incluye alertas prioritarias, finanzas consolidadas y reportes ejecutivos.

**Key Functionality:**
- Dashboard ejecutivo con metricas de cada area (semaforos)
- Sistema de alertas prioritarias cross-modulo
- Vista financiera consolidada (ingresos, egresos, flujo)
- Cuentas por cobrar y pagar
- Centro de reportes con generacion y programacion

## Recommended Approach: Test-Driven Development

See `product-plan/sections/command-center/tests.md` for detailed test-writing instructions.

## What to Implement

### Components

Copy the section components from `product-plan/sections/command-center/components/`:

- `ExecutiveDashboard.tsx` - Main executive view with area summaries

### Data Layer

The components expect these data shapes:

```typescript
interface AreaSummary {
  id: string
  name: string
  icon: string
  status: 'green' | 'yellow' | 'red'
  mainKPI: {
    value: number
    change: number
    label: string
    target?: number
  }
  secondaryKPIs: AreaKPI[]
}

interface PriorityAlert {
  id: string
  title: string
  description: string
  category: 'sales' | 'operations' | 'production' | 'quality' | 'finance' | 'marketing'
  priority: 'high' | 'medium' | 'low'
  timestamp: string
  actionUrl?: string
}

interface FinancialSummary {
  revenue: FinancialKPI
  expenses: FinancialKPI
  cashFlow: FinancialKPI
  receivables: FinancialKPI
  payables: FinancialKPI
}

interface AccountReceivable {
  id: string
  customerName: string
  amount: number
  dueDate: string
  daysOverdue: number
  status: 'current' | 'overdue' | 'critical'
}

interface ReportTemplate {
  id: string
  name: string
  type: 'sales' | 'inventory' | 'production' | 'quality' | 'financial'
  formats: ('pdf' | 'excel')[]
  lastGenerated?: string
  scheduled?: { frequency: string; recipients: string[] }
}
```

### Callbacks

Wire up these user actions:

| Callback | Description |
|----------|-------------|
| `onNavigateToArea` | Navigate to specific module |
| `onDismissAlert` | Mark alert as handled |
| `onViewAlert` | Navigate to alert source |
| `onViewReceivable` | Navigate to receivable detail |
| `onViewPayable` | Navigate to payable detail |
| `onGenerateReport` | Generate report in format |
| `onScheduleReport` | Configure report schedule |

### Empty States

- **No alerts:** Show "Todo en orden" (positive state!)
- **No receivables:** Show "Sin cuentas por cobrar pendientes"
- **No payables:** Show "Sin pagos programados"

## Files to Reference

- `product-plan/sections/command-center/README.md` - Feature overview
- `product-plan/sections/command-center/tests.md` - Test-writing instructions
- `product-plan/sections/command-center/components/` - React components
- `product-plan/sections/command-center/types.ts` - TypeScript interfaces
- `product-plan/sections/command-center/sample-data.json` - Test data

## Expected User Flows

### Flow 1: Revision Ejecutiva Diaria

1. Director accesses Command Center
2. Director sees traffic lights for each area (green/yellow/red)
3. Director identifies priority alerts
4. Director clicks on area with alert to see detail
5. Director takes action or assigns responsible
6. **Outcome:** Returns to consolidated view

### Flow 2: Generar Reporte Mensual

1. User accesses Reports Hub
2. User selects report type (e.g., Monthly Sales)
3. User defines period and filters
4. User previews report
5. User exports to PDF or Excel
6. **Outcome:** Optionally schedules automatic delivery

### Flow 3: Revisar Finanzas

1. Director accesses Financial Overview
2. Director sees income vs expenses summary
3. Director reviews overdue receivables
4. Director identifies upcoming payments
5. **Outcome:** Views cash flow projection

## Done When

- [ ] Tests written for key user flows
- [ ] All tests pass
- [ ] Executive dashboard shows all areas with status indicators
- [ ] Traffic light system (green/yellow/red) works correctly
- [ ] Priority alerts list displays with proper styling
- [ ] Financial summary cards show correct data
- [ ] Receivables and payables tables work
- [ ] Cash flow projection chart renders
- [ ] Reports hub with generate and schedule works
- [ ] Empty states display properly
- [ ] Responsive on mobile
