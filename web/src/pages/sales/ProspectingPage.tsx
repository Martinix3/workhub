import { useEffect, useMemo, useState } from 'react'
import { LoadingState } from '../../components/ui/LoadingState'
import { ErrorState } from '../../components/ui/ErrorState'
import { prospectingApi, googleAuthApi } from '../../api/services'
import type {
  CatalogFile,
  ProspectingAccount,
  ProspectingTemplate,
  ProspectingTemplateFilters,
  ProspectingTemplateStat,
} from '../../api/services/prospecting'
import type { GoogleConnectionStatus } from '../../api/services/google-auth'
import {
  CheckSquare,
  Square,
  RefreshCw,
  Sparkles,
  Send,
  Link2,
  Mail,
  Users,
  TrendingUp,
  FolderOpen,
  BadgeCheck,
  AlertCircle,
  PenSquare,
  Trash2,
} from 'lucide-react'

const DEFAULT_TEMPLATES: ProspectingTemplate[] = [
  {
    id: 'Horeca Intro',
    name: 'Horeca Intro',
    subject: 'Santa Brisa · propuesta gourmet para {{account_name}}',
    body: `Hola {{contact_name}},

Soy {{sales_rep}} de Santa Brisa. Hemos estado trabajando con locales similares en {{city}} y creemos que encajamos muy bien con {{account_name}}.

¿Te encaja que te envíe catálogo y condiciones para valorar una primera compra?
`,
  },
  {
    id: 'Retail Intro',
    name: 'Retail Intro',
    subject: 'Catálogo Santa Brisa para {{account_name}}',
    body: `Hola {{contact_name}},

Te escribo de Santa Brisa para proponerte una selección gourmet con margen alto y rotación rápida. ¿Quieres que te comparta el catálogo y condiciones para {{account_name}}?
`,
  },
  {
    id: 'Follow-up 1',
    name: 'Follow-up 1',
    subject: '¿Te va bien que avancemos? · {{account_name}}',
    body: `Hola {{contact_name}},

Retomo el mensaje anterior para confirmar si quieres que te pase catálogo y precios de Santa Brisa. Si te encaja, te lo envío hoy mismo.
`,
  },
]

const replacePlaceholders = (text: string, context: Record<string, string>) => {
  let output = text
  Object.entries(context).forEach(([key, value]) => {
    output = output.replaceAll(`{{${key}}}`, value || '')
  })
  return output
}

