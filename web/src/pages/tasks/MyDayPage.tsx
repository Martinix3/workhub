// My Day Page - TDAH-friendly task view
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MyDay } from '../../components/sections/tasks'
import { LoadingState } from '../../components/ui/LoadingState'
import { ErrorState } from '../../components/ui/ErrorState'
import { TaskCompletionModal } from '../../components/tasks/TaskCompletionModal'
import { useMyDay, useTaskMutations } from '../../api'
import type { Task } from '../../components/sections/tasks/types'

export function MyDayPage() {
  const navigate = useNavigate()
  const { data, loading, error, refetch } = useMyDay()
  const { changeStatus, quickAdd, completeTask } = useTaskMutations()
  const [taskToComplete, setTaskToComplete] = useState<Task | null>(null)
  const [showCompletionModal, setShowCompletionModal] = useState(false)

  if (loading) {
    return <LoadingState message="Cargando tu dia..." />
  }

  if (error || !data) {
    return (
      <ErrorState
        title="Error al cargar Mi Dia"
        message="No se pudo cargar la informacion de tareas."
        error={error}
        onRetry={refetch}
      />
    )
  }

  const handleTaskComplete = (task: Task) => {
    setTaskToComplete(task)
    setShowCompletionModal(true)
  }

  const handleModalComplete = async (taskId: string, notes?: string) => {
    await completeTask(taskId, notes)
    await refetch()
    setShowCompletionModal(false)
    setTaskToComplete(null)
  }

  const handleTaskBlock = async (taskId: string, _reason: string) => {
    // TODO: Add blocked_reason to changeStatus API when needed
    await changeStatus(taskId, 'BLOCKED')
    await refetch()
  }

  const handleQuickAdd = async (title: string, priority: 'P0' | 'P1' | 'P2') => {
    await quickAdd(title, priority)
    await refetch()
  }

  const handleChangeStatus = async (taskId: string, status: 'BACKLOG' | 'NEXT' | 'DOING' | 'BLOCKED' | 'DONE') => {
    await changeStatus(taskId, status)
    await refetch()
  }

  return (
    <>
      <MyDay
        data={data}
        onTaskComplete={handleTaskComplete}
        onTaskBlock={handleTaskBlock}
        onTaskClick={(id) => navigate(`/tareas/tarea/${id}`)}
        onQuickAdd={handleQuickAdd}
        onChangeStatus={handleChangeStatus}
      />

      {/* Task Completion Modal */}
      <TaskCompletionModal
        isOpen={showCompletionModal}
        onClose={() => {
          setShowCompletionModal(false)
          setTaskToComplete(null)
        }}
        task={taskToComplete}
        onComplete={handleModalComplete}
      />
    </>
  )
}

export default MyDayPage
