import type { MarketingDashboardProps, MarketingKPIs, Campaign, SocialPost, PlatformStats } from '../types'
import { TrendingUp, TrendingDown, Minus, Plus, Eye, Pause, Instagram, Facebook, Play } from 'lucide-react'

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
      bg-white dark:bg-stone-900
      border-2 border-stone-900 dark:border-stone-100
      p-4 lg:p-6
      shadow-[4px_4px_0_#1c1917] dark:shadow-[4px_4px_0_#fafaf9]
    ">
      <div className="font-mono text-3xl lg:text-4xl font-bold text-stone-900 dark:text-stone-100 mb-1">
        {formatValue(kpi.value)}
      </div>
      <div className="w-12 h-0.5 bg-stone-900 dark:bg-stone-100 mb-2" />
      <div className="font-sans text-xs uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-2">
        {kpi.label}
      </div>
      <div className={`
        flex items-center gap-1 font-mono text-sm font-medium
        ${isPositive ? 'text-green-600 dark:text-green-400' : ''}
        ${isNegative ? 'text-red-600 dark:text-red-400' : ''}
        ${!isPositive && !isNegative ? 'text-stone-400' : ''}
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
  draft: { bg: 'bg-stone-100 dark:bg-stone-700', text: 'text-stone-600 dark:text-stone-300', label: 'Borrador' },
  active: { bg: 'bg-green-100 dark:bg-green-900', text: 'text-green-700 dark:text-green-300', label: 'Activa' },
  paused: { bg: 'bg-amber-100 dark:bg-amber-900', text: 'text-amber-700 dark:text-amber-300', label: 'Pausada' },
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
      bg-white dark:bg-stone-900
      border-2 border-stone-900 dark:border-stone-100
      p-4
      shadow-[4px_4px_0_#1c1917] dark:shadow-[4px_4px_0_#fafaf9]
    ">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-medium text-stone-900 dark:text-stone-100">{campaign.name}</h3>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">{campaign.objective}</p>
        </div>
        <span className={`px-2 py-0.5 text-[10px] uppercase tracking-wider ${status.bg} ${status.text}`}>
          {status.label}
        </span>
      </div>

      <div className="flex items-center gap-2 mb-3">
        {campaign.channels.map((channel) => (
          <span
            key={channel}
            className="w-6 h-6 flex items-center justify-center bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400"
          >
            {channelIcons[channel]}
          </span>
        ))}
      </div>

      <div className="mb-3">
        <div className="flex items-center justify-between text-xs text-stone-500 mb-1">
          <span>Presupuesto</span>
          <span className="font-mono">${campaign.spent.toLocaleString()} / ${campaign.budget.toLocaleString()}</span>
        </div>
        <div className="w-full h-1.5 bg-stone-200 dark:bg-stone-700">
          <div
            className={`h-full transition-all ${
              budgetProgress >= 90 ? 'bg-red-500' :
              budgetProgress >= 70 ? 'bg-amber-400' : 'bg-cyan-500'
            }`}
            style={{ width: `${Math.min(budgetProgress, 100)}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3 text-center">
        <div>
          <div className="font-mono text-lg font-bold text-stone-900 dark:text-stone-100">
            {campaign.metrics.leads}
          </div>
          <div className="text-[10px] uppercase text-stone-400">Leads</div>
        </div>
        <div>
          <div className="font-mono text-lg font-bold text-stone-900 dark:text-stone-100">
            {campaign.metrics.clicks.toLocaleString()}
          </div>
          <div className="text-[10px] uppercase text-stone-400">Clicks</div>
        </div>
        <div>
          <div className="font-mono text-lg font-bold text-stone-900 dark:text-stone-100">
            {campaign.metrics.conversions}
          </div>
          <div className="text-[10px] uppercase text-stone-400">Conv.</div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onView}
          className="flex-1 px-3 py-1.5 text-xs uppercase tracking-wider font-medium text-stone-700 dark:text-stone-300 border border-stone-300 dark:border-stone-600 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
        >
          Ver Detalle
        </button>
        {campaign.status === 'active' && (
          <button
            onClick={onPause}
            className="p-1.5 border border-stone-300 dark:border-stone-600 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <Pause size={14} className="text-stone-500" />
          </button>
        )}
      </div>
    </div>
  )
}

const platformColors: Record<string, string> = {
  instagram: 'from-purple-500 to-pink-500',
  facebook: 'bg-blue-600',
  tiktok: 'bg-stone-900 dark:bg-stone-100',
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
      bg-white dark:bg-stone-900
      border-2 border-stone-900 dark:border-stone-100
      p-4
      shadow-[4px_4px_0_#1c1917] dark:shadow-[4px_4px_0_#fafaf9]
    ">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 flex items-center justify-center text-white ${
          stats.platform === 'instagram' ? 'bg-gradient-to-br from-purple-500 to-pink-500' :
          stats.platform === 'facebook' ? 'bg-blue-600' : 'bg-stone-900 dark:bg-stone-100 dark:text-stone-900'
        }`}>
          <Icon size={20} />
        </div>
        <div>
          <div className="font-mono text-xl font-bold text-stone-900 dark:text-stone-100">
            {stats.followers.toLocaleString()}
          </div>
          <div className="text-xs text-green-600">+{stats.followersChange} este mes</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-center">
        <div>
          <div className="font-mono text-lg font-bold text-stone-900 dark:text-stone-100">
            {stats.engagementRate}%
          </div>
          <div className="text-[10px] uppercase text-stone-400">Engagement</div>
        </div>
        <div>
          <div className="font-mono text-lg font-bold text-stone-900 dark:text-stone-100">
            {stats.postsThisMonth}
          </div>
          <div className="text-[10px] uppercase text-stone-400">Posts</div>
        </div>
      </div>
    </div>
  )
}

export function MarketingDashboard({
  kpis,
  activeCampaigns,
  recentPosts,
  platformStats,
  onViewCampaign,
  onViewPost,
  onNewCampaign,
  onNewPost
}: MarketingDashboardProps) {
  const kpiConfig: { key: keyof MarketingKPIs; format: 'number' | 'percent' | 'roi' }[] = [
    { key: 'leadsGenerated', format: 'number' },
    { key: 'engagementRate', format: 'percent' },
    { key: 'campaignROI', format: 'roi' },
    { key: 'followerGrowth', format: 'number' },
  ]

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-serif text-2xl lg:text-3xl font-bold text-stone-900 dark:text-stone-100">
            Marketing
          </h1>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
            Campanas, redes sociales y analytics
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onNewPost}
            className="
              inline-flex items-center gap-2 px-4 py-2
              bg-white dark:bg-stone-800
              text-stone-700 dark:text-stone-300 font-medium text-sm uppercase tracking-wider
              border-2 border-stone-900 dark:border-stone-100
              hover:bg-stone-100 dark:hover:bg-stone-700
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
              bg-amber-400 dark:bg-amber-500
              text-stone-900 font-medium text-sm uppercase tracking-wider
              border-2 border-stone-900 dark:border-stone-100
              shadow-[4px_4px_0_#1c1917] dark:shadow-[4px_4px_0_#fafaf9]
              hover:translate-x-[2px] hover:translate-y-[2px]
              hover:shadow-[2px_2px_0_#1c1917] dark:hover:shadow-[2px_2px_0_#fafaf9]
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

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Campaigns */}
        <div className="lg:col-span-2">
          <h2 className="font-serif text-lg font-bold text-stone-900 dark:text-stone-100 mb-4">
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
          <h2 className="font-serif text-lg font-bold text-stone-900 dark:text-stone-100 mb-4">
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
