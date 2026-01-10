# SELL IN Operations

## Overview

Modulo de ventas directas de Santa Brisa a clientes y distribuidores. Cubre todo el ciclo desde la captacion de oportunidades hasta el seguimiento de pedidos.

## User Flows

1. **Crear Pedido:** Dashboard -> Nuevo Pedido -> Seleccionar cliente -> Agregar items -> Confirmar
2. **Gestionar Pipeline:** Ver oportunidades en Kanban -> Drag & drop entre etapas -> Actualizar estado
3. **Consultar Clientes:** Lista de clientes -> Filtrar por tipo/zona -> Ver detalle

## Design Decisions

- KPIs prominentes en dashboard (48px numbers, JetBrains Mono)
- Pipeline Kanban con drag & drop nativo
- Indicador visual de urgencia (borde naranja si >7 dias sin movimiento)
- Acciones de fila aparecen solo en hover

## Data Used

**Entities:**
- KPIs (salesThisMonth, activeOrders, newCustomers, avgOrderValue)
- Opportunity (pipeline stages)
- Customer (direct and distributor types)
- SalesOrder (with items, status, delivery progress)
- Activity (recent activity feed)

**From global model:**
- Customer -> Sales Order relationship
- Sales Order -> Delivery Note -> Sales Invoice flow

## Visual Reference

See `screenshot.png` for the target UI design (if available).

## Components Provided

- `SellInDashboard.tsx` - Main dashboard with KPIs, activity feed, trends
- `Pipeline.tsx` - Kanban board for opportunities
- `CustomerList.tsx` - Customer management with filters
- `OrderList.tsx` - Sales orders list with progress
- `KPICard.tsx` - Reusable KPI card (neobrutal style)
- `MiniBarChart.tsx` - Sparkline chart for trends
- `ActivityFeed.tsx` - Recent activity timeline

## Callback Props

| Callback | Description |
|----------|-------------|
| `onKpiClick` | Called when user clicks on a KPI card |
| `onCreateOrder` | Called when user wants to create new order |
| `onMoveOpportunity` | Called when dragging opportunity to new stage |
| `onViewOpportunity` | Called when user clicks to view opportunity |
| `onViewCustomer` | Called when user clicks to view customer |
| `onCreateCustomer` | Called when user wants to create customer |
| `onEditCustomer` | Called when user wants to edit customer |
| `onDeleteCustomer` | Called when user wants to delete customer |
| `onViewOrder` | Called when user clicks to view order |
| `onCreateOrder` | Called when user wants to create order |
| `onFilterChange` | Called when filters change |
