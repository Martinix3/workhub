// Sample data for bypass mode (UI review without backend)

import type { AreaSummary, PriorityAlert } from '../components/sections/command-center/types'
import type { KPIs, SalesTrends, Activity, Customer, SalesOrder, Opportunity } from '../components/sections/sell-in-operations/types'
import type { NetworkKPIs, Distributor } from '../components/sections/distributor-network/types'
import type { ProductionKPIs, ProductionOrder, ProductionLine, Lot, HACCPPlan, CCPReading, QualityDocument, DocumentFolder, QualityKPIs, Inspection, NonConformance, WeeklyTrendPoint } from '../components/sections/production-and-quality/types'
import type { MarketingKPIs, Campaign, SocialPost, PlatformStats } from '../components/sections/marketing-and-growth/types'

// Command Center
export const sampleAreaSummaries: AreaSummary[] = [
  {
    id: 'ventas',
    name: 'Ventas',
    icon: 'DollarSign',
    status: 'green',
    mainKPI: { label: 'Ventas Mes', value: 2450000, previousValue: 2100000, change: 16.7 },
    secondaryKPIs: [
      { label: 'Pedidos', value: 47, previousValue: 42, change: 12 },
      { label: 'Clientes Activos', value: 23, previousValue: 21, change: 9.5 }
    ]
  },
  {
    id: 'produccion',
    name: 'Produccion',
    icon: 'Factory',
    status: 'yellow',
    mainKPI: { label: 'Eficiencia', value: 78, previousValue: 85, change: -8.2 },
    secondaryKPIs: [
      { label: 'Lotes Activos', value: 12, previousValue: 10, change: 20 }
    ]
  },
  {
    id: 'calidad',
    name: 'Calidad',
    icon: 'Shield',
    status: 'green',
    mainKPI: { label: 'Aprobacion', value: 96, previousValue: 94, change: 2.1 }
  },
  {
    id: 'distribuidores',
    name: 'Distribuidores',
    icon: 'Truck',
    status: 'green',
    mainKPI: { label: 'Activos', value: 18, previousValue: 16, change: 12.5 }
  }
]

export const samplePriorityAlerts: PriorityAlert[] = [
  { id: '1', title: 'Stock de agave bajo', description: '15% de capacidad restante - revisar con produccion', category: 'production', priority: 'high', timestamp: new Date().toISOString(), actionUrl: '/produccion' },
  { id: '2', title: 'Pedidos pendientes', description: '3 pedidos pendientes de facturacion', category: 'sales', priority: 'medium', timestamp: new Date().toISOString(), actionUrl: '/ventas/pedidos' }
]

// Sales
export const sampleSalesKPIs: KPIs = {
  salesThisMonth: { value: 2450000, previousValue: 2100000, change: 16.7, label: 'Ventas del Mes' },
  activeOrders: { value: 12, previousValue: 8, change: 50, label: 'Pedidos Activos' },
  newCustomers: { value: 5, previousValue: 3, change: 66.7, label: 'Nuevos Clientes' },
  avgOrderValue: { value: 45000, previousValue: 42000, change: 7.1, label: 'Ticket Promedio' }
}

export const sampleSalesTrends: SalesTrends = {
  monthly: [
    { period: 'Oct', value: 1850000 },
    { period: 'Nov', value: 2100000 },
    { period: 'Dic', value: 2350000 },
    { period: 'Ene', value: 2450000 }
  ],
  byProduct: [
    { product: 'Mezcal Espadin', value: 1200000, percentage: 49 },
    { product: 'Mezcal Tobala', value: 650000, percentage: 27 },
    { product: 'Mezcal Madrecuixe', value: 350000, percentage: 14 },
    { product: 'Otros', value: 250000, percentage: 10 }
  ],
  byCustomerType: [
    { type: 'Distribuidores', value: 1600000, percentage: 65 },
    { type: 'Directos', value: 850000, percentage: 35 }
  ]
}

export const sampleRecentActivity: Activity[] = [
  { id: '1', type: 'order_created', description: 'Nuevo pedido #SAL-2025-047 - Distribuciones Norte - $45,000', timestamp: new Date().toISOString(), user: 'Carlos Mendez' },
  { id: '2', type: 'customer_created', description: 'Nuevo cliente registrado: Mezcaleria El Refugio', timestamp: new Date(Date.now() - 3600000).toISOString(), user: 'Ana Garcia' },
  { id: '3', type: 'payment_received', description: 'Pago recibido - Factura #F-2025-089 - $78,500', timestamp: new Date(Date.now() - 7200000).toISOString(), user: 'Sistema' },
  { id: '4', type: 'delivery_completed', description: 'Entrega completada - Pedido #SAL-2025-043', timestamp: new Date(Date.now() - 10800000).toISOString(), user: 'Logistica' },
  { id: '5', type: 'opportunity_moved', description: 'Oportunidad "Expansion Bajio" avanzada a Negociacion', timestamp: new Date(Date.now() - 14400000).toISOString(), user: 'Maria Lopez' }
]

