import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { billingService } from '@/services/billing.service'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { formatCurrency } from '@/utils/format'
import type { PaymentMethod } from '@/types'

const schema = z.object({
  invoiceId: z.string().min(1, 'Invoice is required'),
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  paymentMethod: z.enum(['cash', 'bank_transfer', 'pos', 'wallet', 'insurance', 'other']),
  reference: z.string().optional(),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export function PaymentCollection() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [searchParams] = useSearchParams()
  const invoiceId = searchParams.get('invoiceId') ?? ''

  const { data: invoice } = useQuery({
    queryKey: ['invoice', invoiceId],
    queryFn: () => billingService.getInvoice(invoiceId),
    enabled: !!invoiceId,
  })

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      invoiceId,
      amount: invoice?.balance ?? 0,
      paymentMethod: 'cash',
    },
  })

  const paymentMethod = watch('paymentMethod')

  const mutation = useMutation({
    mutationFn: (data: FormValues) => billingService.createPayment({
      invoiceId: data.invoiceId,
      amount: data.amount,
      paymentMethod: data.paymentMethod as PaymentMethod,
      reference: data.reference,
      notes: data.notes,
      currency: invoice?.currency ?? 'USD',
      patientId: invoice?.patientId,
    }),
    onSuccess: (payment) => {
      toast('success', 'Payment recorded', `Reference: ${payment.id.slice(0,8)}`)
      navigate(`/billing/invoices/${invoiceId}`)
    },
    onError: (err: unknown) => {
      const msg = (err as {response?:{data?:{message?:string}}})?.response?.data?.message ?? 'Payment failed'
      toast('error', 'Payment failed', msg)
    },
  })

  return (
    <div className="max-w-xl space-y-5">
      <PageHeader
        title="Collect payment"
        backHref="/billing/invoices"
        breadcrumbs={[{ label: 'Billing' }, { label: 'Payments' }, { label: 'New' }]}
      />

      {invoice && (
        <div className="bg-primary-50 border border-primary-200 rounded-xl p-4">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Patient</span>
            <span className="font-semibold">{invoice.patientName}</span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-slate-600">Invoice</span>
            <span className="font-mono">{invoice.invoiceNumber}</span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-slate-600">Total</span>
            <span className="font-semibold">{formatCurrency(invoice.total, invoice.currency)}</span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-slate-600">Already Paid</span>
            <span className="text-success-600 font-semibold">{formatCurrency(invoice.amountPaid, invoice.currency)}</span>
          </div>
          <div className="flex justify-between text-base mt-2 pt-2 border-t border-primary-200 font-bold">
            <span>Balance Due</span>
            <span className="text-danger-600">{formatCurrency(invoice.balance, invoice.currency)}</span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} noValidate>
        <Card>
          <div className="space-y-4">
            <Input
              label="Invoice ID"
              {...register('invoiceId')}
              required
              error={errors.invoiceId?.message}
              disabled={!!invoiceId}
            />
            <Input
              label="Amount"
              type="number"
              step="0.01"
              {...register('amount')}
              required
              error={errors.amount?.message}
              hint={invoice ? `Maximum: ${formatCurrency(invoice.balance, invoice.currency)}` : undefined}
            />
            <Select
              label="Payment Method"
              options={[
                { value: 'cash', label: 'Cash' },
                { value: 'bank_transfer', label: 'Bank Transfer' },
                { value: 'pos', label: 'POS / Card' },
                { value: 'wallet', label: 'Wallet' },
                { value: 'insurance', label: 'Insurance' },
                { value: 'other', label: 'Other' },
              ]}
              {...register('paymentMethod')}
              required
              error={errors.paymentMethod?.message}
            />
            {paymentMethod !== 'cash' && (
              <Input
                label="Reference / Transaction ID"
                {...register('reference')}
                placeholder="Bank ref, POS receipt #..."
              />
            )}
            <Textarea
              label="Notes"
              {...register('notes')}
              rows={2}
              placeholder="Optional notes..."
            />

            <div className="flex gap-3 justify-end pt-2">
              <Button variant="secondary" type="button" onClick={() => navigate(-1)}>Cancel</Button>
              <Button variant="primary" type="submit" loading={isSubmitting || mutation.isPending}>
                Post Payment
              </Button>
            </div>
          </div>
        </Card>
      </form>
    </div>
  )
}
