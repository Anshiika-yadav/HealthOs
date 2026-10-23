import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Search } from 'lucide-react'
import { billingService } from '@/services/billing.service'
import { patientService } from '@/services/patient.service'
import { settingsService } from '@/services/settings.service'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { SkeletonCard } from '@/components/feedback/LoadingSkeleton'
import { formatCurrency } from '@/utils/format'
import type { InvoiceItem } from '@/types'

interface LineItem {
  tempId: string
  description: string
  serviceId: string
  category: string
  quantity: number
  unitPrice: number
  discount: number
  taxRate: number
}

const CATEGORIES = [
  { value: 'consultation', label: 'Consultation' },
  { value: 'laboratory', label: 'Laboratory' },
  { value: 'pharmacy', label: 'Pharmacy' },
  { value: 'procedure', label: 'Procedure' },
  { value: 'room', label: 'Room / Bed' },
  { value: 'other', label: 'Other' },
]

function calcLine(item: LineItem) {
  const gross = item.quantity * item.unitPrice
  const disc = gross * (item.discount / 100)
  const taxable = gross - disc
  const tax = taxable * (item.taxRate / 100)
  return { gross, disc, tax, total: taxable + tax }
}

function calcTotals(items: LineItem[]) {
  return items.reduce(
    (acc, item) => {
      const c = calcLine(item)
      return { subtotal: acc.subtotal + c.gross, discountTotal: acc.discountTotal + c.disc, taxTotal: acc.taxTotal + c.tax, total: acc.total + c.total }
    },
    { subtotal: 0, discountTotal: 0, taxTotal: 0, total: 0 }
  )
}

function emptyLine(): LineItem {
  return { tempId: Math.random().toString(36).slice(2), description: '', serviceId: '', category: 'consultation', quantity: 1, unitPrice: 0, discount: 0, taxRate: 0 }
}

