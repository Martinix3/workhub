// Settings Page with tabs for Profile, Preferences, Notifications, Departments, and KPIs
import { useState } from 'react'
import { User, Settings, Bell, Building2, BarChart3 } from 'lucide-react'
import { ProfileTab } from './ProfileTab'
import { PreferencesTab } from './PreferencesTab'
import { NotificationsTab } from './NotificationsTab'
import { DepartmentsTab } from './DepartmentsTab'
import { KPIsTab } from './KPIsTab'

type TabId = 'profile' | 'preferences' | 'notifications' | 'departments' | 'kpis'

interface Tab {
  id: TabId
  label: string
  icon: React.ReactNode
}

const tabs: Tab[] = [
  { id: 'profile', label: 'Perfil', icon: <User size={18} /> },
  { id: 'preferences', label: 'Preferencias', icon: <Settings size={18} /> },
  { id: 'notifications', label: 'Notificaciones', icon: <Bell size={18} /> },
  { id: 'departments', label: 'Departamentos', icon: <Building2 size={18} /> },
  { id: 'kpis', label: 'KPIs', icon: <BarChart3 size={18} /> },
]

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('profile')

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return <ProfileTab />
      case 'preferences':
        return <PreferencesTab />
      case 'notifications':
        return <NotificationsTab />
      case 'departments':
        return <DepartmentsTab />
      case 'kpis':
        return <KPIsTab />
      default:
        return null
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-stone-900">Configuracion</h1>
        <p className="text-stone-500 mt-1">Administra tu perfil y preferencias</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-stone-200 mb-6">
        <nav className="flex gap-1" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors
                ${activeTab === tab.id
                  ? 'border-amber-500 text-amber-600'
                  : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'
                }
              `}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-xl border border-stone-200 p-6">
        {renderTabContent()}
      </div>
    </div>
  )
}

export default SettingsPage
