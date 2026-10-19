import apiClient from './apiClient'
import type { InventoryItem, StockMovement, PurchaseOrder, Supplier, PaginatedResponse, PaginationParams } from '@/types'

export const inventoryService = {
  async listItems(params?: PaginationParams & { category?: string; lowStock?: boolean }): Promise<PaginatedResponse<InventoryItem>> {
    const { data } = await apiClient.get<PaginatedResponse<InventoryItem>>('/stock/items', { params })
    return data
  },

  async getItem(id: string): Promise<InventoryItem> {
    const { data } = await apiClient.get<InventoryItem>(`/stock/items/${id}`)
    return data
  },

  async createItem(payload: Partial<InventoryItem>): Promise<InventoryItem> {
    const { data } = await apiClient.post<InventoryItem>('/stock/items', payload)
    return data
  },

  async updateItem(id: string, payload: Partial<InventoryItem>): Promise<InventoryItem> {
    const { data } = await apiClient.patch<InventoryItem>(`/stock/items/${id}`, payload)
    return data
  },

  async listMovements(params?: PaginationParams & { itemId?: string; type?: string }): Promise<PaginatedResponse<StockMovement>> {
    const { data } = await apiClient.get<PaginatedResponse<StockMovement>>('/stock/movements', { params })
    return data
  },

  async createMovement(payload: Partial<StockMovement>): Promise<StockMovement> {
    const { data } = await apiClient.post<StockMovement>('/stock/movements', payload)
    return data
  },

  async listPurchaseOrders(params?: PaginationParams & { status?: string }): Promise<PaginatedResponse<PurchaseOrder>> {
    const { data } = await apiClient.get<PaginatedResponse<PurchaseOrder>>('/purchase-orders', { params })
    return data
  },

  async getPurchaseOrder(id: string): Promise<PurchaseOrder> {
    const { data } = await apiClient.get<PurchaseOrder>(`/purchase-orders/${id}`)
    return data
  },

  async createPurchaseOrder(payload: Partial<PurchaseOrder>): Promise<PurchaseOrder> {
    const { data } = await apiClient.post<PurchaseOrder>('/purchase-orders', payload)
    return data
  },

  async receivePurchaseOrder(id: string, items: { itemId: string; quantity: number }[]): Promise<PurchaseOrder> {
    const { data } = await apiClient.post<PurchaseOrder>(`/purchase-orders/${id}/receive`, { items })
    return data
  },

  async listSuppliers(params?: PaginationParams): Promise<PaginatedResponse<Supplier>> {
    const { data } = await apiClient.get<PaginatedResponse<Supplier>>('/suppliers', { params })
    return data
  },

  async createSupplier(payload: Partial<Supplier>): Promise<Supplier> {
    const { data } = await apiClient.post<Supplier>('/suppliers', payload)
    return data
  },

  async updateSupplier(id: string, payload: Partial<Supplier>): Promise<Supplier> {
    const { data } = await apiClient.patch<Supplier>(`/suppliers/${id}`, payload)
    return data
  },

  async getDashboardStats(): Promise<Record<string, number>> {
    const { data } = await apiClient.get<Record<string, number>>('/stock/stats')
    return data
  },
}
