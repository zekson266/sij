import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  Box,
  Typography,
  Button,
  Divider,
  Card,
  CardContent,
  CircularProgress,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Autocomplete,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Save as SaveIcon,
  ExpandMore as ExpandMoreIcon,
  Business as BusinessIcon,
  Settings as SettingsIcon,
  SmartToy as SmartToyIcon,
} from '@mui/icons-material';
import { updateTenant } from '../../../services/tenantApi';
import { useNotification } from '../../../contexts';
import type { Tenant } from '../../../types';
import type {
  CompanyContext,
  ROPADefaults,
  ROAIPreferences,
  CompanySize,
  LegalJurisdiction,
  ComplianceFramework,
  LegalBasis,
  DeletionMethod,
  OpenAIModel,
} from '../../../modules/ropa/types/settings';

interface ROPASettingsFormData {
  // Company Context
  industry: string;
  sector: string;
  legal_jurisdiction: LegalJurisdiction[];
  company_size: CompanySize | '';
  primary_country: string;
  dpo_name: string;
  dpo_email: string;
  dpo_phone: string;
  compliance_frameworks: ComplianceFramework[];
  
  // ROPA Defaults
  default_retention_period: string;
  default_legal_basis: LegalBasis | '';
  default_deletion_method: DeletionMethod | '';
  
  // AI Preferences
  ai_enabled: boolean;
  ai_model_preference: OpenAIModel;
  ai_include_company_context: boolean;
}

interface ROPASettingsTabProps {
  tenant: Tenant;
  onUpdate: (updatedTenant: Tenant) => void;
}

const COMPANY_SIZE_OPTIONS: { value: CompanySize; label: string }[] = [
  { value: 'small', label: 'Small (1-50 employees)' },
  { value: 'medium', label: 'Medium (51-250 employees)' },
  { value: 'large', label: 'Large (251-1000 employees)' },
  { value: 'enterprise', label: 'Enterprise (1000+ employees)' },
];

const LEGAL_JURISDICTION_OPTIONS: LegalJurisdiction[] = [
  'GDPR',
  'CCPA',
  'LGPD',
  'PIPEDA',
  'PDPA',
  'Other',
];

const COMPLIANCE_FRAMEWORK_OPTIONS: ComplianceFramework[] = [
  'GDPR',
  'CCPA',
  'ISO 27001',
  'SOC 2',
  'HIPAA',
  'PCI DSS',
  'Other',
];

const LEGAL_BASIS_OPTIONS: { value: LegalBasis; label: string }[] = [
  { value: 'Consent', label: 'Consent' },
  { value: 'Contract', label: 'Contract' },
  { value: 'Legal obligation', label: 'Legal Obligation' },
  { value: 'Vital interests', label: 'Vital Interests' },
  { value: 'Public task', label: 'Public Task' },
  { value: 'Legitimate interests', label: 'Legitimate Interests' },
];

const DELETION_METHOD_OPTIONS: { value: DeletionMethod; label: string }[] = [
  { value: 'automated', label: 'Automated' },
  { value: 'manual', label: 'Manual' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'on_demand', label: 'On Demand' },
  { value: 'none', label: 'None' },
];

const OPENAI_MODEL_OPTIONS: { value: OpenAIModel; label: string; description: string }[] = [
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini', description: 'Faster, lower cost' },
  { value: 'gpt-4o', label: 'GPT-4o', description: 'Higher quality, higher cost' },
];

