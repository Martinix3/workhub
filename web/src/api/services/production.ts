// Production & Quality API service
import { frappe } from '../frappe-client'
import type {
  ProductionKPIs,
  ProductionOrder,
  ProductionLine,
  Lot,
  HACCPPlan,
  CCPReading,
  QualityDocument,
  DocumentFolder,
  QualityKPIs,
  Inspection,
  NonConformance,
  WeeklyTrendPoint
} from '../../components/sections/production-and-quality/types'

export const productionApi = {
  // Production Dashboard
  async getProductionKPIs(): Promise<ProductionKPIs> {
    const data = await frappe.call<ProductionKPIs>(
      'workhub_frappe_app.api.production.get_kpis'
    )
    return data
  },

  async getProductionOrders(): Promise<ProductionOrder[]> {
    const data = await frappe.call<ProductionOrder[]>(
      'workhub_frappe_app.api.production.get_orders'
    )
    return data
  },

  async getProductionLines(): Promise<ProductionLine[]> {
    const data = await frappe.call<ProductionLine[]>(
      'workhub_frappe_app.api.production.get_lines'
    )
    return data
  },

  // Lot Management
  async getLots(filters?: { status?: string; search?: string }): Promise<Lot[]> {
    const data = await frappe.call<Lot[]>(
      'workhub_frappe_app.api.production.get_lots',
      { filters }
    )
    return data
  },

  async releaseLot(lotId: string): Promise<void> {
    await frappe.call('workhub_frappe_app.api.production.release_lot', { lot_id: lotId })
  },

  async holdLot(lotId: string): Promise<void> {
    await frappe.call('workhub_frappe_app.api.production.hold_lot', { lot_id: lotId })
  },

  // HACCP
  async getHACCPPlans(): Promise<HACCPPlan[]> {
    const data = await frappe.call<HACCPPlan[]>(
      'workhub_frappe_app.api.production.get_haccp_plans'
    )
    return data
  },

  async getRecentReadings(): Promise<CCPReading[]> {
    const data = await frappe.call<CCPReading[]>(
      'workhub_frappe_app.api.production.get_recent_readings'
    )
    return data
  },

  async getActiveAlerts(): Promise<CCPReading[]> {
    const data = await frappe.call<CCPReading[]>(
      'workhub_frappe_app.api.production.get_active_alerts'
    )
    return data
  },

  async recordReading(ccpId: string, value: string, lotNumber?: string, correctiveAction?: string): Promise<void> {
    await frappe.call('workhub_frappe_app.api.production.record_reading', {
      ccp_id: ccpId,
      value,
      lot_number: lotNumber,
      corrective_action: correctiveAction
    })
  },

  async acknowledgeAlert(readingId: string): Promise<void> {
    await frappe.call('workhub_frappe_app.api.production.acknowledge_alert', {
      reading_id: readingId
    })
  },

  // Documents
  async getDocumentFolders(): Promise<DocumentFolder[]> {
    const data = await frappe.call<DocumentFolder[]>(
      'workhub_frappe_app.api.production.get_document_folders'
    )
    return data
  },

  async getDocuments(folderId?: string): Promise<QualityDocument[]> {
    const data = await frappe.call<QualityDocument[]>(
      'workhub_frappe_app.api.production.get_documents',
      { folder_id: folderId }
    )
    return data
  },

  // Quality
  async getQualityKPIs(): Promise<QualityKPIs> {
    const data = await frappe.call<QualityKPIs>(
      'workhub_frappe_app.api.quality.get_kpis'
    )
    return data
  },

  async getPendingInspections(): Promise<Inspection[]> {
    const data = await frappe.call<Inspection[]>(
      'workhub_frappe_app.api.quality.get_pending_inspections'
    )
    return data
  },

  async getOpenNCs(): Promise<NonConformance[]> {
    const data = await frappe.call<NonConformance[]>(
      'workhub_frappe_app.api.quality.get_open_ncs'
    )
    return data
  },

  async getWeeklyTrend(): Promise<WeeklyTrendPoint[]> {
    const data = await frappe.call<WeeklyTrendPoint[]>(
      'workhub_frappe_app.api.quality.get_weekly_trend'
    )
    return data
  }
}

export default productionApi
