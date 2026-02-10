// Sales API Service
import { frappe } from '../frappe-client'
import type {
  KPIs,
  Customer,
  SalesOrder,
  Opportunity,
  Activity,
  SalesTrends
} from '../../components/sections/sell-in-operations/types'
import type { OrderDetail, WorkLink } from '../../components/sections/sell-in-operations/OrderDetailPanel/types'

export const salesApi = {
  async getKPIs(): Promise<KPIs> {
    const data = await frappe.call<{
      sales_this_month: number
      sales_prev_month: number
      active_orders: number
      prev_active_orders: number
      new_customers: number
      prev_new_customers: number
      avg_order_value: number
      prev_avg_order_value: number
    }>('workhub_frappe_app.api.sales.get_kpis')

    const calcChange = (curr: number, prev: number) => prev === 0 ? 0 : ((curr - prev) / prev) * 100

    return {
      salesThisMonth: {
        value: data.sales_this_month,
        previousValue: data.sales_prev_month,
        change: calcChange(data.sales_this_month, data.sales_prev_month),
        label: 'Ventas del Mes'
      },
      activeOrders: {
        value: data.active_orders,
        previousValue: data.prev_active_orders,
        change: calcChange(data.active_orders, data.prev_active_orders),
        label: 'Pedidos Activos'
      },
      newCustomers: {
        value: data.new_customers,
        previousValue: data.prev_new_customers,
        change: calcChange(data.new_customers, data.prev_new_customers),
        label: 'Clientes Nuevos'
      },
      avgOrderValue: {
        value: data.avg_order_value,
        previousValue: data.prev_avg_order_value,
        change: calcChange(data.avg_order_value, data.prev_avg_order_value),
        label: 'Ticket Promedio'
      }
    }
  },

  async getCustomers(filters?: { type?: string; status?: string; search?: string }): Promise<Customer[]> {
    const data = await frappe.call<Customer[]>(
      'workhub_frappe_app.api.sales.get_customers',
      { filters }
    )
    return data
  },

  async getCustomerDetails(id: string): Promise<{ customer: any, stats: any, recent_orders: any[], active_deals?: any[], activities?: any[] }> {
    const data = await frappe.call<{ customer: any, stats: any, recent_orders: any[], active_deals?: any[], activities?: any[] }>(
      'workhub_frappe_app.api.sales.get_customer_details',
      { customer_id: id }
    )
    return data
  },

  async createCustomer(data: Partial<Customer>): Promise<{ id: string }> {
    const result = await frappe.call<{ id: string }>(
      'workhub_frappe_app.api.sales.create_customer',
      { data }
    )
    return result
  },

  async updateCustomer(id: string, data: Partial<Customer>): Promise<{ id: string }> {
    const result = await frappe.call<{ id: string }>(
      'workhub_frappe_app.api.sales.update_customer',
      { customer_id: id, data }
    )
    return result
  },

  async deleteCustomer(id: string): Promise<{ status: string, message?: string }> {
    const result = await frappe.call<{ status: string, message?: string }>(
      'workhub_frappe_app.api.sales.delete_customer',
      { customer_id: id }
    )
    return result
  },

  async getOrders(filters?: { status?: string; customerId?: string; search?: string }): Promise<SalesOrder[]> {
    const data = await frappe.call<SalesOrder[]>(
      'workhub_frappe_app.api.sales.get_orders',
      { filters }
    )
    return data
  },

  async getOpportunities(): Promise<Opportunity[]> {
    const data = await frappe.call<Opportunity[]>(
      'workhub_frappe_app.api.sales.get_opportunities'
    )
    return data
  },

  async updateOpportunityStage(id: string, stage: Opportunity['stage']): Promise<void> {
    await frappe.call('workhub_frappe_app.api.sales.update_opportunity_stage', {
      id,
      stage
    })
  },

  async getRecentActivity(): Promise<Activity[]> {
    const data = await frappe.call<Activity[]>(
      'workhub_frappe_app.api.sales.get_recent_activity'
    )
    return data
  },

  async getSalesTrends(): Promise<SalesTrends> {
    const data = await frappe.call<SalesTrends>(
      'workhub_frappe_app.api.sales.get_sales_trends'
    )
    return data
  },

  async getProducts(search?: string, salesType?: 'sell_in' | 'sell_out'): Promise<Product[]> {
    const data = await frappe.call<Product[]>(
      'workhub_frappe_app.api.sales.get_products',
      { search, sales_type: salesType }
    )
    return data
  },

  async createOrder(orderData: CreateOrderData): Promise<CreateOrderResponse> {
    const data = await frappe.call<CreateOrderResponse>(
      'workhub_frappe_app.api.sales.create_order',
      { data: orderData }
    )
    return data
  },

  async getOrderDetail(orderId: string): Promise<OrderDetail> {
    const data = await frappe.call<OrderDetail>(
      'workhub_frappe_app.api.sales.get_order_detail',
      { order_id: orderId }
    )
    return data
  },

  async updateOrder(orderId: string, data: UpdateOrderData): Promise<OrderDetail> {
    const result = await frappe.call<OrderDetail>(
      'workhub_frappe_app.api.sales.update_order',
      { order_id: orderId, data }
    )
    return result
  },

  async cancelOrder(orderId: string): Promise<CancelOrderResponse> {
    const result = await frappe.call<CancelOrderResponse>(
      'workhub_frappe_app.api.sales.cancel_order',
      { order_id: orderId }
    )
    return result
  },

  async getOrderWorkLinks(orderId: string): Promise<WorkLink[]> {
    const result = await frappe.call<WorkLink[]>(
      'workhub_frappe_app.api.sales.get_order_worklinks',
      { order_id: orderId }
    )
    return result
  },

  async submitOrder(orderId: string): Promise<SubmitOrderResponse> {
    const result = await frappe.call<SubmitOrderResponse>(
      'workhub_frappe_app.api.sales.submit_order',
      { order_id: orderId }
    )
    return result
  },

  async createDeliveryNote(orderId: string, transportMethod?: string): Promise<DeliveryNoteResponse> {
    const result = await frappe.call<DeliveryNoteResponse>(
      'workhub_frappe_app.api.sales.create_delivery_note',
      { order_id: orderId, submit: 1, transport_method: transportMethod }
    )
    return result
  },

  async createSalesInvoice(orderId: string): Promise<SalesInvoiceResponse> {
    const result = await frappe.call<SalesInvoiceResponse>(
      'workhub_frappe_app.api.sales.create_sales_invoice',
      { order_id: orderId, submit: 1 }
    )
    return result
  },

  async createPaymentEntry(invoiceIdOrOrderId: string, options?: { isInvoice?: boolean }): Promise<PaymentEntryResponse> {
    const params = options?.isInvoice !== false
      ? { sales_invoice_id: invoiceIdOrOrderId, submit: 1 }
      : { order_id: invoiceIdOrOrderId, submit: 1 }
    const result = await frappe.call<PaymentEntryResponse>(
      'workhub_frappe_app.api.sales.create_payment_entry',
      params
    )
    return result
  },

  async getInvoices(filters?: { status?: string; search?: string }): Promise<Invoice[]> {
    const data = await frappe.call<Invoice[]>(
      'workhub_frappe_app.api.sales.get_invoices',
      { filters }
    )
    return data
  },

  async getInvoiceKPIs(): Promise<InvoiceKPIs> {
    const data = await frappe.call<InvoiceKPIs>(
      'workhub_frappe_app.api.sales.get_invoice_kpis'
    )
    return data
  },

  async getInvoiceDetail(invoiceId: string): Promise<InvoiceDetail> {
    const data = await frappe.call<InvoiceDetail>(
      'workhub_frappe_app.api.sales.get_invoice_detail',
      { invoice_id: invoiceId }
    )
    return data
  },

  async getInvoicePDF(invoiceId: string): Promise<InvoicePDFResponse> {
    const data = await frappe.call<InvoicePDFResponse>(
      'workhub_frappe_app.api.sales.get_invoice_pdf',
      { invoice_id: invoiceId }
    )
    return data
  },

  async getDeliveryNotePDF(deliveryNoteId: string): Promise<DeliveryNotePDFResponse> {
    const data = await frappe.call<DeliveryNotePDFResponse>(
      'workhub_frappe_app.api.sales.get_delivery_note_pdf',
      { delivery_note_id: deliveryNoteId }
    )
    return data
  },

  async getSalesAlerts(): Promise<SalesAlert[]> {
    const data = await frappe.call<SalesAlert[]>(
      'workhub_frappe_app.api.sales.get_sales_alerts'
    )
    return data
  },

  async getVisibilityStats(): Promise<VisibilityStats> {
    const data = await frappe.call<VisibilityStats>(
      'workhub_frappe_app.api.sales.get_visibility_stats'
    )
    return data
  },

  async getTopAccounts(): Promise<TopAccounts> {
    const data = await frappe.call<TopAccounts>(
      'workhub_frappe_app.api.sales.get_top_accounts'
    )
    return data
  },

  async getSalesTasks(limit?: number): Promise<SalesTask[]> {
    const data = await frappe.call<SalesTask[]>(
      'workhub_frappe_app.api.sales.get_sales_tasks',
      { limit: limit || 5 }
    )
    return data
  },

  // =====================
  // Order Hub (Email Orders)
  // =====================

  /**
   * Obtiene emails candidatos a ser pedidos desde Gmail.
   * Usa detección IA para clasificar si son pedidos.
   */
  async getOrderEmails(limit?: number, label?: string): Promise<OrderEmailsResponse> {
    const data = await frappe.call<OrderEmailsResponse>(
      'workhub_frappe_app.api.sales.get_order_emails',
      { limit: limit || 20, label }
    )
    return data
  },

  /**
   * Procesa un email específico para extraer datos de pedido.
   * Usa IA para extraer items, cliente, fechas de entrega.
   */
  async processEmailOrder(messageId: string): Promise<ProcessEmailResult> {
    const data = await frappe.call<ProcessEmailResult>(
      'workhub_frappe_app.api.sales.process_email_order',
      { message_id: messageId }
    )
    return data
  },

  /**
   * Crea un Sales Order a partir de datos extraídos de email.
   * Marca el email como procesado para evitar duplicados.
   */
  async createOrderFromEmail(data: CreateOrderFromEmailData): Promise<CreateOrderFromEmailResponse> {
    const result = await frappe.call<CreateOrderFromEmailResponse>(
      'workhub_frappe_app.api.sales.create_order_from_email',
      {
        message_id: data.message_id,
        customer: data.customer,
        items: JSON.stringify(data.items),
        delivery_date: data.delivery_date,
        notes: data.notes,
        price_list: data.price_list
      }
    )
    return result
  },

  async getDashboardSummary(period: 'month' | 'quarter' | 'year' = 'month'): Promise<DashboardSummary> {
    const data = await frappe.call<DashboardSummary>(
      'workhub_frappe_app.api.sales.get_dashboard_summary',
      { period }
    )
    return data
  }
}

