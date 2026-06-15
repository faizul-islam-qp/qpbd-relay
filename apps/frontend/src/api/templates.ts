import { api } from './client'

export interface RequestTemplate {
  id: string
  name: string
  title: string
  description?: string
  categoryId?: string
  priority: string
}

export const templatesApi = {
  list: () => api.get('/templates').then(r => r.data as RequestTemplate[]),
  create: (dto: Omit<RequestTemplate, 'id'>) => api.post('/templates', dto).then(r => r.data),
  remove: (id: string) => api.delete(`/templates/${id}`).then(r => r.data),
}
