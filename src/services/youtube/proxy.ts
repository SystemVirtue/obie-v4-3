/**
 * YouTube Proxy Service
 * 
 * Provides abstraction layer for backend proxy communication, replacing
 * hardcoded localhost:4321 URLs throughout the codebase.
 * 
 * Features:
 * - Health checking with timeout
 * - Graceful degradation when proxy unavailable
 * - Centralized error handling
 * - Type-safe API responses
 * 
 * @module services/youtube/proxy
 */

import { config } from "@/config";
import type { Video, PlaylistItem } from "@/types/jukebox";

// ============================================================================
// Error Classes
// ============================================================================

/**
 * Base error for proxy-related failures
 */
export class ProxyError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public originalError?: Error
  ) {
    super(message);
    this.name = "ProxyError";
  }
}

/**
 * Error thrown when proxy is unavailable
 */
export class ProxyUnavailableError extends ProxyError {
  constructor(message: string = "YouTube proxy is unavailable") {
    super(message);
    this.name = "ProxyUnavailableError";
  }
}

/**
 * Error thrown when proxy request times out
 */
export class ProxyTimeoutError extends ProxyError {
  constructor(message: string = "YouTube proxy request timed out") {
    super(message);
    this.name = "ProxyTimeoutError";
  }
}

// ============================================================================
// Response Types
// ============================================================================

/**
 * Raw video data from proxy API
 */
interface ProxyVideoResponse {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl?: string;
  duration?: string;
  durationMinutes?: number;
}

/**
 * Raw playlist response from proxy API
 */
interface ProxyPlaylistResponse {
  playlistId: string;
  title: string;
  videos: ProxyVideoResponse[];
}

/**
 * Health check response
 */
interface HealthCheckResponse {
  status: "ok" | "degraded" | "error";
  version?: string;
  timestamp: number;
  ytdlp?: {
    available: boolean;
    version?: string;
  };
}

// ============================================================================
// YouTube Proxy Service Class
// ============================================================================

/**
 * Service for communicating with YouTube scraping proxy server
 */
