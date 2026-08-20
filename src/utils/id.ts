/**
 * Utility: ID Generation
 * Generates UUIDs for inventory items
 */

/**
 * Simple UUID v4 generator
 * Used for generating inventory item IDs client-side
 * 
 * This ensures offline-first capability - items get IDs immediately
 * even before being synced to a server.
 */
export function generateUUID(): string {
  // UUID v4 pattern
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Check if a string is a valid UUID
 */
export function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}
