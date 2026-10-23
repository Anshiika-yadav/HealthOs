import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, UserPlus, MoreVertical } from 'lucide-react'
import { userService } from '@/services/user.service'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable, Pagination, type Column } from '@/components/tables/DataTable'
import { Badge, statusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal, ConfirmDialog } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { formatDate, formatRelative, getInitials } from '@/utils/format'
import type { User, UserRole } from '@/types'

interface InviteForm {
  name: string; email: string; phone: string; role: UserRole;
  tenantId: string; branchId: string; departmentId: string
}

const ROLE_OPTIONS = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'hospital_owner', label: 'Hospital Owner' },
  { value: 'hospital_admin', label: 'Hospital Admin' },
  { value: 'receptionist', label: 'Receptionist' },
  { value: 'doctor', label: 'Doctor' },
  { value: 'nurse', label: 'Nurse' },
  { value: 'cashier', label: 'Cashier' },
  { value: 'pharmacist', label: 'Pharmacist' },
  { value: 'lab_technician', label: 'Lab Technician' },
  { value: 'inventory_officer', label: 'Inventory Officer' },
  { value: 'auditor', label: 'Auditor' },
]

export function UserList() {
  const { toast } = useToast()
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showInvite, setShowInvite] = useState(false)
  const [confirmDeactivate, setConfirmDeactivate] = useState<User | null>(null)
  const [confirmActivate, setConfirmActivate] = useState<User | null>(null)
  const [form, setForm] = useState<InviteForm>({
    name: '', email: '', phone: '', role: 'hospital_admin',
    tenantId: '', branchId: '', departmentId: '',
  })

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['users', { page, pageSize, search, role: roleFilter, status: statusFilter }],
    queryFn: () => userService.list({ page, pageSize, search, role: roleFilter || undefined, status: statusFilter || undefined }),
    staleTime: 30_000,
  })

  const inviteMutation = useMutation({
    mutationFn: () => userService.invite({
      name: form.name, email: form.email, phone: form.phone || undefined,
      role: form.role, tenantId: form.tenantId || undefined,
      branchId: form.branchId || undefined, departmentId: form.departmentId || undefined,
    }),
    onSuccess: () => {
      toast('success', 'Invitation sent', `An invitation email was sent to ${form.email}`)
      qc.invalidateQueries({ queryKey: ['users'] })
      setShowInvite(false)
      setForm({ name: '', email: '', phone: '', role: 'hospital_admin', tenantId: '', branchId: '', departmentId: '' })
    },
    onError: (err: unknown) => {
      const msg = (err as {response?:{data?:{message?:string}}})?.response?.data?.message ?? 'Failed to send invitation'
      toast('error', 'Invite failed', msg)
    },
  })

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => userService.deactivate(id),
    onSuccess: () => {
      toast('success', 'User deactivated')
      qc.invalidateQueries({ queryKey: ['users'] })
      setConfirmDeactivate(null)
    },
    onError: () => toast('error', 'Failed to deactivate user'),
  })

  const activateMutation = useMutation({
    mutationFn: (id: string) => userService.activate(id),
    onSuccess: () => {
      toast('success', 'User activated')
      qc.invalidateQueries({ queryKey: ['users'] })
      setConfirmActivate(null)
    },
    onError: () => toast('error', 'Failed to activate user'),
  })

  const resendMutation = useMutation({
    mutationFn: (id: string) => userService.resendInvitation(id),
    onSuccess: () => toast('success', 'Invitation resent'),
    onError: () => toast('error', 'Failed to resend invitation'),
  })

  const resetPwdMutation = useMutation({
    mutationFn: (id: string) => userService.resetPassword(id),
    onSuccess: () => toast('success', 'Password reset email sent'),
    onError: () => toast('error', 'Failed to send reset email'),
  })

  const forceLogoutMutation = useMutation({
    mutationFn: (id: string) => userService.forceLogout(id),
    onSuccess: () => toast('success', 'User session terminated'),
    onError: () => toast('error', 'Failed to force logout'),
  })

  const columns: Column<User>[] = [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">
            {getInitials(row.name)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">{row.name}</p>
            <p className="text-xs text-slate-500 truncate">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (row) => (
        <Badge variant="primary">
          {ROLE_OPTIONS.find((r) => r.value === row.role)?.label ?? row.role}
        </Badge>
      ),
    },
    { key: 'tenantName', header: 'Hospital', render: (row) => row.tenantName ?? '—' },
    { key: 'branchName', header: 'Branch', render: (row) => row.branchName ?? '—' },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge variant={statusBadge(row.status)} dot>{row.status}</Badge>,
    },
    {
      key: 'invitationStatus',
      header: 'Invitation',
      render: (row) => row.invitationStatus ? (
        <Badge variant={row.invitationStatus === 'accepted' ? 'success' : row.invitationStatus === 'pending' ? 'warning' : 'danger'}>
          {row.invitationStatus}
        </Badge>
      ) : <span className="text-slate-400 text-xs">—</span>,
    },
    {
      key: 'lastLoginAt',
      header: 'Last Login',
      render: (row) => <span className="text-slate-500 text-xs">{row.lastLoginAt ? formatRelative(row.lastLoginAt) : 'Never'}</span>,
    },
    {
      key: 'actions',
      header: '',
      width: '60px',
      render: (row) => (
        <div className="relative group" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="xs"><MoreVertical className="w-4 h-4" /></Button>
          <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-lg shadow-dropdown border border-slate-200 py-1 z-10 hidden group-hover:block">
            {row.invitationStatus === 'pending' && (
              <button className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => resendMutation.mutate(row.id)}>
                Resend Invite
              </button>
            )}
            <button className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              onClick={() => resetPwdMutation.mutate(row.id)}>
              Reset Password
            </button>
            {row.status === 'active' && (
              <button className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => forceLogoutMutation.mutate(row.id)}>
                Force Logout
              </button>
            )}
            {row.status === 'active' && (
              <button className="w-full text-left px-3 py-2 text-sm text-danger-600 hover:bg-danger-50"
                onClick={() => setConfirmDeactivate(row)}>Deactivate</button>
            )}
            {(row.status === 'inactive' || row.status === 'suspended') && (
              <button className="w-full text-left px-3 py-2 text-sm text-success-700 hover:bg-success-50"
                onClick={() => setConfirmActivate(row)}>Activate</button>
            )}
          </div>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <PageHeader
        title="User management"
        description="Manage platform and hospital users."
        breadcrumbs={[{ label: 'Platform Admin' }, { label: 'Users' }]}
        actions={
          <Button variant="primary" size="sm" leftIcon={<UserPlus className="w-4 h-4" />} onClick={() => setShowInvite(true)}>
            Invite User
          </Button>
        }
      />

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search users..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="w-64"
          leftElement={<Search className="w-4 h-4" />}
        />
        <Select
          options={[{ value: '', label: 'All roles' }, ...ROLE_OPTIONS]}
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1) }}
          className="w-44"
          placeholder="Role"
        />
        <Select
          options={[
            { value: '', label: 'All statuses' },
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
            { value: 'invited', label: 'Invited' },
          ]}
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className="w-40"
          placeholder="Status"
        />
      </div>

      <div>
        <DataTable
          columns={columns}
          data={data?.data ?? []}
          keyExtractor={(r) => r.id}
          isLoading={isLoading}
          isError={isError}
          onRetry={refetch}
          emptyTitle="No users found"
          emptyAction={{ label: 'Invite User', onClick: () => setShowInvite(true) }}
        />
        {data && (
          <Pagination page={page} totalPages={data.totalPages} total={data.total} pageSize={pageSize} onPage={setPage} onPageSize={(s) => { setPageSize(s); setPage(1) }} />
        )}
      </div>

      {/* Invite modal */}
      <Modal
        isOpen={showInvite}
        onClose={() => setShowInvite(false)}
        title="Invite user"
        description="Send an invitation to a new team member."
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowInvite(false)}>Cancel</Button>
            <Button variant="primary" loading={inviteMutation.isPending} leftIcon={<Plus className="w-4 h-4" />} onClick={() => inviteMutation.mutate()}>
              Send Invitation
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Full Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input label="Phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <Input label="Email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Select
            label="Role"
            required
            options={ROLE_OPTIONS}
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
          />
          <Input label="Hospital ID (optional)" value={form.tenantId} onChange={(e) => setForm({ ...form, tenantId: e.target.value })} hint="Leave blank for platform-level users" />
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!confirmDeactivate}
        onClose={() => setConfirmDeactivate(null)}
        onConfirm={() => confirmDeactivate && deactivateMutation.mutate(confirmDeactivate.id)}
        title="Deactivate user?"
        message={`Deactivating "${confirmDeactivate?.name}" will prevent them from logging in. You can reactivate them later.`}
        confirmLabel="Deactivate"
        variant="danger"
        loading={deactivateMutation.isPending}
      />

      <ConfirmDialog
        isOpen={!!confirmActivate}
        onClose={() => setConfirmActivate(null)}
        onConfirm={() => confirmActivate && activateMutation.mutate(confirmActivate.id)}
        title="Activate user?"
        message={`Restore access for "${confirmActivate?.name}"?`}
        confirmLabel="Activate"
        variant="primary"
        loading={activateMutation.isPending}
      />
    </div>
  )
}
