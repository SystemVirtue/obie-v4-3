/**
 * Unified Type Definitions for Jukebox Application
 * 
 * This file provides a single source of truth for all type definitions
 * used across the jukebox application, eliminating duplicate interfaces
 * and improving type safety.
 * 
 * @module types/jukebox
 */

export interface Video {
  id: string;
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl?: string;
  videoUrl?: string;
  duration?: string;
  durationMinutes?: number;
  officialScore?: number;
}

/**
 * Video in the playback queue with additional metadata
 */
export interface QueuedRequest extends Video {
  timestamp: string;
  isUserRequest?: boolean;
}

/**
 * Video in a playlist with playback state
 */
export interface PlaylistItem extends Video {
  isNowPlaying?: boolean;
  isUserRequest?: boolean;
  isAlreadyPlayed?: boolean;
}

/**
 * Search result from YouTube API or scraper
 */
export interface SearchResult extends Video {
  thumbnailUrl: string;
  videoUrl: string;
}

/**
 * Background display file (image or video)
 */
export interface BackgroundFile {
  id: string;
  name: string;
  url: string;
  type: "image" | "video";
}

/**
 * Background queue item for playback sequencing
 */
export interface BackgroundQueueItem {
  id: string;
  assetId: string; // References BackgroundFile.id or default asset
  name: string;
  type: "default" | "image" | "video";
  url?: string; // Only for custom assets
  settings?: {
    scaling?: 'Original Size' | 'Fit-To-Screen' | 'Fill-Screen' | 'Stretch to Screen';
    fadeInOut?: 'No Fade' | '0.5s' | '1.0s' | '1.5s' | '2.0s' | '2.5s' | '3.0s';
    // Image-specific settings
    displayDuration?: 'Random Fast' | 'Random Slow' | '15s' | '30s' | '45s' | '1 Minute';
    imageMotion?: 'None' | 'Soft Ken Burns' | 'Extreme Ken Burns' | 'Circular Loops' | 'Edge Reflections Cycle' | 'Zoom Wave';
    // Video-specific settings
    videoSpeed?: '0.25' | '0.5' | '0.75' | '1.0' | '1.25' | '1.5' | '1.75' | '2.0';
    direction?: '>> Forwards >>' | '<< Backwards <<';
  };
}

/**
 * Background playback settings
 */
export interface BackgroundSettings {
  fitAssetsToScreen: boolean;
  dipToBlackFade: boolean;
  bounceVideos: boolean;
  videoPlaybackSpeed: number;
  videoLoopRepeat: number;
  imageDisplayTime: number;
}

// ============================================================================
// Logging & History Types
// ============================================================================

/**
 * System log entry for tracking events
 */
export interface LogEntry {
  timestamp: string;
  type: "SONG_PLAYED" | "USER_SELECTION" | "CREDIT_ADDED" | "CREDIT_REMOVED";
  description: string;
  videoId?: string;
  creditAmount?: number;
}

/**
 * User's video request history
 */
export interface UserRequest {
  timestamp: string;
  title: string;
  videoId: string;
  channelTitle: string;
}

/**
 * Credit transaction history
 */
export interface CreditHistory {
  timestamp: string;
  amount: number;
  type: "ADDED" | "REMOVED";
  description: string;
}

/**
 * API key rotation history entry
 */
export interface RotationHistoryEntry {
  timestamp: string;
  from: string;
  to: string;
  reason: string;
}

// ============================================================================
// State Interfaces - Layered Architecture
// ============================================================================

/**
 * Core jukebox state - minimal interface for remote control and WebSocket
 * 
 * This interface contains only the essential state needed for basic
 * remote control and synchronization across clients.
 */
export interface JukeboxCoreState {
  // Player state
  isPlaying: boolean;
  currentSong: string;
  currentVideoId: string;
  volume: number;
  isPlayerPaused: boolean;
  
  // Queue state
  queue: QueuedRequest[];
  priorityQueue: QueuedRequest[];
  
  // Mode state
  mode: "FREEPLAY" | "PAID";
  credits: number;
}

/**
 * UI-specific state for search and admin interfaces
 */
