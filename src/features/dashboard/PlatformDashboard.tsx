import { useQuery } from '@tanstack/react-query'
import { Building2, Users, Key, AlertTriangle, TrendingUp, Activity, Clock, CheckCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { tenantService } from '@/services/tenant.service'
import { PageHeader } from '@/components/layout/PageHeader'
import { MetricCard } from '@/components/ui/Card'
import { SkeletonMetrics } from '@/components/feedback/LoadingSkeleton'
import { ErrorState } from '@/components/feedback/EmptyState'
import { Badge, statusBadge } from '@/components/ui/Badge'
import { formatDate, formatRelative } from '@/utils/format'
import { Button } from '@/components/ui/Button'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

const CHART_COLORS = ['#2563eb', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

export function PlatformDashboard() {
  const navigate = useNavigate()

  const { data: stats, isLoading: statsLoading, isError: statsError, refetch } = useQuery({
    queryKey: ['platform', 'stats'],
    queryFn: () => tenantService.stats(),
    staleTime: 2 * 60 * 1000,
  })

  const { data: tenantsData, isLoading: tenantsLoading } = useQuery({
    queryKey: ['tenants', { page: 1, pageSize: 5 }],
    queryFn: () => tenantService.list({ page: 1, pageSize: 5 }),
  })

  if (statsLoading) return (
    <div className="space-y-6">
      <PageHeader title="Platform control center" description="Monitor every hospital in one place." />
      <SkeletonMetrics count={4} />
    </div>
  )

  if (statsError) return (
    <div className="space-y-6">
      <PageHeader title="Platform control center" description="Monitor every hospital in one place." />
      <ErrorState onRetry={() => refetch()} />
    </div>
  )

  const metrics = [
    { title: 'Total Hospitals',    value: stats?.total ?? 0,           icon: <Building2 className="w-5 h-5" />,    variant: 'default' as const },
    { title: 'Active Hospitals',   value: stats?.active ?? 0,          icon: <CheckCircle className="w-5 h-5" />, variant: 'success' as const },
    { title: 'Trial Accounts',     value: stats?.trial ?? 0,           icon: <Clock className="w-5 h-5" />,       variant: 'primary' as const },
    { title: 'Expiring Soon',      value: stats?.expiringSoon ?? 0,    icon: <AlertTriangle className="w-5 h-5" />, variant: 'warning' as const },
    { title: 'Suspended',          value: stats?.suspended ?? 0,       icon: <Activity className="w-5 h-5" />,    variant: 'danger' as const },
    { title: 'Total Users',        value: stats?.totalUsers ?? 0,      icon: <Users className="w-5 h-5" />,       variant: 'default' as const },
    { title: 'Licenses Issued',    value: stats?.licensesIssued ?? 0,  icon: <Key className="w-5 h-5" />,         variant: 'default' as const },
    { title: 'Pending Approvals',  value: stats?.pendingApprovals ?? 0, icon: <TrendingUp className="w-5 h-5" />, variant: 'warning' as const },
  ]

  const growthData = (stats?.growth as Array<{ month: string; count: number }> | undefined) ?? []
  const planDist = (stats?.planDistribution as Array<{ name: string; value: number }> | undefined) ?? []
  const statusDist = [
    { name: 'Active',    value: stats?.active ?? 0 },
    { name: 'Inactive',  value: (stats?.total ?? 0) - (stats?.active ?? 0) - (stats?.suspended ?? 0) - (stats?.trial ?? 0) },
    { name: 'Suspended', value: stats?.suspended ?? 0 },
    { name: 'Trial',     value: stats?.trial ?? 0 },
  ].filter((d) => d.value > 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform control center"
        description="Monitor every hospital in one place."
        actions={
          <Button variant="primary" size="sm" onClick={() => navigate('/admin/tenants/new')}>
            + Register Hospital
          </Button>
        }
      />

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <MetricCard key={m.title} title={m.title} value={m.value} icon={m.icon} variant={m.variant} />
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Growth chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Hospital Registrations (last 12 months)</h3>
          {growthData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={growthData} barSize={20}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#2563eb" name="New Hospitals" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-slate-400 text-sm">No growth data available</div>
          )}
        </div>

        {/* Status distribution */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Hospital Status</h3>
          {statusDist.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={statusDist} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                  {statusDist.map((_, idx) => (
                    <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-slate-400 text-sm">No data</div>
          )}
        </div>
      </div>

      {/* Plan distribution */}
      {planDist.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Subscription Plan Distribution</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={planDist} layout="vertical" barSize={16}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
              <Tooltip />
              <Bar dataKey="value" fill="#22c55e" name="Hospitals" radius={[0,3,3,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent hospitals */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-900">Recent Hospital Registrations</h3>
          <Button variant="ghost" size="xs" onClick={() => navigate('/admin/tenants')}>View all</Button>
        </div>
        {tenantsLoading ? (
          <div className="p-4 space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-10 bg-slate-100 rounded animate-pulse" />)}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {tenantsData?.data.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50 cursor-pointer"
                onClick={() => navigate(`/admin/tenants/${t.id}`)}
              >
                <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-4 h-4 text-primary-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{t.name}</p>
                  <p className="text-xs text-slate-500">{t.country} · {t.branchCount} branch{t.branchCount !== 1 ? 'es' : ''}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={statusBadge(t.status)} dot>{t.status}</Badge>
                  <span className="text-xs text-slate-400">{formatRelative(t.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Manage Hospitals',   href: '/admin/tenants',       color: 'bg-primary-50 text-primary-700 border-primary-200' },
          { label: 'Issue License',      href: '/admin/licenses',      color: 'bg-success-50 text-success-700 border-success-200' },
          { label: 'Subscriptions',      href: '/admin/subscriptions', color: 'bg-warning-50 text-warning-700 border-warning-200' },
          { label: 'Platform Reports',   href: '/admin/reports',       color: 'bg-slate-50 text-slate-700 border-slate-200' },
        ].map((a) => (
          <button
            key={a.href}
            onClick={() => navigate(a.href)}
            className={`rounded-xl border p-4 text-sm font-medium text-left hover:shadow-card transition-shadow ${a.color}`}
          >
            {a.label}
          </button>
        ))}
      </div>
    </div>
  )
}
