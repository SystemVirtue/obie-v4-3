/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_VERSION?: string;
  readonly VITE_DEBUG?: string;
  readonly VITE_PROXY_URL?: string;
  readonly VITE_YOUTUBE_API_KEYS?: string;
  readonly VITE_AUTO_ROTATE_KEYS?: string;
  readonly VITE_YOUTUBE_QUOTA_LIMIT?: string;
  readonly VITE_DEFAULT_PLAYLIST_ID?: string;
  readonly VITE_PROXY_HEALTH_TIMEOUT?: string;
  readonly VITE_PROXY_REQUEST_TIMEOUT?: string;
  readonly VITE_WS_URL?: string;
  readonly VITE_WS_RECONNECT_DELAY?: string;
  readonly VITE_WS_MAX_RECONNECT_ATTEMPTS?: string;
  readonly VITE_WS_HEARTBEAT_INTERVAL?: string;
  readonly VITE_WS_DEBUG?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  readonly VITE_SUPABASE_REALTIME_ENABLED?: string;
  readonly VITE_SUPABASE_FUNCTIONS_URL?: string;
  readonly VITE_DEFAULT_VOLUME?: string;
  readonly VITE_MAX_SONG_LENGTH?: string;
  readonly VITE_AUTO_ADVANCE?: string;
  readonly VITE_SHOW_MINI_PLAYER?: string;
  readonly VITE_SHOW_PLAYER_CONTROLS?: string;
  readonly VITE_DEFAULT_MODE?: string;
  readonly VITE_INITIAL_CREDITS?: string;
  readonly VITE_COST_PER_SONG?: string;
  readonly VITE_COIN_VALUE_A?: string;
  readonly VITE_COIN_VALUE_B?: string;
  readonly VITE_TEST_MODE?: string;
  readonly VITE_ALLOW_DUPLICATES?: string;
  readonly VITE_MAX_QUEUE_SIZE?: string;
  readonly VITE_ENABLE_PRIORITY_QUEUE?: string;
  readonly VITE_DEFAULT_SEARCH_METHOD?: string;
  readonly VITE_SEARCH_DEBOUNCE?: string;
  readonly VITE_SHOW_KEYBOARD?: string;
  readonly VITE_SEARCH_RESULTS_PER_PAGE?: string;
  readonly VITE_ENABLE_SEARCH_HISTORY?: string;
  readonly VITE_MAX_SEARCH_HISTORY?: string;
  readonly VITE_DEFAULT_BACKGROUND?: string;
  readonly VITE_CYCLE_BACKGROUNDS?: string;
  readonly VITE_BACKGROUND_CYCLE_INTERVAL?: string;
  readonly VITE_BOUNCE_VIDEOS?: string;
  readonly VITE_FEATURE_REMOTE_CONTROL?: string;
  readonly VITE_FEATURE_ADMIN_CONSOLE?: string;
  readonly VITE_FEATURE_COLLABORATIVE_ROOMS?: string;
  readonly VITE_FEATURE_API_KEY_ROTATION?: string;
  readonly VITE_FEATURE_EMERGENCY_FALLBACK?: string;
  readonly VITE_FEATURE_ANALYTICS?: string;
  readonly MODE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
