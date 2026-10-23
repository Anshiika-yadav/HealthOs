import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { laboratoryService } from '@/services/laboratory.service'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge, statusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { SkeletonCard } from '@/components/feedback/LoadingSkeleton'
import { ErrorState } from '@/components/feedback/EmptyState'
import { useToast } from '@/components/ui/Toast'
import { CheckCircle, AlertTriangle } from 'lucide-react'

interface ResultDraft {
  testId: string
  value: string
  notes: string
}

export function LabResultEntry() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const qc = useQueryClient()

  const { data: order, isLoading, isError, refetch } = useQuery({
    queryKey: ['lab-order', id],
    queryFn: () => laboratoryService.getOrder(id!),
    enabled: !!id,
  })

  const [results, setResults] = useState<Record<string, ResultDraft>>({})

  const updateResult = (testId: string, field: keyof ResultDraft, value: string) => {
    setResults((prev) => ({
      ...prev,
      [testId]: { ...{ testId, value: '', notes: '' }, ...(prev[testId] ?? {}), [field]: value },
    }))
  }

  const mutation = useMutation({
    mutationFn: () =>
      laboratoryService.enterResults(
        id!,
        Object.values(results).filter((r) => r.value.trim()).map((r) => ({
          testId: r.testId,
          value: r.value,
          notes: r.notes || undefined,
        }))
      ),
    onSuccess: () => {
      toast('success', 'Results saved', 'Results are now ready for verification.')
      qc.invalidateQueries({ queryKey: ['lab-order', id] })
      qc.invalidateQueries({ queryKey: ['lab-orders'] })
      navigate(`/laboratory/orders/${id}`)
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to save results'
      toast('error', 'Save failed', msg)
    },
  })

  const handleSubmit = () => {
    const filled = Object.values(results).filter((r) => r.value.trim())
    if (filled.length === 0) { toast('error', 'Validation', 'Enter at least one result value'); return }
    mutation.mutate()
  }

  if (isLoading) return <SkeletonCard lines={8} />
  if (isError || !order) return <ErrorState onRetry={refetch} />

  if (order.status === 'released' || order.status === 'verified') {
    return (
      <div className="max-w-2xl">
        <PageHeader
          title="Results already finalized"
          backHref={`/laboratory/orders/${id}`}
          breadcrumbs={[{ label: 'Laboratory' }, { label: 'Results' }]}
        />
        <Card>
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-success-500" />
            <div>
              <p className="font-semibold text-slate-900">
                Results have been {order.status === 'released' ? 'released' : 'verified'}
              </p>
              <p className="text-sm text-slate-500">
                This order cannot be edited. Results are now immutable.
              </p>
            </div>
          </div>
          <Button
            variant="primary" size="sm" className="mt-4"
            onClick={() => navigate(`/laboratory/orders/${id}`)}
          >
            View Order
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <PageHeader
        title="Enter test results"
        description={`Order ${order.orderNumber} · ${order.patientName}`}
        backHref={`/laboratory/orders/${id}`}
        breadcrumbs={[{ label: 'Laboratory', href: '/laboratory' }, { label: 'Results' }]}
      />

      {/* Warning if order not in processing */}
      {order.status !== 'processing' && (
        <div className="flex items-center gap-3 p-4 bg-warning-50 border border-warning-200 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-warning-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-warning-800">Order status: {order.status}</p>
            <p className="text-xs text-warning-600">
              Results can typically only be entered when the order is in "processing" status. Proceed with caution.
            </p>
          </div>
        </div>
      )}

      {/* Tests */}
      <div className="space-y-4">
        {order.tests.map((test) => {
          const draft = results[test.testId] ?? { testId: test.testId, value: '', notes: '' }
          const hasExisting = !!test.resultValue
          return (
            <Card key={test.id}>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <p className="font-semibold text-slate-900">{test.testName}</p>
                  <span className="text-xs font-mono text-slate-400">{test.testCode}</span>
                </div>
                <Badge variant={statusBadge(test.status)} size="sm">{test.status}</Badge>
              </div>

              {hasExisting && (
                <div className="mb-3 p-2 bg-success-50 border border-success-200 rounded-lg text-sm">
                  <span className="font-medium text-success-700">Current result: </span>
                  <span>{test.resultValue} {test.resultUnit}</span>
                  {test.isAbnormal && <Badge variant="danger" size="sm" className="ml-2">Abnormal</Badge>}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Input
                    label="Result Value"
                    required
                    value={draft.value}
                    onChange={(e) => updateResult(test.testId, 'value', e.target.value)}
                    placeholder={hasExisting ? test.resultValue : 'Enter result...'}
                  />
                  {test.referenceRange && (
                    <p className="text-xs text-slate-400 mt-1">Reference: {test.referenceRange}</p>
                  )}
                </div>
                <Textarea
                  label="Notes (optional)"
                  rows={2}
                  value={draft.notes}
                  onChange={(e) => updateResult(test.testId, 'notes', e.target.value)}
                  placeholder="Technician notes..."
                />
              </div>
            </Card>
          )
        })}
      </div>

      <div className="flex items-center justify-end gap-3">
        <Button variant="secondary" onClick={() => navigate(`/laboratory/orders/${id}`)}>Cancel</Button>
        <Button variant="primary" onClick={handleSubmit} loading={mutation.isPending}>
          Save Results
        </Button>
      </div>
    </div>
  )
}
