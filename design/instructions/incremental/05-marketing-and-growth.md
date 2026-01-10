# Milestone 5: Marketing & Growth

> **Provide alongside:** `product-overview.md`
> **Prerequisites:** Milestone 1 (Foundation) complete

---

## About These Instructions

**What you're receiving:**
- Finished UI designs (React components with full styling)
- Data model definitions (TypeScript types and sample data)
- UI/UX specifications (user flows, requirements, screenshots)
- Design system tokens (colors, typography, spacing)
- Test-writing instructions for each section (for TDD approach)

**What you need to build:**
- Backend API endpoints and database schema
- Authentication and authorization
- Data fetching and state management
- Business logic and validation
- Integration of the provided UI components with real data

**Important guidelines:**
- **DO NOT** redesign or restyle the provided components - use them as-is
- **DO** wire up the callback props to your routing and API calls
- **DO** replace sample data with real data from your backend
- **DO** implement proper error handling and loading states
- **DO** implement empty states when no records exist
- **DO** use test-driven development - write tests first using `tests.md` instructions

---

## Goal

Implement the Marketing & Growth feature - marketing y crecimiento comercial.

## Overview

Modulo de marketing y crecimiento comercial que gestiona campanas promocionales, presencia en redes sociales, y analytics de desempeno de marca. Enfoque en ROI de campanas y engagement con audiencia.

**Key Functionality:**
- Dashboard con KPIs de leads, engagement, ROI
- Gestion de campanas con presupuesto y metricas
- Vista consolidada de redes sociales
- Programacion de posts
- Analytics con funnel de conversion y atribucion

## Recommended Approach: Test-Driven Development

See `product-plan/sections/marketing-and-growth/tests.md` for detailed test-writing instructions.

## What to Implement

### Components

Copy the section components from `product-plan/sections/marketing-and-growth/components/`:

- `MarketingDashboard.tsx` - Main dashboard with KPIs and activity

### Data Layer

The components expect these data shapes:

```typescript
interface MarketingKPI {
  value: number
  previousValue: number
  change: number
  label: string
}

interface Campaign {
  id: string
  name: string
  objective: string
  status: 'draft' | 'active' | 'paused' | 'completed'
  channels: ('instagram' | 'facebook' | 'tiktok' | 'email' | 'pos')[]
  budget: number
  spent: number
  metrics: {
    impressions: number
    clicks: number
    leads: number
    conversions: number
  }
}

interface SocialPost {
  id: string
  platforms: ('instagram' | 'facebook' | 'tiktok')[]
  content: string
  status: 'published' | 'scheduled' | 'draft'
  scheduledDate?: string
  metrics?: {
    likes: number
    comments: number
    shares: number
    reach: number
  }
}

interface PlatformStats {
  platform: 'instagram' | 'facebook' | 'tiktok'
  followers: number
  followersChange: number
  engagementRate: number
  postsThisMonth: number
}
```

### Callbacks

Wire up these user actions:

| Callback | Description |
|----------|-------------|
| `onViewCampaign` | Navigate to campaign detail |
| `onNewCampaign` | Create new campaign |
| `onPauseCampaign` | Pause active campaign |
| `onViewPost` | Navigate to post detail |
| `onNewPost` | Open post creation modal |

### Empty States

- **No campaigns:** Show "Crea tu primera campana de marketing"
- **No posts:** Show "Programa tu primer post"
- **No analytics data:** Show "Los datos apareceran cuando tengas campanas activas"

## Files to Reference

- `product-plan/sections/marketing-and-growth/README.md` - Feature overview
- `product-plan/sections/marketing-and-growth/tests.md` - Test-writing instructions
- `product-plan/sections/marketing-and-growth/components/` - React components
- `product-plan/sections/marketing-and-growth/types.ts` - TypeScript interfaces
- `product-plan/sections/marketing-and-growth/sample-data.json` - Test data

## Expected User Flows

### Flow 1: Crear Campana

1. User accesses Campaigns
2. User clicks "Nueva Campana"
3. User defines name, objective, budget
4. User selects channels (multi-select)
5. User defines start and end dates
6. User configures target audience
7. **Outcome:** Campaign saved as draft or activated

### Flow 2: Programar Post Social

1. User accesses Social Media
2. User clicks "Nuevo Post"
3. User selects platforms (multi-select)
4. User writes content and attaches media
5. User selects publish date/time
6. User previews in each platform format
7. **Outcome:** Post scheduled

### Flow 3: Revisar ROI de Campana

1. User accesses campaign detail
2. User sees real-time metrics
3. User compares vs objective
4. User can adjust budget or pause
5. **Outcome:** On completion, generates report

## Done When

- [ ] Tests written for key user flows
- [ ] All tests pass
- [ ] Dashboard shows marketing KPIs
- [ ] Campaigns list with status and budget progress
- [ ] Campaign creation/editing works
- [ ] Social media feed shows posts (past and scheduled)
- [ ] Platform stats display correctly
- [ ] Analytics charts render (funnel, attribution, trends)
- [ ] Empty states display properly
- [ ] Responsive on mobile