export const sampleCustomers: Customer[] = [
  { id: '1', name: 'Distribuciones Norte SA', type: 'distributor', contactName: 'Carlos Mendez', contactEmail: 'carlos@distnorte.mx', contactPhone: '555-123-4567', zone: 'Norte', status: 'active', totalOrders: 45, totalRevenue: 1250000, lastOrderDate: new Date(Date.now() - 86400000 * 2).toISOString() },
  { id: '2', name: 'Mezcaleria El Refugio', type: 'direct', contactName: 'Ana Garcia', contactEmail: 'ana@elrefugio.mx', contactPhone: '555-987-6543', zone: 'Centro', status: 'active', totalOrders: 12, totalRevenue: 340000, lastOrderDate: new Date(Date.now() - 86400000 * 5).toISOString() },
  { id: '3', name: 'Vinoteca Premium', type: 'direct', contactName: 'Roberto Silva', contactEmail: 'roberto@vinoteca.mx', contactPhone: '555-456-7890', zone: 'Sur', status: 'prospect', totalOrders: 0, totalRevenue: 0, lastOrderDate: null }
]

export const sampleOrders: SalesOrder[] = [
  { id: '1', orderNumber: 'SAL-2025-047', customerId: '1', customerName: 'Distribuciones Norte SA', status: 'confirmed', items: [], subtotal: 45000, tax: 7200, total: 52200, orderDate: new Date().toISOString(), deliveryDate: new Date(Date.now() + 86400000 * 3).toISOString(), deliveryProgress: 0, invoiceProgress: 0 },
  { id: '2', orderNumber: 'SAL-2025-046', customerId: '2', customerName: 'Mezcaleria El Refugio', status: 'in_transit', items: [], subtotal: 28000, tax: 4480, total: 32480, orderDate: new Date(Date.now() - 86400000).toISOString(), deliveryDate: new Date(Date.now() + 86400000).toISOString(), deliveryProgress: 75, invoiceProgress: 0 },
  { id: '3', orderNumber: 'SAL-2025-045', customerId: '1', customerName: 'Distribuciones Norte SA', status: 'delivered', items: [], subtotal: 62000, tax: 9920, total: 71920, orderDate: new Date(Date.now() - 86400000 * 3).toISOString(), deliveryDate: new Date(Date.now() - 86400000).toISOString(), deliveryProgress: 100, invoiceProgress: 50 },
  { id: '4', orderNumber: 'SAL-2025-044', customerId: '2', customerName: 'Mezcaleria El Refugio', status: 'paid', items: [], subtotal: 18500, tax: 2960, total: 21460, orderDate: new Date(Date.now() - 86400000 * 7).toISOString(), deliveryDate: new Date(Date.now() - 86400000 * 4).toISOString(), deliveryProgress: 100, invoiceProgress: 100 }
]

export const sampleOpportunities: Opportunity[] = [
  { id: '1', title: 'Expansion Zona Bajio', customerName: 'Nuevo Distribuidor Bajio', customerId: 'new-1', value: 500000, stage: 'proposal', assignee: 'Maria Lopez', daysInStage: 5, nextContactDate: new Date(Date.now() + 86400000 * 2).toISOString(), notes: 'Interesado en distribucion exclusiva para Guanajuato y Queretaro' },
  { id: '2', title: 'Contrato Anual Premium', customerName: 'Distribuciones Norte SA', customerId: '1', value: 1200000, stage: 'negotiation', assignee: 'Carlos Mendez', daysInStage: 3, nextContactDate: new Date(Date.now() + 86400000).toISOString(), notes: 'Negociando descuento por volumen y exclusividad regional' },
  { id: '3', title: 'Nuevo Cliente Restaurante', customerName: 'La Cocina de Oaxaca', customerId: 'new-2', value: 85000, stage: 'new', assignee: 'Ana Garcia', daysInStage: 1, nextContactDate: new Date(Date.now() + 86400000 * 3).toISOString(), notes: 'Primer contacto, restaurante de alta cocina oaxaquena' },
  { id: '4', title: 'Hotel Boutique Mezcalero', customerName: 'Hotel Casa Mezcal', customerId: 'new-3', value: 150000, stage: 'contacted', assignee: 'Maria Lopez', daysInStage: 7, nextContactDate: null, notes: 'Esperando respuesta a propuesta de productos para bar' }
]

// Distributors
export const sampleNetworkKPIs: NetworkKPIs = {
  totalSellIn: { value: 2450000, previousValue: 2100000, change: 16.7, label: 'SELL IN Total' },
  totalSellOut: { value: 1850000, previousValue: 1650000, change: 12.1, label: 'SELL OUT Total' },
  avgRotation: { value: 32, previousValue: 35, change: -8.6, label: 'Rotacion Promedio' },
  activeDistributors: { value: 18, previousValue: 16, change: 12.5, label: 'Distribuidores Activos' }
}

export const sampleDistributors: Distributor[] = [
  { id: '1', name: 'Distribuciones Norte SA', zone: 'Norte', status: 'active', lastReportDate: new Date(Date.now() - 86400000).toISOString(), daysWithoutReport: 1, sellInTotal: 450000, sellOutTotal: 420000, rotation: 2.3, stockValue: 180000, alerts: [] },
  { id: '2', name: 'Comercializadora Sur', zone: 'Sur', status: 'warning', lastReportDate: new Date(Date.now() - 86400000 * 5).toISOString(), daysWithoutReport: 5, sellInTotal: 320000, sellOutTotal: 280000, rotation: 1.2, stockValue: 250000, alerts: ['stock_alto'] },
  { id: '3', name: 'Grupo Centro', zone: 'Centro', status: 'active', lastReportDate: new Date().toISOString(), daysWithoutReport: 0, sellInTotal: 580000, sellOutTotal: 550000, rotation: 4.5, stockValue: 120000, alerts: [] }
]

