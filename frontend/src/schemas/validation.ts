/**
 * Shared Zod validation schemas for form validation.
 * These schemas match the backend Pydantic validation rules for consistency.
 */

import { z } from 'zod';

/**
 * Email validation schema
 */
const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Please enter a valid email address');

/**
 * Password validation schema
 * Matches backend: min_length=8, max_length=100
 */
const passwordSchema = z
  .string()
  .min(1, 'Password is required')
  .min(8, 'Password must be at least 8 characters')
  .max(100, 'Password must be less than 100 characters');

/**
 * Optional string with max length validation
 */
const optionalStringSchema = (maxLength: number, fieldName: string) =>
  z
    .string()
    .max(maxLength, `${fieldName} must be less than ${maxLength} characters`)
    .optional()
    .or(z.literal(''));

/**
 * Slug validation and normalization
 * Matches backend: lowercase, hyphens, alphanumeric only
 */
const slugSchema = z
  .string()
  .max(255, 'Slug must be less than 255 characters')
  .optional()
  .or(z.literal(''))
  .transform((val) => {
    if (!val) return undefined;
    // Normalize: lowercase, replace spaces with hyphens, remove special chars
    let normalized = val.toLowerCase().trim().replace(/\s+/g, '-');
    // Remove any non-alphanumeric characters except hyphens
    normalized = normalized.replace(/[^a-z0-9-]/g, '');
    // Remove multiple consecutive hyphens
    normalized = normalized.replace(/-+/g, '-');
    // Remove leading/trailing hyphens
    normalized = normalized.replace(/^-+|-+$/g, '');
    return normalized || undefined;
  });

/**
 * Subscription tier validation
 */
const subscriptionTierSchema = z.enum(['free', 'pro', 'enterprise'], {
  message: 'Invalid subscription tier',
});

// ============================================================================
// Form Schemas
// ============================================================================

/**
 * Login form schema
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

/**
 * Register form schema
 * Matches backend RegisterRequest: email, password (min 8), first_name (optional, max 100), last_name (optional, max 100)
 */
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  first_name: optionalStringSchema(100, 'First name'),
  last_name: optionalStringSchema(100, 'Last name'),
});

export type RegisterFormData = z.infer<typeof registerSchema>;

/**
 * Tenant form schema (for form input - no transforms)
 * Matches backend TenantCreate: name (min 1, max 255), email, phone (optional, max 50),
 * slug (optional, max 255), domain (optional, max 255), subscription_tier (default "free")
 */
export const tenantFormSchema = z.object({
  name: z
    .string()
    .min(1, 'Tenant name is required')
    .max(255, 'Tenant name must be less than 255 characters'),
  email: emailSchema,
  phone: optionalStringSchema(50, 'Phone'),
  slug: z
    .string()
    .max(255, 'Slug must be less than 255 characters')
    .optional()
    .or(z.literal('')),
  domain: optionalStringSchema(255, 'Domain'),
  subscription_tier: subscriptionTierSchema.default('free'),
});

export type TenantFormData = z.infer<typeof tenantFormSchema>;

/**
 * Tenant schema with slug normalization (for API submission)
 */
export const tenantSchema = tenantFormSchema.extend({
  slug: slugSchema,
});

/**
 * Tenant update schema (all fields optional)
 */
export const tenantUpdateSchema = z.object({
  name: z
    .string()
    .min(1, 'Tenant name must be at least 1 character')
    .max(255, 'Tenant name must be less than 255 characters')
    .optional(),
  email: emailSchema.optional(),
  phone: optionalStringSchema(50, 'Phone'),
  slug: slugSchema,
  domain: optionalStringSchema(255, 'Domain'),
  subscription_tier: subscriptionTierSchema.optional(),
});

export type TenantUpdateFormData = z.infer<typeof tenantUpdateSchema>;
