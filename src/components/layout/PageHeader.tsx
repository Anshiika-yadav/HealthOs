import { useNavigate } from 'react-router-dom'
import { ChevronRight, ArrowLeft, Home } from 'lucide-react'
import { cn } from '@/utils/cn'

interface Breadcrumb {
  label: string
  href?: string
}

interface PageHeaderProps {
  title: string
  description?: string
  breadcrumbs?: Breadcrumb[]
  actions?: React.ReactNode
  backHref?: string
  className?: string
}

export function PageHeader({ title, description, breadcrumbs, actions, backHref, className }: PageHeaderProps) {
  const navigate = useNavigate()

  return (
    <div className={cn('mb-6', className)}>
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500 mb-2">
          <Home className="w-3 h-3" />
          {breadcrumbs.map((b, i) => (
            <span key={i} className="flex items-center gap-1.5">
              <ChevronRight className="w-3 h-3" />
              {b.href ? (
                <a href={b.href} className="hover:text-primary-600 transition-colors">{b.label}</a>
              ) : (
                <span className="text-slate-700 font-medium">{b.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          {backHref && (
            <button
              onClick={() => navigate(backHref)}
              aria-label="Go back"
              className="mt-0.5 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors flex-shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <h1 className="text-xl font-bold text-slate-900">{title}</h1>
            {description && <p className="text-sm text-slate-500 mt-0.5">{description}</p>}
          </div>
        </div>
        {actions && (
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}