export const samplePortalData = {
  myOrders: [
    { id: '1', deliveryNumber: 'ENT-2025-047', orderDate: new Date(Date.now() - 86400000 * 5).toISOString(), deliveryDate: new Date(Date.now() - 86400000 * 2).toISOString(), status: 'delivered' as const, items: [{ itemCode: 'MEJ-750', itemName: 'Mezcal Espadin Joven 750ml', qty: 48, amount: 28800 }], total: 28800, invoiceStatus: 'paid' as const },
    { id: '2', deliveryNumber: 'ENT-2025-048', orderDate: new Date(Date.now() - 86400000 * 2).toISOString(), deliveryDate: new Date(Date.now() + 86400000).toISOString(), status: 'in_transit' as const, items: [{ itemCode: 'MTO-750', itemName: 'Mezcal Tobala 750ml', qty: 24, amount: 36000 }], total: 36000, invoiceStatus: 'pending' as const }
  ],
  myInventory: [
    { itemCode: 'MEJ-750', itemName: 'Mezcal Espadin Joven 750ml', sellIn: 120, sellOut: 95, stockActual: 25, rotation: 3.8, avgDailySales: 3.2, daysOfStock: 8, status: 'normal' as const, trend: [12, 15, 10, 18, 14, 12, 14] },
    { itemCode: 'MTO-750', itemName: 'Mezcal Tobala 750ml', sellIn: 48, sellOut: 35, stockActual: 13, rotation: 2.7, avgDailySales: 1.2, daysOfStock: 11, status: 'normal' as const, trend: [4, 6, 5, 7, 5, 4, 4] },
    { itemCode: 'MCX-750', itemName: 'Mezcal Madrecuixe 750ml', sellIn: 24, sellOut: 8, stockActual: 16, rotation: 0.5, avgDailySales: 0.3, daysOfStock: 53, status: 'slow' as const, trend: [1, 2, 1, 0, 2, 1, 1] }
  ],
  sellOutRecords: [
    { id: '1', date: new Date(Date.now() - 86400000).toISOString(), items: [{ itemCode: 'MEJ-750', itemName: 'Mezcal Espadin Joven', qty: 6, customer: 'Bar La Mezcaleria' }], totalUnits: 6, status: 'confirmed' as const },
    { id: '2', date: new Date().toISOString(), items: [{ itemCode: 'MTO-750', itemName: 'Mezcal Tobala', qty: 2, customer: 'Restaurante El Agave' }], totalUnits: 2, status: 'draft' as const }
  ],
  analytics: {
    sellOutThisMonth: 420000,
    rotationPercent: 78,
    daysOfStockAvg: 24,
    topProduct: { name: 'Mezcal Espadin Joven', units: 95, percentage: 68 },
    monthlyTrend: [
      { period: 'Oct', sellIn: 380000, sellOut: 350000 },
      { period: 'Nov', sellIn: 420000, sellOut: 400000 },
      { period: 'Dic', sellIn: 480000, sellOut: 450000 },
      { period: 'Ene', sellIn: 450000, sellOut: 420000 }
    ]
  }
}

// Production
export const sampleProductionKPIs: ProductionKPIs = {
  activeOrders: { value: 8, previousValue: 6, change: 33.3, label: 'Ordenes Activas' },
  oeePercent: { value: 78, previousValue: 85, change: -8.2, label: 'OEE %' },
  completedToday: { value: 3, previousValue: 2, change: 50, label: 'Completadas Hoy' },
  unitsProduced: { value: 1250, previousValue: 1100, change: 13.6, label: 'Litros Producidos' }
}

export const sampleProductionOrders: ProductionOrder[] = [
  { id: '1', orderNumber: 'PROD-2025-012', productCode: 'MEZ-ESP-001', productName: 'Mezcal Espadin Joven', formulationId: 'FORM-001', lotNumber: 'LOT-2025-089', qtyTarget: 500, qtyProduced: 325, uom: 'L', status: 'in_progress', lineId: '1', lineName: 'Linea 1', scheduledDate: new Date(Date.now() - 86400000 * 5).toISOString(), startTime: new Date(Date.now() - 86400000 * 5).toISOString(), progress: 65 },
  { id: '2', orderNumber: 'PROD-2025-013', productCode: 'MEZ-TOB-001', productName: 'Mezcal Tobala', formulationId: 'FORM-002', lotNumber: 'LOT-2025-090', qtyTarget: 200, qtyProduced: 0, uom: 'L', status: 'scheduled', lineId: '2', lineName: 'Linea 2', scheduledDate: new Date(Date.now() + 86400000).toISOString(), progress: 0 }
]

export const sampleProductionLines: ProductionLine[] = [
  { id: '1', name: 'Linea 1', status: 'running', currentOrder: 'PROD-2025-012', oee: 82, uptime: 94, lastMaintenance: new Date(Date.now() - 86400000 * 15).toISOString(), nextMaintenance: new Date(Date.now() + 86400000 * 15).toISOString() },
  { id: '2', name: 'Linea 2', status: 'idle', oee: 0, uptime: 100, lastMaintenance: new Date(Date.now() - 86400000 * 7).toISOString(), nextMaintenance: new Date(Date.now() + 86400000 * 23).toISOString() }
]

