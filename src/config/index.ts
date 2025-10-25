/**
 * Centralized Configuration for Jukebox Application
 * 
 * This file provides a single source of truth for all application configuration,
 * eliminating hardcoded values scattered throughout the codebase.
 * 
 * Environment variables are accessed here and exposed through a type-safe interface.
 * 
 * @module config
 */

// ============================================================================
// Environment Variable Helpers
// ============================================================================

/**
 * Get environment variable with fallback
 */
function getEnv(key: string, fallback: string = ""): string {
  return import.meta.env[key] || fallback;
}

/**
 * Get environment variable as number with fallback
 */
function getEnvNumber(key: string, fallback: number): number {
  const value = import.meta.env[key];
  const parsed = parseInt(value, 10);
  return !isNaN(parsed) ? parsed : fallback;
}

/**
 * Get environment variable as boolean with fallback
 */
function getEnvBoolean(key: string, fallback: boolean): boolean {
  const value = import.meta.env[key];
  if (value === undefined) return fallback;
  return value === "true" || value === "1";
}

// ============================================================================
// Application Configuration
// ============================================================================

/**
 * Application mode and environment settings
 */
export const app = {
  /**
   * Current application mode (development, production, test)
   */
  mode: (import.meta.env.MODE || "development") as
    | "development"
    | "production"
    | "test",

  /**
   * Is the application running in development mode?
   */
  isDevelopment: import.meta.env.MODE === "development",

  /**
   * Is the application running in production mode?
   */
  isProduction: import.meta.env.MODE === "production",

  /**
   * Is the application running in test mode?
   */
  isTest: import.meta.env.MODE === "test",

  /**
   * Application version (from package.json)
   */
  version: getEnv("VITE_APP_VERSION", "1.0.0"),

  /**
   * Enable debug logging
   */
  debug: getEnvBoolean("VITE_DEBUG", false),
} as const;

// ============================================================================
// YouTube Configuration
// ============================================================================

/**
 * YouTube API and proxy configuration
 */
export const youtube = {
  /**
   * YouTube proxy server URL (for scraping/bypassing API limits)
   */
  proxyUrl: getEnv("VITE_PROXY_URL", "http://localhost:4321"),

  /**
   * YouTube Data API quota limit (units per day)
   */
  quotaLimit: getEnvNumber("VITE_YOUTUBE_QUOTA_LIMIT", 10000),

  /**
   * Default playlist ID to load on startup
   */
  defaultPlaylistId: getEnv(
    "VITE_DEFAULT_PLAYLIST_ID",
    "PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf"
  ),

  /**
   * Maximum results per search request
   */
  maxSearchResults: getEnvNumber("VITE_MAX_SEARCH_RESULTS", 10),

  /**
   * YouTube API keys (comma-separated for rotation)
   */
  apiKeys: getEnv("VITE_YOUTUBE_API_KEYS", "").split(",").filter(Boolean),

  /**
   * Enable automatic API key rotation on quota exhaustion
   */
  autoRotateKeys: getEnvBoolean("VITE_AUTO_ROTATE_KEYS", true),

  /**
   * Proxy health check timeout (ms)
   */
  proxyHealthCheckTimeout: getEnvNumber("VITE_PROXY_HEALTH_TIMEOUT", 2000),

  /**
   * Proxy request timeout (ms)
   */
  proxyRequestTimeout: getEnvNumber("VITE_PROXY_REQUEST_TIMEOUT", 10000),
} as const;

// ============================================================================
// WebSocket Configuration
// ============================================================================

/**
 * WebSocket server configuration for real-time sync
 */
export const websocket = {
  /**
   * WebSocket server URL
   */
  url: getEnv("VITE_WS_URL", "ws://localhost:3001"),

  /**
   * Reconnection delay after disconnect (ms)
   */
  reconnectDelay: getEnvNumber("VITE_WS_RECONNECT_DELAY", 3000),

  /**
   * Maximum reconnection attempts (0 = infinite)
   */
  maxReconnectAttempts: getEnvNumber("VITE_WS_MAX_RECONNECT_ATTEMPTS", 0),

  /**
   * Heartbeat interval to keep connection alive (ms)
   */
  heartbeatInterval: getEnvNumber("VITE_WS_HEARTBEAT_INTERVAL", 30000),

  /**
   * Enable WebSocket debugging logs
   */
  debug: getEnvBoolean("VITE_WS_DEBUG", app.isDevelopment),
} as const;

// ============================================================================
// Supabase Configuration
// ============================================================================

/**
 * Supabase backend configuration
 */
export const supabase = {
  /**
   * Supabase project URL
   */
  url: getEnv("VITE_SUPABASE_URL", ""),

  /**
   * Supabase anonymous/public API key
   */
  anonKey: getEnv("VITE_SUPABASE_PUBLISHABLE_KEY", ""),

  /**
   * Enable Supabase realtime features
   */
  realtimeEnabled: getEnvBoolean("VITE_SUPABASE_REALTIME_ENABLED", true),

  /**
   * Supabase edge functions URL
   */
  functionsUrl: getEnv("VITE_SUPABASE_FUNCTIONS_URL", ""),
} as const;

