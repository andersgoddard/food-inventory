/**
 * AsyncStorage Adapter Implementation
 * Provides React Native AsyncStorage backend for the storage adapter interface
 * Used for Phase 1 MVP (local-only storage)
 *
 * Future: When Supabase is added (Phase 2), this can be swapped for SupabaseAdapter
 * without any changes to the repository or service layer.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { StorageAdapter } from './storage-adapter';

export class AsyncStorageAdapter implements StorageAdapter {
  /**
   * Retrieve a value from AsyncStorage
   * @param key Storage key
   * @returns Parsed value or null if not found
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await AsyncStorage.getItem(key);
      if (value === null) {
        return null;
      }
      return JSON.parse(value) as T;
    } catch (error) {
      console.error(`Failed to get item from storage: ${key}`, error);
      throw new Error(`Failed to retrieve data from storage: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Store a value in AsyncStorage
   * @param key Storage key
   * @param value Value to store (will be JSON serialized)
   */
  async set<T>(key: string, value: T): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      await AsyncStorage.setItem(key, serialized);
    } catch (error) {
      console.error(`Failed to set item in storage: ${key}`, error);
      throw new Error(`Failed to store data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Remove a value from AsyncStorage
   * @param key Storage key
   */
  async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`Failed to remove item from storage: ${key}`, error);
      throw new Error(`Failed to delete data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Clear all AsyncStorage
   * WARNING: This clears everything
   */
  async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Failed to clear storage', error);
      throw new Error(`Failed to clear storage: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if a key exists in AsyncStorage
   * @param key Storage key
   * @returns true if key exists, false otherwise
   */
  async has(key: string): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(key);
      return value !== null;
    } catch (error) {
      console.error(`Failed to check if key exists: ${key}`, error);
      throw new Error(`Failed to check storage: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
