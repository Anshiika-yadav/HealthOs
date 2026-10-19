import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { AlertTriangle, Search } from 'lucide-react'
import { patientService } from '@/services/patient.service'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import type { Patient } from '@/types'

const schema = z.object({
  firstName:             z.string().min(1, 'First name is required'),
  lastName:              z.string().min(1, 'Last name is required'),
  gender:                z.enum(['male', 'female', 'other'], { required_error: 'Gender is required' }),
  dateOfBirth:           z.string().min(1, 'Date of birth is required'),
  phone:                 z.string().min(7, 'Enter a valid phone number'),
  email:                 z.string().email('Enter a valid email').optional().or(z.literal('')),
  address:               z.string().optional(),
  city:                  z.string().optional(),
  country:               z.string().optional(),
  nextOfKin:             z.string().optional(),
  nextOfKinPhone:        z.string().optional(),
  emergencyContact:      z.string().optional(),
  emergencyPhone:        z.string().optional(),
  identificationNumber:  z.string().optional(),
  identificationType:    z.string().optional(),
  insuranceProvider:     z.string().optional(),
  insuranceNumber:       z.string().optional(),
  bloodGroup:            z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export function PatientRegistration() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState('')
  const [duplicates, setDuplicates] = useState<Patient[]>([])
  const [checkDone, setCheckDone] = useState(false)

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const phone = watch('phone')

  const { refetch: checkDuplicates, isFetching: checkingDuplicates } = useQuery({
    queryKey: ['patients', 'duplicates', phone],
    queryFn: () => patientService.checkDuplicates({ phone }),
    enabled: false,
    retry: false,
  })

  const handleCheckDuplicates = async () => {
    if (!phone) return
    const { data } = await checkDuplicates()
    setDuplicates(data ?? [])
    setCheckDone(true)
  }

  const createMutation = useMutation({
    mutationFn: (values: FormValues) => patientService.create(values),
    onSuccess: (patient) => {
      toast('success', 'Patient registered', `MRN: ${patient.mrn}`)
      navigate(`/patients/${patient.id}`)
    },
    onError: (err: unknown) => {
      const msg = (err as {response?:{data?:{message?:string}}})?.response?.data?.message ?? 'Failed to create patient record'
      toast('error', 'Registration failed', msg)
    },
  })

  const onSubmit = (values: FormValues) => {
    createMutation.mutate(values)
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <PageHeader
        title="Create patient record"
        description="Search before creating to avoid duplicates."
        backHref="/patients"
        breadcrumbs={[{ label: 'Patients', href: '/patients' }, { label: 'Register' }]}
      />

      {/* Duplicate check */}
      <Card>
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Check for Existing Patient</h3>
        <div className="flex gap-2">
          <Input
            placeholder="Search by name, phone, or MRN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
            leftElement={<Search className="w-4 h-4" />}
          />
          <Button
            variant="outline"
            onClick={handleCheckDuplicates}
            loading={checkingDuplicates}
            disabled={!phone}
          >
            Check Duplicates
          </Button>
        </div>
        {checkDone && duplicates.length > 0 && (
          <div className="mt-3 p-3 bg-warning-50 border border-warning-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-warning-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-warning-800">Possible duplicates found</p>
                <ul className="mt-2 space-y-1">
                  {duplicates.map((p) => (
                    <li key={p.id} className="flex items-center justify-between text-sm text-warning-700">
                      <span>{p.fullName} · MRN: {p.mrn} · {p.phone}</span>
                      <Button variant="ghost" size="xs" onClick={() => navigate(`/patients/${p.id}`)}>
                        View
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
        {checkDone && duplicates.length === 0 && (
          <p className="mt-2 text-sm text-success-600">No duplicates found. Safe to create a new record.</p>
        )}
      </Card>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="space-y-4">
          {/* Personal Information */}
          <Card>
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Personal Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input {...register('firstName')} label="First Name" required error={errors.firstName?.message} />
              <Input {...register('lastName')} label="Last Name" required error={errors.lastName?.message} />
              <Select
                {...register('gender')}
                label="Gender"
                required
                options={[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }, { value: 'other', label: 'Other' }]}
                placeholder="Select gender"
                error={errors.gender?.message}
              />
              <Input {...register('dateOfBirth')} label="Date of Birth" type="date" required error={errors.dateOfBirth?.message} />
              <Input {...register('bloodGroup')} label="Blood Group" placeholder="e.g. O+" />
            </div>
          </Card>

          {/* Contact Information */}
          <Card>
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Contact Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input {...register('phone')} label="Phone" type="tel" required error={errors.phone?.message} placeholder="+1 234 567 8901" />
              <Input {...register('email')} label="Email" type="email" error={errors.email?.message} placeholder="patient@email.com" />
              <Input {...register('address')} label="Address" className="sm:col-span-2" />
              <Input {...register('city')} label="City" />
              <Input {...register('country')} label="Country" />
            </div>
          </Card>

          {/* Emergency Contacts */}
          <Card>
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Emergency Contacts</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input {...register('nextOfKin')} label="Next of Kin" />
              <Input {...register('nextOfKinPhone')} label="Next of Kin Phone" type="tel" />
              <Input {...register('emergencyContact')} label="Emergency Contact Name" />
              <Input {...register('emergencyPhone')} label="Emergency Contact Phone" type="tel" />
            </div>
          </Card>

          {/* Identification */}
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
            <Button variant="secondary" type="button" onClick={() => navigate('/patients')}>Cancel</Button>
            <Button variant="primary" type="submit" loading={isSubmitting || createMutation.isPending}>
              Register Patient
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
