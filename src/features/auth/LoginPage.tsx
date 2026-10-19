import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Eye, EyeOff, Heart, Mail, Lock, Info } from 'lucide-react'
import { useAuth } from './AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { IS_MOCK_AUTH } from '@/services/mockAuth'

const schema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  tenantCode: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

// Demo accounts shown only in mock/dev mode
const DEMO_ACCOUNTS = [
  { role: 'Super Admin',        email: 'superadmin@healthos.dev' },
  { role: 'Hospital Admin',     email: 'admin@hospital.dev' },
  { role: 'Doctor',             email: 'doctor@hospital.dev' },
  { role: 'Receptionist',       email: 'receptionist@hospital.dev' },
  { role: 'Cashier',            email: 'cashier@hospital.dev' },
  { role: 'Pharmacist',         email: 'pharmacist@hospital.dev' },
  { role: 'Lab Technician',     email: 'labtech@hospital.dev' },
  { role: 'Inventory Officer',  email: 'inventory@hospital.dev' },
]

export function LoginPage() {
  const { login, isLoading, error } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [showPassword, setShowPassword] = useState(false)
  const [showTenantCode, setShowTenantCode] = useState(false)
  const [showDemo, setShowDemo] = useState(false)

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/'

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<FormValues>({
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

  const fillDemo = (email: string) => {
    setValue('email', email)
    setValue('password', 'demo1234')
    setShowDemo(false)
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

          {/* Demo accounts panel */}
          {IS_MOCK_AUTH && (
            <div className="mb-4">
              <button
                type="button"
                onClick={() => setShowDemo(!showDemo)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-primary-50 border border-primary-200 rounded-lg text-sm text-primary-700 hover:bg-primary-100 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Info className="w-4 h-4 flex-shrink-0" />
                  <span className="font-medium">Demo mode — click to pick an account</span>
                </span>
                <span className="text-primary-400">{showDemo ? '▲' : '▼'}</span>
              </button>

              {showDemo && (
                <div className="mt-2 border border-primary-200 rounded-lg overflow-hidden bg-white shadow-dropdown">
                  <div className="px-3 py-2 bg-primary-50 border-b border-primary-100">
                    <p className="text-xs text-primary-600 font-medium">
                      All demo accounts use password: <code className="font-mono bg-primary-100 px-1 rounded">demo1234</code>
                    </p>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {DEMO_ACCOUNTS.map((acc) => (
                      <button
                        key={acc.email}
                        type="button"
                        onClick={() => fillDemo(acc.email)}
                        className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-slate-50 transition-colors"
                      >
                        <span className="text-sm font-medium text-slate-800">{acc.role}</span>
                        <span className="text-xs text-slate-400 font-mono">{acc.email}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

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
          {IS_MOCK_AUTH && (
            <span className="ml-2 text-warning-500 font-medium">[Demo Mode]</span>
          )}
        </p>
      </div>
    </div>
  )
}