// Invoice Types
export interface Invoice {
  id: string
  invoiceNumber: string
  customerId: string
  customerName: string
  invoiceDate: string
  dueDate: string
  total: number
  outstanding: number
  paid: number
  currency: string
  status: 'draft' | 'unpaid' | 'paid' | 'overdue' | 'cancelled'
  daysOverdue: number
  salesOrderId?: string
  zone: string
}

export interface InvoiceKPIs {
  invoicedThisMonth: number
  totalOutstanding: number
  overdueCount: number
  overdueAmount: number
  collectedThisMonth: number
}

export interface InvoiceItem {
  id: string
  itemCode: string
  itemName: string
  description?: string
  qty: number
  uom: string
  rate: number
  amount: number
  warehouse?: string
}

export interface InvoicePayment {
  id: string
  paymentNumber: string
  date: string
  amount: number
  method: string
}

export interface InvoiceDetail extends Invoice {
  customerAddress: string
  customerTaxId?: string
  subtotal: number
  tax: number
  taxBreakdown?: TaxBreakdownRow[]
  items: InvoiceItem[]
  payments: InvoicePayment[]
  salesOrder?: { id: string; date: string; status: string }
  salesOrders?: { id: string; date: string; status: string }[]
  deliveryNote?: { id: string; date: string; status: string }
  deliveryNotes?: { id: string; date: string; status: string }[]
  notes: string
  createdAt: string
  modifiedAt?: string
}

