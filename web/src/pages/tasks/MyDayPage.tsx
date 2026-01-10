// My Day Page - TDAH-friendly task view
import { useNavigate } from 'react-router-dom'
import { MyDay } from '../../components/sections/tasks'
import { LoadingState } from '../../components/ui/LoadingState'
import { ErrorState } from '../../components/ui/ErrorState'
import { useMyDay, useTaskMutations } from '../../api'
import { NLTaskFAB } from '../../components/nl-task-input'

export function MyDayPage() {
  const navigate = useNavigate()
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
      <NLTaskFAB onTaskCreated={() => refetch()} />
    </>
  )
}

export default MyDayPage
