// Marketing API service
import { frappe } from '../frappe-client'
import type {
  MarketingKPIs,
  Campaign,
  SocialPost,
  PlatformStats,
  CampaignStatus
} from '../../components/sections/marketing-and-growth/types'

// Backend campaign response type
interface BackendCampaign {
  name: string
  campaign_name: string
  campaign_type?: string
  status?: string
  budget?: number
  actual_cost?: number
  expected_revenue?: number
  creation?: string
  leads?: number
  roi?: number
}

// Transform backend campaign to frontend Campaign type
function transformCampaign(bc: BackendCampaign): Campaign {
  const statusMap: Record<string, CampaignStatus> = {
    'Planned': 'draft',
    'In Progress': 'active',
    'Completed': 'completed',
    'Cancelled': 'paused',
  }
  const rawStatus = bc.status || bc.campaign_type || 'Active'
  const status = statusMap[rawStatus] || 'active'

  return {
    id: bc.name,
    name: bc.campaign_name || bc.name,
    objective: bc.campaign_type || 'Campaign',
    status,
    channels: ['email'], // Default channel since Frappe Campaign doesn't track this
    budget: bc.budget || 0,
    spent: bc.actual_cost || 0,
    startDate: bc.creation?.split(' ')[0] || new Date().toISOString().split('T')[0],
    endDate: '', // Not available in standard Campaign
    metrics: {
      impressions: 0,
      clicks: 0,
      leads: bc.leads || 0,
      conversions: 0,
      spent: bc.actual_cost || 0
    }
  }
}

export const marketingApi = {
  async getKPIs(): Promise<MarketingKPIs> {
    const data = await frappe.call<MarketingKPIs>(
      'workhub_frappe_app.api.marketing.get_kpis'
    )
    return data
  },

  async getActiveCampaigns(): Promise<Campaign[]> {
    const data = await frappe.call<BackendCampaign[]>(
      'workhub_frappe_app.api.marketing.get_active_campaigns'
    )
    return data.map(transformCampaign)
  },

  async getRecentPosts(): Promise<SocialPost[]> {
    const data = await frappe.call<SocialPost[]>(
      'workhub_frappe_app.api.marketing.get_recent_posts'
    )
    return data
  },

  async getPlatformStats(): Promise<PlatformStats[]> {
    const data = await frappe.call<PlatformStats[]>(
      'workhub_frappe_app.api.marketing.get_platform_stats'
    )
    return data
  },

  async createCampaign(campaign: { name: string; budget?: number; description?: string }): Promise<string> {
    const data = await frappe.call<{ campaign_id: string }>(
      'workhub_frappe_app.api.marketing.create_campaign',
      {
        data: {
          campaign_name: campaign.name,
          budget: campaign.budget || 0,
          description: campaign.description || ''
        }
      }
    )
    return data.campaign_id
  },

  async createPost(post: { platform: string; content: string }): Promise<string> {
    const data = await frappe.call<{ post_id: string }>(
      'workhub_frappe_app.api.marketing.create_post',
      {
        data: {
          platform: post.platform,
          content: post.content
        }
      }
    )
    return data.post_id
  }
}

export default marketingApi
