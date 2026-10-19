import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { FlaskConical, Search } from 'lucide-react'
import { laboratoryService } from '@/services/laboratory.service'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable, Pagination, type Column } from '@/components/tables/DataTable'
import { Badge, statusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
import { formatDateTime } from '@/utils/format'
import type { LabOrder } from '@/types'

const STATUS_TRANSITIONS: Record<string, { next: string; label: string; variant: 'primary' | 'success' | 'secondary' }> = {
  ordered:    { next: 'collected',   label: 'Mark Collected', variant: 'primary' },
  collected:  { next: 'received',    label: 'Mark Received',  variant: 'primary' },
  received:   { next: 'processing',  label: 'Start Processing', variant: 'secondary' },
  processing: { next: 'verified',    label: 'Mark Verified',  variant: 'success' },
  verified:   { next: 'released',    label: 'Release Results', variant: 'success' },
}

export function LabWorklist() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['lab-orders', { page, search, status: statusFilter, priority: priorityFilter }],
    queryFn: () => laboratoryService.listOrders({
      page, pageSize: 20,
      status: statusFilter || undefined,
      priority: priorityFilter || undefined,
    }),
    staleTime: 30_000,
    refetchInterval: 60_000,
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      laboratoryService.updateOrderStatus(id, status),
    onSuccess: () => {
      toast('success', 'Status updated')
      qc.invalidateQueries({ queryKey: ['lab-orders'] })
    },
    onError: () => toast('error', 'Failed to update status'),
  })

  const columns: Column<LabOrder>[] = [
    {
      key: 'orderNumber',
      header: 'Order #',
      render: (row) => <span className="font-mono font-semibold">{row.orderNumber}</span>,
    },
    {
      key: 'patientName',
      header: 'Patient',
      render: (row) => (
        <div>
          <p className="font-medium text-slate-900">{row.patientName}</p>
          <p className="text-xs text-slate-500">MRN: {row.patientMrn}</p>
        </div>
      ),
    },
    {
      key: 'tests',
      header: 'Tests',
      render: (row) => (
        <div className="space-y-0.5">
          {row.tests.slice(0, 2).map((t) => (
            <p key={t.id} className="text-xs text-slate-600">{t.testName}</p>
          ))}
          {row.tests.length > 2 && <p className="text-xs text-slate-400">+{row.tests.length - 2} more</p>}
        </div>
      ),
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (row) => (
        <Badge variant={row.priority === 'stat' ? 'danger' : row.priority === 'urgent' ? 'warning' : 'default'}>
          {row.priority.toUpperCase()}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge variant={statusBadge(row.status)} dot>{row.status}</Badge>,
    },
    { key: 'createdAt', header: 'Ordered', render: (row) => <span className="text-xs text-slate-500">{formatDateTime(row.createdAt)}</span> },
    {
      key: 'actions',
      header: '',
      width: '140px',
      render: (row) => {
        const transition = STATUS_TRANSITIONS[row.status]
        return (
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            {transition && (
              <Button
                variant={transition.variant}
                size="xs"
                onClick={() => statusMutation.mutate({ id: row.id, status: transition.next })}
                loading={statusMutation.isPending}
              >
                {transition.label}
              </Button>
            )}
            {row.status === 'processing' && (
              <Button variant="outline" size="xs" onClick={(e) => { e.stopPropagation(); navigate(`/laboratory/orders/${row.id}/results`) }}>
                Enter Results
              </Button>
            )}
          </div>
        )
      },
    },
  ]

  return (
    <div className="space-y-4">
      <PageHeader
        title="Lab worklist"
        description="Complete results before release."
        breadcrumbs={[{ label: 'Laboratory' }]}
      />

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search patient or order #..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="w-64"
          leftElement={<Search className="w-4 h-4" />}
        />
        <Select
          options={[
            { value: '', label: 'All statuses' },
            { value: 'ordered', label: 'Ordered' },
            { value: 'collected', label: 'Collected' },
            { value: 'received', label: 'Received' },
            { value: 'processing', label: 'Processing' },
            { value: 'verified', label: 'Verified' },
            { value: 'released', label: 'Released' },
          ]}
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className="w-40"
          placeholder="Status"
        />
        <Select
          options={[
            { value: '', label: 'All priorities' },
            { value: 'stat', label: 'STAT' },
            { value: 'urgent', label: 'Urgent' },
            { value: 'routine', label: 'Routine' },
          ]}
          value={priorityFilter}
          onChange={(e) => { setPriorityFilter(e.target.value); setPage(1) }}
          className="w-36"
          placeholder="Priority"
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
          onRowClick={(r) => navigate(`/laboratory/orders/${r.id}`)}
          emptyTitle="No lab orders found"
        />
        {data && <Pagination page={page} totalPages={data.totalPages} total={data.total} pageSize={20} onPage={setPage} />}
      </div>
    </div>
  )
}
