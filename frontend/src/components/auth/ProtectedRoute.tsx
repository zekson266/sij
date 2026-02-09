import * as React from 'react';
import { Navigate, useLocation } from 'react-router';
import { Box, CircularProgress } from '@mui/material';
import { useAuth } from '../../contexts';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * ProtectedRoute component that guards authenticated routes.
 * 
 * - Shows loading spinner while checking authentication
 * - Redirects to /login if not authenticated
 * - Renders children if authenticated
 */
export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  // Redirect to login if not authenticated, preserving the attempted location
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // User is authenticated, render the protected content
  return <>{children}</>;
}





