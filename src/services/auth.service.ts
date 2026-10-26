import apiClient from './apiClient'
import type { AuthResponse, LoginCredentials } from '@/types'

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const { data } = await apiClient.post<AuthResponse>('/auth/login', credentials)
      // Store the access token so the request interceptor can attach it
      if (data.accessToken) {
        sessionStorage.setItem('_hat', data.accessToken)
      }
      return data
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      const serverMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message

      // Surface the most useful error message to the UI
      if (!status) {
        throw Object.assign(new Error('Network error'), {
          response: {
            data: {
              message: 'Cannot connect to the server. Check your network or contact your administrator.',
            },
          },
        })
      }

      if (status === 401 || status === 400) {
        throw Object.assign(new Error('Invalid credentials'), {
          response: { data: { message: serverMsg ?? 'Invalid email or password.' } },
        })
      }

      if (status === 403) {
        throw Object.assign(new Error('Account inactive'), {
          response: {
            data: {
              message: serverMsg ?? 'Your account is inactive or suspended. Contact your administrator.',
            },
          },
        })
      }

      if (status === 402) {
        throw Object.assign(new Error('Subscription expired'), {
          response: {
            data: {
              message: serverMsg ?? 'Your hospital subscription has expired. Contact your administrator.',
            },
          },
        })
      }

      throw Object.assign(new Error('Server error'), {
        response: {
          data: { message: serverMsg ?? `Server error (${status}). Please try again later.` },
        },
      })
    }
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
