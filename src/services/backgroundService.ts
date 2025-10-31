/**
 * Background Service
 *
 * Manages loading and providing background assets from the backgrounds folder.
 * Loads all compatible image and video files from a manifest file.
 */

export interface BackgroundAsset {
  id: string;
  name: string;
  filename: string;
  type: 'image' | 'video';
}

export interface BackgroundFile {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'video';
}

class BackgroundService {
  private manifestUrl = '/backgrounds/manifest.json';
  private cache: BackgroundFile[] | null = null;

  /**
   * Load all background assets from the manifest
   */
  async loadBackgroundAssets(): Promise<BackgroundFile[]> {
    if (this.cache) {
      return this.cache;
    }

    try {
      const response = await fetch(this.manifestUrl);
      if (!response.ok) {
        throw new Error(`Failed to load background manifest: ${response.status}`);
      }

      const assets: BackgroundAsset[] = await response.json();

      // Convert assets to BackgroundFile format
      const backgroundFiles: BackgroundFile[] = assets.map(asset => ({
        id: asset.id,
        name: asset.name,
        url: `/backgrounds/${asset.filename}`,
        type: asset.type
      }));

      this.cache = backgroundFiles;
      return backgroundFiles;
    } catch (error) {
      console.error('Failed to load background assets:', error);
      // Return empty array as fallback
      return [];
    }
  }

  /**
   * Get a background file by ID
   */
  async getBackgroundById(id: string): Promise<BackgroundFile | null> {
    const assets = await this.loadBackgroundAssets();
    return assets.find(asset => asset.id === id) || null;
  }

  /**
   * Clear the cache (useful for development)
   */
  clearCache(): void {
    this.cache = null;
  }
}

export const backgroundService = new BackgroundService();