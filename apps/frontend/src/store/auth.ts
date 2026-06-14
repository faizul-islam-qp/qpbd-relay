import { create } from 'zustand'

interface AuthUser {
  id: string
  name: string
  email?: string
  phone?: string
  role: 'admin' | 'employee' | 'staff'
}

interface AuthStore {
  user: AuthUser | null
  token: string | null
  setAuth: (user: AuthUser, token: string) => void
  clearAuth: () => void
  init: () => void
}

function loadFromStorage(): { user: AuthUser | null; token: string | null } {
  try {
    const token = localStorage.getItem('token')
    const raw = localStorage.getItem('user')
    if (token && raw) return { user: JSON.parse(raw), token }
  } catch {}
  return { user: null, token: null }
}

const stored = loadFromStorage()

export const useAuthStore = create<AuthStore>((set) => ({
  user: stored.user,
  token: stored.token,
  setAuth: (user, token) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
    set({ user, token })
  },
  clearAuth: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    set({ user: null, token: null })
  },
  init: () => {},
}))
