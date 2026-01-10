# Production & Quality

## Overview

Modulo completo de produccion y calidad: Bill of Materials, ordenes de produccion, gestion de lotes con trazabilidad, sistema HACCP/APPCC para seguridad alimentaria, y biblioteca de documentos de calidad.

## User Flows

1. **Crear Orden:** Seleccionar producto -> Define cantidad -> Sistema asigna lote -> Confirmar
2. **Ejecutar Orden:** Iniciar -> Registrar consumo -> Registrar produccion -> Completar
3. **Gestionar Lotes:** Ver timeline -> Trazabilidad bidireccional -> Liberar/Retener
4. **Monitoreo HACCP:** Registrar lectura -> Validar limites -> Alerta si fuera de rango
5. **Documentos:** Subir -> Asignar aprobadores -> Aprobar -> Disponible

## Design Decisions

- Dashboard produccion muestra OEE prominente
- Lineas de produccion con semaforo de estado
- Lotes con timeline visual de eventos
- HACCP con grid de PCCs y semaforos
- Documentos organizados en carpetas

## Data Used

**Entities:**
- ProductionKPIs, QualityKPIs
- ProductionOrder (with progress, lot assignment)
- Formulation/BOM (ingredients, yield)
- ProductionLine (status, OEE)
- Lot (traceability, materials, events)
- Inspection, NonConformance
- HACCPPlan, CriticalControlPoint, CCPReading
- QualityDocument (versioned, with approval)

## Components Provided

- `ProductionDashboard.tsx` - Production KPIs and line status
- `QualityDashboard.tsx` - Quality KPIs, inspections, NCs
- `LotManagement.tsx` - Lot traceability view
- `HACCPMonitor.tsx` - Critical control points monitor
- `DocumentLibrary.tsx` - Document management with folders

## Callback Props

| Callback | Description |
|----------|-------------|
| `onViewOrder` | Navigate to production order detail |
| `onNewOrder` | Create new production order |
| `onUpdateStatus` | Update order status |
| `onViewLine` | View production line detail |
| `onViewLot` | Navigate to lot traceability |
| `onReleaseLot` | Release lot for sale |
| `onHoldLot` | Put lot on hold |
| `onViewInspection` | View inspection detail |
| `onNewInspection` | Create new inspection |
| `onViewNC` | View non-conformance detail |
| `onRecordReading` | Record CCP measurement |
| `onViewPlan` | View HACCP plan |
| `onAcknowledgeAlert` | Acknowledge HACCP alert |
| `onViewDocument` | Open document preview |
| `onUploadDocument` | Upload new document |
| `onFilterByFolder` | Filter documents by folder |