export const sampleLots: Lot[] = [
  {
    id: '1',
    lotNumber: 'LOT-2025-089',
    productCode: 'MEZ-ESP-001',
    productName: 'Mezcal Espadin Joven',
    productionOrderId: 'PROD-2025-012',
    status: 'released',
    qtyProduced: 450,
    uom: 'L',
    productionDate: new Date(Date.now() - 86400000 * 3).toISOString(),
    expirationDate: new Date(Date.now() + 86400000 * 365 * 2).toISOString(),
    location: 'Almacen A-1',
    materials: [
      { itemCode: 'MAT-001', itemName: 'Agave Espadin', lotNumber: 'AGV-2025-045', supplier: 'Campos Oaxaca', qty: 500, uom: 'kg' }
    ],
    events: [
      { timestamp: new Date(Date.now() - 86400000 * 3).toISOString(), type: 'created', description: 'Lote creado', user: 'Carlos Lopez' },
      { timestamp: new Date(Date.now() - 86400000 * 1).toISOString(), type: 'inspection', description: 'Inspeccion aprobada', user: 'Maria Garcia' },
      { timestamp: new Date().toISOString(), type: 'released', description: 'Lote liberado para venta', user: 'Ana Martinez' }
    ]
  },
  {
    id: '2',
    lotNumber: 'LOT-2025-088',
    productCode: 'MEZ-TOB-001',
    productName: 'Mezcal Tobala',
    productionOrderId: 'PROD-2025-011',
    status: 'pending_inspection',
    qtyProduced: 180,
    uom: 'L',
    productionDate: new Date(Date.now() - 86400000 * 2).toISOString(),
    expirationDate: new Date(Date.now() + 86400000 * 365 * 2).toISOString(),
    location: 'Produccion',
    materials: [
      { itemCode: 'MAT-002', itemName: 'Agave Tobala', lotNumber: 'AGV-2025-044', supplier: 'Campos Miahuatlan', qty: 200, uom: 'kg' }
    ],
    events: [
      { timestamp: new Date(Date.now() - 86400000 * 2).toISOString(), type: 'created', description: 'Lote creado', user: 'Carlos Lopez' }
    ]
  }
]

export const sampleHACCPPlans: HACCPPlan[] = [
  {
    id: '1',
    productCode: 'MEZ-ESP-001',
    productName: 'Mezcal Espadin',
    version: '2.1',
    effectiveDate: '2025-01-01',
    ccps: [
      { id: 'ccp1', name: 'Fermentacion - Temperatura', hazardType: 'biological', hazardDescription: 'Crecimiento de bacterias patogenas por temperatura inadecuada', criticalLimit: '25-32°C', monitoringMethod: 'Termometro digital calibrado', frequency: 'Cada 4 horas', correctiveAction: 'Ajustar temperatura y notificar supervisor', currentValue: '28°C', status: 'normal', lastReading: new Date().toISOString() },
      { id: 'ccp2', name: 'Destilacion - Alcohol', hazardType: 'chemical', hazardDescription: 'Concentracion de metanol por destilacion incorrecta', criticalLimit: '45-55%', monitoringMethod: 'Alcoholimetro certificado', frequency: 'Continuo', correctiveAction: 'Descartar lote y revisar equipo', currentValue: '48%', status: 'normal', lastReading: new Date().toISOString() },
      { id: 'ccp3', name: 'Fermentacion - pH', hazardType: 'biological', hazardDescription: 'pH fuera de rango puede permitir crecimiento microbiano', criticalLimit: '3.5-4.5', monitoringMethod: 'pH metro digital', frequency: 'Cada 6 horas', correctiveAction: 'Ajustar pH con acido citrico y documentar', currentValue: '4.1', status: 'normal', lastReading: new Date(Date.now() - 3600000).toISOString() },
      { id: 'ccp4', name: 'Destilacion - Metanol', hazardType: 'chemical', hazardDescription: 'Exceso de metanol toxico para consumo humano', criticalLimit: '<300mg/L', monitoringMethod: 'Cromatografia de gases', frequency: 'Por lote', correctiveAction: 'Rechazar lote completo y revisar proceso', currentValue: '185mg/L', status: 'normal', lastReading: new Date(Date.now() - 7200000).toISOString() }
    ]
  },
  {
    id: '2',
    productCode: 'MEZ-TOB-001',
    productName: 'Mezcal Tobala',
    version: '1.0',
    effectiveDate: '2024-11-15',
    ccps: [
      { id: 'ccp5', name: 'Almacenamiento - Temperatura', hazardType: 'physical', hazardDescription: 'Temperatura inadecuada afecta calidad del producto', criticalLimit: '-2-2°C', monitoringMethod: 'Sensor de temperatura continuo', frequency: 'Continuo', correctiveAction: 'Transferir producto y revisar refrigeracion', currentValue: '0.5°C', status: 'normal', lastReading: new Date(Date.now() - 1800000).toISOString() },
      { id: 'ccp6', name: 'Envasado - Presion', hazardType: 'physical', hazardDescription: 'Presion baja puede comprometer sellado de botellas', criticalLimit: '>10psi', monitoringMethod: 'Manometro digital', frequency: 'Cada hora', correctiveAction: 'Detener linea y revisar compresor', currentValue: '12.5psi', status: 'normal', lastReading: new Date(Date.now() - 900000).toISOString() },
      { id: 'ccp7', name: 'Limpieza - Cloro Residual', hazardType: 'chemical', hazardDescription: 'Cloro residual excesivo contamina producto', criticalLimit: '<10ppm', monitoringMethod: 'Kit colorimetrico', frequency: 'Despues de cada limpieza', correctiveAction: 'Enjuague adicional hasta nivel aceptable', currentValue: '35ppm', status: 'critical', lastReading: new Date(Date.now() - 600000).toISOString() },
      { id: 'ccp8', name: 'Fermentacion - Tiempo', hazardType: 'biological', hazardDescription: 'Tiempo insuficiente produce fermentacion incompleta', criticalLimit: '>72h', monitoringMethod: 'Registro de tiempo', frequency: 'Por lote', correctiveAction: 'Extender tiempo de fermentacion segun especificacion', currentValue: '96h', status: 'normal', lastReading: new Date(Date.now() - 14400000).toISOString() }
    ]
  }
]

