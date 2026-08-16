import { axiosInstance } from './axiosInstance';

export const authApi = {
  sendOtp: (phone) => axiosInstance.post('/api/v1/auth/send-otp', { phone }),
  register: (payload) => axiosInstance.post('/api/v1/auth/register', payload),
  login: (payload) => axiosInstance.post('/api/v1/auth/login', payload),
  refreshToken: (refreshToken) => axiosInstance.post('/api/v1/auth/refresh', { refreshToken }),
  logout: (refreshToken) => axiosInstance.post('/api/v1/auth/logout', { refreshToken }),
  getMe: () => axiosInstance.get('/api/v1/users/me'),
  updateAvatar: (avatarUrl) => axiosInstance.put('/api/v1/users/me/avatar', { avatarUrl }),
};
