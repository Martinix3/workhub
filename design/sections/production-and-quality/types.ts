// =============================================================================
// Data Types - Production & Quality
// =============================================================================

// Production Types
export type ProductionOrderStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled'

export interface ProductionKPI {
  value: number
  previousValue: number
  change: number
  label: string
}

export interface ProductionKPIs {
  activeOrders: ProductionKPI
  oeePercent: ProductionKPI
  completedToday: ProductionKPI
  unitsProduced: ProductionKPI
}

export interface BOMIngredient {
  itemCode: string
  itemName: string
  qty: number
  uom: string
  tolerance: number
}

export interface Formulation {
  id: string
  name: string
  version: string
  productCode: string
  productName: string
  status: 'active' | 'obsolete'
  ingredients: BOMIngredient[]
  yield: number
  yieldUom: string
}

export interface ProductionOrder {
  id: string
  orderNumber: string
  productCode: string
  productName: string
  formulationId: string
  lotNumber: string
  qtyTarget: number
  qtyProduced: number
  uom: string
  status: ProductionOrderStatus
  lineId: string
  lineName: string
  scheduledDate: string
  startTime?: string
  endTime?: string
  progress: number
}

export type LineStatus = 'running' | 'idle' | 'maintenance' | 'breakdown'

export interface ProductionLine {
  id: string
  name: string
  status: LineStatus
  currentOrder?: string
  oee: number
  uptime: number
  lastMaintenance: string
  nextMaintenance: string
}

// Quality Types
export type InspectionResult = 'approved' | 'rejected' | 'held'
export type NCStatus = 'open' | 'investigation' | 'action' | 'closed'
export type NCSeverity = 'minor' | 'major' | 'critical'

export interface QualityKPIs {
  approvalRate: ProductionKPI
  openNCs: ProductionKPI
  pendingInspections: ProductionKPI
  avgCloseTime: ProductionKPI
}

export interface InspectionCriterion {
  id: string
  name: string
  specification: string
  actualValue?: string
  result?: 'pass' | 'fail'
}

export interface Inspection {
  id: string
  lotNumber: string
  productCode: string
  productName: string
  inspectionDate: string
  inspector: string
  criteria: InspectionCriterion[]
  result: InspectionResult
  notes?: string
}

export interface CorrectiveAction {
  id: string
  description: string
  responsible: string
  dueDate: string
  status: 'pending' | 'in_progress' | 'completed'
  completedDate?: string
}

export interface NonConformance {
  id: string
  ncNumber: string
  lotNumber: string
  productCode: string
  productName: string
  dateOpened: string
  dateClosed?: string
  daysOpen: number
  severity: NCSeverity
  status: NCStatus
  description: string
  rootCause?: string
  correctiveActions: CorrectiveAction[]
  responsible: string
}

export interface WeeklyTrendPoint {
  day: string
  approved: number
  rejected: number
}

// =============================================================================
// Component Props
// =============================================================================

export interface ProductionDashboardProps {
  kpis: ProductionKPIs
  orders: ProductionOrder[]
  lines: ProductionLine[]
  onViewOrder?: (id: string) => void
  onViewLine?: (id: string) => void
}

export interface ProductionOrdersProps {
  orders: ProductionOrder[]
  onViewOrder?: (id: string) => void
  onNewOrder?: () => void
  onUpdateStatus?: (id: string, status: ProductionOrderStatus) => void
}

export interface FormulationsProps {
  formulations: Formulation[]
  onViewFormulation?: (id: string) => void
  onNewFormulation?: () => void
}

export interface PlantStatusProps {
  lines: ProductionLine[]
  onViewLine?: (id: string) => void
  onReportIssue?: (lineId: string) => void
}

export interface QualityDashboardProps {
  kpis: QualityKPIs
  pendingInspections: Inspection[]
  openNCs: NonConformance[]
  weeklyTrend: WeeklyTrendPoint[]
  onViewInspection?: (id: string) => void
  onViewNC?: (id: string) => void
}

export interface InspectionsProps {
  inspections: Inspection[]
  onViewInspection?: (id: string) => void
  onNewInspection?: () => void
}

export interface NonConformancesProps {
  nonConformances: NonConformance[]
  onViewNC?: (id: string) => void
  onNewNC?: () => void
}

// =============================================================================
// Lot Management Types
// =============================================================================

export type LotStatus = 'in_production' | 'pending_inspection' | 'released' | 'held' | 'rejected'

export interface LotMaterial {
  itemCode: string
  itemName: string
  lotNumber: string
  supplier: string
  qty: number
  uom: string
}

export interface LotEvent {
  timestamp: string
  type: 'created' | 'material_added' | 'inspection' | 'released' | 'held' | 'moved'
  description: string
  user: string
}

export interface Lot {
  id: string
  lotNumber: string
  productCode: string
  productName: string
  productionOrderId: string
  status: LotStatus
  qtyProduced: number
  uom: string
  productionDate: string
  expirationDate: string
  location: string
  materials: LotMaterial[]
  events: LotEvent[]
}

export interface LotManagementProps {
  lots: Lot[]
  onViewLot?: (id: string) => void
  onReleaseLot?: (id: string) => void
  onHoldLot?: (id: string) => void
}

// =============================================================================
// HACCP/APPCC Types
// =============================================================================

export type CCPStatus = 'normal' | 'warning' | 'critical'
export type HazardType = 'biological' | 'chemical' | 'physical'

export interface CriticalControlPoint {
  id: string
  name: string
  hazardType: HazardType
  hazardDescription: string
  criticalLimit: string
  monitoringMethod: string
  frequency: string
  correctiveAction: string
  currentValue?: string
  lastReading?: string
  status: CCPStatus
}

export interface HACCPPlan {
  id: string
  productCode: string
  productName: string
  version: string
  effectiveDate: string
  ccps: CriticalControlPoint[]
}

export interface CCPReading {
  id: string
  ccpId: string
  ccpName: string
  value: string
  timestamp: string
  operator: string
  status: CCPStatus
  lotNumber?: string
  correctiveActionTaken?: string
}

export interface HACCPMonitorProps {
  plans: HACCPPlan[]
  recentReadings: CCPReading[]
  activeAlerts: CCPReading[]
  onRecordReading?: (ccpId: string) => void
  onViewPlan?: (planId: string) => void
  onAcknowledgeAlert?: (readingId: string) => void
}

// =============================================================================
// Document Library Types
// =============================================================================

export type DocType = 'sop' | 'specification' | 'certificate' | 'training' | 'record' | 'policy'
export type DocStatus = 'draft' | 'pending_approval' | 'approved' | 'expired' | 'obsolete'

export interface DocumentVersion {
  version: string
  date: string
  author: string
  changes: string
}

export interface QualityDocument {
  id: string
  code: string
  title: string
  type: DocType
  category: string
  status: DocStatus
  currentVersion: string
  effectiveDate: string
  expirationDate?: string
  author: string
  approver?: string
  approvalDate?: string
  versions: DocumentVersion[]
  fileUrl: string
}

export interface DocumentFolder {
  id: string
  name: string
  documentCount: number
  subfolders?: DocumentFolder[]
}

export interface DocumentLibraryProps {
  folders: DocumentFolder[]
  documents: QualityDocument[]
  onViewDocument?: (id: string) => void
  onUploadDocument?: () => void
  onFilterByFolder?: (folderId: string) => void
}
