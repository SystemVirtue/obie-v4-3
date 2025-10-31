/**
 * YouTube Data API v3 Client
 * Handles direct API calls to YouTube with proper error handling
 */

import { config } from '@/config';
import { Video, PlaylistItem } from '@/types/jukebox';
import { apiCacheService } from '@/services/apiCache';

export interface YouTubeAPIError {
  code: number;
  message: string;
  errors?: Array<{
    domain: string;
    reason: string;
    message: string;
  }>;
}

export class YouTubeAPIClient {
  private readonly BASE_URL = 'https://www.googleapis.com/youtube/v3';
  
  /**
   * Make a generic YouTube API request with caching
   */
  private async makeRequest<T>(
    endpoint: string,
    params: Record<string, string>,
    apiKey: string
  ): Promise<T> {
    const url = new URL(`${this.BASE_URL}/${endpoint}`);
    
    // Add all parameters including the API key
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
    url.searchParams.append('key', apiKey);

    const fullUrl = url.toString();
    const cacheKey = apiCacheService.generateYouTubeCacheKey(endpoint, { ...params, key: apiKey });

    console.log(`[YouTube API] ${endpoint} request:`, params);

    try {
      const data = await apiCacheService.cachedFetch<T>(
        fullUrl,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        },
        cacheKey,
        15 * 60 * 1000 // 15 minutes TTL
      );

      return data;
    } catch (error: any) {
      // If it's a fetch error, check if it's an API error
      if (error.message?.includes('API request failed')) {
        // Try to parse the error response
        try {
          const response = await fetch(fullUrl);
          const errorData = await response.json();
          
          if (!response.ok) {
            const apiError = errorData as { error: YouTubeAPIError };
            console.error(`[YouTube API] ${endpoint} error:`, apiError);
            
            // Throw specific error based on status code
            if (response.status === 403) {
              if (apiError.error.errors?.[0]?.reason === 'quotaExceeded') {
                throw new Error('QUOTA_EXCEEDED');
              }
              throw new Error('API_KEY_INVALID');
            }
            
            if (response.status === 400) {
              throw new Error('INVALID_REQUEST');
            }
            
            throw new Error(apiError.error.message || 'YouTube API request failed');
          }
          
          return errorData;
        } catch (parseError) {
          // If we can't parse the error, re-throw the original error
          throw error;
        }
      }
      
      // Re-throw non-API errors
      throw error;
    }
  }

  /**
   * Search for videos
   */
  async search(query: string, maxResults: number, apiKey: string): Promise<Video[]> {
    interface SearchResponse {
      items: Array<{
        id: { videoId: string };
        snippet: {
          title: string;
          channelTitle: string;
          thumbnails: {
            high: { url: string };
          };
        };
      }>;
    }

    const data = await this.makeRequest<SearchResponse>('search', {
      part: 'snippet',
      q: query,
      type: 'video',
      maxResults: maxResults.toString(),
      videoCategoryId: '10', // Music category
    }, apiKey);

    // Get video IDs for duration lookup
    const videoIds = data.items.map(item => item.id.videoId);
    const durations = await this.getVideoDurations(videoIds, apiKey);

    return data.items.map((item, index) => ({
      id: item.id.videoId,
      videoId: item.id.videoId,
      title: item.snippet.title,
      channelTitle: item.snippet.channelTitle,
      thumbnailUrl: item.snippet.thumbnails.high.url,
      videoUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      duration: durations[item.id.videoId] || '',
    }));
  }

  /**
   * Get playlist items
   */
  async getPlaylist(playlistId: string, apiKey: string): Promise<PlaylistItem[]> {
    interface PlaylistResponse {
      items: Array<{
        snippet: {
          resourceId: { videoId: string };
          title: string;
          channelTitle: string;
          thumbnails: {
            high: { url: string };
          };
        };
      }>;
      nextPageToken?: string;
    }

    const items: PlaylistItem[] = [];
    let pageToken: string | undefined;

    // Fetch all pages (up to 2000 items total)
    do {
      const params: Record<string, string> = {
        part: 'snippet',
        playlistId,
        maxResults: '50',
      };
      
      if (pageToken) {
        params.pageToken = pageToken;
      }

      const data = await this.makeRequest<PlaylistResponse>('playlistItems', params, apiKey);
      
      items.push(...data.items.map(item => ({
        id: item.snippet.resourceId.videoId,
        videoId: item.snippet.resourceId.videoId,
        title: item.snippet.title,
        channelTitle: item.snippet.channelTitle,
        thumbnailUrl: item.snippet.thumbnails.high.url,
        videoUrl: `https://www.youtube.com/watch?v=${item.snippet.resourceId.videoId}`,
        duration: '',
      })));

      pageToken = data.nextPageToken;
    } while (pageToken && items.length < 2000);

    return items;
  }

  /**
   * Get video details (including duration)
   */
  async getVideoDetails(videoId: string, apiKey: string): Promise<Video> {
    interface VideoResponse {
      items: Array<{
        id: string;
        snippet: {
          title: string;
          channelTitle: string;
          thumbnails: {
            high: { url: string };
          };
        };
        contentDetails: {
          duration: string; // ISO 8601 format (PT4M13S)
        };
      }>;
    }

    const data = await this.makeRequest<VideoResponse>('videos', {
      part: 'snippet,contentDetails',
      id: videoId,
    }, apiKey);

    if (!data.items || data.items.length === 0) {
      throw new Error('Video not found');
    }

    const video = data.items[0];
    
    return {
      id: video.id,
      videoId: video.id,
      title: video.snippet.title,
      channelTitle: video.snippet.channelTitle,
      thumbnailUrl: video.snippet.thumbnails.high.url,
      videoUrl: `https://www.youtube.com/watch?v=${video.id}`,
      duration: this.formatDuration(video.contentDetails.duration),
    };
  }

  /**
   * Get durations for multiple videos (batch operation)
   */
  private async getVideoDurations(videoIds: string[], apiKey: string): Promise<Record<string, string>> {
    if (videoIds.length === 0) return {};

    interface VideoResponse {
      items: Array<{
        id: string;
        contentDetails: {
          duration: string;
        };
      }>;
    }

    const data = await this.makeRequest<VideoResponse>('videos', {
      part: 'contentDetails',
      id: videoIds.join(','),
    }, apiKey);

    const durations: Record<string, string> = {};
    data.items.forEach(item => {
      durations[item.id] = this.formatDuration(item.contentDetails.duration);
    });

    return durations;
  }

  /**
   * Convert ISO 8601 duration to readable format (e.g., "4:13")
   */
  private formatDuration(isoDuration: string): string {
    const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return '';

    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}

// Singleton instance
export const youtubeAPIClient = new YouTubeAPIClient();
