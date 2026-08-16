import { axiosInstance } from './axiosInstance';

export const pricingApi = {
  calculatePrice: (payload) => axiosInstance.post('/api/v1/pricing/calculate', payload),
};
