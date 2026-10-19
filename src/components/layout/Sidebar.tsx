import { NavLink, useLocation } from 'react-router-dom'
import { cn } from '@/utils/cn'
import { useAuth } from '@/features/auth/AuthContext'
import type { UserRole } from '@/types'
import {
  LayoutDashboard, Building2, CreditCard, Key, Users, FileText, BarChart3, Settings,
  UserRound, CalendarDays, Stethoscope, Receipt, Package, FlaskConical, ClipboardList,
  ShoppingCart, Truck, Activity, Bell, ChevronLeft, ChevronRight, Heart,
} from 'lucide-react'

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  roles: UserRole[]
  children?: NavItem[]
}

const allNavItems: NavItem[] = [
  // Platform Admin
  { label: 'Dashboard',     href: '/admin/dashboard',      icon: <LayoutDashboard className="w-4 h-4" />, roles: ['super_admin'] },
  { label: 'Hospitals',     href: '/admin/tenants',         icon: <Building2 className="w-4 h-4" />,       roles: ['super_admin'] },
  { label: 'Subscriptions', href: '/admin/subscriptions',  icon: <CreditCard className="w-4 h-4" />,      roles: ['super_admin'] },
  { label: 'Licenses',      href: '/admin/licenses',        icon: <Key className="w-4 h-4" />,             roles: ['super_admin'] },
  { label: 'Users',         href: '/admin/users',           icon: <Users className="w-4 h-4" />,           roles: ['super_admin'] },
  { label: 'Audit Logs',    href: '/admin/audit',           icon: <FileText className="w-4 h-4" />,        roles: ['super_admin'] },
  { label: 'Reports',       href: '/admin/reports',         icon: <BarChart3 className="w-4 h-4" />,       roles: ['super_admin'] },
  { label: 'Settings',      href: '/admin/settings',        icon: <Settings className="w-4 h-4" />,        roles: ['super_admin'] },

  // Hospital Admin / Owner
  { label: 'Dashboard',     href: '/dashboard',             icon: <LayoutDashboard className="w-4 h-4" />, roles: ['hospital_owner', 'hospital_admin'] },
  { label: 'Patients',      href: '/patients',              icon: <UserRound className="w-4 h-4" />,       roles: ['hospital_owner', 'hospital_admin', 'receptionist', 'doctor', 'nurse'] },
  { label: 'Appointments',  href: '/appointments',          icon: <CalendarDays className="w-4 h-4" />,    roles: ['hospital_owner', 'hospital_admin', 'receptionist', 'doctor', 'nurse'] },
  { label: 'Queue',         href: '/queue',                 icon: <Activity className="w-4 h-4" />,        roles: ['receptionist', 'hospital_admin'] },
  { label: 'Encounters',    href: '/encounters',            icon: <Stethoscope className="w-4 h-4" />,     roles: ['hospital_owner', 'hospital_admin', 'doctor', 'nurse'] },
  { label: 'Prescriptions', href: '/prescriptions',         icon: <ClipboardList className="w-4 h-4" />,  roles: ['hospital_owner', 'hospital_admin', 'doctor', 'nurse', 'pharmacist'] },
  { label: 'Billing',       href: '/billing',               icon: <Receipt className="w-4 h-4" />,         roles: ['hospital_owner', 'hospital_admin', 'cashier'] },
  { label: 'Pharmacy',      href: '/pharmacy',              icon: <Package className="w-4 h-4" />,         roles: ['hospital_owner', 'hospital_admin', 'pharmacist'] },
  { label: 'Laboratory',    href: '/laboratory',            icon: <FlaskConical className="w-4 h-4" />,    roles: ['hospital_owner', 'hospital_admin', 'lab_technician', 'doctor', 'nurse'] },
  { label: 'Inventory',     href: '/inventory',             icon: <ShoppingCart className="w-4 h-4" />,   roles: ['hospital_owner', 'hospital_admin', 'inventory_officer'] },
  { label: 'Suppliers',     href: '/inventory/suppliers',   icon: <Truck className="w-4 h-4" />,          roles: ['hospital_owner', 'hospital_admin', 'inventory_officer'] },
  { label: 'Reports',       href: '/reports',               icon: <BarChart3 className="w-4 h-4" />,      roles: ['hospital_owner', 'hospital_admin', 'cashier', 'auditor'] },
  { label: 'Audit Logs',    href: '/audit',                 icon: <FileText className="w-4 h-4" />,       roles: ['hospital_admin', 'auditor'] },
  { label: 'Settings',      href: '/settings',              icon: <Settings className="w-4 h-4" />,       roles: ['hospital_owner', 'hospital_admin'] },

  // Receptionist specific
  { label: 'Dashboard',     href: '/dashboard',             icon: <LayoutDashboard className="w-4 h-4" />, roles: ['receptionist'] },
  // Cashier
  { label: 'Dashboard',     href: '/dashboard',             icon: <LayoutDashboard className="w-4 h-4" />, roles: ['cashier'] },
  { label: 'Invoices',      href: '/billing/invoices',      icon: <Receipt className="w-4 h-4" />,         roles: ['cashier'] },
  { label: 'Payments',      href: '/billing/payments',      icon: <CreditCard className="w-4 h-4" />,      roles: ['cashier'] },
  // Lab tech specific
  { label: 'Dashboard',     href: '/dashboard',             icon: <LayoutDashboard className="w-4 h-4" />, roles: ['lab_technician'] },
  { label: 'Lab Worklist',  href: '/laboratory',            icon: <FlaskConical className="w-4 h-4" />,    roles: ['lab_technician'] },
  // Inventory officer
  { label: 'Dashboard',     href: '/dashboard',             icon: <LayoutDashboard className="w-4 h-4" />, roles: ['inventory_officer'] },
  { label: 'Items',         href: '/inventory',             icon: <Package className="w-4 h-4" />,         roles: ['inventory_officer'] },
  { label: 'PO',            href: '/inventory/purchase-orders', icon: <ShoppingCart className="w-4 h-4" />, roles: ['inventory_officer'] },
  // Notifications (all)
  { label: 'Notifications', href: '/notifications',         icon: <Bell className="w-4 h-4" />,            roles: ['super_admin', 'hospital_owner', 'hospital_admin', 'receptionist', 'doctor', 'nurse', 'cashier', 'pharmacist', 'lab_technician', 'inventory_officer', 'auditor'] },
]

