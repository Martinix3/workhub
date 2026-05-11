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
      <label className="flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
        <User size={16} />
        Cliente <span className="text-error">*</span>
      </label>

      {/* Selected customer display or search input */}
      {selectedCustomer ? (
        <div className="
          flex items-center justify-between p-3
          bg-success-light dark:bg-success-dark/20
          border-2 border-success-dark dark:border-success-dark
        ">
          <div>
            <p className="font-medium text-neutral-900 dark:text-neutral-100">
              {selectedCustomer.name}
            </p>
            <p className="text-xs text-neutral-500">
              {selectedCustomer.zone} · {selectedCustomer.contactPhone || 'Sin teléfono'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Check size={18} className="text-success-dark" />
            <button
              type="button"
              onClick={() => onSelect(null as any)}
              className="text-xs text-neutral-500 hover:text-neutral-700 underline"
            >
              Cambiar
            </button>
          </div>
        </div>
      ) : (
        <div className="relative" onClick={e => e.stopPropagation()}>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
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
                bg-white dark:bg-neutral-800
                border border-neutral-200 dark:border-neutral-100
                text-sm text-neutral-900 dark:text-neutral-100
                placeholder:text-neutral-400
                focus:outline-none focus:ring-2 focus:ring-gold dark:focus:ring-gold
              "
            />
          </div>

          {/* Dropdown */}
          {showDropdown && (
            <div className="
              absolute top-full left-0 right-0 z-10 mt-1
              bg-white dark:bg-neutral-800
              border border-neutral-200 dark:border-neutral-100
              shadow-sm
              max-h-60 overflow-y-auto
            ">
              {loading ? (
                <div className="p-4 text-sm text-neutral-500">Buscando...</div>
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
                      hover:bg-neutral-100 dark:hover:bg-neutral-700
                      border-b border-neutral-200 dark:border-neutral-700 last:border-0
                      transition-colors
                    "
                  >
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                      {customer.name}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {customer.zone} · {customer.type === 'distributor' ? 'Distribuidor' : 'Directo'}
                    </p>
                  </button>
                ))
              ) : searchTerm ? (
                <div className="p-4 text-sm text-neutral-500">
                  No se encontraron clientes
                </div>
              ) : (
                <div className="p-4 text-sm text-neutral-500">
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
