// Custom KPI API Service
import { frappe } from '../frappe-client'
import type {
  CustomKPI,
  KPIMetric,
  CreateCustomKPIData,
  UpdateCustomKPIData,
  Department
} from '../../types/custom-kpi'

export const customKPIApi = {
  /**
   * Get custom KPIs for a user/department
   * @param department - Filter by department (optional)
   * @param includeShared - Include shared KPIs (default: true)
   * @returns List of custom KPIs with current values
   */
  async getCustomKPIs(department?: Department, includeShared = true): Promise<CustomKPI[]> {
    const data = await frappe.call<CustomKPI[]>(
      'workhub_frappe_app.api.custom_kpis.get_custom_kpis',
      {
        department,
        include_shared: includeShared
      }
    )
    return data
  },

  /**
   * Get list of available metrics for the builder UI
   * @param department - Filter by department (optional)
   * @returns List of available metrics
   */
  async getAvailableMetrics(department?: Department): Promise<KPIMetric[]> {
    const data = await frappe.call<KPIMetric[]>(
      'workhub_frappe_app.api.custom_kpis.get_available_metrics',
      {
        department
      }
    )
    return data
  },

  /**
   * Create a new custom KPI
   * @param kpiData - KPI creation data
   * @returns Created KPI document
   */
  async createCustomKPI(kpiData: CreateCustomKPIData): Promise<CustomKPI> {
    const data = await frappe.call<CustomKPI>(
      'workhub_frappe_app.api.custom_kpis.create_custom_kpi',
      {
        title: kpiData.title,
        metric: kpiData.metric,
        department: kpiData.department,
        target_value: kpiData.target_value,
        warning_threshold: kpiData.warning_threshold,
        critical_threshold: kpiData.critical_threshold,
        visualization_type: kpiData.visualization_type || 'number',
        is_shared: kpiData.is_shared || false
      }
    )
    return data
  },

  /**
   * Update an existing custom KPI
   * @param name - KPI name/ID
   * @param updates - Partial KPI data to update
   * @returns Updated KPI document
   */
  async updateCustomKPI(name: string, updates: UpdateCustomKPIData): Promise<CustomKPI> {
    const data = await frappe.call<CustomKPI>(
      'workhub_frappe_app.api.custom_kpis.update_custom_kpi',
      {
        name,
        ...updates
      }
    )
    return data
  },

  /**
   * Delete a custom KPI
   * @param name - KPI name/ID
   */
  async deleteCustomKPI(name: string): Promise<void> {
    await frappe.call(
      'workhub_frappe_app.api.custom_kpis.delete_custom_kpi',
      { name }
    )
  },

  /**
   * Update display order for multiple KPIs (drag-and-drop reordering)
   * @param kpiOrder - Array of KPI names in desired order
   * @returns Success message with count
   */
  async updateKPIOrder(kpiOrder: string[]): Promise<{ message: string; updated_count: number }> {
    const data = await frappe.call<{ message: string; updated_count: number }>(
      'workhub_frappe_app.api.custom_kpis.update_kpi_order',
      {
        kpi_order: kpiOrder
      }
    )
    return data
  }
}

export default customKPIApi
