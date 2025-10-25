/**
 * YouTube Scraper Module
 * Exports all scraper-related services (fallback methods)
 */

export { youtubeProxy, YouTubeProxyService, ProxyError, ProxyUnavailableError, ProxyTimeoutError } from '../proxy';
export { validateYtdlp, clearYtdlpCache, type YtdlpValidationResult } from './ytdlp';
export { youtubeHtmlParserService, type YouTubeVideoData } from './htmlParser';
