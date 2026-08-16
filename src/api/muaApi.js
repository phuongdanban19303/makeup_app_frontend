import { axiosInstance } from './axiosInstance';

export const muaApi = {
  getProfile: (muaId) => axiosInstance.get(`/api/v1/mua/${muaId}/profile`),
  updateProfile: (muaId, payload) => axiosInstance.put(`/api/v1/mua/${muaId}/profile`, payload),
  getServices: (muaId, includeInactive = false) => axiosInstance.get(`/api/v1/mua/${muaId}/services?includeInactive=${includeInactive}`),
  addService: (muaId, payload) => axiosInstance.post(`/api/v1/mua/${muaId}/services`, payload),
  createBundleService: (muaId, payload) => axiosInstance.post(`/api/v1/mua/${muaId}/bundle-services`, payload),
  updateService: (muaId, serviceId, payload) => axiosInstance.put(`/api/v1/mua/${muaId}/services/${serviceId}`, payload),
  toggleServiceStatus: (muaId, serviceId, isActive) => axiosInstance.patch(`/api/v1/mua/${muaId}/services/${serviceId}/toggle-status?isActive=${isActive}`),
  deleteService: (muaId, serviceId, permanent = true) => axiosInstance.delete(`/api/v1/mua/${muaId}/services/${serviceId}?permanent=${permanent}`),
  getMasterServices: () => axiosInstance.get('/api/v1/master-services'),
  addPortfolio: (muaId, formData) => axiosInstance.post(`/api/v1/mua/${muaId}/portfolio`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getPortfolios: (muaId) => axiosInstance.get(`/api/v1/mua/${muaId}/portfolio`),
  deletePortfolio: (muaId, portfolioId) => axiosInstance.delete(`/api/v1/mua/${muaId}/portfolio/${portfolioId}`),
};

