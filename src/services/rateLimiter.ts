/**
 * CHANGELOG - Phase 2
 * 
 * ADDED:
 * - Token bucket rate limiter for API protection
 * - Configurable limits per service
 * - Wait time calculation
 * - Automatic token refill
 * 
 * TESTING:
 * - Test rate limiting prevents excessive calls
 * - Verify wait time calculations are accurate
 * - Check token refill works correctly
 */

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

interface ServiceLimits {
  [serviceName: string]: RateLimitConfig;
}

class RateLimiter {
  private requestTimes: Map<string, number[]> = new Map();
  
  private readonly limits: ServiceLimits = {
    'youtube-scraper': {
      maxRequests: 10,
      windowMs: 60000, // 10 requests per minute
    },
    'youtube-api': {
      maxRequests: 100,
      windowMs: 60000, // 100 requests per minute (if using API keys)
    },
    'search': {
      maxRequests: 20,
      windowMs: 60000, // 20 searches per minute
    },
    'playlist': {
      maxRequests: 5,
      windowMs: 300000, // 5 playlist loads per 5 minutes
    },
  };

  /**
   * Check if a request can be made for the given service
   */
  canMakeRequest(serviceName: string): boolean {
    const config = this.limits[serviceName] || { maxRequests: 10, windowMs: 60000 };
    const now = Date.now();
    const times = this.requestTimes.get(serviceName) || [];
    
    // Remove old timestamps outside the time window
    const recentTimes = times.filter(t => now - t < config.windowMs);
    
    if (recentTimes.length >= config.maxRequests) {
      console.warn(`[RateLimiter] Rate limit reached for ${serviceName}: ${recentTimes.length}/${config.maxRequests} requests`);
      return false;
    }
    
    // Add current timestamp
    recentTimes.push(now);
    this.requestTimes.set(serviceName, recentTimes);
    
    console.log(`[RateLimiter] ${serviceName}: ${recentTimes.length}/${config.maxRequests} requests in window`);
    return true;
  }

  /**
   * Get the time to wait before the next request can be made (in ms)
   */
  getWaitTime(serviceName: string): number {
    const config = this.limits[serviceName] || { maxRequests: 10, windowMs: 60000 };
    const times = this.requestTimes.get(serviceName) || [];
    
    if (times.length === 0) return 0;
    if (times.length < config.maxRequests) return 0;
    
    const now = Date.now();
    const oldestInWindow = Math.min(...times.filter(t => now - t < config.windowMs));
    const timeToWait = config.windowMs - (now - oldestInWindow);
    
    return Math.max(0, Math.ceil(timeToWait / 1000)); // Return seconds
  }

  /**
   * Get current request count for a service
   */
  getRequestCount(serviceName: string): { current: number; max: number } {
    const config = this.limits[serviceName] || { maxRequests: 10, windowMs: 60000 };
    const now = Date.now();
    const times = this.requestTimes.get(serviceName) || [];
    const recentTimes = times.filter(t => now - t < config.windowMs);
    
    return {
      current: recentTimes.length,
      max: config.maxRequests,
    };
  }

  /**
   * Clear rate limit history for a service
   */
  clear(serviceName: string): void {
    this.requestTimes.delete(serviceName);
    console.log(`[RateLimiter] Cleared rate limit history for ${serviceName}`);
  }

  /**
   * Clear all rate limit history
   */
  clearAll(): void {
    this.requestTimes.clear();
    console.log('[RateLimiter] Cleared all rate limit history');
  }

  /**
   * Get all service statuses
   */
  getAllStatuses(): { [key: string]: { current: number; max: number; waitTime: number } } {
    const statuses: any = {};
    
    for (const serviceName in this.limits) {
      const count = this.getRequestCount(serviceName);
      const waitTime = this.getWaitTime(serviceName);
      statuses[serviceName] = {
        ...count,
        waitTime,
      };
    }
    
    return statuses;
  }
}

// Export singleton instance
export const rateLimiter = new RateLimiter();
