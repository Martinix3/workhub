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
import type { OrderDetail } from '../../components/sections/sell-in-operations/OrderDetailPanel/types'

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

  async getProducts(search?: string): Promise<Product[]> {
    const data = await frappe.call<Product[]>(
      'workhub_frappe_app.api.sales.get_products',
      { search }
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
  }
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
  items: CreateOrderItem[]
}

export interface CreateOrderResponse {
  success: boolean
  order_id: string
  total: number
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

// WorkLink type
export interface WorkLink {
  id: string
  taskId: string
  taskTitle: string
  taskStatus: string
}

export default salesApi
