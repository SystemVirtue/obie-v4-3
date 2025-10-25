/**
 * YouTube Search Module
 * Exports all search-related services
 */

export { searchFallbackChain, SearchFallbackChain, type SearchOptions, type SearchResult as FallbackSearchResult } from './fallbackChain';
export { musicSearchService, type SearchMethod } from './searchService';

// Re-export SearchResult from unified types for convenience
export type { SearchResult } from '@/types/jukebox';
