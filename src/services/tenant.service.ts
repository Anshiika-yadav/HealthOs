import apiClient from './apiClient'
import type { Tenant, TenantDetail, PaginatedResponse, PaginationParams } from '@/types'

export const tenantService = {
  async list(params?: PaginationParams & { status?: string; plan?: string }): Promise<PaginatedResponse<Tenant>> {
    const { data } = await apiClient.get<PaginatedResponse<Tenant>>('/admin/tenants', { params })
    return data
  },

  async get(id: string): Promise<TenantDetail> {
    const { data } = await apiClient.get<TenantDetail>(`/admin/tenants/${id}`)
    return data
  },

  async create(payload: Partial<Tenant>): Promise<TenantDetail> {
    const { data } = await apiClient.post<TenantDetail>('/admin/tenants', payload)
    return data
  },

  async update(id: string, payload: Partial<Tenant>): Promise<TenantDetail> {
    const { data } = await apiClient.patch<TenantDetail>(`/admin/tenants/${id}`, payload)
    return data
  },

  async activate(id: string): Promise<TenantDetail> {
    const { data } = await apiClient.post<TenantDetail>(`/admin/tenants/${id}/activate`)
    return data
  },

  async suspend(id: string, reason?: string): Promise<TenantDetail> {
    const { data } = await apiClient.post<TenantDetail>(`/admin/tenants/${id}/suspend`, { reason })
    return data
  },

  async stats(): Promise<Record<string, number>> {
    const { data } = await apiClient.get<Record<string, number>>('/admin/tenants/stats')
    return data
  },
}
