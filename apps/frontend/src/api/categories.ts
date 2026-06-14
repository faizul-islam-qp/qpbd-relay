import { api } from './client'

export const categoriesApi = {
  list: () => api.get('/categories').then((r) => r.data),
  create: (data: { name: string; icon: string; sortOrder?: number }) =>
    api.post('/categories', data).then((r) => r.data),
  update: (id: string, data: any) => api.patch(`/categories/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/categories/${id}`).then((r) => r.data),
}
