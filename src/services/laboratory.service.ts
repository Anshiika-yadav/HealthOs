import apiClient from './apiClient'
import type { LabOrder, LabTest, PaginatedResponse, PaginationParams } from '@/types'

export const laboratoryService = {
  async listOrders(params?: PaginationParams & { status?: string; priority?: string; patientId?: string }): Promise<PaginatedResponse<LabOrder>> {
    const { data } = await apiClient.get<PaginatedResponse<LabOrder>>('/lab-orders', { params })
    return data
  },

  async getOrder(id: string): Promise<LabOrder> {
    const { data } = await apiClient.get<LabOrder>(`/lab-orders/${id}`)
    return data
  },

  async createOrder(payload: Partial<LabOrder>): Promise<LabOrder> {
    const { data } = await apiClient.post<LabOrder>('/lab-orders', payload)
    return data
  },

  async updateOrderStatus(id: string, status: string, metadata?: Record<string, unknown>): Promise<LabOrder> {
    const { data } = await apiClient.patch<LabOrder>(`/lab-orders/${id}/status`, { status, ...metadata })
    return data
  },

  async enterResults(orderId: string, results: { testId: string; value: string; notes?: string }[]): Promise<LabOrder> {
    const { data } = await apiClient.post<LabOrder>(`/lab-orders/${orderId}/results`, { results })
    return data
  },

  async verifyResults(orderId: string): Promise<LabOrder> {
    const { data } = await apiClient.post<LabOrder>(`/lab-orders/${orderId}/verify`)
    return data
  },

  async releaseResults(orderId: string): Promise<LabOrder> {
    const { data } = await apiClient.post<LabOrder>(`/lab-orders/${orderId}/release`)
    return data
  },

  async listTests(): Promise<LabTest[]> {
    const { data } = await apiClient.get<LabTest[]>('/lab-tests')
    return data
  },
}
