/**
 * Storage Adapter Interface
 * Defines the contract for storage implementations
 * Allows plugging in different backends: AsyncStorage, Supabase, Mock, etc.
 *
 * Design: This interface is backend-agnostic. The repository uses this
 * to abstract away storage details, making it easy to swap implementations
 * without touching service layer or UI.
 */

/**
 * Generic storage adapter interface
 * Implementations: AsyncStorage (now), Supabase (future), Mock (testing)
 */
export interface StorageAdapter {
  /**
   * Retrieve a value from storage
   * @param key Storage key
   * @returns Parsed value or null if not found
   * @throws Error if key not found or parse fails
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * Store a value in storage
   * @param key Storage key
   * @param value Value to store (will be JSON serialized)
   * @throws Error if storage operation fails
   */
  set<T>(key: string, value: T): Promise<void>;

  /**
   * Remove a value from storage
   * @param key Storage key
   * @throws Error if key not found or operation fails
   */
  remove(key: string): Promise<void>;

  /**
   * Clear all storage
   * WARNING: Clears everything, use with caution
   */
  clear(): Promise<void>;

  /**
   * Check if a key exists in storage
   * @param key Storage key
   * @returns true if key exists, false otherwise
   */
  has(key: string): Promise<boolean>;
}
