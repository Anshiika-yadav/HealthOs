import { cn } from '@/utils/cn'

interface CardProps {
  children: React.ReactNode
  className?: string
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

export function Card({ children, className, padding = 'md' }: CardProps) {
  const padClasses = { none: '', sm: 'p-4', md: 'p-5', lg: 'p-6' }
  return (
    <div className={cn('bg-white rounded-xl shadow-card border border-slate-200', padClasses[padding], className)}>
      {children}
    </div>
  )
}

interface CardHeaderProps {
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function CardHeader({ title, description, action, className }: CardHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between gap-4 mb-4', className)}>
      <div>
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        {description && <p className="text-sm text-slate-500 mt-0.5">{description}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  )
}

interface MetricCardProps {
  title: string
  value: string | number
  description?: string
  icon?: React.ReactNode
  trend?: { value: number; label: string }
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger'
  className?: string
}

const metricVariants: Record<string, string> = {
  default: 'bg-white',
  primary: 'bg-primary-50 border-primary-200',
  success: 'bg-success-50 border-success-200',
  warning: 'bg-warning-50 border-warning-200',
  danger:  'bg-danger-50 border-danger-200',
}

const iconVariants: Record<string, string> = {
  default: 'bg-slate-100 text-slate-600',
  primary: 'bg-primary-100 text-primary-600',
  success: 'bg-success-100 text-success-600',
  warning: 'bg-warning-100 text-warning-600',
  danger:  'bg-danger-100 text-danger-600',
}

export function MetricCard({ title, value, description, icon, trend, variant = 'default', className }: MetricCardProps) {
  return (
    <div className={cn(
      'rounded-xl border shadow-card p-5',
      metricVariants[variant],
      className
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-500 truncate">{title}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
          {description && <p className="text-xs text-slate-500 mt-1">{description}</p>}
          {trend && (
            <p className={cn('text-xs mt-1 font-medium', trend.value >= 0 ? 'text-success-600' : 'text-danger-600')}>
              {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
            </p>
          )}
        </div>
        {icon && (
          <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', iconVariants[variant])}>
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}
