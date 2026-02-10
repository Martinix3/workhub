// =============================================================================
// Data Types — Operations Module
// =============================================================================

export interface KPI {
  value: number
  previousValue: number
  change: number
  label: string
}

export interface OperationsKPIs {
  pendingDeliveries: KPI
  receiptsThisMonth: KPI
  inventoryValue: KPI
  lowStockAlerts: KPI
}

export type OperationsActivityType = 'delivery' | 'receipt' | 'stock_alert'

export interface OperationsActivity {
  id: string
  type: OperationsActivityType
  description: string
  status: string
  amount: number
  timestamp: string
}

// Delivery Notes
export type DeliveryStatus = 'Draft' | 'To Bill' | 'Completed' | 'Cancelled' | 'Return Issued'

export interface DeliveryNote {
  id: string
  deliveryNumber: string
  customerId: string
  customerName: string
  date: string
  status: string
  total: number
  currency: string
  transporterName: string
  trackingNumber: string
  docstatus: number
}

export interface BatchInfo {
  batchId: string
  expiryDate: string
  manufacturingDate: string
  supplier: string
}

export interface DeliveryItem {
  itemCode: string
  itemName: string
  qty: number
  rate: number
  amount: number
  batchNo: string
  salesOrder: string
  uom: string
  batch?: BatchInfo
}

export interface LinkedInvoice {
  id: string
  date: string
  status: string
  total: number
}

export interface DeliveryDetail {
  id: string
  deliveryNumber: string
  customerId: string
  customerName: string
  customerTaxId: string
  customerAddress: string
  date: string
  status: string
  docstatus: number
  total: number
  subtotal: number
  tax: number
  currency: string
  transporterName: string
  transportMethod: string
  driverName: string
  vehicleNo: string
  items: DeliveryItem[]
  linkedOrders: string[]
  linkedInvoices: LinkedInvoice[]
}

// Filters
export interface DeliveryFilters {
  status?: string
  customer?: string
  search?: string
}
