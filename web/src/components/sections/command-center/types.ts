// =============================================================================
// Data Types - Command Center
// =============================================================================

export type AreaStatus = 'green' | 'yellow' | 'red'

export interface AreaKPI {
  value: number
  previousValue: number
  change: number
  label: string
  target?: number
}

export interface AreaSummary {
  id: string
  name: string
  icon: string
  status: AreaStatus
  mainKPI: AreaKPI
  secondaryKPIs?: AreaKPI[]
}

export type AlertPriority = 'high' | 'medium' | 'low'
export type AlertCategory = 'sales' | 'operations' | 'production' | 'quality' | 'finance' | 'marketing'

export interface PriorityAlert {
  id: string
  title: string
  description: string
  category: AlertCategory
  priority: AlertPriority
  timestamp: string
  actionUrl?: string
}

export interface FinancialKPI {
  value: number
  previousValue: number
  change: number
  label: string
}

export interface FinancialSummary {
  revenue: FinancialKPI
  expenses: FinancialKPI
  cashFlow: FinancialKPI
  receivables: FinancialKPI
  payables: FinancialKPI
}

export interface AccountReceivable {
  id: string
  customerName: string
  amount: number
  dueDate: string
  daysOverdue: number
  status: 'current' | 'overdue' | 'critical'
}

export interface AccountPayable {
  id: string
  vendorName: string
  amount: number
  dueDate: string
  daysUntilDue: number
}

export interface CashFlowProjection {
  period: string
  inflow: number
  outflow: number
  balance: number
}

export type ReportType = 'sales' | 'inventory' | 'production' | 'quality' | 'financial'
export type ReportFormat = 'pdf' | 'excel'

export interface ReportTemplate {
  id: string
  name: string
  description: string
  type: ReportType
  formats: ReportFormat[]
  lastGenerated?: string
  scheduled?: {
    frequency: 'daily' | 'weekly' | 'monthly'
    recipients: string[]
  }
}

// =============================================================================
// Component Props
// =============================================================================

export interface ExecutiveDashboardProps {
  areas: AreaSummary[]
  alerts: PriorityAlert[]
  onNavigateToArea?: (areaId: string) => void
  onDismissAlert?: (alertId: string) => void
  onViewAlert?: (alertId: string) => void
}

export interface FinancialOverviewProps {
  summary: FinancialSummary
  receivables: AccountReceivable[]
  payables: AccountPayable[]
  cashFlowProjection: CashFlowProjection[]
  onViewReceivable?: (id: string) => void
  onViewPayable?: (id: string) => void
}

export interface ReportsHubProps {
  templates: ReportTemplate[]
  onGenerateReport?: (templateId: string, format: ReportFormat) => void
  onScheduleReport?: (templateId: string) => void
  onViewReport?: (templateId: string) => void
}
