// Templates API Service
import { frappe } from '../frappe-client'
import type {
  Department,
  ProjectTemplate,
  TemplateTask,
  TemplateMilestone,
  TemplateDependency,
  TemplatePreview
} from '../../components/sections/tasks/types'

// Re-export centralized types for convenience
export type {
  TemplateTask,
  TemplateMilestone,
  TemplateDependency,
  TemplatePreview
}

// Template List Item (matches API response for get_templates)
export interface TemplateListItem {
  name: string
  description?: string
  department: Department
  task_count: number
  estimated_duration_days: number
}

export interface CreateTemplateData {
  template_name: string
  description?: string
  department: Department
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
  department?: Department
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
  department?: Department
  owner_user?: string
  start_date?: string
  assigned_to?: string
}

export interface SaveProjectAsTemplateData {
  template_name: string
  description?: string
  department?: Department
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
