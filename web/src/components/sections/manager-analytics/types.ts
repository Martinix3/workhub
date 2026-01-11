// =============================================================================
// Manager Analytics Types
// =============================================================================

import type {
  TeamMemberWorkload as APITeamMemberWorkload,
  VelocityDataPoint,
  VelocityTrendsResponse,
  BlockerAnalysisResponse,
  OverdueTrendsResponse,
  BlockedTask,
  BlockedArea,
  OverdueWeekData,
  DepartmentOverdueStats
} from '../../../api/services/manager-analytics'
import type { Department, TaskStatus } from '../tasks/types'

// =============================================================================
// Data Types - Re-exports from API with component-friendly names
// =============================================================================

export type TeamMemberWorkload = APITeamMemberWorkload

export interface VelocityData {
  period: 'daily' | 'weekly'
  data: VelocityDataPoint[]
  trend: 'up' | 'down' | 'stable'
  avg_current: number
  avg_previous: number
}

export interface BlockerData {
  blocked_areas: BlockedArea[]
  avg_blocked_time_days: number
  top_blocked_tasks: BlockedTask[]
}

export interface OverdueData {
  weeks: OverdueWeekData[]
  trend: 'improving' | 'worsening' | 'stable'
}

// Re-export sub-types for convenience
export type { VelocityDataPoint, BlockedTask, BlockedArea, OverdueWeekData, DepartmentOverdueStats }

// =============================================================================
// Filter Types
// =============================================================================

export interface ManagerAnalyticsFilters {
  department?: Department
  dateRange?: {
    start: string
    end: string
  }
  period?: 'daily' | 'weekly'
  weeks?: number
}

// =============================================================================
// Drill-Down Types
// =============================================================================

export type DrillDownType =
  | 'workload'
  | 'velocity'
  | 'blocker'
  | 'overdue'

export interface DrillDownContext {
  type: DrillDownType
  // For workload drill-down
  user?: string
  userName?: string
  status?: TaskStatus
  // For velocity drill-down
  date?: string
  period?: 'daily' | 'weekly'
  // For blocker drill-down
  project?: string
  blockedTaskId?: string
  // For overdue drill-down
  weekStart?: string
  weekEnd?: string
  department?: Department
  // Common fields
  title: string
  description?: string
}

// =============================================================================
// Component Props
// =============================================================================

export interface WorkloadDistributionChartProps {
  data: TeamMemberWorkload[]
  loading?: boolean
  onDrillDown?: (context: DrillDownContext) => void
}

export interface VelocityTrendChartProps {
  data: VelocityData
  loading?: boolean
  onDrillDown?: (context: DrillDownContext) => void
  onPeriodChange?: (period: 'daily' | 'weekly') => void
}

export interface BlockerAnalysisPanelProps {
  data: BlockerData
  loading?: boolean
  onDrillDown?: (context: DrillDownContext) => void
  onViewTask?: (taskId: string) => void
}

export interface OverdueRatioChartProps {
  data: OverdueData
  loading?: boolean
  onDrillDown?: (context: DrillDownContext) => void
  showDepartmentBreakdown?: boolean
  onToggleDepartmentBreakdown?: () => void
}

export interface ManagerAnalyticsDashboardProps {
  filters?: ManagerAnalyticsFilters
  onFiltersChange?: (filters: ManagerAnalyticsFilters) => void
  onExport?: (format: 'csv' | 'pdf') => void
}

// =============================================================================
// Export Types
// =============================================================================

export interface ExportOptions {
  format: 'csv' | 'pdf'
  department?: Department
  includeCharts?: boolean
}

export interface ExportData {
  workload: TeamMemberWorkload[]
  velocity: VelocityData
  blockers: BlockerData
  overdue: OverdueData
  filters: ManagerAnalyticsFilters
  exportDate: string
}
