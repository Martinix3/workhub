# Marketing & Growth

## Overview

Modulo de marketing y crecimiento comercial. Gestiona campanas promocionales, presencia en redes sociales, y analytics de desempeno de marca con enfoque en ROI.

## User Flows

1. **Crear Campana:** Define objetivo -> Set presupuesto -> Selecciona canales -> Activar
2. **Programar Post:** Selecciona plataformas -> Escribe contenido -> Agenda fecha -> Confirmar
3. **Revisar ROI:** Ver metricas -> Comparar vs objetivo -> Ajustar o pausar

## Design Decisions

- Dashboard muestra KPIs de leads y engagement prominentes
- Campanas con barra de progreso de presupuesto
- Posts con iconos de plataforma
- Analytics con funnel visual

## Data Used

**Entities:**
- MarketingKPIs (leads, engagement, ROI, followers)
- Campaign (with channels, budget, metrics)
- SocialPost (with platforms, schedule, metrics)
- PlatformStats (per social network)
- FunnelStage, ChannelAttribution, MonthlyTrend

## Components Provided

- `MarketingDashboard.tsx` - Main dashboard with KPIs and activity

## Callback Props

| Callback | Description |
|----------|-------------|
| `onViewCampaign` | Navigate to campaign detail |
| `onNewCampaign` | Create new campaign |
| `onPauseCampaign` | Pause active campaign |
| `onViewPost` | Navigate to post detail |
| `onNewPost` | Open post creation modal |
