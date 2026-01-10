// Manager Analytics API Service
import { frappe } from '../frappe-client'

// ============== Types ==============

export interface TeamMemberWorkload {
  user: string
  full_name: string
  backlog: number
  next: number
  doing: number
  blocked: number
  done_recent: number
  total: number
}

export interface TeamWorkloadResponse {
  workload: TeamMemberWorkload[]
}

export interface VelocityDataPoint {
  date: string
  completed: number
  previous_period: number
}

export interface VelocityTrendsResponse {
  period: 'daily' | 'weekly'
  data: VelocityDataPoint[]
  trend: 'up' | 'down' | 'stable'
  avg_current: number
  avg_previous: number
}

export interface BlockedArea {
  name: string
  blocked_count: number
  type: 'project' | 'department'
}

export interface BlockedTask {
  task_id: string
  title: string
  blocked_reason: string
  blocked_days: number
  assigned_to: string
  assigned_name: string
  project: string
  department: string
}

export interface BlockerAnalysisResponse {
  blocked_areas: BlockedArea[]
  avg_blocked_time_days: number
  top_blocked_tasks: BlockedTask[]
}

export interface DepartmentOverdueStats {
  total: number
  overdue: number
  ratio: number
}

export interface OverdueWeekData {
  week_start: string
  week_end: string
  total_tasks: number
  overdue_tasks: number
  overdue_ratio: number
  by_department: Record<string, DepartmentOverdueStats>
}

export interface OverdueTrendsResponse {
  weeks: OverdueWeekData[]
  trend: 'improving' | 'worsening' | 'stable'
}

export interface ManagerDashboardResponse {
  workload: TeamWorkloadResponse
  velocity: VelocityTrendsResponse
  blockers: BlockerAnalysisResponse
  overdue: OverdueTrendsResponse
}

export interface ExportAnalyticsResponse {
  content: string
  filename: string
}

// ============== API Methods ==============

export const managerAnalyticsApi = {
  /**
   * Get team workload distribution
   * Returns tasks per person grouped by assignee with status breakdown
   */
  async getTeamWorkload(department?: string): Promise<TeamWorkloadResponse> {
    return frappe.call<TeamWorkloadResponse>(
      'workhub_frappe_app.api.manager_analytics.get_team_workload',
      { department }
    )
  },

  /**
   * Get velocity trends over time
   * Returns tasks completed with comparison to previous period
   */
  async getVelocityTrends(
    period: 'daily' | 'weekly' = 'daily',
    days: number = 14
  ): Promise<VelocityTrendsResponse> {
    return frappe.call<VelocityTrendsResponse>(
      'workhub_frappe_app.api.manager_analytics.get_velocity_trends',
      { period, days }
    )
  },

  /**
   * Get blocker analysis
   * Returns most blocked areas by project/department and top blocked tasks
   */
  async getBlockerAnalysis(department?: string): Promise<BlockerAnalysisResponse> {
    return frappe.call<BlockerAnalysisResponse>(
      'workhub_frappe_app.api.manager_analytics.get_blocker_analysis',
      { department }
    )
  },

  /**
   * Get overdue trends week over week
   * Returns overdue ratio for last N weeks with department breakdown
   */
  async getOverdueTrends(weeks: number = 8): Promise<OverdueTrendsResponse> {
    return frappe.call<OverdueTrendsResponse>(
      'workhub_frappe_app.api.manager_analytics.get_overdue_trends',
      { weeks }
    )
  },

  /**
   * Get complete manager dashboard
   * Combines all analytics data in a single call
   */
  async getManagerDashboard(department?: string): Promise<ManagerDashboardResponse> {
    return frappe.call<ManagerDashboardResponse>(
      'workhub_frappe_app.api.manager_analytics.get_manager_dashboard',
      { department }
    )
  },

  /**
   * Export analytics data
   * Returns CSV content and filename for download
   */
  async exportAnalytics(
    format: 'csv' = 'csv',
    department?: string
  ): Promise<ExportAnalyticsResponse> {
    return frappe.call<ExportAnalyticsResponse>(
      'workhub_frappe_app.api.manager_analytics.export_analytics',
      { format, department }
    )
  }
}

export default managerAnalyticsApi
