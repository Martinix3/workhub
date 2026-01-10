// =============================================================================
// Data Types - SELL IN Operations
// =============================================================================

export interface KPI {
  value: number
  previousValue: number
  change: number
  label: string
}

export interface KPIs {
  salesThisMonth: KPI
  activeOrders: KPI
  newCustomers: KPI
  avgOrderValue: KPI
}

export type OpportunityStage = 'new' | 'contacted' | 'proposal' | 'negotiation' | 'won' | 'lost'

export interface Opportunity {
  id: string
  title: string
  customerName: string
  customerId: string
  value: number
  stage: OpportunityStage
  daysInStage: number
  assignee: string
  nextContactDate: string | null
  notes: string
}

export type CustomerType = 'direct' | 'distributor'
export type CustomerStatus = 'active' | 'inactive' | 'prospect'

export interface Customer {
  id: string
  name: string
  type: CustomerType
  zone: string
  status: CustomerStatus
  contactName: string
  contactEmail: string
  contactPhone: string
  totalOrders: number
  totalRevenue: number
  lastOrderDate: string | null
}

export interface OrderItem {
  itemCode: string
  itemName: string
  qty: number
  rate: number
  amount: number
}

export type OrderStatus = 'draft' | 'confirmed' | 'in_transit' | 'delivered' | 'invoiced' | 'paid' | 'cancelled'

export interface SalesOrder {
  id: string
  orderNumber: string
  customerId: string
  customerName: string
  orderDate: string
  deliveryDate: string
  status: OrderStatus
  items: OrderItem[]
  subtotal: number
  tax: number
  total: number
  deliveryProgress: number
  invoiceProgress: number
}

export interface TrendDataPoint {
  period: string
  value: number
}

export interface ProductBreakdown {
  product: string
  value: number
  percentage: number
}

export interface CustomerTypeBreakdown {
  type: string
  value: number
  percentage: number
}

export interface SalesTrends {
  monthly: TrendDataPoint[]
  byProduct: ProductBreakdown[]
  byCustomerType: CustomerTypeBreakdown[]
}

export type ActivityType = 'order_created' | 'opportunity_moved' | 'delivery_completed' | 'customer_created' | 'payment_received'

export interface Activity {
  id: string
  type: ActivityType
  description: string
  timestamp: string
  user: string
}

// =============================================================================
// Component Props
// =============================================================================

export interface SellInDashboardProps {
  /** KPI metrics for the dashboard header */
  kpis: KPIs
  /** Recent activity feed */
  recentActivity: Activity[]
  /** Sales trends for charts */
  salesTrends: SalesTrends
  /** Called when user clicks on a KPI card */
  onKpiClick?: (kpiKey: keyof KPIs) => void
  /** Called when user wants to create a new order */
  onCreateOrder?: () => void
}

export interface PipelineProps {
  /** Opportunities organized by stage */
  opportunities: Opportunity[]
  /** Called when user moves an opportunity to a new stage */
  onMoveOpportunity?: (id: string, newStage: OpportunityStage) => void
  /** Called when user clicks to view opportunity details */
  onViewOpportunity?: (id: string) => void
  /** Called when user wants to create a new opportunity */
  onCreateOpportunity?: () => void
  /** Called when user edits an opportunity */
  onEditOpportunity?: (id: string) => void
}

export interface CustomerListProps {
  /** List of customers to display */
  customers: Customer[]
  /** Called when user clicks to view customer details */
  onViewCustomer?: (id: string) => void
  /** Called when user wants to create a new customer */
  onCreateCustomer?: () => void
  /** Called when user wants to edit a customer */
  onEditCustomer?: (id: string) => void
  /** Called when user wants to delete a customer */
  onDeleteCustomer?: (id: string) => void
  /** Called when filters change */
  onFilterChange?: (filters: CustomerFilters) => void
}

export interface CustomerFilters {
  type?: CustomerType
  status?: CustomerStatus
  zone?: string
  search?: string
}

export interface OrderListProps {
  /** List of sales orders to display */
  orders: SalesOrder[]
  /** Called when user clicks to view order details */
  onViewOrder?: (id: string) => void
  /** Called when user wants to create a new order */
  onCreateOrder?: () => void
  /** Called when user wants to edit an order */
  onEditOrder?: (id: string) => void
  /** Called when user wants to cancel an order */
  onCancelOrder?: (id: string) => void
  /** Called when filters change */
  onFilterChange?: (filters: OrderFilters) => void
}

export interface OrderFilters {
  status?: OrderStatus
  customerId?: string
  dateFrom?: string
  dateTo?: string
  search?: string
}

export interface AnalyticsProps {
  /** Sales trends data */
  salesTrends: SalesTrends
  /** Date range for the analytics */
  dateRange: { from: string; to: string }
  /** Called when user changes the date range */
  onDateRangeChange?: (from: string, to: string) => void
  /** Called when user exports data */
  onExport?: (format: 'csv' | 'pdf') => void
}
