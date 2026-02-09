/**
 * Zod schema for DPIA form validation.
 * 
 * Matches backend Pydantic schemas for consistency.
 */

import { z } from 'zod';

export const dpiaFormSchema = z.object({
  // ========== Basic Identification ==========
  title: z.string().min(1, 'Title is required').max(255, 'Title must be 255 characters or less'),
  description: z.string().optional(),
  status: z.string().max(50, 'Status must be 50 characters or less').optional(),
  
  // ========== Assessment Details ==========
  necessity_proportionality_assessment: z.string().optional(),
  assessor: z.string().max(255, 'Assessor must be 255 characters or less').optional(),
  assessment_date: z.string().optional(), // ISO date string
  
  // ========== Consultation Requirements ==========
  dpo_consultation_required: z.boolean().default(false),
  dpo_consultation_date: z.string().optional(), // ISO date string
  supervisory_authority_consultation_required: z.boolean().default(false),
  supervisory_authority_consultation_date: z.string().optional(), // ISO date string
});

export type DPIAFormData = z.infer<typeof dpiaFormSchema>;