export interface JukeboxUIState {
  // Search interface
  isSearchOpen: boolean;
  showKeyboard: boolean;
  showSearchResults: boolean;
  searchQuery: string;
  searchResults: SearchResult[];
  isSearching: boolean;
  
  // Admin interface
  isAdminOpen: boolean;
  
  // Dialog states
  showInsufficientCredits: boolean;
  showDuplicateSong: boolean;
  duplicateSongTitle: string;
  showDisplayConfirmation: boolean;
  pendingDisplayInfo: any | null;
  showSkipConfirmation: boolean;
  showApiKeyTestDialog: boolean;
  showDisplaySelectionDialog: boolean;
  
  // Display settings
  showMiniPlayer: boolean;

  // Playlist import loading
  isImportingPlaylist: boolean;
  importProgress: number;
  importError: string | null;
}

/**
 * Configuration state for jukebox settings
 */
export interface JukeboxConfigState {
  // API configuration
  apiKey: string;
  selectedApiKeyOption: string;
  customApiKey: string;
  autoRotateApiKeys: boolean;
  lastRotationTime: string;
  rotationHistory: RotationHistoryEntry[];
  
  // Search configuration
  searchMethod: SearchMethod;
  
  // Player configuration
  maxSongLength: number;
  testMode: boolean;
  videoQuality: "auto" | "hd1080" | "hd720" | "large" | "medium" | "small";
  adaptiveQualityEnabled: boolean;
  hideEndCards: boolean;
  
  // Coin acceptor configuration
  selectedCoinAcceptor: string;
  coinValueA: number;
  coinValueB: number;
  
  // Background configuration
  backgrounds: BackgroundFile[];
  selectedBackground: string;
  cycleBackgrounds: boolean;
  bounceVideos: boolean;
  backgroundCycleIndex: number;
  backgroundQueue: BackgroundQueueItem[];
  backgroundQueueIndex: number;
  backgroundSettings: BackgroundSettings;
  bgVisualMode: 'random' | 'images-only' | 'videos-only' | 'custom-queue';
  
  // Background testing state
  isTestingBackgroundQueue: boolean;
  currentTestIndex: number;

  // Display configuration
  selectedDisplay: string;
  useFullscreen: boolean;
  autoDetectDisplay: boolean;
  showDisplaySelectionDialogOnStartup: boolean;
  playerWindowPosition: { x: number; y: number; width: number; height: number } | null;
  userDefaultPlayerDisplay: { displayId: string; fullscreen: boolean; position?: { x: number; y: number; width: number; height: number } } | null;
}

/**
 * Playlist management state
 */
export interface JukeboxPlaylistState {
  defaultPlaylist: string;
  defaultPlaylistVideos: PlaylistItem[];
  inMemoryPlaylist: PlaylistItem[];
  currentVideoIndex: number;
}

/**
 * Runtime state for player window and status
 */
export interface JukeboxRuntimeState {
  playerWindow: Window | null;
  isPlayerRunning: boolean;
  playerStatus: { state: number; description: string; timestamp: number } | null;
  isAppPaused: boolean;
  allKeysExhausted: boolean;
  lastPlayingId: string;
}

/**
 * Historical data state
 */
export interface JukeboxHistoryState {
  logs: LogEntry[];
  userRequests: UserRequest[];
  creditHistory: CreditHistory[];
}

/**
 * Complete jukebox state - combines all state layers
 * 
 * This is the full state interface used by the main Index component
 * and useJukeboxState hook.
 */
export interface JukeboxFullState
  extends JukeboxCoreState,
    JukeboxUIState,
    JukeboxConfigState,
    JukeboxPlaylistState,
    JukeboxRuntimeState,
    JukeboxHistoryState {
  // Alias for compatibility
  currentlyPlaying: string; // Alias for currentSong
}

// ============================================================================
// Simplified State for Remote Control & WebSocket
// ============================================================================

/**
 * Simplified state for remote control clients
 * Extends core state with only essential UI elements
 */
export interface RemoteJukeboxState extends JukeboxCoreState {
  isSearchOpen: boolean;
  queue: QueuedRequest[];
}

/**
 * Minimal state synchronized over WebSocket
 */
