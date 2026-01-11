// KPIs Tab - Manage custom KPIs
import { CustomKPIGrid } from '../../components/kpi-builder'

/**
 * KPIs settings tab for managing custom KPIs
 *
 * Features:
 * - List all user's custom KPIs
 * - Create new KPIs with builder modal
 * - Edit/delete existing KPIs
 * - Drag-and-drop reordering
 * - View shared KPIs from department
 */
export function KPIsTab() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-medium text-stone-900 dark:text-stone-100 mb-1">
          Mis KPIs Personalizados
        </h3>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          Crea y administra tus indicadores personalizados. Arrastra para reordenar.
        </p>
      </div>

      {/* KPI Grid */}
      <CustomKPIGrid
        includeShared={true}
      />
    </div>
  )
}
