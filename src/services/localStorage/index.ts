/**
 * CHANGELOG - 2025-01-XX
 * 
 * ADDED:
 * - Centralized localStorage service with type-safe API
 * - Automatic validation using Zod schemas
 * - Error recovery with fallback defaults
 * - Size checking to prevent quota errors
 * - Versioning support for future migrations
 * 
 * MODIFIED:
 * - N/A (new file)
 * 
 * TESTING:
 * - Verify data persists correctly across page refreshes
 * - Test error recovery when localStorage is corrupted
 * - Confirm quota checking prevents storage errors
 * - Validate type safety at compile time
 */

import { z } from 'zod';
import { STORAGE_SCHEMAS, StorageKey } from './schemas';

const STORAGE_VERSION = '1.0';
const MAX_STORAGE_SIZE = 5 * 1024 * 1024; // 5MB limit (conservative)

class LocalStorageService {
  private readonly storagePrefix = 'jukebox_';

  /**
   * Get the full storage key with prefix
   */
  private getKey(key: StorageKey | string): string {
    return `${this.storagePrefix}${key}`;
  }

  /**
   * Check if localStorage is available
   */
  isAvailable(): boolean {
    try {
      const test = '__localStorage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (error) {
      console.error('[LocalStorage] localStorage is not available:', error);
      return false;
    }
  }

  /**
   * Get the current storage size estimate
   */
  getStorageSize(): number {
    if (!this.isAvailable()) return 0;

    let total = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        total += localStorage[key].length + key.length;
      }
    }
    return total;
  }

  /**
   * Check if there's enough space to store data
   */
  hasSpaceFor(dataSize: number): boolean {
    const currentSize = this.getStorageSize();
    return currentSize + dataSize < MAX_STORAGE_SIZE;
  }

  /**
   * Safely get data from localStorage with validation
   */
  get<K extends StorageKey>(
    key: K,
    defaultValue?: z.infer<typeof STORAGE_SCHEMAS[K]>
  ): z.infer<typeof STORAGE_SCHEMAS[K]> | null {
    if (!this.isAvailable()) {
      console.warn(`[LocalStorage] Cannot read ${key} - localStorage unavailable`);
      return defaultValue ?? null;
    }

    try {
      const stored = localStorage.getItem(this.getKey(key));
      
      if (!stored) {
        console.log(`[LocalStorage] No data found for ${key}, using default`);
        return defaultValue ?? null;
      }

      const parsed = JSON.parse(stored);
      const schema = STORAGE_SCHEMAS[key];

      if (!schema) {
        console.warn(`[LocalStorage] No schema defined for ${key}`);
        return parsed;
      }

      // Validate with Zod schema
      const validated = schema.parse(parsed);
      console.log(`[LocalStorage] Successfully loaded and validated ${key}`);
      return validated;
    } catch (error) {
      console.error(`[LocalStorage] Error reading ${key}:`, error);
      
      if (error instanceof z.ZodError) {
        console.error(`[LocalStorage] Validation failed for ${key}:`, error.errors);
      }
      
      // Clear corrupted data
      this.remove(key);
      
      return defaultValue ?? null;
    }
  }

  /**
   * Safely set data to localStorage with validation
   */
  set<K extends StorageKey>(
    key: K,
    value: z.infer<typeof STORAGE_SCHEMAS[K]>
  ): boolean {
    if (!this.isAvailable()) {
      console.warn(`[LocalStorage] Cannot write ${key} - localStorage unavailable`);
      return false;
    }

    try {
      const schema = STORAGE_SCHEMAS[key];
      
      // Validate data before storing
      if (schema) {
        schema.parse(value);
      }

      const serialized = JSON.stringify(value);
      
      // Check storage size
      if (!this.hasSpaceFor(serialized.length)) {
        console.error(`[LocalStorage] Insufficient storage space for ${key}`);
        return false;
      }

      localStorage.setItem(this.getKey(key), serialized);
      console.log(`[LocalStorage] Successfully saved ${key} (${serialized.length} bytes)`);
      return true;
    } catch (error) {
      console.error(`[LocalStorage] Error writing ${key}:`, error);
      
      if (error instanceof z.ZodError) {
        console.error(`[LocalStorage] Validation failed for ${key}:`, error.errors);
      }
      
      return false;
    }
  }

  /**
   * Remove item from localStorage
   */
  remove(key: StorageKey | string): void {
    if (!this.isAvailable()) return;

    try {
      localStorage.removeItem(this.getKey(key));
      console.log(`[LocalStorage] Removed ${key}`);
    } catch (error) {
      console.error(`[LocalStorage] Error removing ${key}:`, error);
    }
  }

  /**
   * Clear all jukebox data from localStorage
   */
  clearAll(): void {
    if (!this.isAvailable()) return;

    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.storagePrefix)) {
          localStorage.removeItem(key);
        }
      });
      console.log('[LocalStorage] Cleared all jukebox data');
    } catch (error) {
      console.error('[LocalStorage] Error clearing storage:', error);
    }
  }

  /**
   * Get storage version (for future migrations)
   */
  getVersion(): string {
    try {
      return localStorage.getItem(this.getKey('version')) || '0.0';
    } catch {
      return '0.0';
    }
  }

  /**
   * Set storage version
   */
  setVersion(version: string): void {
    try {
      localStorage.setItem(this.getKey('version'), version);
    } catch (error) {
      console.error('[LocalStorage] Error setting version:', error);
    }
  }

  /**
   * Legacy getter for non-schema keys (backward compatibility)
   */
  getLegacy(key: string): any {
    if (!this.isAvailable()) return null;

    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error(`[LocalStorage] Error reading legacy key ${key}:`, error);
      return null;
    }
  }

  /**
   * Legacy setter for non-schema keys (backward compatibility)
   */
  setLegacy(key: string, value: any): boolean {
    if (!this.isAvailable()) return false;

    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`[LocalStorage] Error writing legacy key ${key}:`, error);
      return false;
    }
  }
}

// Export singleton instance
export const localStorageService = new LocalStorageService();

// Export storage version for migrations
export { STORAGE_VERSION };
