// =============================================================================
// Data Types - Marketing & Growth
// =============================================================================

export interface MarketingKPI {
  value: number
  previousValue: number
  change: number
  label: string
}

export interface MarketingKPIs {
  leadsGenerated: MarketingKPI
  engagementRate: MarketingKPI
  campaignROI: MarketingKPI
  followerGrowth: MarketingKPI
}

export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed'
export type CampaignChannel = 'instagram' | 'facebook' | 'tiktok' | 'email' | 'pos'

export interface CampaignMetrics {
  impressions: number
  clicks: number
  leads: number
  conversions: number
  spent: number
}

export interface Campaign {
  id: string
  name: string
  objective: string
  status: CampaignStatus
  channels: CampaignChannel[]
  budget: number
  spent: number
  startDate: string
  endDate: string
  metrics: CampaignMetrics
}

export type SocialPlatform = 'instagram' | 'facebook' | 'tiktok'
export type PostStatus = 'published' | 'scheduled' | 'draft'

export interface SocialPost {
  id: string
  platforms: SocialPlatform[]
  content: string
  mediaType?: 'image' | 'video' | 'carousel'
  status: PostStatus
  scheduledDate?: string
  publishedDate?: string
  metrics?: {
    likes: number
    comments: number
    shares: number
    reach: number
  }
}

export interface PlatformStats {
  platform: SocialPlatform
  followers: number
  followersChange: number
  engagementRate: number
  postsThisMonth: number
}

export interface FunnelStage {
  name: string
  value: number
  conversionRate: number
}

export interface ChannelAttribution {
  channel: string
  leads: number
  conversions: number
  revenue: number
  roi: number
}

export interface MonthlyTrend {
  period: string
  leads: number
  conversions: number
  revenue: number
}

// =============================================================================
// Component Props
// =============================================================================

export interface MarketingDashboardProps {
  kpis: MarketingKPIs
  activeCampaigns: Campaign[]
  recentPosts: SocialPost[]
  platformStats: PlatformStats[]
  onViewCampaign?: (id: string) => void
  onViewPost?: (id: string) => void
  onNewCampaign?: () => void
  onNewPost?: () => void
}

export interface CampaignsProps {
  campaigns: Campaign[]
  onViewCampaign?: (id: string) => void
  onNewCampaign?: () => void
  onPauseCampaign?: (id: string) => void
}

export interface SocialMediaProps {
  posts: SocialPost[]
  platformStats: PlatformStats[]
  onViewPost?: (id: string) => void
  onNewPost?: () => void
}

export interface MarketingAnalyticsProps {
  funnel: FunnelStage[]
  channelAttribution: ChannelAttribution[]
  monthlyTrend: MonthlyTrend[]
}