export const sampleCCPReadings: CCPReading[] = [
  { id: 'r1', ccpId: 'ccp1', ccpName: 'Fermentacion - Temperatura', value: '28°C', timestamp: new Date(Date.now() - 14400000).toISOString(), operator: 'Carlos Lopez', status: 'normal', lotNumber: 'LOT-2025-089' },
  { id: 'r2', ccpId: 'ccp1', ccpName: 'Fermentacion - Temperatura', value: '29.5°C', timestamp: new Date(Date.now() - 10800000).toISOString(), operator: 'Maria Garcia', status: 'normal', lotNumber: 'LOT-2025-089' },
  { id: 'r3', ccpId: 'ccp2', ccpName: 'Destilacion - Alcohol', value: '48%', timestamp: new Date(Date.now() - 7200000).toISOString(), operator: 'Juan Perez', status: 'normal', lotNumber: 'LOT-2025-089' },
  { id: 'r4', ccpId: 'ccp3', ccpName: 'Fermentacion - pH', value: '4.1', timestamp: new Date(Date.now() - 3600000).toISOString(), operator: 'Ana Martinez', status: 'normal', lotNumber: 'LOT-2025-089' },
  { id: 'r5', ccpId: 'ccp4', ccpName: 'Destilacion - Metanol', value: '185mg/L', timestamp: new Date(Date.now() - 7200000).toISOString(), operator: 'Carlos Lopez', status: 'normal', lotNumber: 'LOT-2025-089' },
  { id: 'r6', ccpId: 'ccp5', ccpName: 'Almacenamiento - Temperatura', value: '0.5°C', timestamp: new Date(Date.now() - 1800000).toISOString(), operator: 'Pedro Silva', status: 'normal', lotNumber: 'LOT-2025-088' },
  { id: 'r7', ccpId: 'ccp6', ccpName: 'Envasado - Presion', value: '12.5psi', timestamp: new Date(Date.now() - 900000).toISOString(), operator: 'Maria Garcia', status: 'normal', lotNumber: 'LOT-2025-088' },
  { id: 'r8', ccpId: 'ccp7', ccpName: 'Limpieza - Cloro Residual', value: '35ppm', timestamp: new Date(Date.now() - 600000).toISOString(), operator: 'Juan Perez', status: 'critical', lotNumber: 'LOT-2025-088', correctiveActionTaken: 'Realizar enjuague adicional con agua purificada' },
  { id: 'r9', ccpId: 'ccp8', ccpName: 'Fermentacion - Tiempo', value: '96h', timestamp: new Date(Date.now() - 14400000).toISOString(), operator: 'Ana Martinez', status: 'normal', lotNumber: 'LOT-2025-088' },
  { id: 'r10', ccpId: 'ccp1', ccpName: 'Fermentacion - Temperatura', value: '34°C', timestamp: new Date(Date.now() - 1200000).toISOString(), operator: 'Carlos Lopez', status: 'critical', lotNumber: 'LOT-2025-090', correctiveActionTaken: 'Temperatura ajustada a 30°C, supervisor notificado' },
  { id: 'r11', ccpId: 'ccp2', ccpName: 'Destilacion - Alcohol', value: '58%', timestamp: new Date(Date.now() - 3000000).toISOString(), operator: 'Pedro Silva', status: 'critical', lotNumber: 'LOT-2025-087', correctiveActionTaken: 'Lote descartado, equipo calibrado nuevamente' }
]

export const sampleActiveAlerts: CCPReading[] = [
  { id: 'r8', ccpId: 'ccp7', ccpName: 'Limpieza - Cloro Residual', value: '35ppm', timestamp: new Date(Date.now() - 600000).toISOString(), operator: 'Juan Perez', status: 'critical', lotNumber: 'LOT-2025-088', correctiveActionTaken: 'Realizar enjuague adicional con agua purificada' },
  { id: 'r10', ccpId: 'ccp1', ccpName: 'Fermentacion - Temperatura', value: '34°C', timestamp: new Date(Date.now() - 1200000).toISOString(), operator: 'Carlos Lopez', status: 'critical', lotNumber: 'LOT-2025-090', correctiveActionTaken: 'Temperatura ajustada a 30°C, supervisor notificado' }
]

export const sampleDocumentFolders: DocumentFolder[] = [
  { id: '1', name: 'HACCP', documentCount: 12 },
  { id: '2', name: 'Certificaciones', documentCount: 8 },
  { id: '3', name: 'Procedimientos', documentCount: 24 }
]

