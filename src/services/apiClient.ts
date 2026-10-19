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
  withCredentials: true, // support HTTP-only cookie sessions
})

// ─── Request interceptor: attach bearer token if stored ───────────────────────
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = sessionStorage.getItem('_hat') // hashed access token — kept in sessionStorage only
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ─── Response interceptor: handle 401 / 403 globally ─────────────────────────
apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const status: number = error?.response?.status

    if (status === 401) {
      // Try token refresh if endpoint available
      try {
        await axios.post(`${BASE_URL}/auth/refresh`, {}, { withCredentials: true })
        // Retry original request
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
