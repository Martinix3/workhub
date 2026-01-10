import { useState, useEffect, useCallback } from 'react'
import { Modal } from '../../../ui/Modal'
import { Step1 } from './Step1'
import { Step2 } from './Step2'
import { useCreateOrder } from '../../../../api'
import type { CreateOrderWizardProps, OrderDraft } from './types'

const STORAGE_KEY = 'workhub_order_draft'

const initialFormData: OrderDraft = {
  customer: null,
  deliveryDate: null,
  salesType: 'sell_in',
  items: [],
  assignedDistributor: null
}

export function CreateOrderWizard({ isOpen, onClose, onSuccess }: CreateOrderWizardProps) {
  const [step, setStep] = useState<1 | 2>(1)
  const [formData, setFormData] = useState<OrderDraft>(initialFormData)
  const [isSaved, setIsSaved] = useState(false)
  const { createOrder, loading: isSubmitting, error } = useCreateOrder()

  // Load draft from localStorage on open
  useEffect(() => {
    if (isOpen) {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          setFormData(parsed)
        } catch {
          // Invalid JSON, ignore
        }
      }
    }
  }, [isOpen])

  // Auto-infer salesType when customer changes
  useEffect(() => {
    if (formData.customer) {
      // distributor → sell_in (direct sale to distributor)
      // direct → sell_out (via distributor network)
      const inferredType = formData.customer.type === 'distributor' ? 'sell_in' : 'sell_out'
      setFormData(prev => ({ ...prev, salesType: inferredType }))
    }
  }, [formData.customer?.id])

  // Auto-save to localStorage with debounce
  useEffect(() => {
    if (!isOpen) return

    setIsSaved(false)
    const timeout = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(formData))
      setIsSaved(true)
    }, 2000)

    return () => clearTimeout(timeout)
  }, [formData, isOpen])

  // Clear draft on close
  const handleClose = useCallback(() => {
    setStep(1)
    setFormData(initialFormData)
    localStorage.removeItem(STORAGE_KEY)
    onClose()
  }, [onClose])

  // Handle form submit
  const handleSubmit = useCallback(async () => {
    if (!formData.customer || formData.items.length === 0) return

    const result = await createOrder({
      customer: formData.customer.id,
      delivery_date: formData.deliveryDate || undefined,
      sales_type: formData.salesType,
      items: formData.items.map(item => ({
        item_code: item.item_code,
        qty: item.qty,
        rate: item.rate
      }))
    })

    if (result?.success) {
      localStorage.removeItem(STORAGE_KEY)
      setStep(1)
      setFormData(initialFormData)
      onSuccess(result.order_id)
    }
  }, [formData, createOrder, onSuccess])

  // Progress based on step
  const progress = step === 1 ? 50 : 100
  const title = step === 1 ? 'PASO 1/2: Datos del Pedido' : 'PASO 2/2: Confirmar Pedido'

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      size="lg"
      progress={progress}
    >
      {step === 1 ? (
        <Step1
          formData={formData}
          onFormDataChange={setFormData}
          onNext={() => setStep(2)}
          onCancel={handleClose}
          isSaved={isSaved}
        />
      ) : (
        <Step2
          formData={formData}
          onBack={() => setStep(1)}
          onCancel={handleClose}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />
      )}

      {/* Error display */}
      {error && (
        <div className="mx-6 mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300">
          Error: {error.message}
        </div>
      )}
    </Modal>
  )
}

export { CreateOrderWizard as default }
export type { CreateOrderWizardProps, OrderDraft, OrderItemDraft } from './types'
