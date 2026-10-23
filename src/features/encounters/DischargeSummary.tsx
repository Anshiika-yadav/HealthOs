import { useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { encounterService } from '@/services/encounter.service'
import { patientService } from '@/services/patient.service'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge, statusBadge } from '@/components/ui/Badge'
import { SkeletonCard } from '@/components/feedback/LoadingSkeleton'
import { ErrorState } from '@/components/feedback/EmptyState'
import { useToast } from '@/components/ui/Toast'
import { formatDate, formatDateTime } from '@/utils/format'
import { Printer, Download } from 'lucide-react'

export function DischargeSummary() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const printRef = useRef<HTMLDivElement>(null)

  const { data: encounter, isLoading, isError, refetch } = useQuery({
    queryKey: ['encounter', id],
    queryFn: () => encounterService.get(id!),
    enabled: !!id,
  })

  const { data: patient } = useQuery({
    queryKey: ['patient', encounter?.patientId],
    queryFn: () => patientService.get(encounter!.patientId),
    enabled: !!encounter?.patientId,
  })

  const handlePrint = () => window.print()

  const handleDownload = async () => {
    try {
      const blob = await encounterService.getDischargeSummary(id!)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `discharge-summary-${id?.slice(0, 8)}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast('error', 'PDF unavailable', 'The backend discharge summary PDF service may not be configured.')
    }
  }

  if (isLoading) return <SkeletonCard lines={10} />
  if (isError || !encounter) return <ErrorState onRetry={refetch} />

  if (encounter.status !== 'finalized') {
    return (
      <div className="max-w-2xl">
        <PageHeader
          title="Discharge Summary"
          backHref={`/encounters/${id}`}
          breadcrumbs={[{ label: 'Encounters' }, { label: 'Discharge Summary' }]}
        />
        <Card>
          <p className="text-sm text-warning-700 bg-warning-50 border border-warning-200 rounded-lg p-3">
            This encounter has not been finalized. Discharge summaries are only available for finalized encounters.
          </p>
          <Button
            variant="primary" size="sm" className="mt-4"
            onClick={() => navigate(`/encounters/${id}`)}
          >
            Go to Encounter
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Discharge Summary"
        description={`${encounter.patientName} · ${formatDate(encounter.date)}`}
        backHref={`/encounters/${id}`}
        breadcrumbs={[{ label: 'Encounters', href: '/encounters' }, { label: 'Discharge Summary' }]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" leftIcon={<Printer className="w-4 h-4" />} onClick={handlePrint}>
              Print
            </Button>
            <Button variant="primary" size="sm" leftIcon={<Download className="w-4 h-4" />} onClick={handleDownload}>
              Download PDF
            </Button>
          </div>
        }
      />

      {/* Printable content */}
      <div ref={printRef} className="space-y-5 print:p-8">
        {/* Header */}
        <Card>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 print:text-xl">DISCHARGE SUMMARY</h2>
              <p className="text-xs text-slate-400 mt-0.5">Generated: {formatDateTime(new Date().toISOString())}</p>
            </div>
            <Badge variant={statusBadge(encounter.status)} dot>{encounter.status}</Badge>
          </div>
        </Card>

        {/* Patient info */}
        <Card>
          <h3 className="text-sm font-semibold text-slate-900 mb-3 uppercase tracking-wide">Patient Information</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <InfoField label="Full Name" value={encounter.patientName} />
            <InfoField label="MRN" value={encounter.patientMrn} />
            {patient && (
              <>
                <InfoField label="Date of Birth" value={formatDate(patient.dateOfBirth)} />
                <InfoField label="Gender" value={patient.gender} />
                <InfoField label="Phone" value={patient.phone} />
                {patient.bloodGroup && <InfoField label="Blood Group" value={patient.bloodGroup} />}
              </>
            )}
          </div>
        </Card>

        {/* Encounter info */}
        <Card>
          <h3 className="text-sm font-semibold text-slate-900 mb-3 uppercase tracking-wide">Visit Information</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <InfoField label="Visit Date" value={formatDate(encounter.date)} />
            <InfoField label="Department" value={encounter.departmentName} />
            <InfoField label="Clinician" value={encounter.providerName} />
            <InfoField label="Branch" value={encounter.branchName} />
            {encounter.finalizedAt && <InfoField label="Finalized" value={formatDateTime(encounter.finalizedAt)} />}
          </div>
        </Card>

        {/* Chief complaint */}
        <Card>
          <h3 className="text-sm font-semibold text-slate-900 mb-2 uppercase tracking-wide">Chief Complaint</h3>
          <p className="text-sm text-slate-700">{encounter.chiefComplaint}</p>
        </Card>

        {/* Vitals */}
        {encounter.vitals && Object.keys(encounter.vitals).length > 0 && (
          <Card>
            <h3 className="text-sm font-semibold text-slate-900 mb-3 uppercase tracking-wide">Vitals</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              {encounter.vitals.temperature && (
                <InfoField label="Temperature" value={`${encounter.vitals.temperature}°${encounter.vitals.temperatureUnit ?? 'C'}`} />
              )}
              {encounter.vitals.bloodPressureSystolic && (
                <InfoField label="Blood Pressure" value={`${encounter.vitals.bloodPressureSystolic}/${encounter.vitals.bloodPressureDiastolic} mmHg`} />
              )}
              {encounter.vitals.heartRate && (
                <InfoField label="Heart Rate" value={`${encounter.vitals.heartRate} bpm`} />
              )}
              {encounter.vitals.oxygenSaturation && (
                <InfoField label="SpO2" value={`${encounter.vitals.oxygenSaturation}%`} />
              )}
              {encounter.vitals.weight && (
                <InfoField label="Weight" value={`${encounter.vitals.weight} ${encounter.vitals.weightUnit ?? 'kg'}`} />
              )}
              {encounter.vitals.height && (
                <InfoField label="Height" value={`${encounter.vitals.height} ${encounter.vitals.heightUnit ?? 'cm'}`} />
              )}
            </div>
          </Card>
        )}

        {/* Examination */}
        {encounter.examination && (
          <Card>
            <h3 className="text-sm font-semibold text-slate-900 mb-2 uppercase tracking-wide">Examination Findings</h3>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{encounter.examination}</p>
          </Card>
        )}

        {/* Diagnoses */}
        {encounter.diagnoses.length > 0 && (
          <Card>
            <h3 className="text-sm font-semibold text-slate-900 mb-3 uppercase tracking-wide">Diagnoses</h3>
            <div className="space-y-2">
              {encounter.diagnoses.map((d, i) => (
                <div key={i} className="flex items-start gap-2">
                  <Badge variant={d.type === 'primary' ? 'primary' : 'default'} size="sm" className="mt-0.5 flex-shrink-0">
                    {d.type}
                  </Badge>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{d.name}</p>
                    {d.icdCode && <p className="text-xs text-slate-400">ICD: {d.icdCode}</p>}
                    {d.notes && <p className="text-xs text-slate-500">{d.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Treatment plan */}
        {encounter.treatmentPlan && (
          <Card>
            <h3 className="text-sm font-semibold text-slate-900 mb-2 uppercase tracking-wide">Treatment Plan</h3>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{encounter.treatmentPlan}</p>
          </Card>
        )}

        {/* Clinical notes */}
        {encounter.notes && (
          <Card>
            <h3 className="text-sm font-semibold text-slate-900 mb-2 uppercase tracking-wide">Clinical Notes</h3>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{encounter.notes}</p>
          </Card>
        )}

        {/* Follow-up */}
        {(encounter.followUpDate || encounter.followUpInstructions) && (
          <Card>
            <h3 className="text-sm font-semibold text-slate-900 mb-3 uppercase tracking-wide">Follow-Up Instructions</h3>
            {encounter.followUpDate && (
              <p className="text-sm text-slate-700">
                <strong>Return date:</strong> {formatDate(encounter.followUpDate)}
              </p>
            )}
            {encounter.followUpInstructions && (
              <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">{encounter.followUpInstructions}</p>
            )}
          </Card>
        )}

        {/* Signature */}
        <Card>
          <div className="flex items-end justify-between pt-6 border-t border-slate-100">
            <div>
              <div className="w-40 border-b border-slate-400 mb-1" />
              <p className="text-xs text-slate-500">{encounter.providerName}</p>
              <p className="text-xs text-slate-400">{encounter.finalizedBy ?? 'Clinician'}</p>
            </div>
            <p className="text-xs text-slate-400">{formatDate(encounter.finalizedAt ?? encounter.date)}</p>
          </div>
        </Card>
      </div>
    </div>
  )
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-sm font-medium text-slate-900 mt-0.5 capitalize">{value}</p>
    </div>
  )
}
