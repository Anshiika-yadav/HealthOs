import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  UserRound, CalendarDays, Receipt, Package, FlaskConical,
  TrendingUp, Activity, AlertTriangle, CheckCircle, Clock,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { MetricCard } from '@/components/ui/Card'
import { SkeletonMetrics } from '@/components/feedback/LoadingSkeleton'
import { Button } from '@/components/ui/Button'
import { reportsService } from '@/services/reports.service'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

export function HospitalDashboard() {
  const navigate = useNavigate()

  const { data: summary, isLoading } = useQuery({
    queryKey: ['reports', 'summary'],
    queryFn: () => reportsService.getSummary(),
    staleTime: 60_000,
    retry: false,
  })

  const stats = summary as Record<string, unknown> ?? {}

  const metrics = [
    { title: 'Patients Today',      value: (stats.patientsToday as number)      ?? 0, icon: <UserRound className="w-5 h-5" />,     variant: 'primary'  as const },
    { title: 'Appointments Today',  value: (stats.appointmentsToday as number)  ?? 0, icon: <CalendarDays className="w-5 h-5" />,  variant: 'default'  as const },
    { title: 'Outstanding Bills',   value: (stats.outstandingBills as number)   ?? 0, icon: <Receipt className="w-5 h-5" />,       variant: 'warning'  as const },
    { title: 'Stock Alerts',        value: (stats.stockAlerts as number)        ?? 0, icon: <Package className="w-5 h-5" />,       variant: 'danger'   as const },
    { title: 'Pending Lab Work',    value: (stats.pendingLabWork as number)     ?? 0, icon: <FlaskConical className="w-5 h-5" />,  variant: 'default'  as const },
    { title: 'Admissions',          value: (stats.admissions as number)         ?? 0, icon: <Activity className="w-5 h-5" />,      variant: 'default'  as const },
    { title: 'Discharged Today',    value: (stats.dischargedToday as number)    ?? 0, icon: <CheckCircle className="w-5 h-5" />,   variant: 'success'  as const },
    { title: 'Pending Queue',       value: (stats.pendingQueue as number)       ?? 0, icon: <Clock className="w-5 h-5" />,         variant: 'default'  as const },
  ]

  const appointmentTrend = (stats.appointmentTrend as {day: string; count: number}[] | undefined) ?? []
  const revenueTrend = (stats.revenueTrend as {day: string; amount: number}[] | undefined) ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hospital overview"
        description="Your daily operations at a glance."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/patients/new')}>+ New Patient</Button>
            <Button variant="primary" size="sm" onClick={() => navigate('/appointments/new')}>Book Appointment</Button>
          </div>
        }
      />

      {isLoading ? (
        <SkeletonMetrics count={8} />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {metrics.map((m) => (
            <MetricCard key={m.title} title={m.title} value={m.value} icon={m.icon} variant={m.variant} />
          ))}
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Patient Visits (Last 7 Days)</h3>
          {appointmentTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={appointmentTrend} barSize={18}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#2563eb" name="Appointments" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-44 flex items-center justify-center text-slate-400 text-sm">No data available</div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Revenue (Last 7 Days)</h3>
          {revenueTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={revenueTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="amount" stroke="#22c55e" name="Revenue" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-44 flex items-center justify-center text-slate-400 text-sm">No data available</div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Register Patient',  href: '/patients/new',       color: 'bg-primary-50 border-primary-200 text-primary-700' },
            { label: 'Open Queue',        href: '/queue',              color: 'bg-success-50 border-success-200 text-success-700' },
            { label: 'Create Invoice',    href: '/billing/invoices/new', color: 'bg-warning-50 border-warning-200 text-warning-700' },
            { label: 'Run Report',        href: '/reports',            color: 'bg-slate-50 border-slate-200 text-slate-700' },
          ].map((a) => (
            <button
              key={a.href}
              onClick={() => navigate(a.href)}
              className={`rounded-xl border p-4 text-sm font-medium text-left hover:shadow-card-hover transition-shadow ${a.color}`}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
