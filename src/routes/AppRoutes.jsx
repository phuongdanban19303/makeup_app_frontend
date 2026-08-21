import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';

import { HomePage } from '../pages/customer/HomePage';
import { MuaProfilePage } from '../pages/customer/MuaProfilePage';
import { CheckoutPage } from '../pages/customer/CheckoutPage';
import { OrderTrackingPage } from '../pages/customer/OrderTrackingPage';
import { VnpayCallbackPage } from '../pages/customer/VnpayCallbackPage';
import { AuthPage } from '../pages/auth/AuthPage';

import { MuaDashboardPage } from '../pages/worker/MuaDashboardPage';
import { MuaJobLifecyclePage } from '../pages/worker/MuaJobLifecyclePage';
import { MuaServicesPage } from '../pages/worker/MuaServicesPage';

import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage';

export const AppRoutes = () => {
  return (
    <Routes>
      {/* Public / Customer Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute allowedRoles={['ROLE_CUSTOMER']} allowGuest={true}>
            <HomePage />
          </ProtectedRoute>
        }
      />
      <Route path="/auth" element={<AuthPage />} />
      <Route
        path="/mua/:id"
        element={
          <ProtectedRoute allowedRoles={['ROLE_CUSTOMER']} allowGuest={true}>
            <MuaProfilePage />
          </ProtectedRoute>
        }
      />

      {/* Customer Booking & Payment Routes */}
      <Route path="/payment/vnpay/callback" element={<VnpayCallbackPage />} />
      <Route path="/payment/momo/callback" element={<VnpayCallbackPage />} />
      <Route
        path="/booking/checkout"
        element={
          <ProtectedRoute allowedRoles={['ROLE_CUSTOMER']}>
            <CheckoutPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/booking/track/:bookingId"
        element={
          <ProtectedRoute allowedRoles={['ROLE_CUSTOMER', 'ROLE_MUA', 'ROLE_ADMIN']}>
            <OrderTrackingPage />
          </ProtectedRoute>
        }
      />

      {/* MUA Worker Routes (ROLE_MUA) */}
      <Route
        path="/worker/dashboard"
        element={
          <ProtectedRoute allowedRoles={['ROLE_MUA']}>
            <MuaDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/worker/job/:bookingId"
        element={
          <ProtectedRoute allowedRoles={['ROLE_MUA']}>
            <MuaJobLifecyclePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/worker/services"
        element={
          <ProtectedRoute allowedRoles={['ROLE_MUA']}>
            <MuaServicesPage />
          </ProtectedRoute>
        }
      />

      {/* Admin Dashboard Route (ROLE_ADMIN) */}
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute allowedRoles={['ROLE_ADMIN']}>
            <AdminDashboardPage />
          </ProtectedRoute>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
