import apiClient from './apiClient'
import { IS_MOCK_AUTH, mockLogin, mockGetMe } from './mockAuth'
import type { AuthResponse, LoginCredentials } from '@/types'

export const authService = {
  // ── Login ───────────────────────────────────────────────────────────────────
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    if (IS_MOCK_AUTH) {
      const response = mockLogin(credentials.email, credentials.password)
      sessionStorage.setItem('_hat', response.accessToken)
      return response
    }

    try {
      const { data } = await apiClient.post<AuthResponse>('/auth/login', credentials)
      if (data.accessToken) {
        sessionStorage.setItem('_hat', data.accessToken)
      }
      return data
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      const serverMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message

      if (!status) {
        throw Object.assign(new Error('Network error'), {
          response: {
            data: { message: 'Cannot connect to the server. Please check your network or contact your administrator.' },
          },
        })
      }
      if (status === 401 || status === 400) {
        throw Object.assign(new Error('Invalid credentials'), {
          response: { data: { message: serverMsg ?? 'Invalid email or password.' } },
        })
      }
      if (status === 403) {
        throw Object.assign(new Error('Forbidden'), {
          response: { data: { message: serverMsg ?? 'Account is inactive or suspended.' } },
        })
      }
      if (status === 402) {
        throw Object.assign(new Error('Payment required'), {
          response: { data: { message: serverMsg ?? 'Subscription has expired. Contact your administrator.' } },
        })
      }
      throw Object.assign(new Error('Server error'), {
        response: { data: { message: serverMsg ?? `Server error (${status}). Please try again.` } },
      })
    }
  },

  // ── Logout ──────────────────────────────────────────────────────────────────
  async logout(): Promise<void> {
    try {
      if (!IS_MOCK_AUTH) {
        await apiClient.post('/auth/logout')
      }
    } finally {
      sessionStorage.removeItem('_hat')
    }
  },

  // ── Session restore ─────────────────────────────────────────────────────────
  async getMe(): Promise<AuthResponse['user']> {
    if (IS_MOCK_AUTH) {
      const token = sessionStorage.getItem('_hat')
      if (!token) throw new Error('No session')
      return mockGetMe(token)
    }
    const { data } = await apiClient.get<AuthResponse['user']>('/auth/me')
    return data
  },

  // ── Password reset ──────────────────────────────────────────────────────────
  async requestPasswordReset(email: string): Promise<{ message: string }> {
    if (IS_MOCK_AUTH) {
      return { message: 'If this email exists, a reset link has been sent.' }
    }
    const { data } = await apiClient.post<{ message: string }>('/auth/request-reset', { email })
    return data
  },

  async resetPassword(payload: { token: string; password: string; confirmPassword: string }): Promise<{ message: string }> {
    if (IS_MOCK_AUTH) {
      return { message: 'Password reset successful.' }
    }
    const { data } = await apiClient.post<{ message: string }>('/auth/reset-password', payload)
    return data
  },

  // ── Change password ─────────────────────────────────────────────────────────
  async changePassword(payload: { currentPassword: string; newPassword: string; confirmPassword: string }): Promise<{ message: string }> {
    if (IS_MOCK_AUTH) {
      return { message: 'Password updated.' }
    }
    const { data } = await apiClient.post<{ message: string }>('/auth/change-password', payload)
    return data
  },
}
