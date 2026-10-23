import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Truck } from 'lucide-react'
import { inventoryService } from '@/services/inventory.service'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable, Pagination, type Column } from '@/components/tables/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { formatDate } from '@/utils/format'
import type { Supplier } from '@/types'

interface SupplierForm {
  name: string; contactName: string; email: string; phone: string
  address: string; city: string; country: string
}

const EMPTY_FORM: SupplierForm = {
  name: '', contactName: '', email: '', phone: '', address: '', city: '', country: '',
}

export function SupplierList() {
  const { toast } = useToast()
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Supplier | null>(null)
  const [form, setForm] = useState<SupplierForm>(EMPTY_FORM)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['suppliers', { page, search }],
    queryFn: () => inventoryService.listSuppliers({ page, pageSize: 20, search }),
    staleTime: 30_000,
  })

  const createMutation = useMutation({
    mutationFn: () => inventoryService.createSupplier({ ...form, isActive: true }),
    onSuccess: () => {
      toast('success', 'Supplier added')
      qc.invalidateQueries({ queryKey: ['suppliers'] })
      setShowModal(false)
      setForm(EMPTY_FORM)
    },
    onError: () => toast('error', 'Failed to add supplier'),
  })

  const updateMutation = useMutation({
    mutationFn: () => inventoryService.updateSupplier(editing!.id, form),
    onSuccess: () => {
      toast('success', 'Supplier updated')
      qc.invalidateQueries({ queryKey: ['suppliers'] })
      setShowModal(false)
      setEditing(null)
    },
    onError: () => toast('error', 'Failed to update supplier'),
  })

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setShowModal(true) }
  const openEdit = (s: Supplier) => {
    setEditing(s)
    setForm({ name: s.name, contactName: s.contactName ?? '', email: s.email ?? '', phone: s.phone ?? '', address: s.address ?? '', city: s.city ?? '', country: s.country ?? '' })
    setShowModal(true)
  }

  const f = (key: keyof SupplierForm) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: e.target.value }),
  })

  const columns: Column<Supplier>[] = [
    {
      key: 'name',
      header: 'Supplier',
      render: (r) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
            <Truck className="w-4 h-4 text-slate-500" />
          </div>
          <div>
            <p className="font-medium text-slate-900">{r.name}</p>
            {r.contactName && <p className="text-xs text-slate-500">{r.contactName}</p>}
          </div>
        </div>
      ),
    },
    { key: 'email', header: 'Email', render: (r) => r.email ?? '—' },
    { key: 'phone', header: 'Phone', render: (r) => r.phone ?? '—' },
    { key: 'city', header: 'Location', render: (r) => [r.city, r.country].filter(Boolean).join(', ') || '—' },
    {
      key: 'isActive',
      header: 'Status',
      render: (r) => <Badge variant={r.isActive ? 'success' : 'default'} dot>{r.isActive ? 'Active' : 'Inactive'}</Badge>,
    },
    { key: 'createdAt', header: 'Added', render: (r) => <span className="text-slate-500 text-xs">{formatDate(r.createdAt)}</span> },
    {
      key: 'actions', header: '',
      render: (r) => (
        <Button variant="ghost" size="xs" onClick={(e) => { e.stopPropagation(); openEdit(r) }}>Edit</Button>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <PageHeader
        title="Suppliers"
        description="Manage suppliers for inventory and purchase orders."
        breadcrumbs={[{ label: 'Inventory', href: '/inventory' }, { label: 'Suppliers' }]}
        actions={
          <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={openCreate}>
            Add Supplier
          </Button>
        }
      />

      <Input
        placeholder="Search suppliers..."
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1) }}
        className="w-64"
        leftElement={<Search className="w-4 h-4" />}
      />

      <div>
        <DataTable
          columns={columns}
          data={data?.data ?? []}
          keyExtractor={(r) => r.id}
          isLoading={isLoading}
          isError={isError}
          onRetry={refetch}
          emptyTitle="No suppliers found"
          emptyAction={{ label: 'Add Supplier', onClick: openCreate }}
        />
        {data && <Pagination page={page} totalPages={data.totalPages} total={data.total} pageSize={20} onPage={setPage} />}
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'Edit Supplier' : 'Add Supplier'}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button
              variant="primary"
              loading={createMutation.isPending || updateMutation.isPending}
              onClick={() => editing ? updateMutation.mutate() : createMutation.mutate()}
            >
              {editing ? 'Save Changes' : 'Add Supplier'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input label="Supplier Name" required {...f('name')} />
          <Input label="Contact Person" {...f('contactName')} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Email" type="email" {...f('email')} />
            <Input label="Phone" type="tel" {...f('phone')} />
          </div>
          <Input label="Address" {...f('address')} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="City" {...f('city')} />
            <Input label="Country" {...f('country')} />
          </div>
        </div>
      </Modal>
    </div>
  )
}
