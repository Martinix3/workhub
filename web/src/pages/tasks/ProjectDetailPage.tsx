// ProjectDetailPage - Project Detail with Reference Content Structure
// Stone & Ink Design System - Neobrutalismo Editorial (Light Theme)

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
    ArrowLeft,
    ExternalLink,
    Users,
    CheckCircle2,
    Circle,
    ChevronDown,
    ChevronRight,
    Lightbulb,
    ListChecks,
    LayoutGrid,
    Layers,
    List,
    ArrowUpDown,
    Sparkles
} from 'lucide-react'

// Components
import { LoadingState } from '../../components/ui/LoadingState'
import { ErrorState } from '../../components/ui/ErrorState'
import { ProjectPlanWizard } from '../../components/tasks/ProjectPlanWizard'
import { GeminiProjectAssistant } from '../../components/ai/GeminiProjectAssistant'
import { useAuth } from '../../auth/AuthContext'
import { getRoleMission } from '../../api/services/roleIntelligence'

// API & Types
import { projectDetailApi } from '../../api/services/project-detail'
import type {
    MoscowPriority,
    ProjectStrategy,
    FeatureDetail,
    StrategicPhase
} from '../../api/types/focus'
import { isInBypassMode } from '../../api/sample-data'

// ============ Main Component ============

