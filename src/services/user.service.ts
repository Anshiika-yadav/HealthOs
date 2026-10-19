import apiClient from './apiClient'
import type { User, PaginatedResponse, PaginationParams, UserRole } from '@/types'

export const userService = {
  async list(params?: PaginationParams & { role?: string; status?: string; tenantId?: string }): Promise<PaginatedResponse<User>> {
    const { data } = await apiClient.get<PaginatedResponse<User>>('/users', { params })
    return data
  },

  async get(id: string): Promise<User> {
    const { data } = await apiClient.get<User>(`/users/${id}`)
    return data
  },

  async invite(payload: {
    name: string
    email: string
    phone?: string
    role: UserRole
    tenantId?: string
    branchId?: string
    departmentId?: string
  }): Promise<User> {
    const { data } = await apiClient.post<User>('/users/invite', payload)
    return data
  },

  async update(id: string, payload: Partial<User>): Promise<User> {
    const { data } = await apiClient.patch<User>(`/users/${id}`, payload)
    return data
  },

  async deactivate(id: string): Promise<User> {
    const { data } = await apiClient.post<User>(`/users/${id}/deactivate`)
    return data
  },

  async activate(id: string): Promise<User> {
    const { data } = await apiClient.post<User>(`/users/${id}/activate`)
    return data
  },

  async resendInvitation(id: string): Promise<{ message: string }> {
    const { data } = await apiClient.post<{ message: string }>(`/users/${id}/resend-invitation`)
    return data
  },

  async forceLogout(id: string): Promise<{ message: string }> {
    const { data } = await apiClient.post<{ message: string }>(`/users/${id}/force-logout`)
    return data
  },

  async resetPassword(id: string): Promise<{ message: string }> {
    const { data } = await apiClient.post<{ message: string }>(`/users/${id}/reset-password`)
    return data
  },
}
