import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Download } from 'lucide-react'
import { billingService } from '@/services/billing.service'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable, Pagination, type Column } from '@/components/tables/DataTable'
import { Badge, statusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
import { formatDate, formatCurrency } from '@/utils/format'
import type { Invoice } from '@/types'

export function InvoiceList() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['invoices', { page, search, status: statusFilter }],
    queryFn: () => billingService.listInvoices({ page, pageSize: 20, search, status: statusFilter || undefined }),
    staleTime: 30_000,
  })

  const handleDownload = async (id: string, invoiceNumber: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const blob = await billingService.downloadInvoicePdf(id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `invoice-${invoiceNumber}.pdf`; a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast('error', 'PDF download failed', 'The backend PDF service may be unavailable.')
    }
  }

  const columns: Column<Invoice>[] = [
    {
      key: 'invoiceNumber',
      header: 'Invoice #',
      render: (row) => <span className="font-mono font-semibold">{row.invoiceNumber}</span>,
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
      key: 'total',
      header: 'Total',
      align: 'right',
      render: (row) => <span className="font-semibold">{formatCurrency(row.total, row.currency)}</span>,
    },
    {
      key: 'amountPaid',
      header: 'Paid',
      align: 'right',
      render: (row) => <span className="text-success-600 font-medium">{formatCurrency(row.amountPaid, row.currency)}</span>,
    },
    {
      key: 'balance',
      header: 'Balance',
      align: 'right',
      render: (row) => (
        <span className={row.balance > 0 ? 'text-danger-600 font-medium' : 'text-slate-400'}>
          {formatCurrency(row.balance, row.currency)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge variant={statusBadge(row.status)} dot>{row.status.replace(/_/g,' ')}</Badge>,
    },
    { key: 'createdAt', header: 'Date', render: (row) => <span className="text-slate-500">{formatDate(row.createdAt)}</span> },
    {
      key: 'actions',
      header: '',
      width: '100px',
      render: (row) => (
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          {row.status === 'draft' && (
            <Button variant="primary" size="xs" onClick={(e) => { e.stopPropagation(); navigate(`/billing/invoices/${row.id}`) }}>
              Edit
            </Button>
          )}
          {(row.status === 'posted' || row.status === 'partially_paid') && (
            <Button variant="success" size="xs" onClick={(e) => { e.stopPropagation(); navigate(`/billing/payments/new?invoiceId=${row.id}`) }}>
              Pay
            </Button>
          )}
          <Button variant="ghost" size="xs" onClick={(e) => handleDownload(row.id, row.invoiceNumber, e)}>
            <Download className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <PageHeader
        title="Invoice summary"
        description="Add billable services."
        breadcrumbs={[{ label: 'Billing' }, { label: 'Invoices' }]}
        actions={
          <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => navigate('/billing/invoices/new')}>
            Create Invoice
          </Button>
        }
      />

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search patient or invoice #..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="w-64"
          leftElement={<Search className="w-4 h-4" />}
        />
        <Select
          options={[
            { value: '', label: 'All statuses' },
            { value: 'draft', label: 'Draft' },
            { value: 'posted', label: 'Posted' },
            { value: 'partially_paid', label: 'Partially Paid' },
            { value: 'paid', label: 'Paid' },
            { value: 'cancelled', label: 'Cancelled' },
          ]}
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className="w-44"
          placeholder="Status"
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
          onRowClick={(r) => navigate(`/billing/invoices/${r.id}`)}
          emptyTitle="No invoices found"
          emptyAction={{ label: 'Create Invoice', onClick: () => navigate('/billing/invoices/new') }}
        />
        {data && <Pagination page={page} totalPages={data.totalPages} total={data.total} pageSize={20} onPage={setPage} />}
      </div>
    </div>
  )
}
