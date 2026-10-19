import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, UserRound } from 'lucide-react'
import { patientService } from '@/services/patient.service'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable, Pagination, type Column } from '@/components/tables/DataTable'
import { Badge, statusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { formatDate } from '@/utils/format'
import type { Patient } from '@/types'

export function PatientList() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['patients', { page, pageSize, search, sortBy, sortOrder }],
    queryFn: () => patientService.list({ page, pageSize, search, sortBy, sortOrder }),
    staleTime: 30_000,
  })

  const handleSort = (key: string) => {
    if (sortBy === key) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    else { setSortBy(key); setSortOrder('asc') }
  }

  const columns: Column<Patient>[] = [
    {
      key: 'fullName',
      header: 'Patient',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${row.gender === 'male' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'}`}>
            {row.firstName[0]}{row.lastName[0]}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">{row.fullName}</p>
            <p className="text-xs text-slate-500">MRN: {row.mrn}</p>
          </div>
        </div>
      ),
    },
    { key: 'gender', header: 'Gender', render: (row) => <span className="capitalize">{row.gender}</span> },
    { key: 'dateOfBirth', header: 'DOB / Age', render: (row) => (
      <div>
        <p>{formatDate(row.dateOfBirth)}</p>
        {row.age && <p className="text-xs text-slate-400">{row.age} yrs</p>}
      </div>
    )},
    { key: 'phone', header: 'Phone' },
    { key: 'status', header: 'Status', render: (row) => <Badge variant={statusBadge(row.status)} dot>{row.status}</Badge> },
    {
      key: 'createdAt',
      header: 'Registered',
      sortable: true,
      render: (row) => <span className="text-slate-500">{formatDate(row.createdAt)}</span>,
    },
    {
      key: 'actions',
      header: '',
      width: '80px',
      render: (row) => (
        <Button variant="ghost" size="xs" onClick={(e) => { e.stopPropagation(); navigate(`/patients/${row.id}`) }}>
          View
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <PageHeader
        title="Patient directory"
        description="Search and manage patient records."
        breadcrumbs={[{ label: 'Patients' }]}
        actions={
          <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => navigate('/patients/new')}>
            Register Patient
          </Button>
        }
      />

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search by name, MRN, or phone..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="w-72"
          leftElement={<Search className="w-4 h-4" />}
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
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
          onRowClick={(r) => navigate(`/patients/${r.id}`)}
          emptyTitle="No patients found"
          emptyDescription="Register the first patient or try a different search."
          emptyAction={{ label: 'Register Patient', onClick: () => navigate('/patients/new') }}
        />
        {data && (
          <Pagination page={page} totalPages={data.totalPages} total={data.total} pageSize={pageSize} onPage={setPage} onPageSize={(s) => { setPageSize(s); setPage(1) }} />
        )}
      </div>
    </div>
  )
}
