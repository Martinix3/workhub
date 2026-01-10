import { Calendar, ArrowRight, Save, AlertCircle, Truck, Building2 } from 'lucide-react'
import { CustomerSearch } from './CustomerSearch'
import { ProductSelector } from './ProductSelector'
import type { Step1Props } from './types'

export function Step1({ formData, onFormDataChange, onNext, onCancel, isSaved }: Step1Props) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value)

  const subtotal = formData.items.reduce((sum, item) => sum + item.amount, 0)

  // Validation: Sell Out requires assigned distributor
  const needsDistributor = formData.salesType === 'sell_out' && !formData.assignedDistributor
  const canProceed = formData.customer && formData.items.length > 0 && !needsDistributor

  return (
    <div className="p-6 space-y-6">
      {/* Customer search */}
      <CustomerSearch
        selectedCustomer={formData.customer}
        onSelect={(customer) => onFormDataChange({ ...formData, customer })}
      />

      {/* Sales Type Toggle - Auto-inferred from customer */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-stone-700 dark:text-stone-300">
            Tipo de Venta
          </label>
          <span className="text-xs text-stone-500">(auto-detectado)</span>
        </div>
        <div className="flex border-2 border-stone-900 dark:border-stone-100">
          <button
            type="button"
            onClick={() => onFormDataChange({ ...formData, salesType: 'sell_in' })}
            className={`
              flex-1 py-2 px-4 text-sm font-medium transition-colors
              ${formData.salesType === 'sell_in'
                ? 'bg-amber-400 text-stone-900'
                : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-700'
              }
            `}
          >
            <span className="block font-semibold">SELL IN</span>
            <span className="block text-xs font-normal opacity-75">Vta. Directa</span>
          </button>
          <button
            type="button"
            onClick={() => onFormDataChange({ ...formData, salesType: 'sell_out' })}
            className={`
              flex-1 py-2 px-4 text-sm font-medium border-l-2 border-stone-900 dark:border-stone-100 transition-colors
              ${formData.salesType === 'sell_out'
                ? 'bg-amber-400 text-stone-900'
                : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-700'
              }
            `}
          >
            <span className="block font-semibold">SELL OUT</span>
            <span className="block text-xs font-normal opacity-75">Vía Distrib.</span>
          </button>
        </div>

        {/* Distributor Info - Only shown when Sell Out is selected */}
        {formData.salesType === 'sell_out' && (
          <div className={`
            mt-3 p-3 border-2
            ${formData.assignedDistributor
              ? 'border-blue-300 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-700'
              : formData.customer
                ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-600'
                : 'border-stone-300 bg-stone-50 dark:bg-stone-800 dark:border-stone-600'
            }
          `}>
            {formData.assignedDistributor ? (
              <div className="flex items-center gap-3">
                <Truck size={20} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-stone-900 dark:text-stone-100">
                    Entrega: <span className="text-blue-700 dark:text-blue-300">{formData.assignedDistributor.name}</span>
                  </p>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    El distribuidor recibirá el pedido y entregará al cliente final
                  </p>
                </div>
              </div>
            ) : formData.customer ? (
              <div className="flex items-center gap-3">
                <AlertCircle size={20} className="text-amber-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    Este cliente no tiene distribuidor asignado
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    Asigna un distribuidor al cliente antes de crear pedidos Sell Out
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Building2 size={20} className="text-stone-400 flex-shrink-0" />
                <p className="text-sm text-stone-500 dark:text-stone-400">
                  Selecciona un cliente para ver el distribuidor asignado
                </p>
              </div>
            )}
          </div>
        )}

        {/* Sell In Info */}
        {formData.salesType === 'sell_in' && formData.customer && (
          <div className="mt-3 p-3 border-2 border-stone-300 bg-stone-50 dark:bg-stone-800 dark:border-stone-600">
            <div className="flex items-center gap-3">
              <Building2 size={20} className="text-stone-500 flex-shrink-0" />
              <p className="text-sm text-stone-600 dark:text-stone-400">
                Santa Brisa entregará directamente al cliente
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Delivery date */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm font-medium text-stone-700 dark:text-stone-300">
          <Calendar size={16} />
          Fecha de Entrega <span className="text-stone-400">(opcional)</span>
        </label>
        <input
          type="date"
          value={formData.deliveryDate || ''}
          onChange={(e) => onFormDataChange({ ...formData, deliveryDate: e.target.value || null })}
          min={new Date().toISOString().split('T')[0]}
          className="
            w-full px-4 py-3
            bg-white dark:bg-stone-800
            border-2 border-stone-900 dark:border-stone-100
            text-sm text-stone-900 dark:text-stone-100
            focus:outline-none focus:ring-0
          "
        />
      </div>

      {/* Divider */}
      <div className="border-t-2 border-stone-200 dark:border-stone-700" />

      {/* Products */}
      <ProductSelector
        items={formData.items}
        onItemsChange={(items) => onFormDataChange({ ...formData, items })}
      />

      {/* Footer */}
      <div className="
        flex flex-col sm:flex-row items-center justify-between gap-4
        pt-4 border-t-2 border-stone-200 dark:border-stone-700
      ">
        {/* Subtotal and save indicator */}
        <div className="flex items-center gap-4">
          <div>
            <span className="text-sm text-stone-500">Subtotal:</span>
            <span className="ml-2 font-mono text-lg font-bold text-stone-900 dark:text-stone-100">
              {formatCurrency(subtotal)}
            </span>
          </div>
          {isSaved && (
            <div className="flex items-center gap-1 text-green-600">
              <Save size={14} />
              <span className="text-xs">Guardado</span>
            </div>
          )}
        </div>

        {/* Validation message */}
        {!canProceed && (
          <div className="flex items-center gap-2 text-amber-600">
            <AlertCircle size={14} />
            <span className="text-xs">
              {!formData.customer
                ? 'Selecciona un cliente'
                : needsDistributor
                  ? 'Este cliente necesita un distribuidor asignado para Sell Out'
                  : 'Agrega al menos un producto'
              }
            </span>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="
              px-4 py-2 text-sm
              text-stone-600 dark:text-stone-400
              hover:bg-stone-100 dark:hover:bg-stone-800
              transition-colors
            "
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={!canProceed}
            className={`
              inline-flex items-center gap-2 px-4 py-2
              text-stone-900 font-medium text-sm uppercase tracking-wider
              border-2 border-stone-900
              transition-all duration-75
              ${canProceed
                ? 'bg-amber-400 hover:bg-amber-500 shadow-[4px_4px_0_#1c1917] hover:shadow-[2px_2px_0_#1c1917] hover:translate-x-[2px] hover:translate-y-[2px]'
                : 'bg-stone-200 cursor-not-allowed opacity-50'
              }
            `}
          >
            Siguiente
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
