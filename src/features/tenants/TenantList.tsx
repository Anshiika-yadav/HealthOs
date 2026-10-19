import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Filter, Building2, MoreVertical } from 'lucide-react'
import { tenantService } from '@/services/tenant.service'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable, Pagination, type Column } from '@/components/tables/DataTable'
import { Badge, statusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { ConfirmDialog } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { formatDate, formatRelative } from '@/utils/format'
import type { Tenant } from '@/types'

export function TenantList() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const qc = useQueryClient()

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [planFilter, setPlanFilter] = useState('')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [confirmAction, setConfirmAction] = useState<{ id: string; action: 'suspend' | 'activate'; name: string } | null>(null)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['tenants', { page, pageSize, search, status: statusFilter, plan: planFilter, sortBy, sortOrder }],
    queryFn: () => tenantService.list({ page, pageSize, search, status: statusFilter || undefined, plan: planFilter || undefined, sortBy, sortOrder }),
    staleTime: 30_000,
  })

  const suspendMutation = useMutation({
    mutationFn: (id: string) => tenantService.suspend(id),
    onSuccess: () => {
      toast('success', 'Tenant suspended')
      qc.invalidateQueries({ queryKey: ['tenants'] })
      setConfirmAction(null)
    },
    onError: () => toast('error', 'Failed to suspend tenant'),
  })

  const activateMutation = useMutation({
    mutationFn: (id: string) => tenantService.activate(id),
    onSuccess: () => {
      toast('success', 'Tenant activated')
      qc.invalidateQueries({ queryKey: ['tenants'] })
      setConfirmAction(null)
    },
    onError: () => toast('error', 'Failed to activate tenant'),
  })

  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(key)
      setSortOrder('asc')
    }
  }

  const columns: Column<Tenant>[] = [
    {
      key: 'name',
      header: 'Hospital',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-4 h-4 text-primary-600" />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-slate-900 truncate">{row.name}</p>
            <p className="text-xs text-slate-500">{row.code}</p>
          </div>
        </div>
      ),
    },
    { key: 'country', header: 'Country', sortable: true },
    {
      key: 'branchCount',
      header: 'Branches',
      align: 'center',
      render: (row) => <span className="font-medium">{row.branchCount}</span>,
    },
    {
      key: 'userCount',
      header: 'Users',
      align: 'center',
      render: (row) => <span className="font-medium">{row.userCount}</span>,
    },
    {
      key: 'subscriptionPlan',
      header: 'Plan',
      render: (row) => <Badge variant="primary">{row.subscriptionPlan || '—'}</Badge>,
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (row) => <Badge variant={statusBadge(row.status)} dot>{row.status}</Badge>,
    },
    {
      key: 'licenseStatus',
      header: 'License',
      render: (row) => <Badge variant={statusBadge(row.licenseStatus || 'default')}>{row.licenseStatus || '—'}</Badge>,
    },
    {
      key: 'lastLoginAt',
      header: 'Last Activity',
      render: (row) => <span className="text-slate-500">{row.lastLoginAt ? formatRelative(row.lastLoginAt) : '—'}</span>,
    },
    {
      key: 'createdAt',
      header: 'Created',
      sortable: true,
      render: (row) => <span className="text-slate-500">{formatDate(row.createdAt)}</span>,
    },
    {
      key: 'actions',
      header: '',
      width: '80px',
      render: (row) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="xs" onClick={() => navigate(`/admin/tenants/${row.id}`)}>
            View
          </Button>
          <div className="relative group">
            <Button variant="ghost" size="xs">
              <MoreVertical className="w-4 h-4" />
            </Button>
            <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-lg shadow-dropdown border border-slate-200 py-1 z-10 hidden group-hover:block">
              {row.status === 'active' ? (
                <button
                  className="w-full text-left px-3 py-2 text-sm text-danger-600 hover:bg-danger-50"
                  onClick={() => setConfirmAction({ id: row.id, action: 'suspend', name: row.name })}
                >
                  Suspend
                </button>
              ) : (
                <button
                  className="w-full text-left px-3 py-2 text-sm text-success-700 hover:bg-success-50"
                  onClick={() => setConfirmAction({ id: row.id, action: 'activate', name: row.name })}
                >
                  Activate
                </button>
              )}
              <button
                className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => navigate(`/admin/subscriptions?tenantId=${row.id}`)}
              >
                Subscription
              </button>
            </div>
          </div>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <PageHeader
        title="Registered hospitals"
        description="Search by name, code, status, or plan."
        breadcrumbs={[{ label: 'Platform Admin' }, { label: 'Hospitals' }]}
        actions={
          <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => navigate('/admin/tenants/new')}>
            Register Hospital
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search hospitals..."
          leftElement={<Search className="w-4 h-4" />}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="w-64"
        />
        <Select
          options={[
            { value: '', label: 'All statuses' },
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
            { value: 'suspended', label: 'Suspended' },
            { value: 'trial', label: 'Trial' },
            { value: 'expired', label: 'Expired' },
          ]}
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className="w-40"
          placeholder="Status"
        />
        <Select
          options={[
            { value: '', label: 'All plans' },
            { value: 'starter', label: 'Starter' },
            { value: 'professional', label: 'Professional' },
            { value: 'enterprise', label: 'Enterprise' },
          ]}
          value={planFilter}
          onChange={(e) => { setPlanFilter(e.target.value); setPage(1) }}
          className="w-40"
          placeholder="Plan"
        />
        {(search || statusFilter || planFilter) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setSearch(''); setStatusFilter(''); setPlanFilter(''); setPage(1) }}
            leftIcon={<Filter className="w-4 h-4" />}
          >
            Clear filters
          </Button>
        )}
      </div>

      <div>
        <DataTable
          columns={columns}
          data={data?.data ?? []}
          keyExtractor={(r) => r.id}
          isLoading={isLoading}
          isError={isError}
          onRetry={refetch}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
          onRowClick={(r) => navigate(`/admin/tenants/${r.id}`)}
          emptyTitle="No hospitals found"
          emptyDescription="Try adjusting your search or add a new hospital."
          emptyAction={{ label: 'Register Hospital', onClick: () => navigate('/admin/tenants/new') }}
        />
        {data && (
          <Pagination
            page={page}
            totalPages={data.totalPages}
            total={data.total}
            pageSize={pageSize}
            onPage={setPage}
            onPageSize={(s) => { setPageSize(s); setPage(1) }}
          />
        )}
      </div>

      <ConfirmDialog
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => {
          if (!confirmAction) return
          if (confirmAction.action === 'suspend') suspendMutation.mutate(confirmAction.id)
          else activateMutation.mutate(confirmAction.id)
        }}
        title={confirmAction?.action === 'suspend' ? 'Suspend hospital?' : 'Activate hospital?'}
        message={confirmAction?.action === 'suspend'
          ? `Suspending "${confirmAction?.name}" will prevent all users at this hospital from logging in. Are you sure?`
          : `Reactivating "${confirmAction?.name}" will restore access for all users. Continue?`}
        confirmLabel={confirmAction?.action === 'suspend' ? 'Suspend' : 'Activate'}
        variant={confirmAction?.action === 'suspend' ? 'danger' : 'primary'}
        loading={suspendMutation.isPending || activateMutation.isPending}
      />
    </div>
  )
}
