const priorityConfig = {
  urgent: { label: 'Urgent', class: 'priority-urgent', dot: 'bg-red-400' },
  high: { label: 'High', class: 'priority-high', dot: 'bg-orange-400' },
  medium: { label: 'Medium', class: 'priority-medium', dot: 'bg-yellow-400' },
  low: { label: 'Low', class: 'priority-low', dot: 'bg-green-400' },
}

const PriorityBadge = ({ priority, showDot = true }) => {
  const config = priorityConfig[priority] || priorityConfig.medium

  return (
    <span className={`badge ${config.class} flex items-center gap-1.5`}>
      {showDot && <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />}
      {config.label}
    </span>
  )
}

export default PriorityBadge
