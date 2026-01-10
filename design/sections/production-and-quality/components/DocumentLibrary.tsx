import type { DocumentLibraryProps, QualityDocument, DocumentFolder, DocStatus, DocType } from '../types'
import { Folder, FileText, Upload, Eye, Clock, CheckCircle, AlertTriangle, Search } from 'lucide-react'
import { useState } from 'react'

const statusConfig: Record<DocStatus, { bg: string; text: string; label: string }> = {
  draft: { bg: 'bg-stone-100 dark:bg-stone-700', text: 'text-stone-600 dark:text-stone-300', label: 'Borrador' },
  pending_approval: { bg: 'bg-amber-100 dark:bg-amber-900', text: 'text-amber-700 dark:text-amber-300', label: 'Pendiente' },
  approved: { bg: 'bg-green-100 dark:bg-green-900', text: 'text-green-700 dark:text-green-300', label: 'Aprobado' },
  expired: { bg: 'bg-red-100 dark:bg-red-900', text: 'text-red-700 dark:text-red-300', label: 'Vencido' },
  obsolete: { bg: 'bg-stone-100 dark:bg-stone-700', text: 'text-stone-500', label: 'Obsoleto' },
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
        border-2 border-stone-900 dark:border-stone-100
        ${isSelected ? 'bg-amber-50 dark:bg-amber-950 border-amber-500' : 'bg-white dark:bg-stone-900'}
        shadow-[4px_4px_0_#1c1917] dark:shadow-[4px_4px_0_#fafaf9]
        hover:translate-x-[2px] hover:translate-y-[2px]
        hover:shadow-[2px_2px_0_#1c1917] dark:hover:shadow-[2px_2px_0_#fafaf9]
        transition-all duration-75
      `}
    >
      <div className="flex items-center gap-3">
        <Folder size={24} className={isSelected ? 'text-amber-500' : 'text-stone-400'} />
        <div>
          <div className="font-medium text-stone-900 dark:text-stone-100">{folder.name}</div>
          <div className="text-xs text-stone-500">{folder.documentCount} documentos</div>
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
    <tr className="group hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <FileText size={20} className="text-stone-400" />
          <div>
            <div className="font-medium text-stone-900 dark:text-stone-100">
              {document.title}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-mono text-xs text-stone-500">{document.code}</span>
              <span className="text-xs text-stone-400">v{document.currentVersion}</span>
            </div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="text-xs uppercase tracking-wider text-stone-500">
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
        <div className="text-sm text-stone-700 dark:text-stone-300">
          {document.effectiveDate}
        </div>
        {document.expirationDate && (
          <div className={`text-xs ${isExpiringSoon ? 'text-red-600' : 'text-stone-400'}`}>
            {isExpiringSoon && <AlertTriangle size={10} className="inline mr-1" />}
            Vence: {document.expirationDate}
          </div>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-stone-500">
        {document.author}
      </td>
      <td className="px-4 py-3">
        <button
          onClick={onView}
          className="p-1.5 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors opacity-0 group-hover:opacity-100"
        >
          <Eye size={16} className="text-stone-500" />
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
          <h1 className="font-serif text-2xl lg:text-3xl font-bold text-stone-900 dark:text-stone-100">
            Biblioteca de Documentos
          </h1>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
            SOPs, especificaciones, certificados y registros
          </p>
        </div>

        <button
          onClick={onUploadDocument}
          className="
            inline-flex items-center gap-2 px-4 py-2
            bg-amber-400 dark:bg-amber-500
            text-stone-900 font-medium text-sm uppercase tracking-wider
            border-2 border-stone-900 dark:border-stone-100
            shadow-[4px_4px_0_#1c1917] dark:shadow-[4px_4px_0_#fafaf9]
            hover:translate-x-[2px] hover:translate-y-[2px]
            hover:shadow-[2px_2px_0_#1c1917] dark:hover:shadow-[2px_2px_0_#fafaf9]
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
          <h2 className="font-serif text-lg font-bold text-stone-900 dark:text-stone-100 mb-4">
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
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                placeholder="Buscar documento..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="
                  w-full pl-10 pr-4 py-2
                  bg-white dark:bg-stone-900
                  border-2 border-stone-900 dark:border-stone-100
                  text-stone-900 dark:text-stone-100
                  placeholder:text-stone-400
                  focus:outline-none focus:ring-2 focus:ring-amber-400
                "
              />
            </div>
          </div>

          {/* Documents Table */}
          <div className="bg-white dark:bg-stone-900 border-2 border-stone-900 dark:border-stone-100 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-stone-900 dark:border-stone-100">
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold text-stone-600 dark:text-stone-400">
                    Documento
                  </th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold text-stone-600 dark:text-stone-400">
                    Tipo
                  </th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold text-stone-600 dark:text-stone-400">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold text-stone-600 dark:text-stone-400">
                    Vigencia
                  </th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold text-stone-600 dark:text-stone-400">
                    Autor
                  </th>
                  <th className="px-4 py-3 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 dark:divide-stone-700">
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
