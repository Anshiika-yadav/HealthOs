import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { patientService } from '@/services/patient.service'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { SkeletonCard } from '@/components/feedback/LoadingSkeleton'

const schema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  gender: z.enum(['male', 'female', 'other']),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  phone: z.string().min(7, 'Phone is required'),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  nextOfKin: z.string().optional(),
  nextOfKinPhone: z.string().optional(),
  emergencyContact: z.string().optional(),
  emergencyPhone: z.string().optional(),
  identificationNumber: z.string().optional(),
  identificationType: z.string().optional(),
  insuranceProvider: z.string().optional(),
  insuranceNumber: z.string().optional(),
  bloodGroup: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

export function PatientEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const qc = useQueryClient()

  const { data: patient, isLoading } = useQuery({
    queryKey: ['patient', id],
    queryFn: () => patientService.get(id!),
    enabled: !!id,
  })

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    if (patient) {
      reset({
        firstName: patient.firstName,
        lastName: patient.lastName,
        gender: patient.gender,
        dateOfBirth: patient.dateOfBirth,
        phone: patient.phone,
        email: patient.email ?? '',
        address: patient.address ?? '',
        city: patient.city ?? '',
        country: patient.country ?? '',
        nextOfKin: patient.nextOfKin ?? '',
        nextOfKinPhone: patient.nextOfKinPhone ?? '',
        emergencyContact: patient.emergencyContact ?? '',
        emergencyPhone: patient.emergencyPhone ?? '',
        identificationNumber: patient.identificationNumber ?? '',
        identificationType: patient.identificationType ?? '',
        insuranceProvider: patient.insuranceProvider ?? '',
        insuranceNumber: patient.insuranceNumber ?? '',
        bloodGroup: patient.bloodGroup ?? '',
      })
    }
  }, [patient, reset])

  const mutation = useMutation({
    mutationFn: (data: FormValues) => patientService.update(id!, data),
    onSuccess: () => {
      toast('success', 'Patient record updated')
      qc.invalidateQueries({ queryKey: ['patient', id] })
      navigate(`/patients/${id}`)
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to update patient record'
      toast('error', 'Update failed', msg)
    },
  })

  if (isLoading) return <SkeletonCard lines={8} />

  return (
    <div className="space-y-5 max-w-3xl">
      <PageHeader
        title="Edit patient"
        description={patient ? `MRN: ${patient.mrn}` : ''}
        backHref={`/patients/${id}`}
        breadcrumbs={[
          { label: 'Patients', href: '/patients' },
          { label: patient?.fullName ?? '...', href: `/patients/${id}` },
          { label: 'Edit' },
        ]}
      />

      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} noValidate>
        <div className="space-y-4">
          <Card>
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Personal Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input {...register('firstName')} label="First Name" required error={errors.firstName?.message} />
              <Input {...register('lastName')} label="Last Name" required error={errors.lastName?.message} />
              <Select
                {...register('gender')}
                label="Gender"
                required
                options={[
                  { value: 'male', label: 'Male' },
                  { value: 'female', label: 'Female' },
                  { value: 'other', label: 'Other' },
                ]}
                error={errors.gender?.message}
              />
              <Input {...register('dateOfBirth')} label="Date of Birth" type="date" required error={errors.dateOfBirth?.message} />
              <Input {...register('bloodGroup')} label="Blood Group" placeholder="e.g. O+" />
            </div>
          </Card>

          <Card>
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Contact Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input {...register('phone')} label="Phone" type="tel" required error={errors.phone?.message} />
              <Input {...register('email')} label="Email" type="email" />
              <Input {...register('address')} label="Address" className="sm:col-span-2" />
              <Input {...register('city')} label="City" />
              <Input {...register('country')} label="Country" />
            </div>
          </Card>

          <Card>
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Emergency Contacts</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input {...register('nextOfKin')} label="Next of Kin" />
              <Input {...register('nextOfKinPhone')} label="Next of Kin Phone" type="tel" />
              <Input {...register('emergencyContact')} label="Emergency Contact Name" />
              <Input {...register('emergencyPhone')} label="Emergency Contact Phone" type="tel" />
            </div>
          </Card>

          <Card>
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Identification & Insurance</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                {...register('identificationType')}
                label="ID Type"
                options={[
                  { value: 'national_id', label: 'National ID' },
                  { value: 'passport', label: 'Passport' },
                  { value: 'drivers_license', label: "Driver's License" },
                  { value: 'other', label: 'Other' },
                ]}
                placeholder="Select type"
              />
              <Input {...register('identificationNumber')} label="ID Number" />
              <Input {...register('insuranceProvider')} label="Insurance Provider" />
              <Input {...register('insuranceNumber')} label="Insurance Policy #" />
            </div>
          </Card>

          <div className="flex items-center justify-end gap-3">
            <Button variant="secondary" type="button" onClick={() => navigate(`/patients/${id}`)}>Cancel</Button>
            <Button variant="primary" type="submit" loading={isSubmitting || mutation.isPending}>
              Save Changes
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
