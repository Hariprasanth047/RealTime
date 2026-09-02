import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotifications } from '../context/NotificationContext'
import { formatDistanceToNow } from 'date-fns'
import Avatar from '../components/ui/Avatar'

const notifIcons = {
  task_assigned: '🎯',
  comment_added: '💬',
  task_status_changed: '🔄',
  added_to_project: '📁',
  task_updated: '✏️',
  task_due_soon: '⏰',
  task_overdue: '⚠️',
  member_joined: '👋',
}

export default function Notifications() {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications()
  const navigate = useNavigate()

  const handleClick = async (notif) => {
    if (!notif.isRead) await markRead(notif._id)
    if (notif.task) navigate(`/tasks/${notif.task._id || notif.task}`)
    else if (notif.project) navigate(`/projects/${notif.project._id || notif.project}`)
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-gray-500 text-sm mt-1">{unreadCount} unread</p>
          )}
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="btn-secondary text-sm">
            Mark all as read
          </button>
        )}
      </div>

      {!notifications.length ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">🔕</div>
          <h3 className="text-lg font-semibold text-gray-400 mb-2">No notifications</h3>
          <p className="text-gray-600 text-sm">You're all caught up!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif) => (
            <div
              key={notif._id}
              onClick={() => handleClick(notif)}
              className={`flex items-start gap-4 p-4 rounded-2xl cursor-pointer transition-all ${
                notif.isRead
                  ? 'bg-gray-900/50 border border-gray-800 hover:border-gray-700'
                  : 'bg-primary-600/10 border border-primary-500/20 hover:border-primary-500/40'
              }`}
            >
              <div className="text-xl flex-shrink-0 mt-0.5">
                {notifIcons[notif.type] || '🔔'}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm leading-relaxed ${notif.isRead ? 'text-gray-400' : 'text-gray-200 font-medium'}`}>
                  {notif.message}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  {notif.sender && (
                    <>
                      <Avatar name={notif.sender.name} avatar={notif.sender.avatar} size="xs" />
                      <span className="text-xs text-gray-600">{notif.sender.name}</span>
                      <span className="text-gray-700">·</span>
                    </>
                  )}
                  <span className="text-xs text-gray-600">
                    {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                  </span>
                </div>
              </div>
              {!notif.isRead && (
                <span className="w-2.5 h-2.5 rounded-full bg-primary-500 flex-shrink-0 mt-1.5" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
