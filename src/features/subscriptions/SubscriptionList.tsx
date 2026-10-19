import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, CreditCard } from 'lucide-react'
import { settingsService } from '@/services/settings.service'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable, Pagination, type Column } from '@/components/tables/DataTable'
import { Badge, statusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { formatDate, formatCurrency } from '@/utils/format'
import type { Subscription } from '@/types'

export function SubscriptionList() {
  const { toast } = useToast()
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState<{
    tenantId: string; plan: string; billingCycle: 'monthly' | 'annual';
    startDate: string; endDate: string; autoRenew: boolean; amount: number; currency: string
  }>({
    tenantId: '', plan: 'professional', billingCycle: 'monthly',
    startDate: '', endDate: '', autoRenew: true, amount: 0, currency: 'USD',
  })

  const { data: subs, isLoading, isError, refetch } = useQuery({
    queryKey: ['subscriptions', { page, search, status: statusFilter }],
    queryFn: () => settingsService.listSubscriptions({ page, pageSize: 20, search, status: statusFilter || undefined }),
  })

  const createMutation = useMutation({
    mutationFn: () => settingsService.createSubscription(form),
    onSuccess: () => {
      toast('success', 'Subscription created')
      qc.invalidateQueries({ queryKey: ['subscriptions'] })
      setShowCreate(false)
    },
    onError: () => toast('error', 'Failed to create subscription'),
  })

  const subsArray = Array.isArray(subs) ? subs : []

  const columns: Column<Subscription>[] = [
    { key: 'tenantId', header: 'Hospital ID' },
    {
      key: 'plan',
      header: 'Plan',
      render: (row) => <Badge variant="primary">{row.plan}</Badge>,
    },
    { key: 'billingCycle', header: 'Cycle' },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge variant={statusBadge(row.status)} dot>{row.status}</Badge>,
    },
    { key: 'startDate', header: 'Start', render: (row) => formatDate(row.startDate) },
    { key: 'endDate', header: 'End', render: (row) => formatDate(row.endDate) },
    {
      key: 'autoRenew',
      header: 'Auto-Renew',
      render: (row) => <Badge variant={row.autoRenew ? 'success' : 'default'}>{row.autoRenew ? 'Yes' : 'No'}</Badge>,
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      render: (row) => <span className="font-medium">{formatCurrency(row.amount, row.currency)}</span>,
    },
  ]

  return (
    <div className="space-y-4">
      <PageHeader
        title="Subscriptions"
        description="Manage hospital subscription plans."
        breadcrumbs={[{ label: 'Platform Admin' }, { label: 'Subscriptions' }]}
        actions={
          <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowCreate(true)}>
            New Subscription
          </Button>
        }
      />

      <div className="flex gap-3 flex-wrap">
        <Input
          placeholder="Search..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="w-60"
          leftElement={<CreditCard className="w-4 h-4" />}
        />
        <Select
          options={[
            { value: '', label: 'All statuses' },
            { value: 'active', label: 'Active' },
            { value: 'trial', label: 'Trial' },
            { value: 'expired', label: 'Expired' },
            { value: 'cancelled', label: 'Cancelled' },
            { value: 'suspended', label: 'Suspended' },
          ]}
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className="w-40"
          placeholder="Status"
        />
      </div>

      <DataTable
        columns={columns}
        data={subsArray}
        keyExtractor={(r) => r.id}
        isLoading={isLoading}
        isError={isError}
        onRetry={refetch}
        emptyTitle="No subscriptions found"
      />

      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create Subscription"
        description="Assign a subscription plan to a hospital."
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button variant="primary" loading={createMutation.isPending} onClick={() => createMutation.mutate()}>
              Create
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Hospital ID" required value={form.tenantId} onChange={(e) => setForm({ ...form, tenantId: e.target.value })} />
          <Select
            label="Plan"
            required
            options={[
              { value: 'starter', label: 'Starter' },
              { value: 'professional', label: 'Professional' },
              { value: 'enterprise', label: 'Enterprise' },
            ]}
            value={form.plan}
            onChange={(e) => setForm({ ...form, plan: e.target.value })}
          />
          <Select
            label="Billing Cycle"
            options={[
              { value: 'monthly', label: 'Monthly' },
              { value: 'annual', label: 'Annual' },
            ]}
            value={form.billingCycle}
            onChange={(e) => setForm({ ...form, billingCycle: e.target.value as 'monthly' | 'annual' })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Start Date" type="date" required value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            <Input label="End Date" type="date" required value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
          </div>
          <Input label="Amount" type="number" required value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} />
        </div>
      </Modal>
    </div>
  )
}
