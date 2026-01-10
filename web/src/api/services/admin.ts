// Admin API Service
import { frappe } from '../frappe-client'

// Types
export interface User {
  name: string
  email: string
  full_name: string
  first_name: string
  last_name: string
  user_image: string | null
  enabled: number
  creation: string
  last_active: string | null
  roles: string[]
}

export interface UserDetail extends User {
  user_type: string
  language: string
  time_zone: string
}

export interface UsersResponse {
  users: User[]
  total: number
  limit: number
  offset: number
}

export interface Role {
  name: string
  desk_access: number
  is_custom: number
}

export interface CreateUserData {
  email: string
  first_name: string
  last_name?: string
  roles?: string[]
  send_welcome_email?: boolean
}

export interface UpdateUserData {
  first_name?: string
  last_name?: string
  enabled?: number
  language?: string
  time_zone?: string
}

export interface RoleActionResponse {
  success: boolean
  message: string
  roles: string[]
}

export interface InvitationResponse {
  success: boolean
  message: string
  user_id: string
  email_sent?: boolean
}

// API Methods
const adminApi = {
  // Get users list
  async getUsers(limit = 50, offset = 0, search?: string): Promise<UsersResponse> {
    return frappe.call<UsersResponse>('workhub_frappe_app.api.admin.get_users', {
      limit,
      offset,
      search
    })
  },

  // Get user detail
  async getUserDetail(userId: string): Promise<UserDetail> {
    return frappe.call<UserDetail>('workhub_frappe_app.api.admin.get_user_detail', {
      user_id: userId
    })
  },

  // Create user
  async createUser(data: CreateUserData): Promise<UserDetail> {
    return frappe.call<UserDetail>('workhub_frappe_app.api.admin.create_user', {
      email: data.email,
      first_name: data.first_name,
      last_name: data.last_name,
      roles: data.roles ? JSON.stringify(data.roles) : undefined,
      send_welcome_email: data.send_welcome_email ?? true
    })
  },

  // Update user
  async updateUser(userId: string, data: UpdateUserData): Promise<UserDetail> {
    return frappe.call<UserDetail>('workhub_frappe_app.api.admin.update_user', {
      user_id: userId,
      data: JSON.stringify(data)
    })
  },

  // Delete (disable) user
  async deleteUser(userId: string): Promise<{ success: boolean; message: string }> {
    return frappe.call<{ success: boolean; message: string }>('workhub_frappe_app.api.admin.delete_user', {
      user_id: userId
    })
  },

  // Get available roles
  async getRoles(): Promise<Role[]> {
    return frappe.call<Role[]>('workhub_frappe_app.api.admin.get_roles')
  },

  // Assign role to user
  async assignRole(userId: string, role: string): Promise<RoleActionResponse> {
    return frappe.call<RoleActionResponse>('workhub_frappe_app.api.admin.assign_role', {
      user_id: userId,
      role
    })
  },

  // Remove role from user
  async removeRole(userId: string, role: string): Promise<RoleActionResponse> {
    return frappe.call<RoleActionResponse>('workhub_frappe_app.api.admin.remove_role', {
      user_id: userId,
      role
    })
  },

  // Send invitation
  async sendInvitation(email: string, firstName?: string, roles?: string[]): Promise<InvitationResponse> {
    return frappe.call<InvitationResponse>('workhub_frappe_app.api.admin.send_invitation', {
      email,
      first_name: firstName,
      roles: roles ? JSON.stringify(roles) : undefined
    })
  }
}

export default adminApi
