import type { DocumentLibraryProps, QualityDocument, DocumentFolder, DocStatus, DocType } from './types'
import { Folder, FileText, Upload, Eye, Clock, CheckCircle, AlertTriangle, Search } from 'lucide-react'
import { useState } from 'react'

const statusConfig: Record<DocStatus, { bg: string; text: string; label: string }> = {
  draft: { bg: 'bg-neutral-100 dark:bg-neutral-700', text: 'text-neutral-600 dark:text-neutral-300', label: 'Borrador' },
  pending_approval: { bg: 'bg-gold-light dark:bg-gold-dark', text: 'text-gold-dark dark:text-gold', label: 'Pendiente' },
  approved: { bg: 'bg-success-light dark:bg-success-dark', text: 'text-success-text dark:text-success', label: 'Aprobado' },
  expired: { bg: 'bg-error-light dark:bg-error-dark', text: 'text-error-text dark:text-error', label: 'Vencido' },
  obsolete: { bg: 'bg-neutral-100 dark:bg-neutral-700', text: 'text-neutral-500', label: 'Obsoleto' },
}

const typeLabels: Record<DocType, string> = {
  sop: 'SOP',
  specification: 'Especificacion',
  certificate: 'Certificado',
  training: 'Capacitacion',
  record: 'Registro',
  policy: 'Politica',
}

interface FolderCardProps {
  folder: DocumentFolder
  isSelected: boolean
  onClick: () => void
}

function FolderCard({ folder, isSelected, onClick }: FolderCardProps) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left p-4
        border border-neutral-200 dark:border-neutral-100
        ${isSelected ? 'bg-gold-light dark:bg-gold-dark/20 border-gold-dark' : 'bg-white dark:bg-neutral-900'}
        transition-all duration-75
      `}
    >
      <div className="flex items-center gap-3">
        <Folder size={24} className={isSelected ? 'text-gold-dark' : 'text-neutral-400'} />
        <div>
          <div className="font-medium text-neutral-900 dark:text-neutral-100">{folder.name}</div>
          <div className="text-xs text-neutral-500">{folder.documentCount} documentos</div>
        </div>
      </div>
    </button>
  )
}

interface DocumentRowProps {
  document: QualityDocument
  onView?: () => void
}

function DocumentRow({ document, onView }: DocumentRowProps) {
  const status = statusConfig[document.status]
  const isExpiringSoon = document.expirationDate &&
    new Date(document.expirationDate).getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000

  return (
    <tr className="group hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <FileText size={20} className="text-neutral-400" />
          <div>
            <div className="font-medium text-neutral-900 dark:text-neutral-100">
              {document.title}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-mono text-xs text-neutral-500">{document.code}</span>
              <span className="text-xs text-neutral-400">v{document.currentVersion}</span>
            </div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="text-xs uppercase tracking-wider text-neutral-500">
          {typeLabels[document.type]}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] uppercase tracking-wider ${status.bg} ${status.text}`}>
          {document.status === 'approved' && <CheckCircle size={10} />}
          {document.status === 'pending_approval' && <Clock size={10} />}
          {status.label}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="text-sm text-neutral-700 dark:text-neutral-300">
          {document.effectiveDate}
        </div>
        {document.expirationDate && (
          <div className={`text-xs ${isExpiringSoon ? 'text-error-dark' : 'text-neutral-400'}`}>
            {isExpiringSoon && <AlertTriangle size={10} className="inline mr-1" />}
            Vence: {document.expirationDate}
          </div>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-neutral-500">
        {document.author}
      </td>
      <td className="px-4 py-3">
        <button
          onClick={onView}
          className="p-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors opacity-0 group-hover:opacity-100"
        >
          <Eye size={16} className="text-neutral-500" />
        </button>
      </td>
    </tr>
  )
}

export function DocumentLibrary({
  folders,
  documents,
  onViewDocument,
  onUploadDocument,
  onFilterByFolder
}: DocumentLibraryProps) {
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredDocuments = documents.filter(doc => {
    if (searchQuery && !doc.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !doc.code.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }
    return true
  })

  const handleFolderClick = (folderId: string) => {
    setSelectedFolder(folderId === selectedFolder ? null : folderId)
    onFilterByFolder?.(folderId)
  }

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-heading text-2xl lg:text-3xl font-bold text-neutral-900 dark:text-neutral-100">
            Biblioteca de Documentos
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            SOPs, especificaciones, certificados y registros
          </p>
        </div>

        <button
          onClick={onUploadDocument}
          className="
            inline-flex items-center gap-2 px-4 py-2
            bg-gold dark:bg-gold-dark
            text-neutral-900 font-medium text-sm uppercase tracking-wider
            border border-neutral-200 dark:border-neutral-100
            transition-all duration-75
          "
        >
          <Upload size={16} />
          Subir Documento
        </button>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Folders Sidebar */}
        <div className="lg:col-span-1">
          <h2 className="font-heading text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-4">
            Carpetas
          </h2>
          <div className="space-y-3">
            {folders.map((folder) => (
              <FolderCard
                key={folder.id}
                folder={folder}
                isSelected={selectedFolder === folder.id}
                onClick={() => handleFolderClick(folder.id)}
              />
            ))}
          </div>
        </div>

        {/* Documents List */}
        <div className="lg:col-span-3">
          {/* Search */}
          <div className="mb-4">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Buscar documento..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="
                  w-full pl-10 pr-4 py-2
                  bg-white dark:bg-neutral-900
                  border border-neutral-200 dark:border-neutral-100
                  text-neutral-900 dark:text-neutral-100
                  placeholder:text-neutral-400
                  focus:outline-none focus:ring-2 focus:ring-gold
                "
              />
            </div>
          </div>

          {/* Documents Table */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-100 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-100">
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold text-neutral-600 dark:text-neutral-400">
                    Documento
                  </th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold text-neutral-600 dark:text-neutral-400">
                    Tipo
                  </th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold text-neutral-600 dark:text-neutral-400">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold text-neutral-600 dark:text-neutral-400">
                    Vigencia
                  </th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold text-neutral-600 dark:text-neutral-400">
                    Autor
                  </th>
                  <th className="px-4 py-3 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                {filteredDocuments.map((document) => (
                  <DocumentRow
                    key={document.id}
                    document={document}
                    onView={() => onViewDocument?.(document.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
