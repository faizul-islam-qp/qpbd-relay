import { api } from './client'

export const adminApi = {
  stats: () => api.get('/admin/stats').then((r) => r.data),
  listUsers: (role?: string) => api.get('/users', { params: role ? { role } : {} }).then((r) => r.data),
  createStaff: (data: { name: string; phone: string }) =>
    api.post('/users/staff', data).then((r) => r.data),
  createEmployee: (data: { name: string; email: string; password: string }) =>
    api.post('/users/employee', data).then((r) => r.data),
  deactivateUser: (id: string) => api.patch(`/users/${id}/deactivate`, {}).then((r) => r.data),
  deleteUser: (id: string) => api.delete(`/users/${id}`).then((r) => r.data),
  updateUser: (id: string, data: { name?: string; email?: string; phone?: string; role?: string; password?: string; isActive?: boolean }) =>
    api.patch(`/users/${id}`, data).then((r) => r.data),
  activateUser: (id: string) => api.patch(`/users/${id}/activate`, {}).then((r) => r.data),
}
