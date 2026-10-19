import apiClient from './apiClient'
import type { Notification, PaginatedResponse } from '@/types'

export const notificationService = {
  async list(params?: { page?: number; pageSize?: number; isRead?: boolean }): Promise<PaginatedResponse<Notification>> {
    const { data } = await apiClient.get<PaginatedResponse<Notification>>('/notifications', { params })
    return data
  },

  async markRead(id: string): Promise<Notification> {
    const { data } = await apiClient.patch<Notification>(`/notifications/${id}/read`)
    return data
  },

  async markAllRead(): Promise<{ message: string }> {
    const { data } = await apiClient.patch<{ message: string }>('/notifications/read-all')
    return data
  },

  async getUnreadCount(): Promise<{ count: number }> {
    const { data } = await apiClient.get<{ count: number }>('/notifications/unread-count')
    return data
  },
}
