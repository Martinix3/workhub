# Command Center

## Overview

Centro de mando ejecutivo que consolida KPIs de todas las areas en una sola vista. Proporciona vision 360 del negocio para toma de decisiones rapida.

## User Flows

1. **Revision Diaria:** Ver semaforos -> Identificar alertas -> Navegar a detalle -> Tomar accion
2. **Generar Reporte:** Seleccionar tipo -> Define periodo -> Preview -> Exportar
3. **Revisar Finanzas:** Ver ingresos/egresos -> Revisar CxC vencidas -> Ver proyeccion flujo

## Design Decisions

- Grid de 6 areas con semaforo y KPI principal
- Alertas prioritarias con acciones rapidas
- Finanzas con cards grandes para totales
- Reportes con iconos de formato

## Data Used

**Entities:**
- AreaSummary (per business area with status)
- PriorityAlert (cross-module alerts)
- FinancialSummary (revenue, expenses, cash flow)
- AccountReceivable, AccountPayable
- CashFlowProjection
- ReportTemplate

## Components Provided

- `ExecutiveDashboard.tsx` - Main executive view with area summaries and alerts

## Callback Props

| Callback | Description |
|----------|-------------|
| `onNavigateToArea` | Navigate to specific module |
| `onDismissAlert` | Mark alert as handled |
| `onViewAlert` | Navigate to alert source |
| `onViewReceivable` | Navigate to receivable detail |
| `onViewPayable` | Navigate to payable detail |
| `onGenerateReport` | Generate report in format |
| `onScheduleReport` | Configure report schedule |
