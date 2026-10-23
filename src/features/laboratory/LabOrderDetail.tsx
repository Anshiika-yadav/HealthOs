import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { laboratoryService } from '@/services/laboratory.service'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge, statusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { SkeletonCard } from '@/components/feedback/LoadingSkeleton'
import { ErrorState } from '@/components/feedback/EmptyState'
import { useToast } from '@/components/ui/Toast'
import { formatDateTime } from '@/utils/format'
import { FlaskConical, User, Clock, ChevronRight } from 'lucide-react'
import type { LabOrderStatus } from '@/types'

const STATUS_FLOW: Record<string, { next: LabOrderStatus; label: string }> = {
  ordered:    { next: 'collected',  label: 'Mark Sample Collected' },
  collected:  { next: 'received',   label: 'Mark Sample Received' },
  received:   { next: 'processing', label: 'Start Processing' },
}

const PRIORITY_COLORS: Record<string, string> = {
  stat:    'text-danger-600 bg-danger-50 border-danger-200',
  urgent:  'text-warning-600 bg-warning-50 border-warning-200',
  routine: 'text-slate-600 bg-slate-50 border-slate-200',
}

export function LabOrderDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const qc = useQueryClient()

  const { data: order, isLoading, isError, refetch } = useQuery({
    queryKey: ['lab-order', id],
    queryFn: () => laboratoryService.getOrder(id!),
    enabled: !!id,
  })

  const statusMutation = useMutation({
    mutationFn: (status: string) => laboratoryService.updateOrderStatus(id!, status),
    onSuccess: () => {
      toast('success', 'Status updated')
      qc.invalidateQueries({ queryKey: ['lab-order', id] })
      qc.invalidateQueries({ queryKey: ['lab-orders'] })
    },
    onError: () => toast('error', 'Failed to update status'),
  })

  if (isLoading) return <SkeletonCard lines={8} />
  if (isError || !order) return <ErrorState onRetry={refetch} />

  const nextStep = STATUS_FLOW[order.status]
  const canEnterResults = order.status === 'processing'
  const canVerify = order.status === 'processing' && order.tests.every((t) => t.resultValue)
  const canRelease = order.status === 'verified'

  return (
    <div className="space-y-5 max-w-3xl">
      <PageHeader
        title={`Lab Order ${order.orderNumber}`}
        backHref="/laboratory"
        breadcrumbs={[{ label: 'Laboratory', href: '/laboratory' }, { label: order.orderNumber }]}
        actions={
          <div className="flex gap-2 flex-wrap items-center">
            <span className={`text-xs font-bold px-2 py-1 rounded-full border uppercase tracking-wide ${PRIORITY_COLORS[order.priority] ?? ''}`}>
              {order.priority}
            </span>
            <Badge variant={statusBadge(order.status)} dot>{order.status}</Badge>
            {nextStep && (
              <Button
                variant="primary" size="sm"
                loading={statusMutation.isPending}
                onClick={() => statusMutation.mutate(nextStep.next)}
              >
                {nextStep.label}
              </Button>
            )}
            {canEnterResults && (
              <Button variant="success" size="sm" onClick={() => navigate(`/laboratory/orders/${id}/results`)}>
                Enter Results
              </Button>
            )}
            {canVerify && (
              <Button variant="primary" size="sm" loading={statusMutation.isPending}
                onClick={() => laboratoryService.verifyResults(id!).then(() => {
                  toast('success', 'Results verified')
                  qc.invalidateQueries({ queryKey: ['lab-order', id] })
                })}>
                Verify Results
              </Button>
            )}
            {canRelease && (
              <Button variant="success" size="sm" loading={statusMutation.isPending}
                onClick={() => laboratoryService.releaseResults(id!).then(() => {
                  toast('success', 'Results released to patient timeline')
                  qc.invalidateQueries({ queryKey: ['lab-order', id] })
                })}>
                Release Results
              </Button>
            )}
          </div>
        }
      />

      {/* Header cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Patient</h3>
          <p className="font-bold text-slate-900">{order.patientName}</p>
          <p className="text-sm text-slate-500">MRN: {order.patientMrn}</p>
          <Button variant="ghost" size="xs" className="mt-2"
            onClick={() => navigate(`/patients/${order.patientId}`)}>
            View profile →
          </Button>
        </Card>
        <Card>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Order Info</h3>
          <div className="space-y-1.5 text-sm">
            <div className="flex items-center gap-2 text-slate-600">
              <User className="w-3.5 h-3.5" />
              <span>Ordered by {order.orderedByName}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <Clock className="w-3.5 h-3.5" />
              <span>{formatDateTime(order.createdAt)}</span>
            </div>
            {order.sampleType && (
              <div className="flex items-center gap-2 text-slate-600">
                <FlaskConical className="w-3.5 h-3.5" />
                <span>Sample: {order.sampleType}</span>
              </div>
            )}
            {order.assignedTechnicianName && (
              <div className="flex items-center gap-2 text-slate-600">
                <User className="w-3.5 h-3.5" />
                <span>Technician: {order.assignedTechnicianName}</span>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Status timeline */}
      <Card>
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Status Timeline</h3>
        <div className="flex items-center gap-1 flex-wrap">
          {(['ordered', 'collected', 'received', 'processing', 'verified', 'released'] as LabOrderStatus[]).map((s, i, arr) => {
            const statuses = ['ordered', 'collected', 'received', 'processing', 'verified', 'released']
            const currentIdx = statuses.indexOf(order.status)
            const stepIdx = statuses.indexOf(s)
            const isDone = stepIdx <= currentIdx
            const isCurrent = s === order.status
            return (
              <div key={s} className="flex items-center gap-1">
                <span className={`px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                  isCurrent ? 'bg-primary-600 text-white' :
                  isDone ? 'bg-success-100 text-success-700' : 'bg-slate-100 text-slate-400'
                }`}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </span>
                {i < arr.length - 1 && <ChevronRight className="w-3 h-3 text-slate-300 flex-shrink-0" />}
              </div>
            )
          })}
        </div>
        {order.sampleCollectedAt && (
          <p className="text-xs text-slate-400 mt-2">Collected: {formatDateTime(order.sampleCollectedAt)}</p>
        )}
        {order.sampleReceivedAt && (
          <p className="text-xs text-slate-400">Received: {formatDateTime(order.sampleReceivedAt)}</p>
        )}
      </Card>

      {/* Tests & Results */}
      <Card>
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Tests & Results</h3>
        <div className="space-y-3">
          {order.tests.map((test) => (
            <div key={test.id} className="p-4 border border-slate-200 rounded-xl">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-900">{test.testName}</p>
                    <span className="text-xs font-mono text-slate-400">{test.testCode}</span>
                  </div>
                  {test.resultValue ? (
                    <div className="mt-2 space-y-0.5">
                      <div className="flex items-center gap-3">
                        <span className={`text-base font-bold ${test.isAbnormal ? 'text-danger-600' : 'text-success-700'}`}>
                          {test.resultValue} {test.resultUnit}
                        </span>
                        {test.isAbnormal && <Badge variant="danger" size="sm">Abnormal</Badge>}
                      </div>
                      {test.referenceRange && (
                        <p className="text-xs text-slate-400">Reference: {test.referenceRange}</p>
                      )}
                      {test.resultNotes && (
                        <p className="text-xs text-slate-500 italic">{test.resultNotes}</p>
                      )}
                      {test.verifiedBy && (
                        <p className="text-xs text-slate-400">
                          Verified by {test.verifiedBy} · {formatDateTime(test.verifiedAt ?? '')}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 mt-1">No result yet</p>
                  )}
                </div>
                <Badge variant={statusBadge(test.status)} size="sm">{test.status}</Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {order.notes && (
        <Card>
          <h3 className="text-sm font-semibold text-slate-900 mb-2">Clinical Notes</h3>
          <p className="text-sm text-slate-600">{order.notes}</p>
        </Card>
      )}

      {canEnterResults && (
        <div className="flex justify-end">
          <Button variant="primary" size="sm" onClick={() => navigate(`/laboratory/orders/${id}/results`)}>
            Enter Test Results →
          </Button>
        </div>
      )}
    </div>
  )
}
