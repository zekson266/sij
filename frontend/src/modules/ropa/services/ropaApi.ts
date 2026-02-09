/**
 * ROPA API service.
 * 
 * Handles all ROPA-related API calls.
 */

import { apiGet, apiPost, apiPatch, apiDelete } from '../../../services/api';

// Lookup Table Types
export interface Department {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Location {
  id: string;
  name: string;
  type: 'region' | 'country';
  country_code?: string;
  region?: string;
  parent_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface System {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  system_type?: string;
  created_at: string;
  updated_at: string;
}


// Types
export interface Repository {
  id: string;
  tenant_id: string;
  // Basic Identification
  data_repository_name: string;
  data_repository_description?: string;
  external_vendor?: string;
  business_owner?: string | null;
  data_format?: 'Electronic' | 'Physical';
  // Geographic & Location
  geographical_location_ids?: string[];
  access_location_ids?: string[];
  // Cross-Border Transfers
  transfer_mechanism?: 'Adequacy' | 'Privacy Shield' | 'BCR' | 'Contract' | 'Derogation';
  derogation_type?: 'Legal claims' | 'Vital interests' | 'Public info' | 'Sporadic' | 'N/A';
  cross_border_safeguards?: 'Binding contract' | 'DPA clauses' | 'BCRs' | 'Code of conduct' | 'Cert' | 'N/A';
  cross_border_transfer_detail?: string;
  // Compliance & Certification
  gdpr_compliant?: boolean;
  dpa_url?: string;
  dpa_file?: string;
  vendor_gdpr_compliance?: boolean;
  certification?: 'ISO-27001' | 'NIST' | 'SOC' | 'Trustee' | 'N/A';
  // Data & Records
  record_count?: number | null;
  // System Interfaces
  system_interfaces?: string[];
  interface_type?: 'Internal' | 'External';
  interface_location_ids?: string[];
  // Data Recipients
  data_recipients?: string;
  sub_processors?: string;
  // Operational Status
  status?: 'active' | 'archived' | 'decommissioned' | 'maintenance';
  // Additional Metadata
  comments?: string[];
  // Timestamps
  created_at: string;
  updated_at: string;
  activities?: Activity[];
}

export interface Activity {
  id: string;
  data_repository_id: string;
  // Basic Identification
  processing_activity_name: string;
  purpose?: string;
  lawful_basis?: string;
  // New Fields (Part 1)
  legitimate_interest_assessment?: string;
  data_subject_type?: string[];
  collection_sources?: string[]; // UUID array
  data_disclosed_to?: string[]; // UUID array
  jit_notice?: string;
  consent_process?: string;
  // New Fields (Part 2)
  automated_decision?: boolean;
  data_subject_rights?: string;
  dpia_required?: boolean;
  dpia_comment?: string;
  dpia_file?: string;
  dpia_gpc_link?: string;
  children_data?: string;
  parental_consent?: string;
  // New Fields (Part 3)
  comments?: string[];
  data_retention_policy?: string;
  processing_frequency?: 'Real-time' | 'Daily' | 'Weekly' | 'Monthly' | 'Ad-hoc';
  legal_jurisdiction?: string[];
  // Timestamps
  created_at: string;
  updated_at: string;
  data_elements?: DataElement[];
  dpias?: DPIA[];
}

export interface DataElement {
  id: string;
  processing_activity_id: string;
  // Basic Identification
  category?: string;
  // Data Elements
  data_elements?: string[];
  special_lawful_basis?: string[];
  secondary_use?: boolean;
  encryption_in_transit?: boolean;
  safeguards?: string;
  retention_period_days?: number;
  disposition_method?: string;
  comments?: string[];
  data_minimization_justification?: string;
  data_accuracy_requirements?: string;
  data_storage_location?: string[];
  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface DPIA {
  id: string;
  processing_activity_id: string;
  // Basic Identification
  title: string;
  description?: string;
  status?: string;
  // Assessment Details
  necessity_proportionality_assessment?: string;
  assessor?: string;
  assessment_date?: string;
  // Consultation Requirements
  dpo_consultation_required?: boolean;
  dpo_consultation_date?: string;
  supervisory_authority_consultation_required?: boolean;
  supervisory_authority_consultation_date?: string;
  // Timestamps
  created_at: string;
  updated_at: string;
  risks?: Risk[];
}

export interface Risk {
  id: string;
  dpia_id: string;
  // Basic Identification
  title: string;
  description?: string;
  // Risk Assessment
  severity?: string;
  likelihood?: string;
  residual_severity?: string;
  residual_likelihood?: string;
  // Risk Management
  mitigation?: string;
  risk_owner?: string;
  risk_status?: string;
  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface RepositoryCreate {
  // Basic Identification
  data_repository_name: string;
  data_repository_description?: string;
  external_vendor?: string;
  business_owner?: string | null;
  data_format?: 'Electronic' | 'Physical';
  // Geographic & Location
  geographical_location_ids?: string[];
  access_location_ids?: string[];
  // Cross-Border Transfers
  transfer_mechanism?: 'Adequacy' | 'Privacy Shield' | 'BCR' | 'Contract' | 'Derogation';
  derogation_type?: 'Legal claims' | 'Vital interests' | 'Public info' | 'Sporadic' | 'N/A';
  cross_border_safeguards?: 'Binding contract' | 'DPA clauses' | 'BCRs' | 'Code of conduct' | 'Cert' | 'N/A';
  cross_border_transfer_detail?: string;
  // Compliance & Certification
  gdpr_compliant?: boolean;
  dpa_url?: string;
  dpa_file?: string;
  vendor_gdpr_compliance?: boolean;
  certification?: 'ISO-27001' | 'NIST' | 'SOC' | 'Trustee' | 'N/A';
  // Data & Records
  record_count?: number | null;
  // System Interfaces
  system_interfaces?: string[];
  interface_type?: 'Internal' | 'External';
  interface_location_ids?: string[];
  // Data Recipients
  data_recipients?: string;
  sub_processors?: string;
  // Operational Status
  status?: 'active' | 'archived' | 'decommissioned' | 'maintenance';
  // Additional Metadata
  comments?: string[];
}

export type RepositoryUpdate = Partial<RepositoryCreate>;

export interface ActivityCreate {
  data_repository_id: string;
  // Basic Identification
  processing_activity_name: string;
  purpose?: string;
  lawful_basis?: string;
  // New Fields (Part 1)
  legitimate_interest_assessment?: string;
  data_subject_type?: string[];
  collection_sources?: string[]; // UUID array
  data_disclosed_to?: string[]; // UUID array
  jit_notice?: string;
  consent_process?: string;
  // New Fields (Part 2)
  automated_decision?: boolean;
  data_subject_rights?: string;
  dpia_required?: boolean;
  dpia_comment?: string;
  dpia_file?: string;
  dpia_gpc_link?: string;
  children_data?: string;
  parental_consent?: string;
  // New Fields (Part 3)
  comments?: string[];
  data_retention_policy?: string;
  processing_frequency?: 'Real-time' | 'Daily' | 'Weekly' | 'Monthly' | 'Ad-hoc';
  legal_jurisdiction?: string[];
}

export type ActivityUpdate = Partial<ActivityCreate>;

export interface DataElementCreate {
  processing_activity_id: string;
  // Basic Identification
  category?: string;
  // Data Elements
  data_elements?: string[];
  special_lawful_basis?: string[];
  secondary_use?: boolean;
  encryption_in_transit?: boolean;
  safeguards?: string;
  retention_period_days?: number;
  disposition_method?: string;
  comments?: string[];
  data_minimization_justification?: string;
  data_accuracy_requirements?: string;
  data_storage_location?: string[];
}

export type DataElementUpdate = Partial<DataElementCreate>;

export interface DPIACreate {
  processing_activity_id: string;
  // Basic Identification
  title: string;
  description?: string;
  status?: string;
  // Assessment Details
  necessity_proportionality_assessment?: string;
  assessor?: string;
  assessment_date?: string;
  // Consultation Requirements
  dpo_consultation_required?: boolean;
  dpo_consultation_date?: string;
  supervisory_authority_consultation_required?: boolean;
  supervisory_authority_consultation_date?: string;
}

export type DPIAUpdate = Partial<DPIACreate>;

export interface RiskCreate {
  dpia_id: string;
  // Basic Identification
  title: string;
  description?: string;
  // Risk Assessment
  severity?: string;
  likelihood?: string;
  residual_severity?: string;
  residual_likelihood?: string;
  // Risk Management
  mitigation?: string;
  risk_owner?: string;
  risk_status?: string;
}

export type RiskUpdate = Partial<RiskCreate>;

// Repository endpoints
export async function listRepositories(tenantId: string): Promise<Repository[]> {
  return apiGet<Repository[]>(`/api/tenants/${tenantId}/ropa/repositories`);
}

export async function getRepository(tenantId: string, repositoryId: string): Promise<Repository> {
  return apiGet<Repository>(`/api/tenants/${tenantId}/ropa/repositories/${repositoryId}`);
}

export async function createRepository(tenantId: string, data: RepositoryCreate): Promise<Repository> {
  return apiPost<Repository>(`/api/tenants/${tenantId}/ropa/repositories`, data);
}

export async function updateRepository(
  tenantId: string,
  repositoryId: string,
  data: RepositoryUpdate
): Promise<Repository> {
  return apiPatch<Repository>(`/api/tenants/${tenantId}/ropa/repositories/${repositoryId}`, data);
}

export async function deleteRepository(tenantId: string, repositoryId: string): Promise<void> {
  return apiDelete(`/api/tenants/${tenantId}/ropa/repositories/${repositoryId}`);
}

// Activity endpoints
export async function listActivities(tenantId: string, repositoryId: string): Promise<Activity[]> {
  return apiGet<Activity[]>(`/api/tenants/${tenantId}/ropa/repositories/${repositoryId}/activities`);
}

export async function getActivity(tenantId: string, activityId: string): Promise<Activity> {
  return apiGet<Activity>(`/api/tenants/${tenantId}/ropa/activities/${activityId}`);
}

export async function createActivity(tenantId: string, repositoryId: string, data: ActivityCreate): Promise<Activity> {
  return apiPost<Activity>(`/api/tenants/${tenantId}/ropa/repositories/${repositoryId}/activities`, data);
}

export async function updateActivity(
  tenantId: string,
  activityId: string,
  data: Partial<ActivityCreate>
): Promise<Activity> {
  return apiPatch<Activity>(`/api/tenants/${tenantId}/ropa/activities/${activityId}`, data);
}

export async function deleteActivity(tenantId: string, activityId: string): Promise<void> {
  return apiDelete(`/api/tenants/${tenantId}/ropa/activities/${activityId}`);
}

// Data Element endpoints
export async function listDataElements(tenantId: string, activityId: string): Promise<DataElement[]> {
  return apiGet<DataElement[]>(`/api/tenants/${tenantId}/ropa/activities/${activityId}/data-elements`);
}

export async function getDataElement(tenantId: string, dataElementId: string): Promise<DataElement> {
  return apiGet<DataElement>(`/api/tenants/${tenantId}/ropa/data-elements/${dataElementId}`);
}

export async function createDataElement(
  tenantId: string,
  activityId: string,
  data: DataElementCreate
): Promise<DataElement> {
  return apiPost<DataElement>(`/api/tenants/${tenantId}/ropa/activities/${activityId}/data-elements`, data);
}

export async function updateDataElement(
  tenantId: string,
  dataElementId: string,
  data: Partial<DataElementCreate>
): Promise<DataElement> {
  return apiPatch<DataElement>(`/api/tenants/${tenantId}/ropa/data-elements/${dataElementId}`, data);
}

export async function deleteDataElement(tenantId: string, dataElementId: string): Promise<void> {
  return apiDelete(`/api/tenants/${tenantId}/ropa/data-elements/${dataElementId}`);
}

// DPIA endpoints
export async function listDPIAs(tenantId: string, activityId: string): Promise<DPIA[]> {
  return apiGet<DPIA[]>(`/api/tenants/${tenantId}/ropa/activities/${activityId}/dpias`);
}

export async function getDPIA(tenantId: string, dpiaId: string): Promise<DPIA> {
  return apiGet<DPIA>(`/api/tenants/${tenantId}/ropa/dpias/${dpiaId}`);
}

export async function createDPIA(tenantId: string, activityId: string, data: DPIACreate): Promise<DPIA> {
  return apiPost<DPIA>(`/api/tenants/${tenantId}/ropa/activities/${activityId}/dpias`, data);
}

export async function updateDPIA(tenantId: string, dpiaId: string, data: Partial<DPIACreate>): Promise<DPIA> {
  return apiPatch<DPIA>(`/api/tenants/${tenantId}/ropa/dpias/${dpiaId}`, data);
}

export async function deleteDPIA(tenantId: string, dpiaId: string): Promise<void> {
  return apiDelete(`/api/tenants/${tenantId}/ropa/dpias/${dpiaId}`);
}

// Risk endpoints
export async function listRisks(tenantId: string, dpiaId: string): Promise<Risk[]> {
  return apiGet<Risk[]>(`/api/tenants/${tenantId}/ropa/dpias/${dpiaId}/risks`);
}

export async function getRisk(tenantId: string, riskId: string): Promise<Risk> {
  return apiGet<Risk>(`/api/tenants/${tenantId}/ropa/risks/${riskId}`);
}

export async function createRisk(tenantId: string, dpiaId: string, data: RiskCreate): Promise<Risk> {
  return apiPost<Risk>(`/api/tenants/${tenantId}/ropa/dpias/${dpiaId}/risks`, data);
}

export async function updateRisk(tenantId: string, riskId: string, data: Partial<RiskCreate>): Promise<Risk> {
  return apiPatch<Risk>(`/api/tenants/${tenantId}/ropa/risks/${riskId}`, data);
}

export async function deleteRisk(tenantId: string, riskId: string): Promise<void> {
  return apiDelete(`/api/tenants/${tenantId}/ropa/risks/${riskId}`);
}

// ============================================================================
// Lookup Table API Methods
// ============================================================================

// Departments
export async function fetchDepartments(tenantId: string): Promise<Department[]> {
  return apiGet<Department[]>(`/api/tenants/${tenantId}/ropa/departments`);
}

export async function createDepartment(tenantId: string, data: Partial<Department>): Promise<Department> {
  return apiPost<Department>(`/api/tenants/${tenantId}/ropa/departments`, data);
}

export async function updateDepartment(tenantId: string, departmentId: string, data: Partial<Department>): Promise<Department> {
  return apiPatch<Department>(`/api/tenants/${tenantId}/ropa/departments/${departmentId}`, data);
}

export async function deleteDepartment(tenantId: string, departmentId: string): Promise<void> {
  return apiDelete(`/api/tenants/${tenantId}/ropa/departments/${departmentId}`);
}

// Locations (global in database, but accessed via tenant routes)
export async function fetchLocations(tenantId: string): Promise<Location[]> {
  return apiGet<Location[]>(`/api/tenants/${tenantId}/ropa/locations`);
}

export async function createLocation(tenantId: string, data: Partial<Location>): Promise<Location> {
  return apiPost<Location>(`/api/tenants/${tenantId}/ropa/locations`, data);
}

export async function updateLocation(tenantId: string, locationId: string, data: Partial<Location>): Promise<Location> {
  return apiPatch<Location>(`/api/tenants/${tenantId}/ropa/locations/${locationId}`, data);
}

export async function deleteLocation(tenantId: string, locationId: string): Promise<void> {
  return apiDelete(`/api/tenants/${tenantId}/ropa/locations/${locationId}`);
}

// Systems
export async function fetchSystems(tenantId: string): Promise<System[]> {
  return apiGet<System[]>(`/api/tenants/${tenantId}/ropa/systems`);
}

export async function createSystem(tenantId: string, data: Partial<System>): Promise<System> {
  return apiPost<System>(`/api/tenants/${tenantId}/ropa/systems`, data);
}

export async function updateSystem(tenantId: string, systemId: string, data: Partial<System>): Promise<System> {
  return apiPatch<System>(`/api/tenants/${tenantId}/ropa/systems/${systemId}`, data);
}

export async function deleteSystem(tenantId: string, systemId: string): Promise<void> {
  return apiDelete(`/api/tenants/${tenantId}/ropa/systems/${systemId}`);
}

// Policy Documents

// ============================================================================
// AI Suggestion Job Types and Functions
// ============================================================================

export interface SuggestionJobRequest {
  field_name: string;
  field_type: string;
  field_label: string;
  current_value: string;
  form_data: Record<string, any>;
  field_options?: string[];
}

export interface SuggestionJobResponse {
  job_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
}

export interface SuggestionJobStatus {
  job_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  field_name: string;
  field_label: string;
  general_statement?: string;
  suggestions?: string[];
  error_message?: string;
  openai_model?: string;
  openai_tokens_used?: number;
  openai_cost_usd?: number;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface SuggestionJobListItem {
  job_id: string;
  field_name: string;
  field_label: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  completed_at?: string;
}

export interface SuggestionJobListResponse {
  jobs: SuggestionJobListItem[];
  total: number;
}

/**
 * Entity type for AI suggestions.
 */
export type ROPAEntityType = 'repository' | 'activity' | 'data_element' | 'dpia' | 'risk';

/**
 * Get the API path segment for an entity type.
 */
function getEntityPath(entityType: ROPAEntityType): string {
  const pathMap: Record<ROPAEntityType, string> = {
    repository: 'repositories',
    activity: 'activities',
    data_element: 'data-elements',
    dpia: 'dpias',
    risk: 'risks',
  };
  return pathMap[entityType];
}

/**
 * Create a new AI suggestion job for any ROPA entity field.
 */
export async function createSuggestionJob(
  tenantId: string,
  entityType: ROPAEntityType,
  entityId: string,
  request: SuggestionJobRequest
): Promise<SuggestionJobResponse> {
  const entityPath = getEntityPath(entityType);
  return apiPost<SuggestionJobResponse>(
    `/api/tenants/${tenantId}/ropa/${entityPath}/${entityId}/suggest-field`,
    request
  );
}

/**
 * Get status of a suggestion job.
 */
export async function getSuggestionJob(
  tenantId: string,
  entityType: ROPAEntityType,
  entityId: string,
  jobId: string
): Promise<SuggestionJobStatus> {
  const entityPath = getEntityPath(entityType);
  return apiGet<SuggestionJobStatus>(
    `/api/tenants/${tenantId}/ropa/${entityPath}/${entityId}/suggest-field/job/${jobId}`
  );
}

/**
 * List suggestion jobs for any ROPA entity.
 */
export async function listSuggestionJobs(
  tenantId: string,
  entityType: ROPAEntityType,
  entityId: string,
  filters?: {
    field_name?: string;
    status?: string;
  }
): Promise<SuggestionJobListResponse> {
  const entityPath = getEntityPath(entityType);
  const params = new URLSearchParams();
  if (filters?.field_name) params.append('field_name', filters.field_name);
  if (filters?.status) params.append('status', filters.status);
  
  const queryString = params.toString();
  const url = `/api/tenants/${tenantId}/ropa/${entityPath}/${entityId}/suggest-field/jobs${queryString ? `?${queryString}` : ''}`;
  
  return apiGet<SuggestionJobListResponse>(url);
}

