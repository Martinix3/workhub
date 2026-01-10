// Command Center API service
import { frappe } from '../frappe-client'
import type { AreaSummary, PriorityAlert } from '../../components/sections/command-center/types'

export const commandCenterApi = {
  async getAreaSummaries(): Promise<AreaSummary[]> {
    const data = await frappe.call<AreaSummary[]>(
      'workhub_frappe_app.api.command_center.get_area_summaries'
    )
    return data
  },

  async getAlerts(): Promise<PriorityAlert[]> {
    const data = await frappe.call<PriorityAlert[]>(
      'workhub_frappe_app.api.command_center.get_alerts'
    )
    return data
  },

  async dismissAlert(alertId: string): Promise<void> {
    await frappe.call('workhub_frappe_app.api.command_center.dismiss_alert', {
      alert_id: alertId
    })
  }
}

export default commandCenterApi
