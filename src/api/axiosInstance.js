import axios from 'axios';
import { setCredentials, logout } from '../store/authSlice';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

export const axiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

let reduxStoreRef = null;
export const setReduxStoreRef = (store) => {
  reduxStoreRef = store;
};

// Queue mechanism for handling concurrent 401 requests during silent token refresh
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request Interceptor: Auto attach Bearer Access Token
axiosInstance.interceptors.request.use(
  (config) => {
    if (reduxStoreRef) {
      const state = reduxStoreRef.getState();
      const token = state?.auth?.accessToken;
      if (token && !config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Parse ApiResponse envelope & Auto Silent Refresh Token on 401
axiosInstance.interceptors.response.use(
  (response) => {
    // If backend returns standard envelope { success, status, code, message, data }
    return response.data;
  },
  async (error) => {
    const originalRequest = error.config;

    // Check if error is HTTP 401 Unauthorized or UNAUTHORIZED code
    const status = error.response?.status;
    const isUnauthorized = status === 401 || error.response?.data?.code === 'UNAUTHORIZED';

    if (
      isUnauthorized &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/api/v1/auth/login') &&
      !originalRequest.url?.includes('/api/v1/auth/refresh')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((newToken) => {
            originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
            return axiosInstance(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const state = reduxStoreRef?.getState();
      const refreshToken = state?.auth?.refreshToken;

      if (refreshToken) {
        try {
          // Call raw axios to prevent infinite interceptor loops
          const refreshRes = await axios.post(`${BASE_URL}/api/v1/auth/refresh`, { refreshToken });
          const resData = refreshRes.data?.data || refreshRes.data;

          if (resData && resData.accessToken) {
            const newAccessToken = resData.accessToken;
            const newRefreshToken = resData.refreshToken || refreshToken;

            // Dispatch setCredentials to update Redux store & persistent state
            reduxStoreRef.dispatch(
              setCredentials({
                accessToken: newAccessToken,
                refreshToken: newRefreshToken,
                userId: resData.userId || state?.auth?.userId,
                roles: resData.roles || state?.auth?.roles,
                user: resData.user || state?.auth?.user,
              })
            );

            processQueue(null, newAccessToken);
            originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
            return axiosInstance(originalRequest);
          }
        } catch (refreshErr) {
          processQueue(refreshErr, null);
          if (reduxStoreRef) {
            reduxStoreRef.dispatch(logout());
          }
        } finally {
          isRefreshing = false;
        }
      } else {
        if (reduxStoreRef) {
          reduxStoreRef.dispatch(logout());
        }
        isRefreshing = false;
      }
    }

    console.warn(`[API Notice] Request to ${originalRequest?.url} failed:`, error.message);

    return Promise.reject(
      error?.response?.data || {
        success: false,
        message: error.message || 'Lỗi kết nối máy chủ',
      }
    );
  }
);
