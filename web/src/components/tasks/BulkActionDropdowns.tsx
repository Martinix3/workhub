// Dropdown components for bulk actions
import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check, Edit, User, Flag, FolderOpen } from 'lucide-react'
import { useProjects } from '../../api/hooks/useTasks'
import { useUsers } from '../../api/hooks/useAdmin'
import type { TaskStatus, TaskPriority, Project } from '../sections/tasks/types'

// ============== Status Dropdown ==============

interface StatusDropdownProps {
  value: TaskStatus | null
  onChange: (status: TaskStatus) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

const STATUS_OPTIONS: { value: TaskStatus; label: string; color: string }[] = [
  { value: 'BACKLOG', label: 'Backlog', color: 'bg-stone-600' },
  { value: 'NEXT', label: 'Next', color: 'bg-cyan-400' },
  { value: 'DOING', label: 'Doing', color: 'bg-amber-400' },
  { value: 'BLOCKED', label: 'Blocked', color: 'bg-red-500' },
  { value: 'DONE', label: 'Done', color: 'bg-green-500' }
]

export function StatusDropdown({
  value,
  onChange,
  placeholder = 'Seleccionar estado',
  disabled = false,
  className = ''
}: StatusDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedOption = STATUS_OPTIONS.find(opt => opt.value === value)

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (status: TaskStatus) => {
    onChange(status)
    setIsOpen(false)
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full px-3 py-2 text-left
          border-2 border-stone-900
          bg-white
          flex items-center gap-2
          transition-all
          shadow-[2px_2px_0_#1c1917]
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-[1px_1px_0_#1c1917] hover:translate-x-[1px] hover:translate-y-[1px] cursor-pointer'}
          ${isOpen ? 'translate-x-[1px] translate-y-[1px] shadow-[1px_1px_0_#1c1917]' : ''}
        `}
      >
        <Edit size={16} className="text-stone-600 flex-shrink-0" />
        {selectedOption ? (
          <>
            <div className={`w-3 h-3 ${selectedOption.color} border border-stone-900 flex-shrink-0`} />
            <span className="flex-1 truncate text-sm font-medium text-stone-900">
              {selectedOption.label}
            </span>
          </>
        ) : (
          <span className="flex-1 text-sm text-stone-400">{placeholder}</span>
        )}
        <ChevronDown
          size={16}
          className={`text-stone-600 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border-2 border-stone-900 shadow-[4px_4px_0_#1c1917] overflow-hidden">
          <div className="max-h-64 overflow-y-auto">
            {STATUS_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                className={`
                  w-full px-3 py-2 flex items-center gap-2 text-left
                  hover:bg-amber-50 transition-colors
                  ${option.value === value ? 'bg-amber-100' : ''}
                `}
              >
                <div className={`w-4 h-4 ${option.color} border border-stone-900 flex-shrink-0`} />
                <span className="flex-1 text-sm font-medium text-stone-900">
                  {option.label}
                </span>
                {option.value === value && (
                  <Check size={16} className="text-stone-900 flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ============== Priority Dropdown ==============

interface PriorityDropdownProps {
  value: TaskPriority | null
  onChange: (priority: TaskPriority) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

const PRIORITY_OPTIONS: { value: TaskPriority; label: string; color: string }[] = [
  { value: 'P0', label: 'P0 - Crítica', color: 'bg-red-500' },
  { value: 'P1', label: 'P1 - Alta', color: 'bg-amber-400' },
  { value: 'P2', label: 'P2 - Normal', color: 'bg-stone-400' }
]

export function PriorityDropdown({
  value,
  onChange,
  placeholder = 'Seleccionar prioridad',
  disabled = false,
  className = ''
}: PriorityDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedOption = PRIORITY_OPTIONS.find(opt => opt.value === value)

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (priority: TaskPriority) => {
    onChange(priority)
    setIsOpen(false)
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full px-3 py-2 text-left
          border-2 border-stone-900
          bg-white
          flex items-center gap-2
          transition-all
          shadow-[2px_2px_0_#1c1917]
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-[1px_1px_0_#1c1917] hover:translate-x-[1px] hover:translate-y-[1px] cursor-pointer'}
          ${isOpen ? 'translate-x-[1px] translate-y-[1px] shadow-[1px_1px_0_#1c1917]' : ''}
        `}
      >
        <Flag size={16} className="text-stone-600 flex-shrink-0" />
        {selectedOption ? (
          <>
            <div className={`w-3 h-3 ${selectedOption.color} border border-stone-900 flex-shrink-0`} />
            <span className="flex-1 truncate text-sm font-medium text-stone-900">
              {selectedOption.label}
            </span>
          </>
        ) : (
          <span className="flex-1 text-sm text-stone-400">{placeholder}</span>
        )}
        <ChevronDown
          size={16}
          className={`text-stone-600 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border-2 border-stone-900 shadow-[4px_4px_0_#1c1917] overflow-hidden">
          <div className="max-h-64 overflow-y-auto">
            {PRIORITY_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                className={`
                  w-full px-3 py-2 flex items-center gap-2 text-left
                  hover:bg-amber-50 transition-colors
                  ${option.value === value ? 'bg-amber-100' : ''}
                `}
              >
                <div className={`w-4 h-4 ${option.color} border border-stone-900 flex-shrink-0`} />
                <span className="flex-1 text-sm font-medium text-stone-900">
                  {option.label}
                </span>
                {option.value === value && (
                  <Check size={16} className="text-stone-900 flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ============== Project Dropdown ==============

interface ProjectDropdownProps {
  value: string | null
  onChange: (projectId: string | null) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function ProjectDropdown({
  value,
  onChange,
  placeholder = 'Seleccionar proyecto',
  disabled = false,
  className = ''
}: ProjectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const { data: projectsData, loading } = useProjects({ status: 'ACTIVE' })
  const projects = projectsData || []

  // Find selected project for display
  const selectedProject = projects.find(p => p.name === value)

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (projectId: string | null) => {
    onChange(projectId)
    setIsOpen(false)
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full px-3 py-2 text-left
          border-2 border-stone-900
          bg-white
          flex items-center gap-2
          transition-all
          shadow-[2px_2px_0_#1c1917]
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-[1px_1px_0_#1c1917] hover:translate-x-[1px] hover:translate-y-[1px] cursor-pointer'}
          ${isOpen ? 'translate-x-[1px] translate-y-[1px] shadow-[1px_1px_0_#1c1917]' : ''}
        `}
      >
        <FolderOpen size={16} className="text-stone-600 flex-shrink-0" />
        {selectedProject ? (
          <span className="flex-1 truncate text-sm font-medium text-stone-900">
            {selectedProject.title}
          </span>
        ) : (
          <span className="flex-1 text-sm text-stone-400">{placeholder}</span>
        )}
        <ChevronDown
          size={16}
          className={`text-stone-600 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border-2 border-stone-900 shadow-[4px_4px_0_#1c1917] overflow-hidden">
          <div className="max-h-64 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-sm text-stone-500">
                Cargando...
              </div>
            ) : projects.length === 0 ? (
              <div className="p-4 text-center text-sm text-stone-500">
                No se encontraron proyectos activos
              </div>
            ) : (
              <>
                {/* Option to clear project (move to inbox) */}
                <button
                  type="button"
                  onClick={() => handleSelect(null)}
                  className={`
                    w-full px-3 py-2 flex items-center gap-2 text-left
                    hover:bg-amber-50 transition-colors border-b border-stone-200
                    ${value === null ? 'bg-amber-100' : ''}
                  `}
                >
                  <span className="flex-1 text-sm font-medium text-stone-600 italic">
                    Sin proyecto (Inbox)
                  </span>
                  {value === null && (
                    <Check size={16} className="text-stone-900 flex-shrink-0" />
                  )}
                </button>

                {/* Project options */}
                {projects.map((project) => (
                  <button
                    key={project.name}
                    type="button"
                    onClick={() => handleSelect(project.name)}
                    className={`
                      w-full px-3 py-2 flex items-center gap-2 text-left
                      hover:bg-amber-50 transition-colors
                      ${project.name === value ? 'bg-amber-100' : ''}
                    `}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-stone-900 truncate">
                        {project.title}
                      </p>
                      <p className="text-xs text-stone-500 truncate">
                        {project.department}
                      </p>
                    </div>
                    {project.name === value && (
                      <Check size={16} className="text-stone-900 flex-shrink-0" />
                    )}
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ============== User Dropdown ==============

interface UserDropdownProps {
  value: string | null
  onChange: (email: string | null) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function UserDropdown({
  value,
  onChange,
  placeholder = 'Seleccionar usuario',
  disabled = false,
  className = ''
}: UserDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const { data: usersData, loading } = useUsers(50)
  const users = usersData?.users || []

  // Find selected user for display
  const selectedUser = users.find(u => u.email === value || u.name === value)

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (email: string | null) => {
    onChange(email)
    setIsOpen(false)
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full px-3 py-2 text-left
          border-2 border-stone-900
          bg-white
          flex items-center gap-2
          transition-all
          shadow-[2px_2px_0_#1c1917]
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-[1px_1px_0_#1c1917] hover:translate-x-[1px] hover:translate-y-[1px] cursor-pointer'}
          ${isOpen ? 'translate-x-[1px] translate-y-[1px] shadow-[1px_1px_0_#1c1917]' : ''}
        `}
      >
        <User size={16} className="text-stone-600 flex-shrink-0" />
        {selectedUser ? (
          <span className="flex-1 truncate text-sm font-medium text-stone-900">
            {selectedUser.full_name || selectedUser.email}
          </span>
        ) : (
          <span className="flex-1 text-sm text-stone-400">{placeholder}</span>
        )}
        <ChevronDown
          size={16}
          className={`text-stone-600 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border-2 border-stone-900 shadow-[4px_4px_0_#1c1917] overflow-hidden">
          <div className="max-h-64 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-sm text-stone-500">
                Cargando...
              </div>
            ) : users.length === 0 ? (
              <div className="p-4 text-center text-sm text-stone-500">
                No se encontraron usuarios
              </div>
            ) : (
              <>
                {/* Option to unassign */}
                <button
                  type="button"
                  onClick={() => handleSelect(null)}
                  className={`
                    w-full px-3 py-2 flex items-center gap-2 text-left
                    hover:bg-amber-50 transition-colors border-b border-stone-200
                    ${value === null ? 'bg-amber-100' : ''}
                  `}
                >
                  <span className="flex-1 text-sm font-medium text-stone-600 italic">
                    Sin asignar
                  </span>
                  {value === null && (
                    <Check size={16} className="text-stone-900 flex-shrink-0" />
                  )}
                </button>

                {/* User options */}
                {users.map((user) => (
                  <button
                    key={user.name}
                    type="button"
                    onClick={() => handleSelect(user.email)}
                    className={`
                      w-full px-3 py-2 flex items-center gap-2 text-left
                      hover:bg-amber-50 transition-colors
                      ${user.email === value ? 'bg-amber-100' : ''}
                    `}
                  >
                    <div className="w-7 h-7 bg-stone-200 border border-stone-400 flex items-center justify-center flex-shrink-0">
                      {user.user_image ? (
                        <img
                          src={user.user_image}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User size={14} className="text-stone-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-stone-900 truncate">
                        {user.full_name || user.email}
                      </p>
                      {user.full_name && (
                        <p className="text-xs text-stone-500 truncate">
                          {user.email}
                        </p>
                      )}
                    </div>
                    {user.email === value && (
                      <Check size={16} className="text-stone-900 flex-shrink-0" />
                    )}
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default {
  StatusDropdown,
  PriorityDropdown,
  ProjectDropdown,
  UserDropdown
}
