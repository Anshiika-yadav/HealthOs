import apiClient from './apiClient'
import type { Invoice, Payment, Receipt, Refund, PaginatedResponse, PaginationParams } from '@/types'

export const billingService = {
  // Invoices
  async listInvoices(params?: PaginationParams & { status?: string; patientId?: string }): Promise<PaginatedResponse<Invoice>> {
    const { data } = await apiClient.get<PaginatedResponse<Invoice>>('/invoices', { params })
    return data
  },

  async getInvoice(id: string): Promise<Invoice> {
    const { data } = await apiClient.get<Invoice>(`/invoices/${id}`)
    return data
  },

  async createInvoice(payload: Partial<Invoice>): Promise<Invoice> {
    const { data } = await apiClient.post<Invoice>('/invoices', payload)
    return data
  },

  async updateInvoice(id: string, payload: Partial<Invoice>): Promise<Invoice> {
    const { data } = await apiClient.patch<Invoice>(`/invoices/${id}`, payload)
    return data
  },

  async postInvoice(id: string): Promise<Invoice> {
    const { data } = await apiClient.post<Invoice>(`/invoices/${id}/post`)
    return data
  },

  async cancelInvoice(id: string, reason?: string): Promise<Invoice> {
    const { data } = await apiClient.post<Invoice>(`/invoices/${id}/cancel`, { reason })
    return data
  },

  async downloadInvoicePdf(id: string): Promise<Blob> {
    const { data } = await apiClient.get(`/invoices/${id}/pdf`, { responseType: 'blob' })
    return data
  },

  // Payments
  async listPayments(params?: PaginationParams & { invoiceId?: string; patientId?: string }): Promise<PaginatedResponse<Payment>> {
    const { data } = await apiClient.get<PaginatedResponse<Payment>>('/payments', { params })
    return data
  },

  async createPayment(payload: Partial<Payment>): Promise<Payment> {
    const { data } = await apiClient.post<Payment>('/payments', payload)
    return data
  },

  async reversePayment(id: string, reason: string): Promise<Payment> {
    const { data } = await apiClient.post<Payment>(`/payments/${id}/reverse`, { reason })
    return data
  },

  // Receipts
  async getReceipt(id: string): Promise<Receipt> {
    const { data } = await apiClient.get<Receipt>(`/receipts/${id}`)
    return data
  },

  async listReceipts(params?: PaginationParams): Promise<PaginatedResponse<Receipt>> {
    const { data } = await apiClient.get<PaginatedResponse<Receipt>>('/receipts', { params })
    return data
  },

  // Refunds
  async listRefunds(params?: PaginationParams & { status?: string }): Promise<PaginatedResponse<Refund>> {
    const { data } = await apiClient.get<PaginatedResponse<Refund>>('/refunds', { params })
    return data
  },

  async createRefund(payload: { paymentId: string; amount: number; reason: string }): Promise<Refund> {
    const { data } = await apiClient.post<Refund>('/refunds', payload)
    return data
  },

  async approveRefund(id: string): Promise<Refund> {
    const { data } = await apiClient.post<Refund>(`/refunds/${id}/approve`)
    return data
  },

  async rejectRefund(id: string, reason: string): Promise<Refund> {
    const { data } = await apiClient.post<Refund>(`/refunds/${id}/reject`, { reason })
    return data
  },
}
