import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Stethoscope } from 'lucide-react'
import { encounterService } from '@/services/encounter.service'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable, Pagination, type Column } from '@/components/tables/DataTable'
import { Badge, statusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { formatDate, formatDateTime } from '@/utils/format'
import type { Encounter } from '@/types'

export function EncounterList() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['encounters', { page, search, status: statusFilter }],
    queryFn: () => encounterService.list({ page, pageSize: 20, search, status: statusFilter || undefined }),
    staleTime: 30_000,
  })

  const columns: Column<Encounter>[] = [
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
    { key: 'date', header: 'Date', render: (row) => <span className="text-slate-600">{formatDate(row.date)}</span> },
    { key: 'providerName', header: 'Provider' },
    { key: 'departmentName', header: 'Department' },
    {
      key: 'chiefComplaint',
      header: 'Chief Complaint',
      render: (row) => <span className="text-slate-600 truncate block max-w-[200px]">{row.chiefComplaint}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge variant={statusBadge(row.status)} dot>{row.status}</Badge>,
    },
    {
      key: 'actions',
      header: '',
      width: '80px',
      render: (row) => (
        <Button variant="ghost" size="xs" onClick={(e) => { e.stopPropagation(); navigate(`/encounters/${row.id}`) }}>
          Open
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <PageHeader
        title="Clinical encounters"
        description="Save as draft before signing."
        breadcrumbs={[{ label: 'Encounters' }]}
        actions={
          <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => navigate('/encounters/new')}>
            New Encounter
          </Button>
        }
      />

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search patient..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="w-64"
          leftElement={<Search className="w-4 h-4" />}
        />
        <Select
          options={[
            { value: '', label: 'All statuses' },
            { value: 'draft', label: 'Draft' },
            { value: 'in_progress', label: 'In Progress' },
            { value: 'finalized', label: 'Finalized' },
          ]}
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className="w-40"
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
          onRowClick={(r) => navigate(`/encounters/${r.id}`)}
          emptyTitle="No encounters found"
          emptyAction={{ label: 'New Encounter', onClick: () => navigate('/encounters/new') }}
        />
        {data && <Pagination page={page} totalPages={data.totalPages} total={data.total} pageSize={20} onPage={setPage} />}
      </div>
    </div>
  )
}
