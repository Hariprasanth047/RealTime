const Spinner = ({ size = 'md', className = '' }) => {
  const sizes = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  }

  return (
    <div
      className={`${sizes[size]} border-primary-500 border-t-transparent rounded-full animate-spin ${className}`}
    />
  )
}

export const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="text-center">
      <Spinner size="lg" className="mx-auto mb-4" />
      <p className="text-gray-500 text-sm">Loading...</p>
    </div>
  </div>
)

export const SkeletonCard = () => (
  <div className="card p-4 space-y-3 animate-pulse">
    <div className="skeleton h-4 w-3/4" />
    <div className="skeleton h-3 w-full" />
    <div className="skeleton h-3 w-2/3" />
    <div className="flex gap-2 mt-2">
      <div className="skeleton h-5 w-16 rounded-full" />
      <div className="skeleton h-5 w-20 rounded-full" />
    </div>
  </div>
)

export const EmptyState = ({ icon = '📭', title, description, action }) => (
  <div className="text-center py-16 px-4">
    <div className="text-5xl mb-4 animate-bounce">{icon}</div>
    <h3 className="text-lg font-semibold text-gray-300 mb-2">{title}</h3>
    {description && <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">{description}</p>}
    {action}
  </div>
)

export default Spinner