export const sampleDocuments: QualityDocument[] = [
  {
    id: '1',
    code: 'SOP-HACCP-001',
    title: 'Plan HACCP Mezcal Espadin',
    type: 'sop',
    category: 'HACCP',
    status: 'approved',
    currentVersion: '2.1',
    effectiveDate: new Date(Date.now() - 86400000 * 30).toISOString().split('T')[0],
    expirationDate: new Date(Date.now() + 86400000 * 335).toISOString().split('T')[0],
    author: 'Ana Martinez',
    approver: 'Carlos Lopez',
    approvalDate: new Date(Date.now() - 86400000 * 30).toISOString().split('T')[0],
    versions: [
      { version: '2.1', date: new Date(Date.now() - 86400000 * 30).toISOString().split('T')[0], author: 'Ana Martinez', changes: 'Actualizacion limites criticos fermentacion' },
      { version: '2.0', date: new Date(Date.now() - 86400000 * 180).toISOString().split('T')[0], author: 'Ana Martinez', changes: 'Revision anual' }
    ],
    fileUrl: '/docs/sop-haccp-001.pdf'
  },
  {
    id: '2',
    code: 'CERT-ORG-2025',
    title: 'Certificado Organico 2025',
    type: 'certificate',
    category: 'Certificaciones',
    status: 'approved',
    currentVersion: '1.0',
    effectiveDate: new Date(Date.now() - 86400000 * 60).toISOString().split('T')[0],
    expirationDate: new Date(Date.now() + 86400000 * 305).toISOString().split('T')[0],
    author: 'Carlos Lopez',
    approver: 'Maria Garcia',
    approvalDate: new Date(Date.now() - 86400000 * 60).toISOString().split('T')[0],
    versions: [
      { version: '1.0', date: new Date(Date.now() - 86400000 * 60).toISOString().split('T')[0], author: 'Carlos Lopez', changes: 'Emision inicial' }
    ],
    fileUrl: '/docs/cert-org-2025.pdf'
  },
  {
    id: '3',
    code: 'SOP-PROD-005',
    title: 'Procedimiento de Destilacion',
    type: 'sop',
    category: 'Produccion',
    status: 'pending_approval',
    currentVersion: '3.0',
    effectiveDate: new Date().toISOString().split('T')[0],
    author: 'Juan Perez',
    versions: [
      { version: '3.0', date: new Date().toISOString().split('T')[0], author: 'Juan Perez', changes: 'Actualizacion parametros destilacion' }
    ],
    fileUrl: '/docs/sop-prod-005.pdf'
  }
]

export const sampleQualityKPIs: QualityKPIs = {
  approvalRate: { value: 96, previousValue: 94, change: 2.1, label: 'Tasa Aprobacion' },
  openNCs: { value: 3, previousValue: 5, change: -40, label: 'NCs Abiertas' },
  pendingInspections: { value: 8, previousValue: 12, change: -33.3, label: 'Inspecciones Pendientes' },
  avgCloseTime: { value: 4.2, previousValue: 5.1, change: -17.6, label: 'Dias Cierre NC' }
}

export const sampleInspections: Inspection[] = [
  { id: '1', lotNumber: 'LOT-2025-089', productCode: 'MEZ-ESP-001', productName: 'Mezcal Espadin Joven', inspectionDate: new Date().toISOString(), inspector: 'Maria Garcia', criteria: [{ id: 'c1', name: 'Alcohol', specification: '45-55%', actualValue: '48%', result: 'pass' }, { id: 'c2', name: 'Metanol', specification: '<300mg/L', actualValue: '180mg/L', result: 'pass' }], result: 'approved', notes: 'Cumple todos los parametros' },
  { id: '2', lotNumber: 'LOT-2025-088', productCode: 'MEZ-TOB-001', productName: 'Mezcal Tobala', inspectionDate: new Date(Date.now() - 86400000).toISOString(), inspector: 'Juan Perez', criteria: [{ id: 'c1', name: 'Alcohol', specification: '45-55%', actualValue: '56%', result: 'fail' }], result: 'held', notes: 'Pendiente verificacion de alcohol' }
]

export const sampleNonConformances: NonConformance[] = [
  { id: '1', ncNumber: 'NC-2025-003', lotNumber: 'LOT-2025-087', productCode: 'MEZ-ESP-001', productName: 'Mezcal Espadin Joven', dateOpened: new Date(Date.now() - 86400000 * 2).toISOString(), daysOpen: 2, severity: 'minor', status: 'investigation', description: 'Temperatura fuera de rango en fermentacion', correctiveActions: [{ id: 'ca1', description: 'Ajustar termostato de tanque', responsible: 'Carlos Lopez', dueDate: new Date(Date.now() + 86400000).toISOString(), status: 'in_progress' }], responsible: 'Ana Martinez' }
]

export const sampleWeeklyTrend: WeeklyTrendPoint[] = [
  { day: 'Lun', approved: 12, rejected: 1 },
  { day: 'Mar', approved: 15, rejected: 0 },
  { day: 'Mie', approved: 10, rejected: 2 },
  { day: 'Jue', approved: 18, rejected: 1 },
  { day: 'Vie', approved: 14, rejected: 0 },
  { day: 'Sab', approved: 8, rejected: 0 },
  { day: 'Dom', approved: 0, rejected: 0 }
]

