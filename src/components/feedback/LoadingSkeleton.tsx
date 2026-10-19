import { cn } from '@/utils/cn'

interface SkeletonProps {
  className?: string
  lines?: number
  height?: string
}

export function Skeleton({ className, height = 'h-4' }: SkeletonProps) {
  return (
    <div className={cn('animate-pulse bg-slate-200 rounded', height, className)} />
  )
}

export function SkeletonCard({ lines = 3 }: SkeletonProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
      <Skeleton height="h-5" className="w-1/3" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} height="h-4" className={i === lines - 1 ? 'w-2/3' : 'w-full'} />
      ))}
    </div>
  )
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="border-b border-slate-100 p-4">
        <Skeleton height="h-5" className="w-1/4" />
      </div>
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, ri) => (
          <div key={ri} className="flex gap-4 px-4 py-3">
            {Array.from({ length: cols }).map((_, ci) => (
              <Skeleton key={ci} height="h-4" className="flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export function SkeletonMetrics({ count = 4 }: { count?: number }) {
  return (
    <div className={`grid grid-cols-2 lg:grid-cols-${count} gap-4`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
          <Skeleton height="h-4" className="w-1/2" />
          <Skeleton height="h-8" className="w-1/3" />
          <Skeleton height="h-3" className="w-2/3" />
        </div>
      ))}
    </div>
  )
}
