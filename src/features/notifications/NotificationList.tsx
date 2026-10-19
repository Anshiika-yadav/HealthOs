import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, CheckCheck, Info, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import { notificationService } from '@/services/notification.service'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/components/ui/Toast'
import { SkeletonTable } from '@/components/feedback/LoadingSkeleton'
import { EmptyState } from '@/components/feedback/EmptyState'
import { formatRelative } from '@/utils/format'
import { cn } from '@/utils/cn'
import { useNavigate } from 'react-router-dom'
import type { Notification } from '@/types'

const NOTIF_ICONS: Record<string, React.ReactNode> = {
  info:    <Info className="w-4 h-4 text-primary-500" />,
  warning: <AlertTriangle className="w-4 h-4 text-warning-500" />,
  success: <CheckCircle className="w-4 h-4 text-success-500" />,
  error:   <XCircle className="w-4 h-4 text-danger-500" />,
}

export function NotificationList() {
  const { toast } = useToast()
  const qc = useQueryClient()
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationService.list({ pageSize: 50 }),
    staleTime: 30_000,
  })

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationService.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const markAllMutation = useMutation({
    mutationFn: () => notificationService.markAllRead(),
    onSuccess: () => {
      toast('success', 'All notifications marked as read')
      qc.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const unread = data?.data.filter((n) => !n.isRead).length ?? 0

  return (
    <div className="space-y-4 max-w-2xl">
      <PageHeader
        title="Notifications"
        description={unread > 0 ? `${unread} unread notification${unread !== 1 ? 's' : ''}` : 'All caught up'}
        breadcrumbs={[{ label: 'Notifications' }]}
        actions={
          unread > 0 ? (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<CheckCheck className="w-4 h-4" />}
              onClick={() => markAllMutation.mutate()}
              loading={markAllMutation.isPending}
            >
              Mark all read
            </Button>
          ) : undefined
        }
      />

      {isLoading && <SkeletonTable rows={6} cols={1} />}

      {!isLoading && (data?.data.length ?? 0) === 0 && (
        <EmptyState
          icon={<Bell className="w-6 h-6" />}
          title="No notifications"
          description="You're all caught up. New notifications will appear here."
        />
      )}

      {!isLoading && (data?.data ?? []).length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
          {data!.data.map((notif: Notification) => (
            <div
              key={notif.id}
              className={cn(
                'flex items-start gap-4 p-4 transition-colors hover:bg-slate-50 cursor-pointer',
                !notif.isRead && 'bg-primary-50/40'
              )}
              onClick={() => {
                if (!notif.isRead) markReadMutation.mutate(notif.id)
                if (notif.link) navigate(notif.link)
              }}
            >
              <div className="flex-shrink-0 mt-0.5">
                {NOTIF_ICONS[notif.type] ?? <Bell className="w-4 h-4 text-slate-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={cn('text-sm', !notif.isRead ? 'font-semibold text-slate-900' : 'font-medium text-slate-700')}>
                    {notif.title}
                  </p>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!notif.isRead && <span className="w-2 h-2 rounded-full bg-primary-500" />}
                    <span className="text-xs text-slate-400">{formatRelative(notif.createdAt)}</span>
                  </div>
                </div>
                <p className="text-sm text-slate-500 mt-0.5">{notif.message}</p>
                <Badge variant="outline" size="sm" className="mt-1">{notif.module}</Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
