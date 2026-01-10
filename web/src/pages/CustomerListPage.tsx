// Customer List Page with data fetching
import { useState } from 'react'
import { CustomerList } from '../components/sections/sell-in-operations/CustomerList'
import { LoadingState } from '../components/ui/LoadingState'
import { ErrorState } from '../components/ui/ErrorState'
import { useCustomers } from '../api'
import type { CustomerFilters } from '../components/sections/sell-in-operations/types'

export function CustomerListPage() {
  const [filters, setFilters] = useState<CustomerFilters>({})
  const { data: customers, loading, error, refetch } = useCustomers(filters)

  if (loading) {
    return <LoadingState message="Cargando clientes..." />
  }

  if (error || !customers) {
    return (
      <ErrorState
        title="Error al cargar clientes"
        message="No se pudo cargar la lista de clientes."
        error={error}
        onRetry={refetch}
      />
    )
  }

  return (
    <CustomerList
      customers={customers}
      onViewCustomer={(id) => console.log('View customer:', id)}
      onCreateCustomer={() => console.log('Create customer')}
      onEditCustomer={(id) => console.log('Edit customer:', id)}
      onDeleteCustomer={(id) => console.log('Delete customer:', id)}
      onFilterChange={(newFilters) => setFilters(prev => ({ ...prev, ...newFilters }))}
    />
  )
}

export default CustomerListPage
