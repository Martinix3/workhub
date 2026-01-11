// WorkLink Suggestions API Service
import { frappe } from '../frappe-client'
import type { Department } from '../../components/sections/tasks/types'

/**
 * Represents a WorkLink suggestion returned by the document matcher
 */
export interface WorkLinkSuggestion {
  doctype: string
  doc_id: string
  doc_name: string
  confidence: number
  match_type: 'document_number' | 'customer_name' | 'batch_code' | 'product_code' | 'keyword' | 'fuzzy'
  boosted: boolean
  // Optional enriched fields from backend
  display_name?: string
  description?: string
  status?: string
}

/**
 * Response from get_suggestions API
 */
export interface GetSuggestionsResponse {
  success: boolean
  suggestions: WorkLinkSuggestion[]
  count: number
}

/**
 * Response from accept_suggestion API
 */
export interface AcceptSuggestionResponse {
  success: boolean
  worklink_id: string
  task_id: string
  message: string
}

/**
 * Response from dismiss_suggestion API
 */
export interface DismissSuggestionResponse {
  success: boolean
  message: string
}

/**
 * Parameters for getting WorkLink suggestions
 */
export interface GetSuggestionsParams {
  title: string
  description?: string
  department?: Department
  projectId?: string
  limit?: number
}

/**
 * Parameters for accepting a suggestion
 */
export interface AcceptSuggestionParams {
  taskId: string
  doctype: string
  docId: string
  notes?: string
  confidenceScore?: number
}

/**
 * Parameters for dismissing a suggestion
 */
export interface DismissSuggestionParams {
  taskId: string
  doctype: string
  docId: string
  reason?: string
  confidenceScore?: number
}

export const workLinkSuggestionsApi = {
  /**
   * Get WorkLink suggestions based on task text
   * @param params - Suggestion parameters
   * @returns List of document suggestions with confidence scores
   */
  async getSuggestions(params: GetSuggestionsParams): Promise<WorkLinkSuggestion[]> {
    const response = await frappe.call<GetSuggestionsResponse>(
      'workhub_frappe_app.api.worklink_suggestions.get_suggestions',
      {
        title: params.title,
        description: params.description || '',
        department: params.department,
        project_id: params.projectId,
        limit: params.limit || 5
      }
    )
    return response.suggestions
  },

  /**
   * Accept a suggestion and create the WorkLink connection
   * @param params - Accept suggestion parameters
   * @returns Success response with worklink_id
   */
  async acceptSuggestion(params: AcceptSuggestionParams): Promise<AcceptSuggestionResponse> {
    return await frappe.call<AcceptSuggestionResponse>(
      'workhub_frappe_app.api.worklink_suggestions.accept_suggestion',
      {
        task_id: params.taskId,
        doctype: params.doctype,
        doc_id: params.docId,
        notes: params.notes || '',
        confidence_score: params.confidenceScore
      }
    )
  },

  /**
   * Dismiss a suggestion for pattern learning
   * @param params - Dismiss suggestion parameters
   * @returns Success response
   */
  async dismissSuggestion(params: DismissSuggestionParams): Promise<DismissSuggestionResponse> {
    return await frappe.call<DismissSuggestionResponse>(
      'workhub_frappe_app.api.worklink_suggestions.dismiss_suggestion',
      {
        task_id: params.taskId,
        doctype: params.doctype,
        doc_id: params.docId,
        reason: params.reason || '',
        confidence_score: params.confidenceScore
      }
    )
  }
}

export default workLinkSuggestionsApi
