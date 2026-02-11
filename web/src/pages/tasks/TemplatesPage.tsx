import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Layers } from 'lucide-react'
import { TemplateGallery, TemplatePreviewModal } from '../../components/templates'
import type { TemplateCardData, TemplatePreviewData } from '../../components/templates'
import { LoadingState } from '../../components/ui/LoadingState'
import { ErrorState } from '../../components/ui/ErrorState'

export function TemplatesPage() {
  const navigate = useNavigate()
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  // Mock data - will be replaced with API hooks in subtask 3.5
  const loading = false
  const error = null

  // Mock templates data - will be replaced with real API data
  const templates: TemplateCardData[] = [
    {
      name: 'template-sales-001',
      title: 'Customer Onboarding',
      description: 'Complete workflow for onboarding new customers, from initial contact to first purchase',
      department: 'SALES',
      task_count: 10,
      estimated_duration_days: 30,
    },
    {
      name: 'template-sales-002',
      title: 'Sales Campaign',
      description: 'End-to-end sales campaign workflow with prospecting, outreach, and follow-up stages',
      department: 'SALES',
      task_count: 12,
      estimated_duration_days: 45,
    },
    {
      name: 'template-ops-001',
      title: 'Logistics Integration',
      description: 'Integrate new logistics provider with systems setup and testing',
      department: 'OPS',
      task_count: 11,
      estimated_duration_days: 35,
    },
    {
      name: 'template-ops-002',
      title: 'Inventory Audit',
      description: 'Comprehensive inventory audit process with reconciliation and reporting',
      department: 'OPS',
      task_count: 14,
      estimated_duration_days: 21,
    },
    {
      name: 'template-production-001',
      title: 'Product Launch',
      description: 'Full product launch workflow from concept to market release',
      department: 'PRODUCTION',
      task_count: 17,
      estimated_duration_days: 90,
    },
    {
      name: 'template-mkt-001',
      title: 'Marketing Campaign',
      description: 'Complete marketing campaign from strategy to execution and analysis',
      department: 'MKT',
      task_count: 17,
      estimated_duration_days: 60,
    },
  ]

  // Mock preview data - will be replaced with API call in subtask 3.5
  const getTemplatePreview = (templateName: string): TemplatePreviewData | null => {
    const template = templates.find(t => t.name === templateName)
    if (!template) return null

    // Mock detailed data - this would come from API
    return {
      template: {
        name: template.name,
        description: template.description,
        department: template.department,
        estimated_duration_days: template.estimated_duration_days,
        task_count: template.task_count,
        milestone_count: 3,
      },
      tasks: [
        {
          sequence: 1,
          title: 'Initial Setup',
          description: 'Set up project infrastructure and team assignments',
          offset_days: 0,
          duration_days: 2,
          default_assignee_role: 'Project Manager',
          is_milestone: false,
          depends_on_sequence: null,
        },
        {
          sequence: 2,
          title: 'Phase 1 Kickoff',
          description: 'First major milestone - project kickoff',
          offset_days: 2,
          duration_days: 1,
          default_assignee_role: 'Project Manager',
          is_milestone: true,
          depends_on_sequence: 1,
        },
        {
          sequence: 3,
          title: 'Core Implementation',
          description: 'Execute main project tasks',
          offset_days: 3,
          duration_days: 14,
          default_assignee_role: 'Team Lead',
          is_milestone: false,
          depends_on_sequence: 2,
        },
      ],
      milestones: [
        {
          sequence: 2,
          title: 'Phase 1 Kickoff',
          offset_days: 2,
          duration_days: 1,
        },
      ],
      dependencies: [
        {
          from_sequence: 1,
          to_sequence: 2,
          from_title: 'Initial Setup',
          to_title: 'Phase 1 Kickoff',
        },
        {
          from_sequence: 2,
          to_sequence: 3,
          from_title: 'Phase 1 Kickoff',
          to_title: 'Core Implementation',
        },
      ],
    }
  }

  const handleTemplateClick = (template: TemplateCardData) => {
    setSelectedTemplate(template.name)
  }

  const handleClosePreview = () => {
    setSelectedTemplate(null)
  }

  const handleUseTemplate = () => {
    // Navigate to new project page with selected template
    if (selectedTemplate) {
      navigate(`/tareas/proyectos/nuevo?template=${selectedTemplate}`)
    }
  }

  // Get preview data for selected template
  const previewData = selectedTemplate ? getTemplatePreview(selectedTemplate) : null

  if (loading) {
    return <LoadingState message="Cargando plantillas..." fullPage />
  }

  if (error) {
    return (
      <ErrorState
        title="Error al cargar plantillas"
        message="No se pudo cargar la lista de plantillas."
        error={error}
        onRetry={() => window.location.reload()}
        fullPage
      />
    )
  }

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          {/* Back Button */}
          <button
            onClick={() => navigate('/tareas/proyectos')}
            className="
              inline-flex items-center gap-2 mb-4
              text-neutral-600 dark:text-neutral-400
              hover:text-neutral-900 dark:hover:text-neutral-100
              transition-colors
            "
          >
            <ArrowLeft size={18} />
            <span className="text-sm uppercase tracking-wider font-medium">Volver a Proyectos</span>
          </button>

          {/* Title Section */}
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-gold border border-neutral-200 dark:border-neutral-100 flex items-center justify-center">
                  <Layers size={24} className="text-neutral-900" />
                </div>
                <h1 className="font-heading text-3xl lg:text-4xl font-bold text-neutral-900 dark:text-neutral-100">
                  Plantillas de Proyecto
                </h1>
              </div>
              <p className="text-neutral-500 dark:text-neutral-400 uppercase tracking-wider text-sm mt-2">
                Plantillas prediseñadas para iniciar proyectos rápidamente
              </p>
            </div>

            {/* Stats Badge */}
            <div className="
              bg-white dark:bg-neutral-800
              border border-neutral-200 dark:border-neutral-100
              px-6 py-3
            ">
              <p className="text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wider font-medium mb-1">
                Total Disponible
              </p>
              <p className="font-mono text-3xl font-bold text-neutral-900 dark:text-neutral-100">
                {templates.length}
              </p>
            </div>
          </div>
        </div>

        {/* Separator */}
        <div className="w-full h-0.5 bg-neutral-900 dark:bg-neutral-100 mb-8" />

        {/* Template Gallery */}
        <TemplateGallery
          templates={templates}
          onTemplateClick={handleTemplateClick}
        />

        {/* Template Preview Modal */}
        <TemplatePreviewModal
          isOpen={selectedTemplate !== null}
          onClose={handleClosePreview}
          templateData={previewData}
          onUseTemplate={handleUseTemplate}
          loading={previewLoading}
        />
      </div>
    </div>
  )
}

export default TemplatesPage
