// KPI Dashboard Page - Managers only
import { useNavigate } from 'react-router-dom'
import { TrendingUp, TrendingDown, Minus, CheckCircle } from 'lucide-react'
import { LoadingState } from '../../components/ui/LoadingState'
import { ErrorState } from '../../components/ui/ErrorState'
import { useTaskDashboard, useBlockedTasks, useTaskMutations } from '../../api'
import { BlockedTasksPanel } from '../../components/sections/tasks'
import type { ProjectHealth, TaskStatus } from '../../components/sections/tasks/types'

const healthConfig: Record<ProjectHealth, { bg: string; text: string }> = {
  GREEN: { bg: 'bg-emerald-400', text: 'text-emerald-600' },
  YELLOW: { bg: 'bg-amber-400', text: 'text-amber-600' },
  RED: { bg: 'bg-red-500', text: 'text-red-600' },
}

export function DashboardPage() {
  const navigate = useNavigate()
  const { kpis, projects, loading, error, refetch } = useTaskDashboard()
  const { data: blockedTasksData, loading: blockedLoading, refetch: refetchBlocked } = useBlockedTasks()
  const { changeStatus } = useTaskMutations()

  if (loading) {
    return <LoadingState message="Cargando dashboard..." />
  }

  if (error || !kpis) {
    return (
      <ErrorState
        title="Error al cargar Dashboard"
        message="No se pudo cargar la informacion de KPIs."
        error={error}
        onRetry={refetch}
      />
    )
  }

  const projectsList = projects || []
  const blockedTasks = blockedTasksData?.tasks || []
  const TrendIcon = kpis.team.trend === 'up' ? TrendingUp : kpis.team.trend === 'down' ? TrendingDown : Minus
  const trendColor = kpis.team.trend === 'up' ? 'text-emerald-500' : kpis.team.trend === 'down' ? 'text-red-500' : 'text-stone-500'

  const handleUnblock = async (taskId: string, newStatus: 'NEXT' | 'DOING') => {
    await changeStatus(taskId, newStatus as TaskStatus)
    refetchBlocked()
    refetch() // Refresh KPIs as well
  }

  const handleTaskClick = (taskId: string) => {
    navigate(`/tareas/mis-tareas?task=${taskId}`)
  }

  return (
    <div className="min-h-screen bg-stone-100">
      {/* Header */}
      <div className="border-b-2 border-stone-900 bg-white px-8 py-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="font-serif text-3xl font-bold text-stone-900">
            KPIs Dashboard
          </h1>
          <p className="text-stone-500 mt-1 font-mono text-sm uppercase tracking-wider">
            {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Main KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <KPICard
            label="PROYECTOS ACTIVOS"
            value={kpis.projects.active}
            sublabel={`${kpis.projects.at_risk} en riesgo`}
            color="amber"
          />
          <KPICard
            label="COMPLETADAS / SEM"
            value={kpis.tasks.completed_week}
            sublabel={`${kpis.tasks.completed_month} este mes`}
            color="emerald"
          />
          <KPICard
            label="TASA BLOQUEO"
            value={`${kpis.tasks.blocked_rate.toFixed(1)}%`}
            sublabel={`${kpis.tasks.blocked} bloqueadas`}
            color="red"
          />
          <KPICard
            label="VELOCITY"
            value={kpis.team.avg_velocity.toFixed(1)}
            sublabel={
              <span className={`flex items-center gap-1 ${trendColor}`}>
                <TrendIcon size={14} />
                {kpis.team.trend_delta}% vs sem. ant.
              </span>
            }
            color="cyan"
          />
        </div>

        {/* Two Column Layout */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Charts */}
          <div className="lg:col-span-2 space-y-6">
            {/* Health Distribution */}
            <div className="bg-white border-2 border-stone-900 shadow-[4px_4px_0_#1c1917] p-6">
              <h2 className="font-serif text-lg font-bold text-stone-900 mb-6 flex items-center gap-2 uppercase tracking-wider">
                <span className="w-4 h-4 bg-amber-400" />
                Health Distribution
              </h2>

              <div className="flex items-center gap-8">
                {/* Bar Chart */}
                <div className="flex-1 space-y-4">
                  {[
                    { label: 'ON TRACK', count: projectsList.filter(p => p.health === 'GREEN').length, color: 'bg-emerald-400' },
                    { label: 'AT RISK', count: projectsList.filter(p => p.health === 'YELLOW').length, color: 'bg-amber-400' },
                    { label: 'CRITICAL', count: projectsList.filter(p => p.health === 'RED').length, color: 'bg-red-500' },
                  ].map((item) => {
                    const total = projectsList.filter(p => p.status === 'ACTIVE').length || 1
                    const pct = (item.count / total) * 100
                    return (
                      <div key={item.label}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-stone-500 font-bold uppercase tracking-wider text-xs">{item.label}</span>
                          <span className="font-mono font-bold text-stone-900">{item.count}</span>
                        </div>
                        <div className="h-6 bg-stone-200 border-2 border-stone-300">
                          <div
                            className={`h-full ${item.color} transition-all duration-500`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Stats Box */}
                <div className="w-32 h-32 bg-stone-100 border-2 border-stone-900 flex flex-col items-center justify-center">
                  <span className="font-mono text-4xl font-bold text-stone-900">
                    {projectsList.filter(p => p.status === 'ACTIVE').length}
                  </span>
                  <span className="text-xs text-stone-500 uppercase tracking-wider font-bold">TOTAL</span>
                </div>
              </div>
            </div>

            {/* Weekly Completion Trend */}
            <div className="bg-white border-2 border-stone-900 shadow-[4px_4px_0_#1c1917] p-6">
              <h2 className="font-serif text-lg font-bold text-stone-900 mb-6 flex items-center gap-2 uppercase tracking-wider">
                <span className="w-4 h-4 bg-cyan-400" />
                Tendencia Semanal
              </h2>

              <div className="h-48 flex items-end justify-between gap-2">
                {[12, 8, 15, 10, 14, 18, kpis.tasks.completed_week].map((val, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center">
                    <div
                      className={`w-full border-2 transition-all duration-500 ${
                        i === 6
                          ? 'bg-amber-400 border-amber-500'
                          : 'bg-stone-300 border-stone-400'
                      }`}
                      style={{ height: `${(val / 20) * 100}%` }}
                    />
                    <span className="text-xs text-stone-500 mt-2 font-mono font-bold">
                      {['L', 'M', 'X', 'J', 'V', 'S', 'D'][i]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Lists */}
          <div className="space-y-6">
            {/* Blocked Tasks Panel */}
            <BlockedTasksPanel
              tasks={blockedTasks}
              onUnblock={handleUnblock}
              onTaskClick={handleTaskClick}
              loading={blockedLoading}
            />

            {/* Projects at Risk */}
            <div className="bg-white border-2 border-stone-900 shadow-[4px_4px_0_#1c1917] p-6">
              <h2 className="font-serif text-lg font-bold text-stone-900 mb-4 flex items-center gap-2 uppercase tracking-wider">
                <span className="w-4 h-4 bg-red-500 animate-pulse" />
                En Riesgo
              </h2>

              <div className="space-y-3">
                {projectsList
                  .filter(p => p.health === 'RED' || p.health === 'YELLOW')
                  .slice(0, 5)
                  .map((project) => (
                    <button
                      key={project.name}
                      onClick={() => navigate(`/tareas/proyectos/${project.name}`)}
                      className="
                        w-full text-left p-3
                        bg-stone-50 border-2 border-stone-300
                        hover:border-stone-900
                        hover:shadow-[2px_2px_0_#1c1917]
                        transition-all duration-75
                      "
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-stone-900 truncate">{project.title}</span>
                        <span className={`w-3 h-3 ${healthConfig[project.health].bg}`} />
                      </div>
                      <p className="text-sm text-stone-500 truncate">{project.health_reason}</p>
                    </button>
                  ))}

                {projectsList.filter(p => p.health !== 'GREEN').length === 0 && (
                  <div className="text-center py-4 text-stone-500">
                    <CheckCircle size={24} className="mx-auto mb-2 text-emerald-400" />
                    <p className="text-sm font-bold uppercase tracking-wider">Todos on track</p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white border-2 border-stone-900 shadow-[4px_4px_0_#1c1917] p-6">
              <h2 className="font-serif text-lg font-bold text-stone-900 mb-4 uppercase tracking-wider">
                Resumen
              </h2>

              <div className="space-y-0">
                {[
                  { label: 'TOTAL TAREAS', value: kpis.tasks.total, color: '' },
                  { label: 'TASA VENCIMIENTO', value: `${kpis.tasks.overdue_rate.toFixed(1)}%`, color: 'text-amber-500' },
                  { label: 'TAM. EQUIPO', value: kpis.team.size, color: '' },
                  { label: 'HEALTH RATE', value: `${kpis.projects.health_rate.toFixed(0)}%`, color: 'text-emerald-500' },
                ].map((item, i) => (
                  <div key={item.label} className={`flex items-center justify-between py-3 ${i < 3 ? 'border-b-2 border-stone-200' : ''}`}>
                    <span className="text-stone-500 text-xs font-bold uppercase tracking-wider">{item.label}</span>
                    <span className={`font-mono font-bold text-lg ${item.color || 'text-stone-900'}`}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface KPICardProps {
  label: string
  value: string | number
  sublabel: React.ReactNode
  color: 'amber' | 'emerald' | 'red' | 'cyan'
}

function KPICard({ label, value, sublabel, color }: KPICardProps) {
  const borderColors = {
    amber: 'border-t-amber-400',
    emerald: 'border-t-emerald-400',
    red: 'border-t-red-500',
    cyan: 'border-t-cyan-400',
  }

  return (
    <div className={`
      relative p-5
      bg-white
      border-2 border-stone-900
      border-t-4 ${borderColors[color]}
      shadow-[4px_4px_0_#1c1917]
    `}>
      <p className="text-xs text-stone-500 font-bold uppercase tracking-wider mb-2">
        {label}
      </p>
      <p className="font-mono text-4xl font-bold text-stone-900 tracking-tight">
        {value}
      </p>
      <p className="text-sm mt-1 text-stone-500">
        {sublabel}
      </p>
    </div>
  )
}

export default DashboardPage
