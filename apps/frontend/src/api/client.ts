import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api'

export const api = axios.create({ baseURL: BASE })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && window.location.pathname !== '/login') {
      // Import lazily to avoid circular dep at module load time
      import('@/store/auth').then(({ useAuthStore }) => {
        useAuthStore.getState().clearAuth()
      })
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)
