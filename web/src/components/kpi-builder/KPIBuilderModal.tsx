import { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, ArrowRight, Save, Loader2, X, Users } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { MetricSelector } from './MetricSelector'
import { ThresholdEditor } from './ThresholdEditor'
import { VisualizationPicker } from './VisualizationPicker'
import { useCustomKPIMutations } from '../../api'
import { useToast } from '../../hooks/useToast'
import type {
  KPIMetric,
  ThresholdConfig,
  VisualizationType,
  Department,
  CreateCustomKPIData,
  UpdateCustomKPIData,
  CustomKPI
} from '../../types/custom-kpi'

type Step = 'metric' | 'thresholds' | 'visualization'

interface KPIBuilderModalProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Callback when modal is closed */
  onClose: () => void
  /** Department for the KPI */
  department: Exclude<Department, 'ALL'>
  /** Callback when KPI is successfully saved */
  onSuccess?: () => void
  /** Existing KPI to edit (optional - if provided, modal is in edit mode) */
  editKPI?: CustomKPI
}

/**
 * Modal dialog that combines MetricSelector, ThresholdEditor, and VisualizationPicker
 * into a step-by-step builder flow for creating or editing custom KPIs
 */
export function KPIBuilderModal({
  isOpen,
  onClose,
  department,
  onSuccess,
  editKPI
}: KPIBuilderModalProps) {
  const [step, setStep] = useState<Step>('metric')
  const [title, setTitle] = useState('')
  const [selectedMetric, setSelectedMetric] = useState<KPIMetric | null>(null)
  const [thresholds, setThresholds] = useState<ThresholdConfig>({
    target_value: null,
    warning_threshold: null,
    critical_threshold: null
  })
  const [visualizationType, setVisualizationType] = useState<VisualizationType>('number')
  const [isShared, setIsShared] = useState(false)

  const { createKPI, updateKPI, loading, error } = useCustomKPIMutations(onSuccess)
  const toast = useToast()

  // Initialize form when editing existing KPI
  useEffect(() => {
    if (editKPI) {
      setTitle(editKPI.title)
      setSelectedMetric(null) // Will be set by MetricSelector based on metric code
      setThresholds({
        target_value: editKPI.target_value,
        warning_threshold: editKPI.warning_threshold,
        critical_threshold: editKPI.critical_threshold
      })
      setVisualizationType(editKPI.visualization_type)
      setIsShared(editKPI.is_shared)
    }
  }, [editKPI])

  // Reset form when modal is closed
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setStep('metric')
        setTitle('')
        setSelectedMetric(null)
        setThresholds({
          target_value: null,
          warning_threshold: null,
          critical_threshold: null
        })
        setVisualizationType('number')
        setIsShared(false)
      }, 300)
    }
  }, [isOpen])

  const handleNext = useCallback(() => {
    if (step === 'metric' && selectedMetric) {
      setStep('thresholds')
    } else if (step === 'thresholds') {
      setStep('visualization')
    }
  }, [step, selectedMetric])

  const handleBack = useCallback(() => {
    if (step === 'visualization') {
      setStep('thresholds')
    } else if (step === 'thresholds') {
      setStep('metric')
    }
  }, [step])

  const handleSave = useCallback(async () => {
    if (!selectedMetric) return

    // Validate title
    if (!title.trim()) {
      toast.warning('Please enter a title for your KPI')
      return
    }

    if (editKPI) {
      // Update existing KPI
      const updates: UpdateCustomKPIData = {
        title: title.trim(),
        metric: selectedMetric.metric_code,
        department,
        target_value: thresholds.target_value ?? undefined,
        warning_threshold: thresholds.warning_threshold ?? undefined,
        critical_threshold: thresholds.critical_threshold ?? undefined,
        visualization_type: visualizationType,
        is_shared: isShared
      }

      const result = await updateKPI(editKPI.name, updates)
      if (result) {
        toast.success('KPI updated successfully')
        onClose()
      }
    } else {
      // Create new KPI
      const kpiData: CreateCustomKPIData = {
        title: title.trim(),
        metric: selectedMetric.metric_code,
        department,
        target_value: thresholds.target_value ?? undefined,
        warning_threshold: thresholds.warning_threshold ?? undefined,
        critical_threshold: thresholds.critical_threshold ?? undefined,
        visualization_type: visualizationType,
        is_shared: isShared
      }

      const result = await createKPI(kpiData)
      if (result) {
        toast.success('KPI created successfully')
        onClose()
      }
    }
  }, [
    selectedMetric,
    title,
    department,
    thresholds,
    visualizationType,
    isShared,
    editKPI,
    createKPI,
    updateKPI,
    onClose,
    toast
  ])

  // Calculate progress for progress bar (0-100)
  const progress = step === 'metric' ? 33 : step === 'thresholds' ? 66 : 100

  // Determine if next/save button should be enabled
  const canProceed = step === 'metric' ? selectedMetric !== null : true

  // Step title for modal header
  const getStepTitle = () => {
    const prefix = editKPI ? 'Edit KPI' : 'Create KPI'
    const suffix =
      step === 'metric'
        ? 'Select Metric'
        : step === 'thresholds'
        ? 'Configure Thresholds'
        : 'Choose Visualization'
    return `${prefix}: ${suffix}`
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={getStepTitle()}
      size="lg"
      progress={progress}
    >
      <div className="p-6 space-y-6">
        {/* Title Input - shown on all steps */}
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-wider font-semibold text-stone-600 dark:text-stone-400">
            KPI Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Monthly Sales Target"
            className="
              w-full px-4 py-3
              bg-white dark:bg-stone-800
              border-2 border-stone-900 dark:border-stone-100
              text-sm text-stone-900 dark:text-stone-100
              placeholder:text-stone-400
              focus:outline-none focus:ring-0
            "
          />
        </div>

        {/* Step: Select Metric */}
        {step === 'metric' && (
          <MetricSelector
            value={editKPI?.metric}
            onChange={setSelectedMetric}
            department={department}
          />
        )}

        {/* Step: Configure Thresholds */}
        {step === 'thresholds' && selectedMetric && (
          <ThresholdEditor
            value={thresholds}
            onChange={setThresholds}
            valueType={selectedMetric.value_type}
            higherIsBetter={true}
          />
        )}

        {/* Step: Choose Visualization */}
        {step === 'visualization' && selectedMetric && (
          <>
            <VisualizationPicker
              value={visualizationType}
              onChange={setVisualizationType}
              currentValue={75}
              valueType={selectedMetric.value_type}
            />

            {/* Sharing Toggle */}
            <div className="space-y-3 pt-4 border-t-2 border-stone-900 dark:border-stone-100">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={isShared}
                  onChange={(e) => setIsShared(e.target.checked)}
                  className="
                    mt-1 h-5 w-5
                    border-2 border-stone-900 dark:border-stone-100
                    text-amber-500
                    focus:ring-0 focus:ring-offset-0
                    cursor-pointer
                  "
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Users size={16} className="text-stone-600 dark:text-stone-400" />
                    <span className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                      Share with department
                    </span>
                  </div>
                  <p className="text-xs text-stone-600 dark:text-stone-400 mt-1">
                    {isShared
                      ? `All members of the ${department} department will see this KPI on their dashboard.`
                      : 'This KPI will only be visible to you.'}
                  </p>
                </div>
              </label>
            </div>
          </>
        )}

        {/* Error message */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border-2 border-red-600 dark:border-red-400">
            <p className="text-sm text-red-700 dark:text-red-300 font-medium">
              {error.message}
            </p>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex items-center justify-between gap-4 pt-4 border-t-2 border-stone-900 dark:border-stone-100">
          {/* Back button */}
          <button
            type="button"
            onClick={handleBack}
            disabled={step === 'metric' || loading}
            className="
              flex items-center gap-2 px-4 py-2
              bg-white dark:bg-stone-800
              border-2 border-stone-900 dark:border-stone-100
              text-stone-900 dark:text-stone-100
              font-medium text-sm uppercase tracking-wider
              shadow-[2px_2px_0_#1c1917] dark:shadow-[2px_2px_0_#f5f5f4]
              hover:shadow-[4px_4px_0_#1c1917] dark:hover:shadow-[4px_4px_0_#f5f5f4]
              hover:-translate-x-[2px] hover:-translate-y-[2px]
              disabled:opacity-50 disabled:cursor-not-allowed
              disabled:hover:shadow-[2px_2px_0_#1c1917] dark:disabled:hover:shadow-[2px_2px_0_#f5f5f4]
              disabled:hover:translate-x-0 disabled:hover:translate-y-0
              transition-all
            "
          >
            <ArrowLeft size={16} />
            Back
          </button>

          {/* Next/Save button */}
          {step === 'visualization' ? (
            <button
              type="button"
              onClick={handleSave}
              disabled={!canProceed || loading || !title.trim()}
              className="
                flex items-center gap-2 px-6 py-2
                bg-amber-400 dark:bg-amber-500
                border-2 border-stone-900 dark:border-stone-100
                text-stone-900 dark:text-stone-100
                font-bold text-sm uppercase tracking-wider
                shadow-[4px_4px_0_#1c1917] dark:shadow-[4px_4px_0_#f5f5f4]
                hover:shadow-[2px_2px_0_#1c1917] dark:hover:shadow-[2px_2px_0_#f5f5f4]
                hover:translate-x-[2px] hover:translate-y-[2px]
                disabled:opacity-50 disabled:cursor-not-allowed
                disabled:hover:shadow-[4px_4px_0_#1c1917] dark:disabled:hover:shadow-[4px_4px_0_#f5f5f4]
                disabled:hover:translate-x-0 disabled:hover:translate-y-0
                transition-all
              "
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={16} />
                  {editKPI ? 'Update KPI' : 'Create KPI'}
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              disabled={!canProceed || loading}
              className="
                flex items-center gap-2 px-6 py-2
                bg-amber-400 dark:bg-amber-500
                border-2 border-stone-900 dark:border-stone-100
                text-stone-900 dark:text-stone-100
                font-bold text-sm uppercase tracking-wider
                shadow-[4px_4px_0_#1c1917] dark:shadow-[4px_4px_0_#f5f5f4]
                hover:shadow-[2px_2px_0_#1c1917] dark:hover:shadow-[2px_2px_0_#f5f5f4]
                hover:translate-x-[2px] hover:translate-y-[2px]
                disabled:opacity-50 disabled:cursor-not-allowed
                disabled:hover:shadow-[4px_4px_0_#1c1917] dark:disabled:hover:shadow-[4px_4px_0_#f5f5f4]
                disabled:hover:translate-x-0 disabled:hover:translate-y-0
                transition-all
              "
            >
              Next
              <ArrowRight size={16} />
            </button>
          )}
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-2">
          <div
            className={`h-2 w-2 rounded-full transition-colors ${
              step === 'metric'
                ? 'bg-amber-500'
                : 'bg-stone-300 dark:bg-stone-600'
            }`}
          />
          <div
            className={`h-2 w-2 rounded-full transition-colors ${
              step === 'thresholds'
                ? 'bg-amber-500'
                : 'bg-stone-300 dark:bg-stone-600'
            }`}
          />
          <div
            className={`h-2 w-2 rounded-full transition-colors ${
              step === 'visualization'
                ? 'bg-amber-500'
                : 'bg-stone-300 dark:bg-stone-600'
            }`}
          />
        </div>
      </div>
    </Modal>
  )
}