export interface InvoicePDFResponse {
  success: boolean
  invoice_id: string
  pdf_base64: string
  filename: string
}

export interface DeliveryNotePDFResponse {
  success: boolean
  delivery_note_id: string
  pdf_base64: string
  filename: string
}

export interface TaxBreakdownRow {
  description: string
  rate: number
  tax_amount: number
  total: number
}

// Product type for dropdown
export interface Product {
  name: string
  item_name: string
  item_code: string
  stock_uom: string
  standard_rate: number
  image: string | null
  available_stock: number
  price_list?: string
  price_source?: 'price_list' | 'standard_rate'
}

// Order creation types
export interface CreateOrderItem {
  item_code: string
  qty: number
  rate: number
}

export interface CreateOrderData {
  customer: string
  transaction_date?: string
  delivery_date?: string
  sales_type?: 'sell_in' | 'sell_out'
  price_list?: string
  items: CreateOrderItem[]
}

export interface CreateOrderResponse {
  success: boolean
  order_id: string
  total: number
}

export interface SubmitOrderResponse {
  success: boolean
  order_id: string
  status: string
  message: string
}

// Order update types
export interface UpdateOrderItem {
  itemCode: string
  itemName?: string
  qty: number
  rate: number
  amount?: number
}

export interface UpdateOrderData {
  deliveryDate?: string
  salesType?: 'sell_in' | 'sell_out'
  items?: UpdateOrderItem[]
}

