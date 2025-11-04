import { supabase } from "@/integrations/supabase/client";
import { requestQueue } from '@/services/requestQueue';
import { SearchResult } from '@/types/jukebox';
import { youtubeAPIClient } from '@/services/youtube/api/client';

/**
 * CHANGELOG - Phase 2
 * ADDED: Enhanced error handling with specific error types
 * ADDED: Improved caching strategy (15 minutes for search results)
 * ADDED: Integration with request queue for better reliability
 * 
 * CHANGELOG - Phase 3.1
 * MODIFIED: Use unified SearchResult type from @/types/jukebox
 * 
 * CHANGELOG - November 2025
 * ADDED: API-validated search for accurate category and embeddability checking
 */

import type { SearchMethod as JukeboxSearchMethod } from "@/types/jukebox";
export type SearchMethod = JukeboxSearchMethod;

interface ScraperError {
  code: 'RATE_LIMITED' | 'VIDEO_UNAVAILABLE' | 'NETWORK_ERROR' | 'PARSE_ERROR' | 'TIMEOUT';
  message: string;
  retryable: boolean;
  retryAfter?: number;
}

class MusicSearchService {
  private lastSearchTimes: { [key: string]: number } = {};
  private readonly MIN_SEARCH_INTERVAL = 1000;
  private searchCache: Map<string, { results: SearchResult[]; timestamp: number }> = new Map();
  private readonly SEARCH_CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

  constructor() {
    console.log("MusicSearchService initialized - Using keyless scraper");
  }