// Deduplicated by href + role combination
function getNavForRole(role: UserRole): NavItem[] {
  const seen = new Set<string>()
  return allNavItems.filter((item) => {
    if (!item.roles.includes(role)) return false
    if (seen.has(item.href)) return false
    seen.add(item.href)
    return true
  })
}

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { user } = useAuth()
  const location = useLocation()

  if (!user) return null

  const navItems = getNavForRole(user.role)

  return (
    <aside
      className={cn(
        'fixed top-0 left-0 h-full z-30 bg-slate-900 text-slate-100 flex flex-col',
        'transition-all duration-300 ease-in-out',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-slate-800 flex-shrink-0">
        <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center flex-shrink-0">
          <Heart className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="font-bold text-white text-sm leading-tight">HealthOS</p>
            <p className="text-xs text-slate-400 truncate">
              {user.tenantName ?? 'Platform Admin'}
            </p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5" aria-label="Main navigation">
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            end={item.href === '/dashboard' || item.href.endsWith('/dashboard')}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors group',
                isActive
                  ? 'bg-primary-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white',
                collapsed && 'justify-center px-2'
              )
            }
            title={collapsed ? item.label : undefined}
          >
            <span className="flex-shrink-0">{item.icon}</span>
            {!collapsed && <span className="truncate">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Collapse toggle */}
      <div className="p-3 border-t border-slate-800 flex-shrink-0">
        <button
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors w-full text-sm',
            collapsed && 'justify-center'
          )}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
