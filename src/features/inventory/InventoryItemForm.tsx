import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { inventoryService } from '@/services/inventory.service'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { SkeletonCard } from '@/components/feedback/LoadingSkeleton'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  sku: z.string().min(1, 'SKU is required'),
  category: z.string().min(1, 'Category is required'),
  unit: z.string().min(1, 'Unit is required'),
  reorderLevel: z.coerce.number().min(0, 'Must be 0 or more'),
  location: z.string().optional(),
  expiryDate: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

const CATEGORIES = [
  { value: 'medicine', label: 'Medicine' },
  { value: 'consumable', label: 'Consumable' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'reagent', label: 'Reagent' },
  { value: 'other', label: 'Other' },
]

const UNITS = [
  { value: 'tablet', label: 'Tablet' },
  { value: 'capsule', label: 'Capsule' },
  { value: 'vial', label: 'Vial' },
  { value: 'bottle', label: 'Bottle' },
  { value: 'sachet', label: 'Sachet' },
  { value: 'ampoule', label: 'Ampoule' },
  { value: 'unit', label: 'Unit' },
  { value: 'pack', label: 'Pack' },
  { value: 'ml', label: 'mL' },
  { value: 'g', label: 'g' },
  { value: 'kg', label: 'kg' },
  { value: 'piece', label: 'Piece' },
]

export function InventoryItemForm() {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const qc = useQueryClient()
  const isEdit = !!id

  const { data: existing, isLoading } = useQuery({
    queryKey: ['inventory-item', id],
    queryFn: () => inventoryService.getItem(id!),
    enabled: isEdit,
  })

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    if (existing) {
      reset({
        name: existing.name,
        sku: existing.sku,
        category: existing.category,
        unit: existing.unit,
        reorderLevel: existing.reorderLevel,
        location: existing.location ?? '',
        expiryDate: existing.expiryDate ?? '',
      })
    }
  }, [existing, reset])

  const createMutation = useMutation({
    mutationFn: (data: FormValues) => inventoryService.createItem({ ...data, stockOnHand: 0, isActive: true }),
    onSuccess: (item) => {
      toast('success', 'Item created')
      qc.invalidateQueries({ queryKey: ['inventory-items'] })
      navigate(`/inventory/items/${item.id}`)
    },
    onError: () => toast('error', 'Failed to create item'),
  })

  const updateMutation = useMutation({
    mutationFn: (data: FormValues) => inventoryService.updateItem(id!, data),
    onSuccess: () => {
      toast('success', 'Item updated')
      qc.invalidateQueries({ queryKey: ['inventory-item', id] })
      qc.invalidateQueries({ queryKey: ['inventory-items'] })
      navigate(`/inventory/items/${id}`)
    },
    onError: () => toast('error', 'Failed to update item'),
  })

  const onSubmit = (data: FormValues) => {
    if (isEdit) updateMutation.mutate(data)
    else createMutation.mutate(data)
  }

  if (isEdit && isLoading) return <SkeletonCard lines={6} />

  return (
    <div className="max-w-xl space-y-5">
      <PageHeader
        title={isEdit ? 'Edit item' : 'Add inventory item'}
        backHref="/inventory/items"
        breadcrumbs={[{ label: 'Inventory', href: '/inventory' }, { label: 'Items', href: '/inventory/items' }, { label: isEdit ? 'Edit' : 'New' }]}
      />

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <Card>
          <div className="space-y-4">
            <Input {...register('name')} label="Item Name" required error={errors.name?.message} placeholder="e.g. Paracetamol 500mg" />
            <div className="grid grid-cols-2 gap-3">
              <Input {...register('sku')} label="SKU / Item Code" required error={errors.sku?.message} placeholder="e.g. MED-001" />
              <Select
                {...register('category')}
                label="Category"
                required
                options={CATEGORIES}
                placeholder="Select category"
                error={errors.category?.message}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Select
                {...register('unit')}
                label="Unit of Measure"
                required
                options={UNITS}
                placeholder="Select unit"
                error={errors.unit?.message}
              />
              <Input
                {...register('reorderLevel')}
                label="Reorder Level"
                type="number"
                min={0}
                required
                error={errors.reorderLevel?.message}
                hint="Alert when stock falls to this level"
              />
            </div>
            <Input {...register('location')} label="Storage Location" placeholder="e.g. Shelf A-3, Ward Pharmacy" />
            <Input {...register('expiryDate')} label="Expiry Date (default batch)" type="date" />
          </div>

          <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
            <Button variant="secondary" type="button" onClick={() => navigate('/inventory/items')}>Cancel</Button>
            <Button variant="primary" type="submit" loading={isSubmitting || createMutation.isPending || updateMutation.isPending}>
              {isEdit ? 'Save Changes' : 'Add Item'}
            </Button>
          </div>
        </Card>
      </form>
    </div>
  )
}
