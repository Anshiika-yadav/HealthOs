import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Search } from 'lucide-react'
import { pharmacyService } from '@/services/pharmacy.service'
import { patientService } from '@/services/patient.service'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import type { PrescriptionItem } from '@/types'

interface DraftItem extends Omit<PrescriptionItem, 'id'> {
  tempId: string
}

const ROUTES = [
  { value: 'oral', label: 'Oral' },
  { value: 'iv', label: 'IV' },
  { value: 'im', label: 'IM' },
  { value: 'sc', label: 'Subcutaneous' },
  { value: 'topical', label: 'Topical' },
  { value: 'inhaled', label: 'Inhaled' },
  { value: 'sublingual', label: 'Sublingual' },
  { value: 'rectal', label: 'Rectal' },
  { value: 'other', label: 'Other' },
]

const FREQUENCIES = [
  { value: 'once_daily', label: 'Once daily (OD)' },
  { value: 'twice_daily', label: 'Twice daily (BD)' },
  { value: 'three_daily', label: 'Three times daily (TDS)' },
  { value: 'four_daily', label: 'Four times daily (QDS)' },
  { value: 'every_4h', label: 'Every 4 hours' },
  { value: 'every_6h', label: 'Every 6 hours' },
  { value: 'every_8h', label: 'Every 8 hours' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'stat', label: 'Stat (immediately)' },
  { value: 'prn', label: 'As needed (PRN)' },
]

function emptyItem(): DraftItem {
  return {
    tempId: Math.random().toString(36).slice(2),
    drugName: '',
    dosage: '',
    frequency: 'once_daily',
    duration: '',
    route: 'oral',
    instructions: '',
    refills: 0,
    substitutionAllowed: true,
    quantity: 1,
  }
}

export function PrescriptionForm() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const qc = useQueryClient()
  const [searchParams] = useSearchParams()
  const presetPatientId = searchParams.get('patientId') ?? ''
  const presetEncounterId = searchParams.get('encounterId') ?? ''

  const [patientId, setPatientId] = useState(presetPatientId)
  const [patientSearch, setPatientSearch] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<DraftItem[]>([emptyItem()])

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

  const mutation = useMutation({
    mutationFn: () =>
      pharmacyService.createPrescription({
        patientId,
        encounterId: presetEncounterId || undefined,
        notes: notes || undefined,
        items: items.map(({ tempId, ...rest }) => ({ ...rest, id: '' })),
        status: 'active',
      }),
    onSuccess: (rx) => {
      toast('success', 'Prescription created')
      qc.invalidateQueries({ queryKey: ['prescriptions'] })
      navigate(`/prescriptions/${rx.id}`)
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to create prescription'
      toast('error', 'Creation failed', msg)
    },
  })

  const handleSubmit = () => {
    if (!patientId) { toast('error', 'Validation', 'Select a patient first'); return }
    const invalid = items.find((i) => !i.drugName.trim() || !i.dosage.trim() || !i.duration.trim())
    if (invalid) { toast('error', 'Validation', 'Fill drug name, dosage, and duration for every item'); return }
    mutation.mutate()
  }

  const updateItem = (idx: number, key: keyof DraftItem, val: string | number | boolean) =>
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [key]: val } : it)))

  return (
    <div className="space-y-5 max-w-3xl">
      <PageHeader
        title="New prescription"
        description="Prescribe medication"
        backHref="/prescriptions"
        breadcrumbs={[{ label: 'Prescriptions', href: '/prescriptions' }, { label: 'New' }]}
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
                    key={p.id}
                    type="button"
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

      {/* Medication items */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-900">Medications</h3>
          <Button
            variant="outline"
            size="xs"
            leftIcon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => setItems((prev) => [...prev, emptyItem()])}
          >
            Add Drug
          </Button>
        </div>

        <div className="space-y-5">
          {items.map((item, idx) => (
            <div key={item.tempId} className="p-4 border border-slate-200 rounded-xl space-y-3 relative">
              {items.length > 1 && (
                <button
                  type="button"
                  onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                  aria-label="Remove"
                  className="absolute top-3 right-3 text-slate-300 hover:text-danger-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Drug #{idx + 1}</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Drug Name"
                  required
                  value={item.drugName}
                  onChange={(e) => updateItem(idx, 'drugName', e.target.value)}
                  placeholder="e.g. Amoxicillin 500mg"
                />
                <Input
                  label="Dosage"
                  required
                  value={item.dosage}
                  onChange={(e) => updateItem(idx, 'dosage', e.target.value)}
                  placeholder="e.g. 500mg"
                />
                <Select
                  label="Frequency"
                  required
                  options={FREQUENCIES}
                  value={item.frequency}
                  onChange={(e) => updateItem(idx, 'frequency', e.target.value)}
                />
                <Input
                  label="Duration"
                  required
                  value={item.duration}
                  onChange={(e) => updateItem(idx, 'duration', e.target.value)}
                  placeholder="e.g. 7 days"
                />
                <Select
                  label="Route"
                  options={ROUTES}
                  value={item.route}
                  onChange={(e) => updateItem(idx, 'route', e.target.value)}
                />
                <Input
                  label="Quantity"
                  type="number"
                  min={1}
                  value={item.quantity ?? 1}
                  onChange={(e) => updateItem(idx, 'quantity', Number(e.target.value))}
                />
              </div>

              <Input
                label="Special Instructions"
                value={item.instructions ?? ''}
                onChange={(e) => updateItem(idx, 'instructions', e.target.value)}
                placeholder="e.g. Take with food"
              />

              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <input
                    id={`subst-${item.tempId}`}
                    type="checkbox"
                    checked={item.substitutionAllowed}
                    onChange={(e) => updateItem(idx, 'substitutionAllowed', e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                  />
                  <label htmlFor={`subst-${item.tempId}`} className="text-sm text-slate-600">
                    Substitution allowed
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-slate-600">Refills:</label>
                  <input
                    type="number"
                    min={0}
                    max={12}
                    value={item.refills}
                    onChange={(e) => updateItem(idx, 'refills', Number(e.target.value))}
                    className="w-16 border border-slate-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary-400"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Notes */}
      <Card>
        <Textarea
          label="Prescription Notes"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Additional notes for the pharmacist..."
        />
      </Card>

      <div className="flex items-center justify-end gap-3">
        <Button variant="secondary" onClick={() => navigate('/prescriptions')}>Cancel</Button>
        <Button variant="primary" onClick={handleSubmit} loading={mutation.isPending}>
          Create Prescription
        </Button>
      </div>
    </div>
  )
}
