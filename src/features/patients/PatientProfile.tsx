import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { patientService } from '@/services/patient.service'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge, statusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { SkeletonCard } from '@/components/feedback/LoadingSkeleton'
import { ErrorState } from '@/components/feedback/EmptyState'
import { formatDate, formatDateTime } from '@/utils/format'
import {
  UserRound, Phone, Mail, MapPin, Calendar, Activity, Receipt,
  FlaskConical, ClipboardList, FileText, Clock,
} from 'lucide-react'
import type { PatientTimeline } from '@/types'

const TABS = ['Overview', 'Timeline', 'Encounters', 'Invoices', 'Lab Results', 'Prescriptions'] as const
type Tab = typeof TABS[number]

const TIMELINE_ICONS: Record<string, React.ReactNode> = {
  appointment:  <Calendar className="w-4 h-4" />,
  encounter:    <Activity className="w-4 h-4" />,
  invoice:      <Receipt className="w-4 h-4" />,
  lab_result:   <FlaskConical className="w-4 h-4" />,
  prescription: <ClipboardList className="w-4 h-4" />,
  note:         <FileText className="w-4 h-4" />,
}

export function PatientProfile() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<Tab>('Overview')

  const { data: patient, isLoading, isError, refetch } = useQuery({
    queryKey: ['patient', id],
    queryFn: () => patientService.get(id!),
    enabled: !!id,
  })

  const { data: timeline } = useQuery({
    queryKey: ['patient-timeline', id],
    queryFn: () => patientService.getTimeline(id!),
    enabled: !!id && activeTab === 'Timeline',
  })

  if (isLoading) return <div className="space-y-4"><SkeletonCard /><SkeletonCard /></div>
  if (isError || !patient) return <ErrorState onRetry={refetch} />

  return (
    <div className="space-y-5">
      <PageHeader
        title="Patient profile"
        description="Timeline of care."
        backHref="/patients"
        breadcrumbs={[{ label: 'Patients', href: '/patients' }, { label: patient.fullName }]}
        actions={
          <>
            <Badge variant={statusBadge(patient.status)} dot>{patient.status}</Badge>
            <Button variant="outline" size="sm" onClick={() => navigate(`/patients/${id}/edit`)}>Edit</Button>
            <Button variant="primary" size="sm" onClick={() => navigate(`/encounters/new?patientId=${id}`)}>New Encounter</Button>
          </>
        }
      />

      {/* Patient summary banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-start gap-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold flex-shrink-0 ${patient.gender === 'male' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'}`}>
            {patient.firstName[0]}{patient.lastName[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-lg font-bold text-slate-900">{patient.fullName}</h2>
              <Badge variant="outline">MRN: {patient.mrn}</Badge>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-1 mt-2 text-sm text-slate-500">
              <span className="flex items-center gap-1.5"><UserRound className="w-3.5 h-3.5" /> {patient.gender} · {patient.age ?? '—'} yrs</span>
              <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {formatDate(patient.dateOfBirth)}</span>
              <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> {patient.phone}</span>
              {patient.email && <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {patient.email}</span>}
              {patient.city && <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {patient.city}</span>}
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button variant="outline" size="sm" onClick={() => navigate(`/appointments/new?patientId=${id}`)}>Book Appointment</Button>
            <Button variant="outline" size="sm" onClick={() => navigate(`/billing/invoices/new?patientId=${id}`)}>Create Invoice</Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex gap-1 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
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

      {activeTab === 'Overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Personal Details</h3>
            <dl className="space-y-3 text-sm">
              <DetailRow label="Blood Group" value={patient.bloodGroup ?? '—'} />
              <DetailRow label="ID Type" value={patient.identificationType ?? '—'} />
              <DetailRow label="ID Number" value={patient.identificationNumber ?? '—'} />
              <DetailRow label="Insurance" value={patient.insuranceProvider ? `${patient.insuranceProvider} · ${patient.insuranceNumber}` : '—'} />
              <DetailRow label="Address" value={[patient.address, patient.city, patient.country].filter(Boolean).join(', ') || '—'} />
            </dl>
          </Card>
          <Card>
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Emergency Contacts</h3>
            <dl className="space-y-3 text-sm">
              <DetailRow label="Next of Kin" value={patient.nextOfKin ?? '—'} />
              <DetailRow label="Next of Kin Phone" value={patient.nextOfKinPhone ?? '—'} />
              <DetailRow label="Emergency Contact" value={patient.emergencyContact ?? '—'} />
              <DetailRow label="Emergency Phone" value={patient.emergencyPhone ?? '—'} />
            </dl>
            {patient.allergies && patient.allergies.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Allergies</p>
                <div className="flex flex-wrap gap-1.5">
                  {patient.allergies.map((a) => (
                    <Badge key={a} variant="danger" size="sm">{a}</Badge>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {activeTab === 'Timeline' && (
        <Card>
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Patient Timeline</h3>
          {!timeline || timeline.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">No activity recorded yet.</p>
          ) : (
            <ol className="relative border-l-2 border-slate-100 space-y-4 pl-6">
              {timeline.map((event) => (
                <li key={event.id} className="relative">
                  <span className="absolute -left-[1.3125rem] w-5 h-5 rounded-full bg-white border-2 border-primary-400 flex items-center justify-center text-primary-500">
                    {TIMELINE_ICONS[event.type] ?? <Clock className="w-3 h-3" />}
                  </span>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{event.title}</p>
                        {event.description && <p className="text-xs text-slate-500 mt-0.5">{event.description}</p>}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {event.status && <Badge variant={statusBadge(event.status)} size="sm">{event.status}</Badge>}
                        <span className="text-xs text-slate-400">{formatDateTime(event.date)}</span>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Card>
      )}

      {(activeTab === 'Encounters' || activeTab === 'Invoices' || activeTab === 'Lab Results' || activeTab === 'Prescriptions') && (
        <Card>
          <p className="text-sm text-slate-500 text-center py-6">
            Navigate to the dedicated{' '}
            <button
              className="text-primary-600 hover:underline"
              onClick={() => {
                const routes: Record<string, string> = {
                  Encounters: `/encounters?patientId=${id}`,
                  Invoices: `/billing/invoices?patientId=${id}`,
                  'Lab Results': `/laboratory?patientId=${id}`,
                  Prescriptions: `/prescriptions?patientId=${id}`,
                }
                navigate(routes[activeTab])
              }}
            >
              {activeTab}
            </button>{' '}
            section for full details.
          </p>
        </Card>
      )}
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-slate-500 flex-shrink-0 min-w-[140px]">{label}</dt>
      <dd className="text-slate-900 text-right">{value}</dd>
    </div>
  )
}
