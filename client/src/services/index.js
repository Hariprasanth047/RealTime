import api from './api'

export const authService = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.put('/auth/password', data),
}

export const projectService = {
  getAll: () => api.get('/projects'),
  getOne: (id) => api.get(`/projects/${id}`),
  create: (data) => api.post('/projects', data),
  update: (id, data) => api.put(`/projects/${id}`, data),
  delete: (id) => api.delete(`/projects/${id}`),
  getStats: (id) => api.get(`/projects/${id}/stats`),
  addMember: (projectId, data) => api.post(`/projects/${projectId}/members`, data),
  removeMember: (projectId, userId) => api.delete(`/projects/${projectId}/members/${userId}`),
}

export const taskService = {
  getByProject: (projectId, params) => api.get(`/projects/${projectId}/tasks`, { params }),
  getOne: (id) => api.get(`/tasks/${id}`),
  create: (projectId, data) => api.post(`/projects/${projectId}/tasks`, data),
  update: (id, data) => api.put(`/tasks/${id}`, data),
  move: (id, data) => api.put(`/tasks/${id}/move`, data),
  delete: (id) => api.delete(`/tasks/${id}`),
  getDashboard: () => api.get('/tasks/dashboard'),
}

export const commentService = {
  getByTask: (taskId) => api.get(`/tasks/${taskId}/comments`),
  add: (taskId, data) => api.post(`/tasks/${taskId}/comments`, data),
  delete: (id) => api.delete(`/comments/${id}`),
}

export const columnService = {
  getByProject: (projectId) => api.get(`/projects/${projectId}/columns`),
  create: (projectId, data) => api.post(`/projects/${projectId}/columns`, data),
  update: (id, data) => api.put(`/columns/${id}`, data),
  delete: (id) => api.delete(`/columns/${id}`),
  reorder: (projectId, data) => api.put(`/projects/${projectId}/columns/reorder`, data),
}

export const notificationService = {
  getAll: () => api.get('/notifications'),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
}

export const userService = {
  search: (email) => api.get('/users/search', { params: { email } }),
}
