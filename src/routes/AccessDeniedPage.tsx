import { useNavigate } from 'react-router-dom'
import { ShieldOff } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export function AccessDeniedPage() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-2xl bg-danger-100 flex items-center justify-center mx-auto mb-4">
          <ShieldOff className="w-8 h-8 text-danger-500" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">Access Denied</h1>
        <p className="text-sm text-slate-500 mt-2">
          You do not have permission to view this page. Contact your administrator if you believe this is an error.
        </p>
        <div className="flex gap-3 justify-center mt-6">
          <Button variant="outline" onClick={() => navigate(-1)}>Go back</Button>
          <Button variant="primary" onClick={() => navigate('/')}>Dashboard</Button>
        </div>
      </div>
    </div>
  )
}
