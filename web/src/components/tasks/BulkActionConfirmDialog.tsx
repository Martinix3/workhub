import { Modal } from '../ui/Modal'
import { AlertCircle } from 'lucide-react'

export type BulkActionType = 'status' | 'assign' | 'priority' | 'project' | 'worklink'

interface BulkActionConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  actionType: BulkActionType
  taskCount: number
  newValue: string
}

const actionLabels: Record<BulkActionType, string> = {
  status: 'Cambiar Estado',
  assign: 'Asignar Tareas',
  priority: 'Cambiar Prioridad',
  project: 'Mover a Proyecto',
  worklink: 'Añadir WorkLink'
}

const actionDescriptions: Record<BulkActionType, (count: number, value: string) => string> = {
  status: (count, value) => `Cambiarás el estado de ${count} ${count === 1 ? 'tarea' : 'tareas'} a "${value}".`,
  assign: (count, value) => `Asignarás ${count} ${count === 1 ? 'tarea' : 'tareas'} a "${value}".`,
  priority: (count, value) => `Cambiarás la prioridad de ${count} ${count === 1 ? 'tarea' : 'tareas'} a "${value}".`,
  project: (count, value) => `Moverás ${count} ${count === 1 ? 'tarea' : 'tareas'} al proyecto "${value}".`,
  worklink: (count, value) => `Vincularás ${count} ${count === 1 ? 'tarea' : 'tareas'} con "${value}".`
}

export function BulkActionConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  actionType,
  taskCount,
  newValue
}: BulkActionConfirmDialogProps) {
  const handleConfirm = () => {
    onConfirm()
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={actionLabels[actionType]}
      size="md"
    >
      <div className="p-6 space-y-6">
        {/* Warning Icon and Message */}
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <AlertCircle size={24} className="text-amber-600" />
          </div>
          <div className="space-y-3 flex-1">
            <p className="text-stone-900 dark:text-stone-100 font-medium">
              ¿Estás seguro de que deseas continuar?
            </p>
            <p className="text-stone-600 dark:text-stone-400">
              {actionDescriptions[actionType](taskCount, newValue)}
            </p>
          </div>
        </div>

        {/* Details Box */}
        <div className="bg-amber-50 dark:bg-amber-950/20 border-2 border-amber-200 dark:border-amber-800 p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-stone-600 dark:text-stone-400 font-medium">
              Acción:
            </span>
            <span className="text-stone-900 dark:text-stone-100 font-bold">
              {actionLabels[actionType]}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-stone-600 dark:text-stone-400 font-medium">
              Tareas afectadas:
            </span>
            <span className="text-stone-900 dark:text-stone-100 font-bold">
              {taskCount} {taskCount === 1 ? 'tarea' : 'tareas'}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-stone-600 dark:text-stone-400 font-medium">
              Nuevo valor:
            </span>
            <span className="text-stone-900 dark:text-stone-100 font-bold">
              {newValue}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="
              px-6 py-2.5
              bg-white dark:bg-stone-800
              border-2 border-stone-900 dark:border-stone-100
              font-medium text-sm text-stone-900 dark:text-stone-100
              uppercase tracking-wider
              hover:bg-stone-50 dark:hover:bg-stone-700
              transition-all
              shadow-[2px_2px_0_#1c1917] dark:shadow-[2px_2px_0_#f5f5f4]
              hover:shadow-[1px_1px_0_#1c1917] dark:hover:shadow-[1px_1px_0_#f5f5f4]
              hover:translate-x-[1px] hover:translate-y-[1px]
              active:shadow-none
              active:translate-x-[2px] active:translate-y-[2px]
            "
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            className="
              px-6 py-2.5
              bg-amber-400
              border-2 border-stone-900 dark:border-stone-100
              font-medium text-sm text-stone-900
              uppercase tracking-wider
              hover:bg-amber-500
              transition-all
              shadow-[2px_2px_0_#1c1917] dark:shadow-[2px_2px_0_#f5f5f4]
              hover:shadow-[1px_1px_0_#1c1917] dark:hover:shadow-[1px_1px_0_#f5f5f4]
              hover:translate-x-[1px] hover:translate-y-[1px]
              active:shadow-none
              active:translate-x-[2px] active:translate-y-[2px]
            "
          >
            Confirmar
          </button>
        </div>

        {/* Undo Notice */}
        <p className="text-xs text-stone-500 dark:text-stone-400 text-center">
          Podrás deshacer esta acción durante 30 segundos después de confirmar.
        </p>
      </div>
    </Modal>
  )
}

export default BulkActionConfirmDialog
