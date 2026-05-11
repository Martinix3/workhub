// Projects List Page - Enhanced with Stats, Expandable Projects, Templates Modal
import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Plus,
  FolderOpen,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Check,
  Clock,
  ExternalLink,
  List,
  BarChart2,
  Menu,
} from 'lucide-react'
import { LoadingState } from '../../components/ui/LoadingState'
import { ErrorState } from '../../components/ui/ErrorState'
import { useProjects, useProjectTemplates, useSavedFilter } from '../../api'
import { SavedFiltersPanel } from '../../components/sections/tasks/SavedFiltersPanel'
import { FilterBar } from '../../components/sections/tasks/FilterBar'
import { SaveFilterModal } from '../../components/sections/tasks/SaveFilterModal'
import type {
  Project,
  ProjectTemplate,
  ProjectHealth,
  Department,
  Task,
  TaskStatus,
  TaskPriority,
} from '../../components/sections/tasks/types'
import type { SavedFilter, FilterCriteria } from '../../api/services/saved-filters'

const healthConfig: Record<ProjectHealth, { bg: string; border: string; text: string; label: string }> = {
  GREEN: { bg: 'bg-emerald-400', border: 'border-t-emerald-400', text: 'text-emerald-600', label: 'ON TRACK' },
  YELLOW: { bg: 'bg-gold', border: 'border-t-gold', text: 'text-gold-dark', label: 'AT RISK' },
  RED: { bg: 'bg-error', border: 'border-t-error-dark', text: 'text-error-dark', label: 'CRITICAL' },
}

const departmentConfig: Record<Department, { bg: string; text: string }> = {
  SALES: { bg: 'bg-cyan-100', text: 'text-cyan-700' },
  OPS: { bg: 'bg-violet-100', text: 'text-violet-700' },
  PRODUCTION: { bg: 'bg-success-light', text: 'text-success-text' },
  MKT: { bg: 'bg-pink-100', text: 'text-pink-700' },
}

const statusConfig: Record<TaskStatus, { bg: string; text: string; label: string }> = {
  BACKLOG: { bg: 'bg-neutral-100', text: 'text-neutral-500', label: 'Backlog' },
  NEXT: { bg: 'bg-cyan-100', text: 'text-cyan-700', label: 'Next' },
  DOING: { bg: 'bg-gold-light', text: 'text-gold-dark', label: 'Doing' },
  BLOCKED: { bg: 'bg-error-light', text: 'text-error-text', label: 'Blocked' },
  DONE: { bg: 'bg-success-light', text: 'text-success-text', label: 'Done' },
}

const priorityConfig: Record<TaskPriority, { bg: string; text: string }> = {
  P0: { bg: 'bg-error-light', text: 'text-error-text' },
  P1: { bg: 'bg-gold-light', text: 'text-gold-dark' },
  P2: { bg: 'bg-success-light', text: 'text-success-text' },
}

type ViewMode = 'list' | 'gantt'

