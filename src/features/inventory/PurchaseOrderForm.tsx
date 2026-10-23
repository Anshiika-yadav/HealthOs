import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { inventoryService } from '@/services/inventory.service'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { formatCurrency } from '@/utils/format'
import type { PurchaseOrderItem } from '@/types'

interface DraftLine extends Omit<PurchaseOrderItem, 'id' | 'total'> {
  tempId: string
}

function emptyLine(): DraftLine {
  return { tempId: Math.random().toString(36).slice(2), itemId: '', itemName: '', quantity: 1, unitCost: 0, receivedQuantity: 0 }
}

export function PurchaseOrderForm() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const qc = useQueryClient()

  const [supplierId, setSupplierId] = useState('')
  const [expectedDelivery, setExpectedDelivery] = useState('')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<DraftLine[]>([emptyLine()])

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers-all'],
    queryFn: () => inventoryService.listSuppliers({ pageSize: 200 }),
  })

  const { data: items } = useQuery({
    queryKey: ['inventory-items-all'],
    queryFn: () => inventoryService.listItems({ pageSize: 200 }),
  })

  const total = lines.reduce((sum, l) => sum + l.quantity * l.unitCost, 0)

  const mutation = useMutation({
    mutationFn: () =>
      inventoryService.createPurchaseOrder({
        supplierId,
        supplierName: suppliers?.data.find((s) => s.id === supplierId)?.name ?? '',
        expectedDelivery: expectedDelivery || undefined,
        notes: notes || undefined,
        totalAmount: total,
        currency: 'USD',
        items: lines
          .filter((l) => l.itemId)
          .map((l) => ({
            id: '',
            itemId: l.itemId,
            itemName: l.itemName,
            quantity: l.quantity,
            unitCost: l.unitCost,
            total: l.quantity * l.unitCost,
          })),
      }),
    onSuccess: (po) => {
      toast('success', 'Purchase order created', `PO #${po.poNumber}`)
      qc.invalidateQueries({ queryKey: ['purchase-orders'] })
      navigate(`/inventory/purchase-orders/${po.id}`)
    },
    onError: () => toast('error', 'Failed to create purchase order'),
  })

  const handleSubmit = () => {
    if (!supplierId) { toast('error', 'Validation', 'Select a supplier'); return }
    if (lines.every((l) => !l.itemId)) { toast('error', 'Validation', 'Add at least one item'); return }
    mutation.mutate()
  }

  const updateLine = (idx: number, key: keyof DraftLine, val: string | number) => {
    setLines((prev) =>
      prev.map((l, i) => {
        if (i !== idx) return l
        const updated = { ...l, [key]: val }
        if (key === 'itemId') {
          const item = items?.data.find((it) => it.id === val)
          updated.itemName = item?.name ?? ''
        }
        return updated
      })
    )
  }

  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader
        title="New Purchase Order"
        backHref="/inventory/purchase-orders"
        breadcrumbs={[{ label: 'Inventory', href: '/inventory' }, { label: 'Purchase Orders', href: '/inventory/purchase-orders' }, { label: 'New' }]}
      />

      {/* Supplier */}
      <Card>
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Order Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Supplier"
            required
            options={(suppliers?.data ?? []).map((s) => ({ value: s.id, label: s.name }))}
            placeholder="Select supplier"
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
          />
          <Input
            label="Expected Delivery"
            type="date"
            value={expectedDelivery}
            onChange={(e) => setExpectedDelivery(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
          />
        </div>
        <div className="mt-3">
          <Textarea label="Notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes to supplier..." />
        </div>
      </Card>

      {/* Line items */}
      <Card padding="none">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Order Items</h3>
          <Button variant="outline" size="xs" leftIcon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => setLines((prev) => [...prev, emptyLine()])}>
            Add Item
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-4 py-2 text-left text-xs text-slate-500 font-semibold w-[40%]">Item</th>
                <th className="px-2 py-2 text-right text-xs text-slate-500 font-semibold w-[15%]">Qty</th>
                <th className="px-2 py-2 text-right text-xs text-slate-500 font-semibold w-[20%]">Unit Cost</th>
                <th className="px-2 py-2 text-right text-xs text-slate-500 font-semibold w-[18%]">Total</th>
                <th className="px-2 py-2 w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {lines.map((line, idx) => (
                <tr key={line.tempId} className="hover:bg-slate-50/50">
                  <td className="px-4 py-2">
                    <select
                      className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-400"
                      value={line.itemId}
                      onChange={(e) => updateLine(idx, 'itemId', e.target.value)}
                    >
                      <option value="">Select item...</option>
                      {(items?.data ?? []).map((it) => (
                        <option key={it.id} value={it.id}>
                          {it.name} ({it.sku}) — {it.stockOnHand} {it.unit} in stock
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="number" min={1}
                      className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-1 focus:ring-primary-400"
                      value={line.quantity}
                      onChange={(e) => updateLine(idx, 'quantity', Number(e.target.value))}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="number" min={0} step="0.01"
                      className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-1 focus:ring-primary-400"
                      value={line.unitCost}
                      onChange={(e) => updateLine(idx, 'unitCost', Number(e.target.value))}
                    />
                  </td>
                  <td className="px-2 py-2 text-right font-semibold text-slate-900">
                    {formatCurrency(line.quantity * line.unitCost)}
                  </td>
                  <td className="px-2 py-2">
                    <button
                      onClick={() => setLines((prev) => prev.filter((_, i) => i !== idx))}
                      className="text-slate-300 hover:text-danger-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="border-t border-slate-200 px-5 py-4 flex justify-end">
          <div className="text-sm font-bold text-slate-900">
            Total: {formatCurrency(total)}
          </div>
        </div>
      </Card>

      <div className="flex items-center justify-end gap-3">
        <Button variant="secondary" onClick={() => navigate('/inventory/purchase-orders')}>Cancel</Button>
        <Button variant="primary" onClick={handleSubmit} loading={mutation.isPending}>
          Create Purchase Order
        </Button>
      </div>
    </div>
  )
}
