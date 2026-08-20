/**
 * Utility: Validation Helpers
 * Common validation utilities and error formatting
 */

import { ZodError } from 'zod';

/**
 * Format Zod validation errors for user display
 * @param error ZodError from schema validation
 * @returns Flat map of field names to error messages
 */
export function formatZodError(error: ZodError): Record<string, string> {
  const errors: Record<string, string> = {};

  error.errors.forEach((err) => {
    const path = err.path.join('.');
    const message = err.message;
    errors[path] = message;
  });

  return errors;
}

/**
 * Get first error message from Zod error
 * Useful for toast notifications
 * @param error ZodError from schema validation
 * @returns First error message, or generic message if none
 */
export function getFirstZodError(error: ZodError): string {
  if (error.errors.length === 0) {
    return 'Validation failed';
  }
  return error.errors[0].message;
}

/**
 * Validate a number is positive
 * @param value The value to check
 * @returns true if value > 0
 */
export function isPositiveNumber(value: number): boolean {
  return value > 0;
}

/**
 * Validate a number is non-negative
 * @param value The value to check
 * @returns true if value >= 0
 */
export function isNonNegativeNumber(value: number): boolean {
  return value >= 0;
}

/**
 * Validate a string is not empty
 * @param value The value to check
 * @returns true if string has content
 */
export function isNonEmptyString(value: string | null | undefined): boolean {
  return !!value && value.trim().length > 0;
}

/**
 * Validate a string length
 * @param value The value to check
 * @param max Maximum length
 * @returns true if within bounds
 */
export function isStringWithinLength(value: string | null | undefined, max: number): boolean {
  return !value || value.length <= max;
}

/**
 * Validate an email format (basic)
 * @param value The value to check
 * @returns true if appears to be valid email
 */
export function isValidEmail(value: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
}

/**
 * Validate a URL format
 * @param value The value to check
 * @returns true if appears to be valid URL
 */
export function isValidURL(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}
