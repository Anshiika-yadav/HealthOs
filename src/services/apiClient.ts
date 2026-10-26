import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1'

const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // send HTTP-only session cookies if backend uses them
})

// ── Attach Bearer token from sessionStorage (JWT flow) ────────────────────────
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = sessionStorage.getItem('_hat')
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ── Track whether we are already attempting a refresh (prevents loops) ────────
let isRefreshing = false
let refreshQueue: Array<(token: string) => void> = []

function processQueue(newToken: string) {
  refreshQueue.forEach((cb) => cb(newToken))
  refreshQueue = []
}

// ── Response interceptor ─────────────────────────────────────────────────────
apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalConfig = error.config as AxiosRequestConfig & { _retry?: boolean }
    const status: number = error?.response?.status
    const url: string = originalConfig?.url ?? ''

    // Skip refresh for auth endpoints — prevents infinite loops
    const isAuthEndpoint =
      url.includes('/auth/login') ||
      url.includes('/auth/refresh') ||
      url.includes('/auth/logout') ||
      url.includes('/auth/invitation') ||
      url.includes('/auth/accept-invitation')

    if (status === 401 && !isAuthEndpoint && !originalConfig._retry) {
      // Mark this request so we don't retry it again
      originalConfig._retry = true

      if (isRefreshing) {
        // Queue this request until refresh completes
        return new Promise((resolve, reject) => {
          refreshQueue.push((newToken: string) => {
            if (originalConfig.headers) {
              (originalConfig.headers as Record<string, string>)['Authorization'] = `Bearer ${newToken}`
            }
            resolve(apiClient(originalConfig))
          })
        })
      }

      isRefreshing = true

      try {
        const { data } = await axios.post<{ accessToken?: string }>(
          `${BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        )
        const newToken = data.accessToken ?? ''
        if (newToken) {
          sessionStorage.setItem('_hat', newToken)
        }
        processQueue(newToken)
        isRefreshing = false

        // Retry original request with new token
        if (originalConfig.headers && newToken) {
          (originalConfig.headers as Record<string, string>)['Authorization'] = `Bearer ${newToken}`
        }
        return apiClient(originalConfig)
      } catch {
        isRefreshing = false
        refreshQueue = []
        sessionStorage.removeItem('_hat')
        window.dispatchEvent(new CustomEvent('auth:expired'))
        return Promise.reject(error)
      }
    }

    // For all other errors — normalise the error shape
    return Promise.reject(error)
  }
)

export default apiClient
