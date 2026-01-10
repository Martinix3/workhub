// Loading State Component - Neobrutal style

interface LoadingStateProps {
  message?: string
  fullPage?: boolean
}

export function LoadingState({ message = 'Cargando...', fullPage = false }: LoadingStateProps) {
  const content = (
    <div className="flex flex-col items-center justify-center gap-4 p-8">
      <div className="relative">
        <div className="w-12 h-12 border-4 border-stone-200 border-t-amber-500 rounded-full animate-spin" />
      </div>
      <p className="text-stone-600 font-medium">{message}</p>
    </div>
  )

  if (fullPage) {
    return (
      <div className="min-h-screen bg-[#fafaf8] flex items-center justify-center">
        {content}
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      {content}
    </div>
  )
}

// Skeleton loader for cards
export function SkeletonCard() {
  return (
    <div className="bg-white border-2 border-stone-200 p-6 animate-pulse">
      <div className="h-4 bg-stone-200 rounded w-1/3 mb-4" />
      <div className="h-8 bg-stone-200 rounded w-1/2 mb-2" />
      <div className="h-3 bg-stone-200 rounded w-1/4" />
    </div>
  )
}

// Skeleton loader for KPI grid
export function SkeletonKPIGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}

// Skeleton loader for table rows
export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-white border-2 border-stone-200">
      <div className="border-b border-stone-200 p-4">
        <div className="h-4 bg-stone-200 rounded w-1/4 animate-pulse" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="border-b border-stone-100 p-4 animate-pulse">
          <div className="flex gap-4">
            <div className="h-4 bg-stone-200 rounded w-1/4" />
            <div className="h-4 bg-stone-200 rounded w-1/3" />
            <div className="h-4 bg-stone-200 rounded w-1/6" />
            <div className="h-4 bg-stone-200 rounded w-1/6" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default LoadingState
