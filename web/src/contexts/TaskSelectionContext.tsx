import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { frappe } from '../api/frappe-client'

// Maximum number of tasks that can be selected at once for performance
export const MAX_SELECTION = 100

interface TaskSelectionContextType {
  selectedTasks: Set<string>
  toggleSelection: (taskId: string) => void
  selectAll: (taskIds: string[]) => void
  clearSelection: () => void
  isSelected: (taskId: string) => boolean
}

const TaskSelectionContext = createContext<TaskSelectionContextType | undefined>(undefined)

interface TaskSelectionProviderProps {
  children: ReactNode
}

export function TaskSelectionProvider({ children }: TaskSelectionProviderProps) {
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set())

  const toggleSelection = useCallback((taskId: string) => {
    setSelectedTasks(prev => {
      const next = new Set(prev)
      if (next.has(taskId)) {
        next.delete(taskId)
      } else {
        // Enforce maximum selection limit
        if (next.size >= MAX_SELECTION) {
          window.alert({
            title: 'Límite de Selección Alcanzado',
            message: `No puedes seleccionar más de ${MAX_SELECTION} tareas a la vez por razones de rendimiento.`,
            indicator: 'orange'
          })
          return prev
        }
        next.add(taskId)
      }
      return next
    })
  }, [])

  const selectAll = useCallback((taskIds: string[]) => {
    // Enforce maximum selection limit
    if (taskIds.length > MAX_SELECTION) {
      window.alert({
        title: 'Límite de Selección Alcanzado',
        message: `Solo se seleccionarán las primeras ${MAX_SELECTION} tareas de ${taskIds.length} tareas disponibles por razones de rendimiento.`,
        indicator: 'orange'
      })
      setSelectedTasks(new Set(taskIds.slice(0, MAX_SELECTION)))
    } else {
      setSelectedTasks(new Set(taskIds))
    }
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedTasks(new Set())
  }, [])

  const isSelected = useCallback((taskId: string) => {
    return selectedTasks.has(taskId)
  }, [selectedTasks])

  const value: TaskSelectionContextType = {
    selectedTasks,
    toggleSelection,
    selectAll,
    clearSelection,
    isSelected
  }

  return (
    <TaskSelectionContext.Provider value={value}>
      {children}
    </TaskSelectionContext.Provider>
  )
}

export function useTaskSelection(): TaskSelectionContextType {
  const context = useContext(TaskSelectionContext)
  if (context === undefined) {
    throw new Error('useTaskSelection must be used within a TaskSelectionProvider')
  }
  return context
}

export default TaskSelectionContext
