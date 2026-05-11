import type { MarketingDashboardProps, MarketingKPIs, Campaign, PlatformStats } from './types'
import { TrendingUp, TrendingDown, Minus, Plus, Pause, Instagram, Facebook } from 'lucide-react'
import { CustomKPIGrid } from '../../kpi-builder'
import { useCustomKPIs } from '../../../api'

interface KPICardProps {
  kpi: { value: number; previousValue: number; change: number; label: string }
  format?: 'number' | 'percent' | 'roi'
}

function KPICard({ kpi, format = 'number' }: KPICardProps) {
  const isPositive = kpi.change > 0
  const isNegative = kpi.change < 0

  const formatValue = (value: number) => {
    if (format === 'percent') return `${value}%`
    if (format === 'roi') return `${value}%`
    if (value >= 1000) return value.toLocaleString()
    return value.toString()
  }

  return (
    <div className="
      bg-white dark:bg-neutral-900
      border border-neutral-200 dark:border-neutral-100
      p-4 lg:p-6
    ">
      <div className="font-mono text-3xl lg:text-4xl font-bold text-neutral-900 dark:text-neutral-100 mb-1">
        {formatValue(kpi.value)}
      </div>
      <div className="w-12 h-0.5 bg-neutral-900 dark:bg-neutral-100 mb-2" />
      <div className="font-sans text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-2">
        {kpi.label}
      </div>
      <div className={`
        flex items-center gap-1 font-mono text-sm font-medium
        ${isPositive ? 'text-success-dark dark:text-success' : ''}
        ${isNegative ? 'text-error-dark dark:text-error' : ''}
        ${!isPositive && !isNegative ? 'text-neutral-400' : ''}
      `}>
        {isPositive && <TrendingUp size={14} />}
        {isNegative && <TrendingDown size={14} />}
        {!isPositive && !isNegative && <Minus size={14} />}
        <span>{isPositive && '+'}{kpi.change.toFixed(1)}%</span>
      </div>
    </div>
  )
}

const statusConfig = {
  draft: { bg: 'bg-neutral-100 dark:bg-neutral-700', text: 'text-neutral-600 dark:text-neutral-300', label: 'Borrador' },
  active: { bg: 'bg-success-light dark:bg-success-dark', text: 'text-success-text dark:text-success', label: 'Activa' },
  paused: { bg: 'bg-gold-light dark:bg-gold-dark', text: 'text-gold-dark dark:text-gold', label: 'Pausada' },
  completed: { bg: 'bg-cyan-100 dark:bg-cyan-900', text: 'text-cyan-700 dark:text-cyan-300', label: 'Completada' },
}

const channelIcons: Record<string, React.ReactNode> = {
  instagram: <Instagram size={12} />,
  facebook: <Facebook size={12} />,
  tiktok: <span className="text-[10px] font-bold">TT</span>,
  email: <span className="text-[10px] font-bold">@</span>,
  pos: <span className="text-[10px] font-bold">POS</span>,
}

interface CampaignCardProps {
  campaign: Campaign
  onView?: () => void
  onPause?: () => void
}

