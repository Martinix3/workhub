// MyDay Component - TDAH-friendly task view
import { useState, useEffect, useMemo } from 'react'
import { Play, Check, AlertTriangle, X, Plus, Clock, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Link2 } from 'lucide-react'
import type { Task, TaskStatus, TaskPriority, MyDayData } from './types'
import { useWorkLinkSuggestions } from '../../../api/hooks/useWorkLinkSuggestions'
import { WorkLinkSuggestions } from './WorkLinkSuggestions'
import { DOCTYPE_CONFIG } from './WorkLinkSuggestions'
import type { WorkLinkDocType } from './types'
import workLinkSuggestionsApi from '../../../api/services/worklink-suggestions'
import { tasksApi } from '../../../api/services/tasks'

interface MyDayProps {
  data: MyDayData
  onTaskComplete?: (id: string) => void
  onTaskBlock?: (id: string, reason: string) => void
  onTaskClick?: (id: string) => void
  onQuickAdd?: (title: string, priority: TaskPriority) => void
  onChangeStatus?: (id: string, status: TaskStatus) => void
}

const priorityConfig: Record<TaskPriority, { bg: string; text: string; softBg: string }> = {
  P0: { bg: 'bg-error', text: 'text-error-text', softBg: 'bg-error-light' },
  P1: { bg: 'bg-gold', text: 'text-gold-dark', softBg: 'bg-gold-light' },
  P2: { bg: 'bg-success', text: 'text-success-text', softBg: 'bg-success-light' },
}

const statusBorderTop: Record<TaskStatus, string> = {
  BACKLOG: 'border-t-neutral-400',
  NEXT: 'border-t-cyan-400',
  DOING: 'border-t-gold',
  BLOCKED: 'border-t-error-dark',
  DONE: 'border-t-success-dark',
}

