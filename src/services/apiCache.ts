/**
 * API Caching Service
 * Provides caching layer for YouTube API calls to reduce redundant requests
 * and improve performance
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

export class ApiCacheService {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_TTL = 15 * 60 * 1000; // 15 minutes default

  /**
   * Get cached data if available and not expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    console.log(`[ApiCache] Cache hit for key: ${key}`);
    return entry.data;
  }

  /**
   * Store data in cache with optional TTL
   */
  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
    console.log(`[ApiCache] Cached data for key: ${key}`);
  }

  /**
   * Check if key exists in cache and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Remove specific key from cache
   */
  delete(key: string): void {
    this.cache.delete(key);
    console.log(`[ApiCache] Deleted cache entry: ${key}`);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    console.log('[ApiCache] Cache cleared');
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  /**
   * Clean expired entries
   */
  cleanExpired(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));

    if (keysToDelete.length > 0) {
      console.log(`[ApiCache] Cleaned ${keysToDelete.length} expired entries`);
    }
  }

  /**
   * Make a cached API request
   */
  async cachedFetch<T>(
    url: string,
    options?: RequestInit,
    cacheKey?: string,
    ttl?: number
  ): Promise<T> {
    const key = cacheKey || url;

    // Check cache first
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Make the request
    console.log(`[ApiCache] Making API request: ${url}`);
    const response = await fetch(url, options);

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Cache the result
    this.set(key, data, ttl);

    return data;
  }

  /**
   * Generate cache key for YouTube API requests
   */
  generateYouTubeCacheKey(endpoint: string, params: Record<string, string>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');

    return `youtube:${endpoint}:${sortedParams}`;
  }
}

// Singleton instance
export const apiCacheService = new ApiCacheService();

// Clean expired entries every 5 minutes
setInterval(() => {
  apiCacheService.cleanExpired();
}, 5 * 60 * 1000);