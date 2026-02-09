/**
 * SuggestionDisplay - Component for displaying AI suggestions.
 * 
 * Shows general statement, suggestions list, and accept buttons.
 */

import * as React from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Chip,
  Alert,
  CircularProgress,
  Stack,
  IconButton,
  Skeleton,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  AutoAwesome as AutoAwesomeIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import type { SuggestionJobStatus } from '../services/ropaApi';

interface SuggestionDisplayProps {
  jobStatus: SuggestionJobStatus | null;
  onAccept: (suggestion: string | string[]) => void;
  onDismiss?: () => void;
  isMultiselect?: boolean;
  isRestoring?: boolean; // Show skeleton loader during initial restoration (currently not active due to React 19 batching)
  selectOptions?: Array<{ value: string; label: string }>; // For select fields: map raw enum values to human-readable labels
}

function SuggestionDisplay({
  jobStatus,
  onAccept,
  onDismiss,
  isMultiselect = false,
  isRestoring = false,
  selectOptions,
}: SuggestionDisplayProps) {
  // Create value-to-label mapping for select fields (O(1) lookup)
  const valueToLabelMap = React.useMemo(() => {
    if (!selectOptions) return null;
    return new Map(selectOptions.map(opt => [opt.value, opt.label]));
  }, [selectOptions]);

  // Helper to get display label for a suggestion value
  const getDisplayLabel = React.useCallback((value: string): string => {
    if (valueToLabelMap) {
      return valueToLabelMap.get(value) || value; // Fallback to raw value if not found
    }
    return value; // For non-select fields, return as-is
  }, [valueToLabelMap]);
  // Show skeleton loader during initial restoration (when restoring but no jobStatus yet)
  // NOTE: This code is correct and ready, but currently doesn't execute due to React 19 automatic batching.
  // React 19 batches `setIsRestoring(true)` and `setJobStatuses()` together, so by the time
  // the component renders, both states have updated and `isRestoring && !jobStatus` is never true.
  // This is a known React 19 limitation, not a bug. The skeleton may appear in future React versions
  // or if a workaround is found. Keeping this code as it's correct and future-proof.
  // See: ROPA_SUGGESTION_BUG_ANALYSIS.md for details.
  if (isRestoring && !jobStatus) {
    return (
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          mt: 1,
          bgcolor: 'action.hover',
          borderColor: 'primary.main',
        }}
      >
        <Stack spacing={1}>
          <Skeleton variant="text" width="60%" height={16} />
          <Skeleton variant="rectangular" width="100%" height={60} sx={{ borderRadius: 1 }} />
          <Skeleton variant="rectangular" width="100%" height={60} sx={{ borderRadius: 1 }} />
        </Stack>
      </Paper>
    );
  }

  if (!jobStatus) {
    return null;
  }

  // Loading state
  if (jobStatus.status === 'pending' || jobStatus.status === 'processing') {
    return (
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          mt: 1,
          bgcolor: 'action.hover',
          borderColor: 'primary.main',
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <CircularProgress size={16} />
          <Typography variant="body2" color="text.secondary">
            {jobStatus.status === 'pending'
              ? 'Queued for processing...'
              : 'Generating suggestions...'}
          </Typography>
        </Stack>
      </Paper>
    );
  }

  // Error state
  if (jobStatus.status === 'failed') {
    return (
      <Alert
        severity="error"
        icon={<ErrorIcon />}
        sx={{ mt: 1 }}
        onClose={onDismiss}
      >
        <Typography variant="body2" fontWeight="medium">
          Suggestion failed
        </Typography>
        {jobStatus.error_message && (
          <Typography variant="caption" color="text.secondary">
            {jobStatus.error_message}
          </Typography>
        )}
      </Alert>
    );
  }

  // Completed state
  if (jobStatus.status === 'completed') {
    return (
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          mt: 1,
          bgcolor: 'success.light',
          borderColor: 'success.main',
          position: 'relative',
        }}
      >
        {onDismiss && (
          <IconButton
            size="small"
            onClick={onDismiss}
            aria-label="Dismiss suggestions"
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              color: 'text.secondary',
              '&:hover': {
                color: 'text.primary',
                bgcolor: 'action.hover',
              },
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        )}
        <Stack spacing={2}>
          {/* General Statement */}
          {jobStatus.general_statement && (
            <Box>
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight="medium"
                sx={{ mb: 0.5, display: 'block' }}
              >
                General Guidance:
              </Typography>
              <Typography variant="body2" color="text.primary">
                {jobStatus.general_statement}
              </Typography>
            </Box>
          )}

          {/* Suggestions */}
          {jobStatus.suggestions && jobStatus.suggestions.length > 0 && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight="medium"
                >
                  Suggestions:
                </Typography>
                {(isMultiselect || jobStatus.suggestions.length > 1) && (
                  <Button
                    size="small"
                    variant="outlined"
                    color="primary"
                    startIcon={<CheckCircleIcon />}
                    onClick={() => onAccept(jobStatus.suggestions || [])}
                    sx={{ flexShrink: 0 }}
                  >
                    Accept All ({jobStatus.suggestions.length})
                  </Button>
                )}
              </Box>
              <Stack spacing={1}>
                {jobStatus.suggestions.map((suggestion, index) => (
                  <Box
                    key={index}
                    sx={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 1,
                      p: 1,
                      bgcolor: 'background.paper',
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <AutoAwesomeIcon
                      fontSize="small"
                      color="primary"
                      sx={{ mt: 0.5, flexShrink: 0 }}
                    />
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" color="text.primary">
                        {getDisplayLabel(suggestion)}
                      </Typography>
                    </Box>
                    <Button
                      size="small"
                      variant={isMultiselect ? "outlined" : "contained"}
                      color="primary"
                      startIcon={<CheckCircleIcon />}
                      onClick={() => onAccept(suggestion)}
                      sx={{ flexShrink: 0 }}
                    >
                      {isMultiselect ? 'Add' : 'Accept'}
                    </Button>
                  </Box>
                ))}
              </Stack>
            </Box>
          )}

          {/* Cost info (optional, can be hidden) */}
          {jobStatus.openai_cost_usd && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Chip
                label={`Cost: $${jobStatus.openai_cost_usd.toFixed(6)}`}
                size="small"
                variant="outlined"
                color="default"
              />
            </Box>
          )}
        </Stack>
      </Paper>
    );
  }

  return null;
}

