import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { billingService } from '@/services/billing.service'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable, Pagination, type Column } from '@/components/tables/DataTable'
import { Badge, statusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { ConfirmDialog } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { formatDate, formatCurrency } from '@/utils/format'
import type { Refund } from '@/types'

export function RefundList() {
  const { toast } = useToast()
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [confirmApprove, setConfirmApprove] = useState<Refund | null>(null)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['refunds', { page, status: statusFilter }],
    queryFn: () => billingService.listRefunds({ page, pageSize: 20, status: statusFilter || undefined }),
  })

  const approveMutation = useMutation({
    mutationFn: (id: string) => billingService.approveRefund(id),
    onSuccess: () => {
      toast('success', 'Refund approved')
      qc.invalidateQueries({ queryKey: ['refunds'] })
      setConfirmApprove(null)
    },
    onError: () => toast('error', 'Failed to approve refund'),
  })

  const columns: Column<Refund>[] = [
    { key: 'invoiceNumber', header: 'Invoice #', render: (row) => <span className="font-mono">{row.invoiceNumber}</span> },
    { key: 'patientName', header: 'Patient' },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      render: (row) => <span className="font-semibold">{formatCurrency(row.amount, row.currency)}</span>,
    },
    { key: 'reason', header: 'Reason', render: (row) => <span className="text-slate-600 text-xs">{row.reason}</span> },
    { key: 'requestedByName', header: 'Requested By' },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge variant={statusBadge(row.status)} dot>{row.status}</Badge>,
    },
    { key: 'createdAt', header: 'Date', render: (row) => formatDate(row.createdAt) },
    {
      key: 'actions',
      header: '',
      render: (row) => row.status === 'pending' ? (
        <Button variant="success" size="xs" onClick={(e) => { e.stopPropagation(); setConfirmApprove(row) }}>
          Approve
        </Button>
      ) : null,
    },
  ]

  return (
    <div className="space-y-4">
      <PageHeader
        title="Refunds"
        description="Review and approve authorized refunds."
        breadcrumbs={[{ label: 'Billing' }, { label: 'Refunds' }]}
      />

      <Select
        options={[
          { value: '', label: 'All statuses' },
          { value: 'pending', label: 'Pending' },
          { value: 'approved', label: 'Approved' },
          { value: 'rejected', label: 'Rejected' },
        ]}
        value={statusFilter}
        onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
        className="w-40"
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
          emptyTitle="No refunds found"
        />
        {data && <Pagination page={page} totalPages={data.totalPages} total={data.total} pageSize={20} onPage={setPage} />}
      </div>

      <ConfirmDialog
        isOpen={!!confirmApprove}
        onClose={() => setConfirmApprove(null)}
        onConfirm={() => confirmApprove && approveMutation.mutate(confirmApprove.id)}
        title="Approve refund?"
        message={`Approving a refund of ${formatCurrency(confirmApprove?.amount ?? 0, confirmApprove?.currency ?? 'USD')} for ${confirmApprove?.patientName}. This cannot be reversed.`}
        confirmLabel="Approve Refund"
        variant="primary"
        loading={approveMutation.isPending}
      />
    </div>
  )
}
