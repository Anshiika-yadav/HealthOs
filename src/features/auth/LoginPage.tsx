import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Eye, EyeOff, Heart, Mail, Lock } from 'lucide-react'
import { useAuth } from './AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

const schema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  tenantCode: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export function LoginPage() {
  const { login, isLoading, error } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [showPassword, setShowPassword] = useState(false)
  const [showTenantCode, setShowTenantCode] = useState(false)

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/'

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormValues) => {
    try {
      await login(data.email, data.password, data.tenantCode)
      navigate(from, { replace: true })
    } catch {
      // error is displayed from context state
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-primary-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Brand */}
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
          <div className="mb-6">
            <h1 className="text-xl font-bold text-slate-900">Sign in to HealthOS</h1>
            <p className="text-sm text-slate-500 mt-1">
              Use your assigned credentials to access your hospital workspace.
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div role="alert" className="mb-4 p-3 bg-danger-50 border border-danger-200 rounded-lg">
              <p className="text-sm text-danger-700">{error}</p>
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

            <div className="space-y-1">
              <Input
                {...register('password')}
                label="Password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                required
                error={errors.password?.message}
                leftElement={<Lock className="w-4 h-4" />}
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
              />
              <div className="flex justify-end">
                <Link to="/forgot-password" className="text-xs text-primary-600 hover:text-primary-700 font-medium">
                  Forgot password?
                </Link>
              </div>
            </div>

            {showTenantCode && (
              <Input
                {...register('tenantCode')}
                label="Hospital Code"
                type="text"
                placeholder="e.g. HOSP-001"
                hint="Required if your hospital uses a unique access code"
              />
            )}

            <button
              type="button"
              onClick={() => setShowTenantCode(!showTenantCode)}
              className="text-xs text-slate-500 hover:text-slate-700 underline-offset-2 hover:underline"
            >
              {showTenantCode ? '− Remove hospital code' : '+ Add hospital code (optional)'}
            </button>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={isSubmitting || isLoading}
              className="w-full mt-2"
            >
              Sign in
            </Button>
          </form>

          <div className="mt-5 pt-5 border-t border-slate-100 text-center">
            <p className="text-sm text-slate-600 mb-2">
              New here?{' '}
              <Link to="/signup" className="text-primary-600 hover:text-primary-700 font-semibold">
                Create account
              </Link>
            </p>
            <p className="text-xs text-slate-500">
              Received an invitation?{' '}
              <Link to="/accept-invitation" className="text-primary-600 hover:text-primary-700 font-medium">
                Accept your invitation
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          © {new Date().getFullYear()} HealthOS. All rights reserved.
        </p>
      </div>
    </div>
  )
}