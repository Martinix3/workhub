// Kanban Board Page - Enhanced with priority bars, avatars, drag effects, FAB
import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { GripVertical, AlertTriangle, Clock, Plus, Flag, X, FolderOpen, CheckSquare, Square, HelpCircle } from 'lucide-react'
import { LoadingState } from '../../components/ui/LoadingState'
import { ErrorState } from '../../components/ui/ErrorState'
import { AssigneeAvatarGroup } from '../../components/ui/AssigneeAvatarGroup'
import { useKanban, useTaskMutations } from '../../api'
import { TaskSelectionProvider, useTaskSelection } from '../../contexts/TaskSelectionContext'
import { SelectableTaskCard } from '../../components/tasks/SelectableTaskCard'
import { BulkActionsBar } from '../../components/tasks/BulkActionsBar'
import type { Task, TaskStatus, TaskPriority, Department, KanbanColumn } from '../../components/sections/tasks/types'

const columnConfig: Record<TaskStatus, { label: string; headerBg: string; bg: string; dropBg: string }> = {
  BACKLOG: { label: 'BACKLOG', headerBg: 'bg-neutral-600', bg: 'bg-neutral-100', dropBg: 'bg-neutral-200' },
  NEXT: { label: 'NEXT', headerBg: 'bg-cyan-400', bg: 'bg-cyan-50', dropBg: 'bg-cyan-100' },
  DOING: { label: 'DOING', headerBg: 'bg-gold', bg: 'bg-gold-light', dropBg: 'bg-gold-light' },
  BLOCKED: { label: 'BLOCKED', headerBg: 'bg-error', bg: 'bg-error-light', dropBg: 'bg-error-light' },
  DONE: { label: 'DONE', headerBg: 'bg-emerald-400', bg: 'bg-emerald-50', dropBg: 'bg-emerald-100' },
}

const priorityConfig: Record<TaskPriority, { bg: string; text: string; bar: string }> = {
  P0: { bg: 'bg-error-light', text: 'text-error-text', bar: 'bg-error' },
  P1: { bg: 'bg-gold-light', text: 'text-gold-dark', bar: 'bg-gold' },
  P2: { bg: 'bg-success-light', text: 'text-success-text', bar: 'bg-emerald-400' },
}

export function KanbanPage() {
  return (
    <TaskSelectionProvider>
      <KanbanContent />
    </TaskSelectionProvider>
  )
}

