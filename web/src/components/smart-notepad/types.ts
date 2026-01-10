// Smart Notepad Types

export type ActivityType = 'visit' | 'call' | 'email' | 'order' | 'quote'
export type Outcome = 'positive' | 'neutral' | 'negative' | 'order'
export type ActionType = 'create_order' | 'update_pipeline' | 'create_task' | 'add_timeline' | 'close_opportunity'

export interface CustomerSuggestion {
  id: string
  name: string
  customer_group: string | null
  territory: string | null
  is_distributor: boolean
  score?: number
}

export interface CustomerInfo {
  name: string
  matched_id: string | null
  is_new: boolean
  customer_group: string | null
  is_distributor: boolean
  suggestions: CustomerSuggestion[]
  // For new customer creation
  create_new?: boolean
  territory?: string
}

export interface Product {
  description: string
  matched_item?: string | null
  qty?: number | null
}

export interface SuggestedAction {
  type: ActionType
  label: string
  params: Record<string, unknown>
  enabled: boolean
}

export interface ParsedNote {
  customer: CustomerInfo
  activity_type: ActivityType
  outcome: Outcome
  interest_level: number
  products: Product[]
  notes: string
  raw_text: string
  suggested_actions: SuggestedAction[]
}

export interface ActionResult {
  type: ActionType
  success: boolean
  result?: Record<string, unknown>
  error?: string
}

export interface ExecuteResult {
  success: boolean
  customer_id: string
  actions_executed: number
  actions_failed: number
  results: ActionResult[]
  message: string
}

export interface ItemOption {
  id: string
  name: string
  item_group: string
  uom: string
  rate: number
}

// UI Labels
export const ACTIVITY_LABELS: Record<ActivityType, string> = {
  visit: 'Visita',
  call: 'Llamada',
  email: 'Email',
  order: 'Pedido',
  quote: 'Cotizacion'
}

export const OUTCOME_LABELS: Record<Outcome, string> = {
  positive: 'Positivo / Interesado',
  neutral: 'Neutral / Pendiente',
  negative: 'Negativo / Sin interes',
  order: 'Pedido confirmado'
}

export const ACTION_LABELS: Record<ActionType, string> = {
  add_timeline: 'Agregar a timeline del cliente',
  create_order: 'Crear pedido',
  create_task: 'Crear tarea de seguimiento',
  update_pipeline: 'Actualizar oportunidad en pipeline',
  close_opportunity: 'Cerrar oportunidad'
}
