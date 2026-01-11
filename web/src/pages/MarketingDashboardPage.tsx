// Marketing Dashboard Page with data fetching
import { useState } from 'react'
import { MarketingDashboard } from '../components/sections/marketing-and-growth/MarketingDashboard'
import { LoadingState } from '../components/ui/LoadingState'
import { ErrorState } from '../components/ui/ErrorState'
import { useMarketingDashboard } from '../api'
import { tasksApi } from '../api/services/tasks'
import { downloadJSON, downloadCSV } from '../utils/download'
import { X, Save } from 'lucide-react'

// Simple Modal component
function Modal({ isOpen, onClose, title, children }: {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white border-2 border-stone-900 shadow-[8px_8px_0_#1c1917] max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-4 border-b-2 border-stone-200">
          <h2 className="font-serif text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="p-1 hover:bg-stone-100">
            <X size={20} />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}

export function MarketingDashboardPage() {
  const { kpis, activeCampaigns, recentPosts, platformStats, loading, error, refetch, createCampaign, createPost } = useMarketingDashboard()

  // Modal states
  const [showCampaignModal, setShowCampaignModal] = useState(false)
  const [showPostModal, setShowPostModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState<string | null>(null)

  // Form states
  const [campaignForm, setCampaignForm] = useState({ name: '', budget: '', description: '' })
  const [postForm, setPostForm] = useState({ platform: 'Instagram', content: '' })
  const [saving, setSaving] = useState(false)

  const handleCreateCampaign = async () => {
    if (!campaignForm.name.trim()) return
    setSaving(true)
    try {
      await createCampaign({
        name: campaignForm.name,
        budget: parseFloat(campaignForm.budget) || 0,
        description: campaignForm.description
      })
      setShowCampaignModal(false)
      setCampaignForm({ name: '', budget: '', description: '' })
      refetch()
    } catch (err) {
      console.error('Error creating campaign:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleCreatePost = async () => {
    if (!postForm.content.trim()) return
    setSaving(true)
    try {
      await createPost({
        platform: postForm.platform,
        content: postForm.content
      })
      setShowPostModal(false)
      setPostForm({ platform: 'Instagram', content: '' })
      refetch()
    } catch (err) {
      console.error('Error creating post:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleExport = async (format: 'json' | 'csv') => {
    try {
      const data = await tasksApi.exportKPIs(format)
      const timestamp = new Date().toISOString().split('T')[0]
      const filename = `marketing-kpis-${timestamp}`

      if (format === 'json') {
        downloadJSON(data, filename)
      } else {
        downloadCSV(data as string, filename)
      }
    } catch (error) {
      console.error('Failed to export KPIs:', error)
      // TODO: Add toast notification for error
    }
  }

  if (loading) {
    return <LoadingState message="Cargando marketing..." />
  }

  if (error || !kpis) {
    return (
      <ErrorState
        title="Error al cargar marketing"
        message="No se pudo cargar la informacion de marketing."
        error={error}
        onRetry={refetch}
      />
    )
  }

  const selectedCampaign = showDetailModal ? activeCampaigns?.find(c => c.id === showDetailModal) : null

  return (
    <>
      <MarketingDashboard
        kpis={kpis}
        activeCampaigns={activeCampaigns || []}
        recentPosts={recentPosts || []}
        platformStats={platformStats || []}
        onViewCampaign={(id) => setShowDetailModal(id)}
        onViewPost={(id) => console.log('View post:', id)}
        onNewCampaign={() => setShowCampaignModal(true)}
        onNewPost={() => setShowPostModal(true)}
        onExport={handleExport}
      />

      {/* New Campaign Modal */}
      <Modal isOpen={showCampaignModal} onClose={() => setShowCampaignModal(false)} title="Nueva Campana">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 uppercase tracking-wider mb-1">
              Nombre *
            </label>
            <input
              type="text"
              value={campaignForm.name}
              onChange={(e) => setCampaignForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Nombre de la campana"
              className="w-full px-3 py-2 border-2 border-stone-300 focus:border-stone-900 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 uppercase tracking-wider mb-1">
              Presupuesto
            </label>
            <input
              type="number"
              value={campaignForm.budget}
              onChange={(e) => setCampaignForm(prev => ({ ...prev, budget: e.target.value }))}
              placeholder="0.00"
              className="w-full px-3 py-2 border-2 border-stone-300 focus:border-stone-900 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 uppercase tracking-wider mb-1">
              Descripcion
            </label>
            <textarea
              value={campaignForm.description}
              onChange={(e) => setCampaignForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe la campana..."
              rows={3}
              className="w-full px-3 py-2 border-2 border-stone-300 focus:border-stone-900 outline-none resize-none"
            />
          </div>
          <button
            onClick={handleCreateCampaign}
            disabled={saving || !campaignForm.name.trim()}
            className="w-full py-2 bg-amber-400 hover:bg-amber-500 text-stone-900 font-medium uppercase tracking-wider border-2 border-stone-900 shadow-[4px_4px_0_#1c1917] hover:shadow-[2px_2px_0_#1c1917] hover:translate-x-[2px] hover:translate-y-[2px] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Save size={16} />
            {saving ? 'Guardando...' : 'Crear Campana'}
          </button>
        </div>
      </Modal>

      {/* New Post Modal */}
      <Modal isOpen={showPostModal} onClose={() => setShowPostModal(false)} title="Nuevo Post">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 uppercase tracking-wider mb-1">
              Plataforma
            </label>
            <select
              value={postForm.platform}
              onChange={(e) => setPostForm(prev => ({ ...prev, platform: e.target.value }))}
              className="w-full px-3 py-2 border-2 border-stone-300 focus:border-stone-900 outline-none"
            >
              <option value="Instagram">Instagram</option>
              <option value="Facebook">Facebook</option>
              <option value="LinkedIn">LinkedIn</option>
              <option value="TikTok">TikTok</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 uppercase tracking-wider mb-1">
              Contenido *
            </label>
            <textarea
              value={postForm.content}
              onChange={(e) => setPostForm(prev => ({ ...prev, content: e.target.value }))}
              placeholder="Escribe el contenido del post..."
              rows={4}
              className="w-full px-3 py-2 border-2 border-stone-300 focus:border-stone-900 outline-none resize-none"
            />
          </div>
          <button
            onClick={handleCreatePost}
            disabled={saving || !postForm.content.trim()}
            className="w-full py-2 bg-amber-400 hover:bg-amber-500 text-stone-900 font-medium uppercase tracking-wider border-2 border-stone-900 shadow-[4px_4px_0_#1c1917] hover:shadow-[2px_2px_0_#1c1917] hover:translate-x-[2px] hover:translate-y-[2px] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Save size={16} />
            {saving ? 'Guardando...' : 'Crear Post'}
          </button>
        </div>
      </Modal>

      {/* Campaign Detail Modal */}
      <Modal isOpen={!!showDetailModal} onClose={() => setShowDetailModal(null)} title="Detalle de Campana">
        {selectedCampaign && (
          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-lg">{selectedCampaign.name}</h3>
              <p className="text-sm text-stone-500">{selectedCampaign.objective}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-stone-50 border border-stone-200">
                <div className="text-xs uppercase text-stone-500">Presupuesto</div>
                <div className="font-mono font-bold">${selectedCampaign.budget.toLocaleString()}</div>
              </div>
              <div className="p-3 bg-stone-50 border border-stone-200">
                <div className="text-xs uppercase text-stone-500">Gastado</div>
                <div className="font-mono font-bold">${selectedCampaign.spent.toLocaleString()}</div>
              </div>
              <div className="p-3 bg-stone-50 border border-stone-200">
                <div className="text-xs uppercase text-stone-500">Leads</div>
                <div className="font-mono font-bold">{selectedCampaign.metrics.leads}</div>
              </div>
              <div className="p-3 bg-stone-50 border border-stone-200">
                <div className="text-xs uppercase text-stone-500">Estado</div>
                <div className="font-medium capitalize">{selectedCampaign.status}</div>
              </div>
            </div>
            <button
              onClick={() => setShowDetailModal(null)}
              className="w-full py-2 text-stone-600 hover:text-stone-900 font-medium uppercase tracking-wider border-2 border-stone-300 hover:border-stone-400 transition-colors"
            >
              Cerrar
            </button>
          </div>
        )}
      </Modal>
    </>
  )
}

export default MarketingDashboardPage
