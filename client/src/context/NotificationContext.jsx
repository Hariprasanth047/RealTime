import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { notificationService } from '../services/index'
import { useAuth } from './AuthContext'
import { useSocket } from './SocketContext'

const NotificationContext = createContext(null)

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth()
  const { socket } = useSocket()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)

  const fetchNotifications = useCallback(async () => {
    if (!user) return
    try {
      const res = await notificationService.getAll()
      setNotifications(res.data.data.notifications)
      setUnreadCount(res.data.data.unreadCount)
    } catch (err) {
      console.error('Failed to fetch notifications:', err)
    }
  }, [user])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  // Real-time: new notification via socket
  useEffect(() => {
    if (!socket) return

    const handleNewNotification = (notification) => {
      setNotifications((prev) => [notification, ...prev])
      setUnreadCount((prev) => prev + 1)
    }

    socket.on('notification', handleNewNotification)
    return () => socket.off('notification', handleNewNotification)
  }, [socket])

  const markRead = async (id) => {
    try {
      await notificationService.markRead(id)
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (err) {
      console.error('Failed to mark notification as read:', err)
    }
  }

  const markAllRead = async () => {
    try {
      await notificationService.markAllRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
      setUnreadCount(0)
    } catch (err) {
      console.error('Failed to mark all as read:', err)
    }
  }

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markRead, markAllRead, fetchNotifications }}>
      {children}
    </NotificationContext.Provider>
  )
}

export const useNotifications = () => {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider')
  return ctx
}
