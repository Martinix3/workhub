// Saved Filters API Service
import { frappe } from '../frappe-client'
import type {
  TaskStatus,
  TaskPriority,
  Department
} from '../../components/sections/tasks/types'

// Filter Criteria - matches backend filter_json schema
export interface FilterCriteria {
  status?: TaskStatus | TaskStatus[] | null
  priority?: TaskPriority | TaskPriority[] | null
  department?: Department | null
  assigned_to?: string | '$current_user' | null
  project?: string | null
  due_date_op?: '<' | '>' | 'between' | 'in_range' | null
  due_date_value?: string | '$today' | '$this_week' | '$this_month' | null
  search?: string | null
}

// Saved Filter - matches WH Saved Filter DocType
export interface SavedFilter {
  name: string  // DocType ID
  title: string
  entity_type: 'task' | 'project'
  filter_json: FilterCriteria
  is_shared: boolean
  is_preset: boolean
  icon?: string
  sort_order?: number
  owner?: string
  count?: number  // Populated from get_filter_counts
}

export const savedFiltersApi = {
  // Get all saved filters (user's + shared + presets)
  async getSavedFilters(entityType?: 'task' | 'project'): Promise<SavedFilter[]> {
    return frappe.call<SavedFilter[]>('workhub_frappe_app.api.saved_filters.get_saved_filters', {
      entity_type: entityType
    })
  },

  // Get single filter by ID
  async getSavedFilter(filterId: string): Promise<SavedFilter> {
    return frappe.call<SavedFilter>('workhub_frappe_app.api.saved_filters.get_saved_filter', {
      filter_id: filterId
    })
  },

  // Create new saved filter
  async createSavedFilter(data: {
    title: string
    entity_type: 'task' | 'project'
    filter_json: FilterCriteria
    is_shared?: boolean
    icon?: string
  }): Promise<SavedFilter> {
    return frappe.call<SavedFilter>('workhub_frappe_app.api.saved_filters.create_saved_filter', {
      data
    })
  },

  // Update existing saved filter
  async updateSavedFilter(
    filterId: string,
    data: {
      title?: string
      filter_json?: FilterCriteria
      icon?: string
      sort_order?: number
    }
  ): Promise<SavedFilter> {
    return frappe.call<SavedFilter>('workhub_frappe_app.api.saved_filters.update_saved_filter', {
      filter_id: filterId,
      data
    })
  },

  // Delete saved filter
  async deleteSavedFilter(filterId: string): Promise<void> {
    await frappe.call('workhub_frappe_app.api.saved_filters.delete_saved_filter', {
      filter_id: filterId
    })
  },

  // Toggle shared status
  async shareFilter(filterId: string, shared: boolean): Promise<SavedFilter> {
    return frappe.call<SavedFilter>('workhub_frappe_app.api.saved_filters.share_filter', {
      filter_id: filterId,
      shared
    })
  },

  // Get badge counts for all filters
  async getFilterCounts(): Promise<Record<string, number>> {
    return frappe.call<Record<string, number>>('workhub_frappe_app.api.saved_filters.get_filter_counts')
  }
}

export default savedFiltersApi
