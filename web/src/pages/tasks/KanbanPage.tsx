// Kanban Board Page - Enhanced with priority bars, avatars, drag effects, FAB
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { GripVertical, AlertTriangle, Clock, Plus, Flag, X, FolderOpen } from 'lucide-react'
import { LoadingState } from '../../components/ui/LoadingState'
import { ErrorState } from '../../components/ui/ErrorState'
import { BlockedReasonModal } from '../../components/ui/BlockedReasonModal'
import { useKanban, useTaskMutations, tasksApi } from '../../api'
import type { Task, TaskStatus, TaskPriority, Department, KanbanColumn } from '../../components/sections/tasks/types'

const columnConfig: Record<TaskStatus, { label: string; headerBg: string; bg: string; dropBg: string }> = {
  BACKLOG: { label: 'BACKLOG', headerBg: 'bg-stone-600', bg: 'bg-stone-100', dropBg: 'bg-stone-200' },
  NEXT: { label: 'NEXT', headerBg: 'bg-cyan-400', bg: 'bg-cyan-50', dropBg: 'bg-cyan-100' },
  DOING: { label: 'DOING', headerBg: 'bg-amber-400', bg: 'bg-amber-50', dropBg: 'bg-amber-100' },
  BLOCKED: { label: 'BLOCKED', headerBg: 'bg-red-500', bg: 'bg-red-50', dropBg: 'bg-red-100' },
  DONE: { label: 'DONE', headerBg: 'bg-emerald-400', bg: 'bg-emerald-50', dropBg: 'bg-emerald-100' },
}

const priorityConfig: Record<TaskPriority, { bg: string; text: string; bar: string }> = {
  P0: { bg: 'bg-red-100', text: 'text-red-700', bar: 'bg-red-500' },
  P1: { bg: 'bg-amber-100', text: 'text-amber-700', bar: 'bg-amber-400' },
  P2: { bg: 'bg-green-100', text: 'text-green-700', bar: 'bg-emerald-400' },
}

