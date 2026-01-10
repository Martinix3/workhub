// Manager Analytics Dashboard Page
import { useState } from 'react'
import { ChevronDown, Calendar, Users } from 'lucide-react'
import { LoadingState } from '../../components/ui/LoadingState'
import { ErrorState } from '../../components/ui/ErrorState'
import { useManagerAnalyticsDashboard } from '../../api'
import {
  WorkloadDistributionChart,
  VelocityTrendChart,
  BlockerAnalysisPanel,
  OverdueRatioChart,
  DrillDownPanel,
  type DrillDownContext,
  type VelocityData,
  type BlockerData,
  type OverdueData
} from '../../components/sections/manager-analytics'
import type { Department } from '../../components/sections/tasks/types'

const DEPARTMENTS: Array<{ value: Department | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'Todos los Departamentos' },
  { value: 'SALES', label: 'Ventas' },
  { value: 'OPS', label: 'Operaciones' },
  { value: 'MKT', label: 'Marketing' },
]

export function ManagerAnalyticsPage() {
  const [selectedDepartment, setSelectedDepartment] = useState<Department | 'ALL'>('ALL')
  const [velocityPeriod, setVelocityPeriod] = useState<'daily' | 'weekly'>('daily')
  const [showDepartmentBreakdown, setShowDepartmentBreakdown] = useState(false)
  const [drillDownContext, setDrillDownContext] = useState<DrillDownContext | null>(null)

  // Fetch all dashboard data using the combined hook
  const department = selectedDepartment === 'ALL' ? undefined : selectedDepartment
  const { data, loading, error, refetch } = useManagerAnalyticsDashboard(department)

  if (loading) {
    return <LoadingState message="Cargando analytics..." fullPage />
  }

  if (error || !data) {
    return (
      <ErrorState
        title="Error al cargar Analytics"
        message="No se pudo cargar la información de analytics."
        error={error}
        onRetry={refetch}
      />
    )
  }

  const handleDrillDown = (context: DrillDownContext) => {
    setDrillDownContext(context)
  }

  const handleCloseDrillDown = () => {
    setDrillDownContext(null)
  }

  const handleViewTask = (taskId: string) => {
    // TODO: Navigate to task detail or open in modal
    console.log('View task:', taskId)
  }

  const handleExport = (format: 'csv' | 'pdf') => {
    // TODO: Subtask 4.3 will implement export functionality
    console.log('Export format:', format)
  }

  // Transform API responses to match component expected types
  const velocityData: VelocityData = data.velocity
  const blockerData: BlockerData = data.blockers
  const overdueData: OverdueData = data.overdue

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-950">
      {/* Header */}
      <div className="border-b-2 border-stone-900 dark:border-stone-100 bg-white dark:bg-stone-900 px-8 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="font-serif text-3xl font-bold text-stone-900 dark:text-stone-100">
                Manager Analytics
              </h1>
              <p className="text-stone-500 dark:text-stone-400 mt-1 font-mono text-sm uppercase tracking-wider flex items-center gap-2">
                <Calendar size={14} />
                {new Date().toLocaleDateString('es-ES', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </p>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Department Filter */}
              <div className="relative">
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value as Department | 'ALL')}
                  className="
                    appearance-none
                    px-4 py-2 pr-10
                    bg-white dark:bg-stone-800
                    border-2 border-stone-900 dark:border-stone-100
                    text-stone-900 dark:text-stone-100
                    font-medium text-sm
                    shadow-[2px_2px_0_#1c1917] dark:shadow-[2px_2px_0_#fafaf9]
                    hover:translate-x-[1px] hover:translate-y-[1px]
                    hover:shadow-[1px_1px_0_#1c1917] dark:hover:shadow-[1px_1px_0_#fafaf9]
                    transition-all duration-75
                    cursor-pointer
                  "
                >
                  {DEPARTMENTS.map(dept => (
                    <option key={dept.value} value={dept.value}>
                      {dept.label}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <ChevronDown size={16} className="text-stone-500 dark:text-stone-400" />
                </div>
              </div>

              {/* Quick Stat */}
              <div className="
                flex items-center gap-2
                px-4 py-2
                bg-amber-50 dark:bg-amber-950
                border-2 border-amber-500
                text-amber-900 dark:text-amber-100
                font-medium text-sm
              ">
                <Users size={16} />
                <span>{data.workload.workload.length} Miembros</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - 2 Column Grid */}
      <div className="max-w-7xl mx-auto px-8 py-8">
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Workload Distribution */}
            <div className="bg-white dark:bg-stone-900 border-2 border-stone-900 dark:border-stone-100 shadow-[4px_4px_0_#1c1917] dark:shadow-[4px_4px_0_#fafaf9] p-6">
              <h2 className="font-serif text-lg font-bold text-stone-900 dark:text-stone-100 mb-6 flex items-center gap-2 uppercase tracking-wider">
                <span className="w-4 h-4 bg-cyan-400" />
                Distribución de Carga
              </h2>
              <WorkloadDistributionChart
                data={data.workload.workload}
                onDrillDown={handleDrillDown}
              />
            </div>

            {/* Blocker Analysis */}
            <div className="bg-white dark:bg-stone-900 border-2 border-stone-900 dark:border-stone-100 shadow-[4px_4px_0_#1c1917] dark:shadow-[4px_4px_0_#fafaf9] p-6">
              <h2 className="font-serif text-lg font-bold text-stone-900 dark:text-stone-100 mb-6 flex items-center gap-2 uppercase tracking-wider">
                <span className="w-4 h-4 bg-red-500" />
                Análisis de Bloqueos
              </h2>
              <BlockerAnalysisPanel
                data={blockerData}
                onDrillDown={handleDrillDown}
                onViewTask={handleViewTask}
              />
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Velocity Trends */}
            <div className="bg-white dark:bg-stone-900 border-2 border-stone-900 dark:border-stone-100 shadow-[4px_4px_0_#1c1917] dark:shadow-[4px_4px_0_#fafaf9] p-6">
              <h2 className="font-serif text-lg font-bold text-stone-900 dark:text-stone-100 mb-6 flex items-center gap-2 uppercase tracking-wider">
                <span className="w-4 h-4 bg-green-500" />
                Tendencia de Velocidad
              </h2>
              <VelocityTrendChart
                data={velocityData}
                onDrillDown={handleDrillDown}
                onPeriodChange={setVelocityPeriod}
              />
            </div>

            {/* Overdue Ratio */}
            <div className="bg-white dark:bg-stone-900 border-2 border-stone-900 dark:border-stone-100 shadow-[4px_4px_0_#1c1917] dark:shadow-[4px_4px_0_#fafaf9] p-6">
              <h2 className="font-serif text-lg font-bold text-stone-900 dark:text-stone-100 mb-6 flex items-center gap-2 uppercase tracking-wider">
                <span className="w-4 h-4 bg-amber-500" />
                Tendencia de Vencimientos
              </h2>
              <OverdueRatioChart
                data={overdueData}
                onDrillDown={handleDrillDown}
                showDepartmentBreakdown={showDepartmentBreakdown}
                onToggleDepartmentBreakdown={() => setShowDepartmentBreakdown(!showDepartmentBreakdown)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Drill-Down Panel */}
      <DrillDownPanel
        context={drillDownContext}
        onClose={handleCloseDrillDown}
        onTaskClick={handleViewTask}
      />
    </div>
  )
}

export default ManagerAnalyticsPage
