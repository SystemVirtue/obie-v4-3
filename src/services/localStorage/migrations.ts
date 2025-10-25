/**
 * CHANGELOG - Phase 4
 * 
 * ADDED:
 * - Data migration system for localStorage schema changes
 * - Automatic migration on app load
 * - Version tracking
 * - Backward compatibility helpers
 * 
 * TESTING:
 * - Test migration runs correctly on first load
 * - Verify data is preserved during migration
 * - Check that migrations only run once
 */

import { STORAGE_VERSION } from './index';

interface MigrationResult {
  success: boolean;
  migrationsRun: string[];
  errors: string[];
}

class MigrationService {
  /**
   * Run all necessary migrations
   */
  async runMigrations(): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: true,
      migrationsRun: [],
      errors: [],
    };

    try {
      const currentVersion = this.getCurrentVersion();
      console.log(`[Migrations] Current version: ${currentVersion}, Target version: ${STORAGE_VERSION}`);

      if (currentVersion === STORAGE_VERSION) {
        console.log('[Migrations] Already on latest version');
        return result;
      }

      // Run migrations in order
      if (currentVersion === '0.0') {
        await this.migrateToV1_0(result);
      }

      // Update version
      localStorage.setItem('jukebox_version', STORAGE_VERSION);
      console.log(`[Migrations] Migration complete. Updated to version ${STORAGE_VERSION}`);

    } catch (error) {
      console.error('[Migrations] Migration failed:', error);
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    }

    return result;
  }

  /**
   * Get current storage version
   */
  private getCurrentVersion(): string {
    try {
      return localStorage.getItem('jukebox_version') || '0.0';
    } catch {
      return '0.0';
    }
  }

  /**
   * Migration to v1.0 - Consolidate duplicate storage keys
   */
  private async migrateToV1_0(result: MigrationResult): Promise<void> {
    console.log('[Migrations] Running migration to v1.0...');

    try {
      // Migrate active_playlist_url to USER_PREFERENCES if it exists
      const activePlaylistUrl = localStorage.getItem('active_playlist_url');
      if (activePlaylistUrl) {
        const userPrefs = localStorage.getItem('USER_PREFERENCES');
        if (userPrefs) {
          try {
            const prefs = JSON.parse(userPrefs);
            if (!prefs.defaultPlaylist) {
              prefs.defaultPlaylist = activePlaylistUrl;
              localStorage.setItem('USER_PREFERENCES', JSON.stringify(prefs));
              console.log('[Migrations] Migrated active_playlist_url to USER_PREFERENCES');
            }
          } catch (error) {
            console.warn('[Migrations] Failed to parse USER_PREFERENCES:', error);
          }
        }
        
        // Remove old key
        localStorage.removeItem('active_playlist_url');
        console.log('[Migrations] Removed legacy active_playlist_url key');
      }

      // Ensure PRIORITY_QUEUE key exists (even if empty)
      const priorityQueue = localStorage.getItem('PRIORITY_QUEUE');
      if (!priorityQueue) {
        localStorage.setItem('PRIORITY_QUEUE', JSON.stringify([]));
        console.log('[Migrations] Initialized PRIORITY_QUEUE');
      }

      result.migrationsRun.push('v1.0');
    } catch (error) {
      console.error('[Migrations] Error in v1.0 migration:', error);
      result.errors.push(`v1.0: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Clear all migration state (for testing)
   */
  clearMigrationState(): void {
    localStorage.removeItem('jukebox_version');
    console.log('[Migrations] Migration state cleared');
  }
}

export const migrationService = new MigrationService();

/**
 * Initialize migrations on app load
 */
export const initializeMigrations = async (): Promise<MigrationResult> => {
  console.log('[Migrations] Initializing migrations...');
  return await migrationService.runMigrations();
};