function CampaignCard({ campaign, onView, onPause }: CampaignCardProps) {
  const status = statusConfig[campaign.status]
  const budgetProgress = (campaign.spent / campaign.budget) * 100

  return (
    <div className="
      bg-white dark:bg-neutral-900
      border border-neutral-200 dark:border-neutral-100
      p-4
    ">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-medium text-neutral-900 dark:text-neutral-100">{campaign.name}</h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{campaign.objective}</p>
        </div>
        <span className={`px-2 py-0.5 text-[10px] uppercase tracking-wider ${status.bg} ${status.text}`}>
          {status.label}
        </span>
      </div>

      <div className="flex items-center gap-2 mb-3">
        {campaign.channels.map((channel) => (
          <span
            key={channel}
            className="w-6 h-6 flex items-center justify-center bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
          >
            {channelIcons[channel]}
          </span>
        ))}
      </div>

      <div className="mb-3">
        <div className="flex items-center justify-between text-xs text-neutral-500 mb-1">
          <span>Presupuesto</span>
          <span className="font-mono">${campaign.spent.toLocaleString()} / ${campaign.budget.toLocaleString()}</span>
        </div>
        <div className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-700">
          <div
            className={`h-full transition-all ${
              budgetProgress >= 90 ? 'bg-error' :
              budgetProgress >= 70 ? 'bg-gold' : 'bg-cyan-500'
            }`}
            style={{ width: `${Math.min(budgetProgress, 100)}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3 text-center">
        <div>
          <div className="font-mono text-lg font-bold text-neutral-900 dark:text-neutral-100">
            {campaign.metrics.leads}
          </div>
          <div className="text-[10px] uppercase text-neutral-400">Leads</div>
        </div>
        <div>
          <div className="font-mono text-lg font-bold text-neutral-900 dark:text-neutral-100">
            {campaign.metrics.clicks.toLocaleString()}
          </div>
          <div className="text-[10px] uppercase text-neutral-400">Clicks</div>
        </div>
        <div>
          <div className="font-mono text-lg font-bold text-neutral-900 dark:text-neutral-100">
            {campaign.metrics.conversions}
          </div>
          <div className="text-[10px] uppercase text-neutral-400">Conv.</div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onView}
          className="flex-1 px-3 py-1.5 text-xs uppercase tracking-wider font-medium text-neutral-700 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        >
          Ver Detalle
        </button>
        {campaign.status === 'active' && (
          <button
            onClick={onPause}
            className="p-1.5 border border-neutral-300 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <Pause size={14} className="text-neutral-500" />
          </button>
        )}
      </div>
    </div>
  )
}

interface PlatformCardProps {
  stats: PlatformStats
}

function PlatformCard({ stats }: PlatformCardProps) {
  const Icon = stats.platform === 'instagram' ? Instagram :
               stats.platform === 'facebook' ? Facebook :
               () => <span className="text-sm font-bold">TT</span>

  return (
    <div className="
      bg-white dark:bg-neutral-900
      border border-neutral-200 dark:border-neutral-100
      p-4
    ">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 flex items-center justify-center text-white ${
          stats.platform === 'instagram' ? 'bg-gradient-to-br from-purple-500 to-pink-500' :
          stats.platform === 'facebook' ? 'bg-turquoise-dark' : 'bg-neutral-900 dark:bg-neutral-100 dark:text-neutral-900'
        }`}>
          <Icon size={20} />
        </div>
        <div>
          <div className="font-mono text-xl font-bold text-neutral-900 dark:text-neutral-100">
            {stats.followers.toLocaleString()}
          </div>
          <div className="text-xs text-success-dark">+{stats.followersChange} este mes</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-center">
        <div>
          <div className="font-mono text-lg font-bold text-neutral-900 dark:text-neutral-100">
            {stats.engagementRate}%
          </div>
          <div className="text-[10px] uppercase text-neutral-400">Engagement</div>
        </div>
        <div>
          <div className="font-mono text-lg font-bold text-neutral-900 dark:text-neutral-100">
            {stats.postsThisMonth}
          </div>
          <div className="text-[10px] uppercase text-neutral-400">Posts</div>
        </div>
      </div>
    </div>
  )
}

export function MarketingDashboard({
  kpis,
  activeCampaigns,
  recentPosts: _recentPosts,
  platformStats,
  onViewCampaign,
  onViewPost: _onViewPost,
  onNewCampaign,
  onNewPost
}: MarketingDashboardProps) {
  const kpiConfig: { key: keyof MarketingKPIs; format: 'number' | 'percent' | 'roi' }[] = [
    { key: 'leadsGenerated', format: 'number' },
    { key: 'engagementRate', format: 'percent' },
    { key: 'campaignROI', format: 'roi' },
    { key: 'followerGrowth', format: 'number' },
  ]

  // Fetch custom KPIs for MKT department
  const { data: customKPIs } = useCustomKPIs('MKT', true)

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-heading text-2xl lg:text-3xl font-bold text-neutral-900 dark:text-neutral-100">
            Marketing
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Campanas, redes sociales y analytics
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onNewPost}
            className="
              inline-flex items-center gap-2 px-4 py-2
              bg-white dark:bg-neutral-800
              text-neutral-700 dark:text-neutral-300 font-medium text-sm uppercase tracking-wider
              border border-neutral-200 dark:border-neutral-100
              hover:bg-neutral-100 dark:hover:bg-neutral-700
              transition-colors
            "
          >
            <Plus size={16} />
            Post
          </button>
          <button
            onClick={onNewCampaign}
            className="
              inline-flex items-center gap-2 px-4 py-2
              bg-gold dark:bg-gold-dark
              text-neutral-900 font-medium text-sm uppercase tracking-wider
              border border-neutral-200 dark:border-neutral-100
              transition-all duration-75
            "
          >
            <Plus size={16} />
            Campana
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpiConfig.map(({ key, format }) => (
          <KPICard key={key} kpi={kpis[key]} format={format} />
        ))}
      </div>

      {/* Custom KPIs Section - Only show if there are custom KPIs */}
      {customKPIs && customKPIs.length > 0 && (
        <div className="mb-8">
          {/* Section Header */}
          <div className="mb-4">
            <h2 className="font-heading text-xl font-bold text-neutral-900 dark:text-neutral-100">
              KPIs Personalizados
            </h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
              Tus indicadores personalizados de marketing
            </p>
          </div>

          {/* Custom KPI Grid */}
          <CustomKPIGrid
            department="MKT"
            includeShared={true}
          />
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Campaigns */}
        <div className="lg:col-span-2">
          <h2 className="font-heading text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-4">
            Campanas Activas
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {activeCampaigns.filter(c => c.status === 'active').map((campaign) => (
              <CampaignCard
                key={campaign.id}
                campaign={campaign}
                onView={() => onViewCampaign?.(campaign.id)}
              />
            ))}
          </div>
        </div>

        {/* Platform Stats */}
        <div>
          <h2 className="font-heading text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-4">
            Redes Sociales
          </h2>
          <div className="space-y-4">
            {platformStats.map((stats) => (
              <PlatformCard key={stats.platform} stats={stats} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
