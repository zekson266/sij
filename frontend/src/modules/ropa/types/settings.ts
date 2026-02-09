/**
 * ROPA Settings TypeScript types.
 * 
 * Defines the structure for ROPA module settings stored in tenant.settings.modules.ropa
 * and company context stored in tenant.tenant_metadata.company.
 */

export type CompanySize = 'small' | 'medium' | 'large' | 'enterprise';

export type LegalJurisdiction = 'GDPR' | 'CCPA' | 'LGPD' | 'PIPEDA' | 'PDPA' | 'Other';

export type ComplianceFramework = 'GDPR' | 'CCPA' | 'ISO 27001' | 'SOC 2' | 'HIPAA' | 'PCI DSS' | 'Other';

export type LegalBasis = 
  | 'Consent'
  | 'Contract'
  | 'Legal obligation'
  | 'Vital interests'
  | 'Public task'
  | 'Legitimate interests';

export type DeletionMethod = 
  | 'automated'
  | 'manual'
  | 'scheduled'
  | 'on_demand'
  | 'none';

export type OpenAIModel = 'gpt-4o-mini' | 'gpt-4o';

export interface DPOInfo {
  name?: string;
  email?: string;
  phone?: string;
}

export interface CompanyContext {
  industry?: string;
  sector?: string;
  legal_jurisdiction?: LegalJurisdiction[];
  company_size?: CompanySize;
  primary_country?: string;
  dpo?: DPOInfo;
  compliance_frameworks?: ComplianceFramework[];
}

export interface ROPADefaults {
  default_retention_period?: string;
  default_legal_basis?: LegalBasis;
  default_deletion_method?: DeletionMethod;
}

export interface ROAIPreferences {
  enabled?: boolean;
  model_preference?: OpenAIModel;
  include_company_context?: boolean;
}

export interface ROPASettings {
  defaults?: ROPADefaults;
  ai_preferences?: ROAIPreferences;
}

/**
 * Full ROPA settings structure as stored in tenant.settings.modules.ropa
 */
export interface ROPASettingsData extends ROPASettings {}

/**
 * Company context structure as stored in tenant.tenant_metadata.company
 */
export interface CompanyContextData extends CompanyContext {}

