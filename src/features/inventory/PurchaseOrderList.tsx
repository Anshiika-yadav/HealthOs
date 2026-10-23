import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { inventoryService } from '@/services/inventory.service'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable, Pagination, type Column } from '@/components/tables/DataTable'
import { Badge, statusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { formatDate, formatCurrency } from '@/utils/format'
import type { PurchaseOrder } from '@/types'

export function PurchaseOrderList() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['purchase-orders', { page, status: statusFilter }],
    queryFn: () => inventoryService.listPurchaseOrders({ page, pageSize: 20, status: statusFilter || undefined }),
    staleTime: 30_000,
  })

  const columns: Column<PurchaseOrder>[] = [
    {
      key: 'poNumber',
      header: 'PO #',
      render: (r) => <span className="font-mono font-semibold">{r.poNumber}</span>,
    },
    { key: 'supplierName', header: 'Supplier' },
    {
      key: 'items',
      header: 'Items',
      render: (r) => <span className="text-slate-600">{r.items.length} item{r.items.length !== 1 ? 's' : ''}</span>,
    },
    {
      key: 'totalAmount',
      header: 'Total',
      align: 'right',
      render: (r) => <span className="font-semibold">{formatCurrency(r.totalAmount, r.currency)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => <Badge variant={statusBadge(r.status)} dot>{r.status}</Badge>,
    },
    {
      key: 'expectedDelivery',
      header: 'Expected',
      render: (r) => r.expectedDelivery ? formatDate(r.expectedDelivery) : '—',
    },
    { key: 'createdAt', header: 'Created', render: (r) => <span className="text-slate-500">{formatDate(r.createdAt)}</span> },
    {
      key: 'actions', header: '',
      render: (r) => (
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="xs" onClick={() => navigate(`/inventory/purchase-orders/${r.id}`)}>View</Button>
          {r.status === 'sent' && (
            <Button variant="success" size="xs" onClick={() => navigate(`/inventory/purchase-orders/${r.id}`)}>Receive</Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <PageHeader
        title="Purchase Orders"
        description="Create and manage purchase orders."
        breadcrumbs={[{ label: 'Inventory', href: '/inventory' }, { label: 'Purchase Orders' }]}
        actions={
          <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => navigate('/inventory/purchase-orders/new')}>
            New PO
          </Button>
        }
      />

      <Select
        options={[
          { value: '', label: 'All statuses' },
          { value: 'draft', label: 'Draft' },
          { value: 'sent', label: 'Sent' },
          { value: 'partial', label: 'Partially Received' },
          { value: 'received', label: 'Received' },
          { value: 'cancelled', label: 'Cancelled' },
        ]}
        value={statusFilter}
        onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
        className="w-44"
        placeholder="Status"
      />

      <div>
        <DataTable
          columns={columns}
          data={data?.data ?? []}
          keyExtractor={(r) => r.id}
          isLoading={isLoading}
          isError={isError}
          onRetry={refetch}
          onRowClick={(r) => navigate(`/inventory/purchase-orders/${r.id}`)}
          emptyTitle="No purchase orders"
          emptyAction={{ label: 'Create PO', onClick: () => navigate('/inventory/purchase-orders/new') }}
        />
        {data && <Pagination page={page} totalPages={data.totalPages} total={data.total} pageSize={20} onPage={setPage} />}
      </div>
    </div>
  )
}
