import apiClient from './apiClient'
import { mockLogin, mockGetMe, IS_MOCK_AUTH } from './mockAuth'
import type { AuthResponse, LoginCredentials } from '@/types'

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    // ── Development mock ──────────────────────────────────────────────────────
    if (IS_MOCK_AUTH) {
      try {
        const response = mockLogin(credentials.email, credentials.password)
        sessionStorage.setItem('_hat', response.accessToken)
        return response
      } catch {
        // Throw in the same shape as a real 401 so AuthContext handles it cleanly
        const err = Object.assign(new Error('Invalid credentials'), {
          response: { data: { message: 'Invalid email or password.' } },
        })
        throw err
      }
    }

    // ── Real backend ──────────────────────────────────────────────────────────
    try {
      const { data } = await apiClient.post<AuthResponse>('/auth/login', credentials)
      if (data.accessToken) {
        sessionStorage.setItem('_hat', data.accessToken)
      }
      return data
    } catch (err: unknown) {
      // Give a clearer error message depending on failure type
      const status = (err as { response?: { status?: number } })?.response?.status
      const serverMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message

      if (!status) {
        // Network error — backend unreachable
        throw Object.assign(new Error('Cannot reach server'), {
          response: {
            data: {
              message:
                'Cannot connect to the server. Please check your network or contact your administrator.',
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
            data: { message: serverMsg ?? 'Your account is inactive or suspended. Contact your administrator.' },
          },
        })
      }

      if (status === 402) {
        throw Object.assign(new Error('Subscription expired'), {
          response: {
            data: { message: serverMsg ?? 'Your hospital subscription has expired. Contact your administrator.' },
          },
        })
      }

      // Any other server error
      throw Object.assign(new Error('Server error'), {
        response: {
          data: { message: serverMsg ?? `Server error (${status}). Please try again later.` },
        },
      })
    }
  },

  async logout(): Promise<void> {
    try {
      if (!IS_MOCK_AUTH) {
        await apiClient.post('/auth/logout')
      }
    } finally {
      sessionStorage.removeItem('_hat')
    }
  },

  async requestPasswordReset(email: string): Promise<{ message: string }> {
    if (IS_MOCK_AUTH) {
      return { message: 'Reset link sent (mock mode — check console).' }
    }
    const { data } = await apiClient.post<{ message: string }>('/auth/request-reset', { email })
    return data
  },

  async resetPassword(payload: {
    token: string
    password: string
    confirmPassword: string
  }): Promise<{ message: string }> {
    if (IS_MOCK_AUTH) {
      return { message: 'Password reset successful (mock mode).' }
    }
    const { data } = await apiClient.post<{ message: string }>('/auth/reset-password', payload)
    return data
  },

  async getMe(): Promise<AuthResponse['user']> {
    if (IS_MOCK_AUTH) {
      const token = sessionStorage.getItem('_hat')
      if (!token) throw new Error('No session')
      return mockGetMe(token)
    }
    const { data } = await apiClient.get<AuthResponse['user']>('/auth/me')
    return data
  },

  async changePassword(payload: {
    currentPassword: string
    newPassword: string
    confirmPassword: string
  }): Promise<{ message: string }> {
    if (IS_MOCK_AUTH) {
      return { message: 'Password changed (mock mode).' }
    }
    const { data } = await apiClient.post<{ message: string }>('/auth/change-password', payload)
    return data
  },
}
