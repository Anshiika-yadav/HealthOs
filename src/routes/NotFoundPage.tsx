import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'

export function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center">
        <p className="text-8xl font-black text-slate-200">404</p>
        <h1 className="text-2xl font-bold text-slate-900 -mt-4">Page not found</h1>
        <p className="text-sm text-slate-500 mt-2 max-w-xs mx-auto">
          The page you are looking for does not exist or has been moved.
        </p>
        <Button variant="primary" className="mt-6" onClick={() => navigate(-1)}>
          Go back
        </Button>
      </div>
    </div>
  )
}
