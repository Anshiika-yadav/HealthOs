import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Package, AlertTriangle, TrendingDown, ShoppingCart, Plus } from 'lucide-react'
import { inventoryService } from '@/services/inventory.service'
import { PageHeader } from '@/components/layout/PageHeader'
import { MetricCard } from '@/components/ui/Card'
import { SkeletonMetrics, SkeletonTable } from '@/components/feedback/LoadingSkeleton'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { formatDate } from '@/utils/format'
import type { InventoryItem } from '@/types'

export function InventoryDashboard() {
  const navigate = useNavigate()

  const { data: stats } = useQuery({
    queryKey: ['inventory', 'stats'],
    queryFn: () => inventoryService.getDashboardStats(),
    staleTime: 60_000,
    retry: false,
  })

  const { data: lowStock, isLoading } = useQuery({
    queryKey: ['inventory', 'items', 'low-stock'],
    queryFn: () => inventoryService.listItems({ lowStock: true, pageSize: 20 }),
    staleTime: 60_000,
  })

  const s = stats as Record<string, number> ?? {}

  return (
    <div className="space-y-5">
      <PageHeader
        title="Inventory"
        description="Track stock, movements, and purchase orders."
        breadcrumbs={[{ label: 'Inventory' }]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/inventory/items')}>View All Items</Button>
            <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => navigate('/inventory/purchase-orders/new')}>
              New PO
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricCard title="Total Items" value={s.totalItems ?? 0} icon={<Package className="w-5 h-5" />} variant="default" />
        <MetricCard title="Low Stock" value={s.lowStock ?? 0} icon={<TrendingDown className="w-5 h-5" />} variant="warning" />
        <MetricCard title="Out of Stock" value={s.outOfStock ?? 0} icon={<AlertTriangle className="w-5 h-5" />} variant="danger" />
        <MetricCard title="Pending POs" value={s.pendingPOs ?? 0} icon={<ShoppingCart className="w-5 h-5" />} variant="primary" />
      </div>

      {/* Low stock alert */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-warning-500" /> Low Stock Alerts
          </h3>
          <Button variant="ghost" size="xs" onClick={() => navigate('/inventory/items?filter=low_stock')}>View all</Button>
        </div>
        {isLoading ? <SkeletonTable rows={4} cols={4} /> : (
          <div className="divide-y divide-slate-100">
            {(lowStock?.data ?? []).slice(0, 8).map((item: InventoryItem) => (
              <div key={item.id} className="flex items-center gap-4 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{item.name}</p>
                  <p className="text-xs text-slate-500">{item.sku} · {item.category}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-danger-600">{item.stockOnHand} {item.unit}</p>
                    <p className="text-xs text-slate-400">Reorder: {item.reorderLevel}</p>
                  </div>
                  <Badge variant={item.stockOnHand === 0 ? 'danger' : 'warning'} size="sm">
                    {item.stockOnHand === 0 ? 'Out of Stock' : 'Low'}
                  </Badge>
                  {item.expiryDate && (
                    <span className="text-xs text-slate-400">Exp: {formatDate(item.expiryDate)}</span>
                  )}
                </div>
              </div>
            ))}
            {(lowStock?.data.length ?? 0) === 0 && (
              <div className="px-5 py-8 text-center text-sm text-slate-400">No low stock alerts 🎉</div>
            )}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Receive Stock',   href: '/inventory/movements/new?type=receive',  color: 'bg-success-50 border-success-200 text-success-700' },
          { label: 'Transfer Stock',  href: '/inventory/movements/new?type=transfer', color: 'bg-primary-50 border-primary-200 text-primary-700' },
          { label: 'Stock Count',     href: '/inventory/movements/new?type=count',    color: 'bg-warning-50 border-warning-200 text-warning-700' },
          { label: 'View Suppliers',  href: '/inventory/suppliers',                   color: 'bg-slate-50 border-slate-200 text-slate-700' },
        ].map((a) => (
          <button
            key={a.href}
            onClick={() => navigate(a.href)}
            className={`rounded-xl border p-4 text-sm font-medium text-left hover:shadow-card-hover transition-shadow ${a.color}`}
          >
            {a.label}
          </button>
        ))}
      </div>
    </div>
  )
}
