// Templates API Service
import { frappe } from '../frappe-client'
import type { Project } from '../../components/sections/tasks/types'

// Template types matching the API response structure
export interface TemplateListItem {
  name: string
  description?: string
  department: 'SALES' | 'OPS' | 'MKT' | 'PRODUCTION'
  task_count: number
  estimated_duration_days: number
}

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

export interface TemplateMilestone {
  sequence: number
  title: string
  offset_days: number
  duration_days: number
}

export interface TemplateDependency {
  from_sequence: number
  to_sequence: number
  from_title: string
  to_title: string
}

export interface TemplatePreview {
  template: {
    name: string
    description?: string
    department: 'SALES' | 'OPS' | 'MKT' | 'PRODUCTION'
    estimated_duration_days: number
    task_count: number
    milestone_count: number
  }
  tasks: TemplateTask[]
  milestones: TemplateMilestone[]
  dependencies: TemplateDependency[]
}

export interface CreateTemplateData {
  template_name: string
  description?: string
  department: 'SALES' | 'OPS' | 'MKT' | 'PRODUCTION'
  default_duration_days?: number
  is_active?: number
  tasks?: Array<{
    sequence: number
    title: string
    description?: string
    offset_days: number
    duration_days: number
    default_assignee_role?: string
    depends_on_sequence?: number | null
    is_milestone?: boolean
  }>
}

export interface UpdateTemplateData {
  description?: string
  department?: 'SALES' | 'OPS' | 'MKT' | 'PRODUCTION'
  default_duration_days?: number
  is_active?: number
  tasks?: Array<{
    sequence: number
    title: string
    description?: string
    offset_days: number
    duration_days: number
    default_assignee_role?: string
    depends_on_sequence?: number | null
    is_milestone?: boolean
  }>
}

export interface CreateFromTemplateData {
  title?: string
  description?: string
  department?: 'SALES' | 'OPS' | 'MKT' | 'PRODUCTION'
  owner_user?: string
  start_date?: string
  assigned_to?: string
}

export interface SaveProjectAsTemplateData {
  template_name: string
  description?: string
  department?: 'SALES' | 'OPS' | 'MKT' | 'PRODUCTION'
  default_duration_days?: number
}

export const templatesApi = {
  // ============== Template Gallery (Read-only for users) ==============

  async getTemplates(department?: string): Promise<TemplateListItem[]> {
    return frappe.call<TemplateListItem[]>('workhub_frappe_app.api.projects.get_templates', {
      department
    })
  },

  async getTemplatePreview(templateId: string): Promise<TemplatePreview> {
    return frappe.call<TemplatePreview>('workhub_frappe_app.api.projects.preview_template', {
      template_id: templateId
    })
  },

  async createFromTemplate(templateId: string, data: CreateFromTemplateData): Promise<{
    success: boolean
    project_id: string
    tasks_created: number
  }> {
    return frappe.call('workhub_frappe_app.api.projects.create_from_template', {
      template_id: templateId,
      data: JSON.stringify(data)
    })
  },

  // ============== Template Management (Admin) ==============

  async createTemplate(data: CreateTemplateData): Promise<{
    success: boolean
    template_id: string
  }> {
    return frappe.call('workhub_frappe_app.api.templates.create_template', {
      data: JSON.stringify(data)
    })
  },

  async updateTemplate(templateId: string, data: UpdateTemplateData): Promise<{
    success: boolean
    template_id: string
  }> {
    return frappe.call('workhub_frappe_app.api.templates.update_template', {
      template_id: templateId,
      data: JSON.stringify(data)
    })
  },

  async deleteTemplate(templateId: string): Promise<{
    success: boolean
    message: string
  }> {
    return frappe.call('workhub_frappe_app.api.templates.delete_template', {
      template_id: templateId
    })
  },

  async duplicateTemplate(templateId: string, newName?: string): Promise<{
    success: boolean
    template_id: string
    template_name: string
    tasks_copied: number
  }> {
    return frappe.call('workhub_frappe_app.api.templates.duplicate_template', {
      template_id: templateId,
      new_name: newName
    })
  },

  async saveProjectAsTemplate(projectId: string, data: SaveProjectAsTemplateData): Promise<{
    success: boolean
    template_id: string
    template_name: string
    tasks_converted: number
    department: string
    estimated_duration_days: number
  }> {
    return frappe.call('workhub_frappe_app.api.templates.save_project_as_template', {
      project_id: projectId,
      data: JSON.stringify(data)
    })
  }
}

export default templatesApi
