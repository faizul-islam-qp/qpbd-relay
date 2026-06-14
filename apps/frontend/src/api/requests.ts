import { api } from './client'

export const requestsApi = {
  list: (params?: Record<string, string>) =>
    api.get('/requests', { params }).then((r) => r.data),

  get: (id: string) =>
    api.get(`/requests/${id}`).then((r) => r.data),

  create: (data: { categoryId: string; title: string; description?: string; priority?: string }) =>
    api.post('/requests', data).then((r) => r.data),

  update: (id: string, data: { title?: string; description?: string; priority?: string }) =>
    api.patch(`/requests/${id}`, data).then((r) => r.data),

  cancel: (id: string) =>
    api.patch(`/requests/${id}/cancel`, {}).then((r) => r.data),

  updateStatus: (id: string, status: string, note?: string) =>
    api.patch(`/requests/${id}/status`, { status, note }).then((r) => r.data),

  assign: (id: string, staffId: string) =>
    api.patch(`/requests/${id}/assign`, { staffId }).then((r) => r.data),

  getComments: (id: string) =>
    api.get(`/requests/${id}/comments`).then((r) => r.data),

  addComment: (id: string, content: string) =>
    api.post(`/requests/${id}/comments`, { content }).then((r) => r.data),
}
