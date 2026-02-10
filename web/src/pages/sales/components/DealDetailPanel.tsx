/**
 * DealDetailPanel Component
 *
 * Panel lateral mejorado para mostrar el detalle de un deal con:
 * - Información básica y contacto
 * - Sistema de prioridades
 * - Notas
 * - Tasks por rol
 * - Historial completo
 * - Alertas de pipeline estancado
 *
 * Sigue el principio de divulgación progresiva y reducción de carga cognitiva TDAH.
 */

import { useState, useEffect } from 'react';
import {
    Building2,
    User,
    Mail,
    Phone,
    Calendar,
    TrendingUp,
    FileText,
    Star,
    Plus,
    Clock,
    AlertTriangle,
    CheckCircle2,
    MessageSquare,
    ListTodo,
    History,
    Send
} from 'lucide-react';
import type { CRMDealDetail } from '../../../api/types/crm';
import {
    getDealDetail,
    advanceDealStage,
    formatDealValue,
    formatSLAHours,
    createQuotationFromDeal,
    toggleDealPriority,
    addDealNote,
    getDealNotes,
    createDealTask,
    getDealTasks,
    getDealHistory
} from '../../../api/services/crm';
import { SidePanel } from '../../../components/ui/SidePanel';
import { CRMTimeline } from './CRMTimeline';
import { CRMNextActionWidget } from './CRMNextActionWidget';

interface DealDetailPanelProps {
    dealId: string | null;
    onClose: () => void;
    onUpdate?: () => void;
}

interface Note {
    id: string;
    content: string;
    created_by: string;
    created_by_name?: string | null;
    created: string;
}

interface Task {
    id: string;
    description: string;
    status: string;
    due_date: string | null;
    assigned_to: string;
    priority: string;
}

interface HistoryItem {
    id: string;
    type: string;
    description: string;
    user: string;
    timestamp: string;
    metadata?: Record<string, unknown>;
}

type ActiveTab = 'info' | 'notes' | 'tasks' | 'history';

