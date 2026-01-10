// Natural Language Task Creation API Service
import { frappe } from '../frappe-client'
import type {
  ParsedTask,
  NLTaskResult,
  UserSuggestion,
  ProjectSuggestion
} from '../../components/nl-task-input/types'

export const nlTasksApi = {
  /**
   * Parse natural language text and extract task fields
   */
  async parse(text: string): Promise<ParsedTask> {
    return frappe.call<ParsedTask>(
      'workhub_frappe_app.api.nl_tasks.parse_task',
      { text }
    )
  },

  /**
   * Create task from parsed natural language input
   */
  async create(parsedTask: ParsedTask): Promise<NLTaskResult> {
    return frappe.call<NLTaskResult>(
      'workhub_frappe_app.api.nl_tasks.create_from_nl',
      { parsed_task: JSON.stringify(parsedTask) }
    )
  },

  /**
   * Search users for assignee autocomplete
   */
  async searchUsers(search: string = '', limit: number = 20): Promise<UserSuggestion[]> {
    return frappe.call<UserSuggestion[]>(
      'workhub_frappe_app.api.nl_tasks.search_users',
      { search, limit }
    )
  },

  /**
   * Search projects for project selection
   */
  async searchProjects(search: string = '', limit: number = 20): Promise<ProjectSuggestion[]> {
    return frappe.call<ProjectSuggestion[]>(
      'workhub_frappe_app.api.nl_tasks.search_projects',
      { search, limit }
    )
  }
}

export default nlTasksApi
