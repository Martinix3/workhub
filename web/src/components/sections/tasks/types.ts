// Task Management Types

export type TaskStatus = 'BACKLOG' | 'NEXT' | 'DOING' | 'BLOCKED' | 'DONE'
export type TaskPriority = 'P0' | 'P1' | 'P2'
export type Department = 'SALES' | 'OPS' | 'MKT'
export type ProjectStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED'
export type ProjectHealth = 'GREEN' | 'YELLOW' | 'RED'

export interface Task {
  name: string  // WHT-2024-00001
  title: string
  description?: string
  status: TaskStatus
  priority: TaskPriority
  department: Department
  project?: string
  project_title?: string
  assigned_to: string
  assigned_to_name?: string
  created_by?: string
  start_date?: string
  due_date?: string
  actual_start?: string
  actual_end?: string
  is_milestone?: boolean
  is_inbox?: boolean
  blocked_reason?: string
  worklink?: string
  source_doctype?: string
  source_name?: string
  worked_today?: boolean
  total_work_days?: number
  // Dependency counts
  blocked_by_count?: number
  blocks_count?: number
}

export interface Project {
  name: string  // WHP-2024-00001
  title: string
  description?: string
  department: Department
  owner_user: string
  owner_name?: string
  start_date: string
  target_date?: string
  actual_end_date?: string
  duration_days?: number
  status: ProjectStatus
  health: ProjectHealth
  health_reason?: string
  // KPIs
  progress_pct?: number
  total_tasks?: number
  completed_tasks?: number
  blocked_tasks?: number
  overdue_tasks?: number
  avg_task_duration?: number
  velocity?: number
  estimated_completion?: string
  // Para vista expandida
  tasks?: Task[]
}

export interface ProjectTemplate {
  name: string
  title: string
  description?: string
  department: Department
  default_duration_days: number
  task_count: number
  is_active: boolean
}

export interface TaskDependency {
  name: string
  predecessor: string
  predecessor_title?: string
  successor: string
  successor_title?: string
  dependency_type: 'FS' | 'SS' | 'FF' | 'SF'
  lag_days: number
  is_critical?: boolean
  is_active: boolean
}

// API Response Types

export interface MyDayData {
  today: Task[]
  overdue: Task[]
  upcoming: Task[]
  blocked: Task[]
  blocking: Task[]
  inbox: Task[]
  summary: {
    total_today: number
    overdue_count: number
    blocked_count: number
    completed_today: number
  }
}

export interface GanttTask {
  id: string
  title: string
  start_date: string
  due_date: string
  status: TaskStatus
  priority: TaskPriority
  is_milestone: boolean
  is_critical: boolean
  progress: number
  assigned_to?: string
  dependencies: string[]
}

export interface GanttData {
  project: Project
  tasks: GanttTask[]
  dependencies: TaskDependency[]
  critical_path: string[]
}

export interface KanbanColumn {
  status: TaskStatus
  label: string
  tasks: Task[]
}

export interface DashboardKPIs {
  projects: {
    total: number
    active: number
    at_risk: number
    health_rate: number
  }
  tasks: {
    total: number
    completed_week: number
    completed_month: number
    blocked: number
    blocked_rate: number
    overdue: number
    overdue_rate: number
  }
  team: {
    size: number
    avg_velocity: number
    trend: 'up' | 'down' | 'stable'
    trend_delta: number
  }
}

// Filters
export interface TaskFilters {
  status?: TaskStatus
  priority?: TaskPriority
  department?: Department
  project?: string
  assigned_to?: string
  search?: string
}

export interface ProjectFilters {
  status?: ProjectStatus
  health?: ProjectHealth
  department?: Department
  owner?: string
  search?: string
}
