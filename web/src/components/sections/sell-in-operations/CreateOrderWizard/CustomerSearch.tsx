import { useState, useEffect } from 'react'
import { Search, User, Check } from 'lucide-react'
import { useCustomers } from '../../../../api'
import type { CustomerSearchProps } from './types'

export function CustomerSearch({ selectedCustomer, onSelect }: CustomerSearchProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const { data: customers, loading } = useCustomers({ search: searchTerm || undefined })

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setShowDropdown(false)
    if (showDropdown) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [showDropdown])

  return (
    <div className="space-y-2">
      {/* Label */}
      <label className="flex items-center gap-2 text-sm font-medium text-stone-700 dark:text-stone-300">
        <User size={16} />
        Cliente <span className="text-red-500">*</span>
      </label>

      {/* Selected customer display or search input */}
      {selectedCustomer ? (
        <div className="
          flex items-center justify-between p-3
          bg-green-50 dark:bg-green-900/20
          border-2 border-green-600 dark:border-green-500
        ">
          <div>
            <p className="font-medium text-stone-900 dark:text-stone-100">
              {selectedCustomer.name}
            </p>
            <p className="text-xs text-stone-500">
              {selectedCustomer.zone} · {selectedCustomer.contactPhone || 'Sin teléfono'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Check size={18} className="text-green-600" />
            <button
              type="button"
              onClick={() => onSelect(null as any)}
              className="text-xs text-stone-500 hover:text-stone-700 underline"
            >
              Cambiar
            </button>
          </div>
        </div>
      ) : (
        <div className="relative" onClick={e => e.stopPropagation()}>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Buscar cliente por nombre..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setShowDropdown(true)
              }}
              onFocus={() => setShowDropdown(true)}
              className="
                w-full pl-9 pr-4 py-3
                bg-white dark:bg-stone-800
                border-2 border-stone-900 dark:border-stone-100
                text-sm text-stone-900 dark:text-stone-100
                placeholder:text-stone-400
                focus:outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-amber-300
              "
            />
          </div>

          {/* Dropdown */}
          {showDropdown && (
            <div className="
              absolute top-full left-0 right-0 z-10 mt-1
              bg-white dark:bg-stone-800
              border-2 border-stone-900 dark:border-stone-100
              shadow-[4px_4px_0_#1c1917] dark:shadow-[4px_4px_0_#f5f5f4]
              max-h-60 overflow-y-auto
            ">
              {loading ? (
                <div className="p-4 text-sm text-stone-500">Buscando...</div>
              ) : customers && customers.length > 0 ? (
                customers.map(customer => (
                  <button
                    key={customer.id}
                    type="button"
                    onClick={() => {
                      onSelect(customer)
                      setSearchTerm('')
                      setShowDropdown(false)
                    }}
                    className="
                      w-full px-4 py-3 text-left
                      hover:bg-stone-100 dark:hover:bg-stone-700
                      border-b border-stone-200 dark:border-stone-700 last:border-0
                      transition-colors
                    "
                  >
                    <p className="text-sm font-medium text-stone-900 dark:text-stone-100">
                      {customer.name}
                    </p>
                    <p className="text-xs text-stone-500">
                      {customer.zone} · {customer.type === 'distributor' ? 'Distribuidor' : 'Directo'}
                    </p>
                  </button>
                ))
              ) : searchTerm ? (
                <div className="p-4 text-sm text-stone-500">
                  No se encontraron clientes
                </div>
              ) : (
                <div className="p-4 text-sm text-stone-500">
                  Escribe para buscar clientes
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
