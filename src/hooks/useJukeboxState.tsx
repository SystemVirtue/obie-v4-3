import { useState, useEffect, useMemo, Dispatch, SetStateAction } from "react";
import { SearchMethod } from "@/services/youtube/search";
import { config } from "@/config";
import { backgroundService } from "@/services/backgroundService";
import type {
  JukeboxFullState,
  SearchResult,
  PlaylistItem,
  QueuedRequest,
  LogEntry,
  UserRequest,
  CreditHistory,
  BackgroundFile,
  BackgroundQueueItem,
  BackgroundSettings,
  UserPreferences,
} from "@/types/jukebox";

// Re-export types for backward compatibility
export type {
  SearchResult,
  PlaylistItem,
  QueuedRequest,
  LogEntry,
  UserRequest,
  CreditHistory,
  BackgroundFile,
};

// Export main state type
export type JukeboxState = JukeboxFullState;

// Start with empty API key - will be set by API key test dialog
const DEFAULT_API_KEY = "";
const DEFAULT_PLAYLIST_ID = config.youtube.defaultPlaylistId;

// Cache for user preferences to prevent excessive localStorage reads
let userPreferencesCache: Partial<UserPreferences> | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5000; // 5 seconds

// Clear the user preferences cache (used when localStorage is updated directly)
const clearUserPreferencesCache = () => {
  userPreferencesCache = null;
  cacheTimestamp = 0;
};

// Load user preferences from localStorage with caching
const loadUserPreferences = (): Partial<UserPreferences> => {
  const now = Date.now();

  // Return cached preferences if they're still fresh
  if (userPreferencesCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return userPreferencesCache;
  }

  try {
    const saved = localStorage.getItem("USER_PREFERENCES");
    if (saved) {
      const prefs = JSON.parse(saved);
      // Only log in development to reduce console noise
      if (process.env.NODE_ENV === 'development') {
        console.log("[UserPreferences] Loaded from localStorage:", Object.keys(prefs).length, "settings");
      }

      // Update cache
      userPreferencesCache = prefs;
      cacheTimestamp = now;

      return prefs;
    }
    return {};
  } catch (error) {
    console.error("[UserPreferences] Error loading preferences:", error);
    return {};
  }
};

const loadPriorityQueue = (): QueuedRequest[] => {
  try {
    const saved = localStorage.getItem("PRIORITY_QUEUE");
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error("[UserPreferences] Error loading priority queue:", error);
    return [];
  }
};

/**
 * CHANGELOG - 2025-01-XX
 * ADDED: Current video index persistence to localStorage
 */
const loadCurrentVideoIndex = (): number => {
  try {
    const saved = localStorage.getItem("current_video_index");
    return saved ? parseInt(saved, 10) : 0;
  } catch (error) {
    console.error("[UserPreferences] Error loading current video index:", error);
    return 0;
  }
};

// Save user preferences to localStorage (exclude runtime state)
const saveUserPreferences = (state: JukeboxFullState) => {
  try {
    const preferencesToSave: UserPreferences = {
      mode: state.mode,
      credits: state.credits,
      defaultPlaylist: state.defaultPlaylist,
      apiKey: state.apiKey,
      selectedApiKeyOption: state.selectedApiKeyOption,
      customApiKey: state.customApiKey,
      autoRotateApiKeys: state.autoRotateApiKeys,
      searchMethod: state.searchMethod,
      selectedCoinAcceptor: state.selectedCoinAcceptor,
      selectedBackground: state.selectedBackground,
      cycleBackgrounds: state.cycleBackgrounds,
      bounceVideos: state.bounceVideos,
      maxSongLength: state.maxSongLength,
      showMiniPlayer: state.showMiniPlayer,
      testMode: state.testMode,
      videoQuality: state.videoQuality,
      adaptiveQualityEnabled: state.adaptiveQualityEnabled,
      hideEndCards: state.hideEndCards,
      coinValueA: state.coinValueA,
      coinValueB: state.coinValueB,
      selectedDisplay: state.selectedDisplay,
      useFullscreen: state.useFullscreen,
      autoDetectDisplay: state.autoDetectDisplay,
      showDisplaySelectionDialogOnStartup: state.showDisplaySelectionDialogOnStartup,
      playerWindowPosition: state.playerWindowPosition,
      userDefaultPlayerDisplay: state.userDefaultPlayerDisplay,
      backgrounds: state.backgrounds,
      backgroundQueue: state.backgroundQueue,
      backgroundQueueIndex: state.backgroundQueueIndex,
      backgroundSettings: state.backgroundSettings,
      bgVisualMode: state.bgVisualMode,
    };
    localStorage.setItem("USER_PREFERENCES", JSON.stringify(preferencesToSave));
    console.log("[UserPreferences] Settings saved to localStorage");
  } catch (error) {
    console.error("[UserPreferences] Error saving preferences:", error);
  }
};

