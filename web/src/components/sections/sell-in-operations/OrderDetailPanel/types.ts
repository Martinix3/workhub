import type { SalesOrder } from '../types'

export type SalesType = 'sell_in' | 'sell_out'

export interface OrderDetail extends SalesOrder {
  salesType: SalesType
  assignedDistributor?: {
    id: string
    name: string
  }
}

export interface WorkLink {
  id: string
  taskId: string
  taskTitle: string
  taskStatus: string
  documentType: string
  documentId: string
}

export interface OrderDetailPanelProps {
  orderId: string | null
  isOpen: boolean
  onClose: () => void
  onSave?: (order: OrderDetail) => void
  onCancelOrder?: (orderId: string) => void
}
