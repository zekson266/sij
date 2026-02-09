import { CircularProgress, Box } from '@mui/material';

interface LoadingSpinnerProps {
  size?: number;
  fullScreen?: boolean;
}

export default function LoadingSpinner({ size = 40, fullScreen = false }: LoadingSpinnerProps) {
  const spinner = <CircularProgress size={size} />;

  if (fullScreen) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        {spinner}
      </Box>
    );
  }

  return (
    <Box display="flex" justifyContent="center" alignItems="center" p={2}>
      {spinner}
    </Box>
  );
}

