/**
 * Search Fallback Chain
 * Implements a cascading fallback strategy for YouTube search:
 * 1. YouTube Data API (with key rotation)
 * 2. Backend proxy (yt-dlp)
 * 3. Supabase edge function scraper
 */

import { Video } from '@/types/jukebox';
import { youtubeAPIClient } from '../api/client';
import { apiKeyRotation } from '../api/keyRotation';
import { youtubeProxy } from '../proxy';
import { supabase } from '@/integrations/supabase/client';
import { requestQueue } from '@/services/requestQueue';

export type SearchMethod = 'api' | 'proxy' | 'scraper';

export interface SearchOptions {
  maxResults: number;
  preferredMethod?: SearchMethod;
  enableFallback?: boolean;
  currentApiKey?: string;
  customApiKey?: string;
}

export interface SearchResult {
  videos: Video[];
  method: SearchMethod;
  fallbackUsed: boolean;
}

export class SearchFallbackChain {
  /**
   * Search with automatic fallback
   */
  async search(query: string, options: SearchOptions): Promise<SearchResult> {
    const {
      maxResults,
      preferredMethod = 'api',
      enableFallback = true,
      currentApiKey,
      customApiKey,
    } = options;

    // Try methods in order based on preference
    const methods: SearchMethod[] = this.getMethodOrder(preferredMethod);
    
    let lastError: Error | null = null;
    
    for (let i = 0; i < methods.length; i++) {
      const method = methods[i];
      const isLastMethod = i === methods.length - 1;
      
      try {
        console.log(`[SearchFallback] Attempting ${method} search for: "${query}"`);
        
        const videos = await this.executeSearch(method, query, maxResults, currentApiKey, customApiKey);
        
        console.log(`[SearchFallback] ${method} search successful, ${videos.length} results`);
        
        return {
          videos,
          method,
          fallbackUsed: i > 0, // True if not the first method
        };
      } catch (error) {
        lastError = error as Error;
        console.error(`[SearchFallback] ${method} search failed:`, error);
        
        // If this is the last method or fallback is disabled, throw
        if (isLastMethod || !enableFallback) {
          throw lastError;
        }
        
        // Otherwise, continue to next method
        console.log(`[SearchFallback] Falling back to next method...`);
      }
    }

    // Should never reach here, but just in case
    throw lastError || new Error('All search methods failed');
  }

  /**
   * Determine method order based on preference
   */
  private getMethodOrder(preferred: SearchMethod): SearchMethod[] {
    const allMethods: SearchMethod[] = ['api', 'proxy', 'scraper'];
    
    // Put preferred method first, then the rest
    const order = [preferred];
    allMethods.forEach(method => {
      if (method !== preferred) {
        order.push(method);
      }
    });
    
    return order;
  }

  /**
   * Execute search using a specific method
   */
  private async executeSearch(
    method: SearchMethod,
    query: string,
    maxResults: number,
    currentApiKey?: string,
    customApiKey?: string
  ): Promise<Video[]> {
    switch (method) {
      case 'api':
        return await this.searchWithAPI(query, maxResults, currentApiKey, customApiKey);
      
      case 'proxy':
        return await this.searchWithProxy(query, maxResults);
      
      case 'scraper':
        return await this.searchWithScraper(query, maxResults);
      
      default:
        throw new Error(`Unknown search method: ${method}`);
    }
  }

  /**
   * Search using YouTube Data API
   */
  private async searchWithAPI(
    query: string,
    maxResults: number,
    currentApiKey?: string,
    customApiKey?: string
  ): Promise<Video[]> {
    // Get available key (may trigger rotation)
    const apiKey = currentApiKey || (await this.getAvailableAPIKey(customApiKey));
    
    if (!apiKey) {
      throw new Error('No API key available');
    }

    try {
      const videos = await youtubeAPIClient.search(query, maxResults, apiKey);
      return videos;
    } catch (error) {
      const err = error as Error;
      
      // If quota exceeded, try to rotate
      if (err.message === 'QUOTA_EXCEEDED' && currentApiKey) {
        console.log('[SearchFallback] Quota exceeded, attempting rotation...');
        const nextKey = await apiKeyRotation.getNextAvailableKey(currentApiKey, customApiKey);
        
        if (nextKey && nextKey !== currentApiKey) {
          apiKeyRotation.recordRotation(currentApiKey, nextKey, 'Quota exceeded during search');
          // Retry with new key
          return await youtubeAPIClient.search(query, maxResults, nextKey);
        }
      }
      
      throw error;
    }
  }

  /**
   * Search using backend proxy (yt-dlp)
   */
  private async searchWithProxy(query: string, maxResults: number): Promise<Video[]> {
    // Check if proxy is available
    const available = await youtubeProxy.isAvailable();
    
    if (!available) {
      throw new Error('Proxy service not available');
    }

    return await youtubeProxy.searchVideos(query, maxResults);
  }

  /**
   * Search using Supabase edge function scraper
   */
  private async searchWithScraper(query: string, maxResults: number): Promise<Video[]> {
    return await requestQueue.enqueue(
      'search',
      'youtube-scraper',
      { action: 'search', query, limit: maxResults },
      async () => {
        const { data, error } = await supabase.functions.invoke('youtube-scraper', {
          body: JSON.stringify({
            action: 'search',
            query,
            limit: maxResults,
          }),
        });

        if (error) {
          throw error;
        }

            import { youtubeAPIClient } from '../api/client';
            import { apiKeyRotation } from '../api/keyRotation';
            import type { SearchMethod } from '@/types/jukebox';

        return data.videos.map((video: any) => ({
          id: video.id,
          title: video.title,
          channelTitle: video.channelTitle,
          thumbnailUrl: video.thumbnailUrl,
          videoUrl: video.videoUrl,
          duration: video.duration || '',
        }));
      }
    );
  }

  /**
   * Get an available API key (may trigger rotation)
   */
  private async getAvailableAPIKey(customKey?: string): Promise<string | null> {
    const availableKeys = apiKeyRotation.getAvailableKeys(customKey, true);
    
    if (availableKeys.length === 0) {
      return null;
    }

    // Return first available key
    // (In a real implementation, this would check quota and rotate if needed)
    return availableKeys[0];
  }
}

// Singleton instance
export const searchFallbackChain = new SearchFallbackChain();
