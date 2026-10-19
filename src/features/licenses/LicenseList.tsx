import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Key, Plus, Copy, RotateCcw, Ban, CheckCircle } from 'lucide-react'
import { settingsService } from '@/services/settings.service'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable, Pagination, type Column } from '@/components/tables/DataTable'
import { Badge, statusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog, Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
import { formatDate } from '@/utils/format'
import { maskKey } from '@/utils/format'
import type { License } from '@/types'

export function LicenseList() {
  const { toast } = useToast()
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [confirmRevoke, setConfirmRevoke] = useState<License | null>(null)
  const [showIssue, setShowIssue] = useState(false)
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set())
  const [newLicense, setNewLicense] = useState({ tenantId: '', issuedTo: '', maxUsers: 50, maxBranches: 5, expiryDate: '' })

  const { data: licenses, isLoading, isError, refetch } = useQuery({
    queryKey: ['licenses', { page, search, status: statusFilter }],
    queryFn: () => settingsService.listLicenses({ page, pageSize: 20, search, status: statusFilter || undefined }),
  })

  const revokeMutation = useMutation({
    mutationFn: (id: string) => settingsService.revokeLicense(id),
    onSuccess: () => {
      toast('success', 'License revoked')
      qc.invalidateQueries({ queryKey: ['licenses'] })
      setConfirmRevoke(null)
    },
    onError: () => toast('error', 'Failed to revoke license'),
  })

  const issueMutation = useMutation({
    mutationFn: () => settingsService.issueLicense(newLicense),
    onSuccess: () => {
      toast('success', 'License issued successfully')
      qc.invalidateQueries({ queryKey: ['licenses'] })
      setShowIssue(false)
    },
    onError: () => toast('error', 'Failed to issue license'),
  })

  const handleCopy = (key: string, id: string) => {
    navigator.clipboard.writeText(key).then(() => toast('success', 'Key copied to clipboard'))
    setRevealedKeys(new Set([...revealedKeys, id]))
  }

  const licenseArray = Array.isArray(licenses) ? licenses : []

  const columns: Column<License>[] = [
    {
      key: 'key',
      header: 'License Key',
      render: (row) => (
        <div className="flex items-center gap-2">
          <code className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded">
            {revealedKeys.has(row.id) ? row.key : maskKey(row.key)}
          </code>
          <Button variant="ghost" size="xs" onClick={() => handleCopy(row.key, row.id)}>
            <Copy className="w-3 h-3" />
          </Button>
        </div>
      ),
    },
    { key: 'tenantName', header: 'Hospital' },
    { key: 'issuedTo', header: 'Issued To' },
    { key: 'maxUsers', header: 'Max Users', align: 'center' },
    { key: 'maxBranches', header: 'Max Branches', align: 'center' },
    {
      key: 'expiryDate',
      header: 'Expires',
      render: (row) => <span className="text-slate-600">{formatDate(row.expiryDate)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge variant={statusBadge(row.status)} dot>{row.status}</Badge>,
    },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <div className="flex items-center gap-1">
          {row.status === 'active' && (
            <Button
              variant="ghost"
              size="xs"
              className="text-danger-600"
              onClick={(e) => { e.stopPropagation(); setConfirmRevoke(row) }}
            >
              <Ban className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <PageHeader
        title="License Keys"
        description="Manage hospital license keys."
        breadcrumbs={[{ label: 'Platform Admin' }, { label: 'Licenses' }]}
        actions={
          <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowIssue(true)}>
            Issue License
          </Button>
        }
      />

      <div className="flex gap-3 flex-wrap">
        <Input
          placeholder="Search licenses..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="w-60"
          leftElement={<Key className="w-4 h-4" />}
        />
        <Select
          options={[
            { value: '', label: 'All statuses' },
            { value: 'active', label: 'Active' },
            { value: 'expired', label: 'Expired' },
            { value: 'revoked', label: 'Revoked' },
            { value: 'pending', label: 'Pending' },
          ]}
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className="w-40"
          placeholder="Status"
        />
      </div>

      <DataTable
        columns={columns}
        data={licenseArray}
        keyExtractor={(r) => r.id}
        isLoading={isLoading}
        isError={isError}
        onRetry={refetch}
        emptyTitle="No licenses found"
      />
      {Array.isArray(licenses) && (
        <Pagination page={page} totalPages={Math.ceil(licenseArray.length / 20)} total={licenseArray.length} pageSize={20} onPage={setPage} />
      )}

      <ConfirmDialog
        isOpen={!!confirmRevoke}
        onClose={() => setConfirmRevoke(null)}
        onConfirm={() => confirmRevoke && revokeMutation.mutate(confirmRevoke.id)}
        title="Revoke license?"
        message={`Revoking this license will immediately affect "${confirmRevoke?.tenantName}". Hospital users may lose access if no other license is active. This cannot be undone.`}
        confirmLabel="Revoke License"
        variant="danger"
        loading={revokeMutation.isPending}
      />

      <Modal
        isOpen={showIssue}
        onClose={() => setShowIssue(false)}
        title="Issue License Key"
        description="Generate a new license for a hospital."
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowIssue(false)}>Cancel</Button>
            <Button variant="primary" loading={issueMutation.isPending} onClick={() => issueMutation.mutate()}>
              Issue License
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Hospital ID" required value={newLicense.tenantId} onChange={(e) => setNewLicense({...newLicense, tenantId: e.target.value})} placeholder="Tenant ID" />
          <Input label="Issued To" required value={newLicense.issuedTo} onChange={(e) => setNewLicense({...newLicense, issuedTo: e.target.value})} placeholder="Contact name" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Max Users" type="number" required value={newLicense.maxUsers} onChange={(e) => setNewLicense({...newLicense, maxUsers: Number(e.target.value)})} />
            <Input label="Max Branches" type="number" required value={newLicense.maxBranches} onChange={(e) => setNewLicense({...newLicense, maxBranches: Number(e.target.value)})} />
          </div>
          <Input label="Expiry Date" type="date" required value={newLicense.expiryDate} onChange={(e) => setNewLicense({...newLicense, expiryDate: e.target.value})} />
        </div>
      </Modal>
    </div>
  )
}
