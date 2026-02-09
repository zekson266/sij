/**
 * Zod schema for DataElement form validation.
 * 
 * Matches backend Pydantic schemas for consistency.
 */

import { z } from 'zod';

export const dataElementFormSchema = z.object({
  // ========== Basic Identification ==========
  category: z.string().max(100, 'Category must be 100 characters or less').optional(),
  
  // ========== Data Elements ==========
  data_elements: z.array(z.string()).optional(),
  special_lawful_basis: z.array(z.string()).optional(),
  secondary_use: z.boolean().default(false),
  encryption_in_transit: z.boolean().default(false),
  safeguards: z.string().optional(),
  retention_period_days: z.number().int().positive().optional().or(z.literal('').transform(() => undefined)),
  disposition_method: z.string().optional(),
  comments: z.array(z.string()).optional(),
  data_minimization_justification: z.string().optional(),
  data_accuracy_requirements: z.string().optional(),
  data_storage_location: z.array(z.string()).optional(),
});

export type DataElementFormData = z.infer<typeof dataElementFormSchema>;


