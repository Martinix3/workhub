import type { Customer } from '../types'
// Product type used in ProductSelector component
import type { Product as _Product } from '../../../../api'

export type SalesType = 'sell_in' | 'sell_out'

export interface OrderItemDraft {
  item_code: string
  item_name: string
  qty: number
  rate: number
  amount: number
}

export interface AssignedDistributor {
  id: string
  name: string
}

export interface OrderDraft {
  customer: Customer | null
  deliveryDate: string | null
  salesType: SalesType
  items: OrderItemDraft[]
  /** Assigned distributor for Sell Out orders (auto-populated from customer) */
  assignedDistributor: AssignedDistributor | null
}

export interface CreateOrderResponse {
  success: boolean
  order_id: string
  total: number
  order_type: 'sell_in' | 'sell_out'
  message: string
  /** Only present for sell_out orders */
  distributor?: string
  distributor_name?: string
}

export interface CreateOrderWizardProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (orderId: string) => void
}

export interface Step1Props {
  formData: OrderDraft
  onFormDataChange: (data: OrderDraft) => void
  onNext: () => void
  onCancel: () => void
  isSaved: boolean
}

export interface Step2Props {
  formData: OrderDraft
  onBack: () => void
  onCancel: () => void
  onSubmit: () => void
  isSubmitting: boolean
}

export interface ProductSelectorProps {
  items: OrderItemDraft[]
  onItemsChange: (items: OrderItemDraft[]) => void
}

export interface CustomerSearchProps {
  selectedCustomer: Customer | null
  onSelect: (customer: Customer) => void
}
