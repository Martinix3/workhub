# Milestone 4: Production & Quality

> **Provide alongside:** `product-overview.md`
> **Prerequisites:** Milestone 1 (Foundation) complete

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

Implement the Production & Quality feature - manufactura y control de calidad.

## Overview

Modulo completo de produccion y calidad que incluye: Bill of Materials (recetas), ordenes de produccion, gestion de lotes con trazabilidad, sistema HACCP/APPCC para seguridad alimentaria, y biblioteca de documentos de calidad con control de versiones.

**Key Functionality:**
- Dashboard de produccion con OEE y ordenes activas
- Ordenes de produccion con progreso y estado
- Bill of Materials (formulaciones/recetas)
- Gestion de lotes con trazabilidad completa
- Dashboard de calidad con inspecciones y no-conformidades
- Monitor HACCP con puntos criticos de control
- Biblioteca de documentos con versionado

## Recommended Approach: Test-Driven Development

See `product-plan/sections/production-and-quality/tests.md` for detailed test-writing instructions.

## What to Implement

### Components

Copy the section components from `product-plan/sections/production-and-quality/components/`:

- `ProductionDashboard.tsx` - Production KPIs and line status
- `QualityDashboard.tsx` - Quality KPIs and pending inspections
- `LotManagement.tsx` - Lot traceability view
- `HACCPMonitor.tsx` - Critical control points monitor
- `DocumentLibrary.tsx` - Document management with folders

### Data Layer

The components expect these data shapes:

```typescript
interface ProductionOrder {
  id: string
  orderNumber: string
  productName: string
  lotNumber: string
  qtyTarget: number
  qtyProduced: number
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  progress: number
}

interface Lot {
  id: string
  lotNumber: string
  productName: string
  status: 'in_production' | 'pending_inspection' | 'released' | 'held' | 'rejected'
  materials: LotMaterial[]  // Traceability to raw materials
  events: LotEvent[]        // Timeline of lot history
}

interface CriticalControlPoint {
  id: string
  name: string
  hazardType: 'biological' | 'chemical' | 'physical'
  criticalLimit: string
  currentValue: string
  status: 'normal' | 'warning' | 'critical'
}

interface QualityDocument {
  id: string
  code: string
  title: string
  type: 'sop' | 'specification' | 'certificate' | 'training'
  status: 'draft' | 'pending_approval' | 'approved' | 'expired'
  currentVersion: string
}
```

### Callbacks

Wire up these user actions:

| Callback | Description |
|----------|-------------|
| `onViewOrder` | Navigate to production order detail |
| `onNewOrder` | Create new production order |
| `onUpdateStatus` | Update order status |
| `onViewLot` | Navigate to lot traceability view |
| `onReleaseLot` | Release lot for sale |
| `onHoldLot` | Put lot on hold |
| `onRecordReading` | Record CCP measurement |
| `onAcknowledgeAlert` | Acknowledge HACCP alert |
| `onViewDocument` | Open document preview |
| `onUploadDocument` | Upload new document |

### Empty States

- **No production orders:** Show "Programa tu primera orden de produccion"
- **No lots:** Show "Los lotes se crean automaticamente al iniciar ordenes"
- **No inspections:** Show "No hay inspecciones pendientes"
- **No NCs:** Show "Sin no-conformidades abiertas" (positive state!)
- **No documents:** Show "Sube tu primer documento de calidad"

## Files to Reference

- `product-plan/sections/production-and-quality/README.md` - Feature overview
- `product-plan/sections/production-and-quality/tests.md` - Test-writing instructions
- `product-plan/sections/production-and-quality/components/` - React components
- `product-plan/sections/production-and-quality/types.ts` - TypeScript interfaces
- `product-plan/sections/production-and-quality/sample-data.json` - Test data

## Expected User Flows

### Flow 1: Crear Orden de Produccion

1. User accesses Production Orders
2. User clicks "Nueva Orden"
3. User selects product (BOM loads automatically)
4. User defines target quantity and scheduled date
5. System assigns lot number
6. **Outcome:** Order created as "Scheduled"

### Flow 2: Gestionar Lotes

1. Lot is created automatically when order starts
2. System links consumed raw materials
3. Bidirectional traceability: raw materials <-> finished product
4. When lot is released, certificate is generated
5. **Outcome:** Complete history available for audits

### Flow 3: Monitoreo HACCP

1. Operator records reading at CCP (e.g., temperature)
2. System validates against critical limits
3. If out of limit: immediate alert
4. System suggests predefined corrective action
5. Operator executes and documents action
6. **Outcome:** Record linked to lot

### Flow 4: Gestionar Documentos

1. User uploads new document or version
2. User defines type, category, effective date
3. User assigns approvers
4. Approvers review and approve
5. **Outcome:** Document available with access control, alerts before expiration

## Done When

- [ ] Tests written for key user flows
- [ ] All tests pass
- [ ] Production dashboard shows OEE and order status
- [ ] Production orders list with progress bars works
- [ ] Lot traceability view shows materials and events
- [ ] Quality dashboard shows approval rate and open NCs
- [ ] HACCP monitor shows CCPs with status indicators
- [ ] Document library with folders and version control works
- [ ] Empty states display properly
- [ ] Responsive on mobile
