import { useState, useEffect, useCallback } from 'react'
import { Search, Plus, Trash2, Package } from 'lucide-react'
import { useProducts } from '../../../../api'
import type { ProductSelectorProps } from './types'

export function ProductSelector({ items, onItemsChange }: ProductSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const { data: products, loading } = useProducts(searchTerm || undefined)

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value)

  const handleAddProduct = useCallback((product: { item_code: string; item_name: string; standard_rate: number }) => {
    // Check if product already exists
    const existing = items.find(i => i.item_code === product.item_code)
    if (existing) {
      // Increment quantity
      onItemsChange(items.map(i =>
        i.item_code === product.item_code
          ? { ...i, qty: i.qty + 1, amount: (i.qty + 1) * i.rate }
          : i
      ))
    } else {
      // Add new item
      onItemsChange([...items, {
        item_code: product.item_code,
        item_name: product.item_name,
        qty: 1,
        rate: product.standard_rate,
        amount: product.standard_rate
      }])
    }
    setSearchTerm('')
    setShowDropdown(false)
  }, [items, onItemsChange])

  const handleRemoveItem = useCallback((itemCode: string) => {
    onItemsChange(items.filter(i => i.item_code !== itemCode))
  }, [items, onItemsChange])

  const handleQtyChange = useCallback((itemCode: string, qty: number) => {
    if (qty < 1) return
    onItemsChange(items.map(i =>
      i.item_code === itemCode
        ? { ...i, qty, amount: qty * i.rate }
        : i
    ))
  }, [items, onItemsChange])

  const handleRateChange = useCallback((itemCode: string, rate: number) => {
    if (rate < 0) return
    onItemsChange(items.map(i =>
      i.item_code === itemCode
        ? { ...i, rate, amount: i.qty * rate }
        : i
    ))
  }, [items, onItemsChange])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setShowDropdown(false)
    if (showDropdown) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [showDropdown])

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
        <Package size={16} />
        <span className="text-xs uppercase tracking-wider font-semibold">Productos</span>
      </div>

      {/* Product search */}
      <div className="relative" onClick={e => e.stopPropagation()}>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Buscar producto..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setShowDropdown(true)
            }}
            onFocus={() => setShowDropdown(true)}
            className="
              w-full pl-9 pr-4 py-2
              bg-white dark:bg-neutral-800
              border border-neutral-200 dark:border-neutral-100
              text-sm text-neutral-900 dark:text-neutral-100
              placeholder:text-neutral-400
              focus:outline-none focus:ring-2 focus:ring-gold dark:focus:ring-gold
            "
          />
        </div>

        {/* Dropdown */}
        {showDropdown && products && products.length > 0 && (
          <div className="
            absolute top-full left-0 right-0 z-10 mt-1
            bg-white dark:bg-neutral-800
            border border-neutral-200 dark:border-neutral-100
            shadow-sm
            max-h-60 overflow-y-auto
          ">
            {loading ? (
              <div className="p-4 text-sm text-neutral-500">Buscando...</div>
            ) : (
              products.map(product => (
                <button
                  key={product.item_code}
                  type="button"
                  onClick={() => handleAddProduct(product)}
                  className="
                    w-full px-4 py-3 text-left
                    hover:bg-neutral-100 dark:hover:bg-neutral-700
                    border-b border-neutral-200 dark:border-neutral-700 last:border-0
                    transition-colors
                  "
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                        {product.item_name}
                      </p>
                      <p className="text-xs text-neutral-500">
                        Stock: {product.available_stock} {product.stock_uom}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm font-medium text-neutral-900 dark:text-neutral-100">
                        {formatCurrency(product.standard_rate)}
                      </p>
                      <Plus size={14} className="text-gold-dark ml-auto" />
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Selected items */}
      {items.length === 0 ? (
        <div className="
          p-6 text-center
          border-2 border-dashed border-neutral-300 dark:border-neutral-600
        ">
          <p className="text-sm text-neutral-500">
            Busca y selecciona productos para agregar al pedido
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(item => (
            <div
              key={item.item_code}
              className="
                flex items-center gap-3 p-3
                bg-neutral-50 dark:bg-neutral-800
                border border-neutral-200 dark:border-neutral-700
              "
            >
              {/* Product name */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                  {item.item_name}
                </p>
              </div>

              {/* Quantity input */}
              <div className="flex items-center gap-1">
                <span className="text-xs text-neutral-500">x</span>
                <input
                  type="number"
                  min="1"
                  value={item.qty}
                  onChange={(e) => handleQtyChange(item.item_code, parseInt(e.target.value) || 1)}
                  className="
                    w-16 px-2 py-1 text-center
                    bg-white dark:bg-neutral-900
                    border border-neutral-300 dark:border-neutral-600
                    text-sm font-mono
                    focus:outline-none focus:ring-2 focus:ring-gold dark:focus:ring-gold
                  "
                />
              </div>

              {/* Price input */}
              <div className="flex items-center gap-1">
                <span className="text-xs text-neutral-500">@</span>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={item.rate}
                  onChange={(e) => handleRateChange(item.item_code, parseFloat(e.target.value) || 0)}
                  className="
                    w-24 px-2 py-1 text-right
                    bg-white dark:bg-neutral-900
                    border border-neutral-300 dark:border-neutral-600
                    text-sm font-mono
                    focus:outline-none focus:ring-2 focus:ring-gold dark:focus:ring-gold
                  "
                />
              </div>

              {/* Amount */}
              <div className="w-28 text-right">
                <span className="font-mono text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  = {formatCurrency(item.amount)}
                </span>
              </div>

              {/* Remove button */}
              <button
                type="button"
                onClick={() => handleRemoveItem(item.item_code)}
                className="p-1.5 hover:bg-error-light dark:hover:bg-error-dark/30 transition-colors"
              >
                <Trash2 size={16} className="text-neutral-400 hover:text-error-dark" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
