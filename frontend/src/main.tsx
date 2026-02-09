import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import { LocalizationProvider } from '@mui/x-date-pickers'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { GoogleOAuthProvider } from '@react-oauth/google'
import CssBaseline from '@mui/material/CssBaseline'
import '@fontsource/roboto/300.css'
import '@fontsource/roboto/400.css'
import '@fontsource/roboto/500.css'
import '@fontsource/roboto/700.css'
import './index.css'
import App from './App.tsx'
import { AuthProvider, NotificationProvider } from './contexts'

// Create a Material UI theme
const theme = createTheme()

// Get Google Client ID from environment
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={googleClientId}>
      <BrowserRouter>
        <ThemeProvider theme={theme}>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <CssBaseline />
            <NotificationProvider>
              <AuthProvider>
                <App />
              </AuthProvider>
            </NotificationProvider>
          </LocalizationProvider>
        </ThemeProvider>
      </BrowserRouter>
    </GoogleOAuthProvider>
  </StrictMode>,
)
