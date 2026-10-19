import apiClient from './apiClient'

export interface ReportParams {
  startDate?: string
  endDate?: string
  branchId?: string
  departmentId?: string
  providerId?: string
  status?: string
}

export const reportsService = {
  async getSummary(params?: ReportParams): Promise<Record<string, unknown>> {
    const { data } = await apiClient.get('/reports/summary', { params })
    return data
  },

  async getRevenue(params?: ReportParams): Promise<Record<string, unknown>> {
    const { data } = await apiClient.get('/reports/revenue', { params })
    return data
  },

  async getStock(params?: ReportParams): Promise<Record<string, unknown>> {
    const { data } = await apiClient.get('/reports/stock', { params })
    return data
  },

  async getPatientVolume(params?: ReportParams): Promise<Record<string, unknown>> {
    const { data } = await apiClient.get('/reports/patients', { params })
    return data
  },

  async getLabTurnaround(params?: ReportParams): Promise<Record<string, unknown>> {
    const { data } = await apiClient.get('/reports/lab-turnaround', { params })
    return data
  },

  async getPlatformStats(params?: ReportParams): Promise<Record<string, unknown>> {
    const { data } = await apiClient.get('/admin/reports/platform', { params })
    return data
  },

  async exportCsv(report: string, params?: ReportParams): Promise<Blob> {
    const { data } = await apiClient.get(`/reports/${report}/export`, {
      params: { ...params, format: 'csv' },
      responseType: 'blob',
    })
    return data
  },

  async exportPdf(report: string, params?: ReportParams): Promise<Blob> {
    const { data } = await apiClient.get(`/reports/${report}/export`, {
      params: { ...params, format: 'pdf' },
      responseType: 'blob',
    })
    return data
  },
}