export interface WebSocketJukeboxState {
  isPlaying: boolean;
  currentSong: string;
  volume: number;
  mode: "FREEPLAY" | "PAID";
  credits: number;
  queue: QueuedRequest[];
  priorityQueue: QueuedRequest[];
  currentVideoId: string;
  isPlayerPaused: boolean;
}

// ============================================================================
// Action/Event Types
// ============================================================================

// ...existing code...



// ============================================================================
// Display Types
// ============================================================================
/**
 * Display information for player window
 */
export interface DisplayInfo {
  id: string;
  name: string;
  width: number;
  height: number;
  left: number;
  top: number;
  isPrimary: boolean;
  isInternal: boolean;
}

/**
 * Player control commands
 */
export type PlayerCommand =
  | { type: "PLAY"; videoId: string }
  | { type: "PAUSE" }
  | { type: "RESUME" }
  | { type: "SKIP" }
  | { type: "SET_VOLUME"; volume: number }
  | { type: "STOP" };

/**
 * Queue operation types
 */
export type QueueOperation =
  | { type: "ADD"; video: QueuedRequest }
  | { type: "REMOVE"; videoId: string }
  | { type: "CLEAR" }
  | { type: "REORDER"; fromIndex: number; toIndex: number };

// ============================================================================
// User Preferences (Persisted to localStorage)
// ============================================================================

/**
 * User preferences that are persisted to localStorage
 */
export interface UserPreferences {
  mode: "FREEPLAY" | "PAID";
  credits: number;
  defaultPlaylist: string;
  apiKey: string;
  selectedApiKeyOption: string;
  customApiKey: string;
  autoRotateApiKeys: boolean;
  searchMethod: SearchMethod;
  selectedCoinAcceptor: string;
  selectedBackground: string;
  cycleBackgrounds: boolean;
  bounceVideos: boolean;
  maxSongLength: number;
  showMiniPlayer: boolean;
  testMode: boolean;
  videoQuality: "auto" | "hd1080" | "hd720" | "large" | "medium" | "small";
  adaptiveQualityEnabled: boolean;
  hideEndCards: boolean;
  coinValueA: number;
  coinValueB: number;
  selectedDisplay: string;
  useFullscreen: boolean;
  autoDetectDisplay: boolean;
  showDisplaySelectionDialogOnStartup: boolean;
  playerWindowPosition: { x: number; y: number; width: number; height: number } | null;
  userDefaultPlayerDisplay: { displayId: string; fullscreen: boolean; position?: { x: number; y: number; width: number; height: number } } | null;
  backgrounds: BackgroundFile[];
  backgroundQueue: BackgroundQueueItem[];
  backgroundQueueIndex: number;
  backgroundSettings: BackgroundSettings;
  bgVisualMode: 'random' | 'images-only' | 'videos-only' | 'custom-queue';
}


// ============================================================================
// Search Method Type
// ============================================================================
/**
 * Supported search methods for the jukebox app
 */
export type SearchMethod = "scraper" | "api_search" | "iframe_search";

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if an object is a valid Video
 */
export function isVideo(obj: any): obj is Video {
  return (
    obj &&
    typeof obj === "object" &&
    typeof obj.id === "string" &&
    typeof obj.videoId === "string" &&
    typeof obj.title === "string" &&
    typeof obj.channelTitle === "string"
  );
}

/**
 * Type guard to check if an object is a valid QueuedRequest
 */
export function isQueuedRequest(obj: any): obj is QueuedRequest {
  return (
    isVideo(obj) &&
    typeof (obj as any).timestamp === "string"
  );
}

/**
 * Type guard to check if an object is a valid PlaylistItem
 */
export function isPlaylistItem(obj: any): obj is PlaylistItem {
  return isVideo(obj);
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Extract only the persisted fields from JukeboxFullState
 */
export type PersistedJukeboxState = Pick<
  JukeboxFullState,
  keyof UserPreferences
>;

/**
 * Make all properties of a type nullable
 */
export type Nullable<T> = {
  [P in keyof T]: T[P] | null;
};

/**
 * Make all properties of a type partial and nullable
 */
export type PartialNullable<T> = {
  [P in keyof T]?: T[P] | null;
};