// Marketing
export const sampleMarketingKPIs: MarketingKPIs = {
  leadsGenerated: { value: 45, previousValue: 38, change: 18.4, label: 'Leads Generados' },
  engagementRate: { value: 4.2, previousValue: 3.8, change: 10.5, label: 'Engagement Rate' },
  campaignROI: { value: 320, previousValue: 280, change: 14.3, label: 'ROI Campanas' },
  followerGrowth: { value: 1250, previousValue: 980, change: 27.6, label: 'Nuevos Seguidores' }
}

export const sampleCampaigns: Campaign[] = [
  { id: '1', name: 'Lanzamiento Mezcal Premium', objective: 'Awareness', status: 'active', startDate: new Date(Date.now() - 86400000 * 15).toISOString(), endDate: new Date(Date.now() + 86400000 * 15).toISOString(), budget: 50000, spent: 32000, channels: ['instagram', 'facebook'], metrics: { impressions: 125000, clicks: 4500, leads: 28, conversions: 12, spent: 32000 } },
  { id: '2', name: 'Promocion Navidad', objective: 'Ventas', status: 'completed', startDate: new Date(Date.now() - 86400000 * 45).toISOString(), endDate: new Date(Date.now() - 86400000 * 15).toISOString(), budget: 30000, spent: 28500, channels: ['instagram', 'email'], metrics: { impressions: 85000, clicks: 3200, leads: 45, conversions: 22, spent: 28500 } }
]

export const sampleSocialPosts: SocialPost[] = [
  { id: '1', platforms: ['instagram'], content: 'Descubre el sabor autentico de Oaxaca...', mediaType: 'image', scheduledDate: new Date(Date.now() + 86400000).toISOString(), status: 'scheduled' },
  { id: '2', platforms: ['facebook'], content: 'Nuevo lote de Mezcal Tobala disponible!', scheduledDate: new Date(Date.now() - 86400000 * 2).toISOString(), status: 'published', publishedDate: new Date(Date.now() - 86400000 * 2).toISOString(), metrics: { likes: 234, comments: 18, shares: 12, reach: 4500 } }
]

export const samplePlatformStats: PlatformStats[] = [
  { platform: 'instagram', followers: 12500, followersChange: 850, engagementRate: 4.5, postsThisMonth: 12 },
  { platform: 'facebook', followers: 8200, followersChange: 320, engagementRate: 2.8, postsThisMonth: 8 },
  { platform: 'tiktok', followers: 3400, followersChange: 1200, engagementRate: 8.2, postsThisMonth: 6 }
]

// Tasks
import type { Task, Project, ProjectTemplate, MyDayData, KanbanColumn, DashboardKPIs } from '../components/sections/tasks/types'

export const sampleTasks: Task[] = [
  { name: 'WHT-2025-001', title: 'Revisar propuesta comercial', status: 'DOING', priority: 'P1', assigned_to: 'martin@example.com', department: 'SALES', due_date: new Date().toISOString().split('T')[0], worked_today: true },
  { name: 'WHT-2025-002', title: 'Actualizar catalogo de productos', status: 'NEXT', priority: 'P2', assigned_to: 'martin@example.com', department: 'MKT', due_date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0] },
  { name: 'WHT-2025-003', title: 'Coordinar envio a distribuidor', status: 'BACKLOG', priority: 'P2', assigned_to: 'martin@example.com', department: 'OPS', due_date: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0] },
  { name: 'WHT-2025-004', title: 'Llamar a cliente potencial', status: 'BLOCKED', priority: 'P0', assigned_to: 'martin@example.com', department: 'SALES', due_date: new Date(Date.now() - 86400000).toISOString().split('T')[0], blocked_reason: 'Esperando informacion del gerente' },
  { name: 'WHT-2025-005', title: 'Preparar presentacion Q1', status: 'DONE', priority: 'P1', assigned_to: 'martin@example.com', department: 'SALES', due_date: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0] }
]

// Project templates
export const sampleProjectTemplates: ProjectTemplate[] = [
  { name: 'WHPT-001', title: 'Lanzamiento de Producto', description: 'Template para lanzar un nuevo producto al mercado', department: 'MKT', default_duration_days: 45, task_count: 8, is_active: true },
  { name: 'WHPT-002', title: 'Expansion Regional', description: 'Template para expandir a una nueva region geografica', department: 'SALES', default_duration_days: 60, task_count: 12, is_active: true },
  { name: 'WHPT-003', title: 'Mejora Operacional', description: 'Template para proyectos de mejora de procesos', department: 'OPS', default_duration_days: 30, task_count: 6, is_active: true }
]

// Projects with tasks
const projectTasks1: Task[] = [
  { name: 'WHT-2025-P1-001', title: 'Identificar distribuidores potenciales', status: 'DONE', priority: 'P1', assigned_to: 'martin@example.com', department: 'SALES', project: 'WHP-2025-001', due_date: new Date(Date.now() - 86400000 * 20).toISOString().split('T')[0] },
  { name: 'WHT-2025-P1-002', title: 'Negociar contratos', status: 'DOING', priority: 'P0', assigned_to: 'martin@example.com', department: 'SALES', project: 'WHP-2025-001', due_date: new Date().toISOString().split('T')[0] },
  { name: 'WHT-2025-P1-003', title: 'Setup logistico', status: 'NEXT', priority: 'P2', assigned_to: 'carlos@example.com', department: 'OPS', project: 'WHP-2025-001', due_date: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0] }
]

