import apiClient from './apiClient'
import type { Appointment, PaginatedResponse, PaginationParams } from '@/types'

export const appointmentService = {
  async list(params?: PaginationParams & { date?: string; providerId?: string; departmentId?: string; status?: string }): Promise<PaginatedResponse<Appointment>> {
    const { data } = await apiClient.get<PaginatedResponse<Appointment>>('/appointments', { params })
    return data
  },

  async get(id: string): Promise<Appointment> {
    const { data } = await apiClient.get<Appointment>(`/appointments/${id}`)
    return data
  },

  async create(payload: Partial<Appointment>): Promise<Appointment> {
    const { data } = await apiClient.post<Appointment>('/appointments', payload)
    return data
  },

  async update(id: string, payload: Partial<Appointment>): Promise<Appointment> {
    const { data } = await apiClient.patch<Appointment>(`/appointments/${id}`, payload)
    return data
  },

  async checkIn(id: string): Promise<Appointment> {
    const { data } = await apiClient.post<Appointment>(`/appointments/${id}/check-in`)
    return data
  },

  async cancel(id: string, reason?: string): Promise<Appointment> {
    const { data } = await apiClient.post<Appointment>(`/appointments/${id}/cancel`, { reason })
    return data
  },

  async reschedule(id: string, payload: { date: string; time: string; reason?: string }): Promise<Appointment> {
    const { data } = await apiClient.post<Appointment>(`/appointments/${id}/reschedule`, payload)
    return data
  },

  async noShow(id: string): Promise<Appointment> {
    const { data } = await apiClient.post<Appointment>(`/appointments/${id}/no-show`)
    return data
  },
}