// ============================================================================
// Player Configuration
// ============================================================================

/**
 * Media player configuration
 */
export const player = {
  /**
   * Default volume level (0-100)
   */
  defaultVolume: getEnvNumber("VITE_DEFAULT_VOLUME", 50),

  /**
   * Maximum song length in minutes
   */
  maxSongLength: getEnvNumber("VITE_MAX_SONG_LENGTH", 10),

  /**
   * Automatically advance to next song when current ends
   */
  autoAdvance: getEnvBoolean("VITE_AUTO_ADVANCE", true),

  /**
   * Show mini player UI
   */
  showMiniPlayer: getEnvBoolean("VITE_SHOW_MINI_PLAYER", false),

  /**
   * Player window width (for popup player)
   */
  windowWidth: getEnvNumber("VITE_PLAYER_WINDOW_WIDTH", 800),

  /**
   * Player window height (for popup player)
   */
  windowHeight: getEnvNumber("VITE_PLAYER_WINDOW_HEIGHT", 600),

  /**
   * Enable player controls in UI
   */
  showControls: getEnvBoolean("VITE_SHOW_PLAYER_CONTROLS", true),
} as const;

// ============================================================================
// Jukebox Configuration
// ============================================================================

/**
 * Jukebox-specific settings
 */
export const jukebox = {
  /**
   * Default operation mode
   */
  defaultMode: (getEnv("VITE_DEFAULT_MODE", "PAID") as "FREEPLAY" | "PAID"),

  /**
   * Initial credit amount
   */
  initialCredits: getEnvNumber("VITE_INITIAL_CREDITS", 0),

  /**
   * Cost per song in paid mode
   */
  costPerSong: getEnvNumber("VITE_COST_PER_SONG", 1),

  /**
   * Coin A value (number of credits)
   */
  coinValueA: getEnvNumber("VITE_COIN_VALUE_A", 3),

  /**
   * Coin B value (number of credits)
   */
  coinValueB: getEnvNumber("VITE_COIN_VALUE_B", 1),

  /**
   * Enable test mode (bypass payments)
   */
  testMode: getEnvBoolean("VITE_TEST_MODE", app.isDevelopment),

  /**
   * Allow duplicate songs in queue
   */
  allowDuplicates: getEnvBoolean("VITE_ALLOW_DUPLICATES", false),

  /**
   * Maximum queue size
   */
  maxQueueSize: getEnvNumber("VITE_MAX_QUEUE_SIZE", 50),

  /**
   * Enable priority queue for paid requests
   */
  enablePriorityQueue: getEnvBoolean("VITE_ENABLE_PRIORITY_QUEUE", true),
} as const;

// ============================================================================
// Search Configuration
// ============================================================================

/**
 * Search interface configuration
 */
export const search = {
  /**
   * Default search method
   */
  defaultMethod: (getEnv("VITE_DEFAULT_SEARCH_METHOD", "scraper") as
    | "api"
    | "scraper"
    | "hybrid"
    | "iframe_search"),

  /**
   * Search debounce delay (ms)
   */
  debounceDelay: getEnvNumber("VITE_SEARCH_DEBOUNCE", 500),

  /**
   * Enable on-screen keyboard
   */
  showKeyboard: getEnvBoolean("VITE_SHOW_KEYBOARD", true),

  /**
   * Results per page
   */
  resultsPerPage: getEnvNumber("VITE_SEARCH_RESULTS_PER_PAGE", 10),

  /**
   * Enable search history
   */
  enableHistory: getEnvBoolean("VITE_ENABLE_SEARCH_HISTORY", true),

  /**
   * Maximum search history items
   */
  maxHistoryItems: getEnvNumber("VITE_MAX_SEARCH_HISTORY", 20),
} as const;

// ============================================================================
// Background Configuration
// ============================================================================

/**
 * Background display configuration
 */
export const background = {
  /**
   * Default background ID
   */
  defaultBackground: getEnv("VITE_DEFAULT_BACKGROUND", "neon1"),

  /**
   * Enable background cycling
   */
  cycleBackgrounds: getEnvBoolean("VITE_CYCLE_BACKGROUNDS", true),

  /**
   * Background cycle interval (ms)
   */
  cycleInterval: getEnvNumber("VITE_BACKGROUND_CYCLE_INTERVAL", 30000),

  /**
   * Bounce video backgrounds
   */
  bounceVideos: getEnvBoolean("VITE_BOUNCE_VIDEOS", false),

  /**
   * Video background volume (0-100)
   */
  videoVolume: getEnvNumber("VITE_BACKGROUND_VIDEO_VOLUME", 0),
} as const;

// ============================================================================
// Rate Limiting Configuration
// ============================================================================

/**
 * Rate limiting configuration for API requests
 */
