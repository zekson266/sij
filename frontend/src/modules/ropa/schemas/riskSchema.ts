/**
 * Zod schema for Risk form validation.
 * 
 * Matches backend Pydantic schemas for consistency.
 */

import { z } from 'zod';

export const riskFormSchema = z.object({
  // ========== Basic Identification ==========
  title: z.string().min(1, 'Title is required').max(255, 'Title must be 255 characters or less'),
  description: z.string().optional(),
  
  // ========== Risk Assessment ==========
  severity: z.string().max(50, 'Severity must be 50 characters or less').optional(),
  likelihood: z.string().max(50, 'Likelihood must be 50 characters or less').optional(),
  residual_severity: z.string().max(50, 'Residual severity must be 50 characters or less').optional(),
  residual_likelihood: z.string().max(50, 'Residual likelihood must be 50 characters or less').optional(),
  
  // ========== Risk Management ==========
  mitigation: z.string().optional(),
  risk_owner: z.string().max(255, 'Risk owner must be 255 characters or less').optional(),
  risk_status: z.string().max(50, 'Risk status must be 50 characters or less').optional(),
});

export type RiskFormData = z.infer<typeof riskFormSchema>;


