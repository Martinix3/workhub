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
        border-2 border-stone-900 dark:border-stone-100
        bg-stone-50 dark:bg-stone-800/50
      ">
        {/* Header */}
        <div className="px-6 py-4 border-b-2 border-stone-900 dark:border-stone-100">
          <h3 className="font-serif text-lg font-bold text-stone-900 dark:text-stone-100">
            Resumen del Pedido
          </h3>
        </div>

        {/* Customer and dates */}
        <div className="px-6 py-4 space-y-3 border-b border-stone-300 dark:border-stone-600">
          <div className="flex justify-between">
            <span className="text-sm text-stone-500">Cliente:</span>
            <span className="text-sm font-medium text-stone-900 dark:text-stone-100">
              {formData.customer?.name || '-'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-stone-500">Tipo:</span>
            <span className={`
              text-xs font-semibold uppercase px-2 py-0.5
              border border-stone-900 dark:border-stone-100
              ${formData.salesType === 'sell_in'
                ? 'bg-amber-100 text-amber-800'
                : 'bg-blue-100 text-blue-800'}
            `}>
              {formData.salesType === 'sell_in' ? 'SELL IN' : 'SELL OUT'}
              <span className="ml-1 font-normal text-stone-600 dark:text-stone-400">
                ({formData.salesType === 'sell_in' ? 'Vta. Directa' : 'Vía Distrib.'})
              </span>
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-stone-500">Fecha Pedido:</span>
            <span className="text-sm font-medium text-stone-900 dark:text-stone-100">
              {formatDate(new Date().toISOString())}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-stone-500">Fecha Entrega:</span>
            <span className="text-sm font-medium text-stone-900 dark:text-stone-100">
              {formatDate(formData.deliveryDate)}
            </span>
          </div>
        </div>

        {/* Items */}
        <div className="px-6 py-4 space-y-3 border-b border-stone-300 dark:border-stone-600">
          {formData.items.map(item => (
            <div key={item.item_code} className="flex justify-between items-center">
              <div className="flex-1">
                <span className="text-sm text-stone-900 dark:text-stone-100">
                  {item.item_name}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs text-stone-500">
                  {item.qty} x {formatCurrency(item.rate)}
                </span>
                <span className="ml-4 font-mono text-sm font-medium text-stone-900 dark:text-stone-100">
                  {formatCurrency(item.amount)}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="px-6 py-4 space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-stone-500">Subtotal</span>
            <span className="font-mono text-sm text-stone-900 dark:text-stone-100">
              {formatCurrency(subtotal)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-stone-500">IVA (16%)</span>
            <span className="font-mono text-sm text-stone-900 dark:text-stone-100">
              {formatCurrency(tax)}
            </span>
          </div>
          <div className="pt-3 border-t-2 border-stone-900 dark:border-stone-100 flex justify-between">
            <span className="font-semibold text-stone-900 dark:text-stone-100">TOTAL</span>
            <span className="font-mono text-xl font-bold text-stone-900 dark:text-stone-100">
              {formatCurrency(total)}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between mt-6 pt-4 border-t-2 border-stone-200 dark:border-stone-700">
        <button
          type="button"
          onClick={onBack}
          disabled={isSubmitting}
          className="
            inline-flex items-center gap-2 px-4 py-2
            text-stone-600 dark:text-stone-400
            hover:bg-stone-100 dark:hover:bg-stone-800
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
              text-stone-600 dark:text-stone-400
              hover:bg-stone-100 dark:hover:bg-stone-800
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
              bg-green-500 hover:bg-green-600
              text-white font-medium text-sm uppercase tracking-wider
              border-2 border-stone-900
              shadow-[4px_4px_0_#1c1917]
              hover:shadow-[2px_2px_0_#1c1917]
              hover:translate-x-[2px] hover:translate-y-[2px]
              transition-all duration-75
              disabled:opacity-50 disabled:cursor-not-allowed
              disabled:hover:shadow-[4px_4px_0_#1c1917] disabled:hover:translate-x-0 disabled:hover:translate-y-0
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
