/**
 * Notification Context for managing global notification state.
 * Uses Material-UI Snackbar + Alert pattern for consistent notifications.
 */

import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode, SyntheticEvent } from 'react';
import { Snackbar, Alert } from '@mui/material';

type NotificationSeverity = 'success' | 'error' | 'warning' | 'info';

interface NotificationState {
  open: boolean;
  message: string;
  severity: NotificationSeverity;
  autoHideDuration?: number;
}

interface NotificationContextType {
  showSuccess: (message: string, duration?: number) => void;
  showError: (message: string, duration?: number) => void;
  showWarning: (message: string, duration?: number) => void;
  showInfo: (message: string, duration?: number) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

/**
 * Default auto-hide durations (in milliseconds) per severity
 */
const DEFAULT_DURATIONS: Record<NotificationSeverity, number> = {
  success: 6000,  // 6 seconds
  info: 6000,      // 6 seconds
  warning: 7000,   // 7 seconds
  error: 8000,     // 8 seconds
};

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [notification, setNotification] = useState<NotificationState | null>(null);

  const showNotification = useCallback((
    message: string,
    severity: NotificationSeverity,
    duration?: number
  ) => {
    setNotification({
      open: true,
      message,
      severity,
      autoHideDuration: duration ?? DEFAULT_DURATIONS[severity],
    });
  }, []);

  const showSuccess = useCallback((message: string, duration?: number) => {
    showNotification(message, 'success', duration);
  }, [showNotification]);

  const showError = useCallback((message: string, duration?: number) => {
    showNotification(message, 'error', duration);
  }, [showNotification]);

  const showWarning = useCallback((message: string, duration?: number) => {
    showNotification(message, 'warning', duration);
  }, [showNotification]);

  const showInfo = useCallback((message: string, duration?: number) => {
    showNotification(message, 'info', duration);
  }, [showNotification]);

  const handleClose = useCallback((
    _event?: SyntheticEvent | Event,
    reason?: string
  ) => {
    // Prevent dismissal on clickaway for errors (users should acknowledge errors)
    if (reason === 'clickaway' && notification?.severity === 'error') {
      return;
    }
    setNotification(null);
  }, [notification?.severity]);

  const value: NotificationContextType = {
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      {notification && (
        <Snackbar
          open={notification.open}
          autoHideDuration={notification.autoHideDuration}
          onClose={handleClose}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert
            onClose={handleClose}
            severity={notification.severity}
            sx={{ width: '100%' }}
          >
            {notification.message}
          </Alert>
        </Snackbar>
      )}
    </NotificationContext.Provider>
  );
}

/**
 * Hook to use notification context.
 * 
 * @throws Error if used outside NotificationProvider
 * 
 * @example
 * ```tsx
 * const { showSuccess, showError } = useNotification();
 * 
 * // Show success message
 * showSuccess('Settings saved successfully!');
 * 
 * // Show error message
 * showError('Failed to save settings');
 * ```
 */
export function useNotification(): NotificationContextType {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}


