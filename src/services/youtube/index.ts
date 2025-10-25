/**
 * YouTube Service Module
 * Central export point for all YouTube-related services
 * 
 * Organization:
 * - api/: YouTube Data API v3 client, quota management, key rotation
 * - scraper/: Fallback methods (proxy, yt-dlp, HTML parser)
 * - search/: Unified search with automatic fallback chain
 */

// API exports
export * from './api';

// Scraper exports
export * from './scraper';

// Search exports
export * from './search';

// Re-export commonly used services for convenience
export { youtubeAPIClient } from './api/client';
export { youtubeQuotaService } from './api/quota';
export { apiKeyRotation } from './api/keyRotation';
export { youtubeProxy } from './proxy';
export { searchFallbackChain } from './search/fallbackChain';
export { validateYtdlp } from './scraper/ytdlp';
