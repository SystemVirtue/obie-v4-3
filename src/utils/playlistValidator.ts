/**
 * CHANGELOG - 2025-01-XX
 * 
 * ADDED:
 * - YouTube playlist URL validation
 * - Playlist ID extraction from various formats
 * - Pattern matching for different URL types
 * 
 * TESTING:
 * - Test with valid playlist URLs (full URLs, short URLs, IDs only)
 * - Test with invalid URLs and verify error messages
 * - Verify all YouTube playlist URL formats are supported
 */

export interface PlaylistValidationResult {
  isValid: boolean;
  playlistId: string | null;
  error?: string;
}

/**
 * Validates YouTube playlist URLs and extracts playlist IDs
 * 
 * Supports multiple formats:
 * - https://www.youtube.com/playlist?list=PLxxx
 * - https://www.youtube.com/watch?v=xxx&list=PLxxx
 * - https://youtu.be/xxx?list=PLxxx
 * - PLxxx (direct playlist ID)
 * - UUxxx (channel upload playlist)
 */
export function validatePlaylistUrl(input: string): PlaylistValidationResult {
  if (!input || input.trim().length === 0) {
    return {
      isValid: false,
      playlistId: null,
      error: 'Playlist URL or ID cannot be empty'
    };
  }

  const trimmedInput = input.trim();

  // Pattern 1: URL with list parameter (most common)
  // Example: https://www.youtube.com/playlist?list=PLxxx
  // Example: https://www.youtube.com/watch?v=xxx&list=PLxxx
  const urlPattern = /[?&]list=([a-zA-Z0-9_-]+)/;
  const urlMatch = trimmedInput.match(urlPattern);
  
  if (urlMatch && urlMatch[1]) {
    return validatePlaylistId(urlMatch[1]);
  }

  // Pattern 2: Direct playlist ID starting with PL (standard playlists)
  // Example: PLN9QqCogPsXJCgeL_iEgYnW6Rl_8nIUUH
  const plPattern = /^(PL[a-zA-Z0-9_-]{16,34})$/;
  const plMatch = trimmedInput.match(plPattern);
  
  if (plMatch) {
    return {
      isValid: true,
      playlistId: plMatch[1]
    };
  }

  // Pattern 3: Channel upload playlist (starts with UU)
  // Example: UUxxx (Uploads from channel)
  const uuPattern = /^(UU[a-zA-Z0-9_-]{22})$/;
  const uuMatch = trimmedInput.match(uuPattern);
  
  if (uuMatch) {
    return {
      isValid: true,
      playlistId: uuMatch[1]
    };
  }

  // Pattern 4: Other valid playlist ID patterns
  // Includes OLAK (albums), RDCLAK (radio), etc.
  const otherPattern = /^((?:PL|UU|LL|RD|OL|FL)[a-zA-Z0-9_-]+)$/;
  const otherMatch = trimmedInput.match(otherPattern);
  
  if (otherMatch) {
    return {
      isValid: true,
      playlistId: otherMatch[1]
    };
  }

  // No valid pattern matched
  return {
    isValid: false,
    playlistId: null,
    error: 'Invalid YouTube playlist URL or ID format. Please use a full YouTube playlist URL or a valid playlist ID starting with PL, UU, etc.'
  };
}

/**
 * Validate extracted playlist ID format
 */
function validatePlaylistId(id: string): PlaylistValidationResult {
  // Check minimum length
  if (id.length < 10) {
    return {
      isValid: false,
      playlistId: null,
      error: 'Playlist ID is too short'
    };
  }

  // Check maximum length (YouTube playlist IDs are typically 34 characters max)
  if (id.length > 50) {
    return {
      isValid: false,
      playlistId: null,
      error: 'Playlist ID is too long'
    };
  }

  // Valid characters check
  const validChars = /^[a-zA-Z0-9_-]+$/;
  if (!validChars.test(id)) {
    return {
      isValid: false,
      playlistId: null,
      error: 'Playlist ID contains invalid characters'
    };
  }

  return {
    isValid: true,
    playlistId: id
  };
}

/**
 * Extract playlist ID from URL without validation
 * (for backward compatibility)
 */
export function extractPlaylistId(url: string): string | null {
  const result = validatePlaylistUrl(url);
  return result.playlistId;
}
