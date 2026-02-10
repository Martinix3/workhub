/**
 * AccountsPage - Vista de Cuentas Momentum (Mobile-First)
 *
 * Vista responsiva con tabla en desktop y tarjetas en móvil.
 * Permite filtrar, ordenar, edición masiva y gestión de cuentas.
 *
 * Mejoras v2:
 * - Filtros más compactos con toggle Sell In/Out
 * - Modo edición masiva
 * - Alertas de tiempo sin interacción/pedido
 * - Modal nueva cuenta funcional
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Search,
  Plus,
  Filter,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Target,
  Users,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Edit3,
  X,
  Phone,
  Mail,
  LayoutGrid,
  LayoutList,
  CheckSquare,
  Square,
  Clock,
  ShoppingCart,
  MapPin,
} from 'lucide-react'
import { tw } from '../../styles/design-tokens'
import { momentumApi, type AccountStats, type AssignedUser } from '../../api/services/momentum'
import type { MomentumAccount, KanbanColumn, AccountLevel, AccountType, SalesChannel, SaleType } from '../../types/momentum'
import { KANBAN_COLUMNS } from '../../types/momentum'
import { MomentumDrawer, useMomentumSettings } from '../../components/sections/momentum/drawer'
import { NewAccountDrawer } from '../../components/sections/momentum/drawer/NewAccountDrawer'
import { googlePlacesApi } from '../../api/services/google-places'
import { useToast } from '../../hooks/useToast'

// ============================================================================
// TYPES
// ============================================================================

interface Filters {
  search: string
  column: KanbanColumn | ''
  account_type: AccountType | ''
  sale_type: SaleType | ''
  sales_channel: SalesChannel | ''
  assigned_to: string
  level: AccountLevel | ''
  city: string
  is_target: '' | '0' | '1'
  alert_type: 'all' | 'no_interaction' | 'no_order'
  num_establishments: '' | '1' | '2-5' | '6-10' | '10+'
}

interface SortConfig {
  field: string
  order: 'asc' | 'desc'
}

const SALES_CHANNELS: SalesChannel[] = ['Horeca', 'Retail', 'Online', 'Catering', 'Hotel', 'Distribuidor', 'Privada']

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function AccountsPage() {
  // Settings hook - replaces hardcoded ALERT_THRESHOLD_DAYS
  const { settings: momentumSettings } = useMomentumSettings()
  // Data state
  const [accounts, setAccounts] = useState<MomentumAccount[]>([])
  const [stats, setStats] = useState<AccountStats | null>(null)
  const [assignedUsers, setAssignedUsers] = useState<AssignedUser[]>([])
  const [_cities, setCities] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Pagination
  const [page, setPage] = useState(1)
  const [pageSize] = useState(50)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  // Filters
  const [filters, setFilters] = useState<Filters>({
    search: '',
    column: '',
    account_type: '',
    sale_type: '',
    sales_channel: '',
    assigned_to: '',
    level: '',
    city: '',
    is_target: '',
    alert_type: 'all',
    num_establishments: '',
  })
  const [showFilters, setShowFilters] = useState(false)

  // Sort
  const [sort, setSort] = useState<SortConfig>({ field: 'modified', order: 'desc' })

  // View mode (mobile can toggle)
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards')

  // Edit mode
  const [editMode, setEditMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [_bulkAction, setBulkAction] = useState<'column' | 'level' | 'assigned' | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Drawer
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  // New Account Drawer
  const [showNewAccountDrawer, setShowNewAccountDrawer] = useState(false)

  // Google Maps enrichment
  const [showEnrichPanel, setShowEnrichPanel] = useState(false)
  const [enriching, setEnriching] = useState(false)
  const [enrichOptions, setEnrichOptions] = useState({
    limit: 500,
    minScore: 0.65,
    delayMs: 150,
    onlyMissing: true,
    overwrite: false,
    searchLimit: 5,
  })

  const toast = useToast()

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (filters.column) count++
    if (filters.account_type) count++
    if (filters.sale_type) count++
    if (filters.sales_channel) count++
    if (filters.assigned_to) count++
    if (filters.level) count++
    if (filters.city) count++
    if (filters.is_target) count++
    if (filters.alert_type !== 'all') count++
    if (filters.num_establishments) count++
    return count
  }, [filters])

  // =========================================================================
  // DATA FETCHING
  // =========================================================================

  const fetchAccounts = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      const estFilters: { num_establishments_min?: number; num_establishments_max?: number } = {}
      if (filters.num_establishments === '1') {
        estFilters.num_establishments_min = 1
        estFilters.num_establishments_max = 1
      } else if (filters.num_establishments === '2-5') {
        estFilters.num_establishments_min = 2
        estFilters.num_establishments_max = 5
      } else if (filters.num_establishments === '6-10') {
        estFilters.num_establishments_min = 6
        estFilters.num_establishments_max = 10
      } else if (filters.num_establishments === '10+') {
        estFilters.num_establishments_min = 10
      }

      const response = await momentumApi.getAccountsList({
        search: filters.search || undefined,
        column: filters.column || undefined,
        account_type: filters.account_type || undefined,
        sale_type: filters.sale_type || undefined,
        sales_channel: filters.sales_channel || undefined,
        assigned_to: filters.assigned_to || undefined,
        level: filters.level || undefined,
        city: filters.city || undefined,
        is_target: filters.is_target ? parseInt(filters.is_target) : undefined,
        ...estFilters,
        sort_by: sort.field,
        sort_order: sort.order,
        page,
        page_size: pageSize
      })

      setAccounts(response.accounts)
      setTotal(response.total)
      setTotalPages(response.total_pages)
    } catch (error) {
      console.error('Error loading accounts:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [filters.search, filters.column, filters.account_type, filters.sale_type, filters.sales_channel, filters.assigned_to, filters.level, filters.city, filters.is_target, filters.num_establishments, sort, page, pageSize])

  const fetchStats = useCallback(async () => {
    try {
      const [statsData, usersData, citiesData] = await Promise.all([
        momentumApi.getAccountStats(),
        momentumApi.getAssignedUsers(),
        momentumApi.getCities()
      ])
      setStats(statsData)
      setAssignedUsers(usersData)
      setCities(citiesData)
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }, [])

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  // =========================================================================
  // FILTERED ACCOUNTS (client-side alert filtering)
  // =========================================================================

  const filteredAccounts = useMemo(() => {
    if (filters.alert_type === 'all') return accounts

    const now = new Date()

    return accounts.filter(acc => {
      if (filters.alert_type === 'no_interaction') {
        // Sin interacción: última modificación > threshold (from settings)
        const thresholdDays = momentumSettings.days_without_interaction_warning
        const thresholdMs = thresholdDays * 24 * 60 * 60 * 1000
        const lastMod = acc.modified ? new Date(acc.modified) : null
        if (!lastMod) return true
        return (now.getTime() - lastMod.getTime()) > thresholdMs
      }
      if (filters.alert_type === 'no_order') {
        // Sin pedido: usando last_movement_date (from settings)
        const thresholdDays = momentumSettings.days_without_order_warning
        const thresholdMs = thresholdDays * 24 * 60 * 60 * 1000
        const lastMove = acc.last_movement_date ? new Date(acc.last_movement_date) : null
        if (!lastMove) return true
        return (now.getTime() - lastMove.getTime()) > thresholdMs
      }
      return true
    })
  }, [accounts, filters.alert_type, momentumSettings.days_without_interaction_warning, momentumSettings.days_without_order_warning])

  // =========================================================================
  // HANDLERS
  // =========================================================================

  const handleSort = (field: string) => {
    setSort(prev => ({
      field,
      order: prev.field === field && prev.order === 'asc' ? 'desc' : 'asc'
    }))
    setPage(1)
  }

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPage(1)
  }

  const handleAccountClick = (account: MomentumAccount) => {
    if (editMode) {
      toggleSelection(account.name)
    } else {
      setSelectedAccountId(account.name)
      setIsDrawerOpen(true)
    }
  }

  const clearFilters = () => {
    setFilters({
      search: '',
      column: '',
      account_type: '',
      sale_type: '',
      sales_channel: '',
      assigned_to: '',
      level: '',
      city: '',
      is_target: '',
      alert_type: 'all',
      num_establishments: '',
    })
  }

  // =========================================================================
  // EDIT MODE HANDLERS
  // =========================================================================

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const selectAll = () => {
    if (selectedIds.size === filteredAccounts.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredAccounts.map(a => a.name)))
    }
  }

  const handleBulkUpdate = async (field: string, value: string) => {
    if (selectedIds.size === 0) return

    try {
      setRefreshing(true)
      await Promise.all(
        Array.from(selectedIds).map(id =>
          momentumApi.updateAccount(id, { [field]: value })
        )
      )
      setSelectedIds(new Set())
      setBulkAction(null)
      fetchAccounts(true)
    } catch (error) {
      console.error('Error en actualización masiva:', error)
    }
  }

  const exitEditMode = () => {
    setEditMode(false)
    setSelectedIds(new Set())
    setBulkAction(null)
  }

  // =========================================================================
  // NEW ACCOUNT
  // =========================================================================

  const handleAccountCreated = (accountId: string) => {
    setShowNewAccountDrawer(false)
    setSelectedAccountId(accountId)
    setIsDrawerOpen(true)
    fetchAccounts(true)
    fetchStats()
  }

  const handleDeleteSelected = async () => {
    if (!selectedIds.size || deleting) return
    const confirmed = window.confirm(`¿Eliminar ${selectedIds.size} cuentas? Esta acción no se puede deshacer.`)
    if (!confirmed) return

    setDeleting(true)
    const ids = Array.from(selectedIds)
    const results = await Promise.allSettled(ids.map((id) => momentumApi.deleteAccount(id)))
    const successCount = results.filter((r) => r.status === 'fulfilled').length
    const failCount = results.length - successCount

    if (successCount) {
      toast.success(`${successCount} cuentas eliminadas.`)
    }
    if (failCount) {
      toast.error(`${failCount} cuentas no se pudieron eliminar.`)
    }

    exitEditMode()
    fetchAccounts(true)
    fetchStats()
    setDeleting(false)
  }

  const runEnrichment = async (dryRun: boolean) => {
    if (enriching) return
    setEnriching(true)
    try {
      const response = await googlePlacesApi.enrichMomentumAccounts({
        limit: enrichOptions.limit,
        min_score: enrichOptions.minScore,
        delay_ms: enrichOptions.delayMs,
        only_missing: enrichOptions.onlyMissing ? 1 : 0,
        overwrite: enrichOptions.overwrite ? 1 : 0,
        search_limit: enrichOptions.searchLimit,
        dry_run: dryRun ? 1 : 0,
        run_async: dryRun ? 0 : 1,
      })

      if (dryRun) {
        toast.info(
          `Dry run listo: ${response.updated || 0} con cambios, ${response.skipped || 0} sin match, ${response.failed || 0} errores.`,
        )
      } else if (response.enqueued) {
        toast.success(`Enrichment encolado. Job: ${response.job_id || 'en ejecución'}`)
      } else {
        toast.success(`Enrichment ejecutado: ${response.updated || 0} actualizadas.`)
      }
    } catch (error) {
      console.error('Error enriqueciendo cuentas:', error)
      toast.error('No se pudo lanzar el enrichment. Revisa la API key o permisos.')
    } finally {
      setEnriching(false)
    }
  }

  // =========================================================================
  // RENDER
  // =========================================================================

  return (
    <div className={tw.page}>
      {/* ===== HEADER ===== */}
      <div className="border-b border-[#E8E6E3] bg-white">
        <div className="max-w-[1800px] mx-auto px-4 md:px-8">
          {/* Top Row */}
          <div className="flex items-center justify-between py-4">
            <div>
              <h1 className="font-['Playfair_Display',Georgia,serif] text-xl md:text-2xl font-semibold text-[#292524]">
                Cuentas
              </h1>
              <p className="text-[10px] md:text-xs text-[#A8A29E] uppercase tracking-wide mt-0.5">
                {total} cuentas • {stats?.targets || 0} targets
              </p>
            </div>
            <div className="flex items-center gap-2">
              {editMode ? (
                <>
                  <span className="text-sm text-[#5BBFBF] font-medium">
                    {selectedIds.size} seleccionadas
                  </span>
                  <button
                    onClick={exitEditMode}
                    className="px-3 py-2 text-sm text-[#78716C] hover:bg-[#F5F4F2] rounded-sm"
                  >
                    Cancelar
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setEditMode(true)}
                    className="hidden md:flex items-center gap-2 px-3 py-2 text-sm text-[#57534E] hover:bg-[#F5F4F2] rounded-sm"
                  >
                    <Edit3 size={16} />
                    Editar
                  </button>
                  <button
                    onClick={() => setShowEnrichPanel((prev) => !prev)}
                    className="hidden md:flex items-center gap-2 px-3 py-2 text-sm text-[#57534E] hover:bg-[#F5F4F2] rounded-sm"
                  >
                    <MapPin size={16} />
                    Enriquecer
                  </button>
                  <button
                    onClick={() => fetchAccounts(true)}
                    className="p-2 text-[#78716C] hover:text-[#44403C] hover:bg-[#F5F4F2] rounded-sm transition-colors"
                    disabled={refreshing}
                  >
                    <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
                  </button>
                  <button
                    onClick={() => setShowNewAccountDrawer(true)}
                    className="hidden md:flex items-center gap-2 px-4 py-2 bg-[#44403C] text-white text-sm font-medium hover:bg-[#292524] transition-colors rounded-sm"
                  >
                    <Plus size={16} />
                    Nueva Cuenta
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Stats Bar - Compact */}
          {stats && (
            <div className="flex overflow-x-auto gap-3 pb-4 -mx-4 px-4 md:mx-0 md:px-0 md:gap-4 border-t border-[#E8E6E3] pt-3 scrollbar-hide">
              <CompactStat label="Pipeline" value={stats.by_column.Pipeline || 0} color="#5BBFBF" />
              <CompactStat label="Hot" value={stats.by_column.Hot || 0} color="#F5CE3E" />
              <CompactStat label="Won" value={stats.by_column.Won || 0} color="#4CAF7A" />
              <CompactStat label="Lost" value={stats.by_column.Lost || 0} color="#E07A4C" />
              <CompactStat label="Loyalty" value={stats.by_column.Loyalty || 0} color="#5BBFBF" />
            </div>
          )}
        </div>
      </div>

      {/* ===== CONTENT ===== */}
      <div className="max-w-[1800px] mx-auto px-4 md:px-8 py-4 md:py-6">
        {/* Search & Filters - Compact */}
        <div className="bg-white border border-[#E8E6E3] rounded-sm mb-4">
          <div className="p-3">
            <div className="flex flex-wrap gap-2 items-center">
              {/* Search */}
              <div className="flex-1 min-w-[180px] relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A8A29E]" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  placeholder="Buscar..."
                  className="w-full pl-9 pr-3 py-2 bg-white border border-[#E8E6E3] rounded-sm text-sm focus:outline-none focus:border-[#5BBFBF]"
                />
              </div>

              {/* Sell In / Sell Out Toggle */}
              <div className="flex border border-[#E8E6E3] rounded-sm overflow-hidden">
                <button
                  onClick={() => handleFilterChange('sale_type', filters.sale_type === 'Sell In' ? '' : 'Sell In')}
                  className={`px-3 py-2 text-xs font-medium transition-colors ${
                    filters.sale_type === 'Sell In'
                      ? 'bg-[#6D28D9] text-white'
                      : 'bg-white text-[#57534E] hover:bg-[#F5F4F2]'
                  }`}
                >
                  Sell In
                </button>
                <button
                  onClick={() => handleFilterChange('sale_type', filters.sale_type === 'Sell Out' ? '' : 'Sell Out')}
                  className={`px-3 py-2 text-xs font-medium transition-colors border-l border-[#E8E6E3] ${
                    filters.sale_type === 'Sell Out'
                      ? 'bg-[#C2410C] text-white'
                      : 'bg-white text-[#57534E] hover:bg-[#F5F4F2]'
                  }`}
                >
                  Sell Out
                </button>
              </div>

              {/* Alert Filter */}
              <div className="flex border border-[#E8E6E3] rounded-sm overflow-hidden">
                <button
                  onClick={() => handleFilterChange('alert_type', filters.alert_type === 'no_interaction' ? 'all' : 'no_interaction')}
                  className={`px-2 py-2 text-xs transition-colors flex items-center gap-1 ${
                    filters.alert_type === 'no_interaction'
                      ? 'bg-[#E07A4C] text-white'
                      : 'bg-white text-[#57534E] hover:bg-[#F5F4F2]'
                  }`}
                  title="Sin interacción reciente"
                >
                  <Clock size={14} />
                </button>
                <button
                  onClick={() => handleFilterChange('alert_type', filters.alert_type === 'no_order' ? 'all' : 'no_order')}
                  className={`px-2 py-2 text-xs transition-colors border-l border-[#E8E6E3] flex items-center gap-1 ${
                    filters.alert_type === 'no_order'
                      ? 'bg-[#E07A4C] text-white'
                      : 'bg-white text-[#57534E] hover:bg-[#F5F4F2]'
                  }`}
                  title="Sin pedido reciente"
                >
                  <ShoppingCart size={14} />
                </button>
              </div>

              {/* View Toggle (mobile) */}
              <div className="flex md:hidden border border-[#E8E6E3] rounded-sm overflow-hidden">
                <button
                  onClick={() => setViewMode('cards')}
                  className={`p-2 ${viewMode === 'cards' ? 'bg-[#F5F4F2] text-[#44403C]' : 'text-[#A8A29E]'}`}
                >
                  <LayoutGrid size={16} />
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-2 ${viewMode === 'table' ? 'bg-[#F5F4F2] text-[#44403C]' : 'text-[#A8A29E]'}`}
                >
                  <LayoutList size={16} />
                </button>
              </div>

              {/* More Filters */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-1 px-3 py-2 border rounded-sm text-xs font-medium transition-colors ${
                  showFilters || activeFiltersCount > 0
                    ? 'bg-[#E0F4F4] border-[#5BBFBF] text-[#3D8B8B]'
                    : 'bg-white border-[#E8E6E3] text-[#57534E]'
                }`}
              >
                <Filter size={14} />
                {activeFiltersCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-[#5BBFBF] text-white text-[10px] flex items-center justify-center">
                    {activeFiltersCount}
                  </span>
                )}
              </button>
            </div>

            {/* Expanded Filters */}
            {showFilters && (
              <div className="flex flex-wrap gap-2 pt-3 mt-3 border-t border-[#F5F4F2]">
                <select
                  value={filters.column}
                  onChange={(e) => handleFilterChange('column', e.target.value)}
                  className="px-2 py-1.5 bg-white border border-[#E8E6E3] rounded-sm text-xs focus:outline-none focus:border-[#5BBFBF]"
                >
                  <option value="">Status</option>
                  {KANBAN_COLUMNS.map(col => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>

                <select
                  value={filters.sales_channel}
                  onChange={(e) => handleFilterChange('sales_channel', e.target.value)}
                  className="px-2 py-1.5 bg-white border border-[#E8E6E3] rounded-sm text-xs focus:outline-none focus:border-[#5BBFBF]"
                >
                  <option value="">Canal</option>
                  {SALES_CHANNELS.map(ch => (
                    <option key={ch} value={ch}>{ch}</option>
                  ))}
                </select>

                <select
                  value={filters.level}
                  onChange={(e) => handleFilterChange('level', e.target.value)}
                  className="px-2 py-1.5 bg-white border border-[#E8E6E3] rounded-sm text-xs focus:outline-none focus:border-[#5BBFBF]"
                >
                  <option value="">Nivel</option>
                  <option value="1">★</option>
                  <option value="2">★★</option>
                  <option value="3">★★★</option>
                </select>

                <select
                  value={filters.num_establishments}
                  onChange={(e) => handleFilterChange('num_establishments', e.target.value)}
                  className="px-2 py-1.5 bg-white border border-[#E8E6E3] rounded-sm text-xs focus:outline-none focus:border-[#5BBFBF]"
                >
                  <option value="">Establec.</option>
                  <option value="1">1 local</option>
                  <option value="2-5">2-5 locales</option>
                  <option value="6-10">6-10 locales</option>
                  <option value="10+">10+ locales</option>
                </select>

                <select
                  value={filters.assigned_to}
                  onChange={(e) => handleFilterChange('assigned_to', e.target.value)}
                  className="px-2 py-1.5 bg-white border border-[#E8E6E3] rounded-sm text-xs focus:outline-none focus:border-[#5BBFBF]"
                >
                  <option value="">Responsable</option>
                  {assignedUsers.map(u => (
                    <option key={u.email} value={u.email}>
                      {u.full_name || u.email.split('@')[0]}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => handleFilterChange('is_target', filters.is_target === '1' ? '' : '1')}
                  className={`px-2 py-1.5 rounded-sm text-xs font-medium flex items-center gap-1 ${
                    filters.is_target === '1'
                      ? 'bg-[#F5CE3E] text-[#292524]'
                      : 'bg-white border border-[#E8E6E3] text-[#57534E]'
                  }`}
                >
                  <Target size={12} />
                  Targets
                </button>

                {activeFiltersCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="px-2 py-1.5 text-xs text-[#E07A4C] hover:bg-[#FFEBEE] rounded-sm flex items-center gap-1"
                  >
                    <X size={12} />
                    Limpiar
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {showEnrichPanel && (
          <div className="bg-white border border-[#E8E6E3] rounded-sm mb-4">
            <div className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-[#E5B82A]" />
                  <p className="text-sm font-medium text-[#292524]">Enrichment Google Maps</p>
                </div>
                <button
                  onClick={() => setShowEnrichPanel(false)}
                  className="text-xs text-[#78716C] hover:text-[#44403C]"
                >
                  Cerrar
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-[#A8A29E]">Límite</label>
                  <input
                    type="number"
                    min={1}
                    value={enrichOptions.limit}
                    onChange={(e) => setEnrichOptions((prev) => ({ ...prev, limit: Number(e.target.value) || 0 }))}
                    className="w-full mt-1 px-2 py-1.5 border border-[#E8E6E3] rounded-sm text-sm"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-[#A8A29E]">Score mín</label>
                  <input
                    type="number"
                    step="0.05"
                    min={0}
                    max={1}
                    value={enrichOptions.minScore}
                    onChange={(e) => setEnrichOptions((prev) => ({ ...prev, minScore: Number(e.target.value) || 0 }))}
                    className="w-full mt-1 px-2 py-1.5 border border-[#E8E6E3] rounded-sm text-sm"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-[#A8A29E]">Delay (ms)</label>
                  <input
                    type="number"
                    min={0}
                    value={enrichOptions.delayMs}
                    onChange={(e) => setEnrichOptions((prev) => ({ ...prev, delayMs: Number(e.target.value) || 0 }))}
                    className="w-full mt-1 px-2 py-1.5 border border-[#E8E6E3] rounded-sm text-sm"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-[#A8A29E]">Search limit</label>
                  <input
                    type="number"
                    min={1}
                    value={enrichOptions.searchLimit}
                    onChange={(e) => setEnrichOptions((prev) => ({ ...prev, searchLimit: Number(e.target.value) || 0 }))}
                    className="w-full mt-1 px-2 py-1.5 border border-[#E8E6E3] rounded-sm text-sm"
                  />
                </div>
                <div className="flex flex-col justify-end gap-2">
                  <label className="text-[10px] uppercase tracking-wide text-[#A8A29E]">Opciones</label>
                  <div className="flex items-center gap-2 text-xs text-[#57534E]">
                    <input
                      type="checkbox"
                      checked={enrichOptions.onlyMissing}
                      onChange={(e) => setEnrichOptions((prev) => ({ ...prev, onlyMissing: e.target.checked }))}
                    />
                    Solo sin Google
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[#57534E]">
                    <input
                      type="checkbox"
                      checked={enrichOptions.overwrite}
                      onChange={(e) => setEnrichOptions((prev) => ({ ...prev, overwrite: e.target.checked }))}
                    />
                    Sobrescribir
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                <button
                  onClick={() => runEnrichment(true)}
                  disabled={enriching}
                  className="px-3 py-2 text-sm text-[#57534E] border border-[#E8E6E3] rounded-sm hover:bg-[#F5F4F2]"
                >
                  {enriching ? 'Procesando...' : 'Dry run'}
                </button>
                <button
                  onClick={() => runEnrichment(false)}
                  disabled={enriching}
                  className="px-4 py-2 bg-[#44403C] text-white text-sm font-medium rounded-sm hover:bg-[#292524] transition-colors"
                >
                  {enriching ? 'Encolando...' : 'Ejecutar enrichment'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Actions Bar */}
        {editMode && selectedIds.size > 0 && (
          <div className="bg-[#44403C] text-white px-4 py-3 rounded-sm mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={selectAll} className="p-1">
                {selectedIds.size === filteredAccounts.length ? (
                  <CheckSquare size={18} />
                ) : (
                  <Square size={18} />
                )}
              </button>
              <span className="text-sm">{selectedIds.size} seleccionadas</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDeleteSelected}
                disabled={deleting}
                className="px-2 py-1 bg-[#E07A4C] text-white rounded-sm text-xs hover:bg-[#B85A35] disabled:opacity-50"
              >
                {deleting ? 'Eliminando...' : 'Eliminar'}
              </button>
              <select
                onChange={(e) => {
                  if (e.target.value) handleBulkUpdate('column', e.target.value)
                }}
                className="px-2 py-1 bg-white/10 border border-white/20 rounded-sm text-xs"
              >
                <option value="">Mover a...</option>
                {KANBAN_COLUMNS.map(col => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
              <select
                onChange={(e) => {
                  if (e.target.value) handleBulkUpdate('level', e.target.value)
                }}
                className="px-2 py-1 bg-white/10 border border-white/20 rounded-sm text-xs"
              >
                <option value="">Nivel...</option>
                <option value="1">★</option>
                <option value="2">★★</option>
                <option value="3">★★★</option>
              </select>
              <select
                onChange={(e) => {
                  if (e.target.value) handleBulkUpdate('assigned_to', e.target.value)
                }}
                className="px-2 py-1 bg-white/10 border border-white/20 rounded-sm text-xs"
              >
                <option value="">Asignar a...</option>
                {assignedUsers.map(u => (
                  <option key={u.email} value={u.email}>
                    {u.full_name || u.email.split('@')[0]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[#F5CE3E]" />
            <span className="ml-3 text-[#78716C]">Cargando cuentas...</span>
          </div>
        ) : filteredAccounts.length === 0 ? (
          <div className="text-center py-12 bg-white border border-[#E8E6E3] rounded-sm">
            <Users size={48} className="mx-auto text-[#D4D1CC] mb-4" />
            <p className="text-[#78716C]">No hay cuentas que coincidan</p>
            {activeFiltersCount > 0 && (
              <button
                onClick={clearFilters}
                className="mt-3 text-sm text-[#5BBFBF] hover:underline"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Mobile: Cards View */}
            <div className={`md:hidden ${viewMode === 'cards' ? 'block' : 'hidden'}`}>
              <div className="space-y-3">
                {filteredAccounts.map((account) => (
                  <MobileAccountCard
                    key={account.name}
                    account={account}
                    onClick={() => handleAccountClick(account)}
                    selected={selectedIds.has(account.name)}
                    editMode={editMode}
                    onToggleSelect={() => toggleSelection(account.name)}
                  />
                ))}
              </div>
            </div>

            {/* Mobile: Table View */}
            <div className={`md:hidden ${viewMode === 'table' ? 'block' : 'hidden'}`}>
              <MobileTableView
                accounts={filteredAccounts}
                onAccountClick={handleAccountClick}
                selectedIds={selectedIds}
                editMode={editMode}
                onToggleSelect={toggleSelection}
              />
            </div>

            {/* Desktop: Full Table */}
            <div className="hidden md:block">
              <DesktopTable
                accounts={filteredAccounts}
                sort={sort}
                onSort={handleSort}
                onAccountClick={handleAccountClick}
                selectedIds={selectedIds}
                editMode={editMode}
                onToggleSelect={toggleSelection}
                onSelectAll={selectAll}
              />
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4 px-1">
              <span className="text-xs md:text-sm text-[#78716C]">
                {((page - 1) * pageSize) + 1}-{Math.min(page * pageSize, total)} de {total}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-3 min-w-[48px] min-h-[48px] flex items-center justify-center bg-white border border-[#E8E6E3] rounded-sm disabled:opacity-50"
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="px-3 py-2 text-sm font-medium text-[#44403C] min-w-[60px] text-center">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-3 min-w-[48px] min-h-[48px] flex items-center justify-center bg-white border border-[#E8E6E3] rounded-sm disabled:opacity-50"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* FAB - Nueva Cuenta (Mobile) */}
      {!editMode && (
        <button
          onClick={() => setShowNewAccountDrawer(true)}
          className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-[#44403C] text-white shadow-lg flex items-center justify-center md:hidden active:scale-95 transition-all"
        >
          <Plus size={24} />
        </button>
      )}

      {/* Drawer */}
      <MomentumDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        accountId={selectedAccountId}
        onUpdated={() => fetchAccounts(true)}
      />

      {/* New Account Drawer */}
      <NewAccountDrawer
        isOpen={showNewAccountDrawer}
        onClose={() => setShowNewAccountDrawer(false)}
        onCreated={handleAccountCreated}
      />
    </div>
  )
}

// ============================================================================
// COMPACT STAT
// ============================================================================

function CompactStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex-shrink-0 flex items-center gap-2">
      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-xs text-[#78716C]">{label}</span>
      <span className="text-sm font-semibold text-[#292524]">{value}</span>
    </div>
  )
}

// ============================================================================
// MOBILE ACCOUNT CARD
// ============================================================================

interface MobileAccountCardProps {
  account: MomentumAccount
  onClick: () => void
  selected: boolean
  editMode: boolean
  onToggleSelect: () => void
}

function MobileAccountCard({ account, onClick, selected, editMode, onToggleSelect }: MobileAccountCardProps) {
  const hasAlert = account.has_overdue_followup
  const isSellIn = account.sale_type === 'Sell In'

  return (
    <div
      onClick={onClick}
      className={`
        bg-white border rounded-sm p-4 cursor-pointer transition-colors
        ${selected ? 'border-[#5BBFBF] bg-[#E0F4F4]' : 'border-[#E8E6E3]'}
        ${hasAlert ? 'border-l-[3px] border-l-[#E07A4C]' : ''}
      `}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {editMode && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleSelect() }}
              className="flex-shrink-0"
            >
              {selected ? <CheckSquare size={18} className="text-[#5BBFBF]" /> : <Square size={18} className="text-[#A8A29E]" />}
            </button>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {account.is_target && <Target size={14} className="text-[#F5CE3E] flex-shrink-0" />}
              <h3 className="font-medium text-[#292524] truncate">{account.account_name}</h3>
            </div>
            {account.contact_name && (
              <p className="text-xs text-[#78716C] truncate">{account.contact_name}</p>
            )}
          </div>
        </div>
        <ColumnBadge column={account.column} />
      </div>

      <div className="flex items-center gap-2 flex-wrap mb-3">
        <span
          className="px-2 py-0.5 text-[10px] font-medium rounded-sm"
          style={{
            backgroundColor: isSellIn ? '#EDE9FE' : '#FFF7ED',
            color: isSellIn ? '#6D28D9' : '#C2410C'
          }}
        >
          {account.sale_type}
        </span>
        <span className="px-2 py-0.5 bg-[#F5F4F2] rounded-sm text-[10px] text-[#57534E]">
          {account.sales_channel}
        </span>
        <LevelStars level={account.level} />
        {account.num_establishments && account.num_establishments > 1 && (
          <span className="text-[10px] text-[#78716C]">
            {account.num_establishments} locales
          </span>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-[#78716C] pt-3 border-t border-[#F5F4F2]">
        <span>{account.assigned_to?.split('@')[0] || '-'}</span>
        <div className="flex items-center gap-2">
          {account.phone && <Phone size={12} />}
          {account.email && <Mail size={12} />}
          {hasAlert && <AlertTriangle size={12} className="text-[#E07A4C]" />}
        </div>
      </div>
    </div>

  )
}

// ============================================================================
// MOBILE TABLE VIEW
// ============================================================================

interface MobileTableViewProps {
  accounts: MomentumAccount[]
  onAccountClick: (account: MomentumAccount) => void
  selectedIds: Set<string>
  editMode: boolean
  onToggleSelect: (id: string) => void
}

function MobileTableView({ accounts, onAccountClick, selectedIds, editMode, onToggleSelect }: MobileTableViewProps) {
  return (
    <div className="bg-white border border-[#E8E6E3] rounded-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[400px]">
          <thead>
            <tr className="bg-[#FFF8E1]">
              {editMode && <th className="w-10 p-2"></th>}
              <th className="text-left py-2 px-3 text-[10px] text-[#78716C] uppercase">Cuenta</th>
              <th className="text-left py-2 px-3 text-[10px] text-[#78716C] uppercase">Tipo</th>
              <th className="text-left py-2 px-3 text-[10px] text-[#78716C] uppercase">Status</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((account, idx) => (
              <tr
                key={account.name}
                onClick={() => onAccountClick(account)}
                className={`${idx % 2 === 0 ? 'bg-white' : 'bg-[#FAFAF9]'} ${selectedIds.has(account.name) ? 'bg-[#E0F4F4]' : ''}`}
              >
                {editMode && (
                  <td className="p-2" onClick={(e) => { e.stopPropagation(); onToggleSelect(account.name) }}>
                    {selectedIds.has(account.name) ? (
                      <CheckSquare size={16} className="text-[#5BBFBF]" />
                    ) : (
                      <Square size={16} className="text-[#A8A29E]" />
                    )}
                  </td>
                )}
                <td className="py-2 px-3">
                  <div className="flex items-center gap-1">
                    {account.is_target && <Target size={12} className="text-[#F5CE3E]" />}
                    <span className="text-sm text-[#292524] truncate max-w-[120px]">{account.account_name}</span>
                  </div>
                </td>
                <td className="py-2 px-3">
                  <span
                    className="px-1.5 py-0.5 text-[10px] font-medium rounded-sm"
                    style={{
                      backgroundColor: account.sale_type === 'Sell In' ? '#EDE9FE' : '#FFF7ED',
                      color: account.sale_type === 'Sell In' ? '#6D28D9' : '#C2410C'
                    }}
                  >
                    {account.sale_type === 'Sell In' ? 'SI' : 'SO'}
                  </span>
                </td>
                <td className="py-2 px-3">
                  <ColumnBadge column={account.column} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ============================================================================
// DESKTOP TABLE
// ============================================================================

interface DesktopTableProps {
  accounts: MomentumAccount[]
  sort: SortConfig
  onSort: (field: string) => void
  onAccountClick: (account: MomentumAccount) => void
  selectedIds: Set<string>
  editMode: boolean
  onToggleSelect: (id: string) => void
  onSelectAll: () => void
}

function DesktopTable({ accounts, sort, onSort, onAccountClick, selectedIds, editMode, onToggleSelect, onSelectAll }: DesktopTableProps) {
  return (
    <div className="bg-white border border-[#E8E6E3] rounded-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-[#FFF8E1]">
              {editMode && (
                <th className="w-12 p-3">
                  <button onClick={onSelectAll}>
                    {selectedIds.size === accounts.length ? (
                      <CheckSquare size={16} className="text-[#5BBFBF]" />
                    ) : (
                      <Square size={16} className="text-[#78716C]" />
                    )}
                  </button>
                </th>
              )}
              <SortableHeader field="account_name" label="Cuenta" sort={sort} onSort={onSort} />
              <SortableHeader field="sale_type" label="Tipo" sort={sort} onSort={onSort} />
              <SortableHeader field="sales_channel" label="Canal" sort={sort} onSort={onSort} />
              <SortableHeader field="column" label="Status" sort={sort} onSort={onSort} />
              <SortableHeader field="level" label="Nivel" sort={sort} onSort={onSort} />
              <SortableHeader field="num_establishments" label="Estab." sort={sort} onSort={onSort} />
              <SortableHeader field="assigned_to" label="Responsable" sort={sort} onSort={onSort} />
              <th className={tw.tableHeader}>Contacto</th>
              <SortableHeader field="next_follow_up_date" label="Seguim." sort={sort} onSort={onSort} />
            </tr>
          </thead>
          <tbody>
            {accounts.map((account, idx) => (
              <tr
                key={account.name}
                onClick={() => onAccountClick(account)}
                className={`
                  ${tw.tableRow} cursor-pointer
                  ${idx % 2 === 0 ? 'bg-white' : 'bg-[#FAFAF9]'}
                  ${selectedIds.has(account.name) ? 'bg-[#E0F4F4]' : ''}
                `}
              >
                {editMode && (
                  <td className="p-3" onClick={(e) => { e.stopPropagation(); onToggleSelect(account.name) }}>
                    {selectedIds.has(account.name) ? (
                      <CheckSquare size={16} className="text-[#5BBFBF]" />
                    ) : (
                      <Square size={16} className="text-[#A8A29E]" />
                    )}
                  </td>
                )}
                <td className={tw.tableCell}>
                  <div className="flex items-center gap-2">
                    {account.is_target && <Target size={14} className="text-[#F5CE3E]" />}
                    <span className="font-medium text-[#292524]">{account.account_name}</span>
                    {account.has_overdue_followup && <AlertTriangle size={14} className="text-[#E07A4C]" />}
                  </div>
                  {account.contact_name && (
                    <p className="text-xs text-[#A8A29E]">{account.contact_name}</p>
                  )}
                </td>
                <td className={tw.tableCell}>
                  <span
                    className="px-2 py-0.5 text-[10px] font-medium rounded-sm"
                    style={{
                      backgroundColor: account.sale_type === 'Sell In' ? '#EDE9FE' : '#FFF7ED',
                      color: account.sale_type === 'Sell In' ? '#6D28D9' : '#C2410C'
                    }}
                  >
                    {account.sale_type}
                  </span>
                </td>
                <td className={tw.tableCell}>
                  <span className="text-sm text-[#57534E]">{account.sales_channel}</span>
                </td>
                <td className={tw.tableCell}>
                  <ColumnBadge column={account.column} />
                </td>
                <td className={tw.tableCell}>
                  <LevelStars level={account.level} />
                </td>
                <td className={tw.tableCell}>
                  <span className="text-sm text-[#57534E]">
                    {account.num_establishments || 1}
                  </span>
                </td>
                <td className={tw.tableCell}>
                  <span className="text-sm text-[#57534E]">
                    {account.assigned_to?.split('@')[0] || '-'}
                  </span>
                </td>
                <td className={tw.tableCell}>
                  <div className="flex items-center gap-2">
                    {account.phone && <Phone size={14} className="text-[#78716C]" />}
                    {account.email && <Mail size={14} className="text-[#78716C]" />}
                  </div>
                </td>
                <td className={tw.tableCell}>
                  {account.next_follow_up_date ? (
                    <span className={`text-sm ${account.has_overdue_followup ? 'text-[#E07A4C] font-medium' : 'text-[#78716C]'}`}>
                      {new Date(account.next_follow_up_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                    </span>
                  ) : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ============================================================================
// SORTABLE HEADER
// ============================================================================

function SortableHeader({ field, label, sort, onSort }: { field: string; label: string; sort: SortConfig; onSort: (f: string) => void }) {
  const isActive = sort.field === field
  return (
    <th
      onClick={() => onSort(field)}
      className={tw.tableHeader + ' cursor-pointer hover:bg-[#FFF3E8] select-none'}
    >
      <div className="flex items-center gap-1">
        {label}
        {isActive && (sort.order === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
      </div>
    </th>
  )
}

// ============================================================================
// COLUMN BADGE
// ============================================================================

function ColumnBadge({ column }: { column: KanbanColumn }) {
  const colors: Record<KanbanColumn, { bg: string; text: string }> = {
    Backlog: { bg: '#F5F4F2', text: '#57534E' },
    Pipeline: { bg: '#E0F4F4', text: '#3D8B8B' },
    Hot: { bg: '#FFF8E1', text: '#B8860B' },
    Won: { bg: '#E8F5EE', text: '#2E7D56' },
    Lost: { bg: '#FFEBEE', text: '#B85A35' },
    Loyalty: { bg: '#E0F4F4', text: '#3D8B8B' },
  }
  const c = colors[column] || colors.Backlog
  return (
    <span
      className="px-2 py-0.5 text-[10px] font-medium uppercase rounded-sm"
      style={{ backgroundColor: c.bg, color: c.text }}
    >
      {column}
    </span>
  )
}

// ============================================================================
// LEVEL STARS
// ============================================================================

function LevelStars({ level }: { level: AccountLevel }) {
  const stars = '★'.repeat(parseInt(level))
  const colors: Record<AccountLevel, string> = { '1': '#A8A29E', '2': '#3D8B8B', '3': '#F5CE3E' }
  return <span className="text-sm" style={{ color: colors[level] || colors['1'] }}>{stars}</span>
}

export default AccountsPage
