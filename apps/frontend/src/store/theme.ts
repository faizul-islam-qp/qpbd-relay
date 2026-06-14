import { create } from 'zustand'

interface ThemeStore {
  dark: boolean
  toggle: () => void
  init: () => void
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
  dark: false,
  toggle: () => {
    const next = !get().dark
    set({ dark: next })
    localStorage.setItem('theme', next ? 'dark' : 'light')
    document.documentElement.classList.toggle('dark', next)
  },
  init: () => {
    const saved = localStorage.getItem('theme')
    const dark = saved === 'dark'
    set({ dark })
    document.documentElement.classList.toggle('dark', dark)
  },
}))
