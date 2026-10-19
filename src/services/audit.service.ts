import apiClient from './apiClient'
import type { AuditLog, PaginatedResponse, PaginationParams } from '@/types'

export const auditService = {
  async list(params?: PaginationParams & {
    actorId?: string
    tenantId?: string
    action?: string
    entity?: string
    startDate?: string
    endDate?: string
  }): Promise<PaginatedResponse<AuditLog>> {
    const { data } = await apiClient.get<PaginatedResponse<AuditLog>>('/audit-logs', { params })
    return data
  },

  async get(id: string): Promise<AuditLog> {
    const { data } = await apiClient.get<AuditLog>(`/audit-logs/${id}`)
    return data
  },

  async export(params?: Record<string, unknown>): Promise<Blob> {
    const { data } = await apiClient.get('/audit-logs/export', {
      params,
      responseType: 'blob',
    })
    return data
  },
}
