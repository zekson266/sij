/**
 * Zod schema for Repository form validation.
 * 
 * Matches backend Pydantic schemas for consistency.
 * 
 * Uses z.preprocess() to convert empty strings from Material-UI Select components:
 * - Optional fields: preprocessEmptyToNull (converts '' to null)
 * - Required fields: preprocessEmptyToUndefined (converts '' to undefined)
 * 
 * See frontend/COMPONENT_PATTERNS.md - Enum Field Validation Pattern for details.
 */

import { z } from 'zod';

/**
 * Preprocess function to convert empty strings to null for optional nullable fields.
 * Material-UI Select components convert null/undefined to '' for display,
 * so we need to convert '' back to null before validation.
 */
const preprocessEmptyToNull = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess(
    (val) => {
      if (val === "" || val === "null" || val == null) {
        return null;
      }
      return val;
    },
    schema
  );

/**
 * Preprocess function to convert empty strings to undefined for required fields.
 * This ensures Zod triggers required_error instead of invalid_enum_value when field is empty.
 * Material-UI Select components convert null/undefined to '' for display,
 * so we need to convert '' back to undefined before validation.
 */
const preprocessEmptyToUndefined = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess(
    (val) => {
      if (val === "" || val === "null" || val == null) {
        return undefined;
      }
      return val;
    },
    schema
  );

export const repositoryFormSchema = z.object({
  // Basic Identification
  data_repository_name: z.string().min(1, 'Name is required').max(255, 'Name must be 255 characters or less'),
  data_repository_description: z.string().optional(),
  external_vendor: z.string().max(255).optional(),
  business_owner: z.string().uuid().optional().nullable(),
  // Required field: uses preprocessEmptyToUndefined (converts '' to undefined to trigger required_error)
  data_format: preprocessEmptyToUndefined(
    z.union([
      z.enum(['Electronic', 'Physical']),
      z.undefined(),
    ]).refine(
      (val) => val !== undefined,
      { message: 'Data format is required' }
    )
  ),
  
  // Geographic & Location
  geographical_location_ids: z.array(z.string().uuid()).optional(),
  access_location_ids: z.array(z.string().uuid()).optional(),
  
  // Cross-Border Transfers
  transfer_mechanism: preprocessEmptyToNull(z.enum(['Adequacy', 'Privacy Shield', 'BCR', 'Contract', 'Derogation']).nullable().optional()),
  derogation_type: preprocessEmptyToNull(z.enum(['Legal claims', 'Vital interests', 'Public info', 'Sporadic', 'N/A']).nullable().optional()),
  cross_border_safeguards: preprocessEmptyToNull(z.enum(['Binding contract', 'DPA clauses', 'BCRs', 'Code of conduct', 'Cert', 'N/A']).nullable().optional()),
  cross_border_transfer_detail: z.string().max(255).optional(),
  
  // Compliance & Certification
  gdpr_compliant: z.boolean().default(false),
  dpa_url: z.string().max(500).url('Must be a valid URL').optional().or(z.literal('')),
  dpa_file: z.string().max(500).optional(),
  vendor_gdpr_compliance: z.boolean().optional().nullable(),
  certification: preprocessEmptyToNull(z.enum(['ISO-27001', 'NIST', 'SOC', 'Trustee', 'N/A']).nullable().optional()),
  
  // Data & Records
  record_count: z.number().int().min(0, 'Record count must be >= 0').optional().nullable(),
  
  // System Interfaces
  system_interfaces: z.array(z.string().uuid()).optional(),
  interface_type: preprocessEmptyToNull(z.enum(['Internal', 'External']).nullable().optional()),
  interface_location_ids: z.array(z.string().uuid()).optional(),
  
  // Data Recipients
  data_recipients: z.string().max(255).optional(),
  sub_processors: z.string().max(255).optional(),
  
  // Operational Status
  status: z.enum(['active', 'archived', 'decommissioned', 'maintenance']).default('active'),
  
  // Additional Metadata
  comments: z.array(z.string()).optional(),
});

export type RepositoryFormData = z.infer<typeof repositoryFormSchema>;


