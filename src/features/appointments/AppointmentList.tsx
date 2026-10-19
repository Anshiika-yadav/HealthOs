import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, CalendarDays } from 'lucide-react'
import { appointmentService } from '@/services/appointment.service'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable, Pagination, type Column } from '@/components/tables/DataTable'
import { Badge, statusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { ConfirmDialog } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { formatDate } from '@/utils/format'
import type { Appointment } from '@/types'

export function AppointmentList() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0])
  const [confirmCancel, setConfirmCancel] = useState<Appointment | null>(null)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['appointments', { page, search, status: statusFilter, date: dateFilter }],
    queryFn: () => appointmentService.list({ page, pageSize: 20, search, status: statusFilter || undefined, date: dateFilter }),
    staleTime: 30_000,
  })

  const cancelMutation = useMutation({
    mutationFn: (id: string) => appointmentService.cancel(id),
    onSuccess: () => {
      toast('success', 'Appointment cancelled')
      qc.invalidateQueries({ queryKey: ['appointments'] })
      setConfirmCancel(null)
    },
    onError: () => toast('error', 'Failed to cancel appointment'),
  })

  const checkInMutation = useMutation({
    mutationFn: (id: string) => appointmentService.checkIn(id),
    onSuccess: () => {
      toast('success', 'Patient checked in')
      qc.invalidateQueries({ queryKey: ['appointments'] })
    },
    onError: () => toast('error', 'Failed to check in'),
  })

  const columns: Column<Appointment>[] = [
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
    { key: 'time', header: 'Time', render: (row) => <span className="font-mono text-sm">{row.time}</span> },
    { key: 'providerName', header: 'Provider' },
    { key: 'departmentName', header: 'Department' },
    { key: 'type', header: 'Type', render: (row) => <Badge variant="outline">{row.type.replace(/_/g,' ')}</Badge> },
    { key: 'reason', header: 'Reason', render: (row) => <span className="text-slate-600 truncate max-w-[150px] block">{row.reason}</span> },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge variant={statusBadge(row.status)} dot>{row.status.replace(/_/g,' ')}</Badge>,
    },
    {
      key: 'actions',
      header: '',
      width: '120px',
      render: (row) => (
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          {row.status === 'scheduled' || row.status === 'confirmed' ? (
            <Button variant="success" size="xs" onClick={() => checkInMutation.mutate(row.id)}>
              Check In
            </Button>
          ) : null}
          {(row.status === 'scheduled' || row.status === 'confirmed') && (
            <Button variant="ghost" size="xs" className="text-danger-600" onClick={() => setConfirmCancel(row)}>
              Cancel
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <PageHeader
        title="Schedule appointment"
        description="No-shows can be marked from the schedule view."
        breadcrumbs={[{ label: 'Appointments' }]}
        actions={
          <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => navigate('/appointments/new')}>
            Book Appointment
          </Button>
        }
      />

      <div className="flex flex-wrap gap-3">
        <Input
          type="date"
          value={dateFilter}
          onChange={(e) => { setDateFilter(e.target.value); setPage(1) }}
          className="w-40"
        />
        <Input
          placeholder="Search patient..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="w-56"
          leftElement={<Search className="w-4 h-4" />}
        />
        <Select
          options={[
            { value: '', label: 'All statuses' },
            { value: 'scheduled', label: 'Scheduled' },
            { value: 'confirmed', label: 'Confirmed' },
            { value: 'checked_in', label: 'Checked In' },
            { value: 'completed', label: 'Completed' },
            { value: 'cancelled', label: 'Cancelled' },
            { value: 'no_show', label: 'No Show' },
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
          onRowClick={(r) => navigate(`/appointments/${r.id}`)}
          emptyTitle="No appointments"
          emptyDescription="No appointments found for the selected date and filters."
          emptyAction={{ label: 'Book Appointment', onClick: () => navigate('/appointments/new') }}
        />
        {data && <Pagination page={page} totalPages={data.totalPages} total={data.total} pageSize={20} onPage={setPage} />}
      </div>

      <ConfirmDialog
        isOpen={!!confirmCancel}
        onClose={() => setConfirmCancel(null)}
        onConfirm={() => confirmCancel && cancelMutation.mutate(confirmCancel.id)}
        title="Cancel appointment?"
        message={`Cancelling the appointment for ${confirmCancel?.patientName}. This action is recorded.`}
        confirmLabel="Cancel Appointment"
        variant="danger"
        loading={cancelMutation.isPending}
      />
    </div>
  )
}
