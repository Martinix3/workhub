import React, { useState, useEffect } from 'react';
import { X, Save, TrendingUp, Building2, User, Phone, MessageSquare, Plus, Check, Star, AlertTriangle } from 'lucide-react';
import { crmService } from '../../../api';

interface CreateDealModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

type DealStatus = 'Lead' | 'En Progreso' | 'Ganado' | 'Perdido';

interface Organization {
    name: string;
    organization_name: string;
    industry?: string;
    territory?: string;
}

export function CreateDealModal({ isOpen, onClose, onSuccess }: CreateDealModalProps) {
    // Core fields - simplified
    const [organization, setOrganization] = useState('');
    const [contactName, setContactName] = useState('');
    const [contactPhone, setContactPhone] = useState('');
    const [comments, setComments] = useState('');
    const [status, setStatus] = useState<DealStatus>('Lead');
    const [isPriority, setIsPriority] = useState(false);

    // Organization creation inline
    const [showOrgCreate, setShowOrgCreate] = useState(false);
    const [newOrgName, setNewOrgName] = useState('');
    const [newOrgIndustry, setNewOrgIndustry] = useState('');
    const [creatingOrg, setCreatingOrg] = useState(false);

    // Data for selects
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [loadingData, setLoadingData] = useState(false);

    // Form state
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Load data on mount
    useEffect(() => {
        if (isOpen) {
            loadSelectData();
        }
    }, [isOpen]);

    const loadSelectData = async () => {
        setLoadingData(true);
        try {
            const orgsData = await crmService.getCRMOrganizations().catch(() => []);
            setOrganizations(orgsData || []);
        } catch (err) {
            console.error('Error loading select data:', err);
        } finally {
            setLoadingData(false);
        }
    };

    const resetForm = () => {
        setOrganization('');
        setContactName('');
        setContactPhone('');
        setComments('');
        setStatus('Lead');
        setIsPriority(false);
        setShowOrgCreate(false);
        setNewOrgName('');
        setNewOrgIndustry('');
        setError(null);
    };

    if (!isOpen) return null;

    // Create organization inline (also creates Customer for /ventas/clientes visibility)
    const handleCreateOrganization = async () => {
        if (!newOrgName.trim()) {
            setError('El nombre de la empresa es requerido');
            return;
        }

        setCreatingOrg(true);
        try {
            const result = await crmService.createCRMOrganization({
                organization_name: newOrgName,
                industry: newOrgIndustry || undefined,
                // Pass phone if already filled to sync to Customer
                contact_phone: contactPhone || undefined
            });

            if (result.success) {
                // Add to list and select it
                const newOrg: Organization = {
                    name: result.organization_id,
                    organization_name: newOrgName,
                    industry: newOrgIndustry || undefined
                };
                setOrganizations(prev => [...prev, newOrg]);
                setOrganization(newOrgName);
                setShowOrgCreate(false);
                setNewOrgName('');
                setNewOrgIndustry('');
                setError(null);
            }
        } catch (err: any) {
            console.error('Error creating organization:', err);
            setError(err.message || 'Error al crear la empresa');
        } finally {
            setCreatingOrg(false);
        }
    };

    // Map our simplified status to Frappe CRM status
    const mapStatusToFrappe = (status: DealStatus): string => {
        const mapping: Record<DealStatus, string> = {
            'Lead': 'Qualification',
            'En Progreso': 'Negotiation',
            'Ganado': 'Won',
            'Perdido': 'Lost'
        };
        return mapping[status];
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (!organization.trim()) {
            setError('La empresa es requerida');
            setLoading(false);
            return;
        }

        try {
            // Simplified model: create deal with organization and optional notes
            await crmService.createDeal({
                organization,
                value: 0,
                status: mapStatusToFrappe(status),
                notes: comments ? `Contacto: ${contactName || 'N/A'}, Tel: ${contactPhone || 'N/A'}\n${comments}` : undefined
            });

            resetForm();
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Error creating deal:', err);
            const message = err.message || err._server_messages || 'Error al crear el registro';
            setError(typeof message === 'string' ? message : JSON.stringify(message));
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    // Status configuration with colors
    const statusConfig: Record<DealStatus, { color: string; bgColor: string; icon: React.ReactNode }> = {
        'Lead': {
            color: 'text-[#3D8B8B]',
            bgColor: 'bg-[#E0F4F4] border-[#5BBFBF]',
            icon: <User size={14} />
        },
        'En Progreso': {
            color: 'text-[#B87A1F]',
            bgColor: 'bg-[#FFF8E1] border-[#E5A530]',
            icon: <TrendingUp size={14} />
        },
        'Ganado': {
            color: 'text-[#2E7D56]',
            bgColor: 'bg-[#E8F5EE] border-[#4CAF7A]',
            icon: <Check size={14} />
        },
        'Perdido': {
            color: 'text-[#B85A35]',
            bgColor: 'bg-[#FFEBEE] border-[#E07A4C]',
            icon: <X size={14} />
        }
    };

    return (
        <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-[rgba(41,37,36,0.5)] backdrop-blur-[2px]" onClick={handleClose} />
            <div className="absolute inset-0 flex items-center justify-center p-4">
                <div className="bg-white rounded-sm border border-[#E8E6E3] shadow-xl w-full max-w-md animate-fade-in max-h-[90vh] flex flex-col">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-[#5BBFBF] to-[#4AA3A3] px-5 py-4 flex items-center justify-between flex-shrink-0">
                        <div className="flex items-center gap-3 text-white">
                            <TrendingUp size={20} />
                            <div>
                                <h2 className="font-['Playfair_Display',Georgia,serif] text-lg font-semibold">
                                    Nueva Oportunidad
                                </h2>
                                <p className="text-sm opacity-80">Pipeline de ventas</p>
                            </div>
                        </div>
                        <button onClick={handleClose} className="p-2 hover:bg-white/10 rounded-sm text-white">
                            <X size={18} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
                        {/* Error display */}
                        {error && (
                            <div className="bg-[#FFEBEE] border border-[#E07A4C]/20 rounded-sm p-3 flex items-start gap-2">
                                <AlertTriangle size={16} className="text-[#C96A3F] mt-0.5 flex-shrink-0" />
                                <p className="text-sm text-[#C96A3F] font-medium">{error}</p>
                            </div>
                        )}

                        {/* Empresa / Organization */}
                        <div>
                            <label className="text-[10px] text-[#A8A29E] uppercase tracking-[0.1em] block mb-1.5 flex items-center gap-1">
                                <Building2 size={12} />
                                Empresa *
                            </label>

                            {!showOrgCreate ? (
                                <div className="space-y-2">
                                    <div className="relative">
                                        <input
                                            required
                                            type="text"
                                            value={organization}
                                            onChange={(e) => setOrganization(e.target.value)}
                                            list="organizations-list"
                                            placeholder="Buscar o escribir empresa..."
                                            className="w-full px-3 py-2.5 text-sm border border-[#E8E6E3] rounded-sm bg-white focus:outline-none focus:border-[#5BBFBF] placeholder:text-[#A8A29E]"
                                            autoFocus
                                        />
                                        <datalist id="organizations-list">
                                            {organizations.map(org => (
                                                <option key={org.name} value={org.organization_name}>
                                                    {org.industry ? `${org.industry}` : ''}
                                                </option>
                                            ))}
                                        </datalist>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowOrgCreate(true)}
                                        className="text-xs text-[#5BBFBF] hover:text-[#4AA3A3] flex items-center gap-1 transition-colors"
                                    >
                                        <Plus size={12} />
                                        Crear nueva empresa
                                    </button>
                                </div>
                            ) : (
                                <div className="bg-[#F5FAFA] border border-[#5BBFBF]/30 rounded-sm p-3 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] text-[#5BBFBF] uppercase tracking-[0.1em] font-medium">
                                            Nueva Empresa
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowOrgCreate(false);
                                                setNewOrgName('');
                                                setNewOrgIndustry('');
                                            }}
                                            className="text-xs text-[#78716C] hover:text-[#44403C]"
                                        >
                                            Cancelar
                                        </button>
                                    </div>

                                    <input
                                        type="text"
                                        value={newOrgName}
                                        onChange={(e) => setNewOrgName(e.target.value)}
                                        placeholder="Nombre de la empresa *"
                                        className="w-full px-3 py-2 text-sm border border-[#5BBFBF]/30 rounded-sm bg-white focus:outline-none focus:border-[#5BBFBF] placeholder:text-[#A8A29E]"
                                    />

                                    <input
                                        type="text"
                                        value={newOrgIndustry}
                                        onChange={(e) => setNewOrgIndustry(e.target.value)}
                                        placeholder="Industria (opcional)"
                                        className="w-full px-3 py-2 text-sm border border-[#5BBFBF]/30 rounded-sm bg-white focus:outline-none focus:border-[#5BBFBF] placeholder:text-[#A8A29E]"
                                    />

                                    <button
                                        type="button"
                                        onClick={handleCreateOrganization}
                                        disabled={creatingOrg || !newOrgName.trim()}
                                        className="w-full px-3 py-2 text-sm font-medium bg-[#5BBFBF] text-white rounded-sm hover:bg-[#4AA3A3] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {creatingOrg ? 'Creando...' : (
                                            <>
                                                <Check size={14} />
                                                Crear y seleccionar
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Nombre de Contacto */}
                        <div>
                            <label className="text-[10px] text-[#A8A29E] uppercase tracking-[0.1em] block mb-1.5 flex items-center gap-1">
                                <User size={12} />
                                Nombre de Contacto
                            </label>
                            <input
                                type="text"
                                value={contactName}
                                onChange={(e) => setContactName(e.target.value)}
                                placeholder="Juan Pérez"
                                className="w-full px-3 py-2.5 text-sm border border-[#E8E6E3] rounded-sm bg-white focus:outline-none focus:border-[#5BBFBF] placeholder:text-[#A8A29E]"
                            />
                        </div>

                        {/* Teléfono */}
                        <div>
                            <label className="text-[10px] text-[#A8A29E] uppercase tracking-[0.1em] block mb-1.5 flex items-center gap-1">
                                <Phone size={12} />
                                Teléfono
                            </label>
                            <input
                                type="tel"
                                value={contactPhone}
                                onChange={(e) => setContactPhone(e.target.value)}
                                placeholder="+52 55 1234 5678"
                                className="w-full px-3 py-2.5 text-sm border border-[#E8E6E3] rounded-sm bg-white focus:outline-none focus:border-[#5BBFBF] placeholder:text-[#A8A29E]"
                            />
                        </div>

                        {/* Comentarios */}
                        <div>
                            <label className="text-[10px] text-[#A8A29E] uppercase tracking-[0.1em] block mb-1.5 flex items-center gap-1">
                                <MessageSquare size={12} />
                                Comentarios
                            </label>
                            <textarea
                                value={comments}
                                onChange={(e) => setComments(e.target.value)}
                                placeholder="Notas iniciales, contexto, origen del contacto..."
                                className="w-full px-3 py-2 text-sm border border-[#E8E6E3] rounded-sm bg-white focus:outline-none focus:border-[#5BBFBF] placeholder:text-[#A8A29E] min-h-[80px] resize-none"
                            />
                        </div>

                        {/* Estado del Pipeline */}
                        <div>
                            <label className="text-[10px] text-[#A8A29E] uppercase tracking-[0.1em] block mb-2">
                                Estado
                            </label>
                            <div className="grid grid-cols-4 gap-2">
                                {(Object.keys(statusConfig) as DealStatus[]).map((st) => {
                                    const config = statusConfig[st];
                                    const isSelected = status === st;
                                    return (
                                        <button
                                            key={st}
                                            type="button"
                                            onClick={() => setStatus(st)}
                                            className={`
                                                p-2.5 rounded-sm border text-xs font-medium transition-all flex flex-col items-center justify-center gap-1
                                                ${isSelected
                                                    ? `${config.bgColor} ${config.color} border-current`
                                                    : 'bg-white border-[#E8E6E3] text-[#78716C] hover:border-[#D4D1CC]'
                                                }
                                            `}
                                        >
                                            {config.icon}
                                            <span className="text-[10px]">{st}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Marcar como prioritario */}
                        <div className="border-t border-[#E8E6E3] pt-4">
                            <button
                                type="button"
                                onClick={() => setIsPriority(!isPriority)}
                                className={`
                                    w-full p-3 rounded-sm border text-sm font-medium transition-all flex items-center justify-center gap-2
                                    ${isPriority
                                        ? 'bg-[#FEF3C7] border-[#E5A530] text-[#B45309]'
                                        : 'bg-white border-[#E8E6E3] text-[#78716C] hover:border-[#D4D1CC]'
                                    }
                                `}
                            >
                                <Star size={16} className={isPriority ? 'fill-current' : ''} />
                                {isPriority ? 'Marcado como Prioritario' : 'Marcar como Prioritario'}
                            </button>
                        </div>
                    </form>

                    {/* Footer */}
                    <div className="px-5 py-4 border-t border-[#E8E6E3] flex gap-3 flex-shrink-0">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="flex-1 px-4 py-2.5 text-sm font-medium border border-[#E8E6E3] text-[#78716C] rounded-sm hover:bg-[#F5F4F2] transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            onClick={handleSubmit}
                            disabled={loading || loadingData}
                            className="flex-1 px-4 py-2.5 text-sm font-semibold bg-[#5BBFBF] text-white rounded-sm hover:bg-[#4AA3A3] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Guardando...' : (
                                <>
                                    <Save size={16} />
                                    Crear
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
