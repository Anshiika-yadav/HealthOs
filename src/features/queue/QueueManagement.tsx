import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Activity, RefreshCw, UserCheck, Phone } from 'lucide-react'
import apiClient from '@/services/apiClient'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge, statusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { SkeletonTable } from '@/components/feedback/LoadingSkeleton'
import { ErrorState, EmptyState } from '@/components/feedback/EmptyState'
import type { QueueEntry } from '@/types'

async function fetchQueue(): Promise<QueueEntry[]> {
  const { data } = await apiClient.get<QueueEntry[]>('/queue/today')
  return data
}

async function updateQueueStatus(id: string, status: string): Promise<QueueEntry> {
  const { data } = await apiClient.patch<QueueEntry>(`/queue/${id}/status`, { status })
  return data
}

const STATUS_COLORS: Record<string, string> = {
  waiting:       'bg-warning-50 border-warning-200',
  called:        'bg-primary-50 border-primary-200',
  with_provider: 'bg-success-50 border-success-200',
  completed:     'bg-slate-50 border-slate-200',
  no_show:       'bg-danger-50 border-danger-200',
}

export function QueueManagement() {
  const { toast } = useToast()
  const qc = useQueryClient()
  const [filter, setFilter] = useState<string>('active')

  const { data: queue, isLoading, isError, refetch } = useQuery({
    queryKey: ['queue', 'today'],
    queryFn: fetchQueue,
    refetchInterval: 30_000,
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateQueueStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['queue'] })
      toast('success', 'Queue updated')
    },
    onError: () => toast('error', 'Failed to update queue'),
  })

  const filtered = queue?.filter((q) => {
    if (filter === 'active') return ['waiting', 'called', 'with_provider'].includes(q.status)
    if (filter === 'completed') return ['completed', 'no_show'].includes(q.status)
    return true
  }) ?? []

  const waiting = queue?.filter((q) => q.status === 'waiting').length ?? 0
  const withProvider = queue?.filter((q) => q.status === 'with_provider').length ?? 0

  return (
    <div className="space-y-4">
      <PageHeader
        title="Today's queue"
        description="Call next patient."
        breadcrumbs={[{ label: 'Queue' }]}
        actions={
          <Button variant="outline" size="sm" leftIcon={<RefreshCw className="w-4 h-4" />} onClick={() => refetch()}>
            Refresh
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Today',    value: queue?.length ?? 0,  color: 'bg-white' },
          { label: 'Waiting',        value: waiting,              color: 'bg-warning-50' },
          { label: 'With Provider',  value: withProvider,         color: 'bg-success-50' },
          { label: 'Completed',      value: queue?.filter(q => q.status === 'completed').length ?? 0, color: 'bg-slate-50' },
        ].map((s) => (
          <div key={s.label} className={`${s.color} rounded-xl border border-slate-200 p-4`}>
            <p className="text-xs text-slate-500">{s.label}</p>
            <p className="text-2xl font-bold text-slate-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {[
          { key: 'active', label: 'Active' },
          { key: 'completed', label: 'Completed' },
          { key: 'all', label: 'All' },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f.key ? 'bg-primary-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading && <SkeletonTable rows={6} cols={6} />}
      {isError && <ErrorState onRetry={refetch} />}

      {!isLoading && !isError && filtered.length === 0 && (
        <EmptyState
          icon={<Activity className="w-6 h-6" />}
          title="Queue is empty"
          description="No patients in the queue for the selected filter."
        />
      )}

      {!isLoading && !isError && filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map((entry) => (
            <div
              key={entry.id}
              className={`rounded-xl border p-4 flex items-center gap-4 ${STATUS_COLORS[entry.status] ?? 'bg-white border-slate-200'}`}
            >
              {/* Queue number */}
              <div className="w-10 h-10 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center font-bold text-slate-700 flex-shrink-0">
                {entry.queueNumber}
              </div>

              {/* Patient info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-slate-900">{entry.patientName}</p>
                  <span className="text-xs text-slate-500">MRN: {entry.patientMrn}</span>
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {entry.providerName} · {entry.departmentName} · Appt: {entry.appointmentTime}
                </div>
                {entry.waitDurationMinutes !== undefined && (
                  <p className="text-xs text-slate-400 mt-0.5">
                    Waiting {entry.waitDurationMinutes} min
                  </p>
                )}
              </div>

              {/* Status */}
              <Badge variant={statusBadge(entry.status)} dot className="flex-shrink-0">
                {entry.status.replace(/_/g, ' ')}
              </Badge>

              {/* Actions */}
              <div className="flex gap-1 flex-shrink-0">
                {entry.status === 'waiting' && (
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<Phone className="w-3.5 h-3.5" />}
                    onClick={() => statusMutation.mutate({ id: entry.id, status: 'called' })}
                    loading={statusMutation.isPending}
                  >
                    Call
                  </Button>
                )}
                {entry.status === 'called' && (
                  <Button
                    variant="success"
                    size="sm"
                    leftIcon={<UserCheck className="w-3.5 h-3.5" />}
                    onClick={() => statusMutation.mutate({ id: entry.id, status: 'with_provider' })}
                    loading={statusMutation.isPending}
                  >
                    With Provider
                  </Button>
                )}
                {entry.status === 'with_provider' && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => statusMutation.mutate({ id: entry.id, status: 'completed' })}
                    loading={statusMutation.isPending}
                  >
                    Complete
                  </Button>
                )}
                {(entry.status === 'waiting' || entry.status === 'called') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-danger-600"
                    onClick={() => statusMutation.mutate({ id: entry.id, status: 'no_show' })}
                  >
                    No Show
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
