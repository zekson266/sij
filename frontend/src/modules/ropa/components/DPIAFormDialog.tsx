/**
 * DPIA Form Dialog - Form for creating/editing DPIAs.
 * 
 * Uses Accordion-based layout for organizing fields into logical sections.
 */

import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
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
  FormControlLabel,
  Switch,
  CircularProgress,
  Alert,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Description as DescriptionIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  AutoAwesome as AutoAwesomeIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs, { type Dayjs } from 'dayjs';
import { FormTextField, FormSelect } from '../../../components/common';
import FormFieldWithSuggestion from './FormFieldWithSuggestion';
import { useSuggestionJob } from '../hooks/useSuggestionJob';
import { dpiaFormSchema, type DPIAFormData } from '../schemas/dpiaSchema';
import { createDPIA, updateDPIA, type DPIA, type DPIACreate, type DPIAUpdate } from '../services/ropaApi';
import { useNotification } from '../../../contexts';
import { handleApiErrors } from '../../../utils/formHelpers';

interface DPIAFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  tenantId: string;
  activityId: string;
  dpia?: DPIA | null; // If provided, edit mode; otherwise, create mode
}

const DPIA_STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'in_review', label: 'In Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

export default function DPIAFormDialog({
  open,
  onClose,
  onSuccess,
  tenantId,
  activityId,
  dpia,
}: DPIAFormDialogProps) {
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

  const isEditMode = !!dpia;

  // Fields that support AI suggestions
  const suggestionFields = React.useMemo(
    () => [
      { name: 'title', type: 'text', label: 'Title' },
      { name: 'description', type: 'text', label: 'Description' },
      { name: 'necessity_proportionality_assessment', type: 'text', label: 'Necessity & Proportionality Assessment' },
      { name: 'assessor', type: 'text', label: 'Assessor' },
    ],
    []
  );

  // Initialize suggestion job hook
  const suggestionJob = useSuggestionJob({
    tenantId,
    entityType: 'dpia',
    entityId: dpia?.id || null,
    enabled: open && !!dpia?.id,
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
  } = useForm<DPIAFormData>({
    resolver: zodResolver(dpiaFormSchema) as any,
    defaultValues: React.useMemo(() => {
      if (dpia) {
        // Edit mode - populate with existing data
        return {
          title: dpia.title,
          description: dpia.description || '',
          status: dpia.status || 'draft',
          necessity_proportionality_assessment: dpia.necessity_proportionality_assessment || '',
          assessor: dpia.assessor || '',
          assessment_date: dpia.assessment_date || '',
          dpo_consultation_required: dpia.dpo_consultation_required ?? false,
          dpo_consultation_date: dpia.dpo_consultation_date || '',
          supervisory_authority_consultation_required: dpia.supervisory_authority_consultation_required ?? false,
          supervisory_authority_consultation_date: dpia.supervisory_authority_consultation_date || '',
        };
      }
      // Create mode - default values
      return {
        title: '',
        description: '',
        status: 'draft',
        dpo_consultation_required: false,
        supervisory_authority_consultation_required: false,
      };
    }, [dpia]),
  });

  // Expand accordions that contain validation errors
  React.useEffect(() => {
    if (Object.keys(errors).length > 0) {
      const accordionsToExpand = new Set<string>(expandedAccordions);
      
      // Map field names to accordion IDs
      const fieldToAccordion: Record<string, string> = {
        title: 'basic-info',
        description: 'basic-info',
        status: 'basic-info',
        necessity_proportionality_assessment: 'assessment',
        assessor: 'assessment',
        assessment_date: 'assessment',
        dpo_consultation_required: 'consultation',
        dpo_consultation_date: 'consultation',
        supervisory_authority_consultation_required: 'consultation',
        supervisory_authority_consultation_date: 'consultation',
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

  // Reset form when dpia changes
  React.useEffect(() => {
    if (dpia) {
      reset({
        title: dpia.title,
        description: dpia.description || '',
        status: dpia.status || 'draft',
        necessity_proportionality_assessment: dpia.necessity_proportionality_assessment || '',
        assessor: dpia.assessor || '',
        assessment_date: dpia.assessment_date || '',
        dpo_consultation_required: dpia.dpo_consultation_required ?? false,
        dpo_consultation_date: dpia.dpo_consultation_date || '',
        supervisory_authority_consultation_required: dpia.supervisory_authority_consultation_required ?? false,
        supervisory_authority_consultation_date: dpia.supervisory_authority_consultation_date || '',
      }, { keepDefaultValues: false });
    } else {
      reset({
        title: '',
        description: '',
        status: 'draft',
        dpo_consultation_required: false,
        supervisory_authority_consultation_required: false,
      }, { keepDefaultValues: false });
    }
  }, [dpia?.id, reset]);

  // Restore suggestion jobs when dialog opens (if editing existing dpia)
  // Use restoreJobs directly (it's memoized) and only depend on open/dpia.id
  // This prevents re-triggering when suggestionJob object reference changes
  const restoreJobsRef = React.useRef<(() => Promise<void>) | null>(null);
  restoreJobsRef.current = suggestionJob.restoreJobs;
  
  React.useEffect(() => {
    if (open && dpia?.id && restoreJobsRef.current) {
      // Small delay to ensure hook is ready
      const timer = setTimeout(() => {
        restoreJobsRef.current?.();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [open, dpia?.id]); // Removed suggestionJob from dependencies

  const handleAccordionChange = (panel: string) => (_event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedAccordions((prev) =>
      isExpanded ? [...prev, panel] : prev.filter((p) => p !== panel)
    );
  };

  const onSubmit = async (data: DPIAFormData) => {
    try {
      setIsSubmitting(true);

      // Helper to build the data object
      const buildDPIAData = (): DPIACreate | DPIAUpdate => {
        const baseData: any = {
          title: data.title,
        };

        // Add optional string fields only if they have values
        if (data.description?.trim()) baseData.description = data.description.trim();
        if (data.status?.trim()) baseData.status = data.status.trim();
        if (data.necessity_proportionality_assessment?.trim()) baseData.necessity_proportionality_assessment = data.necessity_proportionality_assessment.trim();
        if (data.assessor?.trim()) baseData.assessor = data.assessor.trim();
        if (data.assessment_date?.trim()) baseData.assessment_date = data.assessment_date.trim();
        if (data.dpo_consultation_date?.trim()) baseData.dpo_consultation_date = data.dpo_consultation_date.trim();
        if (data.supervisory_authority_consultation_date?.trim()) baseData.supervisory_authority_consultation_date = data.supervisory_authority_consultation_date.trim();

        // Boolean fields - ALWAYS include (even if false) for updates
        baseData.dpo_consultation_required = data.dpo_consultation_required ?? false;
        baseData.supervisory_authority_consultation_required = data.supervisory_authority_consultation_required ?? false;

        if (isEditMode) {
          return baseData as DPIAUpdate;
        } else {
          return { ...baseData, processing_activity_id: activityId } as DPIACreate;
        }
      };

      if (isEditMode && dpia) {
        await updateDPIA(tenantId, dpia.id, buildDPIAData() as DPIAUpdate);
        showSuccess(`DPIA "${data.title}" updated successfully`);
      } else {
        await createDPIA(tenantId, activityId, buildDPIAData() as DPIACreate);
        showSuccess(`DPIA "${data.title}" created successfully`);
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
    if (!dpia?.id || isSuggestingAll) return;

    setIsSuggestingAll(true);
    try {
      const formData = watch();
      await suggestionJob.suggestAll(suggestionFields, formData);
    } catch (err) {
      // Error already shown by hook
    } finally {
      setIsSuggestingAll(false);
    }
  }, [dpia?.id, isSuggestingAll, suggestionJob, suggestionFields, watch]);

  const handleAcceptAll = React.useCallback(() => {
    const allSuggestions = suggestionJob.getAllActiveSuggestions();
    if (allSuggestions.size === 0) return;

    let acceptedCount = 0;
    allSuggestions.forEach((jobStatus, fieldName) => {
      if (jobStatus.suggestions && jobStatus.suggestions.length > 0) {
        const suggestion = jobStatus.suggestions;
        // Fields that join with newlines
        const newlineFields = ['description', 'necessity_proportionality_assessment'];
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
            <DescriptionIcon />
            <Typography variant="h6">
              {isEditMode ? 'Edit DPIA' : 'Create DPIA'}
            </Typography>
          </Box>
          {isEditMode && dpia?.id && (
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
        <form id="dpia-form" onSubmit={handleSubmit(onSubmit)} noValidate>
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
                    {isEditMode && dpia?.id ? (
                      <FormFieldWithSuggestion
                        name="title"
                        control={control}
                        label="DPIA Title"
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
                            'DPIA Title',
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
                        label="DPIA Title"
                        required
                        fullWidth
                      />
                    )}
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    {isEditMode && dpia?.id ? (
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
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormSelect
                      name="status"
                      control={control}
                      label="Status"
                      options={DPIA_STATUS_OPTIONS}
                      fullWidth
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* Assessment Details */}
            <Accordion
              expanded={expandedAccordions.includes('assessment')}
              onChange={handleAccordionChange('assessment')}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1" fontWeight="medium">
                  Assessment Details
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12 }}>
                    {isEditMode && dpia?.id ? (
                      <FormFieldWithSuggestion
                        name="necessity_proportionality_assessment"
                        control={control}
                        label="Necessity and Proportionality Assessment"
                        fieldType="multiline"
                        jobStatus={suggestionJob.getJobStatus('necessity_proportionality_assessment')}
                        isRestoring={suggestionJob.isRestoring}
                        isSuggesting={isFieldSuggesting('necessity_proportionality_assessment')}
                        onSuggest={async () => {
                          const formData = watch();
                          await handleSuggestField(
                            'necessity_proportionality_assessment',
                            'multiline',
                            'Necessity and Proportionality Assessment',
                            formData.necessity_proportionality_assessment || '',
                            formData
                          );
                        }}
                        onAccept={(suggestion) => {
                          if (Array.isArray(suggestion)) {
                            const joined = suggestion.join('\n\n');
                            setValue('necessity_proportionality_assessment', joined, { shouldValidate: true });
                          } else if (typeof suggestion === 'string') {
                            setValue('necessity_proportionality_assessment', suggestion, { shouldValidate: true });
                          }
                        }}
                        onDismiss={() => {
                          suggestionJob.clearJobStatus('necessity_proportionality_assessment');
                        }}
                      />
                    ) : (
                      <FormTextField
                        name="necessity_proportionality_assessment"
                        control={control}
                        label="Necessity and Proportionality Assessment"
                        multiline
                        rows={4}
                        fullWidth
                      />
                    )}
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    {isEditMode && dpia?.id ? (
                      <FormFieldWithSuggestion
                        name="assessor"
                        control={control}
                        label="Assessor"
                        fieldType="text"
                        jobStatus={suggestionJob.getJobStatus('assessor')}
                        isRestoring={suggestionJob.isRestoring}
                        isSuggesting={isFieldSuggesting('assessor')}
                        onSuggest={async () => {
                          const formData = watch();
                          await handleSuggestField(
                            'assessor',
                            'text',
                            'Assessor',
                            formData.assessor || '',
                            formData
                          );
                        }}
                        onAccept={(suggestion) => {
                          if (Array.isArray(suggestion)) {
                            setValue('assessor', suggestion[0], { shouldValidate: true });
                          } else if (typeof suggestion === 'string') {
                            setValue('assessor', suggestion, { shouldValidate: true });
                          }
                        }}
                        onDismiss={() => {
                          suggestionJob.clearJobStatus('assessor');
                        }}
                      />
                    ) : (
                      <FormTextField
                        name="assessor"
                        control={control}
                        label="Assessor"
                        fullWidth
                      />
                    )}
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Controller
                      name="assessment_date"
                      control={control}
                      render={({ field }) => (
                        <DatePicker
                          label="Assessment Date"
                          value={field.value ? dayjs(field.value) : null}
                          onChange={(date: Dayjs | null) => {
                            field.onChange(date ? date.toISOString() : '');
                          }}
                          slotProps={{
                            textField: {
                              fullWidth: true,
                              error: !!errors.assessment_date,
                              helperText: errors.assessment_date?.message,
                            },
                          }}
                        />
                      )}
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* Consultation Requirements */}
            <Accordion
              expanded={expandedAccordions.includes('consultation')}
              onChange={handleAccordionChange('consultation')}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1" fontWeight="medium">
                  Consultation Requirements
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12 }}>
                    <Controller
                      name="dpo_consultation_required"
                      control={control}
                      render={({ field }) => (
                        <FormControlLabel
                          control={<Switch {...field} checked={field.value ?? false} />}
                          label="DPO Consultation Required"
                        />
                      )}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Controller
                      name="dpo_consultation_date"
                      control={control}
                      render={({ field }) => (
                        <DatePicker
                          label="DPO Consultation Date"
                          value={field.value ? dayjs(field.value) : null}
                          onChange={(date: Dayjs | null) => {
                            field.onChange(date ? date.toISOString() : '');
                          }}
                          slotProps={{
                            textField: {
                              fullWidth: true,
                              error: !!errors.dpo_consultation_date,
                              helperText: errors.dpo_consultation_date?.message,
                            },
                          }}
                        />
                      )}
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Controller
                      name="supervisory_authority_consultation_required"
                      control={control}
                      render={({ field }) => (
                        <FormControlLabel
                          control={<Switch {...field} checked={field.value ?? false} />}
                          label="Supervisory Authority Consultation Required"
                        />
                      )}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Controller
                      name="supervisory_authority_consultation_date"
                      control={control}
                      render={({ field }) => (
                        <DatePicker
                          label="Supervisory Authority Consultation Date"
                          value={field.value ? dayjs(field.value) : null}
                          onChange={(date: Dayjs | null) => {
                            field.onChange(date ? date.toISOString() : '');
                          }}
                          slotProps={{
                            textField: {
                              fullWidth: true,
                              error: !!errors.supervisory_authority_consultation_date,
                              helperText: errors.supervisory_authority_consultation_date?.message,
                            },
                          }}
                        />
                      )}
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
          form="dpia-form"
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


