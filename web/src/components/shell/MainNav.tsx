import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import type { NavigationSection } from './types'

interface MainNavProps {
  sections: NavigationSection[]
  onNavigate?: (href: string) => void
}

export function MainNav({ sections, onNavigate }: MainNavProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>(() => {
    // Auto-expand sections with active items
    return sections
      .filter(s => s.items?.some(i => i.isActive) || s.isActive)
      .map(s => s.label)
  })

  const toggleSection = (label: string) => {
    setExpandedSections(prev =>
      prev.includes(label)
        ? prev.filter(l => l !== label)
        : [...prev, label]
    )
  }

  return (
    <nav className="px-2 space-y-1">
      {sections.map((section) => {
        const isExpanded = expandedSections.includes(section.label)
        const hasItems = section.items && section.items.length > 0

        // Single item (no children)
        if (!hasItems && section.href) {
          return (
            <button
              key={section.label}
              onClick={() => onNavigate?.(section.href!)}
              className={`
                w-full flex items-center gap-3 px-3 py-2 text-sm font-medium
                transition-all duration-75
                ${section.isActive
                  ? 'bg-[#f5ce3e] text-[#1e293b]'
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }
              `}
            >
              {section.icon && <span className="w-5 h-5">{section.icon}</span>}
              <span className="font-['Inter']">{section.label}</span>
            </button>
          )
        }

        // Section with children
        return (
          <div key={section.label}>
            <button
              onClick={() => toggleSection(section.label)}
              className={`
                w-full flex items-center gap-3 px-3 py-2 text-sm font-medium
                transition-all duration-75
                ${section.isActive || section.items?.some(i => i.isActive)
                  ? 'text-[#f5ce3e]'
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }
              `}
            >
              {section.icon && <span className="w-5 h-5">{section.icon}</span>}
              <span className="font-['Inter'] flex-1 text-left">{section.label}</span>
              <ChevronRight
                size={16}
                className={`transition-transform duration-150 ${isExpanded ? 'rotate-90' : ''}`}
              />
            </button>

            {/* Subitems */}
            {isExpanded && section.items && (
              <div className="ml-4 mt-1 space-y-1 border-l border-slate-600 pl-3">
                {section.items.map((item) => (
                  <button
                    key={item.href}
                    onClick={() => onNavigate?.(item.href)}
                    className={`
                      w-full text-left px-3 py-1.5 text-sm
                      transition-all duration-75
                      ${item.isActive
                        ? 'bg-[#f5ce3e] text-[#1e293b] font-medium'
                        : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                      }
                    `}
                  >
                    <span className="font-['Inter']">{item.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </nav>
  )
}
