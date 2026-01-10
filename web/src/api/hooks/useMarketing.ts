// React hooks for Marketing data
import { useState, useEffect, useCallback } from 'react'
import marketingApi from '../services/marketing'
import {
  isInBypassMode,
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

interface UseDataState<T> {
  data: T | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export function useMarketingKPIs(): UseDataState<MarketingKPIs> {
  const [data, setData] = useState<MarketingKPIs | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const kpis = await marketingApi.getKPIs()
      setData(kpis)
    } catch (err) {
      if (isInBypassMode()) {
        setData(sampleMarketingKPIs)
      } else {
        setError(err instanceof Error ? err : new Error('Failed to fetch KPIs'))
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, error, refetch: fetch }
}

export function useActiveCampaigns(): UseDataState<Campaign[]> {
  const [data, setData] = useState<Campaign[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const campaigns = await marketingApi.getActiveCampaigns()
      setData(campaigns)
    } catch (err) {
      if (isInBypassMode()) {
        setData(sampleCampaigns)
      } else {
        setError(err instanceof Error ? err : new Error('Failed to fetch campaigns'))
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, error, refetch: fetch }
}

export function useRecentPosts(): UseDataState<SocialPost[]> {
  const [data, setData] = useState<SocialPost[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const posts = await marketingApi.getRecentPosts()
      setData(posts)
    } catch (err) {
      if (isInBypassMode()) {
        setData(sampleSocialPosts)
      } else {
        setError(err instanceof Error ? err : new Error('Failed to fetch posts'))
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, error, refetch: fetch }
}

export function usePlatformStats(): UseDataState<PlatformStats[]> {
  const [data, setData] = useState<PlatformStats[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const stats = await marketingApi.getPlatformStats()
      setData(stats)
    } catch (err) {
      if (isInBypassMode()) {
        setData(samplePlatformStats)
      } else {
        setError(err instanceof Error ? err : new Error('Failed to fetch stats'))
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, error, refetch: fetch }
}

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
