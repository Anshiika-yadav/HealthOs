import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FileText, Search, Eye } from 'lucide-react'
import { auditService } from '@/services/audit.service'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable, Pagination, type Column } from '@/components/tables/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { formatDateTime } from '@/utils/format'
import type { AuditLog } from '@/types'

export function AuditLogList() {
  const { toast } = useToast()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selected, setSelected] = useState<AuditLog | null>(null)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['audit-logs', { page, search, action: actionFilter, startDate, endDate }],
    queryFn: () => auditService.list({
      page, pageSize: 20,
      action: actionFilter || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    }),
  })

  const handleExport = async () => {
    try {
      const blob = await auditService.export({ startDate, endDate })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast('error', 'Export failed', 'Could not export audit logs')
    }
  }

  const columns: Column<AuditLog>[] = [
    { key: 'actor', header: 'Actor', render: (row) => (
      <div>
        <p className="text-sm font-medium text-slate-900">{row.actor}</p>
        <p className="text-xs text-slate-500">{row.actorRole}</p>
      </div>
    )},
    { key: 'action', header: 'Action', render: (row) => (
      <Badge variant="primary">{row.action}</Badge>
    )},
    { key: 'entity', header: 'Entity', render: (row) => (
      <div>
        <span className="font-medium">{row.entity}</span>
        {row.entityId && <span className="text-xs text-slate-400 ml-1">#{row.entityId.slice(0,8)}</span>}
      </div>
    )},
    { key: 'tenantName', header: 'Hospital', render: (row) => row.tenantName ?? '—' },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge variant={row.status === 'success' ? 'success' : 'danger'} dot>{row.status}</Badge>
      ),
    },
    { key: 'createdAt', header: 'Time', render: (row) => <span className="text-xs text-slate-500">{formatDateTime(row.createdAt)}</span> },
    {
      key: 'actions',
      header: '',
      width: '60px',
      render: (row) => (
        <Button variant="ghost" size="xs" onClick={(e) => { e.stopPropagation(); setSelected(row) }}>
          <Eye className="w-4 h-4" />
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <PageHeader
        title="Audit logs"
        description="Read-only record of all platform and hospital activities."
        breadcrumbs={[{ label: 'Platform Admin' }, { label: 'Audit Logs' }]}
        actions={
          <Button variant="outline" size="sm" leftIcon={<FileText className="w-4 h-4" />} onClick={handleExport}>
            Export
          </Button>
        }
      />

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search by actor..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="w-56"
          leftElement={<Search className="w-4 h-4" />}
        />
        <Input label="" type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(1) }} className="w-40" />
        <Input label="" type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(1) }} className="w-40" />
        <Select
          options={[
            { value: '', label: 'All actions' },
            { value: 'login', label: 'Login' },
            { value: 'create', label: 'Create' },
            { value: 'update', label: 'Update' },
            { value: 'delete', label: 'Delete' },
            { value: 'suspend', label: 'Suspend' },
          ]}
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(1) }}
          className="w-40"
          placeholder="Action"
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
          onRowClick={setSelected}
          emptyTitle="No audit logs found"
        />
        {data && (
          <Pagination page={page} totalPages={data.totalPages} total={data.total} pageSize={20} onPage={setPage} />
        )}
      </div>

      {/* Detail modal */}
      <Modal
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        title="Audit Event Detail"
        size="lg"
      >
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <DetailRow label="Actor" value={selected.actor} />
              <DetailRow label="Role" value={selected.actorRole} />
              <DetailRow label="Action" value={<Badge variant="primary">{selected.action}</Badge>} />
              <DetailRow label="Status" value={<Badge variant={selected.status === 'success' ? 'success' : 'danger'}>{selected.status}</Badge>} />
              <DetailRow label="Entity" value={`${selected.entity} #${selected.entityId}`} />
              <DetailRow label="Hospital" value={selected.tenantName ?? '—'} />
              <DetailRow label="IP Address" value={selected.ipAddress ?? '—'} />
              <DetailRow label="Timestamp" value={formatDateTime(selected.createdAt)} />
            </div>
            {selected.before && (
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">Before</p>
                <pre className="text-xs bg-slate-50 rounded-lg p-3 overflow-x-auto">{JSON.stringify(selected.before, null, 2)}</pre>
              </div>
            )}
            {selected.after && (
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">After</p>
                <pre className="text-xs bg-slate-50 rounded-lg p-3 overflow-x-auto">{JSON.stringify(selected.after, null, 2)}</pre>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-slate-500 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-slate-900">{value}</p>
    </div>
  )
}