export function ProjectDetailPage() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { user } = useAuth()

    const [project, setProject] = useState<ProjectStrategy | null>(null)
    const [activeTab, setActiveTab] = useState<'kanban' | 'phases' | 'features' | 'priority' | 'ai'>('phases')
    const [expandedPhase, setExpandedPhase] = useState<string | null>(null)
    const [selectedFeature, setSelectedFeature] = useState<FeatureDetail | null>(null)
    const [wizardOpen, setWizardOpen] = useState(false)

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        async function fetchProject() {
            if (!id) return

            try {
                setLoading(true)
                setError(null)

                if (isInBypassMode()) {
                    setProject(null)
                    return
                }

                const data = await projectDetailApi.getProjectStrategy(id)

                if (data) {
                    setProject(data)
                    // Default expand the first active phase
                    if (data.phases.length > 0) {
                        setExpandedPhase(data.phases[0].id)
                    }
                } else {
                    setError('Proyecto no encontrado. Asegúrate de que existe el metadata (WH Project Meta).')
                }
            } catch (err) {
                console.error('Failed to fetch project:', err)
                if (isInBypassMode()) {
                    setProject(null)
                } else {
                    setError('Error cargando estrategia del proyecto. Verifica la conexión con el backend.')
                }
            } finally {
                setLoading(false)
            }
        }

        fetchProject()
    }, [id])

    if (loading) {
        return <LoadingState message="Cargando estrategia del proyecto..." />
    }

    if (error || !project) {
        return (
            <ErrorState
                title="No se pudo cargar el proyecto"
                message={error || "Error desconocido"}
                onRetry={() => window.location.reload()}
            />
        )
    }

    return (
        <div className="min-h-screen bg-stone-100">
            {/* Main Content Area */}
            <div className="flex">
                {/* Left: Main Content */}
                <div className="flex-1 p-6 overflow-auto">
                    {/* Header */}
                    <header className="mb-6">
                        {/* Back Button + Title Row */}
                        <div className="flex items-center gap-4 mb-3">
                            <button
                                onClick={() => navigate(-1)}
                                className="p-2 bg-white border border-[#E8E6E3] shadow-sm hover:shadow-[1px_1px_0_#1c1917] hover:translate-x-[1px] hover:translate-y-[1px] transition-all duration-75"
                            >
                                <ArrowLeft size={16} />
                            </button>

                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-[#F5CE3E] border border-[#E8E6E3] flex items-center justify-center">
                                    <span className="font-serif font-bold text-stone-900">◈</span>
                                </div>
                                <h1 className="font-serif text-2xl font-bold text-stone-900">{project.title}</h1>
                                <span className="px-2 py-0.5 text-xs font-bold uppercase tracking-wider bg-stone-200 text-stone-600 border border-[#A8A29E]">
                                    {project.status || 'DRAFT'}
                                </span>
                                <button
                                    onClick={() => setWizardOpen(true)}
                                    className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-stone-700 border border-[#D4D1CC] hover:border-[#1C1917] hover:bg-stone-50 transition"
                                >
                                    Workshop
                                </button>
                                <button className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-cyan-600 hover:text-cyan-700 hover:underline">
                                    <ExternalLink size={12} />
                                    Competitor Analysis
                                </button>
                            </div>
                        </div>

                        {/* Description */}
                        <p className="text-sm text-stone-600 mb-3 max-w-2xl leading-relaxed">
                            {project.description}
                        </p>

                        {/* Target Audience */}
                        {project.targetAudience && (
                            <div className="flex items-center gap-2 text-sm text-stone-500 mb-4">
                                <Users size={14} />
                                <span className="font-medium">Target:</span>
                                <span>{project.targetAudience}</span>
                            </div>
                        )}

                        {/* Stats Bar */}
                        <div className="flex items-center gap-4 text-sm">
                            <span className="font-mono text-stone-700">
                                <strong>{project.stats.totalFeatures}</strong> features
                            </span>
                            <span className="font-mono text-stone-700">
                                <strong>{project.stats.totalPhases}</strong> phases
                            </span>
                            <div className="flex items-center gap-2">
                                <MoscowBadgeNeo moscow="MUST" count={project.stats.must} />
                                <MoscowBadgeNeo moscow="SHOULD" count={project.stats.should} />
                                <MoscowBadgeNeo moscow="COULD" count={project.stats.could} />
                                <MoscowBadgeNeo moscow="WONT" count={project.stats.wont} />
                            </div>
                        </div>
                    </header>

                    {/* Tabs - Neo-Brutalist Style */}
                    <div className="flex items-center gap-0 mb-6 border-b-2 border-[#1C1917]">
                        {[
                            { id: 'kanban', label: 'Kanban', icon: <LayoutGrid size={14} /> },
                            { id: 'phases', label: 'Phases', icon: <Layers size={14} /> },
                            { id: 'features', label: 'All Features', icon: <List size={14} /> },
                            { id: 'priority', label: 'By Priority', icon: <ArrowUpDown size={14} /> },
                            { id: 'ai', label: 'AI Assistant', icon: <Sparkles size={14} /> }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border border-b-0 border-[#1C1917] transition-all duration-75 ${activeTab === tab.id
                                    ? 'bg-[#F5CE3E] text-stone-900 -mb-[2px] shadow-[2px_-2px_0_#1c1917]'
                                    : 'bg-white text-stone-600 hover:bg-stone-50'
                                    }`}
                            >
                                {tab.icon}
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Content Area */}
                    {activeTab === 'phases' && (
                        <div className="space-y-4">
                            {project.phases.length === 0 && (
                                <div className="p-8 text-center text-stone-500 border border-dashed border-[#D4D1CC]">
                                    No hay fases definidas para este proyecto.
                                </div>
                            )}
                            {project.phases.map((phase, index) => (
                                <PhaseCardNeo
                                    key={phase.id}
                                    phase={phase}
                                    index={index + 1}
                                    isExpanded={expandedPhase === phase.id}
                                    onToggle={() => setExpandedPhase(expandedPhase === phase.id ? null : phase.id)}
                                    onFeatureClick={(f) => setSelectedFeature(f)}
                                />
                            ))}
                        </div>
                    )}

                    {activeTab === 'kanban' && (
                        <div className="p-8 bg-white border border-[#E8E6E3] shadow-sm text-center">
                            <p className="text-stone-500">Vista Kanban - Próximamente</p>
                        </div>
                    )}

                    {activeTab === 'features' && (
                        <div className="p-8 bg-white border border-[#E8E6E3] shadow-sm text-center">
                            <p className="text-stone-500">Vista de Features - Próximamente</p>
                        </div>
                    )}

                    {activeTab === 'priority' && (
                        <div className="p-8 bg-white border border-[#E8E6E3] shadow-sm text-center">
                            <p className="text-stone-500">Vista por Prioridad - Próximamente</p>
                        </div>
                    )}

                    {activeTab === 'ai' && project && (
                        <div className="max-w-3xl mx-auto">
                            <div className="bg-white border border-[#5BBFBF] p-6 shadow-sm rounded-sm mb-6">
                                <h3 className="font-serif text-lg font-bold text-[#292524] mb-4 flex items-center gap-2">
                                    <Sparkles className="text-[#5BBFBF]" size={20} />
                                    Project Intelligence
                                </h3>
                                <p className="text-sm text-stone-600 mb-6">
                                    Use Gemini to analyze your project, suggest breakdowns, and optimize priorities.
                                </p>
                                <GeminiProjectAssistant
                                    projectId={project.name || 'new'}
                                    projectDescription={project.description}
                                    userRole={user?.roles?.[0] || 'Member'} // Naive role picking for now
                                    roleMission={user?.roles?.[0] ? getRoleMission(user.roles[0]) : undefined}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Sidebar - Feature Detail */}
                {selectedFeature && (
                    <aside className="w-80 border-l-2 border-[#1C1917] bg-white p-4 overflow-auto">
                        <FeatureDetailPanelNeo feature={selectedFeature} />
                    </aside>
                )}
            </div>

            <ProjectPlanWizard
                isOpen={wizardOpen}
                projectId={project.name}
                onClose={() => setWizardOpen(false)}
            />
        </div>
    )
}

// ============ Sub-components ============

function MoscowBadgeNeo({ moscow, count }: { moscow: MoscowPriority; count?: number }) {
    const styles: Record<MoscowPriority, { bg: string; text: string; border: string }> = {
        MUST: { bg: 'bg-[#FFEBEE]', text: 'text-[#B85A35]', border: 'border-[#E07A4C]' },
        SHOULD: { bg: 'bg-[#FFF8E1]', text: 'text-[#B87A1F]', border: 'border-[#E5A530]' },
        COULD: { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-500' },
        WONT: { bg: 'bg-stone-100', text: 'text-stone-500', border: 'border-[#A8A29E]' }
    }

    const style = styles[moscow] || styles.WONT

    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold uppercase tracking-wider border ${style.bg} ${style.text} ${style.border}`}>
            {count !== undefined && <span className="font-mono">{count}</span>}
            {moscow ? moscow.toLowerCase() : 'N/A'}
        </span>
    )
}

interface PhaseCardNeoProps {
    phase: StrategicPhase
    index: number
    isExpanded: boolean
    onToggle: () => void
    onFeatureClick: (feature: FeatureDetail) => void
}

function PhaseCardNeo({ phase, index, isExpanded, onToggle, onFeatureClick }: PhaseCardNeoProps) {
    return (
        <div className="bg-white border border-[#E8E6E3] shadow-sm">
            {/* Header */}
            <button
                onClick={onToggle}
                className="w-full p-4 flex items-start gap-4 text-left hover:bg-stone-50 transition-colors"
            >
                <span className="flex-shrink-0 w-8 h-8 bg-[#F5CE3E] border border-[#E8E6E3] flex items-center justify-center font-serif font-bold text-stone-900">
                    {index}
                </span>
                <div className="flex-1">
                    <h3 className="font-serif font-bold text-lg text-stone-900 mb-1">{phase.name}</h3>
                    {phase.description && <p className="text-sm text-stone-600">{phase.description}</p>}

                    {/* Progress Bar */}
                    <div className="mt-3">
                        <div className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-1">Progress</div>
                        <div className="h-3 bg-stone-200 border border-[#E8E6E3]">
                            <div
                                className="h-full bg-gradient-to-r from-amber-400 to-emerald-400"
                                style={{ width: `${phase.progress}%` }}
                            />
                        </div>
                    </div>
                </div>
                <span className="flex-shrink-0 text-stone-500 p-1">
                    {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                </span>
            </button>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="px-4 pb-4 pt-0 border-t-2 border-[#E8E6E3]">
                    {/* Milestones */}
                    {phase.milestones.length > 0 && (
                        <div className="mb-4 pt-4">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">Milestones</h4>
                            <div className="space-y-2">
                                {phase.milestones.map((milestone) => (
                                    <label
                                        key={milestone.id}
                                        className="flex items-center gap-3 text-sm text-stone-700 cursor-pointer hover:text-stone-900"
                                    >
                                        {milestone.completed ? (
                                            <CheckCircle2 size={18} className="text-emerald-500" />
                                        ) : (
                                            <Circle size={18} className="text-stone-400" />
                                        )}
                                        <span>{milestone.title}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Features */}
                    <div className="pt-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">
                            Features ({phase.features.length})
                        </h4>
                        <div className="space-y-1">
                            {phase.features.map((feature) => (
                                <button
                                    key={feature.id}
                                    onClick={() => onFeatureClick(feature)}
                                    className="w-full flex items-center gap-3 p-2 text-sm text-left text-stone-700 hover:bg-[#FFF8E1] border border-transparent hover:border-[#E5A530] transition-all"
                                >
                                    <MoscowBadgeNeo moscow={feature.moscow} />
                                    <span className="flex-1">{feature.title}</span>
                                    {feature.hasLink && (
                                        <ExternalLink size={14} className="text-cyan-600" />
                                    )}
                                </button>
                            ))}
                            {phase.features.length > 7 && (
                                <button className="text-sm text-cyan-600 hover:text-cyan-700 hover:underline pl-2 font-medium">
                                    +{phase.features.length - 7} more features
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

interface FeatureDetailPanelNeoProps {
    feature: FeatureDetail
}

function FeatureDetailPanelNeo({ feature }: FeatureDetailPanelNeoProps) {
    const complexityStyles = {
        low: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-500' },
        medium: { bg: 'bg-[#FFF8E1]', text: 'text-[#B87A1F]', border: 'border-[#E5A530]' },
        high: { bg: 'bg-[#FFEBEE]', text: 'text-[#B85A35]', border: 'border-[#E07A4C]' }
    }

    const impactStyles = {
        low: { bg: 'bg-stone-100', text: 'text-stone-600', border: 'border-[#A8A29E]' },
        medium: { bg: 'bg-[#FFF8E1]', text: 'text-[#B87A1F]', border: 'border-[#E5A530]' },
        high: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-500' }
    }

    const cStyle = complexityStyles[feature.complexity] || complexityStyles.medium
    const iStyle = impactStyles[feature.impact] || impactStyles.medium

    return (
        <div className="space-y-5">
            {/* Header Badges */}
            <div className="flex items-center gap-2 flex-wrap">
                <MoscowBadgeNeo moscow={feature.moscow} />
                <span className={`px-2 py-0.5 text-xs font-bold uppercase tracking-wider border ${cStyle.bg} ${cStyle.text} ${cStyle.border}`}>
                    {feature.complexity}
                </span>
            </div>

            {/* Title */}
            <h2 className="font-serif text-xl font-bold text-stone-900">{feature.title}</h2>
            <p className="text-sm text-stone-600 leading-relaxed">{feature.description}</p>

            {/* Rationale */}
            {feature.rationale && (
                <div className="p-3 bg-stone-50 border border-[#D4D1CC]">
                    <div className="flex items-center gap-2 text-sm font-bold text-stone-700 mb-2">
                        <Lightbulb size={14} className="text-[#E5A530]" />
                        <span>Rationale</span>
                    </div>
                    <p className="text-sm text-stone-600 leading-relaxed">{feature.rationale}</p>
                </div>
            )}

            {/* Metrics Grid */}
            <div className="grid grid-cols-3 gap-2">
                <div className="text-center p-3 bg-white border border-[#E8E6E3] shadow-sm">
                    <span className={`inline-block px-2 py-0.5 text-xs font-bold uppercase border ${cStyle.bg} ${cStyle.text} ${cStyle.border}`}>
                        {feature.complexity}
                    </span>
                    <div className="text-xs text-stone-500 mt-2 font-medium uppercase tracking-wider">Complexity</div>
                </div>
                <div className="text-center p-3 bg-white border border-[#E8E6E3] shadow-sm">
                    <span className={`inline-block px-2 py-0.5 text-xs font-bold uppercase border ${iStyle.bg} ${iStyle.text} ${iStyle.border}`}>
                        {feature.impact}
                    </span>
                    <div className="text-xs text-stone-500 mt-2 font-medium uppercase tracking-wider">Impact</div>
                </div>
                <div className="text-center p-3 bg-white border border-[#E8E6E3] shadow-sm">
                    <span className="text-2xl font-mono font-bold text-stone-900">{feature.dependencies}</span>
                    <div className="text-xs text-stone-500 mt-1 font-medium uppercase tracking-wider">Dependencies</div>
                </div>
            </div>

            {/* User Stories */}
            {feature.userStories && feature.userStories.length > 0 && (
                <div>
                    <div className="flex items-center gap-2 text-sm font-bold text-stone-700 mb-2">
                        <Users size={14} className="text-cyan-600" />
                        <span>User Stories</span>
                    </div>
                    <div className="space-y-2">
                        {feature.userStories.map((story, i) => (
                            <p key={i} className="text-sm text-stone-600 italic leading-relaxed pl-3 border-l-4 border-[#E5A530]">
                                {story}
                            </p>
                        ))}
                    </div>
                </div>
            )}

            {/* Acceptance Criteria */}
            {feature.acceptanceCriteria && feature.acceptanceCriteria.length > 0 && (
                <div>
                    <div className="flex items-center gap-2 text-sm font-bold text-stone-700 mb-2">
                        <ListChecks size={14} className="text-emerald-600" />
                        <span>Acceptance Criteria</span>
                    </div>
                    <div className="space-y-2">
                        {feature.acceptanceCriteria.map((criteria, i) => (
                            <label key={i} className="flex items-start gap-2 text-sm text-stone-600 cursor-pointer hover:text-stone-800">
                                {criteria.done ? (
                                    <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                                ) : (
                                    <Circle size={16} className="text-stone-400 flex-shrink-0 mt-0.5" />
                                )}
                                <span className={criteria.done ? 'line-through text-stone-400' : ''}>{criteria.text}</span>
                            </label>
                        ))}
                    </div>
                </div>
            )}

            {/* Go to Task Button */}
            <button className="w-full py-3 px-4 bg-[#F5CE3E] hover:bg-[#FFF8E1]0 text-stone-900 text-sm font-bold uppercase tracking-wider border border-[#E8E6E3] shadow-sm hover:shadow-sm  transition-all duration-75 flex items-center justify-center gap-2">
                <ExternalLink size={16} />
                Go to Task
            </button>
        </div>
    )
}

export default ProjectDetailPage
