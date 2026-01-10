// Document Library Page with data fetching
import { useState } from 'react'
import { DocumentLibrary } from '../components/sections/production-and-quality/DocumentLibrary'
import { LoadingState } from '../components/ui/LoadingState'
import { ErrorState } from '../components/ui/ErrorState'
import { useDocumentLibrary } from '../api'

export function DocumentLibraryPage() {
  const [selectedFolder, setSelectedFolder] = useState<string | undefined>()
  const { folders, documents, loading, error, refetch } = useDocumentLibrary(selectedFolder)

  if (loading) {
    return <LoadingState message="Cargando documentos..." />
  }

  if (error || !folders || !documents) {
    return (
      <ErrorState
        title="Error al cargar documentos"
        message="No se pudo cargar la biblioteca de documentos."
        error={error}
        onRetry={refetch}
      />
    )
  }

  return (
    <DocumentLibrary
      folders={folders}
      documents={documents}
      onViewDocument={(id) => console.log('View document:', id)}
      onUploadDocument={() => console.log('Upload document')}
      onFilterByFolder={(folderId) => setSelectedFolder(folderId)}
    />
  )
}

export default DocumentLibraryPage
