import * as React from 'react';
import { Navigate, useLocation } from 'react-router';
import { Box, CircularProgress } from '@mui/material';
import { useAuth } from '../../contexts';

interface AuthRouteProps {
  children: React.ReactNode;
}

/**
 * AuthRoute component that redirects authenticated users away from auth pages.
 * 
 * - Shows loading spinner while checking authentication
 * - Redirects to /tenants (or previous location) if authenticated
 * - Renders children (login/register forms) if not authenticated
 */
export default function AuthRoute({ children }: AuthRouteProps) {
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

  // Redirect authenticated users to tenants list (or where they came from)
  // TenantsListPage will automatically redirect to tenant owner page if user has single tenant
  if (isAuthenticated) {
    // If there's a 'from' location (e.g., from ProtectedRoute redirect), go there
    // Otherwise, go to tenants list (which handles single/multiple tenant logic)
    const from = (location.state as { from?: { pathname?: string; search?: string } })?.from;
    const searchParams = new URLSearchParams(location.search);
    const inviteToken = searchParams.get('token');

    const redirectTo = from?.pathname
      ? `${from.pathname}${from.search || ''}`
      : inviteToken
      ? `/accept-invitation?token=${encodeURIComponent(inviteToken)}`
      : '/tenants';

    if (redirectTo === '/tenants') {
      return <Navigate to={redirectTo} replace state={{ postAuthRedirect: true }} />;
    }
    return <Navigate to={redirectTo} replace />;
  }

  // User is not authenticated, render the auth page (login/register)
  return <>{children}</>;
}