export function ProspectingPage() {
  const [accounts, setAccounts] = useState<ProspectingAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [templates, setTemplates] = useState<ProspectingTemplate[]>(DEFAULT_TEMPLATES)
  const [templateId, setTemplateId] = useState<string>(DEFAULT_TEMPLATES[0].id)
  const [templateNameInput, setTemplateNameInput] = useState('')
  const [subject, setSubject] = useState(DEFAULT_TEMPLATES[0].subject)
  const [body, setBody] = useState(DEFAULT_TEMPLATES[0].body)
  const [catalogFiles, setCatalogFiles] = useState<CatalogFile[]>([])
  const [catalogFolderId, setCatalogFolderId] = useState('')
  const [catalogFolderInput, setCatalogFolderInput] = useState('')
  const [catalogSearch, setCatalogSearch] = useState('')
  const [selectedCatalogIds, setSelectedCatalogIds] = useState<Set<string>>(new Set())
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [catalogError, setCatalogError] = useState<string | null>(null)
  const [googleStatus, setGoogleStatus] = useState<GoogleConnectionStatus | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [isTemplateSaving, setIsTemplateSaving] = useState(false)
  const [geminiInfo, setGeminiInfo] = useState<string | null>(null)
  const [stats, setStats] = useState<ProspectingTemplateStat[]>([])
  const [statsFilters, setStatsFilters] = useState<ProspectingTemplateFilters>({
    channel: 'all',
    sale_type: 'all',
    account_type: 'all',
    level: 'all',
  })
  const [syncInfo, setSyncInfo] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const backlog = await prospectingApi.getBacklogAccounts(300)
      setAccounts(backlog)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }

  const fetchTemplates = async () => {
    try {
      const remoteTemplates = await prospectingApi.getTemplates()
      if (remoteTemplates?.length) {
        setTemplates(remoteTemplates)
        if (!templateId || !remoteTemplates.find(t => t.id === templateId)) {
          setTemplateId(remoteTemplates[0].id)
        }
      }
    } catch {
      setTemplates(DEFAULT_TEMPLATES)
    }
  }

  const fetchStats = async () => {
    try {
      const templateStats = await prospectingApi.getTemplateStats(90, statsFilters)
      setStats(templateStats)
    } catch {
      setStats([])
    }
  }

  const fetchCatalogs = async () => {
    setCatalogLoading(true)
    setCatalogError(null)
    try {
      const files = await prospectingApi.getCatalogFiles(catalogFolderId || undefined)
      setCatalogFiles(files)
    } catch (err) {
      setCatalogError(err instanceof Error ? err.message : 'No se pudo cargar Drive')
      setCatalogFiles([])
    } finally {
      setCatalogLoading(false)
    }
  }

  const fetchGoogleStatus = async () => {
    try {
      const status = await googleAuthApi.getConnectionStatus()
      setGoogleStatus(status)
    } catch {
      setGoogleStatus(null)
    }
  }

  useEffect(() => {
    void fetchData()
    void fetchTemplates()
    void fetchGoogleStatus()
    void fetchCatalogs()
  }, [])

  useEffect(() => {
    if (!loading) {
      void fetchStats()
    }
  }, [statsFilters, loading])

  useEffect(() => {
    if (!templateId || templateId === '__new__') return
    const template = templates.find(t => t.id === templateId)
    if (template) {
      setSubject(template.subject)
      setBody(template.body)
      setTemplateNameInput(template.name)
    }
  }, [templateId, templates])

  useEffect(() => {
    if (catalogFolderId !== undefined) {
      void fetchCatalogs()
    }
  }, [catalogFolderId])

  const filteredAccounts = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return accounts
    return accounts.filter((acc) =>
      `${acc.account_name} ${acc.contact_name || ''} ${acc.email || ''}`.toLowerCase().includes(term)
    )
  }, [accounts, search])

  const selectedAccounts = useMemo(
    () => accounts.filter(acc => selectedIds.has(acc.name)),
    [accounts, selectedIds]
  )

  const primaryAccount = selectedAccounts[0]
  const gmailConnected = Boolean(googleStatus?.is_connected && googleStatus?.features?.gmail)
  const effectiveTemplateId = templateId === '__new__'
    ? (templateNameInput.trim() || 'template')
    : templateId

  const filteredCatalogs = useMemo(() => {
    const term = catalogSearch.trim().toLowerCase()
    if (!term) return catalogFiles
    return catalogFiles.filter(file => `${file.name}`.toLowerCase().includes(term))
  }, [catalogFiles, catalogSearch])

  const selectedCatalogLinks = useMemo(() => {
    return catalogFiles
      .filter(file => selectedCatalogIds.has(file.id))
      .map(file => file.webViewLink || file.name)
      .filter(Boolean)
  }, [catalogFiles, selectedCatalogIds])

  const handleToggleAll = () => {
    if (selectedIds.size === filteredAccounts.length) {
      setSelectedIds(new Set())
      return
    }
    setSelectedIds(new Set(filteredAccounts.map(acc => acc.name)))
  }

  const handleToggleOne = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleToggleCatalog = (fileId: string) => {
    setSelectedCatalogIds(prev => {
      const next = new Set(prev)
      if (next.has(fileId)) {
        next.delete(fileId)
      } else {
        next.add(fileId)
      }
      return next
    })
  }

  const handleGenerate = async () => {
    if (!primaryAccount) return
    setIsGenerating(true)
    setGeminiInfo(null)
    try {
      const response = await prospectingApi.generateEmail({
        template_id: effectiveTemplateId,
        subject,
        body,
        catalog_links: selectedCatalogLinks,
        account: {
          account_name: primaryAccount.account_name,
          contact_name: primaryAccount.contact_name,
          email: primaryAccount.email,
          city: primaryAccount.city,
          sales_channel: primaryAccount.sales_channel,
          sale_type: primaryAccount.sale_type,
          level: primaryAccount.level,
          sales_rep: primaryAccount.assigned_to,
        },
      })
      setSubject(response.subject)
      setBody(response.body)
      if (response.source && response.source !== 'gemini') {
        setGeminiInfo(response.error || 'Gemini devolvió respuesta parcial.')
      }
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSend = async () => {
    if (!gmailConnected || selectedAccounts.length === 0) return
    setIsSending(true)
    try {
      for (const account of selectedAccounts) {
        if (!account.email) continue
        const context = {
          account_name: account.account_name || '',
          contact_name: account.contact_name || 'Equipo',
          city: account.city || '',
          sales_rep: 'Equipo Santa Brisa',
        }
        const renderedSubject = replacePlaceholders(subject, context)
        const renderedBody = replacePlaceholders(body, context)
        await prospectingApi.sendEmail({
          account_id: account.name,
          to: account.email,
          subject: renderedSubject,
          body: renderedBody,
          template_id: effectiveTemplateId,
          catalog_links: selectedCatalogLinks,
        })
      }
      setSelectedIds(new Set())
      await fetchData()
      await fetchStats()
    } finally {
      setIsSending(false)
    }
  }

  const handleSyncReplies = async () => {
    setSyncInfo(null)
    const result = await prospectingApi.syncReplies(30, 200)
    setSyncInfo(`Revisadas ${result.checked} cuentas · Movidas ${result.moved_count}`)
    await fetchData()
    await fetchStats()
  }

  const handleNewTemplate = () => {
    setTemplateId('__new__')
    setTemplateNameInput('')
    setSubject('')
    setBody('')
  }

  const handleSaveTemplate = async () => {
    setIsTemplateSaving(true)
    try {
      if (templateId === '__new__') {
        const templateName = templateNameInput.trim()
        if (!templateName) return
        await prospectingApi.createTemplate({
          template_id: templateName,
          subject,
          body,
        })
        await fetchTemplates()
        setTemplateId(templateName)
      } else {
        await prospectingApi.updateTemplate(templateId, {
          subject,
          body,
        })
        await fetchTemplates()
      }
    } finally {
      setIsTemplateSaving(false)
    }
  }

  const handleDeleteTemplate = async () => {
    if (templateId === '__new__') return
    const confirmed = window.confirm('¿Eliminar esta plantilla?')
    if (!confirmed) return
    setIsTemplateSaving(true)
    try {
      await prospectingApi.deleteTemplate(templateId)
      await fetchTemplates()
      if (templates.length > 1) {
        const nextTemplate = templates.find(t => t.id !== templateId)
        if (nextTemplate) {
          setTemplateId(nextTemplate.id)
        }
      }
    } finally {
      setIsTemplateSaving(false)
    }
  }

  const uniqueFilters = useMemo(() => {
    const values = {
      channel: new Set<string>(),
      sale_type: new Set<string>(),
      account_type: new Set<string>(),
      level: new Set<string>(),
    }
    accounts.forEach(account => {
      if (account.sales_channel) values.channel.add(account.sales_channel)
      if (account.sale_type) values.sale_type.add(account.sale_type)
      if (account.account_type) values.account_type.add(account.account_type)
      if (account.level) values.level.add(account.level)
    })
    return {
      channel: Array.from(values.channel),
      sale_type: Array.from(values.sale_type),
      account_type: Array.from(values.account_type),
      level: Array.from(values.level),
    }
  }, [accounts])

  if (loading) return <LoadingState message="Cargando backlog..." />
  if (error) {
    return (
      <ErrorState
        title="Error al cargar prospecting"
        message="No se pudo cargar el backlog."
        error={error}
        onRetry={fetchData}
      />
    )
  }

  return (
    <div className="h-full flex flex-col bg-[#F6F2ED]">
      <div className="flex-none border-b border-[#E6E1D8] bg-white/80 backdrop-blur">
        <div className="px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-serif font-bold text-stone-900">Prospecting</h1>
            <p className="text-sm text-stone-600">Centro de prospección con Gmail + Drive</p>
          </div>
          <div className="flex items-center gap-3">
            <div className={`px-3 py-1.5 rounded-full text-xs uppercase tracking-wider flex items-center gap-2 ${gmailConnected ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
              {gmailConnected ? <BadgeCheck size={14} /> : <AlertCircle size={14} />}
              {gmailConnected ? `Gmail conectado${googleStatus?.email ? ` · ${googleStatus.email}` : ''}` : 'Gmail sin conectar'}
            </div>
            {!gmailConnected && (
              <button
                onClick={() => googleAuthApi.initiateOAuthFlow()}
                className="px-3 py-2 text-xs uppercase tracking-wider border border-[#D4D1CC] text-stone-700 bg-white"
              >
                Conectar Google
              </button>
            )}
            <button
              onClick={handleSyncReplies}
              className="px-3 py-2 text-xs uppercase tracking-wider border border-[#D4D1CC] text-stone-700 bg-white"
            >
              Sincronizar respuestas
            </button>
            <button
              onClick={() => { fetchData(); fetchTemplates(); fetchCatalogs(); fetchStats(); }}
              className="p-2 border border-[#D4D1CC] bg-white"
            >
              <RefreshCw size={18} />
            </button>
          </div>
        </div>
        <div className="px-6 pb-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
            <div className="bg-white border border-[#E6E1D8] px-4 py-3">
              <div className="text-xs uppercase tracking-wider text-stone-400">Backlog</div>
              <div className="font-semibold text-stone-900">{accounts.length}</div>
            </div>
            <div className="bg-white border border-[#E6E1D8] px-4 py-3">
              <div className="text-xs uppercase tracking-wider text-stone-400">Seleccionadas</div>
              <div className="font-semibold text-stone-900">{selectedAccounts.length}</div>
            </div>
            <div className="bg-white border border-[#E6E1D8] px-4 py-3">
              <div className="text-xs uppercase tracking-wider text-stone-400">Catálogos</div>
              <div className="font-semibold text-stone-900">{selectedCatalogIds.size}</div>
            </div>
            <div className="bg-white border border-[#E6E1D8] px-4 py-3">
              <div className="text-xs uppercase tracking-wider text-stone-400">Plantillas</div>
              <div className="font-semibold text-stone-900">{templates.length}</div>
            </div>
          </div>
          {syncInfo && (
            <div className="mt-3 text-xs text-emerald-700">{syncInfo}</div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden grid xl:grid-cols-[1.1fr_1.3fr_0.8fr] gap-4 p-6">
        <div className="bg-white border border-[#E6E1D8] shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-[#E6E1D8] flex items-center gap-3">
            <input
              className="flex-1 border border-[#D4D1CC] px-3 py-2 text-sm bg-white"
              placeholder="Buscar cuenta..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button
              onClick={handleToggleAll}
              className="px-3 py-2 text-xs uppercase tracking-wider border border-[#D4D1CC] text-stone-600"
            >
              {selectedIds.size === filteredAccounts.length ? 'Deseleccionar' : 'Seleccionar'}
            </button>
          </div>
          <div className="flex-1 overflow-auto divide-y divide-[#E8E6E3]">
            {filteredAccounts.length === 0 && (
              <div className="p-8 text-center text-sm text-stone-500">
                No hay cuentas en backlog.
              </div>
            )}
            {filteredAccounts.map(account => {
              const selected = selectedIds.has(account.name)
              return (
                <div
                  key={account.name}
                  className={`px-4 py-3 flex items-center gap-3 ${selected ? 'bg-[#FFF7E8]' : 'hover:bg-stone-50'}`}
                >
                  <button
                    onClick={() => handleToggleOne(account.name)}
                    className="text-stone-600"
                  >
                    {selected ? <CheckSquare size={18} /> : <Square size={18} />}
                  </button>
                  <div className="flex-1">
                    <div className="font-medium text-stone-900">{account.account_name}</div>
                    <div className="text-xs text-stone-500 flex items-center gap-2">
                      <Mail size={12} />
                      {account.email || 'Sin email'}
                    </div>
                  </div>
                  <div className="text-xs text-stone-500 text-right">
                    <div>{account.sales_channel || '-'}</div>
                    <div>{account.level ? `Nivel ${account.level}` : ''}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="bg-white border border-[#E6E1D8] shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-[#E6E1D8] flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-stone-500">
              <Users size={14} />
              {selectedAccounts.length} seleccionadas
            </div>
            <button
              onClick={handleSend}
              disabled={!gmailConnected || selectedAccounts.length === 0 || isSending}
              className="flex items-center gap-2 px-4 py-2 bg-[#4CAF7A] text-white text-xs uppercase tracking-wider disabled:opacity-50"
            >
              <Send size={16} />
              Enviar
            </button>
          </div>
          <div className="p-5 space-y-4 overflow-auto">
            <div className="grid gap-2">
              <label className="text-xs uppercase tracking-wider text-stone-500">Plantilla activa</label>
              <select
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                className="w-full border border-[#D4D1CC] px-3 py-2 text-sm"
              >
                <option value="__new__">+ Nueva plantilla</option>
                {templates.map(template => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <label className="text-xs uppercase tracking-wider text-stone-500">Asunto</label>
              <input
                className="w-full border border-[#D4D1CC] px-3 py-2 text-sm"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <label className="text-xs uppercase tracking-wider text-stone-500">Cuerpo</label>
              <textarea
                className="w-full border border-[#D4D1CC] px-3 py-2 text-sm min-h-[220px]"
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleGenerate}
                disabled={!primaryAccount || isGenerating}
                className="flex items-center gap-2 px-3 py-2 border border-[#D4D1CC] text-xs uppercase tracking-wider text-stone-700"
              >
                <Sparkles size={16} />
                Personalizar con Gemini
              </button>
              <div className="text-xs text-stone-500">
                {primaryAccount ? `Preview: ${primaryAccount.account_name}` : 'Selecciona al menos una cuenta'}
              </div>
            </div>
            {geminiInfo && (
              <div className="text-xs text-amber-700">{geminiInfo}</div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4 overflow-auto">
          <div className="bg-white border border-[#E6E1D8] shadow-sm">
            <div className="p-4 border-b border-[#E6E1D8] flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-stone-500">
                <FolderOpen size={14} />
                Catálogos Drive
              </div>
              <button
                onClick={fetchCatalogs}
                className="p-2 border border-[#D4D1CC] text-stone-600"
              >
                <RefreshCw size={16} />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <input
                className="w-full border border-[#D4D1CC] px-3 py-2 text-sm"
                placeholder="Buscar catálogo..."
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
              />
              <div className="flex gap-2">
                <input
                  className="flex-1 border border-[#D4D1CC] px-3 py-2 text-xs"
                  placeholder="Folder ID (opcional)"
                  value={catalogFolderInput}
                  onChange={(e) => setCatalogFolderInput(e.target.value)}
                />
                <button
                  onClick={() => setCatalogFolderId(catalogFolderInput.trim())}
                  className="px-2 py-2 text-[10px] uppercase tracking-wider border border-[#D4D1CC]"
                >
                  Cargar
                </button>
              </div>
              {catalogLoading && <div className="text-xs text-stone-400">Cargando catálogos...</div>}
              {catalogError && <div className="text-xs text-amber-700">{catalogError}</div>}
              {filteredCatalogs.length === 0 && !catalogLoading && (
                <div className="text-xs text-stone-400">No hay catálogos disponibles.</div>
              )}
              <div className="max-h-48 overflow-auto divide-y divide-[#EFEAE2]">
                {filteredCatalogs.map(file => {
                  const selected = selectedCatalogIds.has(file.id)
                  return (
                    <div
                      key={file.id}
                      className={`w-full text-left px-2 py-2 text-xs flex items-center gap-2 ${selected ? 'bg-[#FFF7E8]' : 'hover:bg-stone-50'}`}
                    >
                      <button onClick={() => handleToggleCatalog(file.id)} className="text-stone-600">
                        {selected ? <CheckSquare size={14} /> : <Square size={14} />}
                      </button>
                      <Link2 size={12} />
                      <span className="truncate flex-1">{file.name}</span>
                      {file.webViewLink && (
                        <a
                          href={file.webViewLink}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] uppercase tracking-wider text-stone-500 hover:text-stone-700"
                        >
                          Abrir
                        </a>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#E6E1D8] shadow-sm">
            <div className="p-4 border-b border-[#E6E1D8] flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-stone-500">
                <PenSquare size={14} />
                Plantillas
              </div>
              <button
                onClick={handleNewTemplate}
                className="px-2 py-1 text-xs uppercase tracking-wider border border-[#D4D1CC]"
              >
                Nueva
              </button>
            </div>
            <div className="p-4 space-y-3">
              {templateId === '__new__' && (
                <input
                  className="w-full border border-[#D4D1CC] px-3 py-2 text-sm"
                  placeholder="Nombre de plantilla"
                  value={templateNameInput}
                  onChange={(e) => setTemplateNameInput(e.target.value)}
                />
              )}
              <div className="flex gap-2">
                <button
                  onClick={handleSaveTemplate}
                  disabled={isTemplateSaving || (templateId === '__new__' && !templateNameInput.trim())}
                  className="flex-1 px-3 py-2 text-xs uppercase tracking-wider border border-[#D4D1CC]"
                >
                  Guardar
                </button>
                <button
                  onClick={handleDeleteTemplate}
                  disabled={templateId === '__new__' || isTemplateSaving}
                  className="px-3 py-2 text-xs uppercase tracking-wider border border-[#D4D1CC] text-rose-600"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="text-xs text-stone-500">
                {templateId === '__new__' ? 'Crea una plantilla y quedará disponible para todo el equipo.' : 'Edita el asunto/cuerpo y pulsa guardar.'}
              </div>
            </div>
          </div>

          {(stats.length > 0 || accounts.length > 0) && (
            <div className="bg-white border border-[#E6E1D8] shadow-sm">
              <div className="p-4 border-b border-[#E6E1D8] flex items-center gap-2 text-xs uppercase tracking-wider text-stone-500">
                <TrendingUp size={14} />
                Rendimiento plantillas
              </div>
              <div className="p-4 space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={statsFilters.channel}
                    onChange={(e) => setStatsFilters(prev => ({ ...prev, channel: e.target.value }))}
                    className="border border-[#D4D1CC] px-2 py-1"
                  >
                    <option value="all">Todos los canales</option>
                    {uniqueFilters.channel.map(value => (
                      <option key={value} value={value}>{value}</option>
                    ))}
                  </select>
                  <select
                    value={statsFilters.account_type}
                    onChange={(e) => setStatsFilters(prev => ({ ...prev, account_type: e.target.value }))}
                    className="border border-[#D4D1CC] px-2 py-1"
                  >
                    <option value="all">Todos los tipos</option>
                    {uniqueFilters.account_type.map(value => (
                      <option key={value} value={value}>{value}</option>
                    ))}
                  </select>
                  <select
                    value={statsFilters.sale_type}
                    onChange={(e) => setStatsFilters(prev => ({ ...prev, sale_type: e.target.value }))}
                    className="border border-[#D4D1CC] px-2 py-1"
                  >
                    <option value="all">Todas las ventas</option>
                    {uniqueFilters.sale_type.map(value => (
                      <option key={value} value={value}>{value}</option>
                    ))}
                  </select>
                  <select
                    value={statsFilters.level}
                    onChange={(e) => setStatsFilters(prev => ({ ...prev, level: e.target.value }))}
                    className="border border-[#D4D1CC] px-2 py-1"
                  >
                    <option value="all">Todos los niveles</option>
                    {uniqueFilters.level.map(value => (
                      <option key={value} value={value}>{value}</option>
                    ))}
                  </select>
                </div>
                {stats.length === 0 ? (
                  <div className="text-xs text-stone-400">Sin datos para este filtro.</div>
                ) : (
                  <div className="space-y-2 text-sm">
                    {stats.map((item) => (
                      <div key={item.template_id} className="flex items-center justify-between">
                        <span>{item.template_id}</span>
                        <span className="text-stone-500">
                          {item.replies}/{item.sent} ({item.reply_rate}%)
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ProspectingPage