  /**
   * CHANGELOG - Phase 2
   * MODIFIED: Added caching and error handling improvements
   */
  async searchWithScraper(
    query: string,
    maxResults: number = 48,
  ): Promise<SearchResult[]> {
    try {
      // Check cache first
      const cacheKey = `${query}-${maxResults}`;
      const cached = this.searchCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.SEARCH_CACHE_DURATION) {
        console.log(`[MusicSearch] Returning cached results for: ${query}`);
        return cached.results;
      }

      const searchKey = `scraper-${query}`;
      const now = Date.now();
      const lastSearch = this.lastSearchTimes[searchKey] || 0;

      if (now - lastSearch < this.MIN_SEARCH_INTERVAL) {
        console.log(`[MusicSearch] Rate limited search for query: ${query}`);
        throw this.createScraperError('RATE_LIMITED', 'Search rate limited. Please wait.');
      }

      this.lastSearchTimes[searchKey] = now;

      console.log(`[MusicSearch] Calling Supabase scraper for: ${query}`);
      
      // Use request queue for better reliability
      const results = await requestQueue.enqueue(
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
            console.error('[MusicSearch] Scraper error:', error);
            throw this.handleScraperError(error);
          }

          if (!data?.videos || !Array.isArray(data.videos)) {
            console.error('[MusicSearch] Invalid scraper response:', data);
            throw this.createScraperError('PARSE_ERROR', 'Invalid response from scraper');
          }

          const mappedResults: SearchResult[] = data.videos.map((video: any) => ({
            id: video.id,
            videoId: video.id, // Add videoId for unified type
            title: video.title,
            channelTitle: video.channelTitle,
            thumbnailUrl: video.thumbnailUrl,
            videoUrl: video.videoUrl,
            duration: video.duration,
            durationMinutes: video.durationMinutes,
            officialScore: 0,
          }));

          return this.filterForOfficial(mappedResults, query);
        },
        'high'
      );

      // Cache results
      this.searchCache.set(cacheKey, { results, timestamp: Date.now() });
      console.log(`[MusicSearch] Cached search results for: ${query}`);

      return results;
    } catch (error) {
      console.error("Scraper search error:", error);
      throw error;
    }
  }

  /**
   * CHANGELOG - Phase 2
   * ADDED: Enhanced error handling with specific error types
   */
  private handleScraperError(error: any): Error {
    if (error.message?.includes('429')) {
      return this.createScraperError('RATE_LIMITED', 'YouTube rate limit reached', 300);
    }
    if (error.message?.includes('404')) {
      return this.createScraperError('VIDEO_UNAVAILABLE', 'Content not found');
    }
    if (error.message?.includes('timeout')) {
      return this.createScraperError('TIMEOUT', 'Request timed out', 10);
    }
    if (error.message?.includes('network') || error.message?.includes('fetch')) {
      return this.createScraperError('NETWORK_ERROR', 'Network connection failed', 5);
    }
    return this.createScraperError('PARSE_ERROR', error.message || 'Unknown error occurred');
  }

  private createScraperError(code: ScraperError['code'], message: string, retryAfter?: number): Error {
    const error = new Error(message) as Error & { code: string; retryAfter?: number };
    error.code = code;
    if (retryAfter) error.retryAfter = retryAfter;
    return error;
  }

  /**
   * Clear search cache
   */
  clearCache(): void {
    this.searchCache.clear();
    console.log('[MusicSearch] Search cache cleared');
  }

  /**
   * Search with API validation for accurate category and embeddability checking
   * Uses scraper for initial search, then validates with YouTube API
   * @param query - Search query
   * @param apiKey - YouTube API key
   * @param maxResults - Maximum results to return
   * @returns Validated search results (music videos only, embeddable only)
   */
  async searchWithAPIValidation(
    query: string,
    apiKey: string,
    maxResults: number = 48,
  ): Promise<SearchResult[]> {
    try {
      // Check cache first
      const cacheKey = `validated-${query}-${maxResults}`;
      const cached = this.searchCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.SEARCH_CACHE_DURATION) {
        console.log(`[MusicSearch] Returning cached validated results for: ${query}`);
        return cached.results;
      }

      console.log(`[MusicSearch] Starting API-validated search for: ${query}`);

      // Step 1: Get initial results from scraper (fast, free)
      const scraperResults = await this.searchWithScraper(query, maxResults);
      
      if (scraperResults.length === 0) {
        console.log(`[MusicSearch] No scraper results found for: ${query}`);
        return [];
      }

      console.log(`[MusicSearch] Scraper returned ${scraperResults.length} results, validating with API...`);

      // Step 2: Get video IDs for API validation
      const videoIds = scraperResults.map(v => v.id).slice(0, 50); // API limit

      // Step 3: Fetch detailed info from YouTube API (category, embeddability)
      const videoDetails = await youtubeAPIClient.getVideosDetails(videoIds, apiKey);

      // Step 4: Merge API data with scraper results and filter
      const validatedResults: SearchResult[] = [];
      let filteredNonMusic = 0;
      let filteredNonEmbeddable = 0;

      for (const video of scraperResults) {
        const details = videoDetails[video.id];
        
        if (!details) {
          // Video not found in API response (might be deleted/private)
          console.log(`[MusicSearch] No API details for video: ${video.id}`);
          continue;
        }

        // Filter: Must be music category (ID 10)
        if (details.categoryId !== '10') {
          console.log(`[MusicSearch] Filtered non-music video: ${video.title} (category: ${details.categoryId})`);
          filteredNonMusic++;
          continue;
        }

        // Filter: Must be embeddable
        if (!details.isEmbeddable) {
          console.log(`[MusicSearch] Filtered non-embeddable video: ${video.title}`);
          filteredNonEmbeddable++;
          continue;
        }

        // Add validated video with API data
        validatedResults.push({
          ...video,
          categoryId: details.categoryId,
          isEmbeddable: details.isEmbeddable,
          duration: details.duration,
          durationMinutes: details.durationMinutes,
        });
      }

      console.log(`[MusicSearch] API Validation Results:
        - Initial: ${scraperResults.length} videos
        - Filtered non-music: ${filteredNonMusic}
        - Filtered non-embeddable: ${filteredNonEmbeddable}
        - Final validated: ${validatedResults.length} videos`);

      // Cache validated results
      this.searchCache.set(cacheKey, { results: validatedResults, timestamp: Date.now() });

      return validatedResults;
    } catch (error) {
      console.error('[MusicSearch] API validation error:', error);
      
      // If API validation fails, fall back to scraper-only
      console.warn('[MusicSearch] Falling back to scraper-only search');
      return this.searchWithScraper(query, maxResults);
    }
  }

  async search(
    query: string,
    method: SearchMethod,
    apiKey?: string,
    maxResults: number = 48,
  ): Promise<SearchResult[]> {
    // If API key provided and scraper method, use API-validated search
    if (apiKey && apiKey.trim() !== "" && method === "scraper") {
      console.log(`[MusicSearch] Using API-validated search with key: ${apiKey.substring(0, 8)}...`);
      return this.searchWithAPIValidation(query, apiKey, maxResults);
    }

    // Otherwise use original methods
    switch (method) {
      case "scraper":
        return this.searchWithScraper(query, maxResults);

      case "iframe_search":
        console.log(`[MusicSearch] Using iframe proxy fallback: ${query}`);
        try {
          const searchUrl = `http://localhost:4321/api/search?query=${encodeURIComponent(query)}&maxResults=${maxResults}`;
          const response = await fetch(searchUrl);
          if (!response.ok) {
            throw new Error(`Proxy search failed: ${response.status}`);
          }
          const data = await response.json();
          if (!data.results || !Array.isArray(data.results)) {
            throw new Error("Malformed search response from proxy");
          }
          return data.results.map((video: any) => ({
            id: video.id,
            videoId: video.id, // Add videoId for unified type
            title: video.title,
            channelTitle: video.channelTitle,
            thumbnailUrl: video.thumbnailUrl,
            videoUrl: video.videoUrl,
            duration: video.duration,
            officialScore: 0,
          }));
        } catch (err) {
          console.error("Proxy search error:", err);
          throw new Error("Unable to fetch search results from proxy backend.");
        }

      default:
        throw new Error(`Unsupported search method: ${method}`);
    }
  }


  private filterForOfficial(
    videos: SearchResult[],
    originalQuery: string,
  ): SearchResult[] {
    const officialKeywords = [
      "official video",
      "official music video",
      "official audio",
      "official lyric video",
      "vevo",
      "official channel",
    ];

    return videos
      .map((video) => {
        let score = 0;
        const titleLower = video.title.toLowerCase();
        const channelTitleLower = video.channelTitle.toLowerCase();

        if (channelTitleLower.includes("vevo")) score += 10;

        for (const keyword of officialKeywords) {
          if (titleLower.includes(keyword)) {
            score += 3;
            break;
          }
        }

        if (channelTitleLower.includes("official")) score += 3;
        if (titleLower.includes("cover") || titleLower.includes("remix"))
          score -= 5;
        if (titleLower.includes("karaoke")) score += 3;

        return {
          ...video,
          officialScore: score,
        };
      })
      .filter((video) => (video.officialScore || 0) >= 0)
      .sort((a, b) => (b.officialScore || 0) - (a.officialScore || 0));
  }
}

export const musicSearchService = new MusicSearchService();
