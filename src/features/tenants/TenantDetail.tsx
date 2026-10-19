import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tenantService } from '@/services/tenant.service'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge, statusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { SkeletonCard } from '@/components/feedback/LoadingSkeleton'
import { ErrorState } from '@/components/feedback/EmptyState'
import { formatDate } from '@/utils/format'
import {
  Building2, MapPin, Phone, Mail, Globe, Users, Key, CreditCard,
  Calendar, Activity, GitBranch,
} from 'lucide-react'

const TABS = ['Overview', 'Branches', 'Subscription', 'Users', 'License', 'Audit'] as const
type Tab = typeof TABS[number]

export function TenantDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState<Tab>('Overview')
  const [confirmSuspend, setConfirmSuspend] = useState(false)
  const [confirmActivate, setConfirmActivate] = useState(false)

  const { data: tenant, isLoading, isError, refetch } = useQuery({
    queryKey: ['tenant', id],
    queryFn: () => tenantService.get(id!),
    enabled: !!id,
  })

  const suspendMutation = useMutation({
    mutationFn: () => tenantService.suspend(id!),
    onSuccess: () => {
      toast('success', 'Hospital suspended')
      qc.invalidateQueries({ queryKey: ['tenant', id] })
      setConfirmSuspend(false)
    },
    onError: () => toast('error', 'Failed to suspend hospital'),
  })

  const activateMutation = useMutation({
    mutationFn: () => tenantService.activate(id!),
    onSuccess: () => {
      toast('success', 'Hospital activated')
      qc.invalidateQueries({ queryKey: ['tenant', id] })
      setConfirmActivate(false)
    },
    onError: () => toast('error', 'Failed to activate hospital'),
  })

  if (isLoading) return <div className="space-y-4"><SkeletonCard /><SkeletonCard /></div>
  if (isError || !tenant) return <ErrorState onRetry={refetch} />

  const isActive = tenant.status === 'active'

  return (
    <div className="space-y-5">
      <PageHeader
        title={tenant.name}
        description={`Code: ${tenant.code}`}
        backHref="/admin/tenants"
        breadcrumbs={[{ label: 'Hospitals', href: '/admin/tenants' }, { label: tenant.name }]}
        actions={
          <>
            <Badge variant={statusBadge(tenant.status)} dot size="md">{tenant.status}</Badge>
            <Button variant="outline" size="sm" onClick={() => navigate(`/admin/tenants/${id}/edit`)}>
              Edit
            </Button>
            {isActive ? (
              <Button variant="danger" size="sm" onClick={() => setConfirmSuspend(true)}>
                Suspend
              </Button>
            ) : (
              <Button variant="success" size="sm" onClick={() => setConfirmActivate(true)}>
                Activate
              </Button>
            )}
          </>
        }
      />

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex gap-1" aria-label="Tenant sections">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === 'Overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Hospital info */}
          <Card>
            <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary-500" /> Hospital Information
            </h3>
            <dl className="space-y-3">
              <InfoRow icon={<Building2 className="w-3.5 h-3.5" />} label="Name" value={tenant.name} />
              <InfoRow icon={<Key className="w-3.5 h-3.5" />} label="Code" value={tenant.code} />
              <InfoRow icon={<MapPin className="w-3.5 h-3.5" />} label="Country" value={tenant.country} />
              <InfoRow icon={<Phone className="w-3.5 h-3.5" />} label="Phone" value={tenant.phone} />
              <InfoRow icon={<Mail className="w-3.5 h-3.5" />} label="Email" value={tenant.email} />
              {tenant.website && <InfoRow icon={<Globe className="w-3.5 h-3.5" />} label="Website" value={tenant.website} />}
              <InfoRow icon={<Calendar className="w-3.5 h-3.5" />} label="Registered" value={formatDate(tenant.createdAt)} />
            </dl>
          </Card>

          {/* Usage stats */}
          <Card>
            <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary-500" /> Usage & Limits
            </h3>
            <div className="space-y-4">
              <UsageStat icon={<GitBranch className="w-4 h-4 text-primary-500" />} label="Branches" current={tenant.branchCount} max={tenant.license?.maxBranches} />
              <UsageStat icon={<Users className="w-4 h-4 text-primary-500" />} label="Users" current={tenant.userCount} max={tenant.license?.maxUsers} />
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Subscription</span>
                <Badge variant="primary">{tenant.subscriptionPlan || '—'}</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">License status</span>
                <Badge variant={statusBadge(tenant.licenseStatus || 'default')}>{tenant.licenseStatus || '—'}</Badge>
              </div>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'Branches' && (
        <Card>
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Branches & Facilities</h3>
          {tenant.branches.length === 0 ? (
            <p className="text-sm text-slate-500">No branches configured.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {tenant.branches.map((b) => (
                <div key={b.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{b.name}</p>
                    <p className="text-xs text-slate-500">{b.city} · {b.userCount} users · {b.departmentCount} departments</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {b.isHeadquarters && <Badge variant="primary" size="sm">HQ</Badge>}
                    <Badge variant={b.isActive ? 'success' : 'default'} size="sm">{b.isActive ? 'Active' : 'Inactive'}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {activeTab === 'Subscription' && (
        <Card>
          <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary-500" /> Subscription Details
          </h3>
          {tenant.subscription ? (
            <dl className="space-y-3">
              <InfoRow label="Plan" value={tenant.subscription.plan} />
              <InfoRow label="Status" value={<Badge variant={statusBadge(tenant.subscription.status)} dot>{tenant.subscription.status}</Badge>} />
              <InfoRow label="Billing Cycle" value={tenant.subscription.billingCycle} />
              <InfoRow label="Start Date" value={formatDate(tenant.subscription.startDate)} />
              <InfoRow label="End Date" value={formatDate(tenant.subscription.endDate)} />
              <InfoRow label="Auto-Renew" value={tenant.subscription.autoRenew ? 'Yes' : 'No'} />
              <InfoRow label="Amount" value={`${tenant.subscription.currency} ${tenant.subscription.amount.toLocaleString()}`} />
            </dl>
          ) : (
            <p className="text-sm text-slate-500">No active subscription.</p>
          )}
          <div className="mt-4 flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate(`/admin/subscriptions?tenantId=${id}`)}>
              View Subscription
            </Button>
            <Button variant="primary" size="sm" onClick={() => navigate(`/admin/subscriptions/new?tenantId=${id}`)}>
              Assign Plan
            </Button>
          </div>
        </Card>
      )}

      {activeTab === 'License' && (
        <Card>
          <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Key className="w-4 h-4 text-primary-500" /> License Information
          </h3>
          {tenant.license ? (
            <dl className="space-y-3">
              <InfoRow label="Status" value={<Badge variant={statusBadge(tenant.license.status)} dot>{tenant.license.status}</Badge>} />
              <InfoRow label="Issued To" value={tenant.license.issuedTo} />
              <InfoRow label="Max Users" value={String(tenant.license.maxUsers)} />
              <InfoRow label="Max Branches" value={String(tenant.license.maxBranches)} />
              <InfoRow label="Expiry Date" value={formatDate(tenant.license.expiryDate)} />
              <InfoRow label="Issued" value={formatDate(tenant.license.issuedAt)} />
            </dl>
          ) : (
            <p className="text-sm text-slate-500">No license issued.</p>
          )}
          <div className="mt-4 flex gap-2">
            <Button variant="primary" size="sm" onClick={() => navigate(`/admin/licenses?tenantId=${id}`)}>
              Manage License
            </Button>
          </div>
        </Card>
      )}

      {(activeTab === 'Users' || activeTab === 'Audit') && (
        <Card>
          <p className="text-sm text-slate-500">
            {activeTab === 'Users'
              ? 'View users for this hospital in '
              : 'View audit logs for this hospital in '}
            <button
              className="text-primary-600 hover:underline"
              onClick={() => navigate(activeTab === 'Users' ? `/admin/users?tenantId=${id}` : `/admin/audit?tenantId=${id}`)}
            >
              {activeTab === 'Users' ? 'User Management' : 'Audit Logs'}
            </button>
          </p>
        </Card>
      )}

      <ConfirmDialog
        isOpen={confirmSuspend}
        onClose={() => setConfirmSuspend(false)}
        onConfirm={() => suspendMutation.mutate()}
        title="Suspend hospital?"
        message={`Suspending "${tenant.name}" will immediately block all user access. This action can be reversed.`}
        confirmLabel="Suspend Hospital"
        variant="danger"
        loading={suspendMutation.isPending}
      />
      <ConfirmDialog
        isOpen={confirmActivate}
        onClose={() => setConfirmActivate(false)}
        onConfirm={() => activateMutation.mutate()}
        title="Activate hospital?"
        message={`Restoring access to "${tenant.name}". All users will be able to sign in again.`}
        confirmLabel="Activate"
        variant="primary"
        loading={activateMutation.isPending}
      />
    </div>
  )
}

function InfoRow({ icon, label, value }: { icon?: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1">
      <dt className="flex items-center gap-1.5 text-sm text-slate-500 flex-shrink-0 min-w-[120px]">
        {icon && <span className="text-slate-400">{icon}</span>}
        {label}
      </dt>
      <dd className="text-sm text-slate-900 text-right">{value ?? '—'}</dd>
    </div>
  )
}

function UsageStat({ icon, label, current, max }: { icon: React.ReactNode; label: string; current: number; max?: number }) {
  const pct = max ? Math.min(100, (current / max) * 100) : 0
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="flex items-center gap-1.5 text-sm text-slate-600">
          {icon} {label}
        </span>
        <span className="text-sm font-medium text-slate-900">
          {current}{max ? ` / ${max}` : ''}
        </span>
      </div>
      {max && (
        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${pct > 85 ? 'bg-danger-500' : pct > 60 ? 'bg-warning-500' : 'bg-primary-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  )
}
