// =============================================================================
// Data Types - Custom KPI Builder
// =============================================================================

/**
 * Department types matching backend enum
 */
export type Department = 'SALES' | 'OPS' | 'MKT' | 'ALL'

/**
 * Value type for metrics
 */
export type ValueType = 'number' | 'currency' | 'percent'

/**
 * Aggregation methods for metric calculations
 */
export type AggregationType = 'sum' | 'avg' | 'count' | 'last' | 'min' | 'max'

/**
 * Data source types for metrics
 */
export type DataSourceType = 'sql' | 'api' | 'python'

/**
 * Visualization types for custom KPIs
 */
export type VisualizationType = 'number' | 'gauge' | 'sparkline' | 'progress'

/**
 * KPI status based on threshold evaluation
 */
export type KPIStatus = 'ok' | 'warning' | 'critical' | 'unknown'

/**
 * Trend direction indicator
 */
export type TrendDirection = 'up' | 'down' | 'stable'

/**
 * Metric from the catalog (WH KPI Metric DocType)
 * Represents available metrics that can be used in custom KPIs
 */
export interface KPIMetric {
  /** Unique metric code (e.g., 'tasks_completed') */
  metric_code: string
  /** Display label for the metric */
  label: string
  /** Detailed description of what this metric measures */
  description?: string
  /** Department this metric belongs to */
  department: Department
  /** Type of value this metric produces */
  value_type: ValueType
  /** Aggregation method for calculation */
  aggregation: AggregationType
  /** Type of data source */
  data_source_type: DataSourceType
  /** SQL query, API endpoint, or Python code */
  data_source: string
  /** Whether this metric is active and can be used */
  is_active: boolean
}

/**
 * Threshold configuration for a custom KPI
 */
export interface ThresholdConfig {
  /** Target value to achieve */
  target_value: number | null
  /** Warning threshold value */
  warning_threshold: number | null
  /** Critical threshold value */
  critical_threshold: number | null
}

/**
 * Trend data comparing current period to previous period
 */
export interface KPITrend {
  /** Value from previous period */
  previous_value: number
  /** Absolute change (current - previous) */
  change: number
  /** Percentage change */
  change_percent: number
  /** Direction of change */
  direction: TrendDirection
}

/**
 * Custom KPI (WH Custom KPI DocType)
 * User-defined KPI linking to a metric with custom thresholds and visualization
 */
export interface CustomKPI extends ThresholdConfig {
  /** DocType name/ID (e.g., 'KPI-0001') */
  name: string
  /** User-defined title for the KPI */
  title: string
  /** Link to WH KPI Metric */
  metric: string
  /** Department this KPI belongs to */
  department: Exclude<Department, 'ALL'>
  /** User who owns this KPI */
  owner_user: string
  /** Owner's full name (added by API) */
  owner_name?: string
  /** How to visualize this KPI */
  visualization_type: VisualizationType
  /** Whether this KPI is shared with department members */
  is_shared: boolean
  /** Display order for sorting */
  display_order: number
  /** Whether current user owns this KPI (added by API) */
  is_owned: boolean
  /** Current calculated value (added by get_current_value) */
  value: number
  /** Formatted value string (added by get_current_value) */
  formatted: string
  /** Status based on threshold evaluation (added by get_current_value) */
  status: KPIStatus
  /** Error message if calculation failed (added by get_current_value) */
  error?: string
  /** Trend data if available (added by calculate_kpi_value) */
  trend?: KPITrend
}

/**
 * Payload for creating a new custom KPI
 */
export interface CreateCustomKPIData {
  /** User-defined title for the KPI */
  title: string
  /** Link to WH KPI Metric */
  metric: string
  /** Department this KPI belongs to */
  department: Exclude<Department, 'ALL'>
  /** Target value to achieve (optional) */
  target_value?: number
  /** Warning threshold value (optional) */
  warning_threshold?: number
  /** Critical threshold value (optional) */
  critical_threshold?: number
  /** How to visualize this KPI (default: 'number') */
  visualization_type?: VisualizationType
  /** Whether to share with department (default: false) */
  is_shared?: boolean
}

/**
 * Payload for updating an existing custom KPI
 */
export interface UpdateCustomKPIData {
  /** User-defined title for the KPI */
  title?: string
  /** Link to WH KPI Metric */
  metric?: string
  /** Department this KPI belongs to */
  department?: Exclude<Department, 'ALL'>
  /** Target value to achieve */
  target_value?: number
  /** Warning threshold value */
  warning_threshold?: number
  /** Critical threshold value */
  critical_threshold?: number
  /** How to visualize this KPI */
  visualization_type?: VisualizationType
  /** Whether to share with department */
  is_shared?: boolean
}
