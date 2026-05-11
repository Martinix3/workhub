// Task Management Types

export type TaskStatus = 'BACKLOG' | 'NEXT' | 'DOING' | 'BLOCKED' | 'DONE'
export type TaskPriority = 'P0' | 'P1' | 'P2'
export type Department = 'SALES' | 'OPS' | 'MKT' | 'PRODUCTION'
export type ProjectStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED'
export type ProjectHealth = 'GREEN' | 'YELLOW' | 'RED'
export type AssigneeRole = 'Owner' | 'Collaborator'

export interface TaskAssignee {
  user: string
  role: AssigneeRole
  user_name?: string
  user_email?: string
}

// WorkLink Types
export type WorkLinkDocType =
  | 'Sales Order'
  | 'Delivery Note'
  | 'Sales Invoice'
  | 'Payment Entry'
  | 'Purchase Order'
  | 'Purchase Receipt'
  | 'Purchase Invoice'
  | 'Work Order'
  | 'Stock Entry'
  | 'Batch'
  | 'Quality Inspection'
  | 'Opportunity'
  | 'Campaign'
  | 'OpsCase'
  | 'CalendarEvent'
  | 'Account'

export interface WorkLinkDocTypeConfig {
  icon: React.ReactNode
  label: string
  color: string
}

export interface Task {
  name: string  // WHT-2024-00001
  title: string
  description?: string
  status: TaskStatus
  priority: TaskPriority
  department: Department
  project?: string
  project_title?: string
  parent_task?: string
  assignees: TaskAssignee[]
  primary_owner?: string  // Computed field - user ID of the Owner role assignee
  assigned_to?: string
  assigned_to_name?: string
  created_by?: string
  start_date?: string
  due_date?: string
  actual_start?: string
  actual_end?: string
  completed_at?: string
  completion_notes?: string
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
  title?: string // Optional since API uses 'name' as title
  description?: string
  department: Department
  estimated_duration_days: number // Renamed from default_duration_days for API consistency
  default_duration_days?: number
  task_count: number
  milestone_count?: number
  is_active?: boolean
}

// Template Task Structure (used in template preview and editor)
export interface TemplateTask {
  sequence: number
  title: string
  description?: string
  offset_days: number
  duration_days: number
  default_assignee_role?: string
  is_milestone: boolean
  depends_on_sequence?: number | null
}

// Template Milestone (subset of TemplateTask)
export interface TemplateMilestone {
  sequence: number
  title: string
  offset_days: number
  duration_days: number
}

// Template Dependency Relationship
export interface TemplateDependency {
  from_sequence: number
  to_sequence: number
  from_title: string
  to_title: string
}

// Complete Template Preview Structure
export interface TemplatePreview {
  template: ProjectTemplate & {
    name: string
    department: Department
    estimated_duration_days: number
    task_count: number
    milestone_count: number
  }
  tasks: TemplateTask[]
  milestones: TemplateMilestone[]
  dependencies: TemplateDependency[]
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
  assignee?: string  // Filter by any assignee (Owner or Collaborator)
  search?: string
}

export interface ProjectFilters {
  status?: ProjectStatus
  health?: ProjectHealth
  department?: Department
  owner?: string
  search?: string
}
