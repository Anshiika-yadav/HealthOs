import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { inventoryService } from '@/services/inventory.service'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { SkeletonCard } from '@/components/feedback/LoadingSkeleton'
import { ErrorState } from '@/components/feedback/EmptyState'
import { DataTable, type Column } from '@/components/tables/DataTable'
import { formatDate, formatDateTime } from '@/utils/format'
import { Edit2, Plus, ArrowRightLeft } from 'lucide-react'
import type { InventoryBatch, StockMovement } from '@/types'

export function InventoryItemDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: item, isLoading, isError, refetch } = useQuery({
    queryKey: ['inventory-item', id],
    queryFn: () => inventoryService.getItem(id!),
    enabled: !!id,
  })

  const { data: movements } = useQuery({
    queryKey: ['stock-movements', { itemId: id }],
    queryFn: () => inventoryService.listMovements({ itemId: id, pageSize: 20 }),
    enabled: !!id,
  })

  if (isLoading) return <SkeletonCard lines={8} />
  if (isError || !item) return <ErrorState onRetry={refetch} />

  const stockStatus =
    item.stockOnHand === 0 ? 'danger' :
    item.stockOnHand <= item.reorderLevel ? 'warning' : 'success'

  const batchCols: Column<InventoryBatch>[] = [
    { key: 'batchNumber', header: 'Batch #', render: (r) => <span className="font-mono text-sm">{r.batchNumber}</span> },
    { key: 'quantity', header: 'Qty', align: 'right', render: (r) => <span className="font-semibold">{r.quantity}</span> },
    { key: 'expiryDate', header: 'Expiry', render: (r) => r.expiryDate ? formatDate(r.expiryDate) : '—' },
    { key: 'receivedDate', header: 'Received', render: (r) => formatDate(r.receivedDate) },
    { key: 'supplierName', header: 'Supplier', render: (r) => r.supplierName ?? '—' },
  ]

  const movementCols: Column<StockMovement>[] = [
    {
      key: 'type',
      header: 'Type',
      render: (r) => (
        <Badge variant={
          r.type === 'receive' ? 'success' :
          r.type === 'transfer' ? 'primary' :
          r.type === 'wastage' ? 'danger' : 'default'
        }>
          {r.type}
        </Badge>
      ),
    },
    { key: 'quantity', header: 'Qty', align: 'right', render: (r) => <span className="font-semibold">{r.quantity}</span> },
    { key: 'batchNumber', header: 'Batch', render: (r) => r.batchNumber ?? '—' },
    { key: 'reason', header: 'Reason', render: (r) => <span className="text-slate-500 text-xs">{r.reason ?? '—'}</span> },
    { key: 'performedByName', header: 'By' },
    { key: 'createdAt', header: 'Date', render: (r) => <span className="text-slate-400 text-xs">{formatDateTime(r.createdAt)}</span> },
  ]

  return (
    <div className="space-y-5 max-w-4xl">
      <PageHeader
        title={item.name}
        description={`SKU: ${item.sku}`}
        backHref="/inventory/items"
        breadcrumbs={[{ label: 'Inventory', href: '/inventory' }, { label: 'Items', href: '/inventory/items' }, { label: item.name }]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" leftIcon={<Edit2 className="w-4 h-4" />}
              onClick={() => navigate(`/inventory/items/${id}/edit`)}>
              Edit
            </Button>
            <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => navigate(`/inventory/movements/new?type=receive&itemId=${id}`)}>
              Receive Stock
            </Button>
            <Button variant="outline" size="sm" leftIcon={<ArrowRightLeft className="w-4 h-4" />}
              onClick={() => navigate(`/inventory/movements/new?type=adjustment&itemId=${id}`)}>
              Adjust
            </Button>
          </div>
        }
      />

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500">Stock on Hand</p>
          <p className={`text-2xl font-bold mt-1 ${stockStatus === 'danger' ? 'text-danger-600' : stockStatus === 'warning' ? 'text-warning-600' : 'text-success-700'}`}>
            {item.stockOnHand}
          </p>
          <p className="text-xs text-slate-400">{item.unit}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500">Reorder Level</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{item.reorderLevel}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500">Category</p>
          <p className="text-sm font-semibold text-slate-900 mt-1 capitalize">{item.category}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500">Status</p>
          <Badge
            variant={stockStatus}
            dot
            className="mt-2"
          >
            {item.stockOnHand === 0 ? 'Out of Stock' : item.stockOnHand <= item.reorderLevel ? 'Low Stock' : 'In Stock'}
          </Badge>
        </div>
      </div>

      {/* Details */}
      <Card>
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Item Details</h3>
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          {[
            { label: 'SKU', value: item.sku },
            { label: 'Category', value: item.category },
            { label: 'Unit', value: item.unit },
            { label: 'Location', value: item.location ?? '—' },
            { label: 'Expiry', value: item.expiryDate ? formatDate(item.expiryDate) : '—' },
            { label: 'Active', value: item.isActive ? 'Yes' : 'No' },
          ].map((d) => (
            <div key={d.label}>
              <dt className="text-xs text-slate-400">{d.label}</dt>
              <dd className="font-medium text-slate-900 mt-0.5">{d.value}</dd>
            </div>
          ))}
        </dl>
      </Card>

      {/* Batches */}
      {item.batches && item.batches.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-900 mb-2">Batches</h3>
          <DataTable
            columns={batchCols}
            data={item.batches}
            keyExtractor={(r) => r.id}
            emptyTitle="No batches"
          />
        </div>
      )}

      {/* Movement history */}
      <div>
        <h3 className="text-sm font-semibold text-slate-900 mb-2">Stock Movement History</h3>
        <DataTable
          columns={movementCols}
          data={movements?.data ?? []}
          keyExtractor={(r) => r.id}
          emptyTitle="No movements recorded"
          emptyDescription="Stock movements will appear here after receives, transfers, or adjustments."
        />
      </div>
    </div>
  )
}
