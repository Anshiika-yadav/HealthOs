import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { pharmacyService } from '@/services/pharmacy.service'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge, statusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { SkeletonCard } from '@/components/feedback/LoadingSkeleton'
import { ErrorState } from '@/components/feedback/EmptyState'
import { formatDate, formatDateTime } from '@/utils/format'
import { ClipboardList, Package, CheckCircle, XCircle, User } from 'lucide-react'
import type { Dispense } from '@/services/pharmacy.service'

export function PrescriptionDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const qc = useQueryClient()
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [confirmDispense, setConfirmDispense] = useState(false)

  const { data: rx, isLoading, isError, refetch } = useQuery({
    queryKey: ['prescription', id],
    queryFn: () => pharmacyService.getPrescription(id!),
    enabled: !!id,
  })

  const { data: dispenses } = useQuery({
    queryKey: ['dispenses', id],
    queryFn: () => pharmacyService.getDispenses(id!),
    enabled: !!id,
  })

  const cancelMutation = useMutation({
    mutationFn: () => pharmacyService.cancelPrescription(id!),
    onSuccess: () => {
      toast('success', 'Prescription cancelled')
      qc.invalidateQueries({ queryKey: ['prescription', id] })
      setConfirmCancel(false)
    },
    onError: () => toast('error', 'Failed to cancel prescription'),
  })

  const dispenseMutation = useMutation({
    mutationFn: () =>
      pharmacyService.dispense(
        id!,
        rx!.items.map((item) => ({ itemId: item.id, quantity: item.quantity ?? 1 }))
      ),
    onSuccess: () => {
      toast('success', 'Medication dispensed')
      qc.invalidateQueries({ queryKey: ['prescription', id] })
      qc.invalidateQueries({ queryKey: ['dispenses', id] })
      setConfirmDispense(false)
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Dispense failed. Check stock availability.'
      toast('error', 'Dispense failed', msg)
    },
  })

  if (isLoading) return <SkeletonCard lines={8} />
  if (isError || !rx) return <ErrorState onRetry={refetch} />

  const isActive = rx.status === 'active' || rx.status === 'partially_dispensed'
  const isCancellable = ['draft', 'active'].includes(rx.status)

  return (
    <div className="space-y-5 max-w-3xl">
      <PageHeader
        title="Prescription detail"
        backHref="/prescriptions"
        breadcrumbs={[{ label: 'Prescriptions', href: '/prescriptions' }, { label: 'Detail' }]}
        actions={
          <div className="flex gap-2 flex-wrap">
            <Badge variant={statusBadge(rx.status)} dot>
              {rx.status.replace(/_/g, ' ')}
            </Badge>
            {isActive && (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Package className="w-4 h-4" />}
                onClick={() => setConfirmDispense(true)}
              >
                Dispense
              </Button>
            )}
            {isCancellable && (
              <Button
                variant="ghost"
                size="sm"
                className="text-danger-600"
                leftIcon={<XCircle className="w-4 h-4" />}
                onClick={() => setConfirmCancel(true)}
              >
                Cancel
              </Button>
            )}
          </div>
        }
      />

      {/* Header info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Patient</h3>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center font-bold text-primary-700 text-sm">
              {rx.patientName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
            </div>
            <div>
              <p className="font-semibold text-slate-900">{rx.patientName}</p>
              <p className="text-xs text-slate-500">MRN: {rx.patientMrn}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="xs"
            className="mt-2"
            onClick={() => navigate(`/patients/${rx.patientId}`)}
          >
            View patient profile →
          </Button>
        </Card>
        <Card>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Prescriber</h3>
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-medium text-slate-900">{rx.prescriberName}</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">Prescribed: {formatDate(rx.createdAt)}</p>
          {rx.encounterId && (
            <Button
              variant="ghost"
              size="xs"
              className="mt-1"
              onClick={() => navigate(`/encounters/${rx.encounterId}`)}
            >
              View encounter →
            </Button>
          )}
        </Card>
      </div>

      {/* Medications */}
      <Card>
        <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-primary-500" /> Medications
        </h3>
        <div className="space-y-4">
          {rx.items.map((item, idx) => (
            <div
              key={item.id}
              className="p-4 bg-slate-50 rounded-xl border border-slate-200"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="font-semibold text-slate-900">{item.drugName}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-slate-600">
                    <span>Dosage: <strong>{item.dosage}</strong></span>
                    <span>Frequency: <strong>{item.frequency.replace(/_/g, ' ')}</strong></span>
                    <span>Duration: <strong>{item.duration}</strong></span>
                    <span>Route: <strong>{item.route}</strong></span>
                    {item.quantity && <span>Qty: <strong>{item.quantity}</strong></span>}
                  </div>
                  {item.instructions && (
                    <p className="text-xs text-slate-500 mt-1 italic">"{item.instructions}"</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  {item.substitutionAllowed
                    ? <Badge variant="outline" size="sm">Sub. allowed</Badge>
                    : <Badge variant="danger" size="sm">No substitution</Badge>
                  }
                  {item.refills > 0 && (
                    <Badge variant="info" size="sm">{item.refills} refill{item.refills !== 1 ? 's' : ''}</Badge>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        {rx.notes && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Notes</p>
            <p className="text-sm text-slate-700">{rx.notes}</p>
          </div>
        )}
      </Card>

      {/* Dispensing history */}
      <Card>
        <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Package className="w-4 h-4 text-primary-500" /> Dispensing History
        </h3>
        {rx.dispensedAt && (
          <p className="text-xs text-success-600 mb-3 flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5" />
            Fully dispensed on {formatDateTime(rx.dispensedAt)} by {rx.dispensedBy}
          </p>
        )}
        {(dispenses?.length ?? 0) === 0 ? (
          <p className="text-sm text-slate-400">No dispensing records yet.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {(dispenses as Dispense[]).map((d) => (
              <div key={d.id} className="py-3 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900">{d.drugName}</p>
                  <p className="text-xs text-slate-500">
                    Qty dispensed: <strong>{d.quantityDispensed}</strong> · {d.dispensedByName} · {formatDateTime(d.dispensedAt)}
                  </p>
                  {d.notes && <p className="text-xs text-slate-400 italic mt-0.5">{d.notes}</p>}
                </div>
                <Badge variant="success" size="sm">Dispensed</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>

      <ConfirmDialog
        isOpen={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        onConfirm={() => cancelMutation.mutate()}
        title="Cancel prescription?"
        message="Cancelling this prescription will prevent it from being dispensed. This action is final."
        confirmLabel="Cancel Prescription"
        variant="danger"
        loading={cancelMutation.isPending}
      />

      <ConfirmDialog
        isOpen={confirmDispense}
        onClose={() => setConfirmDispense(false)}
        onConfirm={() => dispenseMutation.mutate()}
        title="Dispense medication?"
        message={`Dispense all items in this prescription for ${rx.patientName}? Verify stock availability before confirming. Stock will be updated by the server.`}
        confirmLabel="Confirm Dispense"
        variant="primary"
        loading={dispenseMutation.isPending}
      />
    </div>
  )
}
