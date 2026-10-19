import { cn } from '@/utils/cn'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { EmptyState, ErrorState } from '@/components/feedback/EmptyState'
import { SkeletonTable } from '@/components/feedback/LoadingSkeleton'

export interface Column<T> {
  key: string
  header: string
  render?: (row: T) => React.ReactNode
  sortable?: boolean
  width?: string
  align?: 'left' | 'center' | 'right'
  className?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyExtractor: (row: T) => string
  isLoading?: boolean
  isError?: boolean
  onRetry?: () => void
  emptyTitle?: string
  emptyDescription?: string
  emptyAction?: { label: string; onClick: () => void }
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  onSort?: (key: string) => void
  onRowClick?: (row: T) => void
  className?: string
  stickyHeader?: boolean
}

export function DataTable<T>({
  columns, data, keyExtractor, isLoading, isError, onRetry,
  emptyTitle = 'No records found', emptyDescription = 'Try adjusting your search or filters.',
  emptyAction, sortBy, sortOrder, onSort, onRowClick, className, stickyHeader,
}: DataTableProps<T>) {
  if (isLoading) return <SkeletonTable rows={6} cols={columns.length} />
  if (isError) return <ErrorState onRetry={onRetry} />

  return (
    <div className={cn('bg-white rounded-xl border border-slate-200 overflow-hidden', className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className={cn('bg-slate-50 border-b border-slate-200', stickyHeader && 'sticky top-0 z-10')}>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  style={col.width ? { width: col.width } : undefined}
                  className={cn(
                    'px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap',
                    col.align === 'center' && 'text-center',
                    col.align === 'right'  && 'text-right',
                    col.sortable && 'cursor-pointer select-none hover:text-slate-700',
                    col.className
                  )}
                  onClick={col.sortable && onSort ? () => onSort(col.key) : undefined}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {col.sortable && onSort && (
                      <span className="text-slate-300">
                        {sortBy === col.key ? (
                          sortOrder === 'asc' ? <ChevronUp className="w-3 h-3 text-primary-500" /> : <ChevronDown className="w-3 h-3 text-primary-500" />
                        ) : (
                          <ChevronsUpDown className="w-3 h-3" />
                        )}
                      </span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  <EmptyState
                    title={emptyTitle}
                    description={emptyDescription}
                    action={emptyAction}
                  />
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr
                  key={keyExtractor(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(
                    'hover:bg-slate-50 transition-colors',
                    onRowClick && 'cursor-pointer'
                  )}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        'px-4 py-3 text-slate-700 whitespace-nowrap',
                        col.align === 'center' && 'text-center',
                        col.align === 'right'  && 'text-right',
                        col.className
                      )}
                    >
                      {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

interface PaginationProps {
  page: number
  totalPages: number
  total: number
  pageSize: number
  onPage: (page: number) => void
  onPageSize?: (size: number) => void
}

export function Pagination({ page, totalPages, total, pageSize, onPage, onPageSize }: PaginationProps) {
  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-white rounded-b-xl">
      <div className="flex items-center gap-3">
        <p className="text-sm text-slate-500">
          {total === 0 ? 'No results' : `Showing ${start}–${end} of ${total}`}
        </p>
        {onPageSize && (
          <select
            value={pageSize}
            onChange={(e) => onPageSize(Number(e.target.value))}
            className="text-sm border border-slate-200 rounded-lg px-2 py-1 text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
            aria-label="Rows per page"
          >
            {[10, 20, 50, 100].map((s) => (
              <option key={s} value={s}>{s} per page</option>
            ))}
          </select>
        )}
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="xs" disabled={page <= 1} onClick={() => onPage(1)}>«</Button>
        <Button variant="ghost" size="xs" disabled={page <= 1} onClick={() => onPage(page - 1)}>‹</Button>
        <span className="text-sm text-slate-600 px-2">
          Page {page} of {Math.max(1, totalPages)}
        </span>
        <Button variant="ghost" size="xs" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>›</Button>
        <Button variant="ghost" size="xs" disabled={page >= totalPages} onClick={() => onPage(totalPages)}>»</Button>
      </div>
    </div>
  )
}
