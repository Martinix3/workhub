// Natural Language Task Creation Types

import type { TaskPriority, TaskStatus } from '../sections/tasks/types'

// Re-export for convenience
export type { TaskPriority, TaskStatus }

// User suggestion for assignee autocomplete
export interface UserSuggestion {
  id: string
  full_name: string
  email: string
  department?: string
  user_image?: string
  score?: number
}

// Project suggestion for project selection
export interface ProjectSuggestion {
  id: string
  title: string
  description?: string
  department: string
  status: string
  score?: number
}

// Assignee information with match results
export interface AssigneeInfo {
  name: string
  matched: boolean
  user: UserSuggestion | null
  suggestions: UserSuggestion[]
}

// Project information with match results
export interface ProjectInfo {
  name: string
  matched: boolean
  project: ProjectSuggestion | null
  suggestions: ProjectSuggestion[]
}

// Parsed task from natural language input
export interface ParsedTask {
  title: string
  due_date?: string | null
  priority: TaskPriority
  assignee: AssigneeInfo
  project: ProjectInfo
  description?: string | null
  raw_text: string
}

// Result from task creation
export interface NLTaskResult {
  success: boolean
  task_id: string
  message: string
}

// UI Labels
export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  P0: 'Crítica',
  P1: 'Alta',
  P2: 'Normal'
}

export const STATUS_LABELS: Record<TaskStatus, string> = {
  BACKLOG: 'Backlog',
  NEXT: 'Próximas',
  DOING: 'En Progreso',
  BLOCKED: 'Bloqueadas',
  DONE: 'Completadas'
}

// Priority colors for UI
export const PRIORITY_COLORS: Record<TaskPriority, string> = {
  P0: 'red',
  P1: 'orange',
  P2: 'blue'
}

// Status colors for UI
export const STATUS_COLORS: Record<TaskStatus, string> = {
  BACKLOG: 'gray',
  NEXT: 'blue',
  DOING: 'yellow',
  BLOCKED: 'red',
  DONE: 'green'
}
