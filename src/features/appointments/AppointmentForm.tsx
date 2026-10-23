import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { appointmentService } from '@/services/appointment.service'
import { patientService } from '@/services/patient.service'
import { settingsService } from '@/services/settings.service'
import { userService } from '@/services/user.service'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { SkeletonCard } from '@/components/feedback/LoadingSkeleton'
import type { AppointmentType } from '@/types'
import { Search } from 'lucide-react'

const schema = z.object({
  patientId: z.string().min(1, 'Patient is required'),
  providerId: z.string().min(1, 'Provider is required'),
  departmentId: z.string().min(1, 'Department is required'),
  date: z.string().min(1, 'Date is required'),
  time: z.string().min(1, 'Time is required'),
  duration: z.coerce.number().min(5, 'Min 5 minutes').max(480),
  type: z.enum(['consultation', 'follow_up', 'procedure', 'emergency', 'other']),
  reason: z.string().min(3, 'Reason is required'),
  notes: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

export function AppointmentForm() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const qc = useQueryClient()
  const [searchParams] = useSearchParams()
  const presetPatientId = searchParams.get('patientId') ?? ''
  const [patientSearch, setPatientSearch] = useState('')

  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: () => settingsService.listDepartments(),
  })

  const { data: providers } = useQuery({
    queryKey: ['users', { role: 'doctor' }],
    queryFn: () => userService.list({ role: 'doctor', pageSize: 100 }),
  })

  const { data: patients } = useQuery({
    queryKey: ['patients', 'search', patientSearch],
    queryFn: () => patientService.list({ search: patientSearch, pageSize: 10 }),
    enabled: patientSearch.length >= 2,
  })

  const { data: presetPatient } = useQuery({
    queryKey: ['patient', presetPatientId],
    queryFn: () => patientService.get(presetPatientId),
    enabled: !!presetPatientId,
  })

  const { register, handleSubmit, setValue, watch, control, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      patientId: presetPatientId,
      duration: 30,
      type: 'consultation',
    },
  })

  useEffect(() => {
    if (presetPatientId) setValue('patientId', presetPatientId)
  }, [presetPatientId, setValue])

  const selectedPatientId = watch('patientId')
  const selectedPatient = presetPatient ?? patients?.data.find(p => p.id === selectedPatientId)

  const mutation = useMutation({
    mutationFn: (data: FormValues) => appointmentService.create(data),
    onSuccess: (appt) => {
      toast('success', 'Appointment booked', `Scheduled for ${appt.date} at ${appt.time}`)
      qc.invalidateQueries({ queryKey: ['appointments'] })
      navigate('/appointments')
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to book appointment. The slot may be unavailable.'
      toast('error', 'Booking failed', msg)
    },
  })

  return (
    <div className="space-y-5 max-w-2xl">
      <PageHeader
        title="Schedule appointment"
        backHref="/appointments"
        breadcrumbs={[{ label: 'Appointments', href: '/appointments' }, { label: 'New' }]}
      />

      <form onSubmit={handleSubmit(d => mutation.mutate(d))} noValidate className="space-y-4">
        {/* Patient */}
        <Card>
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Patient</h3>
          {presetPatientId && presetPatient ? (
            <div className="flex items-center gap-3 p-3 bg-primary-50 border border-primary-200 rounded-lg">
              <div className="w-9 h-9 rounded-full bg-primary-200 flex items-center justify-center font-bold text-primary-700 text-sm">
                {presetPatient.firstName[0]}{presetPatient.lastName[0]}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">{presetPatient.fullName}</p>
                <p className="text-xs text-slate-500">MRN: {presetPatient.mrn} · {presetPatient.phone}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Input
                label="Search patient"
                placeholder="Type name, MRN or phone..."
                leftElement={<Search className="w-4 h-4" />}
                value={patientSearch}
                onChange={e => setPatientSearch(e.target.value)}
              />
              {patients && patients.data.length > 0 && (
                <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-44 overflow-y-auto">
                  {patients.data.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => { setValue('patientId', p.id); setPatientSearch(p.fullName) }}
                      className={`w-full text-left px-3 py-2 hover:bg-slate-50 text-sm transition-colors ${selectedPatientId === p.id ? 'bg-primary-50' : ''}`}
                    >
                      <span className="font-medium text-slate-900">{p.fullName}</span>
                      <span className="text-slate-400 ml-2">MRN: {p.mrn}</span>
                    </button>
                  ))}
                </div>
              )}
              {errors.patientId && <p className="text-xs text-danger-600">{errors.patientId.message}</p>}
            </div>
          )}
        </Card>

        {/* Schedule */}
        <Card>
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Appointment Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Controller
              name="departmentId"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  label="Department"
                  required
                  options={(departments ?? []).map(d => ({ value: d.id, label: d.name }))}
                  placeholder="Select department"
                  error={errors.departmentId?.message}
                />
              )}
            />
            <Controller
              name="providerId"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  label="Provider"
                  required
                  options={(providers?.data ?? []).map(u => ({ value: u.id, label: u.name }))}
                  placeholder="Select provider"
                  error={errors.providerId?.message}
                />
              )}
            />
            <Input
              {...register('date')}
              label="Date"
              type="date"
              required
              error={errors.date?.message}
              min={new Date().toISOString().split('T')[0]}
            />
            <Input
              {...register('time')}
              label="Time"
              type="time"
              required
              error={errors.time?.message}
            />
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  label="Type"
                  required
                  options={[
                    { value: 'consultation', label: 'Consultation' },
                    { value: 'follow_up', label: 'Follow-up' },
                    { value: 'procedure', label: 'Procedure' },
                    { value: 'emergency', label: 'Emergency' },
                    { value: 'other', label: 'Other' },
                  ]}
                  error={errors.type?.message}
                />
              )}
            />
            <Input
              {...register('duration')}
              label="Duration (minutes)"
              type="number"
              min={5}
              max={480}
              error={errors.duration?.message}
            />
          </div>
          <div className="mt-4">
            <Input
              {...register('reason')}
              label="Reason for visit"
              required
              placeholder="Brief description of the visit reason"
              error={errors.reason?.message}
            />
          </div>
          <div className="mt-4">
            <Textarea
              {...register('notes')}
              label="Additional notes"
              rows={2}
              placeholder="Optional notes for the provider"
            />
          </div>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Button variant="secondary" type="button" onClick={() => navigate('/appointments')}>Cancel</Button>
          <Button variant="primary" type="submit" loading={isSubmitting || mutation.isPending}>
            Book Appointment
          </Button>
        </div>
      </form>
    </div>
  )
}
