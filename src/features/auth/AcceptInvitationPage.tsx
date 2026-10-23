import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Heart, Eye, EyeOff, CheckCircle, AlertTriangle, Lock, User } from 'lucide-react'
import apiClient from '@/services/apiClient'
import { authService } from '@/services/auth.service'
import { useAuth } from './AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'

const schema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Confirm your password'),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})
type FormValues = z.infer<typeof schema>

interface InvitationInfo {
  email: string
  role: string
  tenantName?: string
  isValid: boolean
  error?: string
}

function InvitationShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-primary-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-primary-600 flex items-center justify-center shadow-lg">
            <Heart className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">HealthOS</p>
            <p className="text-xs text-slate-500">Hospital Management Platform</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-card border border-slate-200 p-8">
          {children}
        </div>
      </div>
    </div>
  )
}

async function validateInvitation(token: string): Promise<InvitationInfo> {
  try {
    const { data } = await apiClient.get<InvitationInfo>(`/auth/invitation/${token}`)
    return { ...data, isValid: true }
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response?.status
    if (status === 404 || status === 410) {
      return { email: '', role: '', isValid: false, error: 'This invitation link is invalid or has expired.' }
    }
    return { email: '', role: '', isValid: false, error: 'Could not validate invitation. Please try again.' }
  }
}

export function AcceptInvitationPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { refreshUser } = useAuth()
  const { toast } = useToast()
  const token = searchParams.get('token') ?? ''
  const [showPwd, setShowPwd] = useState(false)
  const [done, setDone] = useState(false)

  const { data: inviteInfo, isLoading: validating } = useQuery({
    queryKey: ['invitation', token],
    queryFn: () => validateInvitation(token),
    enabled: !!token,
    staleTime: Infinity,
    retry: false,
  })

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const acceptMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      await apiClient.post('/auth/accept-invitation', {
        token,
        firstName: data.firstName,
        lastName: data.lastName,
        password: data.password,
      })
      if (inviteInfo?.email) {
        await authService.login({ email: inviteInfo.email, password: data.password })
        await refreshUser()
      }
    },
    onSuccess: () => {
      setDone(true)
      toast('success', 'Account activated', 'Welcome to HealthOS!')
      setTimeout(() => navigate('/'), 1500)
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to activate account. The invitation may have expired.'
      toast('error', 'Activation failed', msg)
    },
  })

  if (!token) {
    return (
      <InvitationShell>
        <div className="text-center py-4">
          <AlertTriangle className="w-10 h-10 text-danger-400 mx-auto mb-3" />
          <p className="font-semibold text-slate-900">Invalid invitation link</p>
          <p className="text-sm text-slate-500 mt-1">No invitation token found. Please use the link from your email.</p>
          <button onClick={() => navigate('/login')} className="mt-4 text-sm text-primary-600 font-medium hover:underline">
            Back to sign in
          </button>
        </div>
      </InvitationShell>
    )
  }

  if (validating) {
    return (
      <InvitationShell>
        <div className="flex flex-col items-center gap-3 py-8">
          <div className="w-8 h-8 rounded-full border-4 border-primary-600 border-t-transparent animate-spin" />
          <p className="text-sm text-slate-500">Validating your invitation...</p>
        </div>
      </InvitationShell>
    )
  }

  if (inviteInfo && !inviteInfo.isValid) {
    return (
      <InvitationShell>
        <div className="text-center py-4">
          <AlertTriangle className="w-10 h-10 text-danger-400 mx-auto mb-3" />
          <p className="font-semibold text-slate-900">Invitation not valid</p>
          <p className="text-sm text-slate-500 mt-1">{inviteInfo.error}</p>
          <button onClick={() => navigate('/login')} className="mt-4 text-sm text-primary-600 font-medium hover:underline">
            Back to sign in
          </button>
        </div>
      </InvitationShell>
    )
  }

  if (done) {
    return (
      <InvitationShell>
        <div className="text-center py-4">
          <div className="w-14 h-14 rounded-full bg-success-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-7 h-7 text-success-600" />
          </div>
          <p className="text-lg font-bold text-slate-900">Account activated!</p>
          <p className="text-sm text-slate-500 mt-1">Redirecting you to your workspace...</p>
        </div>
      </InvitationShell>
    )
  }

  return (
    <InvitationShell>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">Accept your invitation</h1>
        {inviteInfo && (
          <div className="mt-3 p-3 bg-primary-50 border border-primary-200 rounded-lg text-sm">
            <p className="text-slate-700">
              You've been invited to join <strong>{inviteInfo.tenantName ?? 'HealthOS'}</strong> as a{' '}
              <strong>{inviteInfo.role?.replace(/_/g, ' ')}</strong>.
            </p>
            {inviteInfo.email && (
              <p className="text-slate-500 mt-1">Account: <strong>{inviteInfo.email}</strong></p>
            )}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit((d) => acceptMutation.mutate(d))} noValidate className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input {...register('firstName')} label="First Name" required error={errors.firstName?.message}
            leftElement={<User className="w-4 h-4" />} />
          <Input {...register('lastName')} label="Last Name" required error={errors.lastName?.message} />
        </div>
        <Input
          {...register('password')}
          label="Create Password"
          type={showPwd ? 'text' : 'password'}
          autoComplete="new-password"
          required
          error={errors.password?.message}
          leftElement={<Lock className="w-4 h-4" />}
          rightElement={
            <button type="button" onClick={() => setShowPwd(!showPwd)} aria-label="Toggle">
              {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          }
        />
        <Input
          {...register('confirmPassword')}
          label="Confirm Password"
          type="password"
          autoComplete="new-password"
          required
          error={errors.confirmPassword?.message}
          leftElement={<Lock className="w-4 h-4" />}
        />
        <Button type="submit" variant="primary" size="lg" className="w-full"
          loading={isSubmitting || acceptMutation.isPending}>
          Activate Account
        </Button>
      </form>

      <p className="mt-4 text-center text-xs text-slate-400">
        Already have an account?{' '}
        <button onClick={() => navigate('/login')} className="text-primary-600 font-medium hover:underline">
          Sign in
        </button>
      </p>
    </InvitationShell>
  )
}
