import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

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
        next.add(taskId)
      }
      return next
    })
  }, [])

  const selectAll = useCallback((taskIds: string[]) => {
    setSelectedTasks(new Set(taskIds))
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
