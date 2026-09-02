import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useNotifications } from '../context/NotificationContext'
import { useSocket } from '../context/SocketContext'
import Avatar from '../components/ui/Avatar'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: '⊞' },
  { to: '/projects', label: 'Projects', icon: '📁' },
  { to: '/notifications', label: 'Notifications', icon: '🔔' },
  { to: '/profile', label: 'Profile', icon: '👤' },
]

export default function AppLayout() {
  const { user, logout } = useAuth()
  const { unreadCount } = useNotifications()
  const { isConnected } = useSocket()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-950 flex">
      {/* Sidebar */}
      <aside className={`sidebar transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        {/* Logo */}
        <div className="p-5 border-b border-gray-800/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center text-lg shadow-lg">
              ⚡
            </div>
            <div>
              <h1 className="font-bold text-white text-lg leading-none">TaskFlow</h1>
              <p className="text-xs text-gray-500 mt-0.5">Real-time collaboration</p>
            </div>
          </div>
        </div>

        {/* Connection indicator */}
        <div className="px-5 py-2">
          <div className="flex items-center gap-2 text-xs">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-gray-600'}`} />
            <span className={isConnected ? 'text-green-400' : 'text-gray-500'}>
              {isConnected ? 'Live' : 'Connecting...'}
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-primary-600/20 text-primary-400 border border-primary-500/20'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                }`
              }
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
              {item.label === 'Notifications' && unreadCount > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full font-bold min-w-[20px] text-center">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-gray-800/50">
          <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-800/50 transition-colors group">
            <Avatar name={user?.name} avatar={user?.avatar} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-200 truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-all text-sm p-1 rounded"
              title="Logout"
            >
              ⏻
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 lg:ml-[260px] flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="h-16 border-b border-gray-800/50 flex items-center px-4 lg:px-6 gap-4 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-10">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden btn-icon"
          >
            ☰
          </button>
          <div className="flex-1" />
          <NavLink to="/notifications" className="relative btn-icon">
            <span className="text-lg">🔔</span>
            {unreadCount > 0 && (
              <span className="notif-dot">{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
          </NavLink>
          <div className="flex items-center gap-2">
            <Avatar name={user?.name} avatar={user?.avatar} size="sm" />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
