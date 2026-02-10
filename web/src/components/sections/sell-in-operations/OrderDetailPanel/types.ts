import type { SalesOrder } from '../types'

export type SalesType = 'sell_in' | 'sell_out'

// Linked document types for the unified panel
export interface LinkedDeliveryNote {
  id: string
  date: string
  status: string
  docstatus: number
}

export interface LinkedInvoice {
  id: string
  date: string
  status: string
  total: number
  outstanding: number
  paid: number
}

export interface LinkedPayment {
  id: string
  date: string
  amount: number
  method: string
  invoiceId: string
}

export interface LinkedDocuments {
  deliveryNotes: LinkedDeliveryNote[]
  invoices: LinkedInvoice[]
  payments: LinkedPayment[]
}

export interface OrderDetail extends SalesOrder {
  salesType: SalesType
  assignedDistributor?: {
    id: string
    name: string
  }
  // New fields for unified panel
  customerTaxId?: string
  customerAddress?: string
  linkedDocuments?: LinkedDocuments
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
  onWorkflowComplete?: () => void
  onDownloadPDF?: (invoiceId: string) => void
  onDownloadDeliveryNotePDF?: (deliveryNoteId: string) => void
  onRegisterPayment?: (invoiceId: string) => void
}