export default function ROPASettingsTab({
  tenant,
  onUpdate,
}: ROPASettingsTabProps) {
  const [isSaving, setIsSaving] = React.useState(false);
  const { showSuccess, showError } = useNotification();
  const [expandedAccordions, setExpandedAccordions] = React.useState<string[]>(['company-context']);

  const { handleSubmit, reset, control, watch } = useForm<ROPASettingsFormData>({
    defaultValues: {
      industry: '',
      sector: '',
      legal_jurisdiction: [],
      company_size: '',
      primary_country: '',
      dpo_name: '',
      dpo_email: '',
      dpo_phone: '',
      compliance_frameworks: [],
      default_retention_period: '',
      default_legal_basis: '',
      default_deletion_method: '',
      ai_enabled: true,
      ai_model_preference: 'gpt-4o-mini',
      ai_include_company_context: true,
    },
  });

  React.useEffect(() => {
    // Extract settings from tenant
    // Only reset when tenant ID changes (switching tenants), not on every object reference change
    const settings = tenant.settings as any;
    const metadata = tenant.tenant_metadata as any;
    
    // Company context from tenant_metadata
    const company = metadata?.company || {};
    const dpo = company.dpo || {};
    
    // ROPA settings from settings.module_config.ropa
    const moduleConfig = settings?.module_config || {};
    const ropaSettings = moduleConfig.ropa || {};
    const defaults = ropaSettings.defaults || {};
    const aiPrefs = ropaSettings.ai_preferences || {};

    reset({
      industry: company.industry || '',
      sector: company.sector || '',
      legal_jurisdiction: company.legal_jurisdiction || [],
      company_size: (company.company_size as CompanySize) || '',
      primary_country: company.primary_country || '',
      dpo_name: dpo.name || '',
      dpo_email: dpo.email || '',
      dpo_phone: dpo.phone || '',
      compliance_frameworks: company.compliance_frameworks || [],
      default_retention_period: defaults.default_retention_period || '',
      default_legal_basis: (defaults.default_legal_basis as LegalBasis) || '',
      default_deletion_method: (defaults.default_deletion_method as DeletionMethod) || '',
      ai_enabled: aiPrefs.enabled !== false, // Default to true
      ai_model_preference: (aiPrefs.model_preference as OpenAIModel) || 'gpt-4o-mini',
      ai_include_company_context: aiPrefs.include_company_context !== false, // Default to true
    });
  }, [tenant?.id, reset]);

  const handleAccordionChange = (panel: string) => (_event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedAccordions((prev) =>
      isExpanded ? [...prev, panel] : prev.filter((p) => p !== panel)
    );
  };

  const onSubmit = async (data: ROPASettingsFormData) => {
    if (!tenant) {
      return;
    }

    try {
      setIsSaving(true);

      // Build company context structure
      const companyContext: CompanyContext = {
        industry: data.industry.trim() || undefined,
        sector: data.sector.trim() || undefined,
        legal_jurisdiction: data.legal_jurisdiction.length > 0 ? data.legal_jurisdiction : undefined,
        company_size: data.company_size || undefined,
        primary_country: data.primary_country.trim() || undefined,
        dpo: {
          name: data.dpo_name.trim() || undefined,
          email: data.dpo_email.trim() || undefined,
          phone: data.dpo_phone.trim() || undefined,
        },
        compliance_frameworks: data.compliance_frameworks.length > 0 ? data.compliance_frameworks : undefined,
      };

      // Build ROPA defaults structure
      const ropaDefaults: ROPADefaults = {
        default_retention_period: data.default_retention_period.trim() || undefined,
        default_legal_basis: data.default_legal_basis || undefined,
        default_deletion_method: data.default_deletion_method || undefined,
      };

      // Build AI preferences structure
      const aiPreferences: ROAIPreferences = {
        enabled: data.ai_enabled,
        model_preference: data.ai_model_preference,
        include_company_context: data.ai_include_company_context,
      };

      // Merge with existing settings
      const currentSettings = (tenant.settings as any) || {};
      const currentMetadata = (tenant.tenant_metadata as any) || {};
      
      const updatedSettings = {
        ...currentSettings,
        module_config: {
          ...(currentSettings.module_config || {}),
          ropa: {
            defaults: ropaDefaults,
            ai_preferences: aiPreferences,
          },
        },
      };

      const updatedMetadata = {
        ...currentMetadata,
        company: companyContext,
      };

      // Update both settings and metadata
      const updatedTenant = await updateTenant(tenant.id, {
        settings: updatedSettings,
        tenant_metadata: updatedMetadata,
      });

      showSuccess('ROPA settings saved successfully!');
      
      // Update parent with the updated tenant (no need to refetch)
      onUpdate(updatedTenant);
    } catch (err: any) {
      const errorMessage = err?.message || err?.detail || 'Failed to save ROPA settings';
      showError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Box>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Typography variant="h6" gutterBottom>
          ROPA Settings
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Configure company context, default values, and AI preferences for the ROPA module.
        </Typography>

        {/* Company Context Section */}
        <Accordion
          expanded={expandedAccordions.includes('company-context')}
          onChange={handleAccordionChange('company-context')}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box display="flex" alignItems="center" gap={1}>
              <BusinessIcon />
              <Typography variant="subtitle1" fontWeight="medium">
                Company Context
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Company information used to provide context-aware AI suggestions for ROPA entries.
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Controller
                      name="industry"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Industry"
                          placeholder="e.g., Healthcare, Finance, Technology"
                          fullWidth
                        />
                      )}
                    />
                    <Controller
                      name="sector"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Sector"
                          placeholder="e.g., Medical Services, Banking, SaaS"
                          fullWidth
                        />
                      )}
                    />
                  </Box>

                  <Controller
                    name="legal_jurisdiction"
                    control={control}
                    render={({ field }) => (
                      <Autocomplete
                        {...field}
                        multiple
                        options={LEGAL_JURISDICTION_OPTIONS}
                        renderTags={(value, getTagProps) =>
                          value.map((option, index) => (
                            <Chip label={option} {...getTagProps({ index })} key={option} />
                          ))
                        }
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Legal Jurisdiction"
                            placeholder="Select applicable jurisdictions"
                          />
                        )}
                        onChange={(_event, newValue) => field.onChange(newValue)}
                      />
                    )}
                  />

                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Controller
                      name="company_size"
                      control={control}
                      render={({ field }) => (
                        <FormControl fullWidth>
                          <InputLabel>Company Size</InputLabel>
                          <Select {...field} label="Company Size" value={field.value || ''}>
                            <MenuItem value="">None</MenuItem>
                            {COMPANY_SIZE_OPTIONS.map((option) => (
                              <MenuItem key={option.value} value={option.value}>
                                {option.label}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      )}
                    />
                    <Controller
                      name="primary_country"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Primary Country"
                          placeholder="e.g., US, GB, DE"
                          fullWidth
                        />
                      )}
                    />
                  </Box>

                  <Divider />

                  <Typography variant="subtitle2" gutterBottom>
                    Data Protection Officer (DPO)
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Controller
                      name="dpo_name"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="DPO Name"
                          placeholder="Full name"
                          fullWidth
                        />
                      )}
                    />
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <Controller
                        name="dpo_email"
                        control={control}
                        rules={{ pattern: { value: /^$|^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email' } }}
                        render={({ field, fieldState: { error } }) => (
                          <TextField
                            {...field}
                            label="DPO Email"
                            placeholder="dpo@company.com"
                            type="email"
                            error={!!error}
                            helperText={error?.message}
                            fullWidth
                          />
                        )}
                      />
                      <Controller
                        name="dpo_phone"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            label="DPO Phone"
                            placeholder="+1-555-0123"
                            fullWidth
                          />
                        )}
                      />
                    </Box>
                  </Box>

                  <Divider />

                  <Controller
                    name="compliance_frameworks"
                    control={control}
                    render={({ field }) => (
                      <Autocomplete
                        {...field}
                        multiple
                        options={COMPLIANCE_FRAMEWORK_OPTIONS}
                        renderTags={(value, getTagProps) =>
                          value.map((option, index) => (
                            <Chip label={option} {...getTagProps({ index })} key={option} />
                          ))
                        }
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Compliance Frameworks"
                            placeholder="Select applicable frameworks"
                          />
                        )}
                        onChange={(_event, newValue) => field.onChange(newValue)}
                      />
                    )}
                  />
                </Box>
              </CardContent>
            </Card>
          </AccordionDetails>
        </Accordion>

        {/* ROPA Defaults Section */}
        <Accordion
          expanded={expandedAccordions.includes('ropa-defaults')}
          onChange={handleAccordionChange('ropa-defaults')}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box display="flex" alignItems="center" gap={1}>
              <SettingsIcon />
              <Typography variant="subtitle1" fontWeight="medium">
                ROPA Defaults
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Default values to pre-fill when creating new ROPA entries.
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <Controller
                    name="default_retention_period"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Default Retention Period"
                        placeholder="e.g., 7 years, 90 days"
                        fullWidth
                      />
                    )}
                  />

                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Controller
                      name="default_legal_basis"
                      control={control}
                      render={({ field }) => (
                        <FormControl fullWidth>
                          <InputLabel>Default Legal Basis</InputLabel>
                          <Select {...field} label="Default Legal Basis" value={field.value || ''}>
                            <MenuItem value="">None</MenuItem>
                            {LEGAL_BASIS_OPTIONS.map((option) => (
                              <MenuItem key={option.value} value={option.value}>
                                {option.label}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      )}
                    />
                    <Controller
                      name="default_deletion_method"
                      control={control}
                      render={({ field }) => (
                        <FormControl fullWidth>
                          <InputLabel>Default Deletion Method</InputLabel>
                          <Select {...field} label="Default Deletion Method" value={field.value || ''}>
                            <MenuItem value="">None</MenuItem>
                            {DELETION_METHOD_OPTIONS.map((option) => (
                              <MenuItem key={option.value} value={option.value}>
                                {option.label}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      )}
                    />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </AccordionDetails>
        </Accordion>

        {/* AI Preferences Section */}
        <Accordion
          expanded={expandedAccordions.includes('ai-preferences')}
          onChange={handleAccordionChange('ai-preferences')}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box display="flex" alignItems="center" gap={1}>
              <SmartToyIcon />
              <Typography variant="subtitle1" fontWeight="medium">
                AI Preferences
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Configure AI-powered field suggestions for ROPA forms.
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <Controller
                    name="ai_enabled"
                    control={control}
                    render={({ field }) => (
                      <FormControlLabel
                        control={<Switch checked={field.value} onChange={field.onChange} />}
                        label="Enable AI Suggestions"
                      />
                    )}
                  />

                  {watch('ai_enabled') && (
                    <>
                      <Controller
                        name="ai_model_preference"
                        control={control}
                        render={({ field }) => (
                          <FormControl fullWidth>
                            <InputLabel>Preferred AI Model</InputLabel>
                            <Select {...field} label="Preferred AI Model">
                              {OPENAI_MODEL_OPTIONS.map((option) => (
                                <MenuItem key={option.value} value={option.value}>
                                  <Box>
                                    <Typography>{option.label}</Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      {option.description}
                                    </Typography>
                                  </Box>
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        )}
                      />

                      <Controller
                        name="ai_include_company_context"
                        control={control}
                        render={({ field }) => (
                          <FormControlLabel
                            control={<Switch checked={field.value} onChange={field.onChange} />}
                            label="Include Company Context in AI Prompts"
                          />
                        )}
                      />
                    </>
                  )}
                </Box>
              </CardContent>
            </Card>
          </AccordionDetails>
        </Accordion>

        <Divider sx={{ my: 3 }} />

        {/* Save Button */}
        <Box display="flex" justifyContent="flex-end" gap={2}>
          <Button
            type="submit"
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={isSaving}
          >
            {isSaving ? <CircularProgress size={24} /> : 'Save Settings'}
          </Button>
        </Box>
      </form>
    </Box>
  );
}

