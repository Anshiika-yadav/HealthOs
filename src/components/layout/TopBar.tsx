import { useState, useRef, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Bell, Search, ChevronDown, LogOut, User, Settings, Menu } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import { getInitials } from '@/utils/format'
import { cn } from '@/utils/cn'
import { useQuery } from '@tanstack/react-query'
import { notificationService } from '@/services/notification.service'

interface TopBarProps {
  onMobileMenuToggle: () => void
  sidebarCollapsed: boolean
}

export function TopBar({ onMobileMenuToggle, sidebarCollapsed }: TopBarProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  const { data: unreadData } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationService.getUnreadCount(),
    refetchInterval: 60_000,
    retry: false,
  })

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const unreadCount = unreadData?.count ?? 0

  return (
    <header className={cn(
      'fixed top-0 right-0 z-20 h-16 bg-white border-b border-slate-200',
      'flex items-center px-4 gap-4',
      'transition-all duration-300',
      sidebarCollapsed ? 'left-16' : 'left-60'
    )}>
      {/* Mobile menu toggle */}
      <button
        onClick={onMobileMenuToggle}
        aria-label="Toggle menu"
        className="lg:hidden text-slate-500 hover:text-slate-700"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Search */}
      <div className="flex-1 max-w-sm hidden sm:flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2 border border-slate-200 focus-within:border-primary-400 focus-within:ring-2 focus-within:ring-primary-100">
        <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
        <input
          type="search"
          placeholder="Search patients, records..."
          aria-label="Global search"
          className="flex-1 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
        />
      </div>

      <div className="flex items-center gap-2 ml-auto">
        {/* Notifications */}
        <Link
          to={user?.role === 'super_admin' ? '/admin/notifications' : '/notifications'}
          aria-label={`${unreadCount} unread notifications`}
          className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger-500 rounded-full" />
          )}
        </Link>

        {/* Profile menu */}
        <div ref={profileRef} className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            aria-expanded={profileOpen}
            aria-haspopup="menu"
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-xs font-semibold">
              {user ? getInitials(user.name) : '?'}
            </div>
            <div className="hidden sm:block text-left min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate max-w-[120px]">{user?.name}</p>
              <p className="text-xs text-slate-500 capitalize">{user?.role.replace(/_/g, ' ')}</p>
            </div>
            <ChevronDown className={cn('w-4 h-4 text-slate-400 hidden sm:block transition-transform', profileOpen && 'rotate-180')} />
          </button>

          {profileOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-dropdown border border-slate-200 py-1 z-50"
            >
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-sm font-semibold text-slate-900 truncate">{user?.name}</p>
                <p className="text-xs text-slate-500 truncate">{user?.email}</p>
              </div>
              <Link
                to="/profile"
                role="menuitem"
                onClick={() => setProfileOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
              >
                <User className="w-4 h-4" />
                My Profile
              </Link>
              {(user?.role === 'hospital_admin' || user?.role === 'hospital_owner') && (
                <Link
                  to="/settings"
                  role="menuitem"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </Link>
              )}
              <div className="border-t border-slate-100 mt-1">
                <button
                  role="menuitem"
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-danger-600 hover:bg-danger-50 w-full text-left"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
