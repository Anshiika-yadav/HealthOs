import { cn } from '@/utils/cn'

type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'outline'
type BadgeSize = 'sm' | 'md'

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  size?: BadgeSize
  className?: string
  dot?: boolean
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-slate-100 text-slate-700',
  primary: 'bg-primary-100 text-primary-700',
  success: 'bg-success-100 text-success-700',
  warning: 'bg-warning-100 text-warning-700',
  danger:  'bg-danger-100 text-danger-700',
  info:    'bg-blue-100 text-blue-700',
  outline: 'bg-white border border-slate-300 text-slate-600',
}

const dotColors: Record<BadgeVariant, string> = {
  default: 'bg-slate-400',
  primary: 'bg-primary-500',
  success: 'bg-success-500',
  warning: 'bg-warning-500',
  danger:  'bg-danger-500',
  info:    'bg-blue-500',
  outline: 'bg-slate-400',
}

export function Badge({ children, variant = 'default', size = 'md', className, dot }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-medium rounded-full',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs',
        variantClasses[variant],
        className
      )}
    >
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', dotColors[variant])} />}
      {children}
    </span>
  )
}

// Convenience helpers
export function statusBadge(status: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    active: 'success', activated: 'success', completed: 'success', paid: 'success',
    released: 'success', verified: 'success', dispensed: 'success', received: 'success',
    inactive: 'default', cancelled: 'default', revoked: 'default', deceased: 'default',
    draft: 'outline', pending: 'warning', trial: 'info', scheduled: 'primary',
    suspended: 'danger', expired: 'danger', overdue: 'danger', refused: 'danger',
    'in_progress': 'primary', 'partially_paid': 'warning', 'partially_dispensed': 'warning',
    'no_show': 'danger', 'grace_period': 'warning', 'low_stock': 'warning', 'out_of_stock': 'danger',
  }
  return map[status.toLowerCase()] ?? 'default'
}
