import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { settingsService } from '@/services/settings.service'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
import { SkeletonCard } from '@/components/feedback/LoadingSkeleton'

const TABS = ['Profile', 'Departments', 'Services', 'Branches', 'Notifications'] as const
type Tab = typeof TABS[number]

export function HospitalSettings() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<Tab>('Profile')
  const [dirty, setDirty] = useState(false)
  const [settings, setSettings] = useState<Record<string, unknown>>({})

  const { isLoading } = useQuery({
    queryKey: ['hospital-settings'],
    queryFn: async () => {
      const data = await settingsService.getHospitalSettings()
      setSettings(data)
      return data
    },
  })

  const saveMutation = useMutation({
    mutationFn: () => settingsService.updateHospitalSettings(settings),
    onSuccess: () => {
      toast('success', 'Settings saved')
      setDirty(false)
    },
    onError: () => toast('error', 'Failed to save settings'),
  })

  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: () => settingsService.listDepartments(),
    enabled: activeTab === 'Departments',
  })

  const { data: services } = useQuery({
    queryKey: ['services'],
    queryFn: () => settingsService.listServices(),
    enabled: activeTab === 'Services',
  })

  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: () => settingsService.listBranches(),
    enabled: activeTab === 'Branches',
  })

  const update = (key: string, value: unknown) => {
    setSettings((s) => ({ ...s, [key]: value }))
    setDirty(true)
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <PageHeader
        title="System settings"
        description="Configure your hospital workspace."
        breadcrumbs={[{ label: 'Settings' }]}
        actions={
          dirty ? (
            <>
              <span className="text-xs text-warning-600 font-medium">Unsaved changes</span>
              <Button variant="primary" size="sm" loading={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
                Save Changes
              </Button>
            </>
          ) : undefined
        }
      />

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex gap-1">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab ? 'border-primary-600 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {isLoading && <SkeletonCard lines={6} />}

      {!isLoading && activeTab === 'Profile' && (
        <Card>
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Hospital Profile</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Hospital Name"
              value={(settings.name as string) ?? ''}
              onChange={(e) => update('name', e.target.value)}
            />
            <Input
              label="Hospital Code"
              value={(settings.code as string) ?? ''}
              disabled
              hint="Cannot be changed after registration"
            />
            <Input
              label="Email"
              type="email"
              value={(settings.email as string) ?? ''}
              onChange={(e) => update('email', e.target.value)}
            />
            <Input
              label="Phone"
              type="tel"
              value={(settings.phone as string) ?? ''}
              onChange={(e) => update('phone', e.target.value)}
            />
            <Input
              label="Address"
              value={(settings.address as string) ?? ''}
              onChange={(e) => update('address', e.target.value)}
              className="sm:col-span-2"
            />
            <Input
              label="City"
              value={(settings.city as string) ?? ''}
              onChange={(e) => update('city', e.target.value)}
            />
            <Input
              label="Country"
              value={(settings.country as string) ?? ''}
              onChange={(e) => update('country', e.target.value)}
            />
            <Select
              label="Timezone"
              options={[
                { value: 'Africa/Lagos', label: 'Africa/Lagos (WAT)' },
                { value: 'Africa/Nairobi', label: 'Africa/Nairobi (EAT)' },
                { value: 'Europe/London', label: 'Europe/London (GMT)' },
                { value: 'America/New_York', label: 'America/New_York (EST)' },
                { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST)' },
              ]}
              value={(settings.timezone as string) ?? ''}
              onChange={(e) => update('timezone', e.target.value)}
            />
            <Select
              label="Currency"
              options={[
                { value: 'USD', label: 'USD — US Dollar' },
                { value: 'NGN', label: 'NGN — Nigerian Naira' },
                { value: 'KES', label: 'KES — Kenyan Shilling' },
                { value: 'GHS', label: 'GHS — Ghanaian Cedi' },
                { value: 'GBP', label: 'GBP — British Pound' },
              ]}
              value={(settings.currency as string) ?? 'USD'}
              onChange={(e) => update('currency', e.target.value)}
            />
          </div>
        </Card>
      )}

      {!isLoading && activeTab === 'Departments' && (
        <Card>
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Departments</h3>
          {(departments ?? []).length === 0 ? (
            <p className="text-sm text-slate-500">No departments configured.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {(departments ?? []).map((d) => (
                <div key={d.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{d.name}</p>
                    <p className="text-xs text-slate-500">{d.code}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${d.isActive ? 'bg-success-100 text-success-700' : 'bg-slate-100 text-slate-500'}`}>
                    {d.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {!isLoading && activeTab === 'Services' && (
        <Card>
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Services & Pricing</h3>
          {(services ?? []).length === 0 ? (
            <p className="text-sm text-slate-500">No services configured.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {(services ?? []).map((s) => (
                <div key={s.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{s.name}</p>
                    <p className="text-xs text-slate-500">{s.category}</p>
                  </div>
                  <p className="text-sm font-semibold text-slate-900">{s.currency} {s.price.toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {!isLoading && activeTab === 'Branches' && (
        <Card>
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Branches & Facilities</h3>
          {(branches ?? []).length === 0 ? (
            <p className="text-sm text-slate-500">No branches configured.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {(branches ?? []).map((b) => (
                <div key={b.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{b.name}</p>
                    <p className="text-xs text-slate-500">{b.city}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${b.isActive ? 'bg-success-100 text-success-700' : 'bg-slate-100 text-slate-500'}`}>
                    {b.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {!isLoading && activeTab === 'Notifications' && (
        <Card>
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Notification Preferences</h3>
          <p className="text-sm text-slate-500">Notification settings are managed by the platform. Contact your administrator to update notification preferences.</p>
        </Card>
      )}
    </div>
  )
}
