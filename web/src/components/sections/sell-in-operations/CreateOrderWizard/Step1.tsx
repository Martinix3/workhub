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
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Tipo de Venta
          </label>
          <span className="text-xs text-neutral-500">(auto-detectado)</span>
        </div>
        <div className="flex border border-neutral-200 dark:border-neutral-100">
          <button
            type="button"
            onClick={() => onFormDataChange({ ...formData, salesType: 'sell_in' })}
            className={`
              flex-1 py-2 px-4 text-sm font-medium transition-colors
              ${formData.salesType === 'sell_in'
                ? 'bg-gold text-neutral-900'
                : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700'
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
              flex-1 py-2 px-4 text-sm font-medium border-l border-neutral-200 dark:border-neutral-100 transition-colors
              ${formData.salesType === 'sell_out'
                ? 'bg-gold text-neutral-900'
                : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700'
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
              ? 'border-turquoise bg-turquoise-light dark:bg-turquoise-dark/20 dark:border-turquoise-dark'
              : formData.customer
                ? 'border-gold bg-gold-light dark:bg-gold-dark/20 dark:border-gold-dark'
                : 'border-neutral-300 bg-neutral-50 dark:bg-neutral-800 dark:border-neutral-600'
            }
          `}>
            {formData.assignedDistributor ? (
              <div className="flex items-center gap-3">
                <Truck size={20} className="text-turquoise-dark dark:text-turquoise flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                    Entrega: <span className="text-turquoise-dark dark:text-turquoise">{formData.assignedDistributor.name}</span>
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    El distribuidor recibirá el pedido y entregará al cliente final
                  </p>
                </div>
              </div>
            ) : formData.customer ? (
              <div className="flex items-center gap-3">
                <AlertCircle size={20} className="text-gold-dark flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gold-dark dark:text-gold">
                    Este cliente no tiene distribuidor asignado
                  </p>
                  <p className="text-xs text-gold-dark dark:text-gold">
                    Asigna un distribuidor al cliente antes de crear pedidos Sell Out
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Building2 size={20} className="text-neutral-400 flex-shrink-0" />
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Selecciona un cliente para ver el distribuidor asignado
                </p>
              </div>
            )}
          </div>
        )}

        {/* Sell In Info */}
        {formData.salesType === 'sell_in' && formData.customer && (
          <div className="mt-3 p-3 border-2 border-neutral-300 bg-neutral-50 dark:bg-neutral-800 dark:border-neutral-600">
            <div className="flex items-center gap-3">
              <Building2 size={20} className="text-neutral-500 flex-shrink-0" />
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Santa Brisa entregará directamente al cliente
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Delivery date */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
          <Calendar size={16} />
          Fecha de Entrega <span className="text-neutral-400">(opcional)</span>
        </label>
        <input
          type="date"
          value={formData.deliveryDate || ''}
          onChange={(e) => onFormDataChange({ ...formData, deliveryDate: e.target.value || null })}
          min={new Date().toISOString().split('T')[0]}
          className="
            w-full px-4 py-3
            bg-white dark:bg-neutral-800
            border border-neutral-200 dark:border-neutral-100
            text-sm text-neutral-900 dark:text-neutral-100
            focus:ring-2 focus:ring-gold dark:focus:ring-gold
          "
        />
      </div>

      {/* Divider */}
      <div className="border-t-2 border-neutral-200 dark:border-neutral-700" />

      {/* Products */}
      <ProductSelector
        items={formData.items}
        onItemsChange={(items) => onFormDataChange({ ...formData, items })}
      />

      {/* Footer */}
      <div className="
        flex flex-col sm:flex-row items-center justify-between gap-4
        pt-4 border-t-2 border-neutral-200 dark:border-neutral-700
      ">
        {/* Subtotal and save indicator */}
        <div className="flex items-center gap-4">
          <div>
            <span className="text-sm text-neutral-500">Subtotal:</span>
            <span className="ml-2 font-mono text-lg font-bold text-neutral-900 dark:text-neutral-100">
              {formatCurrency(subtotal)}
            </span>
          </div>
          {isSaved && (
            <div className="flex items-center gap-1 text-success-dark">
              <Save size={14} />
              <span className="text-xs">Guardado</span>
            </div>
          )}
        </div>

        {/* Validation message */}
        {!canProceed && (
          <div className="flex items-center gap-2 text-gold-dark">
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
              text-neutral-600 dark:text-neutral-400
              hover:bg-neutral-100 dark:hover:bg-neutral-800
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
              text-neutral-900 font-medium text-sm uppercase tracking-wider
              border border-neutral-200
              transition-all duration-75
              ${canProceed
                ? 'bg-gold hover:bg-gold-dark shadow-sm hover:shadow-sm'
                : 'bg-neutral-200 cursor-not-allowed opacity-50'
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
