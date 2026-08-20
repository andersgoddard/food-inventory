/**
 * Inventory Validator
 * Validation helpers specific to inventory operations
 */

import { ZodError } from 'zod';
import { formatZodError } from '@/utils/validation';
import {
  validateCreateInventoryItem,
  validateUpdateInventoryItem,
  validateInventoryItem,
} from './inventory.schemas';

/**
 * Validation result type
 */
export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: Record<string, string>;
  rawError?: ZodError;
}

/**
 * Validate create inventory item input
 * @param data Input data to validate
 * @returns Validation result with data or errors
 */
export function validateCreateItem(data: unknown): ValidationResult<any> {
  try {
    const validated = validateCreateInventoryItem(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        errors: formatZodError(error),
        rawError: error,
      };
    }
    return {
      success: false,
      errors: { _error: 'Unknown validation error' },
    };
  }
}

/**
 * Validate update inventory item input
 * @param data Input data to validate (partial)
 * @returns Validation result with data or errors
 */
export function validateUpdateItem(data: unknown): ValidationResult<any> {
  try {
    const validated = validateUpdateInventoryItem(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        errors: formatZodError(error),
        rawError: error,
      };
    }
    return {
      success: false,
      errors: { _error: 'Unknown validation error' },
    };
  }
}

/**
 * Validate stored inventory item
 * @param data Item data from storage
 * @returns Validation result with data or errors
 */
export function validateStoredItem(data: unknown): ValidationResult<any> {
  try {
    const validated = validateInventoryItem(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        errors: formatZodError(error),
        rawError: error,
      };
    }
    return {
      success: false,
      errors: { _error: 'Unknown validation error' },
    };
  }
}

/**
 * Get error message for specific field
 * @param errors Errors object from ValidationResult
 * @param fieldName Field name to get error for
 * @returns Error message or empty string
 */
export function getFieldError(
  errors: Record<string, string> | undefined,
  fieldName: string
): string {
  if (!errors) return '';
  return errors[fieldName] || '';
}

/**
 * Check if field has error
 * @param errors Errors object from ValidationResult
 * @param fieldName Field name to check
 * @returns true if field has error
 */
export function hasFieldError(errors: Record<string, string> | undefined, fieldName: string): boolean {
  if (!errors) return false;
  return !!errors[fieldName];
}
