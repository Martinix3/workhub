// Manager Analytics Dashboard Page
import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Calendar, Users, Download, Printer } from 'lucide-react'
import { LoadingState } from '../../components/ui/LoadingState'
import { ErrorState } from '../../components/ui/ErrorState'
import { useManagerAnalyticsDashboard, managerAnalyticsApi } from '../../api'
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
  const [showExportDropdown, setShowExportDropdown] = useState(false)
  const [exporting, setExporting] = useState(false)
  const exportDropdownRef = useRef<HTMLDivElement>(null)

  // Fetch all dashboard data using the combined hook
  const department = selectedDepartment === 'ALL' ? undefined : selectedDepartment
  const { data, loading, error, refetch } = useManagerAnalyticsDashboard(department)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target as Node)) {
        setShowExportDropdown(false)
      }
    }

    if (showExportDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showExportDropdown])

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

  const handleExport = async (format: 'csv' | 'pdf') => {
    setShowExportDropdown(false)
    setExporting(true)

    try {
      if (format === 'csv') {
        // Export CSV using API endpoint
        const result = await managerAnalyticsApi.exportAnalytics('csv', department)

        // Create a blob and download it
        const blob = new Blob([result.content], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        const url = URL.createObjectURL(blob)

        link.setAttribute('href', url)
        link.setAttribute('download', result.filename)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      } else if (format === 'pdf') {
        // Export PDF using window.print()
        window.print()
      }
    } catch (error) {
      console.error('Export failed:', error)
      // TODO: Show error toast/notification
    } finally {
      setExporting(false)
    }
  }

  // Transform API responses to match component expected types
  const velocityData: VelocityData = data.velocity
  const blockerData: BlockerData = data.blockers
  const overdueData: OverdueData = data.overdue

  return (
    <>
      {/* Print-optimized styles */}
      <style>{`
        @media print {
          /* Hide non-essential elements */
          button, .no-print {
            display: none !important;
          }

          /* Reset page styles */
          body {
            background: white !important;
            color: black !important;
          }

          /* Remove shadows and borders for cleaner print */
          * {
            box-shadow: none !important;
            text-shadow: none !important;
          }

          /* Ensure proper page breaks */
          .print-section {
            page-break-inside: avoid;
          }

          /* Adjust layout for print */
          .print-container {
            max-width: 100%;
            padding: 20px;
          }

          /* Remove dark mode styles */
          .dark\\:bg-stone-900,
          .dark\\:bg-stone-950,
          .dark\\:border-stone-100,
          .dark\\:text-stone-100 {
            background: white !important;
            border-color: black !important;
            color: black !important;
          }

          /* Simplify borders */
          [class*="border-2"] {
            border-width: 1px !important;
          }

          /* Remove hover effects */
          [class*="hover:"] {
            transform: none !important;
          }

          /* Optimize chart visibility */
          svg {
            max-width: 100%;
            height: auto;
          }

          /* Print header */
          .print-header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 2px solid black;
            padding-bottom: 10px;
          }

          /* Force grid to single column on print */
          .lg\\:grid-cols-2 {
            grid-template-columns: 1fr !important;
          }
        }

        /* Print button styles - visible on screen only */
        @media screen {
          .print-only {
            display: none;
          }
        }
      `}</style>

      <div className="min-h-screen bg-stone-100 dark:bg-stone-950">
        {/* Header */}
        <div className="border-b-2 border-stone-900 dark:border-stone-100 bg-white dark:bg-stone-900 px-8 py-6 print-header">
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

              {/* Export Dropdown */}
              <div className="relative" ref={exportDropdownRef}>
                <button
                  onClick={() => setShowExportDropdown(!showExportDropdown)}
                  disabled={exporting}
                  className="
                    flex items-center gap-2
                    px-4 py-2
                    bg-cyan-500 dark:bg-cyan-600
                    border-2 border-stone-900 dark:border-stone-100
                    text-stone-900 dark:text-stone-100
                    font-medium text-sm
                    shadow-[2px_2px_0_#1c1917] dark:shadow-[2px_2px_0_#fafaf9]
                    hover:translate-x-[1px] hover:translate-y-[1px]
                    hover:shadow-[1px_1px_0_#1c1917] dark:hover:shadow-[1px_1px_0_#fafaf9]
                    disabled:opacity-50 disabled:cursor-not-allowed
                    transition-all duration-75
                  "
                >
                  <Download size={16} />
                  <span>{exporting ? 'Exportando...' : 'Exportar'}</span>
                  <ChevronDown size={16} />
                </button>

                {/* Dropdown Menu */}
                {showExportDropdown && (
                  <div className="
                    absolute top-full right-0 mt-2
                    w-48
                    bg-white dark:bg-stone-800
                    border-2 border-stone-900 dark:border-stone-100
                    shadow-[4px_4px_0_#1c1917] dark:shadow-[4px_4px_0_#fafaf9]
                    z-50
                  ">
                    <button
                      onClick={() => handleExport('csv')}
                      className="
                        w-full flex items-center gap-3
                        px-4 py-3
                        text-left text-sm font-medium
                        text-stone-900 dark:text-stone-100
                        hover:bg-stone-100 dark:hover:bg-stone-700
                        transition-colors
                        border-b border-stone-200 dark:border-stone-700
                      "
                    >
                      <Download size={16} />
                      <span>Descargar CSV</span>
                    </button>
                    <button
                      onClick={() => handleExport('pdf')}
                      className="
                        w-full flex items-center gap-3
                        px-4 py-3
                        text-left text-sm font-medium
                        text-stone-900 dark:text-stone-100
                        hover:bg-stone-100 dark:hover:bg-stone-700
                        transition-colors
                      "
                    >
                      <Printer size={16} />
                      <span>Imprimir/PDF</span>
                    </button>
                  </div>
                )}
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
      <div className="max-w-7xl mx-auto px-8 py-8 print-container">
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Workload Distribution */}
            <div className="bg-white dark:bg-stone-900 border-2 border-stone-900 dark:border-stone-100 shadow-[4px_4px_0_#1c1917] dark:shadow-[4px_4px_0_#fafaf9] p-6 print-section">
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
            <div className="bg-white dark:bg-stone-900 border-2 border-stone-900 dark:border-stone-100 shadow-[4px_4px_0_#1c1917] dark:shadow-[4px_4px_0_#fafaf9] p-6 print-section">
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
            <div className="bg-white dark:bg-stone-900 border-2 border-stone-900 dark:border-stone-100 shadow-[4px_4px_0_#1c1917] dark:shadow-[4px_4px_0_#fafaf9] p-6 print-section">
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
            <div className="bg-white dark:bg-stone-900 border-2 border-stone-900 dark:border-stone-100 shadow-[4px_4px_0_#1c1917] dark:shadow-[4px_4px_0_#fafaf9] p-6 print-section">
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
    </>
  )
}

export default ManagerAnalyticsPage
