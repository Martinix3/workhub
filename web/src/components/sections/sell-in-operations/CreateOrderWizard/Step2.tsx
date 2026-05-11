import { ArrowLeft, Check, Loader2 } from 'lucide-react'
import type { Step2Props } from './types'

const TAX_RATE = 0.16 // 16% IVA

export function Step2({ formData, onBack, onCancel, onSubmit, isSubmitting }: Step2Props) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value)

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'No especificada'
    return new Date(dateStr).toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  const subtotal = formData.items.reduce((sum, item) => sum + item.amount, 0)
  const tax = subtotal * TAX_RATE
  const total = subtotal + tax

  return (
    <div className="p-6">
      {/* Summary card */}
      <div className="
        border border-neutral-200 dark:border-neutral-100
        bg-neutral-50 dark:bg-neutral-800/50
      ">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-100">
          <h3 className="font-heading text-lg font-bold text-neutral-900 dark:text-neutral-100">
            Resumen del Pedido
          </h3>
        </div>

        {/* Customer and dates */}
        <div className="px-6 py-4 space-y-3 border-b border-neutral-300 dark:border-neutral-600">
          <div className="flex justify-between">
            <span className="text-sm text-neutral-500">Cliente:</span>
            <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
              {formData.customer?.name || '-'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-neutral-500">Tipo:</span>
            <span className={`
              text-xs font-semibold uppercase px-2 py-0.5
              border border-neutral-200 dark:border-neutral-100
              ${formData.salesType === 'sell_in'
                ? 'bg-gold-light text-gold-dark'
                : 'bg-turquoise-light text-turquoise-dark'}
            `}>
              {formData.salesType === 'sell_in' ? 'SELL IN' : 'SELL OUT'}
              <span className="ml-1 font-normal text-neutral-600 dark:text-neutral-400">
                ({formData.salesType === 'sell_in' ? 'Vta. Directa' : 'Vía Distrib.'})
              </span>
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-neutral-500">Fecha Pedido:</span>
            <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
              {formatDate(new Date().toISOString())}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-neutral-500">Fecha Entrega:</span>
            <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
              {formatDate(formData.deliveryDate)}
            </span>
          </div>
        </div>

        {/* Items */}
        <div className="px-6 py-4 space-y-3 border-b border-neutral-300 dark:border-neutral-600">
          {formData.items.map(item => (
            <div key={item.item_code} className="flex justify-between items-center">
              <div className="flex-1">
                <span className="text-sm text-neutral-900 dark:text-neutral-100">
                  {item.item_name}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs text-neutral-500">
                  {item.qty} x {formatCurrency(item.rate)}
                </span>
                <span className="ml-4 font-mono text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  {formatCurrency(item.amount)}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="px-6 py-4 space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-neutral-500">Subtotal</span>
            <span className="font-mono text-sm text-neutral-900 dark:text-neutral-100">
              {formatCurrency(subtotal)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-neutral-500">IVA (16%)</span>
            <span className="font-mono text-sm text-neutral-900 dark:text-neutral-100">
              {formatCurrency(tax)}
            </span>
          </div>
          <div className="pt-3 border-t border-neutral-200 dark:border-neutral-100 flex justify-between">
            <span className="font-semibold text-neutral-900 dark:text-neutral-100">TOTAL</span>
            <span className="font-mono text-xl font-bold text-neutral-900 dark:text-neutral-100">
              {formatCurrency(total)}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between mt-6 pt-4 border-t-2 border-neutral-200 dark:border-neutral-700">
        <button
          type="button"
          onClick={onBack}
          disabled={isSubmitting}
          className="
            inline-flex items-center gap-2 px-4 py-2
            text-neutral-600 dark:text-neutral-400
            hover:bg-neutral-100 dark:hover:bg-neutral-800
            transition-colors
            disabled:opacity-50
          "
        >
          <ArrowLeft size={16} />
          Volver
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="
              px-4 py-2 text-sm
              text-neutral-600 dark:text-neutral-400
              hover:bg-neutral-100 dark:hover:bg-neutral-800
              transition-colors
              disabled:opacity-50
            "
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitting}
            className={`
              inline-flex items-center gap-2 px-6 py-2
              bg-success hover:bg-success-dark
              text-white font-medium text-sm uppercase tracking-wider
              border border-neutral-200
              shadow-sm
              hover:shadow-sm
              transition-all duration-75
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Creando...
              </>
            ) : (
              <>
                <Check size={16} />
                Crear Pedido
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
