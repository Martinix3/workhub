// API exports
export { frappe, default as frappeClient } from './frappe-client'
export type { FrappeConfig, FrappeResponse, FrappeError } from './frappe-client'

// Services
export { default as salesApi } from './services/sales'
export { default as commandCenterApi } from './services/command-center'
export { default as distributorsApi } from './services/distributors'
export { default as productionApi } from './services/production'
export { default as marketingApi } from './services/marketing'
export { default as tasksApi } from './services/tasks'

// Sales Hooks
export {
  useSalesKPIs,
  useCustomers,
  useOrders,
  useOpportunities,
  useRecentActivity,
  useSalesTrends,
  useSalesDashboard,
  useProducts,
  useCreateOrder
} from './hooks/useSalesData'

// Sales types
export type { Product, CreateOrderData, CreateOrderResponse, CreateOrderItem } from './services/sales'

// Command Center Hooks
export {
  useAreaSummaries,
  useAlerts,
  useCommandCenter
} from './hooks/useCommandCenter'

// Distributor Hooks
export {
  useDistributorKPIs,
  useDistributors,
  useDistributorDashboard,
  useMyOrders,
  useMyInventory,
  useMySellOutRecords,
  usePortalAnalytics,
  useDistributorPortal
} from './hooks/useDistributors'

// Production Hooks
export {
  useProductionKPIs,
  useProductionOrders,
  useProductionLines,
  useProductionDashboard,
  useLots,
  useHACCPPlans,
  useHACCPReadings,
  useActiveAlerts,
  useHACCPMonitor,
  useDocumentFolders,
  useDocuments,
  useDocumentLibrary,
  useQualityKPIs,
  usePendingInspections,
  useOpenNCs,
  useWeeklyTrend,
  useQualityDashboard
} from './hooks/useProduction'

// Marketing Hooks
export {
  useMarketingKPIs,
  useActiveCampaigns,
  useRecentPosts,
  usePlatformStats,
  useMarketingDashboard
} from './hooks/useMarketing'

// Settings Hooks
export {
  useUserSettings,
  useUserProfile,
  useDepartments
} from './hooks/useSettings'

// Admin Hooks
export {
  useUsers,
  useUserDetail,
  useRoles,
  useUserMutations
} from './hooks/useAdmin'

// Task Management Hooks
export {
  useMyDay,
  useTasks,
  useTaskMutations,
  useProjects,
  useProject,
  useProjectTemplates,
  useGantt,
  useKanban,
  useTaskKPIs,
  useTaskDashboard
} from './hooks/useTasks'

// Template Management Hooks
export {
  useTemplates,
  useTemplatePreview,
  useTemplateMutations
} from './hooks/useTemplates'
