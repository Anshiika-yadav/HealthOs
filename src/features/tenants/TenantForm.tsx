import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tenantService } from '@/services/tenant.service'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { SkeletonCard } from '@/components/feedback/LoadingSkeleton'

const schema = z.object({
  name: z.string().min(2, 'Hospital name is required'),
  code: z.string().min(2, 'Hospital code is required').max(20),
  email: z.string().email('Valid email required'),
  phone: z.string().min(7, 'Phone is required'),
  address: z.string().min(3, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  country: z.string().min(1, 'Country is required'),
  timezone: z.string().min(1, 'Timezone is required'),
  currency: z.string().min(1, 'Currency is required'),
  website: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

const TIMEZONES = [
  { value: 'Africa/Lagos', label: 'Africa/Lagos (WAT)' },
  { value: 'Africa/Nairobi', label: 'Africa/Nairobi (EAT)' },
  { value: 'Africa/Accra', label: 'Africa/Accra (GMT)' },
  { value: 'Africa/Johannesburg', label: 'Africa/Johannesburg (SAST)' },
  { value: 'Europe/London', label: 'Europe/London (GMT)' },
  { value: 'America/New_York', label: 'America/New_York (EST)' },
  { value: 'America/Chicago', label: 'America/Chicago (CST)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST)' },
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (GST)' },
]

const CURRENCIES = [
  { value: 'USD', label: 'USD — US Dollar' },
  { value: 'NGN', label: 'NGN — Nigerian Naira' },
  { value: 'KES', label: 'KES — Kenyan Shilling' },
  { value: 'GHS', label: 'GHS — Ghanaian Cedi' },
  { value: 'ZAR', label: 'ZAR — South African Rand' },
  { value: 'GBP', label: 'GBP — British Pound' },
  { value: 'EUR', label: 'EUR — Euro' },
  { value: 'INR', label: 'INR — Indian Rupee' },
  { value: 'AED', label: 'AED — UAE Dirham' },
]

export function TenantForm() {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const qc = useQueryClient()
  const isEdit = !!id

  const { data: existing, isLoading } = useQuery({
    queryKey: ['tenant', id],
    queryFn: () => tenantService.get(id!),
    enabled: isEdit,
  })

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { timezone: 'Africa/Lagos', currency: 'USD' },
  })

  useEffect(() => {
    if (existing) {
      reset({
        name: existing.name,
        code: existing.code,
        email: existing.email,
        phone: existing.phone,
        address: existing.address,
        city: existing.city,
        country: existing.country,
        timezone: existing.timezone,
        currency: existing.currency,
        website: existing.website ?? '',
      })
    }
  }, [existing, reset])

  const createMutation = useMutation({
    mutationFn: (data: FormValues) => tenantService.create(data),
    onSuccess: (tenant) => {
      toast('success', 'Hospital registered', `${tenant.name} has been created.`)
      qc.invalidateQueries({ queryKey: ['tenants'] })
      navigate(`/admin/tenants/${tenant.id}`)
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to register hospital'
      toast('error', 'Registration failed', msg)
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: FormValues) => tenantService.update(id!, data),
    onSuccess: () => {
      toast('success', 'Hospital updated')
      qc.invalidateQueries({ queryKey: ['tenant', id] })
      navigate(`/admin/tenants/${id}`)
    },
    onError: () => toast('error', 'Failed to update hospital'),
  })

  const onSubmit = (data: FormValues) => {
    if (isEdit) updateMutation.mutate(data)
    else createMutation.mutate(data)
  }

  if (isEdit && isLoading) return <SkeletonCard lines={8} />

  return (
    <div className="max-w-2xl space-y-5">
      <PageHeader
        title={isEdit ? 'Edit hospital' : 'Register hospital'}
        description={isEdit ? 'Update hospital information.' : 'Add a new hospital to the platform.'}
        backHref={isEdit ? `/admin/tenants/${id}` : '/admin/tenants'}
        breadcrumbs={[
          { label: 'Hospitals', href: '/admin/tenants' },
          { label: isEdit ? 'Edit' : 'Register' },
        ]}
      />

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="space-y-4">
          <Card>
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Hospital Identity</h3>
            <div className="space-y-4">
              <Input {...register('name')} label="Legal Hospital Name" required error={errors.name?.message} placeholder="e.g. City General Hospital" />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  {...register('code')}
                  label="Hospital Code"
                  required
                  error={errors.code?.message}
                  placeholder="e.g. CGH-001"
                  hint={isEdit ? 'Changing this code may affect existing integrations' : 'Unique short code for this hospital'}
                />
                <Input {...register('website')} label="Website" type="url" placeholder="https://hospital.com" />
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Contact Information</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Input {...register('email')} label="Primary Email" type="email" required error={errors.email?.message} />
                <Input {...register('phone')} label="Phone" type="tel" required error={errors.phone?.message} />
              </div>
              <Input {...register('address')} label="Address" required error={errors.address?.message} />
              <div className="grid grid-cols-2 gap-3">
                <Input {...register('city')} label="City" required error={errors.city?.message} />
                <Input {...register('country')} label="Country" required error={errors.country?.message} />
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Regional Settings</h3>
            <div className="grid grid-cols-2 gap-4">
              <Select
                {...register('timezone')}
                label="Timezone"
                required
                options={TIMEZONES}
                error={errors.timezone?.message}
              />
              <Select
                {...register('currency')}
                label="Currency"
                required
                options={CURRENCIES}
                error={errors.currency?.message}
              />
            </div>
          </Card>

          <div className="flex items-center justify-end gap-3">
            <Button
              variant="secondary" type="button"
              onClick={() => navigate(isEdit ? `/admin/tenants/${id}` : '/admin/tenants')}
            >
              Cancel
            </Button>
            <Button
              variant="primary" type="submit"
              loading={isSubmitting || createMutation.isPending || updateMutation.isPending}
            >
              {isEdit ? 'Save Changes' : 'Register Hospital'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
