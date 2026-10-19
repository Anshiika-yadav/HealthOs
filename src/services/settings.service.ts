import apiClient from './apiClient'
import type { Department, Service, Branch, License, Subscription } from '@/types'

export const settingsService = {
  // Branches
  async listBranches(params?: { tenantId?: string }): Promise<Branch[]> {
    const { data } = await apiClient.get<Branch[]>('/branches', { params })
    return data
  },

  async createBranch(payload: Partial<Branch>): Promise<Branch> {
    const { data } = await apiClient.post<Branch>('/branches', payload)
    return data
  },

  async updateBranch(id: string, payload: Partial<Branch>): Promise<Branch> {
    const { data } = await apiClient.patch<Branch>(`/branches/${id}`, payload)
    return data
  },

  // Departments
  async listDepartments(params?: { branchId?: string }): Promise<Department[]> {
    const { data } = await apiClient.get<Department[]>('/departments', { params })
    return data
  },

  async createDepartment(payload: Partial<Department>): Promise<Department> {
    const { data } = await apiClient.post<Department>('/departments', payload)
    return data
  },

  async updateDepartment(id: string, payload: Partial<Department>): Promise<Department> {
    const { data } = await apiClient.patch<Department>(`/departments/${id}`, payload)
    return data
  },

  // Services
  async listServices(params?: { departmentId?: string; isActive?: boolean }): Promise<Service[]> {
    const { data } = await apiClient.get<Service[]>('/services', { params })
    return data
  },

  async createService(payload: Partial<Service>): Promise<Service> {
    const { data } = await apiClient.post<Service>('/services', payload)
    return data
  },

  async updateService(id: string, payload: Partial<Service>): Promise<Service> {
    const { data } = await apiClient.patch<Service>(`/services/${id}`, payload)
    return data
  },

  // Hospital settings
  async getHospitalSettings(): Promise<Record<string, unknown>> {
    const { data } = await apiClient.get('/settings')
    return data
  },

  async updateHospitalSettings(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    const { data } = await apiClient.patch('/settings', payload)
    return data
  },

  // Licenses
  async listLicenses(params?: Record<string, unknown>): Promise<License[]> {
    const { data } = await apiClient.get<License[]>('/admin/licenses', { params })
    return data
  },

  async issueLicense(payload: Partial<License>): Promise<License> {
    const { data } = await apiClient.post<License>('/admin/licenses', payload)
    return data
  },

  async revokeLicense(id: string): Promise<License> {
    const { data } = await apiClient.post<License>(`/admin/licenses/${id}/revoke`)
    return data
  },

  async renewLicense(id: string, expiryDate: string): Promise<License> {
    const { data } = await apiClient.post<License>(`/admin/licenses/${id}/renew`, { expiryDate })
    return data
  },

  // Subscriptions
  async listSubscriptions(params?: Record<string, unknown>): Promise<Subscription[]> {
    const { data } = await apiClient.get<Subscription[]>('/admin/subscriptions', { params })
    return data
  },

  async getSubscription(id: string): Promise<Subscription> {
    const { data } = await apiClient.get<Subscription>(`/admin/subscriptions/${id}`)
    return data
  },

  async updateSubscription(id: string, payload: Partial<Subscription>): Promise<Subscription> {
    const { data } = await apiClient.patch<Subscription>(`/admin/subscriptions/${id}`, payload)
    return data
  },

  async createSubscription(payload: Partial<Subscription>): Promise<Subscription> {
    const { data } = await apiClient.post<Subscription>('/admin/subscriptions', payload)
    return data
  },
}
