import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router-dom'
import { Heart, Mail, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { authService } from '@/services/auth.service'

const schema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
})
type FormValues = z.infer<typeof schema>

export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting }, getValues } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormValues) => {
    setServerError(null)
    try {
      await authService.requestPasswordReset(data.email)
      setSent(true)
    } catch (err: unknown) {
      setServerError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Something went wrong. Please try again.'
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
          <div>
            <p className="text-2xl font-bold text-slate-900">HealthOS</p>
            <p className="text-xs text-slate-500">Hospital Management Platform</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-card border border-slate-200 p-8">
          {sent ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full bg-success-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-7 h-7 text-success-600" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Check your email</h2>
              <p className="text-sm text-slate-500 mt-2">
                We sent a secure reset link to <strong>{getValues('email')}</strong>.
                Check your inbox and follow the instructions.
              </p>
              <p className="text-xs text-slate-400 mt-3">
                The link expires in 1 hour. If you don't see it, check your spam folder.
              </p>
              <Link to="/login" className="mt-6 inline-flex text-sm text-primary-600 hover:text-primary-700 font-medium">
                ← Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h1 className="text-xl font-bold text-slate-900">Forgot your password?</h1>
                <p className="text-sm text-slate-500 mt-1">
                  We will send a secure reset link to your email.
                </p>
              </div>

              {serverError && (
                <div role="alert" className="mb-4 p-3 bg-danger-50 border border-danger-200 rounded-lg">
                  <p className="text-sm text-danger-700">{serverError}</p>
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
                <Input
                  {...register('email')}
                  label="Email address"
                  type="email"
                  autoComplete="email"
                  placeholder="you@hospital.com"
                  required
                  error={errors.email?.message}
                  leftElement={<Mail className="w-4 h-4" />}
                />
                <Button type="submit" variant="primary" size="lg" loading={isSubmitting} className="w-full">
                  Send reset link
                </Button>
              </form>

              <div className="mt-5 text-center">
                <Link to="/login" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                  ← Back to sign in
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