const projectTasks2: Task[] = [
  { name: 'WHT-2025-P2-001', title: 'Definir producto', status: 'DONE', priority: 'P1', assigned_to: 'ana@example.com', department: 'MKT', project: 'WHP-2025-002', due_date: new Date(Date.now() - 86400000 * 10).toISOString().split('T')[0] },
  { name: 'WHT-2025-P2-002', title: 'Disenar packaging', status: 'BLOCKED', priority: 'P1', assigned_to: 'ana@example.com', department: 'MKT', project: 'WHP-2025-002', blocked_reason: 'Esperando aprobacion legal', due_date: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0] }
]

const projectTasks3: Task[] = [
  { name: 'WHT-2025-P3-001', title: 'Analisis de rutas', status: 'DONE', priority: 'P1', assigned_to: 'carlos@example.com', department: 'OPS', project: 'WHP-2025-003', due_date: new Date(Date.now() - 86400000 * 30).toISOString().split('T')[0] },
  { name: 'WHT-2025-P3-002', title: 'Optimizar tiempos de entrega', status: 'DOING', priority: 'P0', assigned_to: 'carlos@example.com', department: 'OPS', project: 'WHP-2025-003', due_date: new Date(Date.now() - 86400000 * 5).toISOString().split('T')[0] },
  { name: 'WHT-2025-P3-003', title: 'Implementar tracking GPS', status: 'NEXT', priority: 'P2', assigned_to: 'carlos@example.com', department: 'OPS', project: 'WHP-2025-003', due_date: new Date(Date.now() - 86400000 * 3).toISOString().split('T')[0] }
]

export const sampleProjects: Project[] = [
  { name: 'WHP-2025-001', title: 'Expansion Zona Norte', status: 'ACTIVE', health: 'GREEN', department: 'SALES', owner_user: 'martin@example.com', owner_name: 'Martin Samperiz', start_date: new Date(Date.now() - 86400000 * 30).toISOString().split('T')[0], target_date: new Date(Date.now() + 86400000 * 60).toISOString().split('T')[0], progress_pct: 45, total_tasks: 12, completed_tasks: 5, blocked_tasks: 1, tasks: projectTasks1 },
  { name: 'WHP-2025-002', title: 'Nuevo Producto Premium', status: 'ACTIVE', health: 'YELLOW', department: 'MKT', owner_user: 'martin@example.com', owner_name: 'Martin Samperiz', start_date: new Date(Date.now() - 86400000 * 15).toISOString().split('T')[0], target_date: new Date(Date.now() + 86400000 * 45).toISOString().split('T')[0], progress_pct: 25, total_tasks: 8, completed_tasks: 2, blocked_tasks: 2, health_reason: '2 tareas bloqueadas', tasks: projectTasks2 },
  { name: 'WHP-2025-003', title: 'Optimizacion Logistica', status: 'ACTIVE', health: 'RED', department: 'OPS', owner_user: 'martin@example.com', owner_name: 'Martin Samperiz', start_date: new Date(Date.now() - 86400000 * 45).toISOString().split('T')[0], target_date: new Date(Date.now() + 86400000 * 15).toISOString().split('T')[0], progress_pct: 60, total_tasks: 10, completed_tasks: 6, blocked_tasks: 0, overdue_tasks: 3, health_reason: '3 tareas vencidas', tasks: projectTasks3 }
]

export const sampleMyDayData: MyDayData = {
  today: sampleTasks.filter(t => t.status === 'DOING' || t.status === 'NEXT'),
  overdue: sampleTasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'DONE'),
  upcoming: sampleTasks.filter(t => t.due_date && new Date(t.due_date) > new Date()),
  blocked: sampleTasks.filter(t => t.status === 'BLOCKED'),
  blocking: [],
  inbox: sampleTasks.filter(t => !t.project),
  summary: {
    total_today: 2,
    overdue_count: 1,
    blocked_count: 1
  }
}

// Combine all tasks (generic + project tasks) for Kanban view
const allTasks: Task[] = [
  ...sampleTasks,
  ...projectTasks1,
  ...projectTasks2,
  ...projectTasks3
]

export const sampleKanbanColumns: KanbanColumn[] = [
  { status: 'BACKLOG', tasks: allTasks.filter(t => t.status === 'BACKLOG') },
  { status: 'NEXT', tasks: allTasks.filter(t => t.status === 'NEXT') },
  { status: 'DOING', tasks: allTasks.filter(t => t.status === 'DOING') },
  { status: 'BLOCKED', tasks: allTasks.filter(t => t.status === 'BLOCKED') },
  { status: 'DONE', tasks: allTasks.filter(t => t.status === 'DONE') }
]

export const sampleTaskKPIs: DashboardKPIs = {
  projects: {
    total: 3,
    active: 3,
    at_risk: 1,
    health_rate: 66.7
  },
  tasks: {
    total: 20,
    completed_week: 8,
    completed_month: 25,
    blocked: 2,
    blocked_rate: 10,
    overdue: 3,
    overdue_rate: 15
  },
  team: {
    size: 4,
    avg_velocity: 4.2,
    trend: 'up',
    trend_delta: 10.5
  }
}

// Helper to check if in bypass mode
export function isInBypassMode(): boolean {
  return sessionStorage.getItem('auth_bypass') === 'true'
}
