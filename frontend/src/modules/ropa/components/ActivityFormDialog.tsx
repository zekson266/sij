/**
 * Activity Form Dialog - Form for creating/editing processing activities.
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
  TextField,
  Chip,
  Autocomplete,
  FormControlLabel,
  Switch,
} from '@mui/material';
import { Controller } from 'react-hook-form';
import {
  ExpandMore as ExpandMoreIcon,
  Business as BusinessIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  AutoAwesome as AutoAwesomeIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { FormTextField, FormSelect } from '../../../components/common';
import FormFieldWithSuggestion from './FormFieldWithSuggestion';
import { useSuggestionJob } from '../hooks/useSuggestionJob';
import { activityFormSchema, type ActivityFormData } from '../schemas/activitySchema';
import { createActivity, updateActivity, fetchDepartments, type Activity, type ActivityCreate, type ActivityUpdate, type Department } from '../services/ropaApi';
import { useNotification } from '../../../contexts';
import { handleApiErrors } from '../../../utils/formHelpers';

interface ActivityFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  tenantId: string;
  repositoryId: string;
  activity?: Activity | null; // If provided, edit mode; otherwise, create mode
}


export default function ActivityFormDialog({
  open,
  onClose,
  onSuccess,
  tenantId,
  repositoryId,
  activity,
}: ActivityFormDialogProps) {
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

  const isEditMode = !!activity;

  // Fetch departments for collection_sources and data_disclosed_to
  const [departments, setDepartments] = React.useState<Department[]>([]);
  const [isLoadingDepartments, setIsLoadingDepartments] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setIsLoadingDepartments(true);
      fetchDepartments(tenantId)
        .then(setDepartments)
        .catch(() => setDepartments([]))
        .finally(() => setIsLoadingDepartments(false));
    }
  }, [open, tenantId]);

  // Fields that support AI suggestions
  const suggestionFields = React.useMemo(
    () => [
      { name: 'purpose', type: 'text', label: 'Purpose of Processing' },
      { name: 'lawful_basis', type: 'text', label: 'Lawful Basis' },
      { name: 'legitimate_interest_assessment', type: 'multiline', label: 'Legitimate Interest Assessment' },
      { name: 'jit_notice', type: 'multiline', label: 'Just-in-Time Notice' },
      { name: 'consent_process', type: 'multiline', label: 'Consent Process' },
      // Part 2 fields
      { name: 'data_subject_rights', type: 'multiline', label: 'Data Subject Rights' },
      { name: 'dpia_comment', type: 'multiline', label: 'DPIA Comment' },
      { name: 'children_data', type: 'multiline', label: 'Children Data' },
      { name: 'parental_consent', type: 'multiline', label: 'Parental Consent' },
    ],
    []
  );

  // Data subject type options
  const DATA_SUBJECT_TYPE_OPTIONS = [
    'Customer',
    'Secondary Customer',
    'Employee',
    'Applicant',
    'Candidate',
    'Supplier',
    'Partner',
    'Business Contact',
    'Vulnerable Individual',
    'Contractor',
  ];

  // Processing frequency options
  const PROCESSING_FREQUENCY_OPTIONS = [
    'Real-time',
    'Daily',
    'Weekly',
    'Monthly',
    'Ad-hoc',
  ];

  // Legal jurisdiction options
  const LEGAL_JURISDICTION_OPTIONS = [
    'GDPR',
    'PIPEDA',
    'CCPA',
    'HIPAA',
    'LGPD',
    'Other',
  ];

  // Initialize suggestion job hook
  const suggestionJob = useSuggestionJob({
    tenantId,
    entityType: 'activity',
    entityId: activity?.id || null,
    enabled: open && !!activity?.id,
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
  } = useForm<ActivityFormData>({
    resolver: zodResolver(activityFormSchema) as any,
    defaultValues: React.useMemo(() => {
      if (activity) {
        // Edit mode - populate with existing data
        return {
          processing_activity_name: activity.processing_activity_name,
          purpose: activity.purpose || '',
          lawful_basis: activity.lawful_basis || '',
          legitimate_interest_assessment: activity.legitimate_interest_assessment || '',
          data_subject_type: activity.data_subject_type || [],
          collection_sources: activity.collection_sources || [],
          data_disclosed_to: activity.data_disclosed_to || [],
          jit_notice: activity.jit_notice || '',
          consent_process: activity.consent_process || '',
          automated_decision: activity.automated_decision ?? false,
          data_subject_rights: activity.data_subject_rights || '',
          dpia_required: activity.dpia_required ?? false,
          dpia_comment: activity.dpia_comment || '',
          dpia_file: activity.dpia_file || '',
          dpia_gpc_link: activity.dpia_gpc_link || '',
          children_data: activity.children_data || '',
          parental_consent: activity.parental_consent || '',
          comments: activity.comments || [],
          data_retention_policy: activity.data_retention_policy || '',
          processing_frequency: activity.processing_frequency,
          legal_jurisdiction: activity.legal_jurisdiction || [],
        };
      }
      // Create mode - default values
      return {
        processing_activity_name: '',
        automated_decision: false,
        dpia_required: false,
        comments: [],
        legal_jurisdiction: [],
      };
    }, [activity]),
  });

  // Expand accordions that contain validation errors
  React.useEffect(() => {
    if (Object.keys(errors).length > 0) {
      const accordionsToExpand = new Set<string>(expandedAccordions);
      
      // Map field names to accordion IDs
      const fieldToAccordion: Record<string, string> = {
        processing_activity_name: 'basic-info',
        purpose: 'basic-info',
        lawful_basis: 'basic-info',
        legitimate_interest_assessment: 'legal-basis',
        data_subject_type: 'data-subjects',
        collection_sources: 'data-sources',
        data_disclosed_to: 'data-disclosure',
        jit_notice: 'notices',
        consent_process: 'notices',
        automated_decision: 'automated-decision',
        data_subject_rights: 'data-subject-rights',
        dpia_required: 'dpia',
        dpia_comment: 'dpia',
        dpia_file: 'dpia',
        dpia_gpc_link: 'dpia',
        children_data: 'children-data',
        parental_consent: 'children-data',
        comments: 'additional-info',
        data_retention_policy: 'additional-info',
        processing_frequency: 'additional-info',
        legal_jurisdiction: 'additional-info',
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

  // Reset form when activity changes (using activity.id to detect changes)
  React.useEffect(() => {
    if (activity) {
      reset({
        processing_activity_name: activity.processing_activity_name,
        purpose: activity.purpose || '',
        lawful_basis: activity.lawful_basis || '',
        legitimate_interest_assessment: activity.legitimate_interest_assessment || '',
        data_subject_type: activity.data_subject_type || [],
        collection_sources: activity.collection_sources || [],
        data_disclosed_to: activity.data_disclosed_to || [],
        jit_notice: activity.jit_notice || '',
        consent_process: activity.consent_process || '',
        automated_decision: activity.automated_decision ?? false,
        data_subject_rights: activity.data_subject_rights || '',
        dpia_required: activity.dpia_required ?? false,
        dpia_comment: activity.dpia_comment || '',
        dpia_file: activity.dpia_file || '',
        dpia_gpc_link: activity.dpia_gpc_link || '',
        children_data: activity.children_data || '',
        parental_consent: activity.parental_consent || '',
        comments: activity.comments || [],
        data_retention_policy: activity.data_retention_policy || '',
        processing_frequency: activity.processing_frequency,
        legal_jurisdiction: activity.legal_jurisdiction || [],
      }, { keepDefaultValues: false });
    } else {
      reset({
        processing_activity_name: '',
        automated_decision: false,
        dpia_required: false,
        comments: [],
        legal_jurisdiction: [],
      }, { keepDefaultValues: false });
    }
  }, [activity?.id, reset]); // Use activity.id to detect when activity changes

  // Restore suggestion jobs when dialog opens (if editing existing activity)
  // Use restoreJobs directly (it's memoized) and only depend on open/activity.id
  // This prevents re-triggering when suggestionJob object reference changes
  const restoreJobsRef = React.useRef<(() => Promise<void>) | null>(null);
  restoreJobsRef.current = suggestionJob.restoreJobs;
  
  React.useEffect(() => {
    if (open && activity?.id && restoreJobsRef.current) {
      // Small delay to ensure hook is ready
      const timer = setTimeout(() => {
        restoreJobsRef.current?.();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [open, activity?.id]); // Removed suggestionJob from dependencies

  const handleAccordionChange = (panel: string) => (_event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedAccordions((prev) =>
      isExpanded ? [...prev, panel] : prev.filter((p) => p !== panel)
    );
  };

  const onSubmit = async (data: ActivityFormData) => {
    try {
      setIsSubmitting(true);

      // Helper to build the data object
      const buildActivityData = (): ActivityCreate | ActivityUpdate => {
        const baseData: any = {
          processing_activity_name: data.processing_activity_name,
        };

        // Add optional string fields only if they have values
        if (data.purpose?.trim()) baseData.purpose = data.purpose.trim();
        if (data.lawful_basis?.trim()) baseData.lawful_basis = data.lawful_basis.trim();
        if (data.legitimate_interest_assessment?.trim()) baseData.legitimate_interest_assessment = data.legitimate_interest_assessment.trim();
        if (data.jit_notice?.trim()) baseData.jit_notice = data.jit_notice.trim();
        if (data.consent_process?.trim()) baseData.consent_process = data.consent_process.trim();
        if (data.data_subject_rights?.trim()) baseData.data_subject_rights = data.data_subject_rights.trim();
        if (data.dpia_comment?.trim()) baseData.dpia_comment = data.dpia_comment.trim();
        if (data.dpia_file?.trim()) baseData.dpia_file = data.dpia_file.trim();
        if (data.dpia_gpc_link?.trim()) baseData.dpia_gpc_link = data.dpia_gpc_link.trim();
        if (data.children_data?.trim()) baseData.children_data = data.children_data.trim();
        if (data.parental_consent?.trim()) baseData.parental_consent = data.parental_consent.trim();

        // Add boolean fields (always include, even if false)
        baseData.automated_decision = data.automated_decision ?? false;
        baseData.dpia_required = data.dpia_required ?? false;

        // Add array fields if they have values
        if (data.data_subject_type && data.data_subject_type.length > 0) {
          baseData.data_subject_type = data.data_subject_type;
        }
        if (data.collection_sources && data.collection_sources.length > 0) {
          baseData.collection_sources = data.collection_sources;
        }
        if (data.data_disclosed_to && data.data_disclosed_to.length > 0) {
          baseData.data_disclosed_to = data.data_disclosed_to;
        }
        if (data.comments && data.comments.length > 0) {
          baseData.comments = data.comments;
        }
        if (data.legal_jurisdiction && data.legal_jurisdiction.length > 0) {
          baseData.legal_jurisdiction = data.legal_jurisdiction;
        }

        // Add enum field if it has a value
        if (data.processing_frequency) {
          baseData.processing_frequency = data.processing_frequency;
        }

        // Add URL field if it has a value
        if (data.data_retention_policy?.trim()) {
          baseData.data_retention_policy = data.data_retention_policy.trim();
        }

        if (isEditMode) {
          return baseData as ActivityUpdate;
        } else {
          return { ...baseData, data_repository_id: repositoryId } as ActivityCreate;
        }
      };

      if (isEditMode && activity) {
        await updateActivity(tenantId, activity.id, buildActivityData() as ActivityUpdate);
        showSuccess(`Activity "${data.processing_activity_name}" updated successfully`);
      } else {
        await createActivity(tenantId, repositoryId, buildActivityData() as ActivityCreate);
        showSuccess(`Activity "${data.processing_activity_name}" created successfully`);
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
      // The form will be reset when activity changes or when dialog reopens
      onClose();
    }
  };

  const handleSuggestAll = React.useCallback(async () => {
    if (!activity?.id || isSuggestingAll) return;

    setIsSuggestingAll(true);
    try {
      const formData = watch();
      await suggestionJob.suggestAll(suggestionFields, formData);
    } catch (err) {
      // Error already shown by hook
    } finally {
      setIsSuggestingAll(false);
    }
  }, [activity?.id, isSuggestingAll, suggestionJob, suggestionFields, watch]);

  const handleAcceptAll = React.useCallback(() => {
    const allSuggestions = suggestionJob.getAllActiveSuggestions();
    if (allSuggestions.size === 0) return;

    let acceptedCount = 0;
    allSuggestions.forEach((jobStatus, fieldName) => {
      if (jobStatus.suggestions && jobStatus.suggestions.length > 0) {
        const suggestion = jobStatus.suggestions;
        // Fields that join with newlines
        const joinFields = ['description', 'processing_operations'];
        if (joinFields.includes(fieldName)) {
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
            <BusinessIcon />
            <Typography variant="h6">
              {isEditMode ? 'Edit Activity' : 'Create Activity'}
            </Typography>
          </Box>
          {isEditMode && activity?.id && (
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
        <form id="activity-form" onSubmit={handleSubmit(onSubmit)} noValidate>
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
                    <FormTextField
                      name="processing_activity_name"
                      control={control}
                      label="Activity Name"
                      required
                      fullWidth
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    {isEditMode && activity?.id ? (
                      <FormFieldWithSuggestion
                        name="purpose"
                        control={control}
                        label="Purpose of Processing"
                        fieldType="text"
                        jobStatus={suggestionJob.getJobStatus('purpose')}
                        isRestoring={suggestionJob.isRestoring}
                        isSuggesting={isFieldSuggesting('purpose')}
                        onSuggest={async () => {
                          const formData = watch();
                          await handleSuggestField(
                            'purpose',
                            'text',
                            'Purpose of Processing',
                            formData.purpose || '',
                            formData
                          );
                        }}
                        onAccept={(suggestion) => {
                          if (Array.isArray(suggestion)) {
                            setValue('purpose', suggestion[0], { shouldValidate: true });
                          } else if (typeof suggestion === 'string') {
                            setValue('purpose', suggestion, { shouldValidate: true });
                          }
                        }}
                        onDismiss={() => {
                          suggestionJob.clearJobStatus('purpose');
                        }}
                      />
                    ) : (
                      <FormTextField
                        name="purpose"
                        control={control}
                        label="Purpose of Processing"
                        fullWidth
                      />
                    )}
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    {isEditMode && activity?.id ? (
                      <FormFieldWithSuggestion
                        name="lawful_basis"
                        control={control}
                        label="Lawful Basis"
                        fieldType="text"
                        jobStatus={suggestionJob.getJobStatus('lawful_basis')}
                        isRestoring={suggestionJob.isRestoring}
                        isSuggesting={isFieldSuggesting('lawful_basis')}
                        onSuggest={async () => {
                          const formData = watch();
                          await handleSuggestField(
                            'lawful_basis',
                            'text',
                            'Lawful Basis',
                            formData.lawful_basis || '',
                            formData
                          );
                        }}
                        onAccept={(suggestion) => {
                          if (Array.isArray(suggestion)) {
                            setValue('lawful_basis', suggestion[0], { shouldValidate: true });
                          } else if (typeof suggestion === 'string') {
                            setValue('lawful_basis', suggestion, { shouldValidate: true });
                          }
                        }}
                        onDismiss={() => {
                          suggestionJob.clearJobStatus('lawful_basis');
                        }}
                      />
                    ) : (
                      <FormTextField
                        name="lawful_basis"
                        control={control}
                        label="Lawful Basis"
                        fullWidth
                      />
                    )}
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* Legitimate Interest Assessment */}
            <Accordion
              expanded={expandedAccordions.includes('legal-basis')}
              onChange={handleAccordionChange('legal-basis')}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1" fontWeight="medium">
                  Legitimate Interest Assessment
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12 }}>
                    {isEditMode && activity?.id ? (
                      <FormFieldWithSuggestion
                        name="legitimate_interest_assessment"
                        control={control}
                        label="Legitimate Interest Assessment"
                        fieldType="multiline"
                        jobStatus={suggestionJob.getJobStatus('legitimate_interest_assessment')}
                        isRestoring={suggestionJob.isRestoring}
                        isSuggesting={isFieldSuggesting('legitimate_interest_assessment')}
                        onSuggest={async () => {
                          const formData = watch();
                          await handleSuggestField(
                            'legitimate_interest_assessment',
                            'multiline',
                            'Legitimate Interest Assessment',
                            formData.legitimate_interest_assessment || '',
                            formData
                          );
                        }}
                        onAccept={(suggestion) => {
                          if (Array.isArray(suggestion)) {
                            const joined = suggestion.join('\n\n');
                            setValue('legitimate_interest_assessment', joined, { shouldValidate: true });
                          } else if (typeof suggestion === 'string') {
                            setValue('legitimate_interest_assessment', suggestion, { shouldValidate: true });
                          }
                        }}
                        onDismiss={() => {
                          suggestionJob.clearJobStatus('legitimate_interest_assessment');
                        }}
                      />
                    ) : (
                      <FormTextField
                        name="legitimate_interest_assessment"
                        control={control}
                        label="Legitimate Interest Assessment"
                        multiline
                        rows={4}
                        fullWidth
                      />
                    )}
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* Data Subjects */}
            <Accordion
              expanded={expandedAccordions.includes('data-subjects')}
              onChange={handleAccordionChange('data-subjects')}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1" fontWeight="medium">
                  Data Subjects
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12 }}>
                    <Controller
                      name="data_subject_type"
                      control={control}
                      render={({ field, fieldState }) => (
                        <Autocomplete
                          multiple
                          freeSolo
                          options={DATA_SUBJECT_TYPE_OPTIONS}
                          value={field.value || []}
                          onChange={(_event, newValue) => field.onChange(newValue)}
                          renderTags={(value, getTagProps) =>
                            value.map((option, index) => (
                              <Chip
                                variant="outlined"
                                label={option}
                                {...getTagProps({ index })}
                                key={index}
                              />
                            ))
                          }
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="Data Subject Type"
                              placeholder="Select or type data subject types"
                              helperText={fieldState.error?.message || "Select from options or type custom values"}
                              error={!!fieldState.error}
                              fullWidth
                            />
                          )}
                        />
                      )}
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* Data Sources */}
            <Accordion
              expanded={expandedAccordions.includes('data-sources')}
              onChange={handleAccordionChange('data-sources')}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1" fontWeight="medium">
                  Data Collection Sources
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12 }}>
                    <Controller
                      name="collection_sources"
                      control={control}
                      render={({ field, fieldState }) => (
                        <Autocomplete
                          multiple
                          options={departments}
                          getOptionLabel={(option) => option.name}
                          value={departments.filter(dept => field.value?.includes(dept.id)) || []}
                          onChange={(_event, newValue) => field.onChange(newValue.map(dept => dept.id))}
                          loading={isLoadingDepartments}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="Collection Sources"
                              helperText={fieldState.error?.message || "Select departments from lookup table"}
                              error={!!fieldState.error}
                              fullWidth
                            />
                          )}
                          renderTags={(value, getTagProps) =>
                            value.map((option, index) => (
                              <Chip
                                variant="outlined"
                                label={option.name}
                                {...getTagProps({ index })}
                                key={option.id}
                              />
                            ))
                          }
                        />
                      )}
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* Data Disclosure */}
            <Accordion
              expanded={expandedAccordions.includes('data-disclosure')}
              onChange={handleAccordionChange('data-disclosure')}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1" fontWeight="medium">
                  Data Disclosure
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12 }}>
                    <Controller
                      name="data_disclosed_to"
                      control={control}
                      render={({ field, fieldState }) => (
                        <Autocomplete
                          multiple
                          options={departments}
                          getOptionLabel={(option) => option.name}
                          value={departments.filter(dept => field.value?.includes(dept.id)) || []}
                          onChange={(_event, newValue) => field.onChange(newValue.map(dept => dept.id))}
                          loading={isLoadingDepartments}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="Data Disclosed To"
                              helperText={fieldState.error?.message || "Select departments from lookup table"}
                              error={!!fieldState.error}
                              fullWidth
                            />
                          )}
                          renderTags={(value, getTagProps) =>
                            value.map((option, index) => (
                              <Chip
                                variant="outlined"
                                label={option.name}
                                {...getTagProps({ index })}
                                key={option.id}
                              />
                            ))
                          }
                        />
                      )}
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* Notices & Consent */}
            <Accordion
              expanded={expandedAccordions.includes('notices')}
              onChange={handleAccordionChange('notices')}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1" fontWeight="medium">
                  Notices & Consent
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12 }}>
                    {isEditMode && activity?.id ? (
                      <FormFieldWithSuggestion
                        name="jit_notice"
                        control={control}
                        label="Just-in-Time Notice"
                        fieldType="multiline"
                        jobStatus={suggestionJob.getJobStatus('jit_notice')}
                        isRestoring={suggestionJob.isRestoring}
                        isSuggesting={isFieldSuggesting('jit_notice')}
                        onSuggest={async () => {
                          const formData = watch();
                          await handleSuggestField(
                            'jit_notice',
                            'multiline',
                            'Just-in-Time Notice',
                            formData.jit_notice || '',
                            formData
                          );
                        }}
                        onAccept={(suggestion) => {
                          if (Array.isArray(suggestion)) {
                            const joined = suggestion.join('\n\n');
                            setValue('jit_notice', joined, { shouldValidate: true });
                          } else if (typeof suggestion === 'string') {
                            setValue('jit_notice', suggestion, { shouldValidate: true });
                          }
                        }}
                        onDismiss={() => {
                          suggestionJob.clearJobStatus('jit_notice');
                        }}
                      />
                    ) : (
                      <FormTextField
                        name="jit_notice"
                        control={control}
                        label="Just-in-Time Notice"
                        multiline
                        rows={4}
                        fullWidth
                      />
                    )}
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    {isEditMode && activity?.id ? (
                      <FormFieldWithSuggestion
                        name="consent_process"
                        control={control}
                        label="Consent Process"
                        fieldType="multiline"
                        jobStatus={suggestionJob.getJobStatus('consent_process')}
                        isRestoring={suggestionJob.isRestoring}
                        isSuggesting={isFieldSuggesting('consent_process')}
                        onSuggest={async () => {
                          const formData = watch();
                          await handleSuggestField(
                            'consent_process',
                            'multiline',
                            'Consent Process',
                            formData.consent_process || '',
                            formData
                          );
                        }}
                        onAccept={(suggestion) => {
                          if (Array.isArray(suggestion)) {
                            const joined = suggestion.join('\n\n');
                            setValue('consent_process', joined, { shouldValidate: true });
                          } else if (typeof suggestion === 'string') {
                            setValue('consent_process', suggestion, { shouldValidate: true });
                          }
                        }}
                        onDismiss={() => {
                          suggestionJob.clearJobStatus('consent_process');
                        }}
                      />
                    ) : (
                      <FormTextField
                        name="consent_process"
                        control={control}
                        label="Consent Process"
                        multiline
                        rows={4}
                        fullWidth
                      />
                    )}
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* Automated Decision Making */}
            <Accordion
              expanded={expandedAccordions.includes('automated-decision')}
              onChange={handleAccordionChange('automated-decision')}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1" fontWeight="medium">
                  Automated Decision Making
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12 }}>
                    <Controller
                      name="automated_decision"
                      control={control}
                      render={({ field }) => (
                        <FormControlLabel
                          control={
                            <Switch
                              checked={field.value}
                              onChange={field.onChange}
                            />
                          }
                          label="Automated Decision Making"
                        />
                      )}
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* Data Subject Rights */}
            <Accordion
              expanded={expandedAccordions.includes('data-subject-rights')}
              onChange={handleAccordionChange('data-subject-rights')}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1" fontWeight="medium">
                  Data Subject Rights
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12 }}>
                    {isEditMode && activity?.id ? (
                      <FormFieldWithSuggestion
                        name="data_subject_rights"
                        control={control}
                        label="Data Subject Rights"
                        fieldType="multiline"
                        jobStatus={suggestionJob.getJobStatus('data_subject_rights')}
                        isRestoring={suggestionJob.isRestoring}
                        isSuggesting={isFieldSuggesting('data_subject_rights')}
                        onSuggest={() => {
                          const formData = watch();
                          handleSuggestField(
                            'data_subject_rights',
                            'multiline',
                            'Data Subject Rights',
                            formData.data_subject_rights || '',
                            formData
                          );
                        }}
                        onAccept={(suggestion) => {
                          if (Array.isArray(suggestion)) {
                            const joined = suggestion.join('\n\n');
                            setValue('data_subject_rights', joined, { shouldValidate: true });
                          } else if (typeof suggestion === 'string') {
                            setValue('data_subject_rights', suggestion, { shouldValidate: true });
                          }
                        }}
                        onDismiss={() => {
                          suggestionJob.clearJobStatus('data_subject_rights');
                        }}
                      />
                    ) : (
                      <FormTextField
                        name="data_subject_rights"
                        control={control}
                        label="Data Subject Rights"
                        multiline
                        rows={4}
                        fullWidth
                      />
                    )}
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* DPIA */}
            <Accordion
              expanded={expandedAccordions.includes('dpia')}
              onChange={handleAccordionChange('dpia')}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1" fontWeight="medium">
                  Data Protection Impact Assessment (DPIA)
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12 }}>
                    <Controller
                      name="dpia_required"
                      control={control}
                      render={({ field }) => (
                        <FormControlLabel
                          control={
                            <Switch
                              checked={field.value}
                              onChange={field.onChange}
                            />
                          }
                          label="DPIA Required"
                        />
                      )}
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    {isEditMode && activity?.id ? (
                      <FormFieldWithSuggestion
                        name="dpia_comment"
                        control={control}
                        label="DPIA Comment"
                        fieldType="multiline"
                        jobStatus={suggestionJob.getJobStatus('dpia_comment')}
                        isRestoring={suggestionJob.isRestoring}
                        isSuggesting={isFieldSuggesting('dpia_comment')}
                        onSuggest={() => {
                          const formData = watch();
                          handleSuggestField(
                            'dpia_comment',
                            'multiline',
                            'DPIA Comment',
                            formData.dpia_comment || '',
                            formData
                          );
                        }}
                        onAccept={(suggestion) => {
                          if (Array.isArray(suggestion)) {
                            const joined = suggestion.join('\n\n');
                            setValue('dpia_comment', joined, { shouldValidate: true });
                          } else if (typeof suggestion === 'string') {
                            setValue('dpia_comment', suggestion, { shouldValidate: true });
                          }
                        }}
                        onDismiss={() => {
                          suggestionJob.clearJobStatus('dpia_comment');
                        }}
                      />
                    ) : (
                      <FormTextField
                        name="dpia_comment"
                        control={control}
                        label="DPIA Comment"
                        multiline
                        rows={4}
                        fullWidth
                      />
                    )}
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <FormTextField
                      name="dpia_file"
                      control={control}
                      label="DPIA File Path"
                      helperText="File path (deferred file upload implementation)"
                      fullWidth
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <FormTextField
                      name="dpia_gpc_link"
                      control={control}
                      label="DPIA GPC Link"
                      helperText="Web link (URL) to DPIA GPC"
                      fullWidth
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* Children Data */}
            <Accordion
              expanded={expandedAccordions.includes('children-data')}
              onChange={handleAccordionChange('children-data')}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1" fontWeight="medium">
                  Children Data & Parental Consent
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12 }}>
                    {isEditMode && activity?.id ? (
                      <FormFieldWithSuggestion
                        name="children_data"
                        control={control}
                        label="Children Data"
                        fieldType="multiline"
                        jobStatus={suggestionJob.getJobStatus('children_data')}
                        isRestoring={suggestionJob.isRestoring}
                        isSuggesting={isFieldSuggesting('children_data')}
                        onSuggest={() => {
                          const formData = watch();
                          handleSuggestField(
                            'children_data',
                            'multiline',
                            'Children Data',
                            formData.children_data || '',
                            formData
                          );
                        }}
                        onAccept={(suggestion) => {
                          if (Array.isArray(suggestion)) {
                            const joined = suggestion.join('\n\n');
                            setValue('children_data', joined, { shouldValidate: true });
                          } else if (typeof suggestion === 'string') {
                            setValue('children_data', suggestion, { shouldValidate: true });
                          }
                        }}
                        onDismiss={() => {
                          suggestionJob.clearJobStatus('children_data');
                        }}
                      />
                    ) : (
                      <FormTextField
                        name="children_data"
                        control={control}
                        label="Children Data"
                        multiline
                        rows={4}
                        fullWidth
                      />
                    )}
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    {isEditMode && activity?.id ? (
                      <FormFieldWithSuggestion
                        name="parental_consent"
                        control={control}
                        label="Parental Consent"
                        fieldType="multiline"
                        jobStatus={suggestionJob.getJobStatus('parental_consent')}
                        isRestoring={suggestionJob.isRestoring}
                        isSuggesting={isFieldSuggesting('parental_consent')}
                        onSuggest={() => {
                          const formData = watch();
                          handleSuggestField(
                            'parental_consent',
                            'multiline',
                            'Parental Consent',
                            formData.parental_consent || '',
                            formData
                          );
                        }}
                        onAccept={(suggestion) => {
                          if (Array.isArray(suggestion)) {
                            const joined = suggestion.join('\n\n');
                            setValue('parental_consent', joined, { shouldValidate: true });
                          } else if (typeof suggestion === 'string') {
                            setValue('parental_consent', suggestion, { shouldValidate: true });
                          }
                        }}
                        onDismiss={() => {
                          suggestionJob.clearJobStatus('parental_consent');
                        }}
                      />
                    ) : (
                      <FormTextField
                        name="parental_consent"
                        control={control}
                        label="Parental Consent"
                        multiline
                        rows={4}
                        fullWidth
                      />
                    )}
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* Additional Information */}
            <Accordion
              expanded={expandedAccordions.includes('additional-info')}
              onChange={handleAccordionChange('additional-info')}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1" fontWeight="medium">
                  Additional Information
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12 }}>
                    <Controller
                      name="comments"
                      control={control}
                      render={({ field, fieldState }) => (
                        <Autocomplete
                          multiple
                          freeSolo
                          options={[]}
                          value={field.value || []}
                          onChange={(_event, newValue) => field.onChange(newValue)}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="Comments"
                              helperText={fieldState.error?.message || "Add comments (multi-choice or free text)"}
                              error={!!fieldState.error}
                              fullWidth
                            />
                          )}
                          renderTags={(value, getTagProps) =>
                            value.map((option, index) => (
                              <Chip
                                variant="outlined"
                                label={option}
                                {...getTagProps({ index })}
                                key={index}
                              />
                            ))
                          }
                        />
                      )}
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <FormTextField
                      name="data_retention_policy"
                      control={control}
                      label="Data Retention Policy Link"
                      helperText="Web link (URL) to data retention policy"
                      fullWidth
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <FormSelect
                      name="processing_frequency"
                      control={control}
                      label="Processing Frequency"
                      options={PROCESSING_FREQUENCY_OPTIONS.map(opt => ({ value: opt, label: opt }))}
                      fullWidth
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Controller
                      name="legal_jurisdiction"
                      control={control}
                      render={({ field, fieldState }) => (
                        <Autocomplete
                          multiple
                          options={LEGAL_JURISDICTION_OPTIONS}
                          value={field.value || []}
                          onChange={(_event, newValue) => field.onChange(newValue)}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="Legal Jurisdiction"
                              helperText={fieldState.error?.message || "Select applicable legal jurisdictions"}
                              error={!!fieldState.error}
                              fullWidth
                            />
                          )}
                          renderTags={(value, getTagProps) =>
                            value.map((option, index) => (
                              <Chip
                                variant="outlined"
                                label={option}
                                {...getTagProps({ index })}
                                key={index}
                              />
                            ))
                          }
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
          form="activity-form"
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

