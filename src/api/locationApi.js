import { axiosInstance } from './axiosInstance';

export const locationApi = {
  getNearbyWorkers: (latitude, longitude, radiusKm = 5.0) => 
    axiosInstance.get(`/api/v1/workers/nearby?latitude=${latitude}&longitude=${longitude}&radiusKm=${radiusKm}`),
  streamLocation: (payload) => 
    axiosInstance.post('/api/v1/location/stream', payload),
  deleteLocation: (workerId) => 
    axiosInstance.delete(`/api/v1/workers/location${workerId ? `?workerId=${workerId}` : ''}`),
};

