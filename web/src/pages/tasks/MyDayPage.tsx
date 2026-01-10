// My Day Page - TDAH-friendly task view
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MyDay } from '../../components/sections/tasks'
import { LoadingState } from '../../components/ui/LoadingState'
import { ErrorState } from '../../components/ui/ErrorState'
import { BlockedReasonModal } from '../../components/ui/BlockedReasonModal'
import { useMyDay, useTaskMutations } from '../../api'

export function MyDayPage() {
  const navigate = useNavigate()
  const { data, loading, error, refetch } = useMyDay()
  const { changeStatus, quickAdd } = useTaskMutations()
  const [blockModalOpen, setBlockModalOpen] = useState(false)
  const [taskToBlock, setTaskToBlock] = useState<{ id: string; name: string } | null>(null)

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

  const handleTaskComplete = async (taskId: string) => {
    await changeStatus(taskId, 'DONE')
    await refetch()
  }

  const handleTaskBlock = async (taskId: string, reason: string) => {
    await changeStatus(taskId, 'BLOCKED', reason)
    await refetch()
  }

  const handleQuickAdd = async (title: string, priority: 'P0' | 'P1' | 'P2') => {
    await quickAdd(title, priority)
    await refetch()
  }

  const handleChangeStatus = async (taskId: string, status: 'BACKLOG' | 'NEXT' | 'DOING' | 'BLOCKED' | 'DONE') => {
    if (status === 'BLOCKED') {
      // Find the task to get its name for the modal
      const task = data ? [...data.today, ...data.upcoming, ...data.blocked].find(t => t.name === taskId) : null
      setTaskToBlock({ id: taskId, name: task?.title || 'Task' })
      setBlockModalOpen(true)
      return
    }
    await changeStatus(taskId, status)
    await refetch()
  }

  const handleBlockConfirm = async (reason: string) => {
    if (taskToBlock) {
      await handleTaskBlock(taskToBlock.id, reason)
      setTaskToBlock(null)
    }
  }

  const handleBlockCancel = () => {
    setBlockModalOpen(false)
    setTaskToBlock(null)
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
      <BlockedReasonModal
        isOpen={blockModalOpen}
        onClose={handleBlockCancel}
        onConfirm={handleBlockConfirm}
        taskName={taskToBlock?.name}
      />
    </>
  )
}

export default MyDayPage
