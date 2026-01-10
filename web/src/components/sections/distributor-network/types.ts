// =============================================================================
// Data Types - Distributor Network
// =============================================================================

export interface NetworkKPI {
  value: number
  previousValue: number
  change: number
  label: string
}

export interface NetworkKPIs {
  totalSellIn: NetworkKPI
  totalSellOut: NetworkKPI
  avgRotation: NetworkKPI
  activeDistributors: NetworkKPI
}

export type DistributorStatus = 'active' | 'warning' | 'inactive'
export type AlertType = 'stock_alto' | 'sin_reporte' | 'baja_rotacion' | 'inactivo'

export interface Distributor {
  id: string
  name: string
  zone: string
  status: DistributorStatus
  sellInTotal: number
  sellOutTotal: number
  rotation: number
  lastReportDate: string
  daysWithoutReport: number
  stockValue: number
  alerts: AlertType[]
}

export interface DeliveryItem {
  itemCode: string
  itemName: string
  qty: number
  amount: number
}

export type DeliveryStatus = 'pending' | 'in_transit' | 'delivered'
export type InvoiceStatus = 'pending' | 'invoiced' | 'paid'

export interface MyOrder {
  id: string
  deliveryNumber: string
  orderDate: string
  deliveryDate: string
  status: DeliveryStatus
  items: DeliveryItem[]
  total: number
  invoiceStatus: InvoiceStatus
}

export type InventoryStatus = 'normal' | 'low' | 'slow' | 'stagnant'

export interface InventoryItem {
  itemCode: string
  itemName: string
  sellIn: number
  sellOut: number
  stockActual: number
  rotation: number
  avgDailySales: number
  daysOfStock: number
  status: InventoryStatus
  trend: number[]
}

export interface SellOutItem {
  itemCode: string
  itemName: string
  qty: number
  customer: string
}

export type SellOutStatus = 'draft' | 'confirmed'

export interface SellOutRecord {
  id: string
  date: string
  items: SellOutItem[]
  totalUnits: number
  status: SellOutStatus
}

// =============================================================================
// Sell Out Orders - Orders from Santa Brisa that distributors deliver
// =============================================================================

export type SellOutOrderStatus = 'Pending' | 'In Progress' | 'Delivered' | 'Issue' | 'Cancelled'

export interface SellOutOrderItem {
  itemCode: string
  itemName: string
  qty: number
  rate: number
  amount: number
}

/** Order from Santa Brisa assigned to distributor for delivery */
export interface SellOutOrder {
  id: string
  customer: string
  customerName: string
  orderDate: string
  expectedDeliveryDate: string
  actualDeliveryDate: string | null
  status: SellOutOrderStatus
  items: SellOutOrderItem[]
  totalQty: number
  totalAmount: number
  issueNotes: string | null
}

export interface SellOutOrderStats {
  pending: number
  inProgress: number
  delivered: number
  issues: number
}

export interface MonthlyTrendPoint {
  period: string
  sellIn: number
  sellOut: number
}

export interface PortalAnalytics {
  sellOutThisMonth: number
  rotationPercent: number
  daysOfStockAvg: number
  topProduct: {
    name: string
    units: number
    percentage: number
  }
  monthlyTrend: MonthlyTrendPoint[]
}

// =============================================================================
// Component Props
// =============================================================================

export interface DistributorDashboardProps {
  /** Network-wide KPIs */
  kpis: NetworkKPIs
  /** List of all distributors */
  distributors: Distributor[]
  /** Called when admin clicks to view distributor details */
  onViewDistributor?: (id: string) => void
  /** Called when admin wants to send a message/alert */
  onSendAlert?: (id: string) => void
  /** Called when admin exports KPIs data */
  onExport?: (format: 'json' | 'csv') => Promise<void> | void
}

export interface DistributorPortalProps {
  /** Distributor's orders from Santa Brisa */
  orders: MyOrder[]
  /** Calculated inventory */
  inventory: InventoryItem[]
  /** Recent SELL OUT records */
  sellOutRecords: SellOutRecord[]
  /** Analytics data */
  analytics: PortalAnalytics
  /** Sell Out Orders assigned to this distributor for delivery */
  sellOutOrders: SellOutOrder[]
  /** Stats for Sell Out Orders */
  sellOutOrderStats: SellOutOrderStats
  /** Called when user views order details */
  onViewOrder?: (id: string) => void
  /** Called when user submits SELL OUT data */
  onSubmitSellOut?: (items: Omit<SellOutItem, 'itemName'>[]) => void
  /** Called when user uploads CSV */
  onUploadCSV?: (file: File) => void
  /** Called when user exports inventory */
  onExportInventory?: () => void
  /** Called when distributor starts delivery for a Sell Out Order */
  onStartDelivery?: (orderId: string) => void
  /** Called when distributor marks a Sell Out Order as delivered */
  onMarkDelivered?: (orderId: string) => void
  /** Called when distributor reports an issue with a Sell Out Order */
  onReportIssue?: (orderId: string, notes: string) => void
}

export interface MyOrdersTabProps {
  orders: MyOrder[]
  onViewOrder?: (id: string) => void
}

export interface UploadSellOutTabProps {
  onSubmit?: (items: Omit<SellOutItem, 'itemName'>[]) => void
  onUploadCSV?: (file: File) => void
  recentRecords: SellOutRecord[]
}

export interface MyInventoryTabProps {
  inventory: InventoryItem[]
  onExport?: () => void
}

export interface PortalAnalyticsTabProps {
  analytics: PortalAnalytics
}

export interface SellOutOrdersTabProps {
  orders: SellOutOrder[]
  stats: SellOutOrderStats
  onStartDelivery?: (orderId: string) => void
  onMarkDelivered?: (orderId: string) => void
  onReportIssue?: (orderId: string, notes: string) => void
}
