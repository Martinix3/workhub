import { useState } from 'react'
import { Download, FileJson, FileText, Loader2 } from 'lucide-react'

interface ExportKPIsButtonProps {
  onExport: (format: 'json' | 'csv') => Promise<void> | void
  disabled?: boolean
  className?: string
}

export function ExportKPIsButton({ onExport, disabled = false, className = '' }: ExportKPIsButtonProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleExport = async (format: 'json' | 'csv') => {
    setOpen(false)
    setLoading(true)
    try {
      await onExport(format)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setOpen(!open)}
        disabled={disabled || loading}
        className="px-4 py-2 bg-gold hover:bg-gold-dark text-neutral-900 font-medium border border-neutral-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
      >
        {loading ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Download size={16} />
        )}
        <span>{loading ? 'Exportando...' : 'Exportar'}</span>
      </button>

      {/* Dropdown Menu */}
      {open && !loading && (
        <>
          {/* Backdrop to close dropdown */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />

          {/* Dropdown content */}
          <div className="absolute top-full right-0 mt-2 bg-white border border-neutral-200 z-50 min-w-[180px]">
            <div className="py-1">
              <button
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-700 hover:bg-gold-light transition-colors"
                onClick={() => handleExport('csv')}
              >
                <FileText size={16} />
                <span className="font-medium">Export CSV</span>
              </button>
              <div className="border-t border-neutral-200" />
              <button
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-700 hover:bg-gold-light transition-colors"
                onClick={() => handleExport('json')}
              >
                <FileJson size={16} />
                <span className="font-medium">Export JSON</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
