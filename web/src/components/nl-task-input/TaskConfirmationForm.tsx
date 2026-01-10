// Task Confirmation Form
// Editable form for confirming and adjusting parsed task fields

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Search, User, X, FolderOpen } from 'lucide-react'
import { useUserSearch, useProjectSearch } from '../../api/hooks/useNLTask'
import type { ParsedTask, TaskPriority, UserSuggestion, ProjectSuggestion } from './types'
import { PRIORITY_LABELS } from './types'

interface TaskConfirmationFormProps {
  parsedTask: ParsedTask
  onChange: (updates: Partial<ParsedTask>) => void
}

export function TaskConfirmationForm({ parsedTask, onChange }: TaskConfirmationFormProps) {
  // State for user selection dropdown
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false)
  const [userSearchTerm, setUserSearchTerm] = useState('')
  const userContainerRef = useRef<HTMLDivElement>(null)
  const userInputRef = useRef<HTMLInputElement>(null)

  // State for project selection dropdown
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false)
  const [projectSearchTerm, setProjectSearchTerm] = useState('')
  const projectContainerRef = useRef<HTMLDivElement>(null)
  const projectInputRef = useRef<HTMLInputElement>(null)

  // User and project search hooks
  const { users, loading: usersLoading, search: searchUsers } = useUserSearch()
  const { projects, loading: projectsLoading, search: searchProjects } = useProjectSearch()

  // Debounced user search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchUsers(userSearchTerm)
    }, 300)
    return () => clearTimeout(timer)
  }, [userSearchTerm, searchUsers])

  // Debounced project search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchProjects(projectSearchTerm)
    }, 300)
    return () => clearTimeout(timer)
  }, [projectSearchTerm, searchProjects])

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userContainerRef.current && !userContainerRef.current.contains(e.target as Node)) {
        setIsUserDropdownOpen(false)
      }
      if (projectContainerRef.current && !projectContainerRef.current.contains(e.target as Node)) {
        setIsProjectDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Focus input when opening dropdowns
  useEffect(() => {
    if (isUserDropdownOpen && userInputRef.current) {
      userInputRef.current.focus()
    }
  }, [isUserDropdownOpen])

  useEffect(() => {
    if (isProjectDropdownOpen && projectInputRef.current) {
      projectInputRef.current.focus()
    }
  }, [isProjectDropdownOpen])

  // Handler for title change
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ title: e.target.value })
  }

  // Handler for due date change
  const handleDueDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ due_date: e.target.value || null })
  }

  // Handler for priority change
  const handlePriorityChange = (priority: TaskPriority) => {
    onChange({ priority })
  }

  // Handler for user selection
  const handleUserSelect = (user: UserSuggestion | null) => {
    onChange({
      assignee: {
        ...parsedTask.assignee,
        matched: user !== null,
        user: user,
        name: user?.full_name || parsedTask.assignee.name
      }
    })
    setIsUserDropdownOpen(false)
    setUserSearchTerm('')
  }

  // Handler for project selection
  const handleProjectSelect = (project: ProjectSuggestion | null) => {
    onChange({
      project: {
        ...parsedTask.project,
        matched: project !== null,
        project: project,
        name: project?.title || parsedTask.project.name
      }
    })
    setIsProjectDropdownOpen(false)
    setProjectSearchTerm('')
  }

  // Handler for description change
  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange({ description: e.target.value || null })
  }

  const priorities: TaskPriority[] = ['P0', 'P1', 'P2']

  return (
    <div className="space-y-4">
      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">
          Título <span className="text-red-600">*</span>
        </label>
        <input
          type="text"
          value={parsedTask.title}
          onChange={handleTitleChange}
          className="w-full px-3 py-2 border-2 border-stone-300 focus:border-stone-900 outline-none"
          placeholder="Título de la tarea"
        />
      </div>

      {/* Due Date */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">
          Fecha límite
        </label>
        <input
          type="date"
          value={parsedTask.due_date || ''}
          onChange={handleDueDateChange}
          className="w-full px-3 py-2 border-2 border-stone-300 focus:border-stone-900 outline-none"
        />
      </div>

      {/* Priority */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-2">
          Prioridad
        </label>
        <div className="flex gap-2">
          {priorities.map((priority) => (
            <button
              key={priority}
              type="button"
              onClick={() => handlePriorityChange(priority)}
              className={`
                flex-1 px-4 py-2 border-2 font-medium uppercase tracking-wide text-sm transition-all
                ${parsedTask.priority === priority
                  ? 'bg-amber-400 border-stone-900 shadow-[2px_2px_0_#1c1917]'
                  : 'bg-white border-stone-300 hover:border-stone-400'
                }
              `}
            >
              {PRIORITY_LABELS[priority]}
            </button>
          ))}
        </div>
      </div>

      {/* Assignee */}
      <div ref={userContainerRef}>
        <label className="block text-sm font-medium text-stone-700 mb-1">
          Asignado a
        </label>
        <button
          type="button"
          onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
          className={`
            w-full px-3 py-2 text-left
            border-2 border-stone-300
            bg-white
            flex items-center gap-2
            transition-colors
            hover:border-stone-400
            ${isUserDropdownOpen ? 'border-stone-900' : ''}
          `}
        >
          {parsedTask.assignee.matched && parsedTask.assignee.user ? (
            <>
              <div className="w-6 h-6 bg-stone-200 border border-stone-400 flex items-center justify-center flex-shrink-0">
                {parsedTask.assignee.user.user_image ? (
                  <img
                    src={parsedTask.assignee.user.user_image}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User size={14} className="text-stone-500" />
                )}
              </div>
              <span className="flex-1 truncate text-sm text-stone-900">
                {parsedTask.assignee.user.full_name}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleUserSelect(null)
                }}
                className="p-0.5 hover:bg-stone-100"
              >
                <X size={14} className="text-stone-400" />
              </button>
            </>
          ) : (
            <>
              <User size={16} className="text-stone-400 flex-shrink-0" />
              <span className="flex-1 text-sm text-stone-400">
                {parsedTask.assignee.name ? `"${parsedTask.assignee.name}" (no encontrado)` : 'Seleccionar usuario'}
              </span>
            </>
          )}
          <ChevronDown
            size={16}
            className={`text-stone-400 flex-shrink-0 transition-transform ${isUserDropdownOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {/* User Dropdown */}
        {isUserDropdownOpen && (
          <div className="absolute z-50 left-0 right-0 mt-1 bg-white border-2 border-stone-900 shadow-[4px_4px_0_#1c1917] max-h-64 overflow-hidden">
            {/* Search Input */}
            <div className="p-2 border-b border-stone-200">
              <div className="flex items-center gap-2 px-2 py-1.5 bg-stone-50 border border-stone-300">
                <Search size={14} className="text-stone-400" />
                <input
                  ref={userInputRef}
                  type="text"
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  placeholder="Buscar usuario..."
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-stone-400"
                />
              </div>
            </div>

            {/* Options */}
            <div className="max-h-48 overflow-y-auto">
              {usersLoading ? (
                <div className="p-4 text-center text-sm text-stone-500">
                  Cargando...
                </div>
              ) : users.length === 0 ? (
                <div className="p-4 text-center text-sm text-stone-500">
                  {userSearchTerm ? 'No se encontraron usuarios' : 'Escribe para buscar'}
                </div>
              ) : (
                <>
                  {parsedTask.assignee.suggestions.length > 0 && !userSearchTerm && (
                    <>
                      <div className="px-3 py-1.5 bg-stone-100 text-xs font-medium text-stone-600 uppercase tracking-wide">
                        Sugerencias
                      </div>
                      {parsedTask.assignee.suggestions.map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => handleUserSelect(user)}
                          className="w-full px-3 py-2 flex items-center gap-2 text-left hover:bg-amber-50 transition-colors"
                        >
                          <div className="w-7 h-7 bg-stone-200 border border-stone-400 flex items-center justify-center flex-shrink-0">
                            {user.user_image ? (
                              <img src={user.user_image} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <User size={14} className="text-stone-500" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-stone-900 truncate">
                              {user.full_name}
                            </p>
                            <p className="text-xs text-stone-500 truncate">
                              {user.email}
                            </p>
                          </div>
                        </button>
                      ))}
                      <div className="border-t border-stone-200 my-1" />
                    </>
                  )}
                  {users.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => handleUserSelect(user)}
                      className="w-full px-3 py-2 flex items-center gap-2 text-left hover:bg-amber-50 transition-colors"
                    >
                      <div className="w-7 h-7 bg-stone-200 border border-stone-400 flex items-center justify-center flex-shrink-0">
                        {user.user_image ? (
                          <img src={user.user_image} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <User size={14} className="text-stone-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-stone-900 truncate">
                          {user.full_name}
                        </p>
                        <p className="text-xs text-stone-500 truncate">
                          {user.email}
                        </p>
                      </div>
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Project */}
      <div ref={projectContainerRef}>
        <label className="block text-sm font-medium text-stone-700 mb-1">
          Proyecto
        </label>
        <button
          type="button"
          onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
          className={`
            w-full px-3 py-2 text-left
            border-2 border-stone-300
            bg-white
            flex items-center gap-2
            transition-colors
            hover:border-stone-400
            ${isProjectDropdownOpen ? 'border-stone-900' : ''}
          `}
        >
          {parsedTask.project.matched && parsedTask.project.project ? (
            <>
              <FolderOpen size={16} className="text-stone-600 flex-shrink-0" />
              <span className="flex-1 truncate text-sm text-stone-900">
                {parsedTask.project.project.title}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleProjectSelect(null)
                }}
                className="p-0.5 hover:bg-stone-100"
              >
                <X size={14} className="text-stone-400" />
              </button>
            </>
          ) : (
            <>
              <FolderOpen size={16} className="text-stone-400 flex-shrink-0" />
              <span className="flex-1 text-sm text-stone-400">
                {parsedTask.project.name ? `"${parsedTask.project.name}" (no encontrado)` : 'Seleccionar proyecto'}
              </span>
            </>
          )}
          <ChevronDown
            size={16}
            className={`text-stone-400 flex-shrink-0 transition-transform ${isProjectDropdownOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {/* Project Dropdown */}
        {isProjectDropdownOpen && (
          <div className="absolute z-50 left-0 right-0 mt-1 bg-white border-2 border-stone-900 shadow-[4px_4px_0_#1c1917] max-h-64 overflow-hidden">
            {/* Search Input */}
            <div className="p-2 border-b border-stone-200">
              <div className="flex items-center gap-2 px-2 py-1.5 bg-stone-50 border border-stone-300">
                <Search size={14} className="text-stone-400" />
                <input
                  ref={projectInputRef}
                  type="text"
                  value={projectSearchTerm}
                  onChange={(e) => setProjectSearchTerm(e.target.value)}
                  placeholder="Buscar proyecto..."
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-stone-400"
                />
              </div>
            </div>

            {/* Options */}
            <div className="max-h-48 overflow-y-auto">
              {projectsLoading ? (
                <div className="p-4 text-center text-sm text-stone-500">
                  Cargando...
                </div>
              ) : projects.length === 0 ? (
                <div className="p-4 text-center text-sm text-stone-500">
                  {projectSearchTerm ? 'No se encontraron proyectos' : 'Escribe para buscar'}
                </div>
              ) : (
                <>
                  {parsedTask.project.suggestions.length > 0 && !projectSearchTerm && (
                    <>
                      <div className="px-3 py-1.5 bg-stone-100 text-xs font-medium text-stone-600 uppercase tracking-wide">
                        Sugerencias
                      </div>
                      {parsedTask.project.suggestions.map((project) => (
                        <button
                          key={project.id}
                          type="button"
                          onClick={() => handleProjectSelect(project)}
                          className="w-full px-3 py-2 text-left hover:bg-amber-50 transition-colors border-b border-stone-100 last:border-0"
                        >
                          <p className="text-sm font-medium text-stone-900 truncate">
                            {project.title}
                          </p>
                          <p className="text-xs text-stone-500 truncate">
                            {project.department} · {project.status}
                          </p>
                        </button>
                      ))}
                      <div className="border-t border-stone-200 my-1" />
                    </>
                  )}
                  {projects.map((project) => (
                    <button
                      key={project.id}
                      type="button"
                      onClick={() => handleProjectSelect(project)}
                      className="w-full px-3 py-2 text-left hover:bg-amber-50 transition-colors border-b border-stone-100 last:border-0"
                    >
                      <p className="text-sm font-medium text-stone-900 truncate">
                        {project.title}
                      </p>
                      <p className="text-xs text-stone-500 truncate">
                        {project.department} · {project.status}
                      </p>
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">
          Descripción
        </label>
        <textarea
          value={parsedTask.description || ''}
          onChange={handleDescriptionChange}
          rows={3}
          className="w-full px-3 py-2 border-2 border-stone-300 focus:border-stone-900 outline-none resize-none"
          placeholder="Descripción adicional (opcional)"
        />
      </div>
    </div>
  )
}

export default TaskConfirmationForm
