import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from './AuthContext'

const SocketContext = createContext(null)

export const SocketProvider = ({ children }) => {
  const { token, user } = useAuth()
  const socketRef = useRef(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    if (!token || !user) {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
        setIsConnected(false)
      }
      return
    }

    const socket = io('http://localhost:5000', {
      auth: { token },
      query: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })

    socket.on('connect', () => {
      console.log('✅ Socket.io connected:', socket.id)
      setIsConnected(true)
    })

    socket.on('disconnect', (reason) => {
      console.log('❌ Socket.io disconnected:', reason)
      setIsConnected(false)
    })

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message)
      setIsConnected(false)
    })

    socketRef.current = socket

    return () => {
      socket.disconnect()
      socketRef.current = null
      setIsConnected(false)
    }
  }, [token, user])

  const joinProject = (projectId) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('joinProject', { projectId })
    }
  }

  const leaveProject = (projectId) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('leaveProject', { projectId })
    }
  }

  const emitTyping = (projectId, taskId) => {
    socketRef.current?.emit('typing', { projectId, taskId })
  }

  const emitStopTyping = (projectId, taskId) => {
    socketRef.current?.emit('stopTyping', { projectId, taskId })
  }

  return (
    <SocketContext.Provider value={{
      socket: socketRef.current,
      isConnected,
      joinProject,
      leaveProject,
      emitTyping,
      emitStopTyping,
    }}>
      {children}
    </SocketContext.Provider>
  )
}

export const useSocket = () => {
  const ctx = useContext(SocketContext)
  if (!ctx) throw new Error('useSocket must be used within SocketProvider')
  return ctx
}
