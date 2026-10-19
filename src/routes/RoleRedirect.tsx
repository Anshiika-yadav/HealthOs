import { Navigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'

export function RoleRedirect() {
  const { user } = useAuth()

  if (!user) return <Navigate to="/login" replace />

  if (user.role === 'super_admin') return <Navigate to="/admin/dashboard" replace />

  return <Navigate to="/dashboard" replace />
}
