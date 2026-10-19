import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { Heart, Lock, Eye, EyeOff, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { authService } from '@/services/auth.service'

const schema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

type FormValues = z.infer<typeof schema>

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') ?? ''
  const [showPwd, setShowPwd] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [done, setDone] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-lg font-semibold text-slate-900">Invalid reset link</p>
          <p className="text-sm text-slate-500 mt-1">This password reset link is invalid or has expired.</p>
          <Link to="/forgot-password" className="mt-4 inline-flex text-sm text-primary-600 font-medium">
            Request a new link
          </Link>
        </div>
      </div>
    )
  }

  const onSubmit = async (data: FormValues) => {
    setServerError(null)
    try {
      await authService.resetPassword({ token, password: data.password, confirmPassword: data.confirmPassword })
      setDone(true)
    } catch (err: unknown) {
      setServerError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to reset password. The link may have expired.'
      )
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-primary-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-primary-600 flex items-center justify-center shadow-lg">
            <Heart className="w-6 h-6 text-white" />
          </div>
          <p className="text-2xl font-bold text-slate-900">HealthOS</p>
        </div>

        <div className="bg-white rounded-2xl shadow-card border border-slate-200 p-8">
          {done ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full bg-success-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-7 h-7 text-success-600" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Password updated</h2>
              <p className="text-sm text-slate-500 mt-2">Your password has been reset successfully.</p>
              <Button variant="primary" className="mt-6 w-full" onClick={() => navigate('/login')}>
                Sign in
              </Button>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h1 className="text-xl font-bold text-slate-900">Set new password</h1>
                <p className="text-sm text-slate-500 mt-1">Choose a secure password of at least 8 characters.</p>
              </div>

              {serverError && (
                <div role="alert" className="mb-4 p-3 bg-danger-50 border border-danger-200 rounded-lg">
                  <p className="text-sm text-danger-700">{serverError}</p>
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
                <Input
                  {...register('password')}
                  label="New password"
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
                  label="Confirm new password"
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  error={errors.confirmPassword?.message}
                  leftElement={<Lock className="w-4 h-4" />}
                  rightElement={
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)} aria-label="Toggle">
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                />
                <Button type="submit" variant="primary" size="lg" loading={isSubmitting} className="w-full">
                  Reset password
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
