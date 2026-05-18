import { useState } from 'react'
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@hooks/useAuth'

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const isActive = (path: string) => location.pathname === path

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: '📊' },
    { label: 'Users', path: '/users', icon: '👥' },
    { label: 'Registrations', path: '/registrations', icon: '📝' },
    { label: 'Organizers', path: '/tournament-organizers', icon: '🏆' },
    { label: 'Selectors', path: '/selectors', icon: '📋' },
    { label: 'Reports', path: '/reports', icon: '📄' },
    { label: 'Trials Workflow', path: '/trials-workflow', icon: '🏏' },
    { label: 'Selection Status', path: '/selection-status', icon: '✅' },
    { label: 'Diagnostics', path: '/diagnostics', icon: '🔧' },
    { label: 'Update Payments', path: '/update-payments', icon: '💰' },
    { label: 'Masters', path: '/masters', icon: '⚙️' },
    { label: 'Certificates', path: '/certificates', icon: '🎖️' },
    { label: 'Analytics', path: '/analytics', icon: '📈' },
    { label: 'Coupons', path: '/coupons', icon: '🎟️' },
    { label: 'Payments (Razorpay)', path: '/razorpay', icon: '💳' },
    { label: 'Bulk Email', path: '/email', icon: '📧' },
    { label: 'Chat Logs', path: '/chat-logs', icon: '💬' },
    { label: 'WhatsApp', path: '/whatsapp', icon: '📱' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen bg-gray-900 text-white transition-all duration-300 z-40 flex flex-col ${sidebarOpen ? 'w-64' : 'w-20'
          }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-800">
          {sidebarOpen && <h2 className="text-xl font-bold">Admin</h2>}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1 hover:bg-gray-800 rounded-lg transition-colors"
            title={sidebarOpen ? 'Collapse' : 'Expand'}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${isActive(item.path)
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-gray-800'
                }`}
              title={!sidebarOpen ? item.label : ''}
            >
              <span className="text-lg">{item.icon}</span>
              {sidebarOpen && <span className="font-medium">{item.label}</span>}
            </Link>
          ))}
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">
                {user?.email?.[0].toUpperCase() || 'U'}
              </span>
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.email}</p>
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            className={`w-full flex items-center space-x-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 transition-colors text-sm font-medium ${!sidebarOpen && 'justify-center'
              }`}
            title={!sidebarOpen ? 'Logout' : ''}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-20'}`}>
        {/* Header */}
        <header className="bg-white shadow sticky top-0 z-30">
          <div className="px-6 py-4 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            <div className="text-sm text-gray-600">
              Welcome, <span className="font-semibold">{user?.email}</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">

          <Outlet />
        </main>
      </div>
    </div>
  )
}
