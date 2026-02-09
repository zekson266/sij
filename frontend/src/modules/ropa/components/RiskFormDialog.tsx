/**
 * Risk Form Dialog - Form for creating/editing risks.
 * 
 * Uses Accordion-based layout for organizing fields into logical sections.
 */

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Box,
  Stack,
  Grid,
  CircularProgress,
  Alert,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Warning as WarningIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  AutoAwesome as AutoAwesomeIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { FormTextField, FormSelect } from '../../../components/common';
import FormFieldWithSuggestion from './FormFieldWithSuggestion';
import { useSuggestionJob } from '../hooks/useSuggestionJob';
import { riskFormSchema, type RiskFormData } from '../schemas/riskSchema';
import { createRisk, updateRisk, type Risk, type RiskCreate, type RiskUpdate } from '../services/ropaApi';
import { useNotification } from '../../../contexts';
import { handleApiErrors } from '../../../utils/formHelpers';

interface RiskFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  tenantId: string;
  dpiaId: string;
  risk?: Risk | null; // If provided, edit mode; otherwise, create mode
}

const SEVERITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

const LIKELIHOOD_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

const RISK_STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'mitigated', label: 'Mitigated' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'closed', label: 'Closed' },
];

export default function RiskFormDialog({
  open,
  onClose,
  onSuccess,
  tenantId,
  dpiaId,
  risk,
}: RiskFormDialogProps) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));
  const { showSuccess, showError } = useNotification();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSuggestingAll, setIsSuggestingAll] = React.useState(false);
  const [expandedAccordions, setExpandedAccordions] = React.useState<string[]>(['basic-info']);
  // Track fields that are currently being suggested (for immediate loading state)
  const [suggestingFields, setSuggestingFields] = React.useState<Set<string>>(new Set());
  // Track Accept All count to avoid stale closures
  const [acceptAllCount, setAcceptAllCount] = React.useState(0);

  const isEditMode = !!risk;

  // Fields that support AI suggestions
  const suggestionFields = React.useMemo(
    () => [
      { name: 'title', type: 'text', label: 'Title' },
      { name: 'description', type: 'text', label: 'Description' },
      { name: 'mitigation', type: 'text', label: 'Mitigation' },
      { name: 'risk_owner', type: 'text', label: 'Risk Owner' },
    ],
    []
  );

  // Initialize suggestion job hook
  const suggestionJob = useSuggestionJob({
    tenantId,
    entityType: 'risk',
    entityId: risk?.id || null,
    enabled: open && !!risk?.id,
  });

  // Update Accept All count when suggestions change
  React.useEffect(() => {
    const updateCount = () => {
      const suggestions = suggestionJob.getAllActiveSuggestions();
      setAcceptAllCount(suggestions.size);
    };
    
    updateCount();
    // Poll for updates (since getAllActiveSuggestions depends on jobStatuses which updates asynchronously)
    const interval = setInterval(updateCount, 1000);
    return () => clearInterval(interval);
  }, [suggestionJob]);

  // Helper function to create suggestion job with immediate loading state
  const handleSuggestField = React.useCallback(async (
    fieldName: string,
    fieldType: string,
    fieldLabel: string,
    currentValue: string,
    formData: Record<string, any>
  ) => {
    // Set loading state immediately
    setSuggestingFields(prev => new Set(prev).add(fieldName));
    try {
      await suggestionJob.createJob(
        fieldName,
        fieldType,
        fieldLabel,
        currentValue,
        formData
      );
    } catch (err) {
      // Error already shown by hook
    } finally {
      // Clear loading state after job is created (polling will handle status updates)
      setSuggestingFields(prev => {
        const next = new Set(prev);
        next.delete(fieldName);
        return next;
      });
    }
  }, [suggestionJob]);

  // Helper function to check if field is suggesting (includes local state)
  const isFieldSuggesting = React.useCallback((fieldName: string) => {
    // Check local state first for immediate feedback
    if (suggestingFields.has(fieldName)) return true;
    const status = suggestionJob.getJobStatus(fieldName);
    return status?.status === 'pending' || status?.status === 'processing';
  }, [suggestingFields, suggestionJob]);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RiskFormData>({
    resolver: zodResolver(riskFormSchema) as any,
    defaultValues: React.useMemo(() => {
      if (risk) {
        // Edit mode - populate with existing data
        return {
          title: risk.title,
          description: risk.description || '',
          severity: risk.severity || '',
          likelihood: risk.likelihood || '',
          residual_severity: risk.residual_severity || '',
          residual_likelihood: risk.residual_likelihood || '',
          mitigation: risk.mitigation || '',
          risk_owner: risk.risk_owner || '',
          risk_status: risk.risk_status || '',
        };
      }
      // Create mode - default values
      return {
        title: '',
        description: '',
      };
    }, [risk]),
  });

  // Expand accordions that contain validation errors
  React.useEffect(() => {
    if (Object.keys(errors).length > 0) {
      const accordionsToExpand = new Set<string>(expandedAccordions);
      
      // Map field names to accordion IDs
      const fieldToAccordion: Record<string, string> = {
        title: 'basic-info',
        description: 'basic-info',
        severity: 'assessment',
        likelihood: 'assessment',
        residual_severity: 'assessment',
        residual_likelihood: 'assessment',
        mitigation: 'management',
        risk_owner: 'management',
        risk_status: 'management',
      };

      // Find accordions that need to be expanded
      Object.keys(errors).forEach((fieldName) => {
        const accordionId = fieldToAccordion[fieldName];
        if (accordionId) {
          accordionsToExpand.add(accordionId);
        }
      });

      // Only update if there are new accordions to expand
      if (accordionsToExpand.size > expandedAccordions.length) {
        setExpandedAccordions(Array.from(accordionsToExpand));
      }
    }
  }, [errors, expandedAccordions]);

  // Reset form when risk changes
  React.useEffect(() => {
    if (risk) {
      reset({
        title: risk.title,
        description: risk.description || '',
        severity: risk.severity || '',
        likelihood: risk.likelihood || '',
        residual_severity: risk.residual_severity || '',
        residual_likelihood: risk.residual_likelihood || '',
        mitigation: risk.mitigation || '',
        risk_owner: risk.risk_owner || '',
        risk_status: risk.risk_status || '',
      }, { keepDefaultValues: false });
    } else {
      reset({
        title: '',
        description: '',
      }, { keepDefaultValues: false });
    }
  }, [risk?.id, reset]);

  // Restore suggestion jobs when dialog opens (if editing existing risk)
  // Use restoreJobs directly (it's memoized) and only depend on open/risk.id
  // This prevents re-triggering when suggestionJob object reference changes
  const restoreJobsRef = React.useRef<(() => Promise<void>) | null>(null);
  restoreJobsRef.current = suggestionJob.restoreJobs;
  
  React.useEffect(() => {
    if (open && risk?.id && restoreJobsRef.current) {
      // Small delay to ensure hook is ready
      const timer = setTimeout(() => {
        restoreJobsRef.current?.();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [open, risk?.id]); // Removed suggestionJob from dependencies

  const handleAccordionChange = (panel: string) => (_event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedAccordions((prev) =>
      isExpanded ? [...prev, panel] : prev.filter((p) => p !== panel)
    );
  };

  const onSubmit = async (data: RiskFormData) => {
    try {
      setIsSubmitting(true);

      // Helper to build the data object
      const buildRiskData = (): RiskCreate | RiskUpdate => {
        const baseData: any = {
          title: data.title,
        };

        // Add optional string fields only if they have values
        if (data.description?.trim()) baseData.description = data.description.trim();
        if (data.severity?.trim()) baseData.severity = data.severity.trim();
        if (data.likelihood?.trim()) baseData.likelihood = data.likelihood.trim();
        if (data.residual_severity?.trim()) baseData.residual_severity = data.residual_severity.trim();
        if (data.residual_likelihood?.trim()) baseData.residual_likelihood = data.residual_likelihood.trim();
        if (data.mitigation?.trim()) baseData.mitigation = data.mitigation.trim();
        if (data.risk_owner?.trim()) baseData.risk_owner = data.risk_owner.trim();
        if (data.risk_status?.trim()) baseData.risk_status = data.risk_status.trim();

        if (isEditMode) {
          return baseData as RiskUpdate;
        } else {
          return { ...baseData, dpia_id: dpiaId } as RiskCreate;
        }
      };

      if (isEditMode && risk) {
        await updateRisk(tenantId, risk.id, buildRiskData() as RiskUpdate);
        showSuccess(`Risk "${data.title}" updated successfully`);
      } else {
        await createRisk(tenantId, dpiaId, buildRiskData() as RiskCreate);
        showSuccess(`Risk "${data.title}" created successfully`);
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      handleApiErrors(error, setValue as any, showError);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      // Don't reset form on close - preserve state for restoration
      // The form will be reset when entity changes or when dialog reopens
      onClose();
    }
  };

  const handleSuggestAll = React.useCallback(async () => {
    if (!risk?.id || isSuggestingAll) return;

    setIsSuggestingAll(true);
    try {
      const formData = watch();
      await suggestionJob.suggestAll(suggestionFields, formData);
    } catch (err) {
      // Error already shown by hook
    } finally {
      setIsSuggestingAll(false);
    }
  }, [risk?.id, isSuggestingAll, suggestionJob, suggestionFields, watch]);

  const handleAcceptAll = React.useCallback(() => {
    const allSuggestions = suggestionJob.getAllActiveSuggestions();
    if (allSuggestions.size === 0) return;

    let acceptedCount = 0;
    allSuggestions.forEach((jobStatus, fieldName) => {
      if (jobStatus.suggestions && jobStatus.suggestions.length > 0) {
        const suggestion = jobStatus.suggestions;
        // Fields that join with newlines
        const newlineFields = ['description', 'mitigation'];
        if (newlineFields.includes(fieldName)) {
          const value = Array.isArray(suggestion) ? suggestion.join('\n\n') : suggestion;
          setValue(fieldName as any, value, { shouldValidate: false, shouldTouch: true });
        } else {
          // Other fields: take first suggestion
          const value = Array.isArray(suggestion) ? suggestion[0] : suggestion;
          setValue(fieldName as any, value, { shouldValidate: false, shouldTouch: true });
        }
        acceptedCount++;
        // Clear job status for this field
        suggestionJob.clearJobStatus(fieldName);
      }
    });

    if (acceptedCount > 0) {
      showSuccess(`Accepted ${acceptedCount} suggestion(s)`);
      // Note: Fields are marked as touched (shouldTouch: true) so that when form
      // submission happens, validation errors will properly highlight the fields
    }
  }, [suggestionJob, setValue, showSuccess]);

  const handleDeclineAll = React.useCallback(() => {
    const count = suggestionJob.declineAll();
    if (count > 0) {
      showSuccess(`Dismissed ${count} suggestion(s)`);
    }
  }, [suggestionJob, showSuccess]);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      fullScreen={fullScreen}
      PaperProps={{
        sx: { minHeight: fullScreen ? '100vh' : 'auto' },
      }}
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center" gap={1}>
            <WarningIcon />
            <Typography variant="h6">
              {isEditMode ? 'Edit Risk' : 'Create Risk'}
            </Typography>
          </Box>
          {isEditMode && risk?.id && (
            <Box display="flex" gap={1}>
              <Button
                size="small"
                variant="outlined"
                startIcon={isSuggestingAll ? <CircularProgress size={16} /> : <AutoAwesomeIcon />}
                onClick={handleSuggestAll}
                disabled={isSuggestingAll}
              >
                Suggest All
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="primary"
                startIcon={<CheckCircleIcon />}
                onClick={handleAcceptAll}
                disabled={acceptAllCount === 0}
              >
                Accept All ({acceptAllCount})
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="secondary"
                startIcon={<CloseIcon />}
                onClick={handleDeclineAll}
                disabled={!suggestionJob.hasActiveSuggestions()}
              >
                Decline All
              </Button>
            </Box>
          )}
        </Box>
      </DialogTitle>

      <DialogContent dividers sx={{ backgroundColor: 'rgba(25, 118, 210, 0.04)' }}>
        <form id="risk-form" onSubmit={handleSubmit(onSubmit)} noValidate>
          {Object.keys(errors).length > 0 && (
            <Alert severity="error" sx={{ mb: 2 }}>
              Please fix the errors below before submitting.
            </Alert>
          )}
          <Stack spacing={0}>
            {/* Basic Identification */}
            <Accordion
              expanded={expandedAccordions.includes('basic-info')}
              onChange={handleAccordionChange('basic-info')}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1" fontWeight="medium">
                  Basic Information
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12 }}>
                    {isEditMode && risk?.id ? (
                      <FormFieldWithSuggestion
                        name="title"
                        control={control}
                        label="Risk Title"
                        fieldType="text"
                        required
                        jobStatus={suggestionJob.getJobStatus('title')}
                        isRestoring={suggestionJob.isRestoring}
                        isSuggesting={isFieldSuggesting('title')}
                        onSuggest={async () => {
                          const formData = watch();
                          await handleSuggestField(
                            'title',
                            'text',
                            'Risk Title',
                            formData.title || '',
                            formData
                          );
                        }}
                        onAccept={(suggestion) => {
                          if (Array.isArray(suggestion)) {
                            setValue('title', suggestion[0], { shouldValidate: true });
                          } else if (typeof suggestion === 'string') {
                            setValue('title', suggestion, { shouldValidate: true });
                          }
                        }}
                        onDismiss={() => {
                          suggestionJob.clearJobStatus('title');
                        }}
                      />
                    ) : (
                      <FormTextField
                        name="title"
                        control={control}
                        label="Risk Title"
                        required
                        fullWidth
                      />
                    )}
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    {isEditMode && risk?.id ? (
                      <FormFieldWithSuggestion
                        name="description"
                        control={control}
                        label="Description"
                        fieldType="textarea"
                        jobStatus={suggestionJob.getJobStatus('description')}
                        isRestoring={suggestionJob.isRestoring}
                        isSuggesting={isFieldSuggesting('description')}
                        onSuggest={async () => {
                          const formData = watch();
                          await handleSuggestField(
                            'description',
                            'textarea',
                            'Description',
                            formData.description || '',
                            formData
                          );
                        }}
                        onAccept={(suggestion) => {
                          if (Array.isArray(suggestion)) {
                            const joined = suggestion.join('\n\n');
                            setValue('description', joined, { shouldValidate: true });
                          } else if (typeof suggestion === 'string') {
                            setValue('description', suggestion, { shouldValidate: true });
                          }
                        }}
                        onDismiss={() => {
                          suggestionJob.clearJobStatus('description');
                        }}
                      />
                    ) : (
                      <FormTextField
                        name="description"
                        control={control}
                        label="Description"
                        multiline
                        rows={3}
                        fullWidth
                      />
                    )}
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* Risk Assessment */}
            <Accordion
              expanded={expandedAccordions.includes('assessment')}
              onChange={handleAccordionChange('assessment')}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1" fontWeight="medium">
                  Risk Assessment
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormSelect
                      name="severity"
                      control={control}
                      label="Inherent Severity"
                      options={SEVERITY_OPTIONS}
                      fullWidth
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormSelect
                      name="likelihood"
                      control={control}
                      label="Inherent Likelihood"
                      options={LIKELIHOOD_OPTIONS}
                      fullWidth
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormSelect
                      name="residual_severity"
                      control={control}
                      label="Residual Severity"
                      options={SEVERITY_OPTIONS}
                      fullWidth
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormSelect
                      name="residual_likelihood"
                      control={control}
                      label="Residual Likelihood"
                      options={LIKELIHOOD_OPTIONS}
                      fullWidth
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* Risk Management */}
            <Accordion
              expanded={expandedAccordions.includes('management')}
              onChange={handleAccordionChange('management')}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1" fontWeight="medium">
                  Risk Management
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12 }}>
                    {isEditMode && risk?.id ? (
                      <FormFieldWithSuggestion
                        name="mitigation"
                        control={control}
                        label="Mitigation Measures"
                        fieldType="multiline"
                        jobStatus={suggestionJob.getJobStatus('mitigation')}
                        isRestoring={suggestionJob.isRestoring}
                        isSuggesting={isFieldSuggesting('mitigation')}
                        onSuggest={async () => {
                          const formData = watch();
                          await handleSuggestField(
                            'mitigation',
                            'multiline',
                            'Mitigation Measures',
                            formData.mitigation || '',
                            formData
                          );
                        }}
                        onAccept={(suggestion) => {
                          if (Array.isArray(suggestion)) {
                            const joined = suggestion.join('\n\n');
                            setValue('mitigation', joined, { shouldValidate: true });
                          } else if (typeof suggestion === 'string') {
                            setValue('mitigation', suggestion, { shouldValidate: true });
                          }
                        }}
                        onDismiss={() => {
                          suggestionJob.clearJobStatus('mitigation');
                        }}
                      />
                    ) : (
                      <FormTextField
                        name="mitigation"
                        control={control}
                        label="Mitigation Measures"
                        multiline
                        rows={4}
                        fullWidth
                      />
                    )}
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    {isEditMode && risk?.id ? (
                      <FormFieldWithSuggestion
                        name="risk_owner"
                        control={control}
                        label="Risk Owner"
                        fieldType="text"
                        jobStatus={suggestionJob.getJobStatus('risk_owner')}
                        isRestoring={suggestionJob.isRestoring}
                        isSuggesting={isFieldSuggesting('risk_owner')}
                        onSuggest={async () => {
                          const formData = watch();
                          await handleSuggestField(
                            'risk_owner',
                            'text',
                            'Risk Owner',
                            formData.risk_owner || '',
                            formData
                          );
                        }}
                        onAccept={(suggestion) => {
                          if (Array.isArray(suggestion)) {
                            setValue('risk_owner', suggestion[0], { shouldValidate: true });
                          } else if (typeof suggestion === 'string') {
                            setValue('risk_owner', suggestion, { shouldValidate: true });
                          }
                        }}
                        onDismiss={() => {
                          suggestionJob.clearJobStatus('risk_owner');
                        }}
                      />
                    ) : (
                      <FormTextField
                        name="risk_owner"
                        control={control}
                        label="Risk Owner"
                        fullWidth
                      />
                    )}
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormSelect
                      name="risk_status"
                      control={control}
                      label="Risk Status"
                      options={RISK_STATUS_OPTIONS}
                      fullWidth
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          </Stack>
        </form>
      </DialogContent>

      <DialogActions>
        <Button
          onClick={handleClose}
          disabled={isSubmitting}
          startIcon={<CancelIcon />}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          form="risk-form"
          variant="contained"
          disabled={isSubmitting}
          startIcon={isSubmitting ? <CircularProgress size={20} /> : <SaveIcon />}
        >
          {isSubmitting ? 'Saving...' : isEditMode ? 'Update' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}