export const rateLimit = {
  /**
   * Maximum requests per window
   */
  maxRequests: getEnvNumber("VITE_RATE_LIMIT_MAX_REQUESTS", 10),

  /**
   * Time window for rate limiting (ms)
   */
  windowMs: getEnvNumber("VITE_RATE_LIMIT_WINDOW_MS", 60000),

  /**
   * Enable rate limiting
   */
  enabled: getEnvBoolean("VITE_RATE_LIMIT_ENABLED", true),
} as const;

// ============================================================================
// Serial Communication Configuration
// ============================================================================

/**
 * Serial port configuration for coin acceptor
 */
export const serial = {
  /**
   * Default baud rate
   */
  baudRate: getEnvNumber("VITE_SERIAL_BAUD_RATE", 9600),

  /**
   * Enable serial communication
   */
  enabled: getEnvBoolean("VITE_SERIAL_ENABLED", false),

  /**
   * Serial port path (for Node.js backend)
   */
  portPath: getEnv("VITE_SERIAL_PORT_PATH", "/dev/ttyUSB0"),
} as const;

// ============================================================================
// Storage Configuration
// ============================================================================

/**
 * Local storage configuration
 */
export const storage = {
  /**
   * Local storage key prefix
   */
  keyPrefix: getEnv("VITE_STORAGE_PREFIX", "jukebox_"),

  /**
   * Enable persistent storage
   */
  enabled: getEnvBoolean("VITE_STORAGE_ENABLED", true),

  /**
   * Storage keys
   */
  keys: {
    userPreferences: "USER_PREFERENCES",
    priorityQueue: "PRIORITY_QUEUE",
    searchHistory: "SEARCH_HISTORY",
    apiKeyRotation: "API_KEY_ROTATION",
    creditHistory: "CREDIT_HISTORY",
  } as const,
} as const;

// ============================================================================
// Feature Flags
// ============================================================================

/**
 * Feature flags for gradual rollout of new features
 */
export const features = {
  /**
   * Enable remote control functionality
   */
  remoteControl: getEnvBoolean("VITE_FEATURE_REMOTE_CONTROL", true),

  /**
   * Enable admin console
   */
  adminConsole: getEnvBoolean("VITE_FEATURE_ADMIN_CONSOLE", true),

  /**
   * Enable collaborative room features
   */
  collaborativeRooms: getEnvBoolean("VITE_FEATURE_COLLABORATIVE_ROOMS", false),

  /**
   * Enable API key rotation
   */
  apiKeyRotation: getEnvBoolean("VITE_FEATURE_API_KEY_ROTATION", true),

  /**
   * Enable emergency fallback mode
   */
  emergencyFallback: getEnvBoolean("VITE_FEATURE_EMERGENCY_FALLBACK", true),

  /**
   * Enable analytics
   */
  analytics: getEnvBoolean("VITE_FEATURE_ANALYTICS", false),
} as const;

// ============================================================================
// Combined Configuration Export
// ============================================================================

/**
 * Complete application configuration object
 */
export const config = {
  app,
  youtube,
  websocket,
  supabase,
  player,
  jukebox,
  search,
  background,
  rateLimit,
  serial,
  storage,
  features,
} as const;

/**
 * Export individual sections for convenience
 */
export default config;

// ============================================================================
// Configuration Validation
// ============================================================================

/**
 * Validate that required configuration values are present
 */
export function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check Supabase configuration if features require it
  if (features.remoteControl || features.collaborativeRooms) {
    if (!supabase.url) {
      errors.push("VITE_SUPABASE_URL is required for remote features");
    }
    if (!supabase.anonKey) {
      errors.push(
        "VITE_SUPABASE_PUBLISHABLE_KEY is required for remote features"
      );
    }
  }

  // Validate YouTube configuration
  if (youtube.apiKeys.length === 0 && search.defaultMethod === "api") {
    errors.push(
      "VITE_YOUTUBE_API_KEYS is required when using API search method"
    );
  }

  // Validate numeric ranges
  if (player.defaultVolume < 0 || player.defaultVolume > 100) {
    errors.push("VITE_DEFAULT_VOLUME must be between 0 and 100");
  }

  if (player.maxSongLength < 1) {
    errors.push("VITE_MAX_SONG_LENGTH must be at least 1 minute");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Log configuration on startup (development only)
 */
export function logConfig(): void {
  if (!app.isDevelopment || !app.debug) return;

  console.group("🎵 Jukebox Configuration");
  console.log("App Mode:", app.mode);
  console.log("YouTube Proxy:", youtube.proxyUrl);
  console.log("WebSocket URL:", websocket.url);
  console.log("Default Search Method:", search.defaultMethod);
  console.log("Jukebox Mode:", jukebox.defaultMode);
  console.log("Test Mode:", jukebox.testMode);
  console.groupEnd();

  const validation = validateConfig();
  if (!validation.valid) {
    console.group("⚠️ Configuration Warnings");
    validation.errors.forEach((error) => console.warn(error));
    console.groupEnd();
  }
}