function KanbanContent() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const projectFilter = searchParams.get('project')
  const [departmentFilter, setDepartmentFilter] = useState<Department | 'ALL'>('ALL')
  const [selectionMode, setSelectionMode] = useState(false)
  const { selectAll, clearSelection, selectedTasks } = useTaskSelection()

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

  // Toggle selection mode
  const toggleSelectionMode = () => {
    if (selectionMode) {
      clearSelection()
    }
    setSelectionMode(!selectionMode)
  }

  // Select all tasks in a column
  const handleSelectAllColumn = (columnTasks: Task[]) => {
    const taskIds = columnTasks.map(task => task.name)
    selectAll(taskIds)
  }

  // Bulk action handlers (placeholders - will be implemented in subtask 4.2)
  const handleBulkChangeStatus = () => {
    // TODO: Implement in subtask 4.2
  }

  const handleBulkAssign = () => {
    // TODO: Implement in subtask 4.2
  }

  const handleBulkChangePriority = () => {
    // TODO: Implement in subtask 4.2
  }

  const handleBulkMoveProject = () => {
    // TODO: Implement in subtask 4.2
  }

  const handleBulkAddWorkLink = () => {
    // TODO: Implement in subtask 4.2
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd+A: Select all visible tasks
      if ((e.ctrlKey || e.metaKey) && e.key === 'a' && selectionMode) {
        e.preventDefault()
        const allVisibleTasks = allColumns.flatMap(col => col.tasks)
        const allTaskIds = allVisibleTasks.map(task => task.name)
        selectAll(allTaskIds)
      }
      // Escape: Clear selection
      else if (e.key === 'Escape' && selectionMode) {
        clearSelection()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectionMode, columns, selectAll, clearSelection])

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
  const pendingTasks = allColumns.reduce(
    (sum, col) => sum + col.tasks.filter(task => task.status !== 'DONE').length,
    0
  )
  const urgentTasks = allColumns.reduce(
    (sum, col) => sum + col.tasks.filter(task => task.priority === 'P0' || task.status === 'BLOCKED').length,
    0
  )

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

  return (
    <div className="min-h-screen bg-neutral-100">
      {/* Header */}
      <div className="bg-white border-b border-neutral-200 px-4 lg:px-8 py-4">
        <div className="max-w-full mx-auto flex items-center justify-between">
          <div>
            <p className="text-neutral-500 uppercase tracking-wider text-xs font-bold">Kanban Board</p>
            <h1 className="font-heading text-2xl font-bold text-neutral-900">
              {projectFilter ? projectFilter.replace('WHP-', 'Proyecto ') : 'Todas las Tareas'}
            </h1>
            {projectFilter && (
              <button
                onClick={clearProjectFilter}
                className="mt-1 flex items-center gap-1 text-xs text-gold-dark hover:text-gold-dark font-medium"
              >
                <FolderOpen size={12} />
                Ver todas las tareas
                <X size={12} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-4">
            {/* Board KPIs */}
            <div className="grid grid-cols-3 gap-2">
              <div className="px-3 py-2 bg-white border border-neutral-200">
                <p className="font-mono font-bold text-sm text-neutral-900">{pendingTasks}</p>
                <p className="text-[10px] uppercase tracking-wider text-neutral-500">pendiente{pendingTasks === 1 ? '' : 's'}</p>
              </div>
              <div className="px-3 py-2 bg-error-light border border-error-dark">
                <p className="font-mono font-bold text-sm text-error-text">{urgentTasks}</p>
                <p className="text-[10px] uppercase tracking-wider text-error-text">urgente{urgentTasks === 1 ? '' : 's'}</p>
              </div>
              <div className="px-3 py-2 bg-white border border-neutral-200">
                <p className="font-mono font-bold text-sm text-neutral-900">{totalTasks}</p>
                <p className="text-[10px] uppercase tracking-wider text-neutral-500">total</p>
              </div>
            </div>

            {/* Selection Mode Toggle */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleSelectionMode}
                className={`
                  px-3 py-1.5 text-xs font-medium uppercase tracking-wider
                  border border-neutral-200
                  transition-all duration-75
                  flex items-center gap-2
                  ${selectionMode
                    ? 'bg-gold text-neutral-900 shadow-sm'
                    : 'bg-white text-neutral-900 hover:bg-neutral-100'
                  }
                `}
                title={selectionMode ? 'Salir de selección' : 'Seleccionar tareas'}
              >
                {selectionMode ? <CheckSquare size={14} /> : <Square size={14} />}
                <span>{selectionMode ? 'Salir de selección' : 'Seleccionar tareas'}</span>
              </button>

              {/* Keyboard Shortcuts Help */}
              <div className="relative group">
                <HelpCircle size={18} className="text-neutral-400 hover:text-neutral-600 cursor-help" />
                <div className="
                  absolute right-0 top-full mt-2 w-64 p-3
                  bg-white border border-neutral-200
                  opacity-0 invisible group-hover:opacity-100 group-hover:visible
                  transition-all duration-150 z-50
                ">
                  <p className="font-bold text-xs uppercase tracking-wider text-neutral-900 mb-2">
                    Atajos de Teclado
                  </p>
                  <div className="space-y-1 text-xs text-neutral-700">
                    <div className="flex justify-between items-center">
                      <span className="font-mono text-[10px] bg-neutral-100 px-1.5 py-0.5 border border-neutral-300">Ctrl/Cmd+A</span>
                      <span className="text-[10px] ml-2">Seleccionar todas</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-mono text-[10px] bg-neutral-100 px-1.5 py-0.5 border border-neutral-300">Escape</span>
                      <span className="text-[10px] ml-2">Limpiar selección</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-mono text-[10px] bg-neutral-100 px-1.5 py-0.5 border border-neutral-300">Ctrl/Cmd+Click</span>
                      <span className="text-[10px] ml-2">Alternar selección</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Department Filter */}
            <div className="flex gap-2">
              {(['ALL', 'SALES', 'OPS', 'MKT'] as const).map((dept) => (
                <button
                  key={dept}
                  onClick={() => setDepartmentFilter(dept)}
                  className={`
                    px-3 py-1.5 text-xs font-medium uppercase tracking-wider
                    border border-neutral-200
                    transition-all duration-75
                    ${departmentFilter === dept
                      ? 'bg-neutral-900 text-white'
                      : 'bg-white text-neutral-900 hover:bg-neutral-100'
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

      {selectionMode && (
        <div className="mx-4 lg:mx-6 mt-4 p-3 bg-gold-light border border-gold-dark flex items-center justify-between">
          <span className="text-sm font-semibold text-gold-dark">
            Modo selección activo · {selectedTasks.size} seleccionada{selectedTasks.size === 1 ? '' : 's'}
          </span>
          <span className="text-xs text-gold-dark uppercase tracking-wider">
            Click en tarjetas para seleccionar · Escape limpia
          </span>
        </div>
      )}

      {selectionMode && selectedTasks.size > 0 && (
        <div className="mx-4 lg:mx-6 mt-3">
          <BulkActionsBar
            onChangeStatus={handleBulkChangeStatus}
            onAssign={handleBulkAssign}
            onChangePriority={handleBulkChangePriority}
            onMoveProject={handleBulkMoveProject}
            onAddWorkLink={handleBulkAddWorkLink}
          />
        </div>
      )}

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
                  border border-neutral-200
                  ${config.bg}
                  transition-all duration-75
                `}
                onDragOver={(e) => handleDragOver(e, column.status)}
                onDragLeave={handleDragLeave}
                onDrop={() => handleDrop(column.status)}
              >
                {/* Column Header */}
                <div className={`${config.headerBg} p-3 border-b border-neutral-200`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm uppercase tracking-wider text-neutral-900">
                      {config.label}
                    </span>
                    <span className="
                      w-8 h-8 flex items-center justify-center
                      bg-neutral-900 text-white
                      font-mono font-bold text-sm
                    ">
                      {column.tasks.length}
                    </span>
                  </div>

                  {/* Select All Button - shown in selection mode */}
                  {selectionMode && column.tasks.length > 0 && (
                    <button
                      onClick={() => handleSelectAllColumn(column.tasks)}
                      className="
                        w-full px-2 py-1.5 text-xs font-medium
                        bg-white hover:bg-neutral-100
                        border border-neutral-200
                        transition-all duration-75
                        shadow-sm
                        flex items-center justify-center gap-1
                      "
                    >
                      <CheckSquare size={12} />
                      <span>Seleccionar todas</span>
                    </button>
                  )}
                </div>

                {/* Tasks Container */}
                <div className={`
                  p-3 min-h-[400px] max-h-[calc(100vh-280px)] overflow-y-auto space-y-3
                  ${isDropTarget ? config.dropBg : ''}
                  transition-colors
                `}>
                  {column.tasks.map((task) => (
                    selectionMode ? (
                      <SelectableTaskCard
                        key={task.name}
                        task={task}
                        onDragStart={() => handleDragStart(task)}
                        onDragEnd={handleDragEnd}
                        onClick={() => navigate(`/tareas/tarea/${task.name}`)}
                        isDragging={draggedTask?.name === task.name}
                        selectionMode={true}
                      />
                    ) : (
                      <TaskCard
                        key={task.name}
                        task={task}
                        onDragStart={() => handleDragStart(task)}
                        onDragEnd={handleDragEnd}
                        onClick={() => navigate(`/tareas/tarea/${task.name}`)}
                        isDragging={draggedTask?.name === task.name}
                      />
                    )
                  ))}

                  {/* Empty State */}
                  {column.tasks.length === 0 && (
                    <div className="
                      h-32 border-2 border-dashed border-neutral-400
                      flex items-center justify-center
                      text-neutral-400 text-sm uppercase tracking-wider
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
          bg-gold hover:bg-gold-dark
          border border-neutral-200
          transition-all duration-75
        "
      >
        <Plus size={24} className="text-neutral-900" />
      </button>

      {/* Quick Add Modal */}
      {showQuickAdd && (
        <div
          className="fixed inset-0 z-50 bg-neutral-900/50 flex items-end sm:items-center justify-center p-4"
          onClick={() => setShowQuickAdd(false)}
        >
          <form
            onSubmit={handleQuickAddSubmit}
            onClick={(e) => e.stopPropagation()}
            className="
              bg-white border border-neutral-200
              w-full max-w-md p-6
            "
          >
            <h2 className="font-heading text-xl font-bold text-neutral-900 mb-4">
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
                border border-neutral-200
                focus:outline-none focus:ring-2 focus:ring-gold
                mb-4
              "
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={!quickAddTitle.trim()}
                className="
                  flex-1 py-3
                  bg-gold hover:bg-gold-dark
                  text-neutral-900 font-medium uppercase tracking-wider
                  border border-neutral-200
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
                  text-neutral-600 hover:text-neutral-900
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

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={`
        bg-white
        border border-neutral-200
        cursor-grab active:cursor-grabbing
        transition-all duration-75
        ${isDragging
          ? 'opacity-50 rotate-2'
          : ''
        }
      `}
    >
      {/* Priority Bar */}
      <div className={`h-1.5 ${priority.bar}`} />

      <div className="p-3">
        {/* Drag Handle + Priority */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <GripVertical size={14} className="text-neutral-400" />
            <span className={`px-1.5 py-0.5 text-xs font-bold ${priority.bg} ${priority.text}`}>
              {task.priority}
            </span>
            {task.department && (
              <span className="text-[10px] text-neutral-400 uppercase">{task.department}</span>
            )}
          </div>
          {task.status === 'BLOCKED' && (
            <AlertTriangle size={14} className="text-error" />
          )}
        </div>

        {/* Title */}
        <h3 className={`
          font-medium text-sm leading-snug mb-2
          ${isDone ? 'line-through text-neutral-400' : 'text-neutral-900'}
        `}>
          {task.title}
        </h3>

        {/* Blocked Reason */}
        {task.blocked_reason && (
          <p className="text-xs text-error mb-2 bg-error-light p-2 border border-error">
            {task.blocked_reason}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-neutral-500">
          <div className="flex items-center gap-2">
            {/* Assignees */}
            {task.assignees && task.assignees.length > 0 && (
              <AssigneeAvatarGroup
                assignees={task.assignees}
                size="sm"
                maxVisible={3}
              />
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
              <span className="font-mono text-neutral-400 truncate max-w-[60px]" title={task.project_title}>
                {task.project_title}
              </span>
            )}
          </div>
        </div>

        {/* Blocking Count Badge */}
        {task.total_work_days && task.total_work_days > 0 && (
          <div className="mt-2 flex items-center gap-1 text-xs text-gold-dark">
            <Flag size={10} />
            <span>{task.total_work_days} días trabajados</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default KanbanPage
