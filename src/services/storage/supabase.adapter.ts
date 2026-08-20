/**
 * Supabase Storage Adapter (STUB - Future Implementation)
 * 
 * This is a placeholder for the Supabase backend implementation.
 * Will be implemented in Phase 2 when backend integration is added.
 *
 * Design Pattern:
 * 1. InventoryRepository accepts StorageAdapter interface
 * 2. Currently instantiated with AsyncStorageAdapter
 * 3. In Phase 2, will be instantiated with SupabaseAdapter instead
 * 4. No changes to repository, service, or UI code needed
 *
 * Implementation Notes:
 * - Use @supabase/supabase-js client
 * - Map table operations to adapter interface methods
 * - Handle authentication and API errors
 * - Add offline queue for sync when network unavailable
 * - Implement real-time subscriptions for multi-device sync
 */

import { StorageAdapter } from './storage-adapter';

export class SupabaseAdapter implements StorageAdapter {
  // TODO: Implement in Phase 2
  // - Constructor: accept supabaseClient, table name
  // - get(): query Supabase table
  // - set(): insert/upsert to Supabase
  // - remove(): delete from Supabase
  // - clear(): delete all rows (with caution)
  // - has(): check if row exists

  async get<T>(_key: string): Promise<T | null> {
    throw new Error('SupabaseAdapter not yet implemented');
  }

  async set<T>(_key: string, _value: T): Promise<void> {
    throw new Error('SupabaseAdapter not yet implemented');
  }

  async remove(_key: string): Promise<void> {
    throw new Error('SupabaseAdapter not yet implemented');
  }

  async clear(): Promise<void> {
    throw new Error('SupabaseAdapter not yet implemented');
  }

  async has(_key: string): Promise<boolean> {
    throw new Error('SupabaseAdapter not yet implemented');
  }
}
