import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Heart, Mail, Lock, User, Building2 } from 'lucide-react'
import { useAuth } from './AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import type { UserRole } from '@/types'

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'doctor',            label: 'Doctor' },
  { value: 'nurse',             label: 'Nurse' },
  { value: 'receptionist',      label: 'Receptionist' },
  { value: 'cashier',           label: 'Cashier' },
  { value: 'pharmacist',        label: 'Pharmacist' },
  { value: 'lab_technician',    label: 'Lab Technician' },
  { value: 'inventory_officer', label: 'Inventory Officer' },
  { value: 'auditor',           label: 'Auditor' },
]

const schema = z
  .object({
    name: z.string().min(2, 'Enter your full name'),
    email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
    role: z.string().min(1, 'Select a role'),
    hospitalName: z.string().optional(),
    password: z
      .string()
      .min(8, 'At least 8 characters')
      .regex(/[A-Za-z]/, 'Include at least one letter')
      .regex(/[0-9]/, 'Include at least one number'),
    confirmPassword: z.string().min(1, 'Confirm your password'),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  })

type FormValues = z.infer<typeof schema>

export function SignupPage() {
  const { register: signUp, isLoading, error } = useAuth()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'receptionist' },
  })

  const onSubmit = async (v: FormValues) => {
    try {
      await signUp({
        name: v.name,
        email: v.email,
        password: v.password,
        role: v.role as UserRole,
        hospitalName: v.hospitalName,
      })
      navigate('/', { replace: true })
    } catch {
      // error is displayed from context state
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
          <div className="mb-6">
            <h1 className="text-xl font-bold text-slate-900">Create your account</h1>
            <p className="text-sm text-slate-500 mt-1">
              Join an existing hospital or start a new one.
            </p>
          </div>

          {error && (
            <div role="alert" className="mb-4 p-3 bg-danger-50 border border-danger-200 rounded-lg">
              <p className="text-sm text-danger-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <Input
              {...register('name')}
              label="Full name"
              autoComplete="name"
              placeholder="Dr. Anshika Sharma"
              required
              error={errors.name?.message}
              leftElement={<User className="w-4 h-4" />}
            />
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
            <Input
              {...register('hospitalName')}
              label="Hospital name"
              placeholder="City General Hospital"
              hint="Khali chhodo to existing hospital join hoga. Naya naam likhoge to naya hospital banega aur aap uske admin banoge."
              leftElement={<Building2 className="w-4 h-4" />}
            />
            <Select
              {...register('role')}
              label="Role"
              required
              options={ROLE_OPTIONS}
              error={errors.role?.message}
            />
            <Input
              {...register('password')}
              label="Password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
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
            <Input
              {...register('confirmPassword')}
              label="Confirm password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="••••••••"
              required
              error={errors.confirmPassword?.message}
              leftElement={<Lock className="w-4 h-4" />}
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={isSubmitting || isLoading}
              className="w-full mt-2"
            >
              Create account
            </Button>
          </form>

          <div className="mt-5 pt-5 border-t border-slate-100 text-center">
            <p className="text-sm text-slate-600">
              Already have an account?{' '}
              <Link to="/login" className="text-primary-600 hover:text-primary-700 font-semibold">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}