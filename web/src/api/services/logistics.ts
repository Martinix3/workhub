/**
 * Logistics API Service
 * =====================
 * Frontend wrapper for the logistics backend API.
 * Follows the same pattern as sales.ts.
 */

import { frappe } from '../frappe-client'
import type {
  OperationsKPIs,
  OperationsActivity,
  DeliveryNote,
  DeliveryDetail,
  DeliveryFilters,
} from '../../components/sections/operations/types'

export const logisticsApi = {
  // ==========================================================================
  // Dashboard
  // ==========================================================================

  async getOperationsKPIs(): Promise<OperationsKPIs> {
    const data = await frappe.call<OperationsKPIs>(
      'workhub_frappe_app.api.logistics.get_operations_kpis'
    )
    return data
  },

  async getRecentOperations(limit = 10): Promise<OperationsActivity[]> {
    const data = await frappe.call<OperationsActivity[]>(
      'workhub_frappe_app.api.logistics.get_recent_operations',
      { limit }
    )
    return data
  },

  // ==========================================================================
  // Delivery Notes
  // ==========================================================================

  async getDeliveryNotes(filters?: DeliveryFilters): Promise<DeliveryNote[]> {
    const data = await frappe.call<DeliveryNote[]>(
      'workhub_frappe_app.api.logistics.get_delivery_notes',
      { filters: filters ? JSON.stringify(filters) : undefined }
    )
    return data
  },

  async getDeliveryDetail(deliveryNoteId: string): Promise<DeliveryDetail> {
    const data = await frappe.call<DeliveryDetail>(
      'workhub_frappe_app.api.logistics.get_delivery_detail',
      { delivery_note_id: deliveryNoteId }
    )
    return data
  },

  async getDeliveryNotePDF(deliveryNoteId: string): Promise<{ base64: string }> {
    // Reuse the existing sales endpoint for delivery note PDFs
    const data = await frappe.call<{ base64: string }>(
      'workhub_frappe_app.api.sales.get_delivery_note_pdf',
      { delivery_note_id: deliveryNoteId }
    )
    return data
  },
}

export default logisticsApi
