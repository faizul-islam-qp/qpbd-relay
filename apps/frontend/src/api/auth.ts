import { api } from './client'

export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }).then((r) => r.data),

  sendEmailOtp: (email: string) =>
    api.post('/auth/register/email-otp', { email }).then((r) => r.data),

  register: (name: string, email: string, password: string, otp: string) =>
    api.post('/auth/register', { name, email, password, otp }).then((r) => r.data),

  sendOtp: (phone: string) =>
    api.post('/auth/staff/otp/send', { phone }).then((r) => r.data),

  verifyOtp: (phone: string, otp: string) =>
    api.post('/auth/staff/otp/verify', { phone, otp }).then((r) => r.data),

  staffPasswordLogin: (phone: string, password: string) =>
    api.post('/auth/staff/login', { phone, password }).then((r) => r.data),

  setPassword: (password: string) =>
    api.patch('/auth/set-password', { password }).then((r) => r.data),

  me: () => api.get('/auth/me').then((r) => r.data),

  getBotInfo: () =>
    api.get('/auth/telegram-bot').then((r) => r.data as { configured: boolean; botUsername: string | null }),
}
