import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Package, AlertTriangle, Clock, CheckCircle } from 'lucide-react'
import { pharmacyService } from '@/services/pharmacy.service'
import { PageHeader } from '@/components/layout/PageHeader'
import { MetricCard } from '@/components/ui/Card'
import { Badge, statusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { SkeletonTable } from '@/components/feedback/LoadingSkeleton'
import { EmptyState } from '@/components/feedback/EmptyState'
import { formatDate } from '@/utils/format'
import type { Prescription } from '@/types'

export function PharmacyDashboard() {
  const { toast } = useToast()
  const qc = useQueryClient()
  const [confirmDispense, setConfirmDispense] = useState<Prescription | null>(null)

  const { data: pending, isLoading, refetch } = useQuery({
    queryKey: ['prescriptions', 'pending'],
    queryFn: () => pharmacyService.listPrescriptions({ status: 'active', pageSize: 50 }),
    refetchInterval: 30_000,
  })

  const dispenseMutation = useMutation({
    mutationFn: (rx: Prescription) =>
      pharmacyService.dispense(rx.id, rx.items.map((item) => ({ itemId: item.id, quantity: item.quantity ?? 1 }))),
    onSuccess: () => {
      toast('success', 'Dispensed', 'Medication dispensed successfully.')
      qc.invalidateQueries({ queryKey: ['prescriptions'] })
      setConfirmDispense(null)
    },
    onError: () => toast('error', 'Dispense failed', 'Check stock availability.'),
  })

  const pendingCount = pending?.data.filter((p) => p.status === 'active').length ?? 0
  const partialCount = pending?.data.filter((p) => p.status === 'partially_dispensed').length ?? 0

  return (
    <div className="space-y-5">
      <PageHeader
        title="Pharmacy worklist"
        description="Dispense medications safely."
        breadcrumbs={[{ label: 'Pharmacy' }]}
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricCard title="Pending Prescriptions" value={pendingCount} icon={<Clock className="w-5 h-5" />} variant="warning" />
        <MetricCard title="Partially Filled" value={partialCount} icon={<Package className="w-5 h-5" />} variant="primary" />
        <MetricCard title="Dispensed Today" value={0} icon={<CheckCircle className="w-5 h-5" />} variant="success" />
        <MetricCard title="Stock Alerts" value={0} icon={<AlertTriangle className="w-5 h-5" />} variant="danger" />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-900">Prescription Queue</h3>
        </div>

        {isLoading ? <SkeletonTable rows={5} cols={5} /> : (
          pending?.data.length === 0 ? (
            <EmptyState icon={<Package className="w-6 h-6" />} title="No pending prescriptions" />
          ) : (
            <div className="divide-y divide-slate-100">
              {pending?.data.map((rx) => (
                <div key={rx.id} className="px-5 py-4 flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-900">{rx.patientName}</p>
                      <span className="text-xs text-slate-500">MRN: {rx.patientMrn}</span>
                      <Badge variant={statusBadge(rx.status)} dot size="sm">{rx.status.replace(/_/g,' ')}</Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">Prescribed by {rx.prescriberName} · {formatDate(rx.createdAt)}</p>
                    <div className="mt-2 space-y-1">
                      {rx.items.map((item) => (
                        <div key={item.id} className="text-sm text-slate-700">
                          <span className="font-medium">{item.drugName}</span>{' '}
                          <span className="text-slate-500">{item.dosage} · {item.frequency} · {item.duration}</span>
                          {item.instructions && <span className="text-xs text-slate-400 ml-2">({item.instructions})</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setConfirmDispense(rx)}
                      disabled={rx.status === 'dispensed'}
                    >
                      Dispense
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      <ConfirmDialog
        isOpen={!!confirmDispense}
        onClose={() => setConfirmDispense(null)}
        onConfirm={() => confirmDispense && dispenseMutation.mutate(confirmDispense)}
        title="Confirm dispensing?"
        message={`Dispense all items in this prescription for ${confirmDispense?.patientName}? Verify stock levels before confirming.`}
        confirmLabel="Dispense Medication"
        variant="primary"
        loading={dispenseMutation.isPending}
      />
    </div>
  )
}