export { clearUserPreferencesCache };

export const useJukeboxState = () => {
  const userPreferences = loadUserPreferences();
  const savedPriorityQueue = loadPriorityQueue();
  const savedCurrentVideoIndex = loadCurrentVideoIndex();
  
  const [state, setState] = useState<JukeboxFullState>({
    // Mode state
    mode: (userPreferences.mode as "FREEPLAY" | "PAID") || "PAID",
    credits: userPreferences.credits ?? 0,
    
    // Queue state
    priorityQueue: savedPriorityQueue,
    queue: [], // Add missing queue property
    
    // Playlist state
    defaultPlaylist: userPreferences.defaultPlaylist || DEFAULT_PLAYLIST_ID,
    defaultPlaylistVideos: [],
    inMemoryPlaylist: [],
    currentVideoIndex: savedCurrentVideoIndex,
    
    // UI state
    isSearchOpen: false,
    isAdminOpen: false,
    searchResults: [],
    searchQuery: "",
    isSearching: false,
    showKeyboard: false,
    showSearchResults: false,
    showInsufficientCredits: false,
    showDuplicateSong: false,
    duplicateSongTitle: "",
    showDisplayConfirmation: false,
    pendingDisplayInfo: null,
    showSkipConfirmation: false,
    showApiKeyTestDialog: false,
    showDisplaySelectionDialog: false,
    showMiniPlayer: userPreferences.showMiniPlayer ?? false,
    isImportingPlaylist: false,
    importProgress: 0,
    importError: null,
    
    // Player state
    isPlaying: false, // Add missing property
    currentSong: "Loading...", // Add missing property
    currentlyPlaying: "Loading...",
    currentVideoId: "",
    volume: config.player.defaultVolume, // Add missing property
    isPlayerPaused: false,
    isPlayerRunning: false,
    playerWindow: null,
    
    // Config state
    selectedCoinAcceptor: userPreferences.selectedCoinAcceptor || "",
    apiKey: userPreferences.apiKey || DEFAULT_API_KEY,
    selectedApiKeyOption: userPreferences.selectedApiKeyOption || "key1",
    customApiKey: userPreferences.customApiKey || "",
    autoRotateApiKeys: userPreferences.autoRotateApiKeys ?? true,
    lastRotationTime: "",
    rotationHistory: [],
    searchMethod: (userPreferences.searchMethod as SearchMethod) || "scraper",
    maxSongLength: userPreferences.maxSongLength ?? 10,
    testMode: userPreferences.testMode ?? false,
    videoQuality: (userPreferences.videoQuality as "auto" | "hd1080" | "hd720" | "large" | "medium" | "small") || "auto",
    hideEndCards: userPreferences.hideEndCards ?? false,
    adaptiveQualityEnabled: userPreferences.adaptiveQualityEnabled ?? false,
    coinValueA: userPreferences.coinValueA ?? 3,
    coinValueB: userPreferences.coinValueB ?? 1,
    
    // Background configuration
    backgrounds: userPreferences.backgrounds || [], // Load from localStorage
    selectedBackground: userPreferences.selectedBackground || "neon1",
    cycleBackgrounds: userPreferences.cycleBackgrounds ?? true,
    bounceVideos: userPreferences.bounceVideos ?? false,
    backgroundCycleIndex: 0,
    backgroundQueue: userPreferences.backgroundQueue || [],
    backgroundQueueIndex: 0,
    backgroundSettings: {
      fitAssetsToScreen: true,
      dipToBlackFade: true,
      bounceVideos: false,
      videoPlaybackSpeed: 1.0,
      videoLoopRepeat: 1,
      imageDisplayTime: 5,
      ...(userPreferences.backgroundSettings || {}),
    },
    bgVisualMode: (userPreferences.bgVisualMode as 'random' | 'images-only' | 'videos-only' | 'custom-queue') || 'custom-queue',
    
    // Background testing state
    isTestingBackgroundQueue: false,
    currentTestIndex: 0,

    // Display configuration
    selectedDisplay: userPreferences.selectedDisplay || "",
    useFullscreen: userPreferences.useFullscreen ?? true,
    autoDetectDisplay: userPreferences.autoDetectDisplay ?? true,
    showDisplaySelectionDialogOnStartup: userPreferences.showDisplaySelectionDialogOnStartup ?? true,
    playerWindowPosition: userPreferences.playerWindowPosition || null,
    userDefaultPlayerDisplay: userPreferences.userDefaultPlayerDisplay || null,
    
    // History state
    logs: [],
    userRequests: [],
    creditHistory: [],
    
    // Runtime state
    allKeysExhausted: false,
    isAppPaused: false,
    lastPlayingId: "",
    playerStatus: null,
  });

  // Save preferences whenever relevant state changes (debounced to avoid excessive writes)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      saveUserPreferences(state);
      console.log("[UserPreferences] Settings saved to localStorage");
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [
    state.mode,
    state.credits,
    state.searchMethod,
    state.selectedCoinAcceptor,
    state.selectedBackground,
    state.cycleBackgrounds,
    state.bounceVideos,
    state.backgroundQueue,
    state.backgroundQueueIndex,
    state.backgroundSettings,
    state.maxSongLength,
    state.showMiniPlayer,
    state.testMode,
    state.videoQuality,
    state.hideEndCards,
    state.coinValueA,
    state.coinValueB,
    state.selectedDisplay,
    state.useFullscreen,
    state.autoDetectDisplay,
    state.showDisplaySelectionDialogOnStartup,
    state.playerWindowPosition,
    state.userDefaultPlayerDisplay,
    state.bgVisualMode,
  ]);

  // Save current video index whenever it changes
  useEffect(() => {
    localStorage.setItem("current_video_index", JSON.stringify(state.currentVideoIndex));
  }, [state.currentVideoIndex]);

  const addLog = (
    type: LogEntry["type"],
    description: string,
    videoId?: string,
    creditAmount?: number,
  ) => {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      type,
      description,
      videoId,
      creditAmount,
    };
    setState((prev) => ({ ...prev, logs: [logEntry, ...prev.logs] }));
  };

  const addUserRequest = (
    title: string,
    videoId: string,
    channelTitle: string,
  ) => {
    const cleanTitle = title.replace(/\([^)]*\)/g, "").trim();
    const userRequest: UserRequest = {
      timestamp: new Date().toISOString(),
      title: cleanTitle,
      videoId,
      channelTitle,
    };
    setState((prev) => ({
      ...prev,
      userRequests: [userRequest, ...prev.userRequests],
    }));
  };

  const addCreditHistory = (
    amount: number,
    type: "ADDED" | "REMOVED",
    description: string,
  ) => {
    const creditEntry: CreditHistory = {
      timestamp: new Date().toISOString(),
      amount,
      type,
      description,
    };
    setState((prev) => ({
      ...prev,
      creditHistory: [creditEntry, ...prev.creditHistory],
    }));
  };

  const handleBackgroundUpload = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    const type = file.type.startsWith("video/") ? "video" : "image";

    const newBackground: BackgroundFile = {
      id: Date.now().toString(),
      name: file.name,
      url,
      type,
    };

    setState((prev) => ({
      ...prev,
      backgrounds: [...prev.backgrounds, newBackground],
    }));
  };

  const handleAddToBackgroundQueue = (assetId: string) => {
    // Find the asset in backgrounds or default assets
    const defaultAssets = [
      { id: 'none-black', name: 'NONE (BLACK)', type: 'default' as const },
      { id: 'now-playing-thumbnail', name: 'Now Playing Thumbnail', type: 'default' as const },
      { id: 'random-thumbnails', name: 'Random Thumbnail Tiles', type: 'default' as const },
    ];

    const asset = [...defaultAssets, ...state.backgrounds].find(a => a.id === assetId);
    if (!asset) return;

    const queueItem = {
      id: Date.now().toString(),
      assetId: asset.id,
      name: asset.name,
      type: asset.type,
      url: 'url' in asset ? asset.url : undefined,
    };

    setState((prev) => ({
      ...prev,
      backgroundQueue: [...prev.backgroundQueue, queueItem],
    }));
  };

  const handleRemoveFromBackgroundQueue = (queueId: string) => {
    setState((prev) => ({
      ...prev,
      backgroundQueue: prev.backgroundQueue.filter(item => item.id !== queueId),
    }));
  };

  const handleReorderBackgroundQueue = (fromIndex: number, toIndex: number) => {
    setState((prev) => {
      const newQueue = [...prev.backgroundQueue];
      const [removed] = newQueue.splice(fromIndex, 1);
      newQueue.splice(toIndex, 0, removed);
      return {
        ...prev,
        backgroundQueue: newQueue,
      };
    });
  };

  const handleUpdateBackgroundQueueItem = (queueId: string, updates: Partial<BackgroundQueueItem>) => {
    setState((prev) => ({
      ...prev,
      backgroundQueue: prev.backgroundQueue.map(item =>
        item.id === queueId ? { ...item, ...updates } : item
      ),
    }));
  };

  const handleTestBackgroundQueue = () => {
    // This will be handled by the BackgroundAssetsPanel component
    // The actual testing logic is implemented there
    console.log('[BackgroundQueue] Test mode toggled');
  };

  const handleBackgroundSettingsChange = (settings: BackgroundSettings) => {
    setState((prev) => ({
      ...prev,
      backgroundSettings: settings,
    }));
  };

  const getUpcomingTitles = useMemo(() => {
    const upcoming = [];

    // First: Add ALL songs currently in PRIORITY_QUEUE (excluding now_playing if applicable)
    for (const song of state.priorityQueue) {
      // Exclude if this is the currently playing song (though typically priority songs are removed after playing)
      if (song.title !== state.currentlyPlaying) {
        upcoming.push(`PRIORITY:${song.title}`);
      }
    }

    // Second: Add upcoming songs from the playlist (same logic as getCurrentPlaylistForDisplay)
    // Start from currentVideoIndex but skip the currently playing song
    if (state.inMemoryPlaylist.length > 0) {
      const totalSongs = state.inMemoryPlaylist.length;
      let addedCount = 0;
      const maxUpcoming = 5; // Limit to 5 upcoming songs for the ticker

      for (let i = 0; i < totalSongs && addedCount < maxUpcoming; i++) {
        const songIndex = (state.currentVideoIndex + i) % totalSongs;
        const song = state.inMemoryPlaylist[songIndex];

        // Skip the currently playing song
        if (song.title === state.currentlyPlaying) {
          continue;
        }

        upcoming.push(song.title);
        addedCount++;
      }
    }

    return upcoming;
  }, [state.priorityQueue, state.inMemoryPlaylist, state.currentVideoIndex, state.currentlyPlaying]); // Only update when these change

  const isCurrentSongUserRequest = () => {
    return state.userRequests.some(
      (req) => req.title === state.currentlyPlaying,
    );
  };

  const getCurrentPlaylistForDisplay = () => {
    const playlist = [];

    // 1. Currently Playing Section
    if (state.currentlyPlaying && state.currentlyPlaying !== "Loading...") {
      // Check if currently playing is from priority queue
      const isFromPriority = state.priorityQueue.some(req => req.title === state.currentlyPlaying);

      if (!isFromPriority && state.inMemoryPlaylist.length > 0) {
        // The currently playing song is the one that was at currentVideoIndex before it got incremented
        // Since currentVideoIndex now points to the next song, we need to find the previous index
        const currentSongIndex = state.currentVideoIndex === 0
          ? state.inMemoryPlaylist.length - 1
          : state.currentVideoIndex - 1;

        const currentSong = state.inMemoryPlaylist[currentSongIndex];
        if (currentSong && currentSong.title === state.currentlyPlaying) {
          playlist.push({
            ...currentSong,
            isNowPlaying: true,
            displayOrder: 0
          });
        }
      }
    }

    // 2. Priority Queue (Requests) Section
    playlist.push(
      ...state.priorityQueue.map((req, index) => ({
        ...req,
        isUserRequest: true,
        displayOrder: index + 1
      }))
    );

    // 3. Playlist Section - Circular display
    if (state.inMemoryPlaylist.length > 0) {
      const totalSongs = state.inMemoryPlaylist.length;

      // First: Songs from currentVideoIndex onwards (upcoming)
      for (let i = 0; i < totalSongs; i++) {
        const songIndex = (state.currentVideoIndex + i) % totalSongs;
        const song = state.inMemoryPlaylist[songIndex];

        // Skip the currently playing song (already shown above)
        if (song.title === state.currentlyPlaying) {
          continue;
        }

        playlist.push({
          ...song,
          isUserRequest: false,
          isAlreadyPlayed: false, // All remaining songs are upcoming since we start from currentVideoIndex
          displayOrder: state.priorityQueue.length + i + 1
        });
      }
    }

    return playlist;
  };
  // Load backgrounds asynchronously on mount
  useEffect(() => {
    const loadBackgrounds = async () => {
      try {
        const backgroundAssets = await backgroundService.loadBackgroundAssets();
        setState((prev) => ({
          ...prev,
          backgrounds: backgroundAssets,
        }));
      } catch (error) {
        console.error('Failed to load background assets:', error);
        // Keep empty backgrounds array as fallback
      }
    };

    loadBackgrounds();
  }, []); // Only run once on mount

  return {
    state,
    setState,
    addLog,
    addUserRequest,
    addCreditHistory,
    handleBackgroundUpload,
    handleAddToBackgroundQueue,
    handleRemoveFromBackgroundQueue,
    handleReorderBackgroundQueue,
    handleUpdateBackgroundQueueItem,
    handleTestBackgroundQueue,
    handleBackgroundSettingsChange,
    upcomingTitles: getUpcomingTitles,
    isCurrentSongUserRequest,
    getCurrentPlaylistForDisplay,
  };
}
