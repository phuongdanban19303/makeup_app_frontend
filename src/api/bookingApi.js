import { axiosInstance } from './axiosInstance';

export const bookingApi = {
  createRequest: (payload) => axiosInstance.post('/api/v1/bookings/request', payload),
  acceptBooking: (bookingId) => axiosInstance.post(`/api/v1/bookings/${bookingId}/accept`),
  rejectBooking: (bookingId) => axiosInstance.post(`/api/v1/bookings/${bookingId}/reject`),
  startMoving: (bookingId) => axiosInstance.post(`/api/v1/bookings/${bookingId}/start-moving`),
  arrived: (bookingId) => axiosInstance.post(`/api/v1/bookings/${bookingId}/arrived`),
  startMakeup: (bookingId) => axiosInstance.post(`/api/v1/bookings/${bookingId}/start-makeup`),
  complete: (bookingId) => axiosInstance.post(`/api/v1/bookings/${bookingId}/complete`),
  cancelBooking: (bookingId, reason) => axiosInstance.post(`/api/v1/bookings/${bookingId}/cancel?reason=${encodeURIComponent(reason || '')}`),
  overrideStatus: (bookingId, status) => axiosInstance.put(`/api/v1/bookings/${bookingId}/status`, { status }),
  getBookingById: (bookingId) => axiosInstance.get(`/api/v1/bookings/${bookingId}`),
  getActiveBookingForWorker: (muaId) => axiosInstance.get(`/api/v1/bookings/worker/active`, { params: { muaId } }),
  getActiveBookingForCustomer: (customerId) => axiosInstance.get(`/api/v1/bookings/customer/active`, { params: { customerId } }),
  getPendingBookingsForWorker: (muaId) => axiosInstance.get(`/api/v1/bookings/worker/pending-requests`, { params: { muaId } }),
  updateStatus: (bookingId, targetStatus) => axiosInstance.put(`/api/v1/bookings/${bookingId}/status?targetStatus=${targetStatus}`),
};

