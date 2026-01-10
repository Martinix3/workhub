// MyDay Component - TDAH-friendly task view
import { useState, useMemo } from 'react'
import { Play, Check, AlertTriangle, X, Plus, Clock, ChevronLeft, ChevronRight, CheckSquare, Square, HelpCircle } from 'lucide-react'
import { useTaskSelection } from '../../contexts/TaskSelectionContext'
import { BulkActionsBar } from '../tasks/BulkActionsBar'
import type { Task, TaskStatus, TaskPriority, MyDayData } from './types'

interface MyDayProps {
  data: MyDayData
  onTaskComplete?: (id: string) => void
  onTaskBlock?: (id: string, reason: string) => void
  onTaskClick?: (id: string) => void
  onQuickAdd?: (title: string, priority: TaskPriority) => void
  onChangeStatus?: (id: string, status: TaskStatus) => void
  selectionMode?: boolean
  onToggleSelectionMode?: () => void
  onBulkChangeStatus?: () => void
  onBulkAssign?: () => void
  onBulkChangePriority?: () => void
  onBulkMoveProject?: () => void
  onBulkAddWorkLink?: () => void
}

const priorityConfig: Record<TaskPriority, { bg: string; text: string; softBg: string }> = {
  P0: { bg: 'bg-red-500', text: 'text-red-700', softBg: 'bg-red-100' },
  P1: { bg: 'bg-amber-400', text: 'text-amber-700', softBg: 'bg-amber-100' },
  P2: { bg: 'bg-green-500', text: 'text-green-700', softBg: 'bg-green-100' },
}

const statusBorderTop: Record<TaskStatus, string> = {
  BACKLOG: 'border-t-stone-400',
  NEXT: 'border-t-cyan-400',
  DOING: 'border-t-amber-400',
  BLOCKED: 'border-t-red-500',
  DONE: 'border-t-green-500',
}