export function KanbanPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const projectFilter = searchParams.get('project')
  const [departmentFilter, setDepartmentFilter] = useState<Department | 'ALL'>('ALL')

  // Build filters object
  const filters = {
    ...(projectFilter ? { project: projectFilter } : {}),
    ...(departmentFilter !== 'ALL' ? { department: departmentFilter } : {})
  }
  const hasFilters = Object.keys(filters).length > 0

  const { data: columns, loading, error, refetch, moveTask } = useKanban(
    hasFilters ? filters : undefined
  )

  const clearProjectFilter = () => {
    searchParams.delete('project')
    setSearchParams(searchParams)
  }
  const { quickAdd } = useTaskMutations()

  const [draggedTask, setDraggedTask] = useState<Task | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null)
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [quickAddTitle, setQuickAddTitle] = useState('')
  const [blockModalOpen, setBlockModalOpen] = useState(false)
  const [taskToBlock, setTaskToBlock] = useState<{ task: Task; targetStatus: TaskStatus } | null>(null)

  if (loading) {
    return <LoadingState message="Cargando tablero..." />
  }

  if (error) {
    return (
      <ErrorState
        title="Error al cargar Kanban"
        message="No se pudo cargar el tablero."
        error={error}
        onRetry={refetch}
      />
    )
  }

  // Ensure all columns exist
  const allColumns: KanbanColumn[] = (['BACKLOG', 'NEXT', 'DOING', 'BLOCKED', 'DONE'] as TaskStatus[]).map(status => {
    const existing = columns?.find(c => c.status === status)
    return existing || { status, label: columnConfig[status].label, tasks: [] }
  })

  const totalTasks = allColumns.reduce((sum, col) => sum + col.tasks.length, 0)

  const handleDragStart = (task: Task) => {
    setDraggedTask(task)
  }

  const handleDragEnd = () => {
    setDraggedTask(null)
    setDragOverColumn(null)
  }

  const handleDragOver = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault()
    setDragOverColumn(status)
  }

  const handleDragLeave = () => {
    setDragOverColumn(null)
  }

  const handleDrop = async (status: TaskStatus) => {
    if (draggedTask && draggedTask.status !== status) {
      // Intercept drops to BLOCKED column and show modal
      if (status === 'BLOCKED') {
        setTaskToBlock({ task: draggedTask, targetStatus: status })
        setBlockModalOpen(true)
        setDraggedTask(null)
        setDragOverColumn(null)
        return
      }
      await moveTask(draggedTask.name, status)
    }
    setDraggedTask(null)
    setDragOverColumn(null)
  }

  const handleQuickAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (quickAddTitle.trim()) {
      await quickAdd(quickAddTitle.trim(), 'P2')
      setQuickAddTitle('')
      setShowQuickAdd(false)
      await refetch()
    }
  }

  const handleBlockConfirm = async (reason: string) => {
    if (taskToBlock) {
      await tasksApi.changeStatus(taskToBlock.task.name, taskToBlock.targetStatus, reason)
      await refetch()
      setTaskToBlock(null)
    }
  }

  const handleBlockCancel = () => {
    setBlockModalOpen(false)
    setTaskToBlock(null)
  }

  return (
    <div className="min-h-screen bg-stone-100">
      {/* Header */}
      <div className="bg-white border-b-2 border-stone-900 px-4 lg:px-8 py-4">
        <div className="max-w-full mx-auto flex items-center justify-between">
          <div>
            <p className="text-stone-500 uppercase tracking-wider text-xs font-bold">Kanban Board</p>
            <h1 className="font-serif text-2xl font-bold text-stone-900">
              {projectFilter ? projectFilter.replace('WHP-', 'Proyecto ') : 'Todas las Tareas'}
            </h1>
            {projectFilter && (
              <button
                onClick={clearProjectFilter}
                className="mt-1 flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 font-medium"
              >
                <FolderOpen size={12} />
                Ver todas las tareas
                <X size={12} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-4">
            {/* Task count */}
            <div className="px-3 py-1 border-2 border-stone-900 font-mono font-bold text-sm">
              {totalTasks} tareas
            </div>

            {/* Department Filter */}
            <div className="flex gap-2">
              {(['ALL', 'SALES', 'OPS', 'MKT'] as const).map((dept) => (
                <button
                  key={dept}
                  onClick={() => setDepartmentFilter(dept)}
                  className={`
                    px-3 py-1.5 text-xs font-medium uppercase tracking-wider
                    border-2 border-stone-900
                    transition-all duration-75
                    ${departmentFilter === dept
                      ? 'bg-stone-900 text-white'
                      : 'bg-white text-stone-900 hover:bg-stone-100'
                    }
                  `}
                >
                  {dept === 'ALL' ? 'Todos' : dept}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Board */}
      <div className="p-4 lg:p-6 overflow-x-auto">
        <div className="flex gap-4 min-w-max">
          {allColumns.map((column) => {
            const config = columnConfig[column.status]
            const isDropTarget = dragOverColumn === column.status

            return (
              <div
                key={column.status}
                className={`
                  w-72 flex-shrink-0
                  border-2 border-stone-900
                  ${config.bg}
                  transition-all duration-75
                  ${isDropTarget
                    ? 'shadow-[6px_6px_0_#f59e0b]'
                    : 'shadow-[4px_4px_0_#1c1917]'
                  }
                `}
                onDragOver={(e) => handleDragOver(e, column.status)}
                onDragLeave={handleDragLeave}
                onDrop={() => handleDrop(column.status)}
              >
                {/* Column Header */}
                <div className={`${config.headerBg} p-3 border-b-2 border-stone-900`}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm uppercase tracking-wider text-stone-900">
                      {config.label}
                    </span>
                    <span className="
                      w-8 h-8 flex items-center justify-center
                      bg-stone-900 text-white
                      font-mono font-bold text-sm
                    ">
                      {column.tasks.length}
                    </span>
                  </div>
                </div>

                {/* Tasks Container */}
                <div className={`
                  p-3 min-h-[400px] max-h-[calc(100vh-280px)] overflow-y-auto space-y-3
                  ${isDropTarget ? config.dropBg : ''}
                  transition-colors
                `}>
                  {column.tasks.map((task) => (
                    <TaskCard
                      key={task.name}
                      task={task}
                      onDragStart={() => handleDragStart(task)}
                      onDragEnd={handleDragEnd}
                      onClick={() => navigate(`/tareas/tarea/${task.name}`)}
                      isDragging={draggedTask?.name === task.name}
                    />
                  ))}

                  {/* Empty State */}
                  {column.tasks.length === 0 && (
                    <div className="
                      h-32 border-2 border-dashed border-stone-400
                      flex items-center justify-center
                      text-stone-400 text-sm uppercase tracking-wider
                    ">
                      Arrastra aquí
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Quick Add FAB */}
      <button
        onClick={() => setShowQuickAdd(true)}
        className="
          fixed bottom-8 right-8
          w-14 h-14 flex items-center justify-center
          bg-amber-400 hover:bg-amber-500
          border-2 border-stone-900
          shadow-[4px_4px_0_#1c1917]
          hover:shadow-[2px_2px_0_#1c1917]
          hover:translate-x-[2px] hover:translate-y-[2px]
          transition-all duration-75
        "
      >
        <Plus size={24} className="text-stone-900" />
      </button>

      {/* Quick Add Modal */}
      {showQuickAdd && (
        <div
          className="fixed inset-0 z-50 bg-stone-900/50 flex items-end sm:items-center justify-center p-4"
          onClick={() => setShowQuickAdd(false)}
        >
          <form
            onSubmit={handleQuickAddSubmit}
            onClick={(e) => e.stopPropagation()}
            className="
              bg-white border-2 border-stone-900
              shadow-[8px_8px_0_#1c1917]
              w-full max-w-md p-6
            "
          >
            <h2 className="font-serif text-xl font-bold text-stone-900 mb-4">
              Nueva Tarea
            </h2>
            <input
              type="text"
              value={quickAddTitle}
              onChange={(e) => setQuickAddTitle(e.target.value)}
              placeholder="¿Qué necesitas hacer?"
              autoFocus
              className="
                w-full px-4 py-3 text-lg
                border-2 border-stone-900
                focus:outline-none focus:ring-2 focus:ring-amber-400
                mb-4
              "
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={!quickAddTitle.trim()}
                className="
                  flex-1 py-3
                  bg-amber-400 hover:bg-amber-500
                  text-stone-900 font-medium uppercase tracking-wider
                  border-2 border-stone-900
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-colors
                "
              >
                Agregar
              </button>
              <button
                type="button"
                onClick={() => setShowQuickAdd(false)}
                className="
                  px-6 py-3
                  text-stone-600 hover:text-stone-900
                  font-medium uppercase tracking-wider
                  transition-colors
                "
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Blocked Reason Modal */}
      <BlockedReasonModal
        isOpen={blockModalOpen}
        onClose={handleBlockCancel}
        onConfirm={handleBlockConfirm}
        taskName={taskToBlock?.task.title}
      />
    </div>
  )
}

interface TaskCardProps {
  task: Task
  onDragStart: () => void
  onDragEnd: () => void
  onClick: () => void
  isDragging: boolean
}

function TaskCard({ task, onDragStart, onDragEnd, onClick, isDragging }: TaskCardProps) {
  const priority = priorityConfig[task.priority]
  const isDone = task.status === 'DONE'

  // Get initials from assigned_to_name or assigned_to
  const getInitials = () => {
    const name = task.assigned_to_name || task.assigned_to || ''
    if (!name) return '?'
    const parts = name.split(/[@\s]/)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={`
        bg-white
        border-2 border-stone-900
        cursor-grab active:cursor-grabbing
        transition-all duration-75
        ${isDragging
          ? 'opacity-50 rotate-2 shadow-[8px_8px_0_#1c1917]'
          : 'hover:shadow-[4px_4px_0_#1c1917]'
        }
      `}
    >
      {/* Priority Bar */}
      <div className={`h-1.5 ${priority.bar}`} />

      <div className="p-3">
        {/* Drag Handle + Priority */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <GripVertical size={14} className="text-stone-400" />
            <span className={`px-1.5 py-0.5 text-xs font-bold ${priority.bg} ${priority.text}`}>
              {task.priority}
            </span>
            {task.department && (
              <span className="text-[10px] text-stone-400 uppercase">{task.department}</span>
            )}
          </div>
          {task.status === 'BLOCKED' && (
            <AlertTriangle size={14} className="text-red-500" />
          )}
        </div>

        {/* Title */}
        <h3 className={`
          font-medium text-sm leading-snug mb-2
          ${isDone ? 'line-through text-stone-400' : 'text-stone-900'}
        `}>
          {task.title}
        </h3>

        {/* Blocked Reason */}
        {task.blocked_reason && (
          <p className="text-xs text-red-500 mb-2 bg-red-50 p-2 border border-red-200">
            {task.blocked_reason}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-stone-500">
          <div className="flex items-center gap-2">
            {/* Avatar */}
            {task.assigned_to && (
              <div className="
                w-6 h-6 flex items-center justify-center
                bg-stone-200
                border border-stone-900
                text-[10px] font-bold
              " title={task.assigned_to_name || task.assigned_to}>
                {getInitials()}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Due date */}
            {task.due_date && (
              <div className="flex items-center gap-1">
                <Clock size={10} />
                <span className="font-mono">
                  {new Date(task.due_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                </span>
              </div>
            )}
            {/* Estimated hours - if we had this field */}
            {task.project_title && (
              <span className="font-mono text-stone-400 truncate max-w-[60px]" title={task.project_title}>
                {task.project_title}
              </span>
            )}
          </div>
        </div>

        {/* Blocking Count Badge */}
        {task.total_work_days && task.total_work_days > 0 && (
          <div className="mt-2 flex items-center gap-1 text-xs text-amber-600">
            <Flag size={10} />
            <span>{task.total_work_days} días trabajados</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default KanbanPage
