// Settings API Service
import { frappe } from '../frappe-client'

// Types
export interface UserSettings {
  theme: 'light' | 'dark' | 'system'
  language: 'es' | 'en'
  notifications: {
    email: boolean
    push: boolean
    task_assigned: boolean
    task_status: boolean
    overdue_alerts: boolean
    order_status: boolean
    project_health: boolean
    digest_frequency: 'daily' | 'weekly' | 'none'
  }
  department_access: string[]
}

export interface UserProfile {
  email: string
  full_name: string
  first_name: string
  last_name: string
  user_image: string | null
  roles: string[]
  departments: string[]
}

export interface Department {
  id: string
  name: string
  icon: string
}

export interface UpdateProfileData {
  first_name?: string
  last_name?: string
  user_image?: string
}

export interface UpdateSettingsData {
  theme?: 'light' | 'dark' | 'system'
  language?: 'es' | 'en'
  notifications?: {
    email?: boolean
    push?: boolean
    task_assigned?: boolean
    task_status?: boolean
    overdue_alerts?: boolean
    order_status?: boolean
    project_health?: boolean
    digest_frequency?: 'daily' | 'weekly' | 'none'
  }
}

// API Methods
const settingsApi = {
  // Get user settings
  async getSettings(): Promise<UserSettings> {
    return frappe.call<UserSettings>('workhub_frappe_app.api.settings.get_user_settings')
  },

  // Update user settings
  async updateSettings(settings: UpdateSettingsData): Promise<UserSettings> {
    return frappe.call<UserSettings>('workhub_frappe_app.api.settings.update_user_settings', {
      settings: JSON.stringify(settings)
    })
  },

  // Get user profile
  async getProfile(): Promise<UserProfile> {
    return frappe.call<UserProfile>('workhub_frappe_app.api.settings.get_user_profile')
  },

  // Update user profile
  async updateProfile(data: UpdateProfileData): Promise<UserProfile> {
    return frappe.call<UserProfile>('workhub_frappe_app.api.settings.update_user_profile', {
      data: JSON.stringify(data)
    })
  },

  // Get available departments
  async getDepartments(): Promise<Department[]> {
    return frappe.call<Department[]>('workhub_frappe_app.api.settings.get_available_departments')
  }
}

export default settingsApi
