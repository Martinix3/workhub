// API Hooks index

// Sales
export {
  useSalesKPIs,
  useCustomers,
  useOrders,
  useOpportunities,
  useRecentActivity,
  useSalesTrends,
  useSalesDashboard
} from './useSalesData'

// Command Center
export {
  useAreaSummaries,
  useAlerts,
  useCommandCenter
} from './useCommandCenter'

// Distributors
export {
  useDistributorKPIs,
  useDistributors,
  useDistributorDashboard,
  useMyOrders,
  useMyInventory,
  useMySellOutRecords,
  usePortalAnalytics,
  useDistributorPortal
} from './useDistributors'

// Production
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
} from './useProduction'

// Marketing
export {
  useMarketingKPIs,
  useActiveCampaigns,
  useRecentPosts,
  usePlatformStats,
  useMarketingDashboard
} from './useMarketing'

// Settings
export {
  useUserSettings,
  useUserProfile,
  useDepartments
} from './useSettings'

// Admin
export {
  useUsers,
  useUserDetail,
  useRoles,
  useUserMutations
} from './useAdmin'

// Smart Notepad
export {
  useNotepad,
  useCustomerSearch,
  useItemSearch
} from './useNotepad'

// Tasks - Saved Filters
export {
  useSavedFilters,
  useSavedFilter,
  useSavedFilterMutations,
  useFilterCounts
} from './useSavedFilters'
