import api from './client';

export const authApi = {
  register: async (userData) => {
    const res = await api.post('/auth/register', userData);
    return res.data;
  },
  login: async (credentials) => {
    const res = await api.post('/auth/login', credentials);
    return res.data;
  },
  logout: async () => {
    const res = await api.post('/auth/logout');
    return res.data;
  },
  getMe: async () => {
    const res = await api.get('/auth/me');
    return res.data;
  },
  changePassword: async (passwords) => {
    const res = await api.post('/auth/change-password', passwords);
    return res.data;
  },
  forgotPassword: async (data) => {
    const res = await api.post('/auth/forgot-password', data);
    return res.data;
  },
  resetPassword: async (data) => {
    const res = await api.post('/auth/reset-password', data);
    return res.data;
  },
  updateProfile: async (data) => {
    const res = await api.patch('/auth/profile', data);
    return res.data;
  },
  exportUserData: async () => {
    const res = await api.get('/auth/export-data');
    return res.data;
  },
  deleteAccount: async () => {
    const res = await api.delete('/auth/account');
    return res.data;
  },
};
