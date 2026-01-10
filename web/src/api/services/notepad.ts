// Smart Notepad API Service
import { frappe } from '../frappe-client'
import type {
  ParsedNote,
  ExecuteResult,
  CustomerSuggestion,
  ItemOption
} from '../../components/smart-notepad/types'

export const notepadApi = {
  /**
   * Parse natural language note and extract entities
   */
  async parse(text: string): Promise<ParsedNote> {
    return frappe.call<ParsedNote>(
      'workhub_frappe_app.api.notepad.parse',
      { text }
    )
  },

  /**
   * Execute confirmed actions from parsed note
   */
  async execute(parsedNote: ParsedNote): Promise<ExecuteResult> {
    return frappe.call<ExecuteResult>(
      'workhub_frappe_app.api.notepad.execute',
      { parsed_note: JSON.stringify(parsedNote) }
    )
  },

  /**
   * Search customers for autocomplete
   */
  async searchCustomers(search: string = '', limit: number = 20): Promise<CustomerSuggestion[]> {
    return frappe.call<CustomerSuggestion[]>(
      'workhub_frappe_app.api.notepad.search_customers',
      { search, limit }
    )
  },

  /**
   * Search items for product selection
   */
  async searchItems(search: string = '', limit: number = 20): Promise<ItemOption[]> {
    return frappe.call<ItemOption[]>(
      'workhub_frappe_app.api.notepad.get_items',
      { search, limit }
    )
  }
}

export default notepadApi
