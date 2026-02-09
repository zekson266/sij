import { Alert, AlertTitle } from '@mui/material';

interface ErrorAlertProps {
  message: string;
  title?: string;
  severity?: 'error' | 'warning' | 'info';
  onClose?: () => void;
}

export default function ErrorAlert({
  message,
  title,
  severity = 'error',
  onClose,
}: ErrorAlertProps) {
  return (
    <Alert severity={severity} onClose={onClose}>
      {title && <AlertTitle>{title}</AlertTitle>}
      {message}
    </Alert>
  );
}

