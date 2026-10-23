import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Search, FlaskConical } from 'lucide-react'
import { laboratoryService } from '@/services/laboratory.service'
import { patientService } from '@/services/patient.service'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/components/ui/Toast'
import type { LabPriority, LabTest } from '@/types'

export function LabOrderForm() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const qc = useQueryClient()
  const [searchParams] = useSearchParams()
  const presetPatientId = searchParams.get('patientId') ?? ''
  const presetEncounterId = searchParams.get('encounterId') ?? ''

  const [patientId, setPatientId] = useState(presetPatientId)
  const [patientSearch, setPatientSearch] = useState('')
  const [priority, setPriority] = useState<LabPriority>('routine')
  const [sampleType, setSampleType] = useState('')
  const [notes, setNotes] = useState('')
  const [selectedTestIds, setSelectedTestIds] = useState<string[]>([])
  const [testSearch, setTestSearch] = useState('')

  const { data: patientResults } = useQuery({
    queryKey: ['patients', 'search', patientSearch],
    queryFn: () => patientService.list({ search: patientSearch, pageSize: 8 }),
    enabled: patientSearch.length >= 2 && !patientId,
  })

  const { data: selectedPatient } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: () => patientService.get(patientId),
    enabled: !!patientId,
  })

  const { data: allTests } = useQuery({
    queryKey: ['lab-tests'],
    queryFn: () => laboratoryService.listTests(),
  })

  const filteredTests = (allTests ?? []).filter(
    (t) =>
      !selectedTestIds.includes(t.id) &&
      (testSearch === '' ||
        t.name.toLowerCase().includes(testSearch.toLowerCase()) ||
        t.code.toLowerCase().includes(testSearch.toLowerCase()))
  )

  const selectedTests = (allTests ?? []).filter((t) => selectedTestIds.includes(t.id))

  const mutation = useMutation({
    mutationFn: () =>
      laboratoryService.createOrder({
        patientId,
        encounterId: presetEncounterId || undefined,
        priority,
        sampleType: sampleType || undefined,
        notes: notes || undefined,
        tests: selectedTests.map((t) => ({
          id: '',
          testId: t.id,
          testName: t.name,
          testCode: t.code,
          status: 'ordered' as const,
        })),
      }),
    onSuccess: (order) => {
      toast('success', 'Lab order created', `Order #${order.orderNumber}`)
      qc.invalidateQueries({ queryKey: ['lab-orders'] })
      navigate(`/laboratory/orders/${order.id}`)
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to create lab order'
      toast('error', 'Order failed', msg)
    },
  })

  const handleSubmit = () => {
    if (!patientId) { toast('error', 'Validation', 'Select a patient first'); return }
    if (selectedTestIds.length === 0) { toast('error', 'Validation', 'Select at least one test'); return }
    mutation.mutate()
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <PageHeader
        title="New lab order"
        backHref="/laboratory"
        breadcrumbs={[{ label: 'Laboratory', href: '/laboratory' }, { label: 'New Order' }]}
      />

      {/* Patient */}
      <Card>
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Patient</h3>
        {patientId && selectedPatient ? (
          <div className="flex items-center gap-3 p-3 bg-primary-50 border border-primary-200 rounded-lg">
            <div className="w-9 h-9 rounded-full bg-primary-200 flex items-center justify-center font-bold text-primary-700 text-sm">
              {selectedPatient.firstName[0]}{selectedPatient.lastName[0]}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-900">{selectedPatient.fullName}</p>
              <p className="text-xs text-slate-500">MRN: {selectedPatient.mrn}</p>
            </div>
            <Button variant="ghost" size="xs" onClick={() => setPatientId('')}>Change</Button>
          </div>
        ) : (
          <div className="space-y-2">
            <Input
              placeholder="Search patient by name, MRN or phone..."
              value={patientSearch}
              onChange={(e) => setPatientSearch(e.target.value)}
              leftElement={<Search className="w-4 h-4" />}
            />
            {patientResults && patientResults.data.length > 0 && (
              <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-40 overflow-y-auto">
                {patientResults.data.map((p) => (
                  <button
                    key={p.id} type="button"
                    onClick={() => { setPatientId(p.id); setPatientSearch(p.fullName) }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 text-sm"
                  >
                    <span className="font-medium text-slate-900">{p.fullName}</span>
                    <span className="text-slate-400 ml-2">MRN: {p.mrn}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {presetEncounterId && (
          <p className="text-xs text-primary-600 mt-2">Linked to encounter #{presetEncounterId.slice(0, 8)}</p>
        )}
      </Card>

      {/* Order details */}
      <Card>
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Order Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Priority"
            required
            options={[
              { value: 'routine', label: 'Routine' },
              { value: 'urgent', label: 'Urgent' },
              { value: 'stat', label: 'STAT (Immediate)' },
            ]}
            value={priority}
            onChange={(e) => setPriority(e.target.value as LabPriority)}
          />
          <Input
            label="Sample Type"
            placeholder="e.g. Blood, Urine, Stool"
            value={sampleType}
            onChange={(e) => setSampleType(e.target.value)}
          />
        </div>
        <div className="mt-3">
          <Textarea
            label="Clinical Notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Clinical notes for the lab technician..."
          />
        </div>
      </Card>

      {/* Test selection */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-primary-500" /> Select Tests
          </h3>
          {selectedTestIds.length > 0 && (
            <Badge variant="primary">{selectedTestIds.length} selected</Badge>
          )}
        </div>

        {/* Selected tests */}
        {selectedTests.length > 0 && (
          <div className="mb-4 space-y-1">
            {selectedTests.map((t) => (
              <div key={t.id} className="flex items-center justify-between px-3 py-2 bg-primary-50 rounded-lg border border-primary-200">
                <div>
                  <span className="text-sm font-medium text-slate-900">{t.name}</span>
                  <span className="text-xs text-slate-500 ml-2">{t.code}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedTestIds((prev) => prev.filter((id) => id !== t.id))}
                  className="text-slate-300 hover:text-danger-500 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Test search */}
        <Input
          placeholder="Search tests by name or code..."
          value={testSearch}
          onChange={(e) => setTestSearch(e.target.value)}
          leftElement={<Search className="w-4 h-4" />}
        />

        {filteredTests.length > 0 && (
          <div className="mt-2 border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-52 overflow-y-auto">
            {filteredTests.map((t: LabTest) => (
              <button
                key={t.id} type="button"
                onClick={() => setSelectedTestIds((prev) => [...prev, t.id])}
                className="w-full text-left px-3 py-2.5 hover:bg-slate-50 flex items-center justify-between"
              >
                <div>
                  <span className="text-sm font-medium text-slate-900">{t.name}</span>
                  <span className="text-xs text-slate-500 ml-2">{t.category}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-slate-400">{t.code}</span>
                  <Plus className="w-3.5 h-3.5 text-primary-500" />
                </div>
              </button>
            ))}
          </div>
        )}

        {allTests && allTests.length === 0 && (
          <p className="text-sm text-slate-400 mt-2">No lab tests configured. Contact your administrator.</p>
        )}
      </Card>

      <div className="flex items-center justify-end gap-3">
        <Button variant="secondary" onClick={() => navigate('/laboratory')}>Cancel</Button>
        <Button variant="primary" onClick={handleSubmit} loading={mutation.isPending}>
          Submit Order
        </Button>
      </div>
    </div>
  )
}
