/**
 * CHANGELOG - 2025-01-XX
 * 
 * ADDED:
 * - Zod schemas for all localStorage data types
 * - Runtime validation for stored data
 * - Type-safe interfaces derived from schemas
 * 
 * TESTING:
 * - Verify data validation catches corrupted localStorage data
 * - Check that defaults are applied when validation fails
 */

import { z } from 'zod';

// User Preferences Schema
export const UserPreferencesSchema = z.object({
  mode: z.enum(['FREEPLAY', 'PAID']),
  credits: z.number().min(0),
  defaultPlaylist: z.string(),
  apiKey: z.string(),
  selectedApiKeyOption: z.string(),
  customApiKey: z.string(),
  autoRotateApiKeys: z.boolean(),
  searchMethod: z.enum(['api', 'scraper', 'hybrid']),
  selectedCoinAcceptor: z.string(),
  selectedBackground: z.string(),
  cycleBackgrounds: z.boolean(),
  bounceVideos: z.boolean(),
  maxSongLength: z.number().min(1).max(60),
  showMiniPlayer: z.boolean(),
  testMode: z.boolean(),
  coinValueA: z.number().min(0),
  coinValueB: z.number().min(0),
});

export type UserPreferences = z.infer<typeof UserPreferencesSchema>;

// Queued Request Schema
export const QueuedRequestSchema = z.object({
  id: z.string(),
  title: z.string(),
  channelTitle: z.string(),
  videoId: z.string(),
  timestamp: z.string(),
});

export type QueuedRequest = z.infer<typeof QueuedRequestSchema>;

// Priority Queue Schema
export const PriorityQueueSchema = z.array(QueuedRequestSchema);

// Playlist Item Schema
export const PlaylistItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  channelTitle: z.string(),
  videoId: z.string(),
  isNowPlaying: z.boolean().optional(),
  isUserRequest: z.boolean().optional(),
});

export type PlaylistItem = z.infer<typeof PlaylistItemSchema>;

// Active Playlist Schema
export const ActivePlaylistSchema = z.object({
  id: z.string(),
  videos: z.array(PlaylistItemSchema),
  lastUpdated: z.string(),
});

export type ActivePlaylist = z.infer<typeof ActivePlaylistSchema>;

// Now Playing Schema
export const NowPlayingSchema = z.object({
  videoId: z.string(),
  title: z.string(),
  channelTitle: z.string(),
  timestamp: z.string(),
}).nullable();

export type NowPlaying = z.infer<typeof NowPlayingSchema>;

// Player Window State Schema
export const PlayerWindowStateSchema = z.object({
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
  size: z.object({
    width: z.number(),
    height: z.number(),
  }),
  displayId: z.string(),
  isFullscreen: z.boolean(),
  lastUpdated: z.string(),
});

export type PlayerWindowState = z.infer<typeof PlayerWindowStateSchema>;

// Custom Playlist Schema (for future use)
export const CustomPlaylistSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string(),
  videoCount: z.number(),
  addedAt: z.string(),
  isDefault: z.boolean(),
});

export type CustomPlaylist = z.infer<typeof CustomPlaylistSchema>;

export const CustomPlaylistsSchema = z.array(CustomPlaylistSchema);

// Storage Schema Map
export const STORAGE_SCHEMAS = {
  USER_PREFERENCES: UserPreferencesSchema,
  PRIORITY_QUEUE: PriorityQueueSchema,
  ACTIVE_PLAYLIST_DATA: z.array(PlaylistItemSchema),
  NOW_PLAYING: NowPlayingSchema,
  PLAYER_WINDOW_STATE: PlayerWindowStateSchema,
  CUSTOM_PLAYLISTS: CustomPlaylistsSchema,
} as const;

export type StorageKey = keyof typeof STORAGE_SCHEMAS;
