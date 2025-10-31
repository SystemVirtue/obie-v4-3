import type { AdaptiveQuality } from '../hooks/useSystemMonitor';

export interface YouTubePlayerQuality {
  setPlaybackQuality: (quality: string) => void;
  setPlaybackQualityRange?: (min: string, max: string) => void;
  getPlaybackQuality: () => string;
}

/**
 * Maps adaptive quality levels to YouTube player quality strings
 */
export function mapAdaptiveQualityToYouTube(quality: AdaptiveQuality): string {
  switch (quality) {
    case 'hd1080':
      return 'hd1080';
    case 'hd720':
      return 'hd720';
    case 'medium':
      return 'medium';
    case 'small':
      return 'small';
    default:
      return 'hd720';
  }
}

/**
 * Maps adaptive quality to YouTube iframe vq parameter
 */
export function mapAdaptiveQualityToVQ(quality: AdaptiveQuality): string {
  switch (quality) {
    case 'hd1080':
      return 'hd1080';
    case 'hd720':
      return 'hd720';
    case 'medium':
      return 'medium';
    case 'small':
      return 'small';
    default:
      return 'hd720';
  }
}

/**
 * Applies adaptive quality to a YouTube iframe by updating the src URL
 */
export function applyAdaptiveQualityToIframe(
  iframe: HTMLIFrameElement,
  quality: AdaptiveQuality
): void {
  if (!iframe || !iframe.src) return;

  try {
    const url = new URL(iframe.src);
    const vq = mapAdaptiveQualityToVQ(quality);

    // Set the vq parameter
    url.searchParams.set('vq', vq);

    // Update the iframe src
    iframe.src = url.toString();
  } catch (error) {
    console.warn('Failed to apply adaptive quality to iframe:', error);
  }
}

/**
 * Applies adaptive quality to a YouTube Player API instance
 */
export function applyAdaptiveQualityToPlayer(
  player: YouTubePlayerQuality,
  quality: AdaptiveQuality
): void {
  if (!player) return;

  try {
    const ytQuality = mapAdaptiveQualityToYouTube(quality);

    // Set the playback quality
    player.setPlaybackQuality(ytQuality);

    // If available, set the quality range to enforce the cap
    if (player.setPlaybackQualityRange) {
      player.setPlaybackQualityRange('small', ytQuality);
    }
  } catch (error) {
    console.warn('Failed to apply adaptive quality to player:', error);
  }
}

/**
 * Creates a YouTube embed URL with adaptive quality parameters
 */
export function createAdaptiveYouTubeUrl(
  videoId: string,
  quality: AdaptiveQuality,
  additionalParams: Record<string, string> = {}
): string {
  const baseUrl = 'https://www.youtube.com/embed/';
  const url = new URL(`${baseUrl}${videoId}`);

  // Set adaptive quality
  const vq = mapAdaptiveQualityToVQ(quality);
  url.searchParams.set('vq', vq);

  // Add any additional parameters
  Object.entries(additionalParams).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  return url.toString();
}

/**
 * Hook for managing adaptive quality in YouTube players
 */
export function useAdaptiveYouTubePlayer(
  enabled: boolean,
  quality: AdaptiveQuality
) {
  const applyQuality = (player: YouTubePlayerQuality | null) => {
    if (!enabled || !player) return;

    applyAdaptiveQualityToPlayer(player, quality);
  };

  const createUrl = (videoId: string, params: Record<string, string> = {}) => {
    if (!enabled) {
      // Return standard URL without quality restrictions
      const baseUrl = 'https://www.youtube.com/embed/';
      const url = new URL(`${baseUrl}${videoId}`);
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
      return url.toString();
    }

    return createAdaptiveYouTubeUrl(videoId, quality, params);
  };

  return {
    applyQuality,
    createUrl,
  };
}