export class YouTubeProxyService {
  private baseUrl: string;
  private isAvailableCache: boolean | null = null;
  private lastHealthCheck: number = 0;
  private readonly healthCheckCacheDuration = 30000; // 30 seconds

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || config.youtube.proxyUrl;
    console.log(`[YouTubeProxy] Initialized with base URL: ${this.baseUrl}`);
  }

  // ==========================================================================
  // Health Check
  // ==========================================================================

  /**
   * Check if the proxy server is available and healthy
   * Results are cached for 30 seconds to avoid excessive health checks
   */
  async isAvailable(): Promise<boolean> {
    const now = Date.now();

    // Return cached result if still valid
    if (
      this.isAvailableCache !== null &&
      now - this.lastHealthCheck < this.healthCheckCacheDuration
    ) {
      return this.isAvailableCache;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        config.youtube.proxyHealthCheckTimeout
      );

      const response = await fetch(`${this.baseUrl}/health`, {
        signal: controller.signal,
        method: "GET",
      });

      clearTimeout(timeoutId);

      const isAvailable = response.ok;
      this.isAvailableCache = isAvailable;
      this.lastHealthCheck = now;

      if (isAvailable) {
        const health: HealthCheckResponse = await response.json();
        console.log("[YouTubeProxy] Health check passed:", health);
      } else {
        console.warn(
          `[YouTubeProxy] Health check failed with status: ${response.status}`
        );
      }

      return isAvailable;
    } catch (error) {
      console.error("[YouTubeProxy] Health check failed:", error);
      this.isAvailableCache = false;
      this.lastHealthCheck = now;
      return false;
    }
  }

  /**
   * Get detailed health information
   */
  async getHealthInfo(): Promise<HealthCheckResponse | null> {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/health`);
      return await response.json();
    } catch (error) {
      console.error("[YouTubeProxy] Failed to get health info:", error);
      return null;
    }
  }

  /**
   * Invalidate the health check cache (force recheck on next call)
   */
  invalidateHealthCache(): void {
    this.isAvailableCache = null;
    this.lastHealthCheck = 0;
  }

  // ==========================================================================
  // Video Search
  // ==========================================================================

  /**
   * Search for videos using the proxy server
   * 
   * @param query - Search query string
   * @param maxResults - Maximum number of results to return (default: 10)
   * @returns Array of video objects
   * @throws {ProxyError} If the request fails
   */
  async searchVideos(
    query: string,
    maxResults: number = 10
  ): Promise<Video[]> {
    if (!query.trim()) {
      throw new ProxyError("Search query cannot be empty");
    }

    const url = `${this.baseUrl}/api/search?query=${encodeURIComponent(
      query
    )}&maxResults=${maxResults}`;

    console.log(`[YouTubeProxy] Searching for: "${query}" (max: ${maxResults})`);

    try {
      const response = await this.fetchWithTimeout(url);

      if (!response.ok) {
        throw new ProxyError(
          `Search failed: ${response.statusText}`,
          response.status
        );
      }

      const data: ProxyVideoResponse[] = await response.json();
      const videos = this.transformVideos(data);

      console.log(`[YouTubeProxy] Found ${videos.length} results`);
      return videos;
    } catch (error) {
      if (error instanceof ProxyError) {
        throw error;
      }
      throw this.handleFetchError(error, "search");
    }
  }

  // ==========================================================================
  // Playlist Operations
  // ==========================================================================

  /**
   * Fetch videos from a YouTube playlist
   * 
   * @param playlistId - YouTube playlist ID or full URL
   * @returns Array of playlist items
   * @throws {ProxyError} If the request fails
   */
  async getPlaylist(playlistId: string): Promise<PlaylistItem[]> {
    if (!playlistId.trim()) {
      throw new ProxyError("Playlist ID cannot be empty");
    }

    // Extract playlist ID from URL if needed
    const extractedId = this.extractPlaylistId(playlistId);

    const url = `${this.baseUrl}/api/playlist?playlist=${encodeURIComponent(
      extractedId
    )}`;

    console.log(`[YouTubeProxy] Fetching playlist: ${extractedId}`);

    try {
      const response = await this.fetchWithTimeout(url);

      if (!response.ok) {
        throw new ProxyError(
          `Playlist fetch failed: ${response.statusText}`,
          response.status
        );
      }

      let data = await response.json();
      // Handle both array and object ({ videos: [...] }) responses
      if (Array.isArray(data)) {
        // Already an array of videos
        // nothing to do
      } else if (data && Array.isArray(data.videos)) {
        data = data.videos;
      } else {
        throw new ProxyError("Unexpected playlist response format");
      }
      const videos = this.transformToPlaylistItems(data);

      console.log(`[YouTubeProxy] Loaded ${videos.length} videos from playlist`);
      return videos;
    } catch (error) {
      if (error instanceof ProxyError) {
        throw error;
      }
      throw this.handleFetchError(error, "playlist");
    }
  }

  /**
   * Get playlist metadata (title, description, etc.)
   */
  async getPlaylistInfo(playlistId: string): Promise<ProxyPlaylistResponse | null> {
    const extractedId = this.extractPlaylistId(playlistId);
    const url = `${this.baseUrl}/api/playlist/info?playlist=${encodeURIComponent(
      extractedId
    )}`;

    try {
      const response = await this.fetchWithTimeout(url);
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error("[YouTubeProxy] Failed to get playlist info:", error);
      return null;
    }
  }

  // ==========================================================================
  // Video Details
  // ==========================================================================

  /**
   * Get detailed information about a specific video
   * 
   * @param videoId - YouTube video ID
   * @returns Video object with detailed metadata
   * @throws {ProxyError} If the request fails
   */
  async getVideoDetails(videoId: string): Promise<Video> {
    if (!videoId.trim()) {
      throw new ProxyError("Video ID cannot be empty");
    }

    const url = `${this.baseUrl}/api/video?videoId=${encodeURIComponent(videoId)}`;

    console.log(`[YouTubeProxy] Fetching video details: ${videoId}`);

    try {
      const response = await this.fetchWithTimeout(url);

      if (!response.ok) {
        throw new ProxyError(
          `Video fetch failed: ${response.statusText}`,
          response.status
        );
      }

      const data: ProxyVideoResponse = await response.json();
      return this.transformVideo(data);
    } catch (error) {
      if (error instanceof ProxyError) {
        throw error;
      }
      throw this.handleFetchError(error, "video details");
    }
  }

  // ==========================================================================
  // Private Helper Methods
  // ==========================================================================

  /**
   * Fetch with timeout wrapper
   */
  private async fetchWithTimeout(
    url: string,
    timeout: number = config.youtube.proxyRequestTimeout
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        method: "GET",
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if ((error as Error).name === "AbortError") {
        throw new ProxyTimeoutError(
          `Request timed out after ${timeout}ms`
        );
      }
      throw error;
    }
  }

  /**
   * Handle fetch errors and convert to ProxyError
   */
  private handleFetchError(error: unknown, context: string): ProxyError {
    if (error instanceof ProxyTimeoutError) {
      return error;
    }

    if (error instanceof TypeError && error.message.includes("fetch")) {
      return new ProxyUnavailableError(
        `Cannot connect to proxy server (${context})`
      );
    }

    return new ProxyError(
      `Proxy request failed (${context}): ${(error as Error).message}`,
      undefined,
      error as Error
    );
  }

  /**
   * Extract playlist ID from URL or return as-is if already an ID
   */
  private extractPlaylistId(playlistInput: string): string {
    // If it's already a playlist ID (no URL), return it
    if (!playlistInput.includes("/") && !playlistInput.includes("?")) {
      return playlistInput;
    }

    // Try to extract from URL
    try {
      const url = new URL(
        playlistInput.startsWith("http")
          ? playlistInput
          : `https://www.youtube.com/${playlistInput}`
      );
      const listParam = url.searchParams.get("list");
      if (listParam) return listParam;
    } catch {
      // Not a valid URL, might be a playlist ID
    }

    // Try regex extraction
    const match = playlistInput.match(/[?&]list=([^&]+)/);
    if (match) return match[1];

    // Return as-is and let the server handle it
    return playlistInput;
  }

  /**
   * Transform raw proxy video response to application Video type
   */
  private transformVideo(raw: ProxyVideoResponse): Video {
    return {
      id: raw.videoId,
      videoId: raw.videoId,
      title: raw.title,
      channelTitle: raw.channelTitle,
      thumbnailUrl: raw.thumbnailUrl,
      duration: raw.duration,
      durationMinutes: raw.durationMinutes,
    };
  }

  /**
   * Transform array of proxy responses to Video array
   */
  private transformVideos(raw: ProxyVideoResponse[]): Video[] {
    return raw.map((video) => this.transformVideo(video));
  }

  /**
   * Transform array of proxy responses to PlaylistItem array
   */
  private transformToPlaylistItems(raw: ProxyVideoResponse[]): PlaylistItem[] {
    return raw.map((video) => ({
      ...this.transformVideo(video),
      isNowPlaying: false,
      isUserRequest: false,
    }));
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

/**
 * Singleton instance of YouTubeProxyService
 * Use this throughout the application for consistency
 */
export const youtubeProxy = new YouTubeProxyService();

/**
 * Export default for convenience
 */
export default youtubeProxy;
