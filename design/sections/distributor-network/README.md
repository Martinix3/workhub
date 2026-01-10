# Distributor Network

## Overview

Modulo de gestion de distribuidores y seguimiento de SELL OUT. Incluye un dashboard administrativo para Santa Brisa y un portal de autoservicio para distribuidores.

## User Flows

1. **Admin Dashboard:** Ver KPIs de red -> Seleccionar distribuidor -> Ver detalle -> Enviar alerta
2. **Portal - Mis Pedidos:** Ver historial de entregas de Santa Brisa
3. **Portal - Subir SELL OUT:** Formulario manual o CSV -> Validar -> Confirmar
4. **Portal - Mi Inventario:** Ver stock calculado (SELL IN - SELL OUT)

## Design Decisions

- Dashboard admin muestra alertas de distribuidores inactivos
- Portal con tabs claros para cada funcion
- Inventario muestra barras de rotacion con colores semanticos
- Drag & drop para CSV upload

## Data Used

**Entities:**
- NetworkKPIs (aggregated metrics)
- Distributor (with alerts and status)
- MyOrder (deliveries from Santa Brisa)
- InventoryItem (calculated stock)
- SellOutRecord (reported sales)
- PortalAnalytics (distributor's analytics)

**Relationships:**
- Inventory = SELL IN - SELL OUT per product
- Distributor has multiple MyOrders
- Distributor reports multiple SellOutRecords

## Components Provided

- `DistributorDashboard.tsx` - Admin view with network KPIs and distributor list
- `DistributorPortal.tsx` - Self-service portal with tabs

## Callback Props

| Callback | Description |
|----------|-------------|
| `onViewDistributor` | Navigate to distributor detail (admin) |
| `onSendAlert` | Send notification to distributor |
| `onExport` | Export network data |
| `onViewOrder` | View order detail (portal) |
| `onSubmitSellOut` | Submit SELL OUT record |
| `onUploadCSV` | Process CSV file upload |
| `onExportInventory` | Export inventory to Excel |