export function InvoiceForm() {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const qc = useQueryClient()
  const [searchParams] = useSearchParams()
  const presetPatientId = searchParams.get('patientId') ?? ''
  const presetEncounterId = searchParams.get('encounterId') ?? ''
  const isEdit = !!id

  const [patientId, setPatientId] = useState(presetPatientId)
  const [encounterId] = useState(presetEncounterId)
  const [notes, setNotes] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [lines, setLines] = useState<LineItem[]>([emptyLine()])
  const [patientSearch, setPatientSearch] = useState('')

  // Load existing invoice for edit
  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => billingService.getInvoice(id!),
    enabled: isEdit,
  })

  useEffect(() => {
    if (existing) {
      setPatientId(existing.patientId)
      setNotes(existing.notes ?? '')
      setDueDate(existing.dueDate ?? '')
      setLines(existing.items.map(item => ({
        tempId: item.id,
        description: item.description,
        serviceId: item.serviceId ?? '',
        category: item.category,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
        taxRate: item.tax > 0 ? (item.tax / (item.quantity * item.unitPrice) * 100) : 0,
      })))
    }
  }, [existing])

  // Patient lookup
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

  // Services for quick-fill
  const { data: services } = useQuery({
    queryKey: ['services'],
    queryFn: () => settingsService.listServices(),
  })

  const totals = calcTotals(lines)

  const buildPayload = () => ({
    patientId,
    encounterId: encounterId || undefined,
    notes: notes || undefined,
    dueDate: dueDate || undefined,
    items: lines.map(l => ({
      id: '',
      description: l.description,
      serviceId: l.serviceId || undefined,
      category: l.category,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      discount: l.discount,
      tax: calcLine(l).tax,
      total: calcLine(l).total,
    })),
    subtotal: totals.subtotal,
    discountTotal: totals.discountTotal,
    taxTotal: totals.taxTotal,
    total: totals.total,
    currency: 'USD',
  })

  const createMutation = useMutation({
    mutationFn: () => billingService.createInvoice(buildPayload()),
    onSuccess: (inv) => {
      toast('success', 'Invoice created', `Draft #${inv.invoiceNumber}`)
      qc.invalidateQueries({ queryKey: ['invoices'] })
      navigate(`/billing/invoices/${inv.id}`)
    },
    onError: () => toast('error', 'Failed to create invoice'),
  })

  const updateMutation = useMutation({
    mutationFn: () => billingService.updateInvoice(id!, buildPayload()),
    onSuccess: () => {
      toast('success', 'Invoice updated')
      qc.invalidateQueries({ queryKey: ['invoice', id] })
      navigate(`/billing/invoices/${id}`)
    },
    onError: () => toast('error', 'Failed to update invoice'),
  })

  const handleSave = () => {
    if (!patientId) { toast('error', 'Select a patient first'); return }
    if (lines.every(l => !l.description)) { toast('error', 'Add at least one line item'); return }
    if (isEdit) updateMutation.mutate()
    else createMutation.mutate()
  }

  const updateLine = (idx: number, key: keyof LineItem, val: string | number) => {
    setLines(prev => prev.map((l, i) => i === idx ? { ...l, [key]: val } : l))
  }

  const fillFromService = (idx: number, serviceId: string) => {
    const svc = services?.find(s => s.id === serviceId)
    if (!svc) return
    setLines(prev => prev.map((l, i) => i === idx
      ? { ...l, serviceId, description: svc.name, unitPrice: svc.price, category: svc.category, taxRate: svc.taxRate }
      : l
    ))
  }

  if (isEdit && loadingExisting) return <SkeletonCard lines={8} />

  return (
    <div className="space-y-5 max-w-4xl">
      <PageHeader
        title={isEdit ? 'Edit invoice' : 'Create invoice'}
        description="Add billable services."
        backHref="/billing/invoices"
        breadcrumbs={[{ label: 'Billing', href: '/billing/invoices' }, { label: isEdit ? 'Edit' : 'New' }]}
      />

      {/* Patient */}
      <Card>
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Patient</h3>
        {patientId && selectedPatient ? (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center font-bold text-primary-700 text-sm">
              {selectedPatient.firstName[0]}{selectedPatient.lastName[0]}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-slate-900">{selectedPatient.fullName}</p>
              <p className="text-xs text-slate-500">MRN: {selectedPatient.mrn} · {selectedPatient.phone}</p>
            </div>
            {!isEdit && (
              <Button variant="ghost" size="xs" onClick={() => setPatientId('')}>Change</Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <Input
              placeholder="Search patient by name, MRN or phone..."
              value={patientSearch}
              onChange={e => setPatientSearch(e.target.value)}
              leftElement={<Search className="w-4 h-4" />}
            />
            {patientResults && patientResults.data.length > 0 && (
              <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-40 overflow-y-auto">
                {patientResults.data.map(p => (
                  <button key={p.id} type="button"
                    onClick={() => { setPatientId(p.id); setPatientSearch(p.fullName) }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 text-sm">
                    <span className="font-medium text-slate-900">{p.fullName}</span>
                    <span className="text-slate-400 ml-2">MRN: {p.mrn}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Line items */}
      <Card padding="none">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Line Items</h3>
          <Button variant="outline" size="xs" leftIcon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => setLines(prev => [...prev, emptyLine()])}>
            Add Item
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-4 py-2 text-left text-xs text-slate-500 font-semibold w-[28%]">Description</th>
                <th className="px-2 py-2 text-left text-xs text-slate-500 font-semibold w-[14%]">Category</th>
                <th className="px-2 py-2 text-right text-xs text-slate-500 font-semibold w-[8%]">Qty</th>
                <th className="px-2 py-2 text-right text-xs text-slate-500 font-semibold w-[12%]">Unit Price</th>
                <th className="px-2 py-2 text-right text-xs text-slate-500 font-semibold w-[8%]">Disc%</th>
                <th className="px-2 py-2 text-right text-xs text-slate-500 font-semibold w-[8%]">Tax%</th>
                <th className="px-2 py-2 text-right text-xs text-slate-500 font-semibold w-[12%]">Total</th>
                <th className="px-2 py-2 w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {lines.map((line, idx) => {
                const { total } = calcLine(line)
                return (
                  <tr key={line.tempId} className="hover:bg-slate-50/50">
                    <td className="px-4 py-2">
                      <div className="space-y-1">
                        {services && services.length > 0 && (
                          <select
                            className="w-full text-xs border-0 bg-transparent text-primary-600 underline cursor-pointer focus:outline-none"
                            value={line.serviceId}
                            onChange={e => fillFromService(idx, e.target.value)}
                          >
                            <option value="">Pick service...</option>
                            {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                        )}
                        <input
                          className="w-full border border-slate-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary-400"
                          placeholder="Description"
                          value={line.description}
                          onChange={e => updateLine(idx, 'description', e.target.value)}
                        />
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      <select
                        className="w-full border border-slate-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary-400"
                        value={line.category}
                        onChange={e => updateLine(idx, 'category', e.target.value)}
                      >
                        {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-2">
                      <input type="number" min={1}
                        className="w-full border border-slate-200 rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-primary-400"
                        value={line.quantity}
                        onChange={e => updateLine(idx, 'quantity', Number(e.target.value))} />
                    </td>
                    <td className="px-2 py-2">
                      <input type="number" min={0} step="0.01"
                        className="w-full border border-slate-200 rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-primary-400"
                        value={line.unitPrice}
                        onChange={e => updateLine(idx, 'unitPrice', Number(e.target.value))} />
                    </td>
                    <td className="px-2 py-2">
                      <input type="number" min={0} max={100}
                        className="w-full border border-slate-200 rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-primary-400"
                        value={line.discount}
                        onChange={e => updateLine(idx, 'discount', Number(e.target.value))} />
                    </td>
                    <td className="px-2 py-2">
                      <input type="number" min={0} max={100}
                        className="w-full border border-slate-200 rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-primary-400"
                        value={line.taxRate}
                        onChange={e => updateLine(idx, 'taxRate', Number(e.target.value))} />
                    </td>
                    <td className="px-2 py-2 text-right font-semibold text-slate-900">
                      {formatCurrency(total)}
                    </td>
                    <td className="px-2 py-2">
                      <button onClick={() => setLines(prev => prev.filter((_, i) => i !== idx))}
                        className="text-slate-300 hover:text-danger-500 transition-colors" aria-label="Remove line">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="border-t border-slate-200 p-5">
          <div className="flex justify-end">
            <div className="w-56 space-y-2 text-sm">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal</span>
                <span>{formatCurrency(totals.subtotal)}</span>
              </div>
              {totals.discountTotal > 0 && (
                <div className="flex justify-between text-success-600">
                  <span>Discount</span>
                  <span>-{formatCurrency(totals.discountTotal)}</span>
                </div>
              )}
              {totals.taxTotal > 0 && (
                <div className="flex justify-between text-slate-500">
                  <span>Tax</span>
                  <span>{formatCurrency(totals.taxTotal)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-slate-900 text-base border-t border-slate-200 pt-2">
                <span>Total</span>
                <span>{formatCurrency(totals.total)}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Notes & Due Date */}
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Due Date"
            type="date"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
          />
          <div />
          <Textarea
            label="Notes"
            rows={2}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Optional invoice notes..."
            className="sm:col-span-2"
          />
        </div>
      </Card>

      <div className="flex items-center justify-end gap-3">
        <Button variant="secondary" onClick={() => navigate('/billing/invoices')}>Cancel</Button>
        <Button variant="primary" onClick={handleSave}
          loading={createMutation.isPending || updateMutation.isPending}>
          {isEdit ? 'Save Changes' : 'Create Invoice'}
        </Button>
      </div>
    </div>
  )
}
