import type { CustomerListProps, Customer } from './types'
import { Plus, Search, Eye, Edit, Trash2, Building2, Truck } from 'lucide-react'

const statusColors: Record<string, string> = {
  active: 'bg-success-light text-success-text dark:bg-success-dark dark:text-success',
  inactive: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-400',
  prospect: 'bg-gold-light text-gold-dark dark:bg-gold-dark dark:text-gold',
}

const typeIcons: Record<string, React.ReactNode> = {
  direct: <Building2 size={14} />,
  distributor: <Truck size={14} />,
}

interface CustomerRowProps {
  customer: Customer
  onView?: () => void
  onEdit?: () => void
  onDelete?: () => void
}

function CustomerRow({ customer, onView, onEdit, onDelete }: CustomerRowProps) {
  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`
    return `$${value}`
  }

  return (
    <tr className="group hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className={`
            w-8 h-8 flex items-center justify-center
            ${customer.type === 'distributor' ? 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300' : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-400'}
          `}>
            {typeIcons[customer.type]}
          </div>
          <div>
            <p className="font-medium text-neutral-900 dark:text-neutral-100">
              {customer.name}
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {customer.contactName}
            </p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
          {customer.type === 'distributor' ? 'Distribuidor' : 'Directo'}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className="text-sm text-neutral-600 dark:text-neutral-400">
          {customer.zone}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className={`
          inline-block px-2 py-0.5 text-xs uppercase tracking-wider font-medium
          ${statusColors[customer.status]}
        `}>
          {customer.status}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <span className="font-mono text-sm text-neutral-700 dark:text-neutral-300">
          {customer.totalOrders}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <span className="font-mono text-sm text-neutral-700 dark:text-neutral-300">
          {formatCurrency(customer.totalRevenue)}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onView}
            className="p-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
            title="Ver"
          >
            <Eye size={16} className="text-neutral-500 dark:text-neutral-400" />
          </button>
          <button
            onClick={onEdit}
            className="p-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
            title="Editar"
          >
            <Edit size={16} className="text-neutral-500 dark:text-neutral-400" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 hover:bg-error-light dark:hover:bg-error-dark/30 transition-colors"
            title="Eliminar"
          >
            <Trash2 size={16} className="text-neutral-500 dark:text-neutral-400 hover:text-error-dark dark:hover:text-error" />
          </button>
        </div>
      </td>
    </tr>
  )
}

export function CustomerList({
  customers,
  onViewCustomer,
  onCreateCustomer,
  onEditCustomer,
  onDeleteCustomer,
  onFilterChange
}: CustomerListProps) {
  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="font-heading text-2xl lg:text-3xl font-bold text-neutral-900 dark:text-neutral-100">
            Clientes
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            {customers.length} clientes registrados
          </p>
        </div>

        <button
          onClick={onCreateCustomer}
          className="
            inline-flex items-center gap-2 px-4 py-2
            bg-gold hover:bg-gold-dark
            text-neutral-900 font-medium text-sm uppercase tracking-wider
            border border-neutral-200
            shadow-sm
            hover:shadow-sm
            transition-all duration-75
          "
        >
          <Plus size={18} />
          Nuevo Cliente
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Buscar cliente..."
            className="
              w-full pl-9 pr-4 py-2
              bg-white dark:bg-neutral-800
              border border-neutral-200 dark:border-neutral-100
              text-sm text-neutral-900 dark:text-neutral-100
              placeholder:text-neutral-400
              focus:outline-none focus:ring-2 focus:ring-gold dark:focus:ring-gold
            "
            onChange={(e) => onFilterChange?.({ search: e.target.value })}
          />
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-2">
          <button className="
            px-3 py-1.5 text-xs uppercase tracking-wider
            border border-neutral-300 dark:border-neutral-600
            text-neutral-600 dark:text-neutral-400
            hover:bg-neutral-100 dark:hover:bg-neutral-800
            transition-colors
          ">
            Todos
          </button>
          <button className="
            px-3 py-1.5 text-xs uppercase tracking-wider
            border border-neutral-300 dark:border-neutral-600
            text-neutral-600 dark:text-neutral-400
            hover:bg-neutral-100 dark:hover:bg-neutral-800
            transition-colors
          ">
            Directos
          </button>
          <button className="
            px-3 py-1.5 text-xs uppercase tracking-wider
            border border-neutral-300 dark:border-neutral-600
            text-neutral-600 dark:text-neutral-400
            hover:bg-neutral-100 dark:hover:bg-neutral-800
            transition-colors
          ">
            Distribuidores
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-100">
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold text-neutral-600 dark:text-neutral-400">
                  Cliente
                </th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold text-neutral-600 dark:text-neutral-400">
                  Tipo
                </th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold text-neutral-600 dark:text-neutral-400">
                  Zona
                </th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold text-neutral-600 dark:text-neutral-400">
                  Estado
                </th>
                <th className="px-4 py-3 text-right text-xs uppercase tracking-wider font-semibold text-neutral-600 dark:text-neutral-400">
                  Pedidos
                </th>
                <th className="px-4 py-3 text-right text-xs uppercase tracking-wider font-semibold text-neutral-600 dark:text-neutral-400">
                  Ingresos
                </th>
                <th className="px-4 py-3 w-24"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
              {customers.map((customer) => (
                <CustomerRow
                  key={customer.id}
                  customer={customer}
                  onView={() => onViewCustomer?.(customer.id)}
                  onEdit={() => onEditCustomer?.(customer.id)}
                  onDelete={() => onDeleteCustomer?.(customer.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