export function MyDay({
  data,
  onTaskComplete,
  onTaskBlock,
  onTaskClick,
  onQuickAdd,
  onChangeStatus,
}: MyDayProps) {
  const [focusedTaskId, setFocusedTaskId] = useState<string | null>(null)
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [quickAddTitle, setQuickAddTitle] = useState('')
  const [quickAddPriority, setQuickAddPriority] = useState<TaskPriority>('P2')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedWorkLink, setSelectedWorkLink] = useState<{
    doctype: string
    docId: string
    docName?: string
    confidence: number
  } | null>(null)

  // WorkLink suggestions hook
  const {
    suggestions,
    loading: suggestionsLoading,
    error: suggestionsError
  } = useWorkLinkSuggestions({
    title: quickAddTitle,
    enabled: showQuickAdd && quickAddTitle.trim().length > 3 && !selectedWorkLink,
    debounceMs: 500
  })

  // Auto-expand suggestions when they first appear
  useEffect(() => {
    if (suggestions.length > 0 && !showSuggestions && !selectedWorkLink) {
      setShowSuggestions(true)
    }
  }, [suggestions.length, showSuggestions, selectedWorkLink])

  const allTasks = [...data.today, ...data.upcoming]
  const focusedTask = focusedTaskId ? allTasks.find(t => t.name === focusedTaskId) : null
  const doingTasks = data.today.filter(t => t.status === 'DOING')
  const nextTasks = data.today.filter(t => t.status === 'NEXT')

  const handleFocus = (taskId: string) => setFocusedTaskId(taskId)
  const handleExitFocus = () => setFocusedTaskId(null)

  const handleComplete = (taskId: string) => {
    onTaskComplete?.(taskId)
    setFocusedTaskId(null)
  }

  const handleAcceptSuggestion = (doctype: string, docId: string, confidence: number) => {
    const suggestion = suggestions.find(s => s.doctype === doctype && s.doc_id === docId)
    setSelectedWorkLink({
      doctype,
      docId,
      docName: suggestion?.doc_name || docId,
      confidence
    })
    setShowSuggestions(false)
  }

  const handleDismissSuggestion = (doctype: string, docId: string, confidence: number) => {
    // Just remove from UI - we'll record dismissal with task ID later if needed
    // For now, we just hide it from the suggestions list
  }

  const handleQuickAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickAddTitle.trim() || isSubmitting) return

    setIsSubmitting(true)

    try {
      // Create the task using the API directly
      const task = await tasksApi.quickAdd(quickAddTitle.trim(), quickAddPriority)

      // If there's a selected worklink, accept the suggestion
      if (selectedWorkLink && task.name) {
        try {
          await workLinkSuggestionsApi.acceptSuggestion({
            taskId: task.name,
            doctype: selectedWorkLink.doctype,
            docId: selectedWorkLink.docId,
            confidence: selectedWorkLink.confidence
          })
        } catch (error) {
          console.error('Failed to link WorkLink:', error)
          // Don't fail the whole operation if worklink fails
        }
      }

      // Call the parent callback for any additional handling (e.g., refresh data)
      onQuickAdd?.(quickAddTitle.trim(), quickAddPriority)

      // Reset state
      setQuickAddTitle('')
      setSelectedWorkLink(null)
      setShowSuggestions(false)
      setShowQuickAdd(false)
    } catch (error) {
      console.error('Failed to create task:', error)
      // TODO: Show error to user
    } finally {
      setIsSubmitting(false)
    }
  }

  // Focus Mode - Full screen immersive
  if (focusedTask) {
    const config = priorityConfig[focusedTask.priority]
    return (
      <div className="fixed inset-0 z-50 bg-neutral-900/95 flex items-center justify-center p-4">
        <div className="w-full max-w-xl">
          <div className="bg-white border border-neutral-200">
            <div className={`h-1.5 ${config.bg}`} />

            <div className="p-6 lg:p-8">
              <div className="flex items-center gap-2 mb-4">
                <span className={`px-2 py-0.5 text-xs font-medium uppercase tracking-wider ${config.softBg} ${config.text}`}>
                  {focusedTask.priority}
                </span>
                {focusedTask.project_title && (
                  <span className="text-sm text-neutral-500">{focusedTask.project_title}</span>
                )}
              </div>

              <h1 className="font-heading text-2xl lg:text-3xl font-bold text-neutral-900 mb-4">
                {focusedTask.title}
              </h1>

              {focusedTask.description && (
                <p className="text-neutral-600 mb-4">{focusedTask.description}</p>
              )}

              <div className="flex justify-center mb-8">
                <div className="w-32 h-32 border border-neutral-200 bg-neutral-50 flex items-center justify-center">
                  <span className="font-mono text-3xl font-bold text-neutral-900">25:00</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => handleComplete(focusedTask.name)}
                  className="
                    flex-1 py-3 px-6
                    bg-success hover:bg-success-dark
                    text-white font-medium uppercase tracking-wider text-sm
                    border border-neutral-200
                    transition-all duration-75
                  "
                >
                  Completar
                </button>
                <button
                  onClick={() => {
                    const reason = prompt('Por que esta bloqueada?')
                    if (reason) onTaskBlock?.(focusedTask.name, reason)
                  }}
                  className="
                    py-3 px-6
                    bg-error-light hover:bg-error-light
                    text-error-text font-medium uppercase tracking-wider text-sm
                    border border-neutral-200
                    transition-colors
                  "
                >
                  Bloqueada
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={handleExitFocus}
            className="mt-4 w-full py-3 text-neutral-400 hover:text-white text-sm uppercase tracking-wider flex items-center justify-center gap-2"
          >
            <X size={16} />
            Salir del Focus Mode
          </button>
        </div>
      </div>
    )
  }

  // Normal View
  return (
    <div className="min-h-screen bg-neutral-100">
      <div className="max-w-6xl mx-auto p-4 lg:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-heading text-2xl lg:text-3xl font-bold text-neutral-900">
              Mi Dia
            </h1>
            <p className="text-sm text-neutral-500 mt-1">
              {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>

          <button
            onClick={() => setShowQuickAdd(true)}
            className="
              inline-flex items-center gap-2 px-4 py-2
              bg-gold hover:bg-gold-dark
              text-neutral-900 font-medium text-sm uppercase tracking-wider
              border border-neutral-200
              transition-all duration-75
            "
          >
            <Plus size={18} />
            Agregar
          </button>
        </div>

        {/* Main Content with Calendar */}
        <div className="grid lg:grid-cols-[1fr_280px] gap-6">
          {/* Tasks Column */}
          <div>
            {/* Summary Stats */}
            <div className="grid grid-cols-4 gap-3 mb-6">
              <StatCard label="Hoy" value={data.summary.total_today} color="amber" />
              <StatCard label="Vencidas" value={data.summary.overdue_count} color="red" />
              <StatCard label="Bloqueadas" value={data.summary.blocked_count} color="orange" />
              <StatCard label="Completadas" value={data.summary.completed_today} color="green" />
            </div>

            {/* Overdue Alert */}
            {data.overdue.length > 0 && (
              <div className="mb-6 p-4 bg-error-light border-2 border-error-dark">
                <div className="flex items-center gap-2 text-error-text font-medium mb-1">
                  <AlertTriangle size={18} />
                  {data.overdue.length} tarea{data.overdue.length > 1 ? 's' : ''} vencida{data.overdue.length > 1 ? 's' : ''}
                </div>
                <div className="space-y-1">
                  {data.overdue.slice(0, 3).map(task => (
                    <p
                      key={task.name}
                      onClick={() => onTaskClick?.(task.name)}
                      className="text-sm text-error-dark cursor-pointer hover:underline"
                    >
                      {task.title}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* En Progreso */}
            {doingTasks.length > 0 && (
              <section className="mb-8">
                <h2 className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-neutral-500 mb-3">
                  <span className="w-2 h-2 bg-gold animate-pulse" />
                  En Progreso
                </h2>
                <div className="space-y-3">
                  {doingTasks.map(task => (
                    <TaskCard
                      key={task.name}
                      task={task}
                      highlighted
                      onFocus={() => handleFocus(task.name)}
                      onComplete={() => handleComplete(task.name)}
                      onClick={() => onTaskClick?.(task.name)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Siguiente */}
            {nextTasks.length > 0 && (
              <section className="mb-8">
                <h2 className="text-xs font-medium uppercase tracking-wider text-neutral-500 mb-3">
                  Siguiente
                </h2>
                <div className="space-y-3">
                  {nextTasks.map(task => (
                    <TaskCard
                      key={task.name}
                      task={task}
                      onFocus={() => handleFocus(task.name)}
                      onComplete={() => handleComplete(task.name)}
                      onClick={() => onTaskClick?.(task.name)}
                      onStartDoing={() => onChangeStatus?.(task.name, 'DOING')}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Blocked */}
            {data.blocked.length > 0 && (
              <section className="mb-8">
                <h2 className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-error mb-3">
                  <AlertTriangle size={14} />
                  Bloqueadas
                </h2>
                <div className="space-y-3">
                  {data.blocked.map(task => (
                    <TaskCard
                      key={task.name}
                      task={task}
                      onClick={() => onTaskClick?.(task.name)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Empty State */}
            {data.today.length === 0 && data.overdue.length === 0 && (
              <div className="text-center py-12 bg-white border border-neutral-200">
                <Check size={48} className="mx-auto mb-4 text-success" />
                <h3 className="font-heading text-xl font-bold text-neutral-900 mb-2">
                  Dia Despejado
                </h3>
                <p className="text-neutral-500">
                  No tienes tareas pendientes para hoy
                </p>
              </div>
            )}
          </div>

          {/* Calendar Column */}
          <div className="hidden lg:block">
            <MiniCalendar tasks={[...data.today, ...data.upcoming]} overdueTasks={data.overdue} />
          </div>
        </div>

        {/* Quick Add Modal */}
        {showQuickAdd && (
          <div
            className="fixed inset-0 z-50 bg-neutral-900/50 flex items-start justify-center pt-24"
            onClick={() => setShowQuickAdd(false)}
          >
            <form
              onSubmit={handleQuickAddSubmit}
              onClick={e => e.stopPropagation()}
              className="bg-white border border-neutral-200 w-full max-w-md mx-4"
            >
              <div className="p-4 border-b border-neutral-200">
                <h3 className="font-heading text-lg font-bold text-neutral-900">
                  Nueva Tarea
                </h3>
              </div>
              <div className="p-4">
                <input
                  type="text"
                  value={quickAddTitle}
                  onChange={e => setQuickAddTitle(e.target.value)}
                  placeholder="Que necesitas hacer?"
                  autoFocus
                  className="
                    w-full px-4 py-3 text-lg
                    border-2 border-neutral-300
                    focus:border-neutral-900
                    bg-white
                    text-neutral-900
                    outline-none
                  "
                />

                <div className="flex gap-2 mt-4">
                  {(['P0', 'P1', 'P2'] as TaskPriority[]).map(p => {
                    const cfg = priorityConfig[p]
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setQuickAddPriority(p)}
                        className={`
                          px-3 py-1.5 text-sm font-medium
                          border border-neutral-200
                          ${quickAddPriority === p ? `${cfg.softBg} ${cfg.text}` : 'bg-white text-neutral-500'}
                        `}
                      >
                        {p}
                      </button>
                    )
                  })}
                </div>

                {/* Selected WorkLink Display */}
                {selectedWorkLink && (
                  <div className="mt-4 p-3 bg-success-light border-2 border-success-dark">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Link2 size={16} className="text-success-dark" />
                        <div>
                          <p className="text-xs font-medium text-success-text uppercase tracking-wider">
                            {DOCTYPE_CONFIG[selectedWorkLink.doctype as WorkLinkDocType]?.label || selectedWorkLink.doctype}
                          </p>
                          <p className="text-sm font-medium text-success-text">
                            {selectedWorkLink.docName}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedWorkLink(null)}
                        className="p-1 text-success-dark hover:text-success-text"
                        title="Quitar WorkLink"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                )}

                {/* WorkLink Suggestions - Collapsible */}
                {!selectedWorkLink && quickAddTitle.trim().length > 3 && (
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => setShowSuggestions(!showSuggestions)}
                      className="
                        w-full flex items-center justify-between px-3 py-2
                        bg-neutral-100 hover:bg-neutral-200
                        border-2 border-neutral-300
                        text-neutral-700 font-medium text-sm
                        transition-colors
                      "
                    >
                      <span className="flex items-center gap-2">
                        <Link2 size={14} />
                        Sugerencias de WorkLink
                        {suggestions.length > 0 && (
                          <span className="px-1.5 py-0.5 bg-cyan-500 text-white text-xs font-bold rounded-full">
                            {suggestions.length}
                          </span>
                        )}
                      </span>
                      {showSuggestions ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>

                    {showSuggestions && (
                      <div className="mt-2">
                        <WorkLinkSuggestions
                          suggestions={suggestions}
                          loading={suggestionsLoading}
                          error={suggestionsError}
                          onAccept={handleAcceptSuggestion}
                          onDismiss={handleDismissSuggestion}
                          className="shadow-none"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-neutral-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowQuickAdd(false)
                    setQuickAddTitle('')
                    setSelectedWorkLink(null)
                    setShowSuggestions(false)
                  }}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-neutral-500 font-medium disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !quickAddTitle.trim()}
                  className="
                    px-4 py-2
                    bg-gold hover:bg-gold-dark
                    text-neutral-900 font-medium uppercase tracking-wider text-sm
                    border border-neutral-200
                    disabled:opacity-50 disabled:cursor-not-allowed
                    transition-colors
                  "
                >
                  {isSubmitting ? 'Creando...' : 'Agregar'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}

// Stat Card
function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colorClasses: Record<string, string> = {
    amber: 'border-t-gold',
    red: 'border-t-error-dark',
    orange: 'border-t-error',
    green: 'border-t-success-dark',
  }

  return (
    <div className={`bg-white border border-neutral-200 border-t-4 ${colorClasses[color]} p-3`}>
      <p className="font-mono text-2xl font-bold text-neutral-900">{value}</p>
      <p className="text-xs text-neutral-500 uppercase tracking-wider">{label}</p>
    </div>
  )
}

// Task Card
interface TaskCardProps {
  task: Task
  highlighted?: boolean
  onFocus?: () => void
  onComplete?: () => void
  onClick?: () => void
  onStartDoing?: () => void
}

function TaskCard({ task, highlighted, onFocus, onComplete, onClick, onStartDoing }: TaskCardProps) {
  const priority = priorityConfig[task.priority]
  const isBlockedByDependencies = (task.blocked_by_count ?? 0) > 0

  return (
    <div
      className={`
        bg-white
        border border-neutral-200
        border-t-4 ${statusBorderTop[task.status]}
        ${isBlockedByDependencies ? 'border-l-4 border-l-error-dark bg-gradient-to-r from-error-light to-white' : ''}
        shadow-sm
        transition-all duration-75
        relative
      `}
    >
      {/* Blocked warning indicator */}
      {isBlockedByDependencies && (
        <div className="absolute top-2 right-2 text-error opacity-60">
          <AlertTriangle size={14} />
        </div>
      )}
      <div className="p-4 flex items-start gap-4">
        {/* Checkbox */}
        {task.status !== 'BLOCKED' && onComplete && (
          <button
            onClick={e => {
              e.stopPropagation()
              onComplete?.()
            }}
            className="
              w-6 h-6 flex-shrink-0 mt-0.5
              border border-neutral-200
              hover:bg-success-light
              flex items-center justify-center
              transition-colors group/check
            "
          >
            <Check size={14} className="text-success-dark opacity-0 group-hover/check:opacity-100" />
          </button>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0 cursor-pointer" onClick={onClick}>
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-1.5 py-0.5 text-xs font-medium ${priority.softBg} ${priority.text}`}>
              {task.priority}
            </span>
            {task.project_title && (
              <span className="text-xs text-neutral-400 truncate">{task.project_title}</span>
            )}
            {task.status === 'BLOCKED' && (
              <span className="px-1.5 py-0.5 text-xs font-medium bg-error-light text-error-text">
                BLOQUEADA
              </span>
            )}
            {isBlockedByDependencies && task.status !== 'BLOCKED' && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium bg-error-light text-error-text border border-error">
                <AlertTriangle size={10} />
                Bloqueada por {task.blocked_by_count}
              </span>
            )}
            {(task.blocks_count ?? 0) > 0 && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium bg-gold-light text-gold-dark border border-gold">
                Bloquea {task.blocks_count}
              </span>
            )}
          </div>
          <h3 className="font-medium text-neutral-900 hover:underline">
            {task.title}
          </h3>
          {task.blocked_reason && (
            <p className="text-xs text-error mt-1">{task.blocked_reason}</p>
          )}
          {task.due_date && (
            <p className="text-xs text-neutral-500 mt-1 flex items-center gap-1">
              <Clock size={12} />
              {new Date(task.due_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {task.status === 'NEXT' && onStartDoing && (
            <button
              onClick={e => {
                e.stopPropagation()
                onStartDoing?.()
              }}
              className="
                p-2 text-neutral-400 hover:text-cyan-500
                hover:bg-cyan-50
                transition-colors
              "
              title="Empezar"
            >
              <Play size={16} />
            </button>
          )}
          {task.status === 'DOING' && onFocus && (
            <button
              onClick={e => {
                e.stopPropagation()
                onFocus?.()
              }}
              className="
                p-2 text-neutral-400 hover:text-gold-dark
                hover:bg-gold-light
                transition-colors
              "
              title="Focus Mode"
            >
              <Play size={20} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// Mini Calendar
interface MiniCalendarProps {
  tasks: Task[]
  overdueTasks?: Task[]
}

function MiniCalendar({ tasks, overdueTasks = [] }: MiniCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const calendar = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1

    const days: (number | null)[] = []
    for (let i = 0; i < startingDay; i++) days.push(null)
    for (let i = 1; i <= daysInMonth; i++) days.push(i)
    while (days.length % 7 !== 0) days.push(null)

    return days
  }, [currentMonth])

  const today = new Date()
  const isCurrentMonth = today.getMonth() === currentMonth.getMonth() && today.getFullYear() === currentMonth.getFullYear()

  const getTasksForDay = (day: number) => {
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return tasks.filter(t => t.due_date === dateStr).length
  }

  const hasOverdue = (day: number) => {
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return overdueTasks.some(t => t.due_date === dateStr)
  }

  return (
    <div className="bg-white border border-neutral-200">
      <div className="p-3 border-b border-neutral-200 flex items-center justify-between">
        <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} className="p-1 hover:bg-neutral-100">
          <ChevronLeft size={16} />
        </button>
        <span className="font-heading font-bold text-neutral-900 capitalize">
          {currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
        </span>
        <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} className="p-1 hover:bg-neutral-100">
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-7 border-b border-neutral-200">
        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day, i) => (
          <div key={day} className={`py-2 text-center text-xs font-bold uppercase ${i >= 5 ? 'text-neutral-400' : 'text-neutral-500'}`}>
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 p-2 gap-1">
        {calendar.map((day, i) => {
          if (!day) return <div key={i} />

          const isToday = isCurrentMonth && day === today.getDate()
          const taskCount = getTasksForDay(day)
          const isOverdue = hasOverdue(day)
          const isWeekend = i % 7 >= 5

          return (
            <button
              key={i}
              className={`
                relative aspect-square flex flex-col items-center justify-center
                text-sm font-mono
                border-2 transition-all
                ${isToday
                  ? 'bg-gold border-neutral-900 font-bold'
                  : isOverdue
                    ? 'bg-error-light border-error'
                    : taskCount > 0
                      ? 'bg-cyan-100 border-cyan-400'
                      : isWeekend
                        ? 'text-neutral-400 border-transparent hover:border-neutral-300'
                        : 'text-neutral-600 border-transparent hover:border-neutral-300'
                }
              `}
            >
              <span>{day}</span>
              {taskCount > 0 && !isToday && (
                <span className="absolute bottom-0.5 text-[8px] font-bold text-cyan-600">
                  {taskCount}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="p-3 border-t border-neutral-200 flex flex-wrap gap-3 text-[10px] uppercase tracking-wider">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-gold border border-neutral-900" />
          <span className="text-neutral-500">Hoy</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-cyan-100 border border-cyan-400" />
          <span className="text-neutral-500">Tareas</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-error-light border border-error" />
          <span className="text-neutral-500">Vencidas</span>
        </div>
      </div>
    </div>
  )
}

export default MyDay
