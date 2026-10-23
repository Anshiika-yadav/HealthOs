import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { inventoryService } from '@/services/inventory.service'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge, statusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ConfirmDialog } from '@/components/ui/Modal'
import { SkeletonCard } from '@/components/feedback/LoadingSkeleton'
import { ErrorState } from '@/components/feedback/EmptyState'
import { useToast } from '@/components/ui/Toast'
import { formatDate, formatCurrency } from '@/utils/format'
import { PackageCheck } from 'lucide-react'
import type { PurchaseOrderItem } from '@/types'

export function PurchaseOrderDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const qc = useQueryClient()
  const [confirmReceive, setConfirmReceive] = useState(false)
  const [received, setReceived] = useState<Record<string, number>>({})

  const { data: po, isLoading, isError, refetch } = useQuery({
    queryKey: ['purchase-order', id],
    queryFn: () => inventoryService.getPurchaseOrder(id!),
    enabled: !!id,
  })

  const receiveMutation = useMutation({
    mutationFn: () =>
      inventoryService.receivePurchaseOrder(
        id!,
        Object.entries(received).map(([itemId, quantity]) => ({ itemId, quantity }))
      ),
    onSuccess: () => {
      toast('success', 'Stock received', 'Inventory has been updated by the server.')
      qc.invalidateQueries({ queryKey: ['purchase-order', id] })
      qc.invalidateQueries({ queryKey: ['inventory-items'] })
      setConfirmReceive(false)
    },
    onError: () => toast('error', 'Failed to receive stock'),
  })

  if (isLoading) return <SkeletonCard lines={8} />
  if (isError || !po) return <ErrorState onRetry={refetch} />

  const canReceive = po.status === 'sent' || po.status === 'partial'

  const initReceive = () => {
    const init: Record<string, number> = {}
    po.items.forEach((item) => {
      const remaining = item.quantity - (item.receivedQuantity ?? 0)
      init[item.itemId] = remaining > 0 ? remaining : 0
    })
    setReceived(init)
    setConfirmReceive(true)
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <PageHeader
        title={`PO ${po.poNumber}`}
        backHref="/inventory/purchase-orders"
        breadcrumbs={[{ label: 'Inventory', href: '/inventory' }, { label: 'Purchase Orders', href: '/inventory/purchase-orders' }, { label: po.poNumber }]}
        actions={
          <div className="flex gap-2 items-center">
            <Badge variant={statusBadge(po.status)} dot>{po.status}</Badge>
            {canReceive && (
              <Button variant="primary" size="sm" leftIcon={<PackageCheck className="w-4 h-4" />} onClick={initReceive}>
                Receive Stock
              </Button>
            )}
          </div>
        }
      />

      {/* Header */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Supplier</h3>
          <p className="font-bold text-slate-900">{po.supplierName}</p>
        </Card>
        <Card>
          <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Order Info</h3>
          <div className="text-sm space-y-1 text-slate-600">
            <p>Created: <strong>{formatDate(po.createdAt)}</strong></p>
            {po.expectedDelivery && <p>Expected: <strong>{formatDate(po.expectedDelivery)}</strong></p>}
            <p>Total: <strong className="text-slate-900">{formatCurrency(po.totalAmount, po.currency)}</strong></p>
          </div>
        </Card>
      </div>

      {/* Items */}
      <Card padding="none">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-900">Order Items</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-5 py-3 text-left text-xs text-slate-500 font-semibold">Item</th>
                <th className="px-4 py-3 text-right text-xs text-slate-500 font-semibold">Ordered</th>
                <th className="px-4 py-3 text-right text-xs text-slate-500 font-semibold">Received</th>
                <th className="px-4 py-3 text-right text-xs text-slate-500 font-semibold">Remaining</th>
                <th className="px-4 py-3 text-right text-xs text-slate-500 font-semibold">Unit Cost</th>
                <th className="px-4 py-3 text-right text-xs text-slate-500 font-semibold">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {po.items.map((item: PurchaseOrderItem) => {
                const remaining = item.quantity - (item.receivedQuantity ?? 0)
                return (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="px-5 py-3 font-medium text-slate-900">{item.itemName}</td>
                    <td className="px-4 py-3 text-right">{item.quantity}</td>
                    <td className="px-4 py-3 text-right text-success-600">{item.receivedQuantity ?? 0}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={remaining > 0 ? 'text-warning-600 font-medium' : 'text-slate-400'}>{remaining}</span>
                    </td>
                    <td className="px-4 py-3 text-right">{formatCurrency(item.unitCost, po.currency)}</td>
                    <td className="px-4 py-3 text-right font-semibold">{formatCurrency(item.total, po.currency)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-4 border-t border-slate-100 flex justify-end">
          <p className="text-sm font-bold text-slate-900">Total: {formatCurrency(po.totalAmount, po.currency)}</p>
        </div>
      </Card>

      {po.notes && (
        <Card>
          <h3 className="text-sm font-semibold text-slate-900 mb-1">Notes</h3>
          <p className="text-sm text-slate-600">{po.notes}</p>
        </Card>
      )}

      {/* Receive confirmation */}
      <ConfirmDialog
        isOpen={confirmReceive}
        onClose={() => setConfirmReceive(false)}
        onConfirm={() => receiveMutation.mutate()}
        title="Receive Stock?"
        message={`Confirm receipt of items from PO ${po.poNumber}. Inventory quantities will be updated by the server.`}
        confirmLabel="Confirm Receipt"
        variant="primary"
        loading={receiveMutation.isPending}
      />
    </div>
  )
}
