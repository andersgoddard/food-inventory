/**
 * Utility: Date Handling
 * Parsing, formatting, and comparison of ISO 8601 dates
 */

/**
 * Get current time as ISO 8601 string
 * Used for createdAt, updatedAt timestamps
 */
export function getCurrentISOString(): string {
  return new Date().toISOString();
}

/**
 * Parse ISO 8601 string to JavaScript Date
 * @param isoString ISO 8601 datetime string
 * @returns Date object, or null if invalid
 */
export function parseISOString(isoString: string | null | undefined): Date | null {
  if (!isoString) {
    return null;
  }
  try {
    return new Date(isoString);
  } catch {
    return null;
  }
}

/**
 * Format ISO 8601 string for human-readable display
 * @param isoString ISO 8601 datetime string
 * @param options Intl.DateTimeFormat options
 * @returns Formatted date string, or empty string if invalid
 */
export function formatDate(
  isoString: string | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }
): string {
  const date = parseISOString(isoString);
  if (!date) {
    return '';
  }
  return new Intl.DateTimeFormat('en-GB', options).format(date);
}

/**
 * Format ISO 8601 string with time
 * @param isoString ISO 8601 datetime string
 * @returns Formatted datetime string (e.g., "15 Aug 2026, 14:30")
 */
export function formatDateTime(isoString: string | null | undefined): string {
  return formatDate(isoString, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Check if date is in the past
 * @param isoString ISO 8601 datetime string
 * @returns true if date is before now
 */
export function isDateInPast(isoString: string | null | undefined): boolean {
  const date = parseISOString(isoString);
  if (!date) {
    return false;
  }
  return date < new Date();
}

/**
 * Check if date is today
 * @param isoString ISO 8601 datetime string
 * @returns true if date is today
 */
export function isDateToday(isoString: string | null | undefined): boolean {
  const date = parseISOString(isoString);
  if (!date) {
    return false;
  }
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

/**
 * Check if date is in the past or today
 * Useful for checking if item is expired
 * @param isoString ISO 8601 datetime string
 * @returns true if date is today or before
 */
export function isDateExpiredOrToday(isoString: string | null | undefined): boolean {
  return isDateInPast(isoString) || isDateToday(isoString);
}

/**
 * Calculate days until expiry
 * @param isoString ISO 8601 datetime string
 * @returns Number of days until date (negative if in past), or null if invalid
 */
export function daysUntilDate(isoString: string | null | undefined): number | null {
  const date = parseISOString(isoString);
  if (!date) {
    return null;
  }
  const now = new Date();
  const diffTime = date.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Create ISO string from date parts
 * Useful for date picker inputs
 * @param year Year
 * @param month Month (1-12)
 * @param day Day (1-31)
 * @returns ISO 8601 datetime string (midnight UTC)
 */
export function createISOStringFromDate(year: number, month: number, day: number): string {
  return new Date(year, month - 1, day, 0, 0, 0, 0).toISOString();
}

/**
 * Extract date part from ISO string (YYYY-MM-DD)
 * Useful for date input fields
 * @param isoString ISO 8601 datetime string
 * @returns YYYY-MM-DD format, or empty string if invalid
 */
export function extractDatePart(isoString: string | null | undefined): string {
  const date = parseISOString(isoString);
  if (!date) {
    return '';
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
