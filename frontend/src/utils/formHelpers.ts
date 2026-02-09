/**
 * Utility functions for form handling with React Hook Form and Material UI.
 */

import type { FieldErrors, UseFormSetError } from 'react-hook-form';
import type { ApiError } from '../types';

/**
 * Type guard to check if an error is an ApiError.
 * 
 * @param error - The error to check
 * @returns True if the error is an ApiError
 */
export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'error' in error &&
    'status_code' in error &&
    'message' in error &&
    typeof (error as ApiError).status_code === 'number'
  );
}

/**
 * Extract field errors from API error response and set them in React Hook Form.
 * Handles both field-specific errors and general error messages.
 */
export function handleApiErrors<T extends Record<string, any>>(
  error: unknown,
  setError: UseFormSetError<T>,
  setGeneralError?: (message: string) => void
): void {
  // Use type guard for type safety
  if (!isApiError(error)) {
    // If not an ApiError, set a generic error message
    if (setGeneralError) {
      setGeneralError('An error occurred. Please try again.');
    }
    return;
  }

  const apiError = error;
  let generalErrorMessage: string | null = null;

  // Extract field-specific validation errors
  if (apiError.errors && Array.isArray(apiError.errors) && apiError.errors.length > 0) {
    const fieldErrors: Record<string, string> = {};

    apiError.errors.forEach((fieldError) => {
      // Extract field name from "body.email" -> "email" or "query.tenant_id" -> "tenant_id"
      const fieldName = fieldError.field
        .replace(/^body\./, '')
        .replace(/^query\./, '')
        .replace(/^path\./, '');

      if (fieldName) {
        fieldErrors[fieldName] = fieldError.message;
        // Set error in React Hook Form
        // Use type assertion since fieldName comes from API and may not match exact Path<T>
        setError(fieldName as any, {
          type: 'server',
          message: fieldError.message,
        });
      }
    });

    // If we have field errors, use first one as general message
    if (Object.keys(fieldErrors).length > 0) {
      const firstFieldError = apiError.errors[0];
      let rawMessage = firstFieldError.message || 'Please correct the errors below.';

      // Simplify common validation messages
      if (rawMessage.includes('not a valid email address')) {
        generalErrorMessage = 'Please enter a valid email address.';
      } else if (rawMessage.includes('required')) {
        generalErrorMessage = 'This field is required.';
      } else {
        // Use the first sentence or first 100 characters
        generalErrorMessage = rawMessage.split(':')[0].trim() || rawMessage.substring(0, 100);
      }
    }
  }

  // If no field errors, use general error message
  if (!generalErrorMessage) {
    generalErrorMessage =
      apiError?.message || apiError?.detail || 'An error occurred. Please try again.';
  }

  // Set general error if callback provided
  if (setGeneralError && generalErrorMessage) {
    setGeneralError(generalErrorMessage);
  }
}

/**
 * Get error message for a field from React Hook Form errors.
 */
export function getFieldError<T extends Record<string, any>>(
  errors: FieldErrors<T>,
  fieldName: keyof T
): string | undefined {
  const error = errors[fieldName];
  if (error) {
    return error.message as string;
  }
  return undefined;
}

/**
 * Check if a field has an error in React Hook Form.
 */
export function hasFieldError<T extends Record<string, any>>(
  errors: FieldErrors<T>,
  fieldName: keyof T
): boolean {
  return !!errors[fieldName];
}

