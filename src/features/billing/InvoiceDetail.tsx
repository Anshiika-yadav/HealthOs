import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { billingService } from '@/services/billing.service'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge, statusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Modal, ConfirmDialog } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { SkeletonCard } from '@/components/feedback/LoadingSkeleton'
import { ErrorState } from '@/components/feedback/EmptyState'
import { formatDate, formatDateTime, formatCurrency } from '@/utils/format'
import { Download, CreditCard, RotateCcw, XCircle, Printer, ReceiptText } from 'lucide-react'
import type { Payment } from '@/types'

const cancelSchema = z.object({ reason: z.string().min(3, 'Reason required') })
const reverseSchema = z.object({ reason: z.string().min(3, 'Reason required') })
const refundSchema = z.object({
  paymentId: z.string().min(1),
  amount: z.coerce.number().positive('Enter a positive amount'),
  reason: z.string().min(3, 'Reason required'),
})
type CancelForm = z.infer<typeof cancelSchema>
type ReverseForm = z.infer<typeof reverseSchema>
type RefundForm = z.infer<typeof refundSchema>

export function InvoiceDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const qc = useQueryClient()
  const [showCancel, setShowCancel] = useState(false)
  const [showRefund, setShowRefund] = useState<Payment | null>(null)
  const [showReverse, setShowReverse] = useState<Payment | null>(null)
  const [confirmPost, setConfirmPost] = useState(false)

  const { data: invoice, isLoading, isError, refetch } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => billingService.getInvoice(id!),
    enabled: !!id,
  })

  const { data: payments } = useQuery({
    queryKey: ['payments', { invoiceId: id }],
    queryFn: () => billingService.listPayments({ invoiceId: id, pageSize: 50 }),
    enabled: !!id,
  })

  const postMutation = useMutation({
    mutationFn: () => billingService.postInvoice(id!),
    onSuccess: () => { toast('success', 'Invoice posted'); qc.invalidateQueries({ queryKey: ['invoice', id] }); setConfirmPost(false) },
    onError: () => toast('error', 'Failed to post invoice'),
  })

  const { register: regCancel, handleSubmit: handleCancel, formState: { errors: cancelErrors, isSubmitting: cancelSubmitting } } = useForm<CancelForm>({ resolver: zodResolver(cancelSchema) })
  const cancelMutation = useMutation({
    mutationFn: (data: CancelForm) => billingService.cancelInvoice(id!, data.reason),
    onSuccess: () => { toast('success', 'Invoice cancelled'); qc.invalidateQueries({ queryKey: ['invoice', id] }); setShowCancel(false) },
    onError: () => toast('error', 'Failed to cancel invoice'),
  })

  const { register: regRefund, handleSubmit: handleRefund, formState: { errors: refundErrors, isSubmitting: refundSubmitting }, reset: resetRefund } = useForm<RefundForm>({ resolver: zodResolver(refundSchema) })
  const refundMutation = useMutation({
    mutationFn: (data: RefundForm) => billingService.createRefund(data),
    onSuccess: () => { toast('success', 'Refund request submitted'); qc.invalidateQueries({ queryKey: ['payments', { invoiceId: id }] }); setShowRefund(null); resetRefund() },
    onError: () => toast('error', 'Failed to submit refund'),
  })

  const { register: regReverse, handleSubmit: handleReverse, formState: { errors: reverseErrors, isSubmitting: reverseSubmitting } } = useForm<ReverseForm>({ resolver: zodResolver(reverseSchema) })
  const reverseMutation = useMutation({
    mutationFn: (data: ReverseForm) => billingService.reversePayment(showReverse!.id, data.reason),
    onSuccess: () => { toast('success', 'Payment reversed'); qc.invalidateQueries({ queryKey: ['invoice', id], }); qc.invalidateQueries({ queryKey: ['payments', { invoiceId: id }] }); setShowReverse(null) },
    onError: () => toast('error', 'Failed to reverse payment'),
  })

  const handleDownload = async () => {
    try {
      const blob = await billingService.downloadInvoicePdf(id!)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = `invoice-${invoice?.invoiceNumber}.pdf`; a.click()
      URL.revokeObjectURL(url)
    } catch { toast('error', 'PDF unavailable', 'The backend PDF service may not be configured.') }
  }

  if (isLoading) return <SkeletonCard lines={10} />
  if (isError || !invoice) return <ErrorState onRetry={refetch} />

  const isDraft = invoice.status === 'draft'
  const isCancellable = ['draft', 'posted', 'partially_paid'].includes(invoice.status)
  const isPayable = ['posted', 'partially_paid'].includes(invoice.status)

  return (
    <div className="space-y-5 max-w-4xl">
      <PageHeader
        title={`Invoice ${invoice.invoiceNumber}`}
        backHref="/billing/invoices"
        breadcrumbs={[{ label: 'Billing', href: '/billing/invoices' }, { label: invoice.invoiceNumber }]}
        actions={
          <div className="flex gap-2 flex-wrap">
            <Badge variant={statusBadge(invoice.status)} dot>{invoice.status.replace(/_/g,' ')}</Badge>
            {isDraft && (
              <Button variant="outline" size="sm" onClick={() => navigate(`/billing/invoices/${id}/edit`)}>Edit</Button>
            )}
            {isDraft && (
              <Button variant="primary" size="sm" onClick={() => setConfirmPost(true)}>Post Invoice</Button>
            )}
            {isPayable && (
              <Button variant="success" size="sm" leftIcon={<CreditCard className="w-4 h-4" />}
                onClick={() => navigate(`/billing/payments/new?invoiceId=${id}`)}>
                Collect Payment
              </Button>
            )}
            <Button variant="outline" size="sm" leftIcon={<Download className="w-4 h-4" />} onClick={handleDownload}>PDF</Button>
            {isCancellable && (
              <Button variant="ghost" size="sm" className="text-danger-600" leftIcon={<XCircle className="w-4 h-4" />}
                onClick={() => setShowCancel(true)}>Cancel</Button>
            )}
          </div>
        }
      />

      {/* Patient & Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="sm:col-span-2">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Bill To</h3>
          <p className="text-base font-bold text-slate-900">{invoice.patientName}</p>
          <p className="text-sm text-slate-500">MRN: {invoice.patientMrn}</p>
          {invoice.dueDate && <p className="text-xs text-slate-400 mt-1">Due: {formatDate(invoice.dueDate)}</p>}
          <p className="text-xs text-slate-400 mt-1">Created: {formatDateTime(invoice.createdAt)}</p>
        </Card>
        <Card>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Total</span>
              <span className="font-bold text-slate-900">{formatCurrency(invoice.total, invoice.currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Paid</span>
              <span className="text-success-600 font-semibold">{formatCurrency(invoice.amountPaid, invoice.currency)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-100 pt-2">
              <span className="font-semibold text-slate-700">Balance</span>
              <span className={`font-bold ${invoice.balance > 0 ? 'text-danger-600' : 'text-success-600'}`}>
                {formatCurrency(invoice.balance, invoice.currency)}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Line items */}
      <Card padding="none">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-900">Line Items</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-5 py-3 text-left text-xs text-slate-500 font-semibold">Description</th>
                <th className="px-4 py-3 text-left text-xs text-slate-500 font-semibold">Category</th>
                <th className="px-4 py-3 text-right text-xs text-slate-500 font-semibold">Qty</th>
                <th className="px-4 py-3 text-right text-xs text-slate-500 font-semibold">Unit Price</th>
                <th className="px-4 py-3 text-right text-xs text-slate-500 font-semibold">Discount</th>
                <th className="px-4 py-3 text-right text-xs text-slate-500 font-semibold">Tax</th>
                <th className="px-4 py-3 text-right text-xs text-slate-500 font-semibold">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {invoice.items.map(item => (
                <tr key={item.id} className="hover:bg-slate-50/50">
                  <td className="px-5 py-3 font-medium text-slate-900">{item.description}</td>
                  <td className="px-4 py-3 text-slate-500 capitalize">{item.category}</td>
                  <td className="px-4 py-3 text-right">{item.quantity}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(item.unitPrice, invoice.currency)}</td>
                  <td className="px-4 py-3 text-right text-success-600">{item.discount > 0 ? `-${formatCurrency(item.discount, invoice.currency)}` : '—'}</td>
                  <td className="px-4 py-3 text-right text-slate-500">{item.tax > 0 ? formatCurrency(item.tax, invoice.currency) : '—'}</td>
                  <td className="px-4 py-3 text-right font-semibold">{formatCurrency(item.total, invoice.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Totals */}
        <div className="border-t border-slate-200 px-5 py-4 flex justify-end">
          <div className="w-52 space-y-1.5 text-sm">
            <div className="flex justify-between text-slate-500"><span>Subtotal</span><span>{formatCurrency(invoice.subtotal, invoice.currency)}</span></div>
            {invoice.discountTotal > 0 && <div className="flex justify-between text-success-600"><span>Discount</span><span>-{formatCurrency(invoice.discountTotal, invoice.currency)}</span></div>}
            {invoice.taxTotal > 0 && <div className="flex justify-between text-slate-500"><span>Tax</span><span>{formatCurrency(invoice.taxTotal, invoice.currency)}</span></div>}
            <div className="flex justify-between font-bold text-slate-900 text-base border-t border-slate-200 pt-2">
              <span>Total</span><span>{formatCurrency(invoice.total, invoice.currency)}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Payment History */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <ReceiptText className="w-4 h-4 text-primary-500" /> Payment History
          </h3>
          {isPayable && (
            <Button variant="outline" size="xs" leftIcon={<CreditCard className="w-3.5 h-3.5" />}
              onClick={() => navigate(`/billing/payments/new?invoiceId=${id}`)}>
              New Payment
            </Button>
          )}
        </div>
        {(payments?.data.length ?? 0) === 0 ? (
          <p className="text-sm text-slate-400">No payments recorded yet.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {payments!.data.map(p => (
              <div key={p.id} className="py-3 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-900">{formatCurrency(p.amount, p.currency)}</p>
                    <Badge variant={statusBadge(p.status)} size="sm">{p.status}</Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {p.paymentMethod.replace(/_/g,' ')} · {p.receivedByName} · {formatDateTime(p.createdAt)}
                    {p.reference && ` · Ref: ${p.reference}`}
                  </p>
                </div>
                {p.status === 'completed' && (
                  <div className="flex gap-1 flex-shrink-0">
                    <Button variant="ghost" size="xs" onClick={() => setShowReverse(p)}>
                      <RotateCcw className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="xs" onClick={() => { setShowRefund(p); resetRefund() }}>
                      Refund
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {invoice.notes && (
        <Card>
          <h3 className="text-sm font-semibold text-slate-900 mb-2">Notes</h3>
          <p className="text-sm text-slate-600">{invoice.notes}</p>
        </Card>
      )}

      {/* Confirm Post */}
      <ConfirmDialog
        isOpen={confirmPost}
        onClose={() => setConfirmPost(false)}
        onConfirm={() => postMutation.mutate()}
        title="Post invoice?"
        message="Posting this invoice makes it billable. You will not be able to edit line items after posting."
        confirmLabel="Post Invoice"
        variant="primary"
        loading={postMutation.isPending}
      />

      {/* Cancel Modal */}
      <Modal isOpen={showCancel} onClose={() => setShowCancel(false)} title="Cancel Invoice" size="sm"
        footer={<>
          <Button variant="secondary" onClick={() => setShowCancel(false)}>Back</Button>
          <Button variant="danger" form="cancel-form" type="submit" loading={cancelSubmitting || cancelMutation.isPending}>Cancel Invoice</Button>
        </>}>
        <form id="cancel-form" onSubmit={handleCancel(d => cancelMutation.mutate(d))} noValidate>
          <Textarea {...regCancel('reason')} label="Reason for cancellation" required rows={3} error={cancelErrors.reason?.message} />
        </form>
      </Modal>

      {/* Refund Modal */}
      <Modal isOpen={!!showRefund} onClose={() => setShowRefund(null)} title="Request Refund" size="sm"
        footer={<>
          <Button variant="secondary" onClick={() => setShowRefund(null)}>Cancel</Button>
          <Button variant="danger" form="refund-form" type="submit" loading={refundSubmitting || refundMutation.isPending}>Submit Refund</Button>
        </>}>
        <form id="refund-form" onSubmit={handleRefund(d => refundMutation.mutate({ ...d, paymentId: showRefund!.id }))} noValidate className="space-y-3">
          <p className="text-sm text-slate-500">Payment: <strong>{formatCurrency(showRefund?.amount ?? 0, showRefund?.currency)}</strong></p>
          <Input {...regRefund('amount')} label="Refund Amount" type="number" step="0.01" required error={refundErrors.amount?.message}
            defaultValue={showRefund?.amount} />
          <Textarea {...regRefund('reason')} label="Reason" required rows={2} error={refundErrors.reason?.message} />
        </form>
      </Modal>

      {/* Reverse Payment Modal */}
      <Modal isOpen={!!showReverse} onClose={() => setShowReverse(null)} title="Reverse Payment" size="sm"
        footer={<>
          <Button variant="secondary" onClick={() => setShowReverse(null)}>Cancel</Button>
          <Button variant="danger" form="reverse-form" type="submit" loading={reverseSubmitting || reverseMutation.isPending}>Reverse Payment</Button>
        </>}>
        <form id="reverse-form" onSubmit={handleReverse(d => reverseMutation.mutate(d))} noValidate className="space-y-3">
          <p className="text-sm text-warning-700 bg-warning-50 border border-warning-200 rounded-lg p-3">
            Reversing a payment is irreversible and will be logged for audit purposes.
          </p>
          <Textarea {...regReverse('reason')} label="Reason for reversal" required rows={2} error={reverseErrors.reason?.message} />
        </form>
      </Modal>
    </div>
  )
}
