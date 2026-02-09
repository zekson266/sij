import { Routes, Route, useLocation } from 'react-router'
import { Box, CircularProgress } from '@mui/material'
import { useAuth } from './contexts'
import { AppBar } from './components/layout'
import { ProtectedRoute, AuthRoute } from './components/auth'
import { isTenantSubdomain } from './utils/subdomain'
import { LandingPage, LoginPage, RegisterPage, VerifyEmailPage, ForgotPasswordPage, ResetPasswordPage, AcceptInvitationPage, TenantPublicPage, TenantsListPage, TenantCreatePage, TenantSettingsPage, TenantWorkspacePage, ProfilePage } from './pages'
import { ROPAPage } from './modules/ropa/pages'

function App() {
  const { isLoading } = useAuth()
  const location = useLocation()
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register'
  
  // Detect if we're on a tenant subdomain
  const isOnTenantSubdomain = isTenantSubdomain()

  // Only show loading spinner on initial load, not during form submissions
  // This prevents unmounting auth pages when isLoading changes during registration/login
  if (isLoading && !isAuthPage) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    )
  }

  // If on tenant subdomain, show tenant public page for root path
  // All other routes (login, register, etc.) still work on subdomain
  // Hide AppBar on tenant subdomains for cleaner public page
  
  return (
    <>
      {!isAuthPage && !isOnTenantSubdomain && <AppBar />}
      <Routes>
        <Route 
          path="/" 
          element={isOnTenantSubdomain ? <TenantPublicPage /> : <LandingPage />} 
        />
        <Route
          path="/login"
          element={
            <AuthRoute>
              <LoginPage />
            </AuthRoute>
          }
        />
        <Route
          path="/register"
          element={
            <AuthRoute>
              <RegisterPage />
            </AuthRoute>
          }
        />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/accept-invitation" element={<AcceptInvitationPage />} />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route path="/tenant/:slug" element={<TenantPublicPage />} />
        <Route
          path="/tenants"
          element={
            <ProtectedRoute>
              <TenantsListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tenants/new"
          element={
            <ProtectedRoute>
              <TenantCreatePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tenant/:id/settings"
          element={
            <ProtectedRoute>
              <TenantSettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tenant/:id/workspace"
          element={
            <ProtectedRoute>
              <TenantWorkspacePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tenant/:id/ropa"
          element={
            <ProtectedRoute>
              <ROPAPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </>
  )
}

export default App