// Order cancel response type
export interface CancelOrderResponse {
  success: boolean
  order_id: string
  message: string
}

export interface DeliveryNoteResponse {
  success: boolean
  sales_order_id: string
  delivery_note_id: string
  message?: string
}

export interface SalesInvoiceResponse {
  success: boolean
  sales_order_id: string
  sales_invoice_id: string
  message?: string
}

export interface PaymentEntryResponse {
  success: boolean
  sales_invoice_id: string
  payment_entry_id: string
  message?: string
}

// Dashboard types
export interface SalesAlert {
  id: string
  type: 'overdue_order' | 'stagnant_account' | 'unbilled_order' | 'overdue_invoice'
  severity: 'error' | 'warning'
  title: string
  description: string
  relatedId?: string
  timestamp: string
}

export interface VisibilityStats {
  accountsWithVisibility: number
  totalActiveAccounts: number
  byType: { type: string; count: number }[]
  distributorCount: number
}

export interface TopAccounts {
  topAccount: { name: string; total_sales: number }
  topDistributor: { name: string; total_sales: number }
}

export interface SalesTask {
  name: string
  title: string
  status: string
  priority: string
  due_date: string | null
  assigned_to: string
}

// =====================
// Dashboard Summary (Boxes-Centric)
// =====================

export interface DashboardSummaryKPIs {
  boxes_this_period: number
  boxes_prev_period: number
  sell_in_boxes: number
  sell_out_boxes: number
  active_accounts: number
  total_accounts: number
  conversion_rate: number
  avg_client_fit: number
}

