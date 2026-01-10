// My Day Page - TDAH-friendly task view
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MyDay } from '../../components/sections/tasks'
import { LoadingState } from '../../components/ui/LoadingState'
import { ErrorState } from '../../components/ui/ErrorState'
import { useMyDay, useTaskMutations } from '../../api'
import { TaskSelectionProvider } from '../../contexts/TaskSelectionContext'

export function MyDayPage() {
  return (
    <TaskSelectionProvider>
      <MyDayContent />
    </TaskSelectionProvider>
  )
}

function MyDayContent() {
  const navigate = useNavigate()
  const [selectionMode, setSelectionMode] = useState(false)
  const { data, loading, error, refetch } = useMyDay()
  const { changeStatus, quickAdd } = useTaskMutations()

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

  // Bulk action handlers (placeholders - will be implemented in subtask 4.4)
  const handleBulkChangeStatus = () => {
    // TODO: Implement in subtask 4.4
  }

  const handleBulkAssign = () => {
    // TODO: Implement in subtask 4.4
  }

  const handleBulkChangePriority = () => {
    // TODO: Implement in subtask 4.4
  }

  const handleBulkMoveProject = () => {
    // TODO: Implement in subtask 4.4
  }

  const handleBulkAddWorkLink = () => {
    // TODO: Implement in subtask 4.4
  }

  return (
    <MyDay
      data={data}
      onTaskComplete={handleTaskComplete}
      onTaskBlock={handleTaskBlock}
      onTaskClick={(id) => navigate(`/tareas/tarea/${id}`)}
      onQuickAdd={handleQuickAdd}
      onChangeStatus={handleChangeStatus}
      selectionMode={selectionMode}
      onToggleSelectionMode={() => setSelectionMode(!selectionMode)}
      onBulkChangeStatus={handleBulkChangeStatus}
      onBulkAssign={handleBulkAssign}
      onBulkChangePriority={handleBulkChangePriority}
      onBulkMoveProject={handleBulkMoveProject}
      onBulkAddWorkLink={handleBulkAddWorkLink}
    />
  )
}

export default MyDayPage
