import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { inventoryService } from '@/services/inventory.service'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'

const schema = z.object({
  itemId:      z.string().min(1, 'Item is required'),
  type:        z.enum(['receive', 'transfer', 'adjustment', 'count', 'wastage']),
  quantity:    z.coerce.number().positive('Quantity must be positive'),
  batchNumber: z.string().optional(),
  expiryDate:  z.string().optional(),
  reason:      z.string().optional(),
  notes:       z.string().optional(),
})
type FormValues = z.infer<typeof schema>

const TYPE_LABELS: Record<string, string> = {
  receive:    'Receive Stock',
  transfer:   'Transfer Stock',
  adjustment: 'Stock Adjustment',
  count:      'Stock Count',
  wastage:    'Record Wastage',
}

const TYPE_DESCRIPTIONS: Record<string, string> = {
  receive:    'Record stock received from a supplier or purchase order.',
  transfer:   'Move stock between branches or locations.',
  adjustment: 'Correct stock levels due to discrepancies.',
  count:      'Record a physical stock count result.',
  wastage:    'Record stock that was damaged, expired, or discarded.',
}

const VALID_TYPES = ['receive', 'transfer', 'adjustment', 'count', 'wastage'] as const

export function StockMovementForm() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const qc = useQueryClient()
  const [searchParams] = useSearchParams()
  const rawType = searchParams.get('type') ?? 'receive'
  const presetType: FormValues['type'] = (VALID_TYPES as readonly string[]).includes(rawType)
    ? (rawType as FormValues['type'])
    : 'receive'
  const presetItemId = searchParams.get('itemId') ?? ''

  const { data: items } = useQuery({
    queryKey: ['inventory-items-all'],
    queryFn: () => inventoryService.listItems({ pageSize: 200 }),
  })

  const {
    register,
    handleSubmit,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { type: presetType, itemId: presetItemId },
  })

  const movementType = watch('type')

  const mutation = useMutation({
    mutationFn: (data: FormValues) =>
      inventoryService.createMovement({
        itemId:      data.itemId,
        type:        data.type,
        quantity:    data.quantity,
        batchNumber: data.batchNumber || undefined,
        reason:      data.reason || undefined,
        // server-side fields filled by backend
        performedById:   '',
        performedByName: '',
        itemName: '',
        id: '',
        createdAt: '',
      }),
    onSuccess: () => {
      toast('success', `${TYPE_LABELS[movementType] ?? 'Movement'} recorded`)
      qc.invalidateQueries({ queryKey: ['inventory-items'] })
      qc.invalidateQueries({ queryKey: ['stock-movements'] })
      navigate('/inventory')
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to record movement'
      toast('error', 'Failed', msg)
    },
  })

  return (
    <div className="max-w-xl space-y-5">
      <PageHeader
        title={TYPE_LABELS[presetType] ?? 'Stock Movement'}
        description={TYPE_DESCRIPTIONS[presetType] ?? ''}
        backHref="/inventory"
        breadcrumbs={[{ label: 'Inventory', href: '/inventory' }, { label: 'Movement' }]}
      />

      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} noValidate>
        <Card>
          <div className="space-y-4">
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  label="Movement Type"
                  required
                  options={Object.entries(TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }))}
                  error={errors.type?.message}
                />
              )}
            />

            <Controller
              name="itemId"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  label="Item"
                  required
                  options={(items?.data ?? []).map((i) => ({
                    value: i.id,
                    label: `${i.name} (${i.sku}) — ${i.stockOnHand} ${i.unit}`,
                  }))}
                  placeholder="Select item"
                  error={errors.itemId?.message}
                />
              )}
            />

            <Input
              {...register('quantity')}
              label="Quantity"
              type="number"
              min={1}
              required
              error={errors.quantity?.message}
            />

            {movementType === 'receive' && (
              <>
                <Input
                  {...register('batchNumber')}
                  label="Batch / Lot Number"
                  placeholder="e.g. LOT-2024-001"
                />
                <Input
                  {...register('expiryDate')}
                  label="Expiry Date"
                  type="date"
                />
              </>
            )}

            {(movementType === 'adjustment' || movementType === 'wastage') && (
              <Input
                {...register('reason')}
                label="Reason"
                required
                placeholder={movementType === 'wastage' ? 'e.g. Expired, Damaged' : 'e.g. Discrepancy after count'}
                error={errors.reason?.message}
              />
            )}

            <Textarea
              {...register('notes')}
              label="Notes"
              rows={2}
              placeholder="Optional notes..."
            />
          </div>

          <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
            <Button variant="secondary" type="button" onClick={() => navigate('/inventory')}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={isSubmitting || mutation.isPending}>
              Record Movement
            </Button>
          </div>
        </Card>
      </form>
    </div>
  )
}