export interface PipelineFunnel {
  Backlog: number
  Pipeline: number
  Hot: number
  Won: number
  Lost: number
  Loyalty: number
}

export interface ClientFitTierItem {
  tier: string
  count: number
}

export interface BoxesEvolutionPoint {
  period: string
  sell_in: number
  sell_out: number
  total: number
}

export interface ChannelMixItem {
  channel: string
  boxes: number
  accounts: number
  percentage: number
}

export interface TopAccountItem {
  name: string
  account_name: string
  sales_total_boxes: number
  sales_total_orders: number
  client_fit_tier: string | null
  client_fit_score: number
  sales_channel: string
  column: string
  sales_boxes_last_90d: number
}

export interface TopSellOutItem {
  customer: string
  boxes: number
  order_count: number
  last_date: string | null
}

export interface TopSellInItem {
  customer: string
  amount: number
  order_count: number
  last_date: string | null
}

export interface ProductBoxes {
  product: string
  boxes: number
  percentage: number
}

export interface DashboardSummary {
  kpis: DashboardSummaryKPIs
  pipeline_funnel: PipelineFunnel
  client_fit_distribution: ClientFitTierItem[]
  boxes_evolution: BoxesEvolutionPoint[]
  channel_mix: ChannelMixItem[]
  top_sell_out: TopSellOutItem[]
  top_sell_in: TopSellInItem[]
  products_top_boxes: ProductBoxes[]
}

// =====================
// Order Hub (Email Orders)
// =====================

/** Email candidato a ser pedido */
export interface OrderEmail {
  id: string
  subject: string
  from: string
  date: string
  snippet: string
  has_attachment: boolean
  is_order: boolean
  confidence: number
  status: 'pending' | 'processed' | 'ignored'
}

/** Respuesta de get_order_emails */
export interface OrderEmailsResponse {
  emails: OrderEmail[]
}

/** Item extraído de un email de pedido */
export interface ExtractedOrderItem {
  product_text: string
  matched_item: string | null
  quantity: number
  unit: string
  unit_price: number | null
  notes: string | null
}

/** Info de cliente extraída del email */
export interface ExtractedCustomerInfo {
  name: string | null
  email: string | null
  phone: string | null
  cif: string | null
}

/** Cliente matcheado en el sistema */
export interface MatchedCustomer {
  source: string
  momentum_account: string
  customer_name: string
  linked_customer: string | null
  price_list: string | null
  match_confidence?: string
}

/** Resultado de procesar un email */
export interface ProcessEmailResult {
  success: boolean
  is_order: boolean
  detection: {
    is_order: boolean
    confidence: number
    indicators: string[]
    order_type: 'inline' | 'attachment' | 'both' | null
  } | null
  extracted_data: {
    items: ExtractedOrderItem[]
    customer_info: ExtractedCustomerInfo
    delivery_date: string | null
    notes: string | null
    confidence: number
  } | null
  matched_customer: MatchedCustomer | null
  draft_order: {
    customer: string | null
    momentum_account: string | null
    selling_price_list: string | null
    delivery_date: string | null
    items: Array<{
      item_code: string | null
      item_name: string
      qty: number
      uom: string
      rate: number | null
      notes: string | null
    }>
    notes: string | null
    _needs_review: boolean
    _unmatched_items: ExtractedOrderItem[]
  } | null
  email_data: {
    subject: string
    from: string
    date: string
    message_id: string
  }
  errors?: string[]
}

/** Datos para crear pedido desde email */
export interface CreateOrderFromEmailData {
  message_id: string
  customer: string
  items: Array<{
    item_code: string
    qty: number
    rate?: number
  }>
  delivery_date?: string
  notes?: string
  price_list?: string
}

/** Respuesta de crear pedido desde email */
export interface CreateOrderFromEmailResponse {
  success: boolean
  order_id?: string
  total?: number
  status?: string
  error?: string
}

export default salesApi
