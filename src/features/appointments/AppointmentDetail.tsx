import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { appointmentService } from '@/services/appointment.service'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge, statusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Modal, ConfirmDialog } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { SkeletonCard } from '@/components/feedback/LoadingSkeleton'
import { ErrorState } from '@/components/feedback/EmptyState'
import { formatDate, formatDateTime } from '@/utils/format'
import { Calendar, User, Clock, MapPin, Stethoscope, UserCheck } from 'lucide-react'

const rescheduleSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  time: z.string().min(1, 'Time is required'),
  reason: z.string().optional(),
})
type RescheduleValues = z.infer<typeof rescheduleSchema>

export function AppointmentDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const qc = useQueryClient()
  const [showReschedule, setShowReschedule] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [confirmNoShow, setConfirmNoShow] = useState(false)

  const { data: appt, isLoading, isError, refetch } = useQuery({
    queryKey: ['appointment', id],
    queryFn: () => appointmentService.get(id!),
    enabled: !!id,
  })

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RescheduleValues>({
    resolver: zodResolver(rescheduleSchema),
  })

  const checkInMutation = useMutation({
    mutationFn: () => appointmentService.checkIn(id!),
    onSuccess: () => { toast('success', 'Patient checked in'); qc.invalidateQueries({ queryKey: ['appointment', id] }) },
    onError: () => toast('error', 'Check-in failed'),
  })

  const cancelMutation = useMutation({
    mutationFn: () => appointmentService.cancel(id!),
    onSuccess: () => {
      toast('success', 'Appointment cancelled')
      qc.invalidateQueries({ queryKey: ['appointment', id] })
      setConfirmCancel(false)
    },
    onError: () => toast('error', 'Cancellation failed'),
  })

  const noShowMutation = useMutation({
    mutationFn: () => appointmentService.noShow(id!),
    onSuccess: () => {
      toast('success', 'Marked as no-show')
      qc.invalidateQueries({ queryKey: ['appointment', id] })
      setConfirmNoShow(false)
    },
    onError: () => toast('error', 'Failed to mark no-show'),
  })

  const rescheduleMutation = useMutation({
    mutationFn: (data: RescheduleValues) => appointmentService.reschedule(id!, data),
    onSuccess: () => {
      toast('success', 'Appointment rescheduled')
      qc.invalidateQueries({ queryKey: ['appointment', id] })
      setShowReschedule(false)
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Could not reschedule. The slot may be unavailable.'
      toast('error', 'Reschedule failed', msg)
    },
  })

  if (isLoading) return <SkeletonCard lines={8} />
  if (isError || !appt) return <ErrorState onRetry={refetch} />

  const canCheckIn = ['scheduled', 'confirmed'].includes(appt.status)
  const canCancel = ['scheduled', 'confirmed'].includes(appt.status)
  const canReschedule = ['scheduled', 'confirmed'].includes(appt.status)
  const canNoShow = ['scheduled', 'confirmed', 'checked_in'].includes(appt.status)

  return (
    <div className="space-y-5 max-w-2xl">
      <PageHeader
        title="Appointment detail"
        backHref="/appointments"
        breadcrumbs={[{ label: 'Appointments', href: '/appointments' }, { label: 'Detail' }]}
        actions={
          <>
            <Badge variant={statusBadge(appt.status)} dot>{appt.status.replace(/_/g, ' ')}</Badge>
            {canCheckIn && (
              <Button variant="success" size="sm" leftIcon={<UserCheck className="w-4 h-4" />}
                loading={checkInMutation.isPending} onClick={() => checkInMutation.mutate()}>
                Check In
              </Button>
            )}
            {canReschedule && (
              <Button variant="outline" size="sm" onClick={() => setShowReschedule(true)}>Reschedule</Button>
            )}
            {canCancel && (
              <Button variant="danger" size="sm" onClick={() => setConfirmCancel(true)}>Cancel</Button>
            )}
          </>
        }
      />

      <Card>
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Patient</h3>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center font-bold text-primary-700">
            {appt.patientName.split(' ').map(n => n[0]).join('').slice(0,2)}
          </div>
          <div>
            <p className="font-semibold text-slate-900">{appt.patientName}</p>
            <p className="text-sm text-slate-500">MRN: {appt.patientMrn}</p>
          </div>
          <Button variant="ghost" size="xs" className="ml-auto" onClick={() => navigate(`/patients/${appt.patientId}`)}>
            View Profile
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Schedule</h3>
          <dl className="space-y-3 text-sm">
            <DetailRow icon={<Calendar className="w-4 h-4" />} label="Date" value={formatDate(appt.date)} />
            <DetailRow icon={<Clock className="w-4 h-4" />} label="Time" value={appt.time} />
            <DetailRow icon={<Clock className="w-4 h-4" />} label="Duration" value={`${appt.duration} min`} />
            <DetailRow icon={<Stethoscope className="w-4 h-4" />} label="Type" value={appt.type.replace(/_/g,' ')} />
          </dl>
        </Card>
        <Card>
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Provider</h3>
          <dl className="space-y-3 text-sm">
            <DetailRow icon={<User className="w-4 h-4" />} label="Provider" value={appt.providerName} />
            <DetailRow icon={<MapPin className="w-4 h-4" />} label="Department" value={appt.departmentName} />
            <DetailRow icon={<MapPin className="w-4 h-4" />} label="Branch" value={appt.branchName} />
            {appt.queueNumber && <DetailRow icon={<Clock className="w-4 h-4" />} label="Queue #" value={String(appt.queueNumber)} />}
          </dl>
        </Card>
      </div>

      <Card>
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Reason for Visit</h3>
        <p className="text-sm text-slate-700">{appt.reason}</p>
        {appt.notes && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <p className="text-xs text-slate-500 mb-1">Notes</p>
            <p className="text-sm text-slate-700">{appt.notes}</p>
          </div>
        )}
        {appt.checkedInAt && (
          <p className="text-xs text-success-600 mt-3">✓ Checked in at {formatDateTime(appt.checkedInAt)}</p>
        )}
      </Card>

      {canNoShow && (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" className="text-warning-600"
            onClick={() => setConfirmNoShow(true)}>
            Mark No-Show
          </Button>
        </div>
      )}

      {/* Reschedule Modal */}
      <Modal
        isOpen={showReschedule}
        onClose={() => setShowReschedule(false)}
        title="Reschedule Appointment"
        description="Choose a new date and time. The backend will check availability."
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowReschedule(false)}>Cancel</Button>
            <Button variant="primary" form="reschedule-form" type="submit" loading={isSubmitting || rescheduleMutation.isPending}>
              Reschedule
            </Button>
          </>
        }
      >
        <form id="reschedule-form" onSubmit={handleSubmit(d => rescheduleMutation.mutate(d))} noValidate className="space-y-4">
          <Input {...register('date')} label="New Date" type="date" required
            min={new Date().toISOString().split('T')[0]} error={errors.date?.message} />
          <Input {...register('time')} label="New Time" type="time" required error={errors.time?.message} />
          <Textarea {...register('reason')} label="Reason for rescheduling" rows={2} />
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        onConfirm={() => cancelMutation.mutate()}
        title="Cancel appointment?"
        message={`Cancel the appointment for ${appt.patientName} on ${formatDate(appt.date)} at ${appt.time}?`}
        confirmLabel="Cancel Appointment"
        variant="danger"
        loading={cancelMutation.isPending}
      />

      <ConfirmDialog
        isOpen={confirmNoShow}
        onClose={() => setConfirmNoShow(false)}
        onConfirm={() => noShowMutation.mutate()}
        title="Mark as no-show?"
        message={`Mark ${appt.patientName}'s appointment as a no-show?`}
        confirmLabel="Mark No-Show"
        variant="warning"
        loading={noShowMutation.isPending}
      />
    </div>
  )
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-slate-400 flex-shrink-0">{icon}</span>
      <span className="text-slate-500 min-w-[90px]">{label}</span>
      <span className="text-slate-900 font-medium capitalize">{value}</span>
    </div>
  )
}