export function MyDay({
  data,
  onTaskComplete,
  onTaskBlock,
  onTaskClick,
  onQuickAdd,
  onChangeStatus,
  selectionMode = false,
  onToggleSelectionMode,
  onBulkChangeStatus,
  onBulkAssign,
  onBulkChangePriority,
  onBulkMoveProject,
  onBulkAddWorkLink,
}: MyDayProps) {
  const [focusedTaskId, setFocusedTaskId] = useState<string | null>(null)
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [quickAddTitle, setQuickAddTitle] = useState('')
  const [quickAddPriority, setQuickAddPriority] = useState<TaskPriority>('P2')
  const { selectAll, clearSelection } = useTaskSelection()

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

  const handleQuickAddSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (quickAddTitle.trim()) {
      onQuickAdd?.(quickAddTitle.trim(), quickAddPriority)
      setQuickAddTitle('')
      setShowQuickAdd(false)
    }
  }

  // Toggle selection mode - clear selections when exiting
  const handleToggleSelectionMode = () => {
    if (selectionMode) {
      clearSelection()
    }
    onToggleSelectionMode?.()
  }

  // Select all tasks in a section
  const handleSelectAllSection = (tasks: Task[]) => {
    const taskIds = tasks.map(task => task.name)
    selectAll(taskIds)
  }

  // Focus Mode - Full screen immersive
  if (focusedTask) {
    const config = priorityConfig[focusedTask.priority]
    return (
      <div className="fixed inset-0 z-50 bg-stone-900/95 flex items-center justify-center p-4">
        <div className="w-full max-w-xl">
          <div className="bg-white border-2 border-stone-900 shadow-[4px_4px_0_#1c1917]">
            <div className={`h-1.5 ${config.bg}`} />

            <div className="p-6 lg:p-8">
              <div className="flex items-center gap-2 mb-4">
                <span className={`px-2 py-0.5 text-xs font-medium uppercase tracking-wider ${config.softBg} ${config.text}`}>
                  {focusedTask.priority}
                </span>
                {focusedTask.project_title && (
                  <span className="text-sm text-stone-500">{focusedTask.project_title}</span>
                )}
              </div>

              <h1 className="font-serif text-2xl lg:text-3xl font-bold text-stone-900 mb-4">
                {focusedTask.title}
              </h1>

              {focusedTask.description && (
                <p className="text-stone-600 mb-4">{focusedTask.description}</p>
              )}

              <div className="flex justify-center mb-8">
                <div className="w-32 h-32 border-2 border-stone-900 bg-stone-50 flex items-center justify-center">
                  <span className="font-mono text-3xl font-bold text-stone-900">25:00</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => handleComplete(focusedTask.name)}
                  className="
                    flex-1 py-3 px-6
                    bg-green-500 hover:bg-green-600
                    text-white font-medium uppercase tracking-wider text-sm
                    border-2 border-stone-900
                    shadow-[4px_4px_0_#1c1917]
                    hover:shadow-[2px_2px_0_#1c1917]
                    hover:translate-x-[2px] hover:translate-y-[2px]
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
                    bg-red-100 hover:bg-red-200
                    text-red-700 font-medium uppercase tracking-wider text-sm
                    border-2 border-stone-900
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
            className="mt-4 w-full py-3 text-stone-400 hover:text-white text-sm uppercase tracking-wider flex items-center justify-center gap-2"
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
    <div className="min-h-screen bg-stone-100">
      <div className="max-w-6xl mx-auto p-4 lg:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-serif text-2xl lg:text-3xl font-bold text-stone-900">
              Mi Dia
            </h1>
            <p className="text-sm text-stone-500 mt-1">
              {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Selection Mode Toggle */}
            {onToggleSelectionMode && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleToggleSelectionMode}
                  className={`
                    px-3 py-2 text-xs font-medium uppercase tracking-wider
                    border-2 border-stone-900
                    transition-all duration-75
                    flex items-center gap-2
                    ${selectionMode
                      ? 'bg-amber-400 text-stone-900 shadow-[2px_2px_0_#1c1917]'
                      : 'bg-white text-stone-900 hover:bg-stone-100'
                    }
                  `}
                  title={selectionMode ? 'Salir del modo selección' : 'Activar modo selección'}
                >
                  {selectionMode ? <CheckSquare size={14} /> : <Square size={14} />}
                  <span>{selectionMode ? 'Seleccionando' : 'Seleccionar'}</span>
                </button>

                {/* Keyboard Shortcuts Help */}
                <div className="relative group">
                  <HelpCircle size={18} className="text-stone-400 hover:text-stone-600 cursor-help" />
                  <div className="
                    absolute right-0 top-full mt-2 w-64 p-3
                    bg-white border-2 border-stone-900
                    shadow-[4px_4px_0_#1c1917]
                    opacity-0 invisible group-hover:opacity-100 group-hover:visible
                    transition-all duration-150 z-50
                  ">
                    <p className="font-bold text-xs uppercase tracking-wider text-stone-900 mb-2">
                      Atajos de Teclado
                    </p>
                    <div className="space-y-1 text-xs text-stone-700">
                      <div className="flex justify-between items-center">
                        <span className="font-mono text-[10px] bg-stone-100 px-1.5 py-0.5 border border-stone-300">Ctrl/Cmd+A</span>
                        <span className="text-[10px] ml-2">Seleccionar todas</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-mono text-[10px] bg-stone-100 px-1.5 py-0.5 border border-stone-300">Escape</span>
                        <span className="text-[10px] ml-2">Limpiar selección</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-mono text-[10px] bg-stone-100 px-1.5 py-0.5 border border-stone-300">Ctrl/Cmd+Click</span>
                        <span className="text-[10px] ml-2">Alternar selección</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Add Button */}
            <button
              onClick={() => setShowQuickAdd(true)}
              className="
                inline-flex items-center gap-2 px-4 py-2
                bg-amber-400 hover:bg-amber-500
                text-stone-900 font-medium text-sm uppercase tracking-wider
                border-2 border-stone-900
                shadow-[4px_4px_0_#1c1917]
                hover:shadow-[2px_2px_0_#1c1917]
                hover:translate-x-[2px] hover:translate-y-[2px]
                transition-all duration-75
              "
            >
              <Plus size={18} />
              Agregar
            </button>
          </div>
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
              <div className="mb-6 p-4 bg-red-50 border-2 border-red-500">
                <div className="flex items-center gap-2 text-red-700 font-medium mb-1">
                  <AlertTriangle size={18} />
                  {data.overdue.length} tarea{data.overdue.length > 1 ? 's' : ''} vencida{data.overdue.length > 1 ? 's' : ''}
                </div>
                <div className="space-y-1">
                  {data.overdue.slice(0, 3).map(task => (
                    <p
                      key={task.name}
                      onClick={() => onTaskClick?.(task.name)}
                      className="text-sm text-red-600 cursor-pointer hover:underline"
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
                <div className="flex items-center justify-between mb-3">
                  <h2 className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-stone-500">
                    <span className="w-2 h-2 bg-amber-400 animate-pulse" />
                    En Progreso
                  </h2>
                  {selectionMode && doingTasks.length > 0 && (
                    <button
                      onClick={() => handleSelectAllSection(doingTasks)}
                      className="
                        px-2 py-1 text-xs font-medium
                        bg-white hover:bg-stone-100
                        border-2 border-stone-900
                        transition-all duration-75
                        shadow-[2px_2px_0_#1c1917]
                        hover:shadow-[1px_1px_0_#1c1917]
                        hover:translate-x-[1px] hover:translate-y-[1px]
                        flex items-center gap-1
                      "
                    >
                      <CheckSquare size={12} />
                      <span>Seleccionar todas</span>
                    </button>
                  )}
                </div>
                <div className="space-y-3">
                  {doingTasks.map(task => (
                    <TaskCard
                      key={task.name}
                      task={task}
                      highlighted
                      onFocus={() => handleFocus(task.name)}
                      onComplete={() => handleComplete(task.name)}
                      onClick={() => onTaskClick?.(task.name)}
                      selectionMode={selectionMode}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Siguiente */}
            {nextTasks.length > 0 && (
              <section className="mb-8">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xs font-medium uppercase tracking-wider text-stone-500">
                    Siguiente
                  </h2>
                  {selectionMode && nextTasks.length > 0 && (
                    <button
                      onClick={() => handleSelectAllSection(nextTasks)}
                      className="
                        px-2 py-1 text-xs font-medium
                        bg-white hover:bg-stone-100
                        border-2 border-stone-900
                        transition-all duration-75
                        shadow-[2px_2px_0_#1c1917]
                        hover:shadow-[1px_1px_0_#1c1917]
                        hover:translate-x-[1px] hover:translate-y-[1px]
                        flex items-center gap-1
                      "
                    >
                      <CheckSquare size={12} />
                      <span>Seleccionar todas</span>
                    </button>
                  )}
                </div>
                <div className="space-y-3">
                  {nextTasks.map(task => (
                    <TaskCard
                      key={task.name}
                      task={task}
                      onFocus={() => handleFocus(task.name)}
                      onComplete={() => handleComplete(task.name)}
                      onClick={() => onTaskClick?.(task.name)}
                      onStartDoing={() => onChangeStatus?.(task.name, 'DOING')}
                      selectionMode={selectionMode}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Blocked */}
            {data.blocked.length > 0 && (
              <section className="mb-8">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-red-500">
                    <AlertTriangle size={14} />
                    Bloqueadas
                  </h2>
                  {selectionMode && data.blocked.length > 0 && (
                    <button
                      onClick={() => handleSelectAllSection(data.blocked)}
                      className="
                        px-2 py-1 text-xs font-medium
                        bg-white hover:bg-stone-100
                        border-2 border-stone-900
                        transition-all duration-75
                        shadow-[2px_2px_0_#1c1917]
                        hover:shadow-[1px_1px_0_#1c1917]
                        hover:translate-x-[1px] hover:translate-y-[1px]
                        flex items-center gap-1
                      "
                    >
                      <CheckSquare size={12} />
                      <span>Seleccionar todas</span>
                    </button>
                  )}
                </div>
                <div className="space-y-3">
                  {data.blocked.map(task => (
                    <TaskCard
                      key={task.name}
                      task={task}
                      onClick={() => onTaskClick?.(task.name)}
                      selectionMode={selectionMode}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Empty State */}
            {data.today.length === 0 && data.overdue.length === 0 && (
              <div className="text-center py-12 bg-white border-2 border-stone-900">
                <Check size={48} className="mx-auto mb-4 text-green-400" />
                <h3 className="font-serif text-xl font-bold text-stone-900 mb-2">
                  Dia Despejado
                </h3>
                <p className="text-stone-500">
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
            className="fixed inset-0 z-50 bg-stone-900/50 flex items-start justify-center pt-24"
            onClick={() => setShowQuickAdd(false)}
          >
            <form
              onSubmit={handleQuickAddSubmit}
              onClick={e => e.stopPropagation()}
              className="bg-white border-2 border-stone-900 shadow-[8px_8px_0_#1c1917] w-full max-w-md mx-4"
            >
              <div className="p-4 border-b border-stone-200">
                <h3 className="font-serif text-lg font-bold text-stone-900">
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
                    border-2 border-stone-300
                    focus:border-stone-900
                    bg-white
                    text-stone-900
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
                          border-2 border-stone-900
                          ${quickAddPriority === p ? `${cfg.softBg} ${cfg.text}` : 'bg-white text-stone-500'}
                        `}
                      >
                        {p}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="p-4 border-t border-stone-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowQuickAdd(false)}
                  className="px-4 py-2 text-stone-500 font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="
                    px-4 py-2
                    bg-amber-400 hover:bg-amber-500
                    text-stone-900 font-medium uppercase tracking-wider text-sm
                    border-2 border-stone-900
                  "
                >
                  Agregar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Bulk Actions Bar - shown when tasks are selected in selection mode */}
        {selectionMode && onBulkChangeStatus && onBulkAssign && onBulkChangePriority && onBulkMoveProject && onBulkAddWorkLink && (
          <BulkActionsBar
            onChangeStatus={onBulkChangeStatus}
            onAssign={onBulkAssign}
            onChangePriority={onBulkChangePriority}
            onMoveProject={onBulkMoveProject}
            onAddWorkLink={onBulkAddWorkLink}
          />
        )}
      </div>
    </div>
  )
}

// Stat Card
function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colorClasses: Record<string, string> = {
    amber: 'border-t-amber-400',
    red: 'border-t-red-500',
    orange: 'border-t-orange-400',
    green: 'border-t-green-500',
  }

  return (
    <div className={`bg-white border-2 border-stone-900 border-t-4 ${colorClasses[color]} p-3`}>
      <p className="font-mono text-2xl font-bold text-stone-900">{value}</p>
      <p className="text-xs text-stone-500 uppercase tracking-wider">{label}</p>
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
  selectionMode?: boolean
}

function TaskCard({ task, highlighted, onFocus, onComplete, onClick, onStartDoing, selectionMode = false }: TaskCardProps) {
  const priority = priorityConfig[task.priority]
  const { isSelected, toggleSelection } = useTaskSelection()
  const selected = isSelected(task.name)

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    toggleSelection(task.name)
  }

  const handleCardClick = (e: React.MouseEvent) => {
    // Ctrl/Cmd+Click toggles selection even when not in selection mode
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      toggleSelection(task.name)
    } else if (selectionMode) {
      toggleSelection(task.name)
    } else {
      onClick?.()
    }
  }

  return (
    <div
      className={`
        bg-white
        border-2 border-stone-900
        border-t-4 ${statusBorderTop[task.status]}
        ${highlighted
          ? 'shadow-[4px_4px_0_#1c1917]'
          : selected
            ? 'shadow-[4px_4px_0_#f59e0b] ring-2 ring-amber-400'
            : 'shadow-[2px_2px_0_#1c1917] hover:shadow-[4px_4px_0_#1c1917]'
        }
        transition-all duration-75
        ${selectionMode ? 'cursor-pointer' : ''}
      `}
    >
      <div className="p-4 flex items-start gap-4">
        {/* Selection Checkbox - shown in selection mode */}
        {selectionMode && (
          <div
            onClick={handleCheckboxClick}
            className="flex-shrink-0 mt-0.5"
          >
            <input
              type="checkbox"
              checked={selected}
              onChange={() => {}}
              onClick={handleCheckboxClick}
              className="
                w-5 h-5
                border-2 border-stone-900
                cursor-pointer
                accent-amber-400
                focus:ring-2 focus:ring-amber-400 focus:ring-offset-0
              "
            />
          </div>
        )}

        {/* Complete Checkbox - shown when not in selection mode */}
        {!selectionMode && task.status !== 'BLOCKED' && onComplete && (
          <button
            onClick={e => {
              e.stopPropagation()
              onComplete?.()
            }}
            className="
              w-6 h-6 flex-shrink-0 mt-0.5
              border-2 border-stone-900
              hover:bg-green-100
              flex items-center justify-center
              transition-colors group/check
            "
          >
            <Check size={14} className="text-green-600 opacity-0 group-hover/check:opacity-100" />
          </button>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0 cursor-pointer" onClick={handleCardClick}>
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-1.5 py-0.5 text-xs font-medium ${priority.softBg} ${priority.text}`}>
              {task.priority}
            </span>
            {task.project_title && (
              <span className="text-xs text-stone-400 truncate">{task.project_title}</span>
            )}
            {task.status === 'BLOCKED' && (
              <span className="px-1.5 py-0.5 text-xs font-medium bg-red-100 text-red-700">
                BLOQUEADA
              </span>
            )}
          </div>
          <h3 className="font-medium text-stone-900 hover:underline">
            {task.title}
          </h3>
          {task.blocked_reason && (
            <p className="text-xs text-red-500 mt-1">{task.blocked_reason}</p>
          )}
          {task.due_date && (
            <p className="text-xs text-stone-500 mt-1 flex items-center gap-1">
              <Clock size={12} />
              {new Date(task.due_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
            </p>
          )}
        </div>

        {/* Actions - hidden in selection mode */}
        {!selectionMode && (
          <div className="flex items-center gap-1">
            {task.status === 'NEXT' && onStartDoing && (
              <button
                onClick={e => {
                  e.stopPropagation()
                  onStartDoing?.()
                }}
                className="
                  p-2 text-stone-400 hover:text-cyan-500
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
                  p-2 text-stone-400 hover:text-amber-500
                  hover:bg-amber-50
                  transition-colors
                "
                title="Focus Mode"
              >
                <Play size={20} />
              </button>
            )}
          </div>
        )}
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
    <div className="bg-white border-2 border-stone-900 shadow-[4px_4px_0_#1c1917]">
      <div className="p-3 border-b-2 border-stone-900 flex items-center justify-between">
        <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} className="p-1 hover:bg-stone-100">
          <ChevronLeft size={16} />
        </button>
        <span className="font-serif font-bold text-stone-900 capitalize">
          {currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
        </span>
        <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} className="p-1 hover:bg-stone-100">
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-7 border-b border-stone-200">
        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day, i) => (
          <div key={day} className={`py-2 text-center text-xs font-bold uppercase ${i >= 5 ? 'text-stone-400' : 'text-stone-500'}`}>
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
                  ? 'bg-amber-400 border-stone-900 font-bold'
                  : isOverdue
                    ? 'bg-red-100 border-red-400'
                    : taskCount > 0
                      ? 'bg-cyan-100 border-cyan-400'
                      : isWeekend
                        ? 'text-stone-400 border-transparent hover:border-stone-300'
                        : 'text-stone-600 border-transparent hover:border-stone-300'
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

      <div className="p-3 border-t border-stone-200 flex flex-wrap gap-3 text-[10px] uppercase tracking-wider">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-amber-400 border border-stone-900" />
          <span className="text-stone-500">Hoy</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-cyan-100 border border-cyan-400" />
          <span className="text-stone-500">Tareas</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-red-100 border border-red-400" />
          <span className="text-stone-500">Vencidas</span>
        </div>
      </div>
    </div>
  )
}

export default MyDay
