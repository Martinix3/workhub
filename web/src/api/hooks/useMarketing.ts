// React hooks for Marketing data
import marketingApi from '../services/marketing'
import {
  sampleMarketingKPIs,
  sampleCampaigns,
  sampleSocialPosts,
  samplePlatformStats
} from '../sample-data'
import type {
  MarketingKPIs,
  Campaign,
  SocialPost,
  PlatformStats
} from '../../components/sections/marketing-and-growth/types'
import { createDataHook } from './createDataHook'

export const useMarketingKPIs = createDataHook<MarketingKPIs>({
  apiMethod: marketingApi.getKPIs,
  sampleData: sampleMarketingKPIs,
  errorMessage: 'Failed to fetch KPIs'
})

export const useActiveCampaigns = createDataHook<Campaign[]>({
  apiMethod: marketingApi.getActiveCampaigns,
  sampleData: sampleCampaigns,
  errorMessage: 'Failed to fetch campaigns'
})

export const useRecentPosts = createDataHook<SocialPost[]>({
  apiMethod: marketingApi.getRecentPosts,
  sampleData: sampleSocialPosts,
  errorMessage: 'Failed to fetch posts'
})

export const usePlatformStats = createDataHook<PlatformStats[]>({
  apiMethod: marketingApi.getPlatformStats,
  sampleData: samplePlatformStats,
  errorMessage: 'Failed to fetch stats'
})

export function useMarketingDashboard() {
  const kpis = useMarketingKPIs()
  const campaigns = useActiveCampaigns()
  const posts = useRecentPosts()
  const stats = usePlatformStats()

  return {
    kpis: kpis.data,
    activeCampaigns: campaigns.data,
    recentPosts: posts.data,
    platformStats: stats.data,
    loading: kpis.loading || campaigns.loading || posts.loading || stats.loading,
    error: kpis.error || campaigns.error || posts.error || stats.error,
    refetch: async () => {
      await Promise.all([kpis.refetch(), campaigns.refetch(), posts.refetch(), stats.refetch()])
    },
    createCampaign: marketingApi.createCampaign,
    createPost: marketingApi.createPost
  }
}
