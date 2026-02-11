// Confirmation Form for Smart Notepad
// Editable form showing extracted entities and suggested actions

import { useState, useEffect, useCallback } from 'react'
import { Search, Plus, Check, Package } from 'lucide-react'
import { useCustomerSearch, useItemSearch } from '../../api/hooks/useNotepad'
import type {
  ParsedNote,
  ActivityType,
  Outcome,
  CustomerSuggestion,
  ItemOption,
  Product
} from './types'
import {
  ACTIVITY_LABELS,
  OUTCOME_LABELS
} from './types'

interface ConfirmationFormProps {
  parsedNote: ParsedNote
  onUpdate: (updates: Partial<ParsedNote>) => void
  onSubmit: () => void
  onBack: () => void
  submitting: boolean
}

export function ConfirmationForm({
  parsedNote,
  onUpdate,
  onSubmit,
  onBack,
  submitting
}: ConfirmationFormProps) {
  const { customers, loading: searchingCustomers, search: searchCustomers } = useCustomerSearch()
  const { items, loading: searchingItems, search: searchItems } = useItemSearch()
  const [customerSearch, setCustomerSearch] = useState(parsedNote.customer.name)
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [activeProductIndex, setActiveProductIndex] = useState<number | null>(null)
  const [productSearches, setProductSearches] = useState<Record<number, string>>({})

  // Debounced customer search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (customerSearch && customerSearch.length >= 2) {
        searchCustomers(customerSearch)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [customerSearch, searchCustomers])

  // Debounced item search for active product
  useEffect(() => {
    if (activeProductIndex === null) return
    const searchTerm = productSearches[activeProductIndex]
    if (!searchTerm || searchTerm.length < 2) return

    const timer = setTimeout(() => {
      searchItems(searchTerm)
    }, 300)
    return () => clearTimeout(timer)
  }, [activeProductIndex, productSearches, searchItems])

  const handleCustomerSelect = useCallback((customer: CustomerSuggestion) => {
    onUpdate({
      customer: {
        ...parsedNote.customer,
        name: customer.name,
        matched_id: customer.id,
        is_new: false,
        customer_group: customer.customer_group,
        is_distributor: customer.is_distributor
      }
    })
    setCustomerSearch(customer.name)
    setShowCustomerDropdown(false)
  }, [parsedNote.customer, onUpdate])

  const handleCreateNewCustomer = useCallback(() => {
    onUpdate({
      customer: {
        ...parsedNote.customer,
        name: customerSearch,
        matched_id: null,
        is_new: true,
        create_new: true
      }
    })
    setShowCustomerDropdown(false)
  }, [customerSearch, parsedNote.customer, onUpdate])

  const handleActivityChange = useCallback((activity_type: ActivityType) => {
    onUpdate({ activity_type })
  }, [onUpdate])

  const handleOutcomeChange = useCallback((outcome: Outcome) => {
    onUpdate({ outcome })
  }, [onUpdate])

  const handleNotesChange = useCallback((notes: string) => {
    onUpdate({ notes })
  }, [onUpdate])

  const handleActionToggle = useCallback((index: number) => {
    const newActions = [...parsedNote.suggested_actions]
    newActions[index] = {
      ...newActions[index],
      enabled: !newActions[index].enabled
    }
    onUpdate({ suggested_actions: newActions })
  }, [parsedNote.suggested_actions, onUpdate])

  const handleProductItemSelect = useCallback((productIndex: number, item: ItemOption) => {
    const newProducts = [...parsedNote.products]
    newProducts[productIndex] = {
      ...newProducts[productIndex],
      matched_item: item.id,
      description: item.name // Update description to show actual item name
    }
    onUpdate({ products: newProducts })
    setActiveProductIndex(null)
    setProductSearches(prev => ({ ...prev, [productIndex]: '' }))
  }, [parsedNote.products, onUpdate])

  const handleProductQtyChange = useCallback((productIndex: number, qty: number) => {
    const newProducts = [...parsedNote.products]
    newProducts[productIndex] = {
      ...newProducts[productIndex],
      qty
    }
    onUpdate({ products: newProducts })
  }, [parsedNote.products, onUpdate])

  const handleRemoveProduct = useCallback((productIndex: number) => {
    const newProducts = parsedNote.products.filter((_, i) => i !== productIndex)
    onUpdate({ products: newProducts })
  }, [parsedNote.products, onUpdate])

  const handleAddProduct = useCallback(() => {
    const newProducts = [...parsedNote.products, { description: '', qty: 1, matched_item: null }]
    onUpdate({ products: newProducts })
    setActiveProductIndex(newProducts.length - 1)
  }, [parsedNote.products, onUpdate])

  const enabledActionsCount = parsedNote.suggested_actions.filter(a => a.enabled).length

  return (
    <div className="space-y-5">
      {/* Customer Section */}
      <div>
        <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2">
          Cliente
        </label>
        <div className="relative">
          <div className="flex items-center border-2 border-neutral-300 focus-within:border-neutral-900">
            <Search size={16} className="ml-3 text-neutral-400" />
            <input
              type="text"
              value={customerSearch}
              onChange={(e) => {
                setCustomerSearch(e.target.value)
                setShowCustomerDropdown(true)
              }}
              onFocus={() => setShowCustomerDropdown(true)}
              placeholder="Buscar cliente..."
              className="flex-1 px-3 py-2 outline-none"
            />
            {parsedNote.customer.matched_id && (
              <Check size={16} className="mr-3 text-success-dark" />
            )}
          </div>

          {/* Customer Dropdown */}
          {showCustomerDropdown && (customers.length > 0 || customerSearch.length >= 2) && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-neutral-200 shadow-sm max-h-48 overflow-auto">
              {searchingCustomers ? (
                <div className="p-3 text-neutral-500 text-sm">Buscando...</div>
              ) : (
                <>
                  {customers.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => handleCustomerSelect(c)}
                      className="w-full px-3 py-2 text-left hover:bg-neutral-100 flex items-center justify-between"
                    >
                      <span className="font-medium">{c.name}</span>
                      {c.is_distributor && (
                        <span className="text-xs bg-turquoise-light text-turquoise-dark px-2 py-0.5">
                          Distribuidor
                        </span>
                      )}
                    </button>
                  ))}
                  {customerSearch.length >= 2 && (
                    <button
                      onClick={handleCreateNewCustomer}
                      className="w-full px-3 py-2 text-left hover:bg-gold-light flex items-center gap-2 text-gold-dark border-t border-neutral-200"
                    >
                      <Plus size={16} />
                      <span>Crear nuevo: "{customerSearch}"</span>
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {parsedNote.customer.is_new && parsedNote.customer.create_new && (
          <p className="mt-1 text-xs text-gold-dark">
            Se creara un nuevo cliente al guardar
          </p>
        )}
      </div>

      {/* Activity Type */}
      <div>
        <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2">
          Tipo de Actividad
        </label>
        <div className="flex flex-wrap gap-2">
          {(Object.entries(ACTIVITY_LABELS) as [ActivityType, string][]).map(([value, label]) => (
            <button
              key={value}
              onClick={() => handleActivityChange(value)}
              className={`px-3 py-1.5 text-sm border-2 transition-all ${
                parsedNote.activity_type === value
                  ? 'border-neutral-900 bg-neutral-900 text-white'
                  : 'border-neutral-300 hover:border-neutral-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Outcome */}
      <div>
        <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2">
          Resultado
        </label>
        <select
          value={parsedNote.outcome}
          onChange={(e) => handleOutcomeChange(e.target.value as Outcome)}
          className="w-full px-3 py-2 border-2 border-neutral-300 focus:border-neutral-900 outline-none"
        >
          {(Object.entries(OUTCOME_LABELS) as [Outcome, string][]).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {/* Products Section - Editable */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider">
            Productos del Pedido
          </label>
          <button
            type="button"
            onClick={handleAddProduct}
            className="flex items-center gap-1 text-xs text-gold-dark hover:text-gold-dark"
          >
            <Plus size={14} />
            Agregar
          </button>
        </div>

        {parsedNote.products.length === 0 ? (
          <p className="text-sm text-neutral-400 italic">No hay productos. Haz clic en "Agregar" para buscar.</p>
        ) : (
          <div className="space-y-2">
            {parsedNote.products.map((product, index) => (
              <div key={index} className="relative">
                <div className={`flex items-center gap-2 p-2 border-2 ${
                  product.matched_item
                    ? 'border-success bg-success-light'
                    : 'border-gold bg-gold-light'
                }`}>
                  {/* Item search/display */}
                  <div className="flex-1 relative">
                    {product.matched_item ? (
                      <div className="flex items-center gap-2">
                        <Check size={14} className="text-success-dark" />
                        <span className="font-medium">{product.description}</span>
                        <span className="text-xs text-neutral-500">({product.matched_item})</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-1">
                          <Package size={14} className="text-gold-dark" />
                          <input
                            type="text"
                            value={productSearches[index] ?? product.description}
                            onChange={(e) => {
                              setProductSearches(prev => ({ ...prev, [index]: e.target.value }))
                              setActiveProductIndex(index)
                            }}
                            onFocus={() => {
                              setActiveProductIndex(index)
                              if (!productSearches[index]) {
                                setProductSearches(prev => ({ ...prev, [index]: product.description }))
                              }
                            }}
                            placeholder="Buscar producto..."
                            className="flex-1 bg-transparent outline-none text-sm"
                          />
                        </div>
                        {/* Item dropdown */}
                        {activeProductIndex === index && (
                          <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-neutral-200 shadow-sm max-h-40 overflow-auto">
                            {searchingItems ? (
                              <div className="p-2 text-neutral-500 text-sm">Buscando...</div>
                            ) : items.length > 0 ? (
                              items.map((item) => (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={() => handleProductItemSelect(index, item)}
                                  className="w-full px-3 py-2 text-left hover:bg-neutral-100 text-sm flex items-center justify-between"
                                >
                                  <div>
                                    <span className="font-medium">{item.name}</span>
                                    <span className="text-xs text-neutral-500 ml-2">({item.id})</span>
                                  </div>
                                  {item.rate > 0 && (
                                    <span className="text-xs text-neutral-500">${item.rate}</span>
                                  )}
                                </button>
                              ))
                            ) : (
                              <div className="p-2 text-neutral-500 text-sm">
                                {productSearches[index]?.length >= 2
                                  ? 'No se encontraron productos'
                                  : 'Escribe para buscar...'}
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Quantity */}
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-neutral-500">Qty:</span>
                    <input
                      type="number"
                      min="1"
                      value={product.qty || 1}
                      onChange={(e) => handleProductQtyChange(index, parseInt(e.target.value) || 1)}
                      className="w-14 px-2 py-1 border border-neutral-300 text-center text-sm"
                    />
                  </div>

                  {/* Remove button */}
                  <button
                    type="button"
                    onClick={() => handleRemoveProduct(index)}
                    className="p-1 text-neutral-400 hover:text-error-dark"
                  >
                    <Plus size={14} className="rotate-45" />
                  </button>
                </div>

                {/* Warning for unmatched */}
                {!product.matched_item && (
                  <p className="text-xs text-gold-dark mt-1">
                    Busca y selecciona un producto del catalogo
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notes */}
      <div>
        <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2">
          Notas
        </label>
        <textarea
          value={parsedNote.notes}
          onChange={(e) => handleNotesChange(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 border-2 border-neutral-300 focus:border-neutral-900 outline-none resize-none"
          placeholder="Notas adicionales..."
        />
      </div>

      {/* Suggested Actions */}
      <div>
        <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2">
          Acciones a Ejecutar
        </label>
        <div className="space-y-2">
          {parsedNote.suggested_actions.map((action, index) => (
            <label
              key={index}
              className={`flex items-center gap-3 p-3 border-2 cursor-pointer transition-all ${
                action.enabled
                  ? 'border-neutral-900 bg-neutral-50'
                  : 'border-neutral-200 hover:border-neutral-300'
              }`}
            >
              <input
                type="checkbox"
                checked={action.enabled}
                onChange={() => handleActionToggle(index)}
                className="w-4 h-4 accent-neutral-900"
              />
              <span className={action.enabled ? 'font-medium' : 'text-neutral-500'}>
                {action.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={onBack}
          disabled={submitting}
          className="flex-1 py-2 text-neutral-600 hover:text-neutral-900 font-medium uppercase tracking-wider border-2 border-neutral-300 hover:border-neutral-400 transition-colors disabled:opacity-50"
        >
          Volver
        </button>
        <button
          onClick={onSubmit}
          disabled={submitting || enabledActionsCount === 0 || (!parsedNote.customer.matched_id && !parsedNote.customer.create_new)}
          className="flex-1 py-2 bg-gold hover:bg-gold-dark text-neutral-900 font-medium uppercase tracking-wider border border-neutral-200 shadow-sm transition-all disabled:opacity-50"
        >
          {submitting ? 'Guardando...' : `Guardar (${enabledActionsCount})`}
        </button>
      </div>
    </div>
  )
}

export default ConfirmationForm
