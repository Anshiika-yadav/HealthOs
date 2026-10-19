import apiClient from './apiClient'
import type { Patient, PatientTimeline, PaginatedResponse, PaginationParams } from '@/types'

export const patientService = {
  async list(params?: PaginationParams & { branchId?: string; status?: string }): Promise<PaginatedResponse<Patient>> {
    const { data } = await apiClient.get<PaginatedResponse<Patient>>('/patients', { params })
    return data
  },

  async get(id: string): Promise<Patient> {
    const { data } = await apiClient.get<Patient>(`/patients/${id}`)
    return data
  },

  async create(payload: Partial<Patient>): Promise<Patient> {
    const { data } = await apiClient.post<Patient>('/patients', payload)
    return data
  },

  async update(id: string, payload: Partial<Patient>): Promise<Patient> {
    const { data } = await apiClient.patch<Patient>(`/patients/${id}`, payload)
    return data
  },

  async getTimeline(id: string): Promise<PatientTimeline[]> {
    const { data } = await apiClient.get<PatientTimeline[]>(`/patients/${id}/timeline`)
    return data
  },

  async search(query: string): Promise<Patient[]> {
    const { data } = await apiClient.get<Patient[]>('/patients/search', { params: { q: query } })
    return data
  },

  async checkDuplicates(payload: { phone?: string; mrn?: string; identificationNumber?: string }): Promise<Patient[]> {
    const { data } = await apiClient.post<Patient[]>('/patients/check-duplicates', payload)
    return data
  },
}
