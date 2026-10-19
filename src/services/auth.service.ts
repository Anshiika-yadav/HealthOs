import apiClient from './apiClient'
import type { AuthResponse, LoginCredentials } from '@/types'

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const { data } = await apiClient.post<AuthResponse>('/auth/login', credentials)
    if (data.accessToken) {
      sessionStorage.setItem('_hat', data.accessToken)
    }
    return data
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout')
    } finally {
      sessionStorage.removeItem('_hat')
    }
  },

  async requestPasswordReset(email: string): Promise<{ message: string }> {
    const { data } = await apiClient.post<{ message: string }>('/auth/request-reset', { email })
    return data
  },

  async resetPassword(payload: {
    token: string
    password: string
    confirmPassword: string
  }): Promise<{ message: string }> {
    const { data } = await apiClient.post<{ message: string }>('/auth/reset-password', payload)
    return data
  },

  async getMe(): Promise<AuthResponse['user']> {
    const { data } = await apiClient.get<AuthResponse['user']>('/auth/me')
    return data
  },

  async changePassword(payload: {
    currentPassword: string
    newPassword: string
    confirmPassword: string
  }): Promise<{ message: string }> {
    const { data } = await apiClient.post<{ message: string }>('/auth/change-password', payload)
    return data
  },
}
