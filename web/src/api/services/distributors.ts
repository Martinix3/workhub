// Distributors API service
import { frappe } from '../frappe-client'
import type {
  NetworkKPIs,
  Distributor,
  MyOrder,
  InventoryItem,
  SellOutRecord,
  PortalAnalytics
} from '../../components/sections/distributor-network/types'

export const distributorsApi = {
  // Admin Dashboard
  async getKPIs(): Promise<NetworkKPIs> {
    const data = await frappe.call<NetworkKPIs>(
      'workhub_frappe_app.api.distributors.get_kpis'
    )
    return data
  },

  async getDistributors(): Promise<Distributor[]> {
    const data = await frappe.call<Distributor[]>(
      'workhub_frappe_app.api.distributors.get_list'
    )
    return data
  },

  // Distributor Portal
  async getMyOrders(): Promise<MyOrder[]> {
    const data = await frappe.call<MyOrder[]>(
      'workhub_frappe_app.api.distributors.get_my_orders'
    )
    return data
  },

  async getMyInventory(): Promise<InventoryItem[]> {
    const data = await frappe.call<InventoryItem[]>(
      'workhub_frappe_app.api.distributors.get_my_inventory'
    )
    return data
  },

  async getMySellOutRecords(): Promise<SellOutRecord[]> {
    const data = await frappe.call<SellOutRecord[]>(
      'workhub_frappe_app.api.distributors.get_my_sell_out_records'
    )
    return data
  },

  async getPortalAnalytics(): Promise<PortalAnalytics> {
    const data = await frappe.call<PortalAnalytics>(
      'workhub_frappe_app.api.distributors.get_portal_analytics'
    )
    return data
  },

  async submitSellOut(items: Array<{ itemCode: string; qty: number; customer: string }>): Promise<void> {
    await frappe.call('workhub_frappe_app.api.distributors.submit_sell_out', { items })
  },

  async uploadCSV(file: File): Promise<void> {
    const formData = new FormData()
    formData.append('file', file)
    await fetch(
      `${import.meta.env.VITE_FRAPPE_URL}/api/method/workhub_frappe_app.api.distributors.upload_csv`,
      { method: 'POST', credentials: 'include', body: formData }
    )
  }
}

export default distributorsApi
