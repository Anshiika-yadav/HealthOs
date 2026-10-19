import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1'

const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
})

// ─── Request interceptor: attach bearer token ─────────────────────────────────
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = sessionStorage.getItem('_hat')
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ─── Response interceptor ─────────────────────────────────────────────────────
apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const status: number = error?.response?.status
    const url: string = error?.config?.url ?? ''

    // Do NOT attempt refresh for auth endpoints themselves — avoids infinite loops
    const isAuthEndpoint =
      url.includes('/auth/login') ||
      url.includes('/auth/refresh') ||
      url.includes('/auth/logout')

    if (status === 401 && !isAuthEndpoint) {
      // Try silent token refresh
      try {
        await axios.post(
          `${BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        )
        // Retry the original request once
        return apiClient(error.config as AxiosRequestConfig)
      } catch {
        sessionStorage.removeItem('_hat')
        window.dispatchEvent(new CustomEvent('auth:expired'))
        return Promise.reject(error)
      }
    }

    return Promise.reject(error)
  }
)

export default apiClient
