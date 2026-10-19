import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { authService } from '@/services/auth.service'
import { useAuth } from './AuthContext'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/components/ui/Toast'
import { getInitials } from '@/utils/format'
import { Eye, EyeOff } from 'lucide-react'

const pwdSchema = z.object({
  currentPassword: z.string().min(1, 'Current password required'),
  newPassword: z.string().min(8, 'Min 8 characters'),
  confirmPassword: z.string().min(1, 'Confirm your password'),
}).refine((d) => d.newPassword === d.confirmPassword, { message: 'Passwords do not match', path: ['confirmPassword'] })

type PwdValues = z.infer<typeof pwdSchema>

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin', hospital_owner: 'Hospital Owner', hospital_admin: 'Hospital Admin',
  receptionist: 'Receptionist', doctor: 'Doctor', nurse: 'Nurse',
  cashier: 'Cashier', pharmacist: 'Pharmacist', lab_technician: 'Lab Technician',
  inventory_officer: 'Inventory Officer', auditor: 'Auditor',
}

export function ProfilePage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<PwdValues>({
    resolver: zodResolver(pwdSchema),
  })

  const pwdMutation = useMutation({
    mutationFn: (data: PwdValues) => authService.changePassword(data),
    onSuccess: () => {
      toast('success', 'Password changed successfully')
      reset()
    },
    onError: (err: unknown) => {
      const msg = (err as {response?:{data?:{message?:string}}})?.response?.data?.message ?? 'Failed to change password'
      toast('error', 'Password change failed', msg)
    },
  })

  if (!user) return null

  return (
    <div className="space-y-5 max-w-2xl">
      <PageHeader
        title="My Profile"
        description="Manage your account details."
        breadcrumbs={[{ label: 'Profile' }]}
      />

      <Card>
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-primary-600 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
            {getInitials(user.name)}
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">{user.name}</h2>
            <p className="text-sm text-slate-500">{user.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="primary">{ROLE_LABELS[user.role] ?? user.role}</Badge>
              {user.tenantName && <Badge variant="outline">{user.tenantName}</Badge>}
              {user.branchName && <Badge variant="outline">{user.branchName}</Badge>}
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Account Information</h3>
        <dl className="space-y-3 text-sm">
          {[
            { label: 'Full Name', value: user.name },
            { label: 'Email', value: user.email },
            { label: 'Role', value: ROLE_LABELS[user.role] ?? user.role },
            { label: 'Hospital', value: user.tenantName ?? '—' },
            { label: 'Branch', value: user.branchName ?? '—' },
            { label: 'Department', value: user.departmentId ?? '—' },
          ].map((row) => (
            <div key={row.label} className="flex justify-between gap-4 py-1 border-b border-slate-50 last:border-0">
              <dt className="text-slate-500 min-w-[120px]">{row.label}</dt>
              <dd className="text-slate-900 font-medium text-right">{row.value}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card>
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Change Password</h3>
        <form onSubmit={handleSubmit((d) => pwdMutation.mutate(d))} noValidate className="space-y-4">
          <Input
            {...register('currentPassword')}
            label="Current Password"
            type={showCurrent ? 'text' : 'password'}
            required
            error={errors.currentPassword?.message}
            rightElement={
              <button type="button" onClick={() => setShowCurrent(!showCurrent)}>
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            }
          />
          <Input
            {...register('newPassword')}
            label="New Password"
            type={showNew ? 'text' : 'password'}
            required
            error={errors.newPassword?.message}
            rightElement={
              <button type="button" onClick={() => setShowNew(!showNew)}>
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            }
          />
          <Input
            {...register('confirmPassword')}
            label="Confirm New Password"
            type="password"
            required
            error={errors.confirmPassword?.message}
          />
          <Button type="submit" variant="primary" size="sm" loading={isSubmitting || pwdMutation.isPending}>
            Update Password
          </Button>
        </form>
      </Card>
    </div>
  )
}