export function ProjectsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const filterIdFromUrl = searchParams.get('filter')

  const [showNewProject, setShowNewProject] = useState(false)
  const [filter, setFilter] = useState<'all' | 'risk'>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [expandedProject, setExpandedProject] = useState<string | null>(null)

  // Saved filters state
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeFilterId, setActiveFilterId] = useState<string | null>(filterIdFromUrl)
  const [currentFilters, setCurrentFilters] = useState<FilterCriteria>({})
  const [showSaveModal, setShowSaveModal] = useState(false)

  const { data: projects, loading, error, refetch } = useProjects({ status: 'ACTIVE' })
  const { data: templates } = useProjectTemplates()

  // Load saved filter from URL
  const { data: savedFilter, loading: savedFilterLoading } = useSavedFilter(filterIdFromUrl || '')

  // Apply saved filter when loaded
  useEffect(() => {
    if (savedFilter && savedFilter.filter_json) {
      setCurrentFilters(savedFilter.filter_json)
      setActiveFilterId(savedFilter.name)
    }
  }, [savedFilter])

  // Keyboard shortcut 's' to toggle sidebar
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Only trigger if not typing in an input/textarea and 's' is pressed
      if (
        e.key === 's' &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault()
        setSidebarOpen(prev => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [])

  if (loading || (filterIdFromUrl && savedFilterLoading)) {
    return <LoadingState message="Cargando proyectos..." />
  }

  if (error) {
    return (
      <ErrorState
        title="Error al cargar proyectos"
        message="No se pudo cargar la lista de proyectos."
        error={error}
        onRetry={refetch}
      />
    )
  }

  const projectsList = projects || []
  const templatesList = templates || []

  const activeProjects = projectsList.filter(p => p.status === 'ACTIVE')
  const atRiskProjects = activeProjects.filter(p => p.health === 'RED' || p.health === 'YELLOW')
  const displayProjects = filter === 'risk' ? atRiskProjects : activeProjects

  const stats = {
    active: activeProjects.length,
    atRisk: activeProjects.filter(p => p.health === 'RED').length,
    warning: activeProjects.filter(p => p.health === 'YELLOW').length,
    healthy: activeProjects.filter(p => p.health === 'GREEN').length,
  }

  const toggleExpand = (projectId: string) => {
    setExpandedProject(expandedProject === projectId ? null : projectId)
  }

  const handleCreateFromTemplate = (templateId: string) => {
    // Navigate to create form with template pre-selected
    navigate(`/tareas/proyectos/nuevo?template=${templateId}`)
    setShowNewProject(false)
  }

  const handleTaskComplete = (taskId: string) => {
    // TODO: Implement task completion
    console.log('Complete task:', taskId)
  }

  // Handle filter selection from sidebar
  const handleFilterSelect = (filter: SavedFilter) => {
    setActiveFilterId(filter.name)
    setCurrentFilters(filter.filter_json)
    // Update URL with filter ID for shareable links
    searchParams.set('filter', filter.name)
    setSearchParams(searchParams)
  }

  // Handle filter changes from FilterBar
  const handleFilterChange = (newFilters: FilterCriteria) => {
    setCurrentFilters(newFilters)
    // Clear active filter ID when manually changing filters
    if (activeFilterId) {
      setActiveFilterId(null)
      searchParams.delete('filter')
      setSearchParams(searchParams)
    }
  }

  // Handle save filter success
  const handleSaveSuccess = () => {
    // Refetch would happen automatically via useSavedFilters hook
  }

  return (
    <div className="min-h-screen bg-neutral-100 flex">
      {/* Saved Filters Sidebar */}
      {sidebarOpen && (
        <aside className="hidden lg:block flex-shrink-0">
          <SavedFiltersPanel
            activeFilterId={activeFilterId}
            onFilterSelect={handleFilterSelect}
            onCreateNew={() => setShowSaveModal(true)}
          />
        </aside>
      )}

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        <div className="max-w-full px-4 py-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              {/* Sidebar toggle button */}
              <button
                onClick={() => setSidebarOpen(prev => !prev)}
                className="
                  p-2
                  border border-neutral-200
                  bg-white hover:bg-neutral-100
                  shadow-sm
                  transition-all duration-75
                "
                title="Alternar panel de filtros (tecla: s)"
              >
                <Menu size={18} />
              </button>

              <div>
                <h1 className="font-heading text-3xl lg:text-4xl font-bold text-neutral-900">
                  Proyectos
                </h1>
                <p className="text-neutral-500 uppercase tracking-wider text-sm mt-1">
                  {stats.active} proyectos activos
                </p>
              </div>
            </div>
          <button
            onClick={() => setShowNewProject(true)}
            className="
              inline-flex items-center gap-2 px-4 py-2
              bg-gold hover:bg-gold-dark
              text-neutral-900 font-medium text-sm uppercase tracking-wider
              border border-neutral-200
              transition-all duration-75
            "
          >
            <Plus size={18} />
            Nuevo Proyecto
          </button>
        </div>

        {/* Filter Bar */}
        <FilterBar
          currentFilters={currentFilters}
          onFilterChange={handleFilterChange}
          onSaveClick={() => setShowSaveModal(true)}
        />

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatsCard label="ACTIVOS" value={stats.active} icon={<FolderOpen size={20} />} />
          <StatsCard label="ON TRACK" value={stats.healthy} icon={<CheckCircle size={20} />} color="emerald" />
          <StatsCard label="AT RISK" value={stats.warning} icon={<AlertTriangle size={20} />} color="amber" />
          <StatsCard label="CRITICAL" value={stats.atRisk} icon={<AlertTriangle size={20} />} color="red" />
        </div>

        {/* Filter Tabs + View Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          {/* Filters */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`
                px-4 py-2 font-medium text-sm uppercase tracking-wider
                border border-neutral-200
                transition-all duration-75
                ${filter === 'all'
                  ? 'bg-neutral-900 text-white'
                  : 'bg-white text-neutral-600 hover:bg-neutral-100'
                }
              `}
            >
              Todos ({activeProjects.length})
            </button>
            <button
              onClick={() => setFilter('risk')}
              className={`
                px-4 py-2 font-medium text-sm uppercase tracking-wider
                border border-neutral-200
                transition-all duration-75
                ${filter === 'risk'
                  ? 'bg-neutral-900 text-white'
                  : 'bg-white text-neutral-600 hover:bg-neutral-100'
                }
              `}
            >
              En Riesgo ({atRiskProjects.length})
            </button>
          </div>

          {/* View Toggle */}
          <div className="flex border border-neutral-200 bg-white">
            <button
              onClick={() => setViewMode('list')}
              className={`
                px-3 py-2 flex items-center gap-2
                font-medium text-sm uppercase tracking-wider
                transition-all duration-75
                ${viewMode === 'list'
                  ? 'bg-gold text-neutral-900'
                  : 'text-neutral-500 hover:bg-neutral-100'
                }
              `}
              title="Vista Lista"
            >
              <List size={16} />
              <span className="hidden sm:inline">Lista</span>
            </button>
            <button
              onClick={() => setViewMode('gantt')}
              className={`
                px-3 py-2 flex items-center gap-2
                font-medium text-sm uppercase tracking-wider
                border-l border-neutral-200
                transition-all duration-75
                ${viewMode === 'gantt'
                  ? 'bg-gold text-neutral-900'
                  : 'text-neutral-500 hover:bg-neutral-100'
                }
              `}
              title="Vista Gantt"
            >
              <BarChart2 size={16} />
              <span className="hidden sm:inline">Gantt</span>
            </button>
          </div>
        </div>

        {/* Projects View */}
        {viewMode === 'list' ? (
          /* Projects List - Expandable */
          <div className="space-y-4">
            {displayProjects.map((project) => (
              <ProjectRow
                key={project.name}
                project={project}
                isExpanded={expandedProject === project.name}
                onToggle={() => toggleExpand(project.name)}
                onProjectClick={() => navigate(`/tareas/kanban?project=${project.name}`)}
                onTaskClick={(taskId) => navigate(`/tareas/${taskId}`)}
                onTaskComplete={handleTaskComplete}
              />
            ))}
          </div>
        ) : (
          /* Gantt View */
          <GanttView
            projects={displayProjects}
            onProjectClick={(projectName) => navigate(`/tareas/kanban?project=${projectName}`)}
          />
        )}

        {/* Empty State */}
        {displayProjects.length === 0 && viewMode === 'list' && (
          <div className="text-center py-16 bg-white border border-neutral-200">
            <div className="w-20 h-20 mx-auto mb-4 bg-neutral-100 border border-neutral-200 flex items-center justify-center">
              <FolderOpen size={40} className="text-neutral-400" />
            </div>
            <h3 className="font-heading text-xl font-bold text-neutral-900 mb-2">
              Sin Proyectos
            </h3>
            <p className="text-neutral-500">
              {filter === 'risk' ? 'No hay proyectos en riesgo' : 'Crea tu primer proyecto'}
            </p>
          </div>
        )}

        {/* New Project Modal - Templates */}
        {showNewProject && (
          <div
            className="fixed inset-0 z-50 bg-neutral-900/50 flex items-center justify-center p-4"
            onClick={() => setShowNewProject(false)}
          >
            <div
              className="bg-white border border-neutral-200 w-full max-w-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-neutral-200">
                <h2 className="font-heading text-2xl font-bold text-neutral-900">
                  Nuevo Proyecto
                </h2>
                <p className="text-neutral-500 mt-1 text-sm uppercase tracking-wider">
                  Selecciona una plantilla
                </p>
              </div>
              <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                {templatesList.length === 0 ? (
                  <div className="text-center py-8 text-neutral-500">
                    <p>No hay plantillas disponibles</p>
                    <button
                      onClick={() => {
                        navigate('/tareas/proyectos/nuevo')
                        setShowNewProject(false)
                      }}
                      className="mt-4 text-gold-dark hover:text-gold-dark font-medium"
                    >
                      Crear proyecto en blanco
                    </button>
                  </div>
                ) : (
                  templatesList.map((template) => (
                    <button
                      key={template.name}
                      onClick={() => handleCreateFromTemplate(template.name)}
                      className="
                        w-full p-4 text-left
                        bg-neutral-50
                        border border-neutral-300
                        hover:border-neutral-900
                        transition-all duration-75
                      "
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-neutral-900">
                            {template.title}
                          </h3>
                          <p className="text-sm text-neutral-500 mt-1">
                            {template.description}
                          </p>
                          <p className="text-sm text-neutral-500 mt-1 font-mono">
                            {template.task_count} tareas · {template.default_duration_days} dias
                          </p>
                        </div>
                        <span className={`px-2.5 py-1 text-xs font-medium uppercase tracking-wider ${departmentConfig[template.department].bg} ${departmentConfig[template.department].text}`}>
                          {template.department}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
              <div className="p-4 border-t border-neutral-200 bg-neutral-50 flex gap-2">
                <button
                  onClick={() => {
                    navigate('/tareas/proyectos/nuevo')
                    setShowNewProject(false)
                  }}
                  className="
                    flex-1 py-3
                    bg-white border border-neutral-200
                    text-neutral-900 font-medium uppercase tracking-wider
                    hover:bg-neutral-100
                    transition-colors
                  "
                >
                  Proyecto en Blanco
                </button>
                <button
                  onClick={() => setShowNewProject(false)}
                  className="flex-1 py-3 text-neutral-600 hover:text-neutral-900 font-medium uppercase tracking-wider transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Save Filter Modal */}
        <SaveFilterModal
          isOpen={showSaveModal}
          onClose={() => setShowSaveModal(false)}
          currentFilters={currentFilters}
          onSaved={handleSaveSuccess}
        />
      </div>
    </div>
    </div>
  )
}

interface StatsCardProps {
  label: string
  value: number
  icon: React.ReactNode
  color?: 'amber' | 'emerald' | 'red'
}

function StatsCard({ label, value, icon, color }: StatsCardProps) {
  const colorClasses = {
    amber: 'bg-gold-light',
    emerald: 'bg-emerald-100',
    red: 'bg-error-light',
  }

  return (
    <div className="bg-white border border-neutral-200 p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 flex items-center justify-center border border-neutral-200 ${color ? colorClasses[color] : 'bg-neutral-100'}`}>
          {icon}
        </div>
        <div>
          <p className="text-2xl font-mono font-bold text-neutral-900">
            {value}
          </p>
          <p className="text-xs text-neutral-500 uppercase tracking-wider font-medium">
            {label}
          </p>
        </div>
      </div>
    </div>
  )
}

interface ProjectRowProps {
  project: Project
  isExpanded: boolean
  onToggle: () => void
  onProjectClick?: () => void
  onTaskClick?: (id: string) => void
  onTaskComplete?: (id: string) => void
}

function ProjectRow({ project, isExpanded, onToggle, onProjectClick, onTaskClick, onTaskComplete }: ProjectRowProps) {
  const health = healthConfig[project.health]
  const dept = departmentConfig[project.department]
  const progress = project.progress_pct || 0

  return (
    <div className={`
      bg-white
      border border-neutral-200
      border-t-4 ${health.border}
      ${isExpanded ? '' : 'shadow-sm'}
      transition-all duration-75
    `}>
      {/* Project Header - Clickable */}
      <div
        onClick={onToggle}
        className="p-4 flex items-center gap-4 cursor-pointer hover:bg-neutral-50 transition-colors"
      >
        {/* Expand Icon */}
        <button className="text-neutral-400 hover:text-neutral-900">
          {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
        </button>

        {/* Project Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-2 py-0.5 text-xs font-medium uppercase tracking-wider ${dept.bg} ${dept.text}`}>
              {project.department}
            </span>
            <span className={`flex items-center gap-1 text-xs font-medium uppercase tracking-wider ${health.text}`}>
              <span className={`w-2 h-2 ${health.bg}`} />
              {health.label}
            </span>
          </div>
          <h3 className="font-heading text-lg font-bold text-neutral-900 truncate">
            {project.title}
          </h3>
        </div>

        {/* Progress */}
        <div className="hidden sm:block w-32">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-neutral-500 uppercase tracking-wider">Progreso</span>
            <span className="font-mono font-bold text-neutral-900">{progress}%</span>
          </div>
          <div className="h-2 bg-neutral-200 border border-neutral-200">
            <div className={`h-full ${health.bg}`} style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Stats */}
        <div className="hidden md:flex items-center gap-4 text-sm">
          <div className="text-center">
            <p className="font-mono font-bold text-neutral-900">{project.completed_tasks || 0}/{project.total_tasks || 0}</p>
            <p className="text-xs text-neutral-500 uppercase">Tareas</p>
          </div>
          {(project.blocked_tasks || 0) > 0 && (
            <div className="text-center">
              <p className="font-mono font-bold text-error-dark">{project.blocked_tasks}</p>
              <p className="text-xs text-neutral-500 uppercase">Bloq</p>
            </div>
          )}
        </div>

        {/* Link to detail */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onProjectClick?.()
          }}
          className="p-2 text-neutral-400 hover:text-gold-dark transition-colors"
          title="Ver detalle"
        >
          <ExternalLink size={18} />
        </button>
      </div>

      {/* Expanded Tasks */}
      {isExpanded && project.tasks && project.tasks.length > 0 && (
        <div className="border-t-2 border-neutral-200 bg-neutral-50">
          <div className="p-4 space-y-2">
            {project.tasks.map((task) => (
              <TaskRow
                key={task.name}
                task={task}
                onClick={() => onTaskClick?.(task.name)}
                onComplete={() => onTaskComplete?.(task.name)}
              />
            ))}
          </div>
        </div>
      )}

      {/* No tasks message when expanded */}
      {isExpanded && (!project.tasks || project.tasks.length === 0) && (
        <div className="border-t-2 border-neutral-200 bg-neutral-50 p-4 text-center text-neutral-500 text-sm">
          No hay tareas en este proyecto
        </div>
      )}
    </div>
  )
}

interface TaskRowProps {
  task: Task
  onClick?: () => void
  onComplete?: () => void
}

function TaskRow({ task, onClick, onComplete }: TaskRowProps) {
  const status = statusConfig[task.status]
  const priority = priorityConfig[task.priority]
  const isDone = task.status === 'DONE'

  // Calculate days overdue
  let daysOverdue = 0
  if (task.due_date && task.status !== 'DONE') {
    const today = new Date()
    const dueDate = new Date(task.due_date)
    const diff = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
    if (diff > 0) daysOverdue = diff
  }

  return (
    <div
      className={`
        flex items-center gap-3 p-3
        bg-white
        border border-neutral-200
        ${isDone ? 'opacity-60' : ''}
        hover:border-neutral-400
        transition-colors cursor-pointer
      `}
      onClick={onClick}
    >
      {/* Checkbox */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onComplete?.()
        }}
        className={`
          w-5 h-5 flex-shrink-0
          border border-neutral-200
          ${isDone ? 'bg-success' : 'hover:bg-success-light'}
          flex items-center justify-center
          transition-colors
        `}
      >
        {isDone && <Check size={12} className="text-white" />}
      </button>

      {/* Priority */}
      <span className={`px-1.5 py-0.5 text-xs font-medium ${priority.bg} ${priority.text}`}>
        {task.priority}
      </span>

      {/* Title */}
      <span className={`flex-1 text-sm ${isDone ? 'line-through text-neutral-400' : 'text-neutral-900'}`}>
        {task.title}
      </span>

      {/* Status */}
      <span className={`px-2 py-0.5 text-xs font-medium uppercase tracking-wider ${status.bg} ${status.text}`}>
        {status.label}
      </span>

      {/* Overdue indicator */}
      {daysOverdue > 0 && (
        <span className="text-xs text-error-dark font-medium flex items-center gap-1">
          <Clock size={12} />
          -{daysOverdue}d
        </span>
      )}

      {/* Blocked reason */}
      {task.blocked_reason && (
        <span className="text-xs text-error truncate max-w-32" title={task.blocked_reason}>
          {task.blocked_reason}
        </span>
      )}
    </div>
  )
}

// ============ GANTT VIEW COMPONENT ============

interface GanttViewProps {
  projects: Project[]
  onProjectClick?: (projectName: string) => void
}

function GanttView({ projects, onProjectClick }: GanttViewProps) {
  // Calculate date range for the Gantt chart
  const today = new Date()
  const dates = projects.flatMap(p => {
    const start = p.start_date ? new Date(p.start_date) : today
    const end = p.target_date ? new Date(p.target_date) : new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000)
    return [start, end]
  })

  if (dates.length === 0) {
    return (
      <div className="text-center py-16 bg-white border border-neutral-200">
        <p className="text-neutral-500">No hay proyectos para mostrar en Gantt</p>
      </div>
    )
  }

  const minDate = new Date(Math.min(...dates.map(d => d.getTime())))
  const maxDate = new Date(Math.max(...dates.map(d => d.getTime())))

  // Extend range slightly
  minDate.setDate(minDate.getDate() - 3)
  maxDate.setDate(maxDate.getDate() + 7)

  const totalDays = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24))
  const dayWidth = Math.max(30, Math.min(50, 1200 / totalDays)) // Adaptive width

  // Generate weeks for header
  const weeks: { start: Date; label: string }[] = []
  const current = new Date(minDate)
  current.setDate(current.getDate() - current.getDay()) // Start from Sunday
  while (current <= maxDate) {
    weeks.push({
      start: new Date(current),
      label: current.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
    })
    current.setDate(current.getDate() + 7)
  }

  const getBarPosition = (startDate: string | undefined, endDate: string | undefined) => {
    const start = startDate ? new Date(startDate) : today
    const end = endDate ? new Date(endDate) : new Date(start.getTime() + 14 * 24 * 60 * 60 * 1000)

    const startOffset = Math.max(0, (start.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24))
    const duration = Math.max(1, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))

    return {
      left: startOffset * dayWidth,
      width: duration * dayWidth
    }
  }

  const todayOffset = (today.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24) * dayWidth

  return (
    <div className="bg-white border border-neutral-200 overflow-hidden">
      {/* Header */}
      <div className="bg-neutral-100 border-b border-neutral-200 p-3 flex items-center justify-between">
        <h3 className="font-heading font-bold text-neutral-900">Diagrama de Gantt</h3>
        <p className="text-xs text-neutral-500 uppercase tracking-wider">
          {projects.length} proyecto{projects.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="overflow-x-auto">
        <div style={{ minWidth: totalDays * dayWidth + 200 }}>
          {/* Timeline Header */}
          <div className="flex border-b-2 border-neutral-300 bg-neutral-50">
            {/* Project names column */}
            <div className="w-48 flex-shrink-0 border-r-2 border-neutral-300 p-2">
              <span className="text-xs text-neutral-500 uppercase tracking-wider font-medium">
                Proyecto
              </span>
            </div>
            {/* Weeks */}
            <div className="flex-1 flex">
              {weeks.map((week, i) => (
                <div
                  key={i}
                  className="text-center py-2 border-r border-neutral-200 text-xs text-neutral-500 uppercase tracking-wider"
                  style={{ width: 7 * dayWidth }}
                >
                  {week.label}
                </div>
              ))}
            </div>
          </div>

          {/* Project Rows */}
          {projects.map((project, idx) => {
            const health = healthConfig[project.health]
            const dept = departmentConfig[project.department]
            const bar = getBarPosition(project.start_date, project.target_date)

            return (
              <div
                key={project.name}
                className={`flex border-b border-neutral-200 hover:bg-neutral-50 transition-colors ${
                  idx % 2 === 0 ? 'bg-white' : 'bg-neutral-50/50'
                }`}
              >
                {/* Project Info */}
                <div
                  className="w-48 flex-shrink-0 border-r-2 border-neutral-300 p-3 cursor-pointer hover:bg-gold-light"
                  onClick={() => onProjectClick?.(project.name)}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-1.5 py-0.5 text-xs font-medium ${dept.bg} ${dept.text}`}>
                      {project.department}
                    </span>
                    <span className={`w-2 h-2 ${health.bg}`} />
                  </div>
                  <p className="font-medium text-sm text-neutral-900 truncate" title={project.title}>
                    {project.title}
                  </p>
                  <p className="text-xs text-neutral-500 font-mono mt-0.5">
                    {project.progress_pct || 0}% completado
                  </p>
                </div>

                {/* Gantt Bar Area */}
                <div className="flex-1 relative h-20">
                  {/* Today Line */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-gold-dark z-10"
                    style={{ left: todayOffset }}
                  />

                  {/* Project Bar */}
                  <div
                    className={`
                      absolute top-4 h-12
                      ${health.bg}
                      border border-neutral-200
                      shadow-sm
                      cursor-pointer
                      transition-all duration-75
                    `}
                    style={{ left: bar.left, width: Math.max(bar.width, 20) }}
                    onClick={() => onProjectClick?.(project.name)}
                    title={`${project.title}\n${project.start_date} → ${project.target_date || 'Sin fecha'}`}
                  >
                    {/* Progress overlay */}
                    <div
                      className="absolute inset-0 bg-neutral-900/20"
                      style={{ width: `${project.progress_pct || 0}%` }}
                    />
                    {/* Label inside bar */}
                    {bar.width > 80 && (
                      <span className="absolute inset-0 flex items-center px-2 text-xs font-medium text-neutral-900 truncate">
                        {project.title}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="border-t-2 border-neutral-200 bg-neutral-50 px-4 py-3 flex flex-wrap items-center gap-4 text-xs">
        <span className="text-neutral-500 uppercase tracking-wider font-medium">Estado:</span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 bg-emerald-400 border border-neutral-200" />
          On Track
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 bg-gold border border-neutral-200" />
          At Risk
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 bg-error border border-neutral-200" />
          Critical
        </span>
        <span className="flex items-center gap-1.5 ml-4">
          <span className="w-3 h-0.5 bg-gold-dark" />
          Hoy
        </span>
      </div>
    </div>
  )
}

export default ProjectsPage