export function DealDetailPanel({ dealId, onClose, onUpdate }: DealDetailPanelProps) {
    const [deal, setDeal] = useState<CRMDealDetail | null>(null);
    const [loading, setLoading] = useState(false);
    const [updating, setUpdating] = useState(false);

    // New states for enhanced features
    const [activeTab, setActiveTab] = useState<ActiveTab>('info');
    const [isPriority, setIsPriority] = useState(false);
    const [notes, setNotes] = useState<Note[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [history, setHistory] = useState<HistoryItem[]>([]);

    // Form states
    const [newNote, setNewNote] = useState('');
    const [newTaskDesc, setNewTaskDesc] = useState('');
    const [newTaskPriority, setNewTaskPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');
    const [addingNote, setAddingNote] = useState(false);
    const [addingTask, setAddingTask] = useState(false);

    useEffect(() => {
        if (dealId) {
            loadDealDetail(dealId);
        } else {
            setDeal(null);
            resetState();
        }
    }, [dealId]);

    function resetState() {
        setActiveTab('info');
        setIsPriority(false);
        setNotes([]);
        setTasks([]);
        setHistory([]);
        setNewNote('');
        setNewTaskDesc('');
    }

    async function loadDealDetail(id: string) {
        setLoading(true);
        try {
            const data = await getDealDetail(id);
            setDeal(data);
            setIsPriority(data.is_priority || false);

            // Load additional data based on active tab
            loadTabData('info', id);
        } catch (error) {
            console.error('Error loading deal detail:', error);
        } finally {
            setLoading(false);
        }
    }

    async function loadTabData(tab: ActiveTab, id?: string) {
        const targetId = id || dealId;
        if (!targetId) return;

        try {
            switch (tab) {
                case 'notes':
                    const notesData = await getDealNotes(targetId);
                    setNotes(notesData || []);
                    break;
                case 'tasks':
                    const tasksData = await getDealTasks(targetId);
                    setTasks(tasksData || []);
                    break;
                case 'history':
                    const historyData = await getDealHistory(targetId, 50);
                    setHistory(historyData || []);
                    break;
            }
        } catch (error) {
            console.error(`Error loading ${tab}:`, error);
        }
    }

    function handleTabChange(tab: ActiveTab) {
        setActiveTab(tab);
        loadTabData(tab);
    }

    async function handleStageChange(newStage: string) {
        if (!deal) return;
        setUpdating(true);
        try {
            await advanceDealStage(deal.id, newStage);
            await loadDealDetail(deal.id);
            onUpdate?.();
        } catch (error) {
            console.error('Error updating stage:', error);
        } finally {
            setUpdating(false);
        }
    }

    async function handleTogglePriority() {
        if (!deal) return;
        setUpdating(true);
        try {
            const newPriority = !isPriority;
            await toggleDealPriority(deal.id, newPriority);
            setIsPriority(newPriority);
            onUpdate?.();
        } catch (error) {
            console.error('Error toggling priority:', error);
        } finally {
            setUpdating(false);
        }
    }

    async function handleAddNote() {
        if (!deal || !newNote.trim()) return;
        setAddingNote(true);
        try {
            await addDealNote(deal.id, newNote);
            setNewNote('');
            await loadTabData('notes');
        } catch (error) {
            console.error('Error adding note:', error);
        } finally {
            setAddingNote(false);
        }
    }

    async function handleAddTask() {
        if (!deal || !newTaskDesc.trim()) return;
        setAddingTask(true);
        try {
            await createDealTask({
                deal_id: deal.id,
                description: newTaskDesc,
                priority: newTaskPriority
            });
            setNewTaskDesc('');
            await loadTabData('tasks');
        } catch (error) {
            console.error('Error creating task:', error);
        } finally {
            setAddingTask(false);
        }
    }

    async function handleCreateQuotation() {
        if (!deal) return;
        setUpdating(true);
        try {
            const result = await createQuotationFromDeal(deal.id);
            if (result.success) {
                alert(`Cotización creada: ${result.quotation_id}`);
            }
        } catch (error) {
            console.error('Error creating quotation:', error);
            alert('Error al crear la cotización');
        } finally {
            setUpdating(false);
        }
    }

    if (!dealId) return null;

    const tabs: { key: ActiveTab; label: string; icon: React.ReactNode }[] = [
        { key: 'info', label: 'Info', icon: <Building2 size={14} /> },
        { key: 'notes', label: 'Notas', icon: <MessageSquare size={14} /> },
        { key: 'tasks', label: 'Tasks', icon: <ListTodo size={14} /> },
        { key: 'history', label: 'Historial', icon: <History size={14} /> }
    ];

    return (
        <SidePanel
            isOpen={!!dealId}
            onClose={onClose}
            title="Ficha del Deal"
            width="md"
        >
            {loading ? (
                <div className="p-8 flex flex-col items-center justify-center space-y-4">
                    <div className="w-12 h-12 border-4 border-primary-200 border-t-stone-900 rounded-full animate-spin" />
                    <p className="text-sm text-stone-500 font-mono">Cargando contexto...</p>
                </div>
            ) : deal ? (
                <div className="flex flex-col h-full bg-[#F5F4F2]">
                    {/* Header Section */}
                    <div className="bg-white border-b-2 border-[#1C1917] p-6 space-y-4">
                        <div className="flex justify-between items-start">
                            <div className="space-y-1 flex-1">
                                <div className="flex items-center gap-2 text-primary-600">
                                    <Building2 size={16} />
                                    <span className="text-sm font-bold uppercase tracking-wider">{deal.organization}</span>
                                </div>
                                <h2 className="text-2xl font-serif font-black text-stone-900 leading-tight">
                                    {deal.title}
                                </h2>
                                {/* Owner Name */}
                                {deal.owner_name && (
                                    <div className="flex items-center gap-1.5 text-xs text-stone-500 mt-1">
                                        <User size={12} />
                                        <span>{deal.owner_name}</span>
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                <div className="text-2xl font-mono fontWeight-bold text-stone-900">
                                    {formatDealValue(deal.value)}
                                </div>
                                {/* Stagnant Alert */}
                                {deal.is_stagnant && (
                                    <div className="flex items-center gap-1 px-2 py-1 rounded text-xs font-bold bg-[#FFEBEE] text-[#B85A35] border border-[#E07A4C]">
                                        <AlertTriangle size={12} />
                                        Sin actividad
                                    </div>
                                )}
                                <button
                                    onClick={handleTogglePriority}
                                    disabled={updating}
                                    className={`
                                        flex items-center gap-1 px-2 py-1 rounded text-xs font-bold transition-all
                                        ${isPriority
                                            ? 'bg-[#FFF8E1] text-[#B87A1F] border border-[#E5A530]'
                                            : 'bg-[#F5F4F2] text-stone-500 border border-[#E8E6E3] hover:border-[#E5A530]'
                                        }
                                    `}
                                >
                                    <Star size={12} className={isPriority ? 'fill-current' : ''} />
                                    {isPriority ? 'Prioritario' : 'Marcar'}
                                </button>
                            </div>
                        </div>

                        {/* Quick Stats Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-[#F5F4F2] border border-[#E8E6E3] p-2 rounded">
                                <div className="text-[10px] text-stone-400 uppercase font-bold mb-1">Probabilidad</div>
                                <div className="flex items-center gap-1.5">
                                    <TrendingUp size={14} className="text-stone-400" />
                                    <span className="text-sm font-bold text-stone-900">{deal.probability}%</span>
                                </div>
                            </div>
                            <div className="bg-[#F5F4F2] border border-[#E8E6E3] p-2 rounded">
                                <div className="text-[10px] text-stone-400 uppercase font-bold mb-1">SLA Restante</div>
                                <div className="flex items-center gap-1.5">
                                    <Clock size={14} className="text-stone-400" />
                                    <span className={`text-sm font-bold ${deal.sla_hours && deal.sla_hours < 24 ? 'text-[#B85A35]' : 'text-stone-900'}`}>
                                        {formatSLAHours(deal.sla_hours)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Tab Navigation */}
                        <div className="flex gap-1 border-t border-[#E8E6E3] pt-3 -mb-2">
                            {tabs.map(tab => (
                                <button
                                    key={tab.key}
                                    onClick={() => handleTabChange(tab.key)}
                                    className={`
                                        flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-wider rounded-t
                                        transition-all
                                        ${activeTab === tab.key
                                            ? 'bg-[#F5F4F2] text-stone-900 border border-b-0 border-[#E8E6E3]'
                                            : 'text-stone-500 hover:text-stone-900 hover:bg-[#F5F4F2]'
                                        }
                                    `}
                                >
                                    {tab.icon}
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Body Section - Tab Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-24">
                        {activeTab === 'info' && (
                            <>
                                {/* NEXT ACTION - Most important for TDAH */}
                                <section>
                                    <CRMNextActionWidget nextAction={deal.next_action as any} />
                                </section>

                                {/* Stage Selector */}
                                <section className="space-y-3">
                                    <h3 className="text-xs font-bold uppercase tracking-widest text-stone-400">Estado del Pipeline</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {deal.available_stages.map((stage) => {
                                            const isActive = deal.status === stage.value;
                                            return (
                                                <button
                                                    key={stage.value}
                                                    disabled={updating}
                                                    onClick={() => handleStageChange(stage.value)}
                                                    className={`
                                                        px-3 py-1.5 text-xs font-bold border transition-all
                                                        ${isActive
                                                            ? 'bg-stone-900 text-white border-[#1C1917] shadow-[2px_2px_0_#94a3b8]'
                                                            : 'bg-white text-stone-600 border-[#E8E6E3] hover:border-[#1C1917]'}
                                                    `}
                                                >
                                                    {stage.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </section>

                                {/* Contact Info */}
                                {deal.organization_contact && (
                                    <section className="space-y-3">
                                        <h3 className="text-xs font-bold uppercase tracking-widest text-stone-400">Datos de Contacto</h3>
                                        <div className="bg-white border border-[#E8E6E3] p-4 space-y-3 rounded-sm">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center border border-[#5BBFBF]">
                                                    <User size={14} className="text-primary-700" />
                                                </div>
                                                <span className="font-bold text-stone-900">{deal.organization_contact.name}</span>
                                            </div>

                                            {deal.organization_contact.email && (
                                                <div className="flex items-center gap-3 text-sm text-stone-600">
                                                    <Mail size={14} className="text-stone-400" />
                                                    <a href={`mailto:${deal.organization_contact.email}`} className="hover:underline">{deal.organization_contact.email}</a>
                                                </div>
                                            )}

                                            {deal.organization_contact.phone && (
                                                <div className="flex items-center gap-3 text-sm text-stone-600">
                                                    <Phone size={14} className="text-stone-400" />
                                                    <a href={`tel:${deal.organization_contact.phone}`} className="hover:underline">{deal.organization_contact.phone}</a>
                                                </div>
                                            )}
                                        </div>
                                    </section>
                                )}

                                {/* Timeline - Last 5 activities */}
                                <section className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-xs font-bold uppercase tracking-widest text-stone-400">Actividad Reciente</h3>
                                        <span className="text-[10px] text-stone-400 font-mono">MÁX 5</span>
                                    </div>
                                    <div className="bg-white border border-[#E8E6E3] p-4 rounded-sm">
                                        <CRMTimeline activities={deal.activities as any} />
                                    </div>
                                </section>
                            </>
                        )}

                        {activeTab === 'notes' && (
                            <section className="space-y-4">
                                {/* Add Note Form */}
                                <div className="bg-white border border-[#E8E6E3] p-4 rounded-sm space-y-3">
                                    <h4 className="text-xs font-bold uppercase tracking-widest text-stone-400">Nueva Nota</h4>
                                    <textarea
                                        value={newNote}
                                        onChange={(e) => setNewNote(e.target.value)}
                                        placeholder="Escribe una nota..."
                                        className="w-full p-3 border border-[#E8E6E3] rounded text-sm focus:outline-none focus:border-primary-400 min-h-[80px] resize-none"
                                    />
                                    <button
                                        onClick={handleAddNote}
                                        disabled={addingNote || !newNote.trim()}
                                        className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white text-sm font-bold rounded hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Send size={14} />
                                        {addingNote ? 'Guardando...' : 'Añadir Nota'}
                                    </button>
                                </div>

                                {/* Notes List */}
                                <div className="space-y-3">
                                    {notes.length === 0 ? (
                                        <div className="text-center text-stone-400 py-8">
                                            <MessageSquare size={32} className="mx-auto mb-2 opacity-50" />
                                            <p className="text-sm">No hay notas todavía</p>
                                        </div>
                                    ) : (
                                        notes.map(note => (
                                            <div key={note.id} className="bg-white border border-[#E8E6E3] p-4 rounded-sm">
                                                <p className="text-sm text-stone-700 whitespace-pre-wrap">{note.content}</p>
                                                <div className="flex items-center gap-2 mt-3 text-[10px] text-stone-400">
                                                    <User size={10} />
                                                    <span>{note.created_by}</span>
                                                    <span>•</span>
                                                    <span>{new Date(note.created).toLocaleDateString('es-ES')}</span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </section>
                        )}

                        {activeTab === 'tasks' && (
                            <section className="space-y-4">
                                {/* Add Task Form */}
                                <div className="bg-white border border-[#E8E6E3] p-4 rounded-sm space-y-3">
                                    <h4 className="text-xs font-bold uppercase tracking-widest text-stone-400">Nueva Tarea</h4>
                                    <input
                                        type="text"
                                        value={newTaskDesc}
                                        onChange={(e) => setNewTaskDesc(e.target.value)}
                                        placeholder="Descripción de la tarea..."
                                        className="w-full p-3 border border-[#E8E6E3] rounded text-sm focus:outline-none focus:border-primary-400"
                                    />
                                    <div className="flex gap-2">
                                        <select
                                            value={newTaskPriority}
                                            onChange={(e) => setNewTaskPriority(e.target.value as 'Low' | 'Medium' | 'High')}
                                            className="px-3 py-2 border border-[#E8E6E3] rounded text-sm focus:outline-none focus:border-primary-400"
                                        >
                                            <option value="Low">Baja</option>
                                            <option value="Medium">Media</option>
                                            <option value="High">Alta</option>
                                        </select>
                                        <button
                                            onClick={handleAddTask}
                                            disabled={addingTask || !newTaskDesc.trim()}
                                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-stone-900 text-white text-sm font-bold rounded hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <Plus size={14} />
                                            {addingTask ? 'Creando...' : 'Crear Tarea'}
                                        </button>
                                    </div>
                                </div>

                                {/* Tasks List */}
                                <div className="space-y-2">
                                    {tasks.length === 0 ? (
                                        <div className="text-center text-stone-400 py-8">
                                            <ListTodo size={32} className="mx-auto mb-2 opacity-50" />
                                            <p className="text-sm">No hay tareas todavía</p>
                                        </div>
                                    ) : (
                                        tasks.map(task => (
                                            <div key={task.id} className={`
                                                bg-white border p-3 rounded-sm flex items-start gap-3
                                                ${task.status === 'Closed' ? 'border-[#4CAF7A] bg-[#E8F5EE]' : 'border-[#E8E6E3]'}
                                            `}>
                                                <div className={`
                                                    w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 mt-0.5
                                                    ${task.status === 'Closed'
                                                        ? 'border-[#4CAF7A] bg-[#E8F5EE]0'
                                                        : 'border-slate-300'
                                                    }
                                                `}>
                                                    {task.status === 'Closed' && <CheckCircle2 size={12} className="text-white" />}
                                                </div>
                                                <div className="flex-1">
                                                    <p className={`text-sm ${task.status === 'Closed' ? 'line-through text-stone-400' : 'text-stone-700'}`}>
                                                        {task.description}
                                                    </p>
                                                    <div className="flex items-center gap-3 mt-2 text-[10px] text-stone-400">
                                                        <span className={`
                                                            px-1.5 py-0.5 rounded uppercase font-bold
                                                            ${task.priority === 'High' ? 'bg-[#FFEBEE] text-[#B85A35]' :
                                                              task.priority === 'Medium' ? 'bg-[#FFF8E1] text-[#B87A1F]' :
                                                              'bg-[#F5F4F2] text-stone-600'}
                                                        `}>
                                                            {task.priority}
                                                        </span>
                                                        {task.due_date && (
                                                            <>
                                                                <Calendar size={10} />
                                                                <span>{new Date(task.due_date).toLocaleDateString('es-ES')}</span>
                                                            </>
                                                        )}
                                                        <User size={10} />
                                                        <span>{task.assigned_to}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </section>
                        )}

                        {activeTab === 'history' && (
                            <section className="space-y-3">
                                {history.length === 0 ? (
                                    <div className="text-center text-stone-400 py-8">
                                        <History size={32} className="mx-auto mb-2 opacity-50" />
                                        <p className="text-sm">No hay historial todavía</p>
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200" />
                                        {history.map((item, _index) => (
                                            <div key={item.id} className="relative pl-10 pb-4">
                                                <div className={`
                                                    absolute left-2.5 w-3 h-3 rounded-full border bg-white
                                                    ${item.type === 'stage_change' ? 'border-[#4CAF7A]' :
                                                      item.type === 'note' ? 'border-[#E0F4F4]0' :
                                                      item.type === 'task' ? 'border-[#E5A530]' :
                                                      item.type === 'call' ? 'border-[#E5B82A]' :
                                                      'border-slate-400'}
                                                `} />
                                                <div className="bg-white border border-[#E8E6E3] p-3 rounded-sm shadow-sm">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className={`
                                                            text-[10px] uppercase font-bold px-1.5 py-0.5 rounded
                                                            ${item.type === 'stage_change' ? 'bg-[#E8F5EE] text-[#2E7D56]' :
                                                              item.type === 'note' ? 'bg-[#E0F4F4] text-[#3D8B8B]' :
                                                              item.type === 'task' ? 'bg-[#FFF8E1] text-[#B87A1F]' :
                                                              item.type === 'call' ? 'bg-[#FFF8E1] text-[#B8860B]' :
                                                              'bg-[#F5F4F2] text-stone-600'}
                                                        `}>
                                                            {item.type === 'stage_change' ? 'Cambio' :
                                                             item.type === 'note' ? 'Nota' :
                                                             item.type === 'task' ? 'Tarea' :
                                                             item.type === 'call' ? 'Llamada' :
                                                             item.type}
                                                        </span>
                                                        <span className="text-[10px] text-stone-400">
                                                            {new Date(item.timestamp).toLocaleString('es-ES', {
                                                                day: '2-digit',
                                                                month: 'short',
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            })}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-stone-700">{item.description}</p>
                                                    <p className="text-[10px] text-stone-400 mt-1">{item.user}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </section>
                        )}
                    </div>

                    {/* Sticky Actions Footer */}
                    <div className="absolute bottom-0 left-0 right-0 bg-white border-t-2 border-[#1C1917] p-4 flex gap-2 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
                        <button
                            onClick={handleCreateQuotation}
                            disabled={updating}
                            className="flex-1 bg-stone-900 text-white font-bold py-3 px-4 rounded border border-[#E8E6E3] hover:bg-stone-800 transition-colors flex items-center justify-center gap-2">
                            <FileText size={18} />
                            Crear Cotización
                        </button>
                        <button className="flex-1 bg-white text-stone-900 font-bold py-3 px-4 rounded border border-[#E8E6E3] hover:bg-[#F5F4F2] transition-colors flex items-center justify-center gap-2">
                            <Phone size={18} />
                            Registrar Llamada
                        </button>
                    </div>
                </div>
            ) : (
                <div className="p-8 text-center text-stone-500">No se pudo cargar la información.</div>
            )}
        </SidePanel>
    );
}

export default DealDetailPanel;
