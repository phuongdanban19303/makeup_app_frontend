import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';

export const ProtectedRoute = ({ children, allowedRoles, allowGuest = false }) => {
  const { isAuthenticated, selectedRole } = useSelector((state) => state.auth);
  const location = useLocation();

  if (!isAuthenticated) {
    if (allowGuest) return children;
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(selectedRole)) {
    // Redirect to default home page for user's perspective
    if (selectedRole === 'ROLE_MUA') return <Navigate to="/worker/dashboard" replace />;
    if (selectedRole === 'ROLE_ADMIN') return <Navigate to="/admin/dashboard" replace />;
    return <Navigate to="/" replace />;
  }

  return children;
};
