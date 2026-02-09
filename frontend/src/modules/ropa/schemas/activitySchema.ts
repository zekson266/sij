/**
 * Zod schema for Activity form validation.
 * 
 * Matches backend Pydantic schemas for consistency.
 */

import { z } from 'zod';

export const activityFormSchema = z.object({
  // ========== Basic Identification ==========
  processing_activity_name: z.string().min(1, 'Name is required').max(255, 'Name must be 255 characters or less'),
  purpose: z.string().max(255, 'Purpose must be 255 characters or less').optional(),
  lawful_basis: z.string().max(100, 'Lawful basis must be 100 characters or less').optional(),
  
  // ========== New Fields (Part 1) ==========
  legitimate_interest_assessment: z.string().optional(),
  data_subject_type: z.array(z.string()).optional(),
  collection_sources: z.array(z.string()).optional(), // UUID array
  data_disclosed_to: z.array(z.string()).optional(), // UUID array
  jit_notice: z.string().optional(),
  consent_process: z.string().optional(),
  
  // ========== New Fields (Part 2) ==========
  automated_decision: z.boolean().default(false),
  data_subject_rights: z.string().optional(),
  dpia_required: z.boolean().default(false),
  dpia_comment: z.string().optional(),
  dpia_file: z.string().max(500, 'File path must be 500 characters or less').optional(),
  dpia_gpc_link: z.string().max(500, 'URL must be 500 characters or less').optional(),
  children_data: z.string().optional(),
  parental_consent: z.string().optional(),
  
  // ========== New Fields (Part 3) ==========
  comments: z.array(z.string()).optional(),
  data_retention_policy: z.string().max(500, 'URL must be 500 characters or less').optional(),
  processing_frequency: z.enum(['Real-time', 'Daily', 'Weekly', 'Monthly', 'Ad-hoc']).optional(),
  legal_jurisdiction: z.array(z.string()).optional(),
});

export type ActivityFormData = z.infer<typeof activityFormSchema>;


