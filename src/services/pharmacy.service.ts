import apiClient from './apiClient'
import type { Prescription, PaginatedResponse, PaginationParams } from '@/types'

export interface Dispense {
  id: string
  prescriptionId: string
  prescriptionItemId: string
  drugName: string
  quantityDispensed: number
  dispensedById: string
  dispensedByName: string
  dispensedAt: string
  notes?: string
}

export const pharmacyService = {
  async listPrescriptions(params?: PaginationParams & { status?: string; patientId?: string }): Promise<PaginatedResponse<Prescription>> {
    const { data } = await apiClient.get<PaginatedResponse<Prescription>>('/prescriptions', { params })
    return data
  },

  async getPrescription(id: string): Promise<Prescription> {
    const { data } = await apiClient.get<Prescription>(`/prescriptions/${id}`)
    return data
  },

  async createPrescription(payload: Partial<Prescription>): Promise<Prescription> {
    const { data } = await apiClient.post<Prescription>('/prescriptions', payload)
    return data
  },

  async updatePrescription(id: string, payload: Partial<Prescription>): Promise<Prescription> {
    const { data } = await apiClient.patch<Prescription>(`/prescriptions/${id}`, payload)
    return data
  },

  async cancelPrescription(id: string): Promise<Prescription> {
    const { data } = await apiClient.post<Prescription>(`/prescriptions/${id}/cancel`)
    return data
  },

  async dispense(prescriptionId: string, items: { itemId: string; quantity: number }[]): Promise<Dispense[]> {
    const { data } = await apiClient.post<Dispense[]>(`/dispenses`, { prescriptionId, items })
    return data
  },

  async getDispenses(prescriptionId: string): Promise<Dispense[]> {
    const { data } = await apiClient.get<Dispense[]>(`/dispenses`, { params: { prescriptionId } })
    return data
  },
}
