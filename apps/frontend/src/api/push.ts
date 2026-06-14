import { api } from './client'

export const pushApi = {
  getVapidKey: () => api.get('/push/vapid-public-key').then((r) => r.data.publicKey as string | null),
  subscribe: (sub: { endpoint: string; p256dh: string; auth: string }) =>
    api.post('/push/subscribe', sub).then((r) => r.data),
  unsubscribe: (endpoint: string) =>
    api.delete('/push/unsubscribe', { data: { endpoint } }).then((r) => r.data),
}
