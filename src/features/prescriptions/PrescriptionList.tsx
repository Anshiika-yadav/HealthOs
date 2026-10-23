import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Search, ClipboardList } from 'lucide-react'
import { pharmacyService } from '@/services/pharmacy.service'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable, Pagination, type Column } from '@/components/tables/DataTable'
import { Badge, statusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { formatDate } from '@/utils/format'
import type { Prescription } from '@/types'

export function PrescriptionList() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const presetPatientId = searchParams.get('patientId') ?? ''

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['prescriptions', { page, search, status: statusFilter, patientId: presetPatientId }],
    queryFn: () =>
      pharmacyService.listPrescriptions({
        page,
        pageSize: 20,
        search,
        status: statusFilter || undefined,
        patientId: presetPatientId || undefined,
      }),
    staleTime: 30_000,
  })

  const columns: Column<Prescription>[] = [
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
      key: 'items',
      header: 'Medications',
      render: (row) => (
        <div className="space-y-0.5">
          {row.items.slice(0, 2).map((item) => (
            <p key={item.id} className="text-sm text-slate-700">
              {item.drugName}{' '}
              <span className="text-slate-400 text-xs">{item.dosage} · {item.frequency}</span>
            </p>
          ))}
          {row.items.length > 2 && (
            <p className="text-xs text-slate-400">+{row.items.length - 2} more</p>
          )}
        </div>
      ),
    },
    { key: 'prescriberName', header: 'Prescriber' },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge variant={statusBadge(row.status)} dot>
          {row.status.replace(/_/g, ' ')}
        </Badge>
      ),
    },
    {
      key: 'createdAt',
      header: 'Date',
      sortable: true,
      render: (row) => <span className="text-slate-500">{formatDate(row.createdAt)}</span>,
    },
    {
      key: 'actions',
      header: '',
      width: '80px',
      render: (row) => (
        <Button
          variant="ghost"
          size="xs"
          onClick={(e) => { e.stopPropagation(); navigate(`/prescriptions/${row.id}`) }}
        >
          View
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <PageHeader
        title="Prescriptions"
        description="Manage and track medication prescriptions."
        breadcrumbs={[{ label: 'Prescriptions' }]}
        actions={
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => navigate(presetPatientId ? `/prescriptions/new?patientId=${presetPatientId}` : '/prescriptions/new')}
          >
            New Prescription
          </Button>
        }
      />

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search patient or drug..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="w-64"
          leftElement={<Search className="w-4 h-4" />}
        />
        <Select
          options={[
            { value: '', label: 'All statuses' },
            { value: 'draft', label: 'Draft' },
            { value: 'active', label: 'Active' },
            { value: 'dispensed', label: 'Dispensed' },
            { value: 'partially_dispensed', label: 'Partially Dispensed' },
            { value: 'cancelled', label: 'Cancelled' },
            { value: 'expired', label: 'Expired' },
          ]}
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className="w-48"
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
          onRowClick={(r) => navigate(`/prescriptions/${r.id}`)}
          emptyTitle="No prescriptions found"
          emptyDescription="No prescriptions match your search or filters."
          emptyAction={{
            label: 'New Prescription',
            onClick: () => navigate('/prescriptions/new'),
          }}
        />
        {data && (
          <Pagination
            page={page}
            totalPages={data.totalPages}
            total={data.total}
            pageSize={20}
            onPage={setPage}
          />
        )}
      </div>
    </div>
  )
}
