# Test Instructions: Marketing & Growth

These test-writing instructions are **framework-agnostic**. Adapt them to your testing setup.

## Overview

Test marketing campaigns, social media management, and analytics.

---

## User Flow Tests

### Flow 1: Ver Dashboard Marketing

**Scenario:** User views marketing dashboard

**Steps:**
1. Navigate to `/marketing`
2. View KPIs and activity

**Expected Results:**
- [ ] Shows "Leads Generados" KPI
- [ ] Shows "Engagement Rate" as percentage
- [ ] Shows "ROI Campanas" percentage
- [ ] Shows "Nuevos Seguidores" count
- [ ] Active campaigns list visible
- [ ] Recent posts feed visible

### Flow 2: Crear Campana

**Scenario:** User creates a new marketing campaign

**Steps:**
1. Navigate to `/marketing/campanas`
2. Click "Nueva Campana"
3. Enter name and objective
4. Set budget
5. Select channels (multi-select)
6. Set start and end dates
7. Save as draft or activate

**Expected Results:**
- [ ] Form validates required fields
- [ ] Channel multi-select works (Instagram, Facebook, TikTok, Email, POS)
- [ ] Date pickers work correctly
- [ ] `onNewCampaign` called with campaign data
- [ ] Campaign appears in list with correct status

### Flow 3: Pausar Campana Activa

**Scenario:** User pauses a running campaign

**Steps:**
1. View campaign list
2. Find active campaign
3. Click pause button
4. Confirm action

**Expected Results:**
- [ ] Confirmation dialog appears
- [ ] `onPauseCampaign` called with campaign ID
- [ ] Campaign status changes to "paused"
- [ ] Budget spent is preserved

---

## Empty State Tests

### No Campaigns

**Setup:**
- `campaigns` array is empty

**Expected Results:**
- [ ] Shows "Crea tu primera campana de marketing"
- [ ] CTA button visible
- [ ] KPIs show zeros or N/A

### No Posts

**Setup:**
- `posts` array is empty

**Expected Results:**
- [ ] Shows "Programa tu primer post"
- [ ] Create post button visible

### No Analytics Data

**Setup:**
- Funnel and attribution data empty

**Expected Results:**
- [ ] Shows "Los datos apareceran cuando tengas campanas activas"
- [ ] Charts show empty state

---

## Component Interaction Tests

### MarketingDashboard

**Renders correctly:**
- [ ] 4 KPI cards with correct data
- [ ] Campaign list with status badges
- [ ] Platform stats section
- [ ] Recent posts feed

**Campaign status badges:**
- [ ] "draft": gray badge
- [ ] "active": green badge
- [ ] "paused": amber badge
- [ ] "completed": blue badge

**Platform stats:**
- [ ] Shows followers and change
- [ ] Shows engagement rate
- [ ] Icons for each platform

---

## Edge Cases

- [ ] Campaign with $0 budget
- [ ] Post scheduled for past date (should show as past due)
- [ ] Very high engagement rate (handle >100%)
- [ ] Campaign spanning multiple months

---

## Sample Test Data

```typescript
const mockMarketingKPIs = {
  leadsGenerated: { value: 245, change: 23.7, label: "Leads Generados" },
  engagementRate: { value: 4.8, change: 14.3, label: "Engagement Rate" },
  campaignROI: { value: 320, change: 14.3, label: "ROI Campanas" },
  followerGrowth: { value: 1250, change: 27.6, label: "Nuevos Seguidores" }
}

const mockCampaign = {
  id: "camp-001",
  name: "Promo Navidad 2024",
  objective: "Aumentar ventas Q4 en 25%",
  status: "active",
  channels: ["instagram", "facebook", "email"],
  budget: 50000,
  spent: 32500,
  metrics: { impressions: 125000, clicks: 4500, leads: 180, conversions: 45 }
}

const mockPost = {
  id: "post-001",
  platforms: ["instagram", "facebook"],
  content: "Felices fiestas! Usa codigo NAVIDAD24...",
  status: "published",
  metrics: { likes: 456, comments: 32, shares: 28, reach: 8500 }
}

// Empty states
const emptyCampaigns: Campaign[] = []
const emptyPosts: SocialPost[] = []
```
