/**
 * DataElement Form Dialog - Form for creating/editing data elements.
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
  Category as CategoryIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  AutoAwesome as AutoAwesomeIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { FormTextField } from '../../../components/common';
import FormFieldWithSuggestion from './FormFieldWithSuggestion';
import { useSuggestionJob } from '../hooks/useSuggestionJob';
import { dataElementFormSchema, type DataElementFormData } from '../schemas/dataElementSchema';
import { createDataElement, updateDataElement, type DataElement, type DataElementCreate, type DataElementUpdate } from '../services/ropaApi';
import { useNotification } from '../../../contexts';
import { handleApiErrors } from '../../../utils/formHelpers';

interface DataElementFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  tenantId: string;
  activityId: string;
  dataElement?: DataElement | null; // If provided, edit mode; otherwise, create mode
}

export default function DataElementFormDialog({
  open,
  onClose,
  onSuccess,
  tenantId,
  activityId,
  dataElement,
}: DataElementFormDialogProps) {
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

  const isEditMode = !!dataElement;

  // Fields that support AI suggestions
  const suggestionFields = React.useMemo(
    () => [
      { name: 'category', type: 'text', label: 'Data Category' },
      { name: 'safeguards', type: 'multiline', label: 'Safeguards' },
      { name: 'disposition_method', type: 'multiline', label: 'Disposition Method' },
      { name: 'data_minimization_justification', type: 'multiline', label: 'Data Minimization Justification' },
      { name: 'data_accuracy_requirements', type: 'multiline', label: 'Data Accuracy Requirements' },
    ],
    []
  );

  // Initialize suggestion job hook
  const suggestionJob = useSuggestionJob({
    tenantId,
    entityType: 'data_element',
    entityId: dataElement?.id || null,
    enabled: open && !!dataElement?.id,
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

  // Constants for option lists
  const DATA_ELEMENTS_OPTIONS = [
    'Name',
    'Email',
    'Phone',
    'Address',
    'Date of Birth',
    'National ID',
    'Passport Number',
    'Biometric Data',
    'Health Information',
    'IP Address',
    'Device ID',
  ];

  const SPECIAL_LAWFUL_BASIS_OPTIONS = [
    'Explicit Consent',
    'Employment Obligations',
    'Vital Interests',
    'Non-profit Activities',
    'Public Disclosure',
    'Preventive Medicine',
    'Medical Diagnosis',
    'Healthcare Provision',
    'Public Interest in Public Health',
    'Legal Claims',
    'Judicial Acts',
    'Not Applicable',
  ];

  const DATA_STORAGE_LOCATION_OPTIONS = [
    'On-premise',
    'Cloud',
    'Hybrid',
    'Local Device',
  ];

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<DataElementFormData>({
    resolver: zodResolver(dataElementFormSchema) as any,
    defaultValues: React.useMemo(() => {
      if (dataElement) {
        // Edit mode - populate with existing data
        return {
          category: dataElement.category || '',
          data_elements: dataElement.data_elements || [],
          special_lawful_basis: dataElement.special_lawful_basis || [],
          secondary_use: dataElement.secondary_use ?? false,
          encryption_in_transit: dataElement.encryption_in_transit ?? false,
          safeguards: dataElement.safeguards || '',
          retention_period_days: dataElement.retention_period_days || undefined,
          disposition_method: dataElement.disposition_method || '',
          comments: dataElement.comments || [],
          data_minimization_justification: dataElement.data_minimization_justification || '',
          data_accuracy_requirements: dataElement.data_accuracy_requirements || '',
          data_storage_location: dataElement.data_storage_location || [],
        };
      }
      // Create mode - default values
      return {
        category: '',
        data_elements: [],
        special_lawful_basis: [],
        secondary_use: false,
        encryption_in_transit: false,
        safeguards: '',
        retention_period_days: undefined,
        disposition_method: '',
        comments: [],
        data_minimization_justification: '',
        data_accuracy_requirements: '',
        data_storage_location: [],
      };
    }, [dataElement]),
  });

  // Expand accordions that contain validation errors
  React.useEffect(() => {
    if (Object.keys(errors).length > 0) {
      const accordionsToExpand = new Set<string>(expandedAccordions);
      
      // Map field names to accordion IDs
      const fieldToAccordion: Record<string, string> = {
        category: 'basic-info',
        data_elements: 'data-elements',
        special_lawful_basis: 'data-elements',
        secondary_use: 'data-elements',
        encryption_in_transit: 'data-elements',
        safeguards: 'data-protection',
        retention_period_days: 'data-retention',
        disposition_method: 'data-retention',
        comments: 'comments',
        data_minimization_justification: 'data-management',
        data_accuracy_requirements: 'data-management',
        data_storage_location: 'data-management',
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

  // Reset form when dataElement changes
  React.useEffect(() => {
    if (dataElement) {
      reset({
        category: dataElement.category || '',
        data_elements: dataElement.data_elements || [],
        special_lawful_basis: dataElement.special_lawful_basis || [],
        secondary_use: dataElement.secondary_use ?? false,
        encryption_in_transit: dataElement.encryption_in_transit ?? false,
        safeguards: dataElement.safeguards || '',
        retention_period_days: dataElement.retention_period_days || undefined,
        disposition_method: dataElement.disposition_method || '',
        comments: dataElement.comments || [],
        data_minimization_justification: dataElement.data_minimization_justification || '',
        data_accuracy_requirements: dataElement.data_accuracy_requirements || '',
        data_storage_location: dataElement.data_storage_location || [],
      }, { keepDefaultValues: false });
    } else {
      reset({
        category: '',
        data_elements: [],
        special_lawful_basis: [],
        secondary_use: false,
        encryption_in_transit: false,
        safeguards: '',
        retention_period_days: undefined,
        disposition_method: '',
        comments: [],
        data_minimization_justification: '',
        data_accuracy_requirements: '',
        data_storage_location: [],
      }, { keepDefaultValues: false });
    }
  }, [dataElement?.id, reset]);

  // Restore suggestion jobs when dialog opens (if editing existing data element)
  const restoreJobsRef = React.useRef<(() => Promise<void>) | null>(null);
  restoreJobsRef.current = suggestionJob.restoreJobs;
  
  React.useEffect(() => {
    if (open && dataElement?.id && restoreJobsRef.current) {
      // Small delay to ensure hook is ready
      const timer = setTimeout(() => {
        restoreJobsRef.current?.();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [open, dataElement?.id]);

  const handleAccordionChange = (panel: string) => (_event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedAccordions((prev) =>
      isExpanded ? [...prev, panel] : prev.filter((p) => p !== panel)
    );
  };

  const onSubmit = async (data: DataElementFormData) => {
    try {
      setIsSubmitting(true);

      // Helper to build the data object
      const buildDataElementData = (): DataElementCreate | DataElementUpdate => {
        const baseData: any = {};

        // Add optional string fields only if they have values
        if (data.category?.trim()) baseData.category = data.category.trim();
        if (data.safeguards?.trim()) baseData.safeguards = data.safeguards.trim();
        if (data.disposition_method?.trim()) baseData.disposition_method = data.disposition_method.trim();
        if (data.data_minimization_justification?.trim()) baseData.data_minimization_justification = data.data_minimization_justification.trim();
        if (data.data_accuracy_requirements?.trim()) baseData.data_accuracy_requirements = data.data_accuracy_requirements.trim();

        // Add optional number fields only if they have values
        if (data.retention_period_days !== undefined && data.retention_period_days !== null) {
          baseData.retention_period_days = data.retention_period_days;
        }

        // Add array fields only if they have values
        if (data.data_elements && data.data_elements.length > 0) baseData.data_elements = data.data_elements;
        if (data.special_lawful_basis && data.special_lawful_basis.length > 0) baseData.special_lawful_basis = data.special_lawful_basis;
        if (data.comments && data.comments.length > 0) baseData.comments = data.comments;
        if (data.data_storage_location && data.data_storage_location.length > 0) baseData.data_storage_location = data.data_storage_location;

        // Boolean fields - ALWAYS include (even if false) for updates
        baseData.secondary_use = data.secondary_use ?? false;
        baseData.encryption_in_transit = data.encryption_in_transit ?? false;

        if (isEditMode) {
          return baseData as DataElementUpdate;
        } else {
          return { ...baseData, processing_activity_id: activityId } as DataElementCreate;
        }
      };

      if (isEditMode && dataElement) {
        await updateDataElement(tenantId, dataElement.id, buildDataElementData() as DataElementUpdate);
        showSuccess(`Data Element updated successfully`);
      } else {
        await createDataElement(tenantId, activityId, buildDataElementData() as DataElementCreate);
        showSuccess(`Data Element created successfully`);
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
      // The form will be reset when dataElement changes or when dialog reopens
      onClose();
    }
  };

  const handleSuggestAll = React.useCallback(async () => {
    if (!dataElement?.id || isSuggestingAll) return;

    setIsSuggestingAll(true);
    try {
      const formData = watch();
      await suggestionJob.suggestAll(suggestionFields, formData);
    } catch (err) {
      // Error already shown by hook
    } finally {
      setIsSuggestingAll(false);
    }
  }, [dataElement?.id, isSuggestingAll, suggestionJob, suggestionFields, watch]);

  const handleAcceptAll = React.useCallback(() => {
    const allSuggestions = suggestionJob.getAllActiveSuggestions();
    if (allSuggestions.size === 0) return;

    let acceptedCount = 0;
    allSuggestions.forEach((jobStatus, fieldName) => {
      if (jobStatus.suggestions && jobStatus.suggestions.length > 0) {
        const suggestion = jobStatus.suggestions;
        // Fields that join with newlines
        const joinFields = ['safeguards', 'disposition_method', 'data_minimization_justification', 'data_accuracy_requirements'];
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
            <CategoryIcon />
            <Typography variant="h6">
              {isEditMode ? 'Edit Data Element' : 'Create Data Element'}
            </Typography>
          </Box>
          {isEditMode && dataElement?.id && (
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
        <form id="data-element-form" onSubmit={handleSubmit(onSubmit)} noValidate>
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
                    <FormFieldWithSuggestion
                      name="category"
                      control={control}
                      label="Data Category"
                      fieldType="text"
                      jobStatus={suggestionJob.getJobStatus('category')}
                      onSuggest={() => {
                        const formData = watch();
                        handleSuggestField('category', 'text', 'Data Category', formData.category || '', formData);
                      }}
                      onAccept={(suggestion) => {
                        const value = Array.isArray(suggestion) ? suggestion[0] : suggestion;
                        setValue('category', value, { shouldValidate: false, shouldTouch: true });
                        suggestionJob.clearJobStatus('category');
                      }}
                      onDismiss={() => suggestionJob.clearJobStatus('category')}
                      isSuggesting={isFieldSuggesting('category')}
                      fullWidth
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* Data Elements */}
            <Accordion
              expanded={expandedAccordions.includes('data-elements')}
              onChange={handleAccordionChange('data-elements')}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1" fontWeight="medium">
                  Data Elements
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12 }}>
                    <Controller
                      name="data_elements"
                      control={control}
                      render={({ field, fieldState }) => (
                        <Autocomplete
                          multiple
                          freeSolo
                          options={DATA_ELEMENTS_OPTIONS}
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
                              label="Data Elements"
                              placeholder="Select or type data element types"
                              helperText={fieldState.error?.message || "Select from options or type custom values"}
                              error={!!fieldState.error}
                              fullWidth
                            />
                          )}
                        />
                      )}
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Controller
                      name="special_lawful_basis"
                      control={control}
                      render={({ field, fieldState }) => (
                        <Autocomplete
                          multiple
                          freeSolo
                          options={SPECIAL_LAWFUL_BASIS_OPTIONS}
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
                              label="Special Lawful Basis"
                              placeholder="Select or type special lawful basis"
                              helperText={fieldState.error?.message || "Select from options or type custom values"}
                              error={!!fieldState.error}
                              fullWidth
                            />
                          )}
                        />
                      )}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Controller
                      name="secondary_use"
                      control={control}
                      render={({ field }) => (
                        <FormControlLabel
                          control={
                            <Switch
                              checked={field.value ?? false}
                              onChange={field.onChange}
                            />
                          }
                          label="Secondary Use"
                        />
                      )}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Controller
                      name="encryption_in_transit"
                      control={control}
                      render={({ field }) => (
                        <FormControlLabel
                          control={
                            <Switch
                              checked={field.value ?? false}
                              onChange={field.onChange}
                            />
                          }
                          label="Encryption in Transit"
                        />
                      )}
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* Data Protection */}
            <Accordion
              expanded={expandedAccordions.includes('data-protection')}
              onChange={handleAccordionChange('data-protection')}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1" fontWeight="medium">
                  Data Protection & Management
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12 }}>
                    <FormFieldWithSuggestion
                      name="safeguards"
                      control={control}
                      label="Safeguards"
                      fieldType="multiline"
                      textFieldProps={{ multiline: true, rows: 3 }}
                      jobStatus={suggestionJob.getJobStatus('safeguards')}
                      onSuggest={() => {
                        const formData = watch();
                        handleSuggestField('safeguards', 'multiline', 'Safeguards', formData.safeguards || '', formData);
                      }}
                      onAccept={(suggestion) => {
                        const value = Array.isArray(suggestion) ? suggestion.join('\n\n') : suggestion;
                        setValue('safeguards', value, { shouldValidate: false, shouldTouch: true });
                        suggestionJob.clearJobStatus('safeguards');
                      }}
                      onDismiss={() => suggestionJob.clearJobStatus('safeguards')}
                      isSuggesting={isFieldSuggesting('safeguards')}
                      fullWidth
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* Data Retention & Disposition */}
            <Accordion
              expanded={expandedAccordions.includes('data-retention')}
              onChange={handleAccordionChange('data-retention')}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1" fontWeight="medium">
                  Data Retention & Disposition
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormTextField
                      name="retention_period_days"
                      control={control}
                      label="Retention Period (Days)"
                      type="number"
                      fullWidth
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <FormFieldWithSuggestion
                      name="disposition_method"
                      control={control}
                      label="Disposition Method"
                      fieldType="multiline"
                      textFieldProps={{ multiline: true, rows: 3 }}
                      jobStatus={suggestionJob.getJobStatus('disposition_method')}
                      onSuggest={() => {
                        const formData = watch();
                        handleSuggestField('disposition_method', 'multiline', 'Disposition Method', formData.disposition_method || '', formData);
                      }}
                      onAccept={(suggestion) => {
                        const value = Array.isArray(suggestion) ? suggestion.join('\n\n') : suggestion;
                        setValue('disposition_method', value, { shouldValidate: false, shouldTouch: true });
                        suggestionJob.clearJobStatus('disposition_method');
                      }}
                      onDismiss={() => suggestionJob.clearJobStatus('disposition_method')}
                      isSuggesting={isFieldSuggesting('disposition_method')}
                      fullWidth
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* Data Management */}
            <Accordion
              expanded={expandedAccordions.includes('data-management')}
              onChange={handleAccordionChange('data-management')}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1" fontWeight="medium">
                  Data Management
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12 }}>
                    <FormFieldWithSuggestion
                      name="data_minimization_justification"
                      control={control}
                      label="Data Minimization Justification"
                      fieldType="multiline"
                      textFieldProps={{ multiline: true, rows: 3 }}
                      jobStatus={suggestionJob.getJobStatus('data_minimization_justification')}
                      onSuggest={() => {
                        const formData = watch();
                        handleSuggestField('data_minimization_justification', 'multiline', 'Data Minimization Justification', formData.data_minimization_justification || '', formData);
                      }}
                      onAccept={(suggestion) => {
                        const value = Array.isArray(suggestion) ? suggestion.join('\n\n') : suggestion;
                        setValue('data_minimization_justification', value, { shouldValidate: false, shouldTouch: true });
                        suggestionJob.clearJobStatus('data_minimization_justification');
                      }}
                      onDismiss={() => suggestionJob.clearJobStatus('data_minimization_justification')}
                      isSuggesting={isFieldSuggesting('data_minimization_justification')}
                      fullWidth
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <FormFieldWithSuggestion
                      name="data_accuracy_requirements"
                      control={control}
                      label="Data Accuracy Requirements"
                      fieldType="multiline"
                      textFieldProps={{ multiline: true, rows: 3 }}
                      jobStatus={suggestionJob.getJobStatus('data_accuracy_requirements')}
                      onSuggest={() => {
                        const formData = watch();
                        handleSuggestField('data_accuracy_requirements', 'multiline', 'Data Accuracy Requirements', formData.data_accuracy_requirements || '', formData);
                      }}
                      onAccept={(suggestion) => {
                        const value = Array.isArray(suggestion) ? suggestion.join('\n\n') : suggestion;
                        setValue('data_accuracy_requirements', value, { shouldValidate: false, shouldTouch: true });
                        suggestionJob.clearJobStatus('data_accuracy_requirements');
                      }}
                      onDismiss={() => suggestionJob.clearJobStatus('data_accuracy_requirements')}
                      isSuggesting={isFieldSuggesting('data_accuracy_requirements')}
                      fullWidth
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Controller
                      name="data_storage_location"
                      control={control}
                      render={({ field, fieldState }) => (
                        <Autocomplete
                          multiple
                          freeSolo
                          options={DATA_STORAGE_LOCATION_OPTIONS}
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
                              label="Data Storage Location"
                              placeholder="Select or type storage locations"
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

            {/* Comments */}
            <Accordion
              expanded={expandedAccordions.includes('comments')}
              onChange={handleAccordionChange('comments')}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1" fontWeight="medium">
                  Comments
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
          form="data-element-form"
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
