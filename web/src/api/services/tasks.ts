// Tasks API Service
import { frappe } from '../frappe-client'
import type {
  Task,
  Project,
  ProjectTemplate,
  MyDayData,
  GanttData,
  KanbanColumn,
  DashboardKPIs,
  TaskFilters,
  ProjectFilters,
  TaskStatus,
  TaskDependency
} from '../../components/sections/tasks/types'

export const tasksApi = {
  // ============== My Day ==============

  async getMyDay(): Promise<MyDayData> {
    return frappe.call<MyDayData>('workhub_frappe_app.api.my_day.get_my_day')
  },

  async getInbox(): Promise<Task[]> {
    return frappe.call<Task[]>('workhub_frappe_app.api.my_day.get_inbox')
  },

  async markWorkedToday(taskIds: string[]): Promise<void> {
    await frappe.call('workhub_frappe_app.api.my_day.mark_worked_today', {
      task_ids: taskIds
    })
  },

  // ============== Tasks ==============

  async getTasks(filters?: TaskFilters): Promise<Task[]> {
    return frappe.call<Task[]>('workhub_frappe_app.api.tasks.get_tasks', {
      filters
    })
  },

  async getTask(taskId: string): Promise<Task> {
    return frappe.call<Task>('workhub_frappe_app.api.tasks.get_task', {
      task_id: taskId
    })
  },

  async createTask(data: Partial<Task>): Promise<Task> {
    return frappe.call<Task>('workhub_frappe_app.api.tasks.create_task', data)
  },

  async updateTask(taskId: string, data: Partial<Task>): Promise<Task> {
    return frappe.call<Task>('workhub_frappe_app.api.tasks.update_task', {
      task_id: taskId,
      ...data
    })
  },

  async changeStatus(taskId: string, status: TaskStatus): Promise<Task> {
    return frappe.call<Task>('workhub_frappe_app.api.tasks.change_status', {
      task_id: taskId,
      status
    })
  },

  async completeTask(taskId: string, notes?: string): Promise<Task> {
    return frappe.call<Task>('workhub_frappe_app.api.tasks.change_status', {
      task_id: taskId,
      new_status: 'DONE',
      completion_notes: notes
    })
  },

  async bulkChangeStatus(taskIds: string[], status: TaskStatus): Promise<void> {
    await frappe.call('workhub_frappe_app.api.tasks.bulk_change_status', {
      task_ids: taskIds,
      status
    })
  },

  async quickAdd(title: string, priority: string = 'P2'): Promise<Task> {
    return frappe.call<Task>('workhub_frappe_app.api.tasks.quick_add', {
      title,
      priority
    })
  },

  // ============== Dependencies ==============

  async addDependency(
    predecessorId: string,
    successorId: string,
    type: string = 'FS',
    lagDays: number = 0
  ): Promise<TaskDependency> {
    return frappe.call<TaskDependency>('workhub_frappe_app.api.tasks.add_dependency', {
      predecessor_id: predecessorId,
      successor_id: successorId,
      dependency_type: type,
      lag_days: lagDays
    })
  },

  async removeDependency(dependencyId: string): Promise<void> {
    await frappe.call('workhub_frappe_app.api.tasks.remove_dependency', {
      dependency_id: dependencyId
    })
  },

  // ============== Projects ==============

  async getProjects(filters?: ProjectFilters): Promise<Project[]> {
    return frappe.call<Project[]>('workhub_frappe_app.api.projects.get_projects', {
      filters
    })
  },

  async getProject(projectId: string): Promise<Project> {
    return frappe.call<Project>('workhub_frappe_app.api.projects.get_project', {
      project_id: projectId
    })
  },

  async createProject(data: Partial<Project>): Promise<Project> {
    return frappe.call<Project>('workhub_frappe_app.api.projects.create_project', { data })
  },

  async updateProject(projectId: string, data: Partial<Project>): Promise<Project> {
    return frappe.call<Project>('workhub_frappe_app.api.projects.update_project', {
      project_id: projectId,
      ...data
    })
  },

  async getProjectTasks(projectId: string): Promise<Task[]> {
    return frappe.call<Task[]>('workhub_frappe_app.api.tasks.get_tasks', {
      filters: { project: projectId }
    })
  },

  // ============== Templates ==============

  async getProjectTemplates(): Promise<ProjectTemplate[]> {
    return frappe.call<ProjectTemplate[]>('workhub_frappe_app.api.projects.get_templates')
  },

  async createFromTemplate(templateId: string, data: Partial<Project>): Promise<Project> {
    return frappe.call<Project>('workhub_frappe_app.api.projects.create_from_template', {
      template_id: templateId,
      data
    })
  },

  // ============== Gantt ==============

  async getGanttData(projectId: string): Promise<GanttData> {
    return frappe.call<GanttData>('workhub_frappe_app.api.gantt.get_gantt_view', {
      project_id: projectId
    })
  },

  async updateTaskSchedule(
    taskId: string,
    startDate: string,
    dueDate: string
  ): Promise<Task> {
    return frappe.call<Task>('workhub_frappe_app.api.gantt.update_task_schedule', {
      task_id: taskId,
      start_date: startDate,
      due_date: dueDate
    })
  },

  async getCriticalPath(projectId: string): Promise<string[]> {
    return frappe.call<string[]>('workhub_frappe_app.api.gantt.get_critical_path', {
      project_id: projectId
    })
  },

  // ============== Kanban ==============

  async getKanbanBoard(filters?: TaskFilters): Promise<KanbanColumn[]> {
    return frappe.call<KanbanColumn[]>('workhub_frappe_app.api.projects.get_board', {
      filters
    })
  },

  // ============== KPIs & Dashboard ==============

  async getDashboardKPIs(): Promise<DashboardKPIs> {
    return frappe.call<DashboardKPIs>('workhub_frappe_app.api.kpis.get_dashboard_kpis')
  },

  async getProjectKPIs(projectId: string): Promise<{
    progress_pct: number
    total_tasks: number
    completed_tasks: number
    blocked_tasks: number
    overdue_tasks: number
    velocity: number
  }> {
    return frappe.call('workhub_frappe_app.api.kpis.get_project_kpis', {
      project_id: projectId
    })
  },

  async getUserKPIs(userId?: string, period?: string): Promise<{
    tasks_completed_week: number
    tasks_completed_month: number
    velocity: number
    blocked_rate: number
  }> {
    return frappe.call('workhub_frappe_app.api.kpis.get_user_kpis', {
      user_id: userId,
      period
    })
  },

  async exportKPIs(format: 'json' | 'csv', scope?: string): Promise<string | DashboardKPIs> {
    return frappe.call('workhub_frappe_app.api.kpis.export_kpis', {
      format,
      scope
    })
  }
}

export default tasksApi
