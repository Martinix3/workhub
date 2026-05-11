// Quick Task Component Types
import type { WorkLinkSuggestion } from '../../api/services/tasks'

// Re-export API types for convenience
export type {
  QuickTaskData,
  QuickTaskResponse,
  WorkLinkSuggestion,
  WorkLinkSuggestionsResponse,
  ProjectOption,
  AssignableUser
} from '../../api/services/tasks'

// Component Props

export interface QuickTaskModalProps {
  isOpen: boolean
  onClose: () => void
  initialContext?: {
    doctype?: string
    docId?: string
    department?: 'SALES' | 'OPS' | 'MKT'
  }
}

export interface WorkLinkSuggestionsProps {
  suggestions: WorkLinkSuggestion[]
  loading?: boolean
  error?: Error | null
  onSelect?: (suggestion: WorkLinkSuggestion) => void
  selectedDoctype?: string
  selectedDocId?: string
}

// Internal Types

export type ModalStep = 'input' | 'success' | 'error'

export type Priority = 'P0' | 'P1' | 'P2'

export type Department = 'SALES' | 'OPS' | 'MKT' | ''
