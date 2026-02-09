/**
 * Repository Form Dialog - Full form for creating/editing repositories.
 * 
 * Uses Accordion-based layout for organizing ~45 fields into logical sections.
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
  Alert,
  CircularProgress,
  useTheme,
  useMediaQuery,
  FormControlLabel,
  Switch,
  Chip,
  TextField,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Storage as StorageIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  AutoAwesome as AutoAwesomeIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { Autocomplete } from '@mui/material';
import { FormTextField, FormSelect } from '../../../components/common';
import { repositoryFormSchema, type RepositoryFormData } from '../schemas/repositorySchema';
import { 
  createRepository, 
  updateRepository, 
  type Repository, 
  type RepositoryCreate, 
  type RepositoryUpdate,
  fetchDepartments,
  fetchLocations,
  fetchSystems,
  type Department,
  type Location,
  type System,
} from '../services/ropaApi';
import { useNotification } from '../../../contexts';
import { handleApiErrors } from '../../../utils/formHelpers';
import { useSuggestionJob } from '../hooks/useSuggestionJob';
import FormFieldWithSuggestion from './FormFieldWithSuggestion';

interface RepositoryFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  tenantId: string;
  repository?: Repository | null; // If provided, edit mode; otherwise, create mode
}

// Enum options
const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
  { value: 'decommissioned', label: 'Decommissioned' },
  { value: 'maintenance', label: 'Maintenance' },
];

const DATA_FORMAT_OPTIONS = [
  { value: 'Electronic', label: 'Electronic' },
  { value: 'Physical', label: 'Physical' },
];

const TRANSFER_MECHANISM_OPTIONS = [
  { value: 'Adequacy', label: 'Adequacy' },
  { value: 'Privacy Shield', label: 'Privacy Shield' },
  { value: 'BCR', label: 'BCR' },
  { value: 'Contract', label: 'Contract' },
  { value: 'Derogation', label: 'Derogation' },
];

const DEROGATION_TYPE_OPTIONS = [
  { value: 'Legal claims', label: 'Legal claims' },
  { value: 'Vital interests', label: 'Vital interests' },
  { value: 'Public info', label: 'Public info' },
  { value: 'Sporadic', label: 'Sporadic' },
  { value: 'N/A', label: 'N/A' },
];

const CROSS_BORDER_SAFEGUARDS_OPTIONS = [
  { value: 'Binding contract', label: 'Binding contract' },
  { value: 'DPA clauses', label: 'DPA clauses' },
  { value: 'BCRs', label: 'BCRs' },
  { value: 'Code of conduct', label: 'Code of conduct' },
  { value: 'Cert', label: 'Cert' },
  { value: 'N/A', label: 'N/A' },
];

const CERTIFICATION_OPTIONS = [
  { value: 'ISO-27001', label: 'ISO-27001' },
  { value: 'NIST', label: 'NIST' },
  { value: 'SOC', label: 'SOC' },
  { value: 'Trustee', label: 'Trustee' },
  { value: 'N/A', label: 'N/A' },
];

const INTERFACE_TYPE_OPTIONS = [
  { value: 'Internal', label: 'Internal' },
  { value: 'External', label: 'External' },
];


export default function RepositoryFormDialog({
  open,
  onClose,
  onSuccess,
  tenantId,
  repository,
}: RepositoryFormDialogProps) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));
  const { showSuccess, showError } = useNotification();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSuggestingAll, setIsSuggestingAll] = React.useState(false);
  const [expandedAccordions, setExpandedAccordions] = React.useState<string[]>(['basic-info', 'geographic-cross-border']);
  // Track fields that are currently being suggested (for immediate loading state)
  const [suggestingFields, setSuggestingFields] = React.useState<Set<string>>(new Set());
  // Track Accept All count to avoid stale closures
  const [acceptAllCount, setAcceptAllCount] = React.useState(0);

  const isEditMode = !!repository;

  // Fetch lookup table data
  const [departments, setDepartments] = React.useState<Department[]>([]);
  const [locations, setLocations] = React.useState<Location[]>([]);
  const [systems, setSystems] = React.useState<System[]>([]);
  const [isLoadingLookups, setIsLoadingLookups] = React.useState(false);
  const regionLocations = React.useMemo(
    () => locations.filter((location) => location.type === 'region'),
    [locations]
  );
  const countryLocations = React.useMemo(
    () => locations.filter((location) => location.type === 'country'),
    [locations]
  );

  React.useEffect(() => {
    if (open) {
      setIsLoadingLookups(true);
      Promise.all([
        fetchDepartments(tenantId).catch(() => []),
        fetchLocations(tenantId).catch(() => []),
        fetchSystems(tenantId).catch(() => []),
      ]).then(([depts, locs, syss]) => {
        setDepartments(depts);
        setLocations(locs);
        setSystems(syss);
        setIsLoadingLookups(false);
      });
    }
  }, [open, tenantId]);

  // Fields that support AI suggestions (text fields and select fields)
  // Note: comments is an array field without FormFieldWithSuggestion, so it's not included here
  // Array fields are handled in handleAcceptAll but don't have individual suggestion UI
  const suggestionFields = React.useMemo(
    () => [
      { name: 'data_repository_name', type: 'text', label: 'Name' },
      { name: 'data_repository_description', type: 'text', label: 'Description' },
      { name: 'external_vendor', type: 'text', label: 'Vendor' },
      { name: 'dpa_url', type: 'text', label: 'Data Processing Agreement' },
      // Select fields
      { name: 'status', type: 'select', label: 'Status' },
    ],
    []
  );
  
  // Map of field names to their available options (for select fields)
  const fieldOptionsMap = React.useMemo(
    () => ({
      status: STATUS_OPTIONS.map(opt => opt.value),
      data_format: DATA_FORMAT_OPTIONS.map(opt => opt.value),
      transfer_mechanism: TRANSFER_MECHANISM_OPTIONS.map(opt => opt.value),
      derogation_type: DEROGATION_TYPE_OPTIONS.map(opt => opt.value),
      cross_border_safeguards: CROSS_BORDER_SAFEGUARDS_OPTIONS.map(opt => opt.value),
      certification: CERTIFICATION_OPTIONS.map(opt => opt.value),
      interface_type: INTERFACE_TYPE_OPTIONS.map(opt => opt.value),
    }),
    []
  );

  // Initialize suggestion job hook
  const suggestionJob = useSuggestionJob({
    tenantId,
    entityType: 'repository',
    entityId: repository?.id || null,
    enabled: open && !!repository?.id, // Only enable when dialog is open and we have a repository
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
    formData: Record<string, any>,
    fieldOptions?: string[]
  ) => {
    // Set loading state immediately
    setSuggestingFields(prev => new Set(prev).add(fieldName));
    try {
      await suggestionJob.createJob(
        fieldName,
        fieldType,
        fieldLabel,
        currentValue,
        formData,
        fieldOptions
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

  // Memoize job statuses for each field (ensures React tracks state changes properly)
  // Using jobStatusesVersion to trigger re-computation when jobStatuses changes
  const dataRepositoryNameJobStatus = React.useMemo(
    () => suggestionJob.getJobStatus('data_repository_name'),
    [suggestionJob, suggestionJob.jobStatusesVersion]
  );
  const dataRepositoryDescriptionJobStatus = React.useMemo(
    () => suggestionJob.getJobStatus('data_repository_description'),
    [suggestionJob, suggestionJob.jobStatusesVersion]
  );
  const externalVendorJobStatus = React.useMemo(
    () => suggestionJob.getJobStatus('external_vendor'),
    [suggestionJob, suggestionJob.jobStatusesVersion]
  );
  const dpaUrlJobStatus = React.useMemo(
    () => suggestionJob.getJobStatus('dpa_url'),
    [suggestionJob, suggestionJob.jobStatusesVersion]
  );
  // Select field job statuses
  const statusJobStatus = React.useMemo(
    () => suggestionJob.getJobStatus('status'),
    [suggestionJob, suggestionJob.jobStatusesVersion]
  );

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<RepositoryFormData>({
    resolver: zodResolver(repositoryFormSchema) as any,
    defaultValues: React.useMemo(() => {
      if (repository) {
        // Edit mode - populate with existing data
        return {
          data_repository_name: repository.data_repository_name,
          data_repository_description: repository.data_repository_description || '',
          external_vendor: repository.external_vendor || '',
          business_owner: repository.business_owner || null,
          data_format: repository.data_format,
          geographical_location_ids: repository.geographical_location_ids || [],
          access_location_ids: repository.access_location_ids || [],
          transfer_mechanism: repository.transfer_mechanism,
          derogation_type: repository.derogation_type,
          cross_border_safeguards: repository.cross_border_safeguards,
          cross_border_transfer_detail: repository.cross_border_transfer_detail || '',
          gdpr_compliant: repository.gdpr_compliant || false,
          dpa_url: repository.dpa_url || '',
          dpa_file: repository.dpa_file || '',
          vendor_gdpr_compliance: repository.vendor_gdpr_compliance,
          certification: repository.certification,
          record_count: repository.record_count ?? null,
          system_interfaces: repository.system_interfaces || [],
          interface_type: repository.interface_type,
          interface_location_ids: repository.interface_location_ids || [],
          data_recipients: repository.data_recipients || '',
          sub_processors: repository.sub_processors || '',
          status: repository.status || 'active',
          comments: repository.comments || [],
        };
      }
      // Create mode - default values
      return {
        data_repository_name: '',
        data_repository_description: '',
        external_vendor: '',
        business_owner: null,
        data_format: undefined,
        geographical_location_ids: [],
        access_location_ids: [],
        transfer_mechanism: undefined,
        derogation_type: undefined,
        cross_border_safeguards: undefined,
        cross_border_transfer_detail: '',
        gdpr_compliant: false,
        dpa_url: '',
        dpa_file: '',
        vendor_gdpr_compliance: undefined,
        certification: undefined,
        record_count: null,
        system_interfaces: [],
        interface_type: undefined,
        interface_location_ids: [],
        data_recipients: '',
        sub_processors: '',
        status: 'active',
        comments: [],
      };
    }, [repository?.id]),
  });


  // Expand accordions that contain validation errors
  React.useEffect(() => {
    if (Object.keys(errors).length > 0) {
      const accordionsToExpand = new Set<string>(expandedAccordions);
      
      // Map field names to accordion IDs
      const fieldToAccordion: Record<string, string> = {
        data_repository_name: 'basic-info',
        data_repository_description: 'basic-info',
        external_vendor: 'basic-info',
        business_owner: 'basic-info',
        data_format: 'basic-info',
        status: 'basic-info',
        geographical_location_ids: 'geographic-cross-border',
        access_location_ids: 'geographic-cross-border',
        transfer_mechanism: 'geographic-cross-border',
        derogation_type: 'geographic-cross-border',
        cross_border_safeguards: 'geographic-cross-border',
        cross_border_transfer_detail: 'geographic-cross-border',
        gdpr_compliant: 'compliance',
        dpa_url: 'compliance',
        dpa_file: 'compliance',
        vendor_gdpr_compliance: 'compliance',
        certification: 'compliance',
        record_count: 'interfaces',
        system_interfaces: 'interfaces',
        interface_type: 'interfaces',
        interface_location_ids: 'interfaces',
        data_recipients: 'recipients',
        sub_processors: 'recipients',
        comments: 'metadata',
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

  // Reset form when repository changes (using repository.id to detect changes)
  React.useEffect(() => {
    if (repository) {
      reset({
        data_repository_name: repository.data_repository_name,
        data_repository_description: repository.data_repository_description || '',
        external_vendor: repository.external_vendor || '',
        business_owner: repository.business_owner || null,
        data_format: repository.data_format,
        geographical_location_ids: repository.geographical_location_ids || [],
        access_location_ids: repository.access_location_ids || [],
        transfer_mechanism: repository.transfer_mechanism,
        derogation_type: repository.derogation_type,
        cross_border_safeguards: repository.cross_border_safeguards,
        cross_border_transfer_detail: repository.cross_border_transfer_detail || '',
        gdpr_compliant: repository.gdpr_compliant || false,
        dpa_url: repository.dpa_url || '',
        dpa_file: repository.dpa_file || '',
        vendor_gdpr_compliance: repository.vendor_gdpr_compliance,
        certification: repository.certification,
        record_count: repository.record_count ?? null,
        system_interfaces: repository.system_interfaces || [],
        interface_type: repository.interface_type,
        interface_location_ids: repository.interface_location_ids || [],
        data_recipients: repository.data_recipients || '',
        sub_processors: repository.sub_processors || '',
        status: repository.status || 'active',
        comments: repository.comments || [],
      });
    } else {
      reset({
        data_repository_name: '',
        data_repository_description: '',
        external_vendor: '',
        business_owner: null,
        data_format: undefined,
        geographical_location_ids: [],
        access_location_ids: [],
        transfer_mechanism: undefined,
        derogation_type: undefined,
        cross_border_safeguards: undefined,
        cross_border_transfer_detail: '',
        gdpr_compliant: false,
        dpa_url: '',
        dpa_file: '',
        vendor_gdpr_compliance: undefined,
        certification: undefined,
        record_count: null,
        system_interfaces: [],
        interface_type: undefined,
        interface_location_ids: [],
        data_recipients: '',
        sub_processors: '',
        status: 'active',
        comments: [],
      });
    }
  }, [repository?.id, reset]);

  // Restore suggestion jobs when dialog opens (if editing existing repository)
  // Use restoreJobs directly (it's memoized) and only depend on open/repository.id
  // This prevents re-triggering when suggestionJob object reference changes
  const restoreJobsRef = React.useRef<(() => Promise<void>) | null>(null);
  restoreJobsRef.current = suggestionJob.restoreJobs;
  
  React.useEffect(() => {
    if (open && repository?.id && restoreJobsRef.current) {
      // Small delay to ensure hook is ready
      const timer = setTimeout(() => {
        restoreJobsRef.current?.();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [open, repository?.id]); // Only trigger when dialog opens or entity changes - removed isRestoring and jobStatusesVersion (they are OUTPUTS, not inputs)

  const handleAccordionChange = (panel: string) => (_event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedAccordions((prev) =>
      isExpanded ? [...prev, panel] : prev.filter((p) => p !== panel)
    );
  };


  const onSubmit = async (data: RepositoryFormData) => {
    try {
      setIsSubmitting(true);

      // Helper to build the data object with all fields explicitly included
      // For updates, we need to send ALL fields that have values (including false booleans)
      // Only exclude undefined/null values
      const buildRepositoryData = (): RepositoryCreate | RepositoryUpdate => {
        const baseData: any = {};
        
        // For updates, only include name/status if they have valid values (not empty)
        // For creates, always include them (required fields)
        if (isEditMode) {
          // UPDATE: Only include if they have valid values
          const trimmedName = data.data_repository_name?.trim();
          if (trimmedName) {
            baseData.data_repository_name = trimmedName;
          }
          if (data.status) {
            baseData.status = data.status;
          }
        } else {
          // CREATE: Always include required fields
          baseData.data_repository_name = data.data_repository_name.trim();
          baseData.status = data.status || 'active';
        }

        // Add optional string fields only if they have values
        if (data.data_repository_description?.trim()) baseData.data_repository_description = data.data_repository_description.trim();
        if (data.external_vendor?.trim()) baseData.external_vendor = data.external_vendor.trim();
        if (data.dpa_url?.trim()) baseData.dpa_url = data.dpa_url.trim();
        if (data.dpa_file?.trim()) baseData.dpa_file = data.dpa_file.trim();
        if (data.cross_border_transfer_detail?.trim()) baseData.cross_border_transfer_detail = data.cross_border_transfer_detail.trim();
        if (data.data_recipients?.trim()) baseData.data_recipients = data.data_recipients.trim();
        if (data.sub_processors?.trim()) baseData.sub_processors = data.sub_processors.trim();

        // UUID fields
        if (data.business_owner) baseData.business_owner = data.business_owner;

        // Enum fields
        if (data.data_format) baseData.data_format = data.data_format;
        if (data.transfer_mechanism) baseData.transfer_mechanism = data.transfer_mechanism;
        if (data.derogation_type) baseData.derogation_type = data.derogation_type;
        if (data.cross_border_safeguards) baseData.cross_border_safeguards = data.cross_border_safeguards;
        if (data.certification) baseData.certification = data.certification;
        if (data.interface_type) baseData.interface_type = data.interface_type;

        // Boolean fields - include if defined
        baseData.gdpr_compliant = data.gdpr_compliant ?? false;
        if (data.vendor_gdpr_compliance !== undefined) baseData.vendor_gdpr_compliance = data.vendor_gdpr_compliance;

        // Integer fields
        if (data.record_count !== null && data.record_count !== undefined) baseData.record_count = data.record_count;

        // Array fields - include if they have values
        if (data.geographical_location_ids && data.geographical_location_ids.length > 0) {
          baseData.geographical_location_ids = data.geographical_location_ids;
        }
        if (data.access_location_ids && data.access_location_ids.length > 0) {
          baseData.access_location_ids = data.access_location_ids;
        }
        if (data.system_interfaces && data.system_interfaces.length > 0) {
          baseData.system_interfaces = data.system_interfaces;
        }
        if (data.interface_location_ids && data.interface_location_ids.length > 0) {
          baseData.interface_location_ids = data.interface_location_ids;
        }
        if (data.comments && data.comments.length > 0) {
          baseData.comments = data.comments;
        }

        return baseData as RepositoryCreate | RepositoryUpdate;
      };

      const apiData = buildRepositoryData();

      if (isEditMode && repository) {
        await updateRepository(tenantId, repository.id, apiData as RepositoryUpdate);
        showSuccess('Repository updated successfully!');
      } else {
        await createRepository(tenantId, apiData as RepositoryCreate);
        showSuccess('Repository created successfully!');
      }

      onSuccess();
      onClose();
    } catch (err) {
      handleApiErrors(err, setError, (errorMessage) => showError(errorMessage));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  const handleSuggestAll = React.useCallback(async () => {
    if (!repository?.id || isSuggestingAll) {
      return;
    }

    setIsSuggestingAll(true);
    try {
      const formData = watch();
      await suggestionJob.suggestAll(suggestionFields, formData, fieldOptionsMap);
    } catch (err) {
      // Error already shown by hook
    } finally {
      setIsSuggestingAll(false);
    }
  }, [repository?.id, isSuggestingAll, suggestionJob, suggestionFields, fieldOptionsMap, watch]);

  const handleAcceptAll = React.useCallback(() => {
    const allSuggestions = suggestionJob.getAllActiveSuggestions();
    if (allSuggestions.size === 0) {
      return;
    }

    let acceptedCount = 0;
    allSuggestions.forEach((jobStatus, fieldName) => {
      if (jobStatus.suggestions && jobStatus.suggestions.length > 0) {
        const suggestion = jobStatus.suggestions;
        
        // Array fields (Autocomplete multiple): must be arrays
        const arrayFields = [
          'geographical_location_ids',
          'access_location_ids',
          'system_interfaces',
          'interface_location_ids',
          'comments',
        ];
        if (arrayFields.includes(fieldName)) {
          // For array fields, ensure we set an array
          const value = Array.isArray(suggestion) ? suggestion : [suggestion].filter(Boolean);
          setValue(fieldName as any, value, { shouldValidate: false, shouldTouch: true });
        }
        // Select fields: take first suggestion (single value)
        else if (fieldName === 'status') {
          const value = Array.isArray(suggestion) ? suggestion[0] : suggestion;
          if (typeof value === 'string') {
            setValue(fieldName as any, value, { shouldValidate: false, shouldTouch: true });
          }
        } else {
          // Fields that join with newlines
          const newlineFields = ['data_repository_description'];
          // Fields that join with comma and space
          const commaFields = ['data_repository_name', 'external_vendor', 'dpa_url'];
          
          let value: string;
          if (newlineFields.includes(fieldName)) {
            value = Array.isArray(suggestion) ? suggestion.join('\n\n') : suggestion;
          } else if (commaFields.includes(fieldName)) {
            value = Array.isArray(suggestion) ? suggestion.join(', ') : suggestion;
          } else {
            // Other fields: take first suggestion
            value = Array.isArray(suggestion) ? suggestion[0] : suggestion;
          }
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
  }, [suggestionJob, setValue, watch, showSuccess]);

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
      fullScreen={fullScreen}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { height: fullScreen ? '100%' : '90vh' },
      }}
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center" gap={2}>
            <StorageIcon color="primary" />
            <Typography variant="h6">
              {isEditMode ? 'Edit Repository' : 'Create New Repository'}
            </Typography>
          </Box>
          {isEditMode && repository?.id && (
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
        <form 
          id="repository-form" 
          onSubmit={handleSubmit(onSubmit)}
          noValidate
        >
          {(() => {
            // Only show alert if there are top-level field errors with messages
            // This excludes nested array errors that might not be visible
            const visibleErrors = Object.keys(errors).filter(
              (key) => errors[key as keyof typeof errors]?.message
            );
            return visibleErrors.length > 0 ? (
              <Alert severity="error" sx={{ mb: 2 }}>
                Please fix the errors below before submitting.
              </Alert>
            ) : null;
          })()}

          <Stack spacing={0}>
            {/* Basic Information */}
            <Accordion
              expanded={expandedAccordions.includes('basic-info')}
              onChange={handleAccordionChange('basic-info')}
              defaultExpanded
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1" fontWeight="medium">
                  Basic Information
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12 }}>
                    {isEditMode && repository?.id ? (
                      <FormFieldWithSuggestion
                        name="data_repository_name"
                        control={control}
                        label="Repository Name"
                        fieldType="text"
                        required
                        jobStatus={dataRepositoryNameJobStatus}
                        isSuggesting={isFieldSuggesting('data_repository_name')}
                        isRestoring={suggestionJob.isRestoring}
                        onSuggest={async () => {
                          const formData = watch();
                          await handleSuggestField(
                            'data_repository_name',
                            'text',
                            'Repository Name',
                            formData.data_repository_name || '',
                            formData
                          );
                        }}
                        onAccept={(suggestion) => {
                          if (Array.isArray(suggestion)) {
                            // Accept All - join multiple suggestions with comma and space
                            const joined = suggestion.join(', ');
                            setValue('data_repository_name', joined, { shouldValidate: true });
                          } else if (typeof suggestion === 'string') {
                            setValue('data_repository_name', suggestion, { shouldValidate: true });
                          }
                        }}
                        onDismiss={() => {
                          suggestionJob.clearJobStatus('data_repository_name');
                        }}
                      />
                    ) : (
                      <FormTextField
                        name="data_repository_name"
                        control={control}
                        label="Repository Name"
                        required
                      />
                    )}
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    {isEditMode && repository?.id ? (
                      <FormFieldWithSuggestion
                        name="data_repository_description"
                        control={control}
                        label="Description"
                        fieldType="textarea"
                        jobStatus={dataRepositoryDescriptionJobStatus}
                        isSuggesting={isFieldSuggesting('data_repository_description')}
                        isRestoring={suggestionJob.isRestoring}
                        onSuggest={async () => {
                          const formData = watch();
                          await handleSuggestField(
                            'data_repository_description',
                            'textarea',
                            'Description',
                            formData.data_repository_description || '',
                            formData
                          );
                        }}
                        onAccept={(suggestion) => {
                          if (Array.isArray(suggestion)) {
                            // Accept All - join multiple suggestions with newlines
                            const joined = suggestion.join('\n\n');
                            setValue('data_repository_description', joined, { shouldValidate: true });
                          } else if (typeof suggestion === 'string') {
                            setValue('data_repository_description', suggestion, { shouldValidate: true });
                          }
                        }}
                        onDismiss={() => {
                          suggestionJob.clearJobStatus('data_repository_description');
                        }}
                      />
                    ) : (
                      <FormTextField
                        name="data_repository_description"
                        control={control}
                        label="Description"
                        multiline
                        rows={3}
                      />
                    )}
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    {isEditMode && repository?.id ? (
                      <FormFieldWithSuggestion
                        name="external_vendor"
                        control={control}
                        label="Vendor/Provider"
                        fieldType="text"
                        jobStatus={externalVendorJobStatus}
                        isSuggesting={isFieldSuggesting('external_vendor')}
                        isRestoring={suggestionJob.isRestoring}
                        onSuggest={async () => {
                          const formData = watch();
                          await handleSuggestField(
                            'external_vendor',
                            'text',
                            'Vendor/Provider',
                            formData.external_vendor || '',
                            formData
                          );
                        }}
                        onAccept={(suggestion) => {
                          if (Array.isArray(suggestion)) {
                            // Accept All - join multiple suggestions with comma and space
                            const joined = suggestion.join(', ');
                            setValue('external_vendor', joined, { shouldValidate: true });
                          } else if (typeof suggestion === 'string') {
                            setValue('external_vendor', suggestion, { shouldValidate: true });
                          }
                        }}
                        onDismiss={() => {
                          suggestionJob.clearJobStatus('external_vendor');
                        }}
                        textFieldProps={{ helperText: 'e.g., AWS, PostgreSQL, Microsoft Azure' }}
                      />
                    ) : (
                      <FormTextField
                        name="external_vendor"
                        control={control}
                        label="Vendor/Provider"
                        helperText="e.g., AWS, PostgreSQL, Microsoft Azure"
                      />
                    )}
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormSelect
                      name="data_format"
                      control={control}
                      label="Data Format"
                      options={DATA_FORMAT_OPTIONS}
                      required
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Controller
                      name="business_owner"
                      control={control}
                      render={({ field, fieldState }) => (
                        <Autocomplete
                          options={departments}
                          getOptionLabel={(option) => option.name}
                          value={departments.find(d => d.id === field.value) || null}
                          onChange={(_event, newValue) => field.onChange(newValue?.id || null)}
                          loading={isLoadingLookups}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="Business Owner"
                              helperText={fieldState.error?.message}
                              error={!!fieldState.error}
                              fullWidth
                            />
                          )}
                        />
                      )}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    {isEditMode && repository?.id ? (
                      <FormFieldWithSuggestion
                        name="status"
                        control={control}
                        label="Status"
                        fieldType="select"
                        selectOptions={STATUS_OPTIONS}
                        jobStatus={statusJobStatus}
                        isSuggesting={isFieldSuggesting('status')}
                        isRestoring={suggestionJob.isRestoring}
                        onSuggest={async () => {
                          const formData = watch();
                          await handleSuggestField(
                            'status',
                            'select',
                            'Status',
                            formData.status || '',
                            formData,
                            STATUS_OPTIONS.map(opt => opt.value)
                          );
                        }}
                        onAccept={(suggestion) => {
                          const value = Array.isArray(suggestion) ? suggestion[0] : suggestion;
                          if (typeof value === 'string') {
                            setValue('status', value as any, { shouldValidate: true });
                          }
                        }}
                        onDismiss={() => {
                          suggestionJob.clearJobStatus('status');
                        }}
                      />
                    ) : (
                      <FormSelect
                        name="status"
                        control={control}
                        label="Status"
                        options={STATUS_OPTIONS}
                      />
                    )}
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* Geographic & Cross-Border Transfers */}
            <Accordion
              expanded={expandedAccordions.includes('geographic-cross-border')}
              onChange={handleAccordionChange('geographic-cross-border')}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1" fontWeight="medium">
                  Geographic & Cross-Border Transfers
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12 }}>
                    <Controller
                      name="geographical_location_ids"
                      control={control}
                      render={({ field, fieldState }) => (
                        <Autocomplete
                          multiple
                          options={regionLocations}
                          getOptionLabel={(option) => option.name}
                          value={regionLocations.filter((loc) => field.value?.includes(loc.id)) || []}
                          onChange={(_event, newValue) => field.onChange(newValue.map((loc) => loc.id))}
                          loading={isLoadingLookups}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="Geographic Regions"
                              helperText={fieldState.error?.message || "Select regions where data is stored"}
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
                  <Grid size={{ xs: 12 }}>
                    <Controller
                      name="access_location_ids"
                      control={control}
                      render={({ field, fieldState }) => (
                        <Autocomplete
                          multiple
                          options={countryLocations}
                          getOptionLabel={(option) => option.name}
                          value={countryLocations.filter((loc) => field.value?.includes(loc.id)) || []}
                          onChange={(_event, newValue) => field.onChange(newValue.map((loc) => loc.id))}
                          loading={isLoadingLookups}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="Access Countries"
                              helperText={fieldState.error?.message || "Select countries where access occurs"}
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
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormSelect
                      name="transfer_mechanism"
                      control={control}
                      label="Transfer Mechanism"
                      options={TRANSFER_MECHANISM_OPTIONS}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormSelect
                      name="derogation_type"
                      control={control}
                      label="Derogation Type"
                      options={DEROGATION_TYPE_OPTIONS}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormSelect
                      name="cross_border_safeguards"
                      control={control}
                      label="Cross-Border Safeguards"
                      options={CROSS_BORDER_SAFEGUARDS_OPTIONS}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormTextField
                      name="cross_border_transfer_detail"
                      control={control}
                      label="Transfer Details"
                      helperText="Additional details about cross-border transfers"
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* Compliance */}
            <Accordion
              expanded={expandedAccordions.includes('compliance')}
              onChange={handleAccordionChange('compliance')}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1" fontWeight="medium">
                  Compliance & Certification
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12 }}>
                    <FormControlLabel
                      control={
                        <Controller
                          name="gdpr_compliant"
                          control={control}
                          render={({ field }) => (
                            <Switch
                              checked={field.value}
                              onChange={field.onChange}
                            />
                          )}
                        />
                      }
                      label="GDPR Compliant"
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormControlLabel
                      control={
                        <Controller
                          name="vendor_gdpr_compliance"
                          control={control}
                          render={({ field }) => (
                            <Switch
                              checked={field.value || false}
                              onChange={field.onChange}
                            />
                          )}
                        />
                      }
                      label="Vendor GDPR Compliance"
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormSelect
                      name="certification"
                      control={control}
                      label="Certification"
                      options={CERTIFICATION_OPTIONS}
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    {isEditMode && repository?.id ? (
                      <FormFieldWithSuggestion
                        name="dpa_url"
                        control={control}
                        label="Data Processing Agreement URL"
                        fieldType="text"
                        jobStatus={dpaUrlJobStatus}
                        isSuggesting={isFieldSuggesting('dpa_url')}
                        isRestoring={suggestionJob.isRestoring}
                        onSuggest={async () => {
                          const formData = watch();
                          await handleSuggestField(
                            'dpa_url',
                            'text',
                            'Data Processing Agreement',
                            formData.dpa_url || '',
                            formData
                          );
                        }}
                        onAccept={(suggestion) => {
                          if (Array.isArray(suggestion)) {
                            const joined = suggestion.join(', ');
                            setValue('dpa_url', joined, { shouldValidate: true });
                          } else if (typeof suggestion === 'string') {
                            setValue('dpa_url', suggestion, { shouldValidate: true });
                          }
                        }}
                        onDismiss={() => {
                          suggestionJob.clearJobStatus('dpa_url');
                        }}
                        textFieldProps={{ helperText: 'URL (e.g., https://example.com/dpa.pdf)' }}
                      />
                    ) : (
                      <FormTextField
                        name="dpa_url"
                        control={control}
                        label="Data Processing Agreement URL"
                        helperText="URL (e.g., https://example.com/dpa.pdf)"
                      />
                    )}
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <FormTextField
                      name="dpa_file"
                      control={control}
                      label="DPA File Path"
                      helperText="File path (deferred implementation)"
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* System Interfaces & Data */}
            <Accordion
              expanded={expandedAccordions.includes('interfaces')}
              onChange={handleAccordionChange('interfaces')}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1" fontWeight="medium">
                  System Interfaces & Data
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12 }}>
                    <Controller
                      name="system_interfaces"
                      control={control}
                      render={({ field, fieldState }) => (
                        <Autocomplete
                          multiple
                          options={systems}
                          getOptionLabel={(option) => option.name}
                          value={systems.filter(sys => field.value?.includes(sys.id)) || []}
                          onChange={(_event, newValue) => field.onChange(newValue.map(sys => sys.id))}
                          loading={isLoadingLookups}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="System Interfaces"
                              helperText={fieldState.error?.message || "Select systems from lookup table"}
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
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormSelect
                      name="interface_type"
                      control={control}
                      label="Interface Type"
                      options={INTERFACE_TYPE_OPTIONS}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Controller
                      name="interface_location_ids"
                      control={control}
                      render={({ field, fieldState }) => (
                        <Autocomplete
                          multiple
                          options={regionLocations}
                          getOptionLabel={(option) => option.name}
                          value={regionLocations.filter((loc) => field.value?.includes(loc.id)) || []}
                          onChange={(_event, newValue) => field.onChange(newValue.map((loc) => loc.id))}
                          loading={isLoadingLookups}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="Interface Regions"
                              helperText={fieldState.error?.message || "Select regions for interfaced systems"}
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
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormTextField
                      name="record_count"
                      control={control}
                      label="Record Count"
                      type="number"
                      helperText="Number of records (must be >= 0)"
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* Data Recipients */}
            <Accordion
              expanded={expandedAccordions.includes('recipients')}
              onChange={handleAccordionChange('recipients')}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1" fontWeight="medium">
                  Data Recipients
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12 }}>
                    <FormTextField
                      name="data_recipients"
                      control={control}
                      label="Data Recipients"
                      helperText="Who receives the data"
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <FormTextField
                      name="sub_processors"
                      control={control}
                      label="Sub-Processors"
                      helperText="List of sub-processors"
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* Additional Metadata */}
            <Accordion
              expanded={expandedAccordions.includes('metadata')}
              onChange={handleAccordionChange('metadata')}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1" fontWeight="medium">
                  Additional Metadata
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
                              helperText={fieldState.error?.message || "Press Enter to add comments"}
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
          type="button"
          onClick={handleClose}
          startIcon={<CancelIcon />}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          form="repository-form"
          variant="contained"
          startIcon={isSubmitting ? <CircularProgress size={20} /> : <SaveIcon />}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Saving...' : isEditMode ? 'Update' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

