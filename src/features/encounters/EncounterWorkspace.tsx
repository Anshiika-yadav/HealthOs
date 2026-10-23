import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { encounterService } from '@/services/encounter.service'
import { patientService } from '@/services/patient.service'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge, statusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { ConfirmDialog } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { SkeletonCard } from '@/components/feedback/LoadingSkeleton'
import { formatDate, formatDateTime } from '@/utils/format'
import type { Encounter, Vitals, Diagnosis } from '@/types'
import { Plus, Trash2, CheckCircle, Lock } from 'lucide-react'

export function EncounterWorkspace() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const qc = useQueryClient()
  const isNew = !id || id === 'new'
  const patientId = searchParams.get('patientId')

  const [encounter, setEncounter] = useState<Partial<Encounter>>({
    chiefComplaint: '',
    examination: '',
    treatmentPlan: '',
    notes: '',
    diagnoses: [],
    vitals: {},
    status: 'draft',
  })
  const [confirmFinalize, setConfirmFinalize] = useState(false)
  const [saving, setSaving] = useState(false)

  const { data: existing, isLoading } = useQuery({
    queryKey: ['encounter', id],
    queryFn: () => encounterService.get(id!),
    enabled: !isNew,
  })

  const { data: patient } = useQuery({
    queryKey: ['patient', patientId ?? existing?.patientId],
    queryFn: () => patientService.get((patientId ?? existing?.patientId)!),
    enabled: !!(patientId ?? existing?.patientId),
  })

  useEffect(() => {
    if (existing) setEncounter(existing)
  }, [existing])

  const createMutation = useMutation({
    mutationFn: (data: Partial<Encounter>) => encounterService.create({ ...data, patientId: patientId! }),
    onSuccess: (enc) => {
      toast('success', 'Encounter created')
      qc.invalidateQueries({ queryKey: ['encounters'] })
      navigate(`/encounters/${enc.id}`)
    },
    onError: () => toast('error', 'Failed to create encounter'),
  })

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Encounter>) => encounterService.update(id!, data),
    onSuccess: (enc) => {
      toast('success', 'Encounter saved')
      qc.invalidateQueries({ queryKey: ['encounter', id] })
      setEncounter(enc)
    },
    onError: () => toast('error', 'Failed to save encounter'),
  })

  const finalizeMutation = useMutation({
    mutationFn: () => encounterService.finalize(id!),
    onSuccess: (enc) => {
      toast('success', 'Encounter finalized', 'This record is now locked.')
      qc.invalidateQueries({ queryKey: ['encounter', id] })
      setEncounter(enc)
      setConfirmFinalize(false)
    },
    onError: () => toast('error', 'Failed to finalize encounter'),
  })

  const handleSave = () => {
    if (isNew) createMutation.mutate(encounter)
    else updateMutation.mutate(encounter)
  }

  const isFinalized = encounter.status === 'finalized'

  const addDiagnosis = () => {
    setEncounter((prev) => ({
      ...prev,
      diagnoses: [...(prev.diagnoses ?? []), { name: '', type: 'primary' }],
    }))
  }

  const removeDiagnosis = (i: number) => {
    setEncounter((prev) => ({
      ...prev,
      diagnoses: (prev.diagnoses ?? []).filter((_, idx) => idx !== i),
    }))
  }

  const updateDiagnosis = (i: number, field: keyof Diagnosis, value: string) => {
    setEncounter((prev) => {
      const diagnoses = [...(prev.diagnoses ?? [])]
      diagnoses[i] = { ...diagnoses[i], [field]: value }
      return { ...prev, diagnoses }
    })
  }

  const updateVitals = (field: keyof Vitals, value: string | number) => {
    setEncounter((prev) => {
      const updatedVitals = { ...(prev.vitals ?? {}), [field]: value }
      // Auto-calculate BMI when weight and height are both present
      if ((field === 'weight' || field === 'height') && updatedVitals.weight && updatedVitals.height) {
        const weightKg = updatedVitals.weight
        const heightCm = updatedVitals.height
        const heightM = heightCm / 100
        updatedVitals.bmi = Math.round((weightKg / (heightM * heightM)) * 10) / 10
      }
      return { ...prev, vitals: updatedVitals }
    })
  }

  if (!isNew && isLoading) return <SkeletonCard lines={8} />

  return (
    <div className="space-y-4 max-w-4xl">
      <PageHeader
        title={isNew ? 'New clinical encounter' : 'Clinical encounter'}
        description="Save as draft before signing."
        backHref="/encounters"
        breadcrumbs={[{ label: 'Encounters', href: '/encounters' }, { label: isNew ? 'New' : 'Encounter' }]}
        actions={
          <>
            {!isNew && <Badge variant={statusBadge(encounter.status ?? 'draft')} dot>{encounter.status}</Badge>}
            {!isFinalized && (
              <>
                <Button variant="outline" size="sm" onClick={handleSave} loading={createMutation.isPending || updateMutation.isPending}>
                  Save Draft
                </Button>
                {!isNew && (
                  <Button variant="primary" size="sm" leftIcon={<CheckCircle className="w-4 h-4" />} onClick={() => setConfirmFinalize(true)}>
                    Finalize
                  </Button>
                )}
              </>
            )}
            {isFinalized && (
              <div className="flex items-center gap-1.5 text-sm text-slate-500">
                <Lock className="w-4 h-4" /> Finalized {formatDateTime(encounter.finalizedAt)}
              </div>
            )}
          </>
        }
      />

      {/* Patient info */}
      {patient && (
        <div className="bg-primary-50 border border-primary-200 rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-primary-200 flex items-center justify-center font-bold text-primary-700 text-sm">
            {patient.firstName[0]}{patient.lastName[0]}
          </div>
          <div>
            <p className="font-semibold text-slate-900">{patient.fullName}</p>
            <p className="text-sm text-slate-600">MRN: {patient.mrn} · {patient.gender} · {patient.age} yrs · {formatDate(patient.dateOfBirth)}</p>
          </div>
        </div>
      )}

      {/* Chief Complaint */}
      <Card>
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Chief Complaint</h3>
        <Textarea
          label="Chief complaint"
          required
          value={encounter.chiefComplaint}
          onChange={(e) => setEncounter((p) => ({ ...p, chiefComplaint: e.target.value }))}
          disabled={isFinalized}
          placeholder="Describe the patient's main complaint..."
          rows={2}
        />
      </Card>

      {/* Vitals */}
      <Card>
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Vitals</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Input label="Temperature (°C)" type="number" step="0.1" value={encounter.vitals?.temperature ?? ''} onChange={(e) => updateVitals('temperature', parseFloat(e.target.value))} disabled={isFinalized} />
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Blood Pressure</label>
            <div className="flex gap-1">
              <Input placeholder="Sys" type="number" value={encounter.vitals?.bloodPressureSystolic ?? ''} onChange={(e) => updateVitals('bloodPressureSystolic', parseInt(e.target.value))} disabled={isFinalized} className="w-16" />
              <span className="flex items-center text-slate-400">/</span>
              <Input placeholder="Dia" type="number" value={encounter.vitals?.bloodPressureDiastolic ?? ''} onChange={(e) => updateVitals('bloodPressureDiastolic', parseInt(e.target.value))} disabled={isFinalized} className="w-16" />
            </div>
          </div>
          <Input label="Heart Rate (bpm)" type="number" value={encounter.vitals?.heartRate ?? ''} onChange={(e) => updateVitals('heartRate', parseInt(e.target.value))} disabled={isFinalized} />
          <Input label="SpO2 (%)" type="number" value={encounter.vitals?.oxygenSaturation ?? ''} onChange={(e) => updateVitals('oxygenSaturation', parseInt(e.target.value))} disabled={isFinalized} />
          <Input label="Weight (kg)" type="number" value={encounter.vitals?.weight ?? ''} onChange={(e) => updateVitals('weight', parseFloat(e.target.value))} disabled={isFinalized} />
          <Input label="Height (cm)" type="number" value={encounter.vitals?.height ?? ''} onChange={(e) => updateVitals('height', parseFloat(e.target.value))} disabled={isFinalized} />
          <Input label="RR (breaths/min)" type="number" value={encounter.vitals?.respiratoryRate ?? ''} onChange={(e) => updateVitals('respiratoryRate', parseInt(e.target.value))} disabled={isFinalized} />
          <Input label="BMI" type="number" value={encounter.vitals?.bmi ?? ''} onChange={(e) => updateVitals('bmi', parseFloat(e.target.value))} disabled={isFinalized} hint="Auto-calculated from weight & height" />
        </div>
      </Card>

      {/* Examination */}
      <Card>
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Examination Notes</h3>
        <Textarea
          label="Physical examination findings"
          rows={4}
          value={encounter.examination}
          onChange={(e) => setEncounter((p) => ({ ...p, examination: e.target.value }))}
          disabled={isFinalized}
          placeholder="Document examination findings..."
        />
      </Card>

      {/* Diagnoses */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-900">Diagnoses</h3>
          {!isFinalized && (
            <Button variant="outline" size="xs" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={addDiagnosis}>
              Add Diagnosis
            </Button>
          )}
        </div>
        {(encounter.diagnoses ?? []).length === 0 ? (
          <p className="text-sm text-slate-400">No diagnoses added.</p>
        ) : (
          <div className="space-y-3">
            {(encounter.diagnoses ?? []).map((d, i) => (
              <div key={i} className="flex gap-2 items-end">
                <Input
                  label={i === 0 ? 'Diagnosis' : undefined}
                  value={d.name}
                  onChange={(e) => updateDiagnosis(i, 'name', e.target.value)}
                  disabled={isFinalized}
                  placeholder="Diagnosis name or ICD code"
                  className="flex-1"
                />
                <Select
                  label={i === 0 ? 'Type' : undefined}
                  options={[
                    { value: 'primary', label: 'Primary' },
                    { value: 'secondary', label: 'Secondary' },
                    { value: 'differential', label: 'Differential' },
                  ]}
                  value={d.type}
                  onChange={(e) => updateDiagnosis(i, 'type', e.target.value)}
                  disabled={isFinalized}
                  className="w-36"
                />
                {!isFinalized && (
                  <Button variant="ghost" size="sm" className="text-danger-500 mb-0.5" onClick={() => removeDiagnosis(i)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Treatment plan & notes */}
      <Card>
        <div className="space-y-4">
          <Textarea
            label="Treatment plan"
            rows={3}
            value={encounter.treatmentPlan}
            onChange={(e) => setEncounter((p) => ({ ...p, treatmentPlan: e.target.value }))}
            disabled={isFinalized}
          />
          <Textarea
            label="Clinical notes"
            rows={3}
            value={encounter.notes}
            onChange={(e) => setEncounter((p) => ({ ...p, notes: e.target.value }))}
            disabled={isFinalized}
          />
        </div>
      </Card>

      {/* Follow-up */}
      <Card>
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Follow-up</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Follow-up Date"
            type="date"
            value={encounter.followUpDate}
            onChange={(e) => setEncounter((p) => ({ ...p, followUpDate: e.target.value }))}
            disabled={isFinalized}
          />
          <Textarea
            label="Follow-up Instructions"
            rows={2}
            value={encounter.followUpInstructions}
            onChange={(e) => setEncounter((p) => ({ ...p, followUpInstructions: e.target.value }))}
            disabled={isFinalized}
          />
        </div>
      </Card>

      {/* Actions */}
      {!isFinalized && (
        <div className="flex items-center justify-between pt-2">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate(`/prescriptions/new?encounterId=${id}&patientId=${encounter.patientId}`)}>
              + Prescription
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate(`/laboratory/orders/new?encounterId=${id}&patientId=${encounter.patientId}`)}>
              + Lab Order
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate(`/billing/invoices/new?encounterId=${id}&patientId=${encounter.patientId}`)}>
              + Invoice
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => navigate('/encounters')}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} loading={createMutation.isPending || updateMutation.isPending}>
              Save Draft
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmFinalize}
        onClose={() => setConfirmFinalize(false)}
        onConfirm={() => finalizeMutation.mutate()}
        title="Finalize encounter?"
        message="Finalizing this encounter will lock the record. Clinical notes, diagnoses, and vitals cannot be edited after finalization without an authorized amendment. Are you sure?"
        confirmLabel="Finalize Encounter"
        variant="primary"
        loading={finalizeMutation.isPending}
      />
    </div>
  )
}
