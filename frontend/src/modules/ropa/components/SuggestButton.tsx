/**
 * SuggestButton - Button component for triggering AI suggestions.
 * 
 * Displays a button with loading state and handles suggestion job creation.
 */

import { Button, CircularProgress, Tooltip } from '@mui/material';
import { AutoAwesome as AutoAwesomeIcon } from '@mui/icons-material';

interface SuggestButtonProps {
  onClick: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export default function SuggestButton({
  onClick,
  isLoading = false,
  disabled = false,
  size = 'small',
}: SuggestButtonProps) {
  return (
    <Tooltip title="Get AI suggestion for this field">
      <Button
        variant="outlined"
        size={size}
        onClick={onClick}
        disabled={disabled || isLoading}
        startIcon={
          isLoading ? (
            <CircularProgress size={16} />
          ) : (
            <AutoAwesomeIcon fontSize="small" />
          )
        }
        sx={{
          minWidth: 'auto',
          textTransform: 'none',
        }}
      >
        {isLoading ? 'Suggesting...' : 'Suggest'}
      </Button>
    </Tooltip>
  );
}

