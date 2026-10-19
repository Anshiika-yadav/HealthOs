import apiClient from './apiClient'
import type { Encounter, PaginatedResponse, PaginationParams } from '@/types'

export const encounterService = {
  async list(params?: PaginationParams & { patientId?: string; status?: string; providerId?: string }): Promise<PaginatedResponse<Encounter>> {
    const { data } = await apiClient.get<PaginatedResponse<Encounter>>('/encounters', { params })
    return data
  },

  async get(id: string): Promise<Encounter> {
    const { data } = await apiClient.get<Encounter>(`/encounters/${id}`)
    return data
  },

  async create(payload: Partial<Encounter>): Promise<Encounter> {
    const { data } = await apiClient.post<Encounter>('/encounters', payload)
    return data
  },

  async update(id: string, payload: Partial<Encounter>): Promise<Encounter> {
    const { data } = await apiClient.patch<Encounter>(`/encounters/${id}`, payload)
    return data
  },

  async finalize(id: string): Promise<Encounter> {
    const { data } = await apiClient.post<Encounter>(`/encounters/${id}/finalize`)
    return data
  },

  async getDischargeSummary(id: string): Promise<Blob> {
    const { data } = await apiClient.get(`/encounters/${id}/discharge-summary`, { responseType: 'blob' })
    return data
  },
}
