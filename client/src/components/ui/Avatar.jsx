const Avatar = ({ name = '', avatar, size = 'md', className = '', online = false }) => {
  const sizes = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-16 h-16 text-2xl',
  }

  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const colors = [
    'from-violet-500 to-purple-600',
    'from-blue-500 to-cyan-600',
    'from-emerald-500 to-teal-600',
    'from-orange-500 to-red-600',
    'from-pink-500 to-rose-600',
    'from-indigo-500 to-blue-600',
  ]
  const colorIndex = name.charCodeAt(0) % colors.length
  const gradient = colors[colorIndex] || colors[0]

  return (
    <div className={`relative inline-flex flex-shrink-0 ${className}`}>
      {avatar ? (
        <img
          src={avatar}
          alt={name}
          className={`${sizes[size]} rounded-full object-cover ring-2 ring-gray-800`}
        />
      ) : (
        <div
          className={`${sizes[size]} rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center font-semibold text-white ring-2 ring-gray-800`}
        >
          {initials || '?'}
        </div>
      )}
      {online && (
        <span className="absolute bottom-0 right-0 online-dot" />
      )}
    </div>
  )
}

export default Avatar
