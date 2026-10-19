import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Package } from 'lucide-react'
import { inventoryService } from '@/services/inventory.service'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable, Pagination, type Column } from '@/components/tables/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { formatDate } from '@/utils/format'
import type { InventoryItem } from '@/types'

export function InventoryItemList() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['inventory-items', { page, search, category: categoryFilter }],
    queryFn: () => inventoryService.listItems({ page, pageSize: 20, search, category: categoryFilter || undefined }),
    staleTime: 30_000,
  })

  const columns: Column<InventoryItem>[] = [
    {
      key: 'name',
      header: 'Item',
      render: (row) => (
        <div>
          <p className="font-medium text-slate-900">{row.name}</p>
          <p className="text-xs text-slate-500">{row.sku}</p>
        </div>
      ),
    },
    { key: 'category', header: 'Category', render: (row) => <Badge variant="outline">{row.category}</Badge> },
    { key: 'unit', header: 'Unit' },
    {
      key: 'stockOnHand',
      header: 'In Stock',
      align: 'right',
      render: (row) => (
        <span className={`font-semibold ${row.stockOnHand === 0 ? 'text-danger-600' : row.stockOnHand <= row.reorderLevel ? 'text-warning-600' : 'text-slate-900'}`}>
          {row.stockOnHand}
        </span>
      ),
    },
    { key: 'reorderLevel', header: 'Reorder At', align: 'right' },
    { key: 'location', header: 'Location', render: (row) => row.location ?? '—' },
    {
      key: 'expiryDate',
      header: 'Expiry',
      render: (row) => row.expiryDate ? <span className="text-slate-500">{formatDate(row.expiryDate)}</span> : <span className="text-slate-400">—</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => {
        const s = row.stockOnHand === 0 ? 'Out of Stock' : row.stockOnHand <= row.reorderLevel ? 'Low Stock' : 'In Stock'
        const v = row.stockOnHand === 0 ? 'danger' : row.stockOnHand <= row.reorderLevel ? 'warning' : 'success'
        return <Badge variant={v as 'danger' | 'warning' | 'success'} dot>{s}</Badge>
      },
    },
  ]

  return (
    <div className="space-y-4">
      <PageHeader
        title="Inventory items"
        description="Manage stock, batches, and expiry dates."
        breadcrumbs={[{ label: 'Inventory' }, { label: 'Items' }]}
        actions={
          <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => navigate('/inventory/items/new')}>
            Add Item
          </Button>
        }
      />

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search items..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="w-64"
          leftElement={<Search className="w-4 h-4" />}
        />
        <Select
          options={[
            { value: '', label: 'All categories' },
            { value: 'medicine', label: 'Medicine' },
            { value: 'consumable', label: 'Consumable' },
            { value: 'equipment', label: 'Equipment' },
          ]}
          value={categoryFilter}
          onChange={(e) => { setCategoryFilter(e.target.value); setPage(1) }}
          className="w-40"
          placeholder="Category"
        />
      </div>

      <div>
        <DataTable
          columns={columns}
          data={data?.data ?? []}
          keyExtractor={(r) => r.id}
          isLoading={isLoading}
          isError={isError}
          onRetry={refetch}
          onRowClick={(r) => navigate(`/inventory/items/${r.id}`)}
          emptyTitle="No items found"
          emptyAction={{ label: 'Add Item', onClick: () => navigate('/inventory/items/new') }}
        />
        {data && <Pagination page={page} totalPages={data.totalPages} total={data.total} pageSize={20} onPage={setPage} />}
      </div>
    </div>
  )
}
