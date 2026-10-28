import React, { createContext, useContext, useEffect, useReducer, useCallback } from 'react'
import type { AuthUser } from '@/types'
import { authService } from '@/services/auth.service'

interface AuthState {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

type AuthAction =
  | { type: 'AUTH_LOADING' }
  | { type: 'AUTH_SUCCESS'; payload: AuthUser }
  | { type: 'AUTH_FAILURE'; payload: string }
  | { type: 'AUTH_LOGOUT' }

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
}

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'AUTH_LOADING':
      return { ...state, isLoading: true, error: null }
    case 'AUTH_SUCCESS':
      return { user: action.payload, isAuthenticated: true, isLoading: false, error: null }
    case 'AUTH_FAILURE':
      return { user: null, isAuthenticated: false, isLoading: false, error: action.payload }
    case 'AUTH_LOGOUT':
      return { user: null, isAuthenticated: false, isLoading: false, error: null }
    default:
      return state
  }
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string, tenantCode?: string) => Promise<void>
  register: (payload: { name: string; email: string; password: string; role: string; hospitalName?: string }) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState)

  const refreshUser = useCallback(async () => {
    try {
      dispatch({ type: 'AUTH_LOADING' })
      const user = await authService.getMe()
      dispatch({ type: 'AUTH_SUCCESS', payload: user })
    } catch {
      dispatch({ type: 'AUTH_LOGOUT' })
    }
  }, [])

  useEffect(() => {
    // Attempt to restore session on mount
    const token = sessionStorage.getItem('_hat')
    if (token) {
      refreshUser()
    } else {
      dispatch({ type: 'AUTH_LOGOUT' })
    }
  }, [refreshUser])

  useEffect(() => {
    const handleExpired = () => {
      dispatch({ type: 'AUTH_LOGOUT' })
    }
    window.addEventListener('auth:expired', handleExpired)
    return () => window.removeEventListener('auth:expired', handleExpired)
  }, [])

  const login = useCallback(async (email: string, password: string, tenantCode?: string) => {
    dispatch({ type: 'AUTH_LOADING' })
    try {
      const response = await authService.login({ email, password, tenantCode })
      dispatch({ type: 'AUTH_SUCCESS', payload: response.user })
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Invalid credentials. Please try again.'
      dispatch({ type: 'AUTH_FAILURE', payload: msg })
      throw err
    }
  }, [])

  const register = useCallback(async (payload: { name: string; email: string; password: string; role: string; hospitalName?: string }) => {
    dispatch({ type: 'AUTH_LOADING' })
    try {
      const response = await authService.register(payload)
      dispatch({ type: 'AUTH_SUCCESS', payload: response.user })
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Could not create account.'
      dispatch({ type: 'AUTH_FAILURE', payload: msg })
      throw err
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await authService.logout()
    } finally {
      dispatch({ type: 'AUTH_LOGOUT' })
    }
  }, [])

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}