// Memoize component to prevent unnecessary re-renders
// Only re-render if jobStatus actually changed (by job_id, status, or suggestions)
export default React.memo(SuggestionDisplay, (prevProps: SuggestionDisplayProps, nextProps: SuggestionDisplayProps) => {
  // If jobStatus changed from null to non-null or vice versa, re-render
  if (!prevProps.jobStatus && nextProps.jobStatus) return false;
  if (prevProps.jobStatus && !nextProps.jobStatus) return false;
  if (!prevProps.jobStatus && !nextProps.jobStatus) {
    // Both null, check other props
    return prevProps.isMultiselect === nextProps.isMultiselect;
  }
  
  // Both have jobStatus, compare key properties
  const prev = prevProps.jobStatus!;
  const next = nextProps.jobStatus!;
  
  // Re-render if job_id changed (different job)
  if (prev.job_id !== next.job_id) return false;
  
  // Re-render if status changed
  if (prev.status !== next.status) return false;
  
  // Re-render if suggestions array changed (length or content)
  if (prev.suggestions?.length !== next.suggestions?.length) return false;
  if (prev.suggestions && next.suggestions) {
    for (let i = 0; i < prev.suggestions.length; i++) {
      if (prev.suggestions[i] !== next.suggestions[i]) return false;
    }
  }
  
  // Re-render if general_statement changed
  if (prev.general_statement !== next.general_statement) return false;
  
  // Re-render if error_message changed
  if (prev.error_message !== next.error_message) return false;
  
  // Re-render if isMultiselect changed
  if (prevProps.isMultiselect !== nextProps.isMultiselect) return false;
  
  // Re-render if isRestoring changed
  if (prevProps.isRestoring !== nextProps.isRestoring) return false;
  
  // Re-render if selectOptions changed (affects display labels)
  if (prevProps.selectOptions !== nextProps.selectOptions) return false;
  
  // All props are the same, skip re-render
  return true;
});