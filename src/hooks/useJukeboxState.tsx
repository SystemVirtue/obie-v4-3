import { useState, useEffect, Dispatch, SetStateAction } from "react";
import { SearchMethod } from "@/services/youtube/search";
import { config } from "@/config";
import type {
  JukeboxFullState,
  SearchResult,
  PlaylistItem,
  QueuedRequest,
  LogEntry,
  UserRequest,
  CreditHistory,
  BackgroundFile,
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
      console.log("[UserPreferences] Loaded from localStorage:", Object.keys(prefs).length, "settings");

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
      hideEndCards: state.hideEndCards,
      coinValueA: state.coinValueA,
      coinValueB: state.coinValueB,
      selectedDisplay: state.selectedDisplay,
      useFullscreen: state.useFullscreen,
      autoDetectDisplay: state.autoDetectDisplay,
      playerWindowPosition: state.playerWindowPosition,
    };
    localStorage.setItem("USER_PREFERENCES", JSON.stringify(preferencesToSave));
    console.log("[UserPreferences] Settings saved to localStorage");
  } catch (error) {
    console.error("[UserPreferences] Error saving preferences:", error);
  }
};

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
    showMiniPlayer: userPreferences.showMiniPlayer ?? false,
    
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
    coinValueA: userPreferences.coinValueA ?? 3,
    coinValueB: userPreferences.coinValueB ?? 1,
    
    // Background configuration
    backgrounds: [
      {
        id: "default",
        name: "Default",
        url: "/lovable-uploads/8948bfb8-e172-4535-bd9b-76f9d1c35307.png",
        type: "image",
      },
      {
        id: "neon1",
        name: "Neon 1",
        url: "/backgrounds/Obie_NEON1.png",
        type: "image",
      },   
      {
        id: "carla",
        name: "Carla",
        url: "/backgrounds/Obie - Carla v1.mp4",
        type: "video",
      },
      {
        id: "neon2",
        name: "Neon 2",
        url: "/backgrounds/Obie_NEON2.png",
        type: "image",
      },
      {
        id: "crest1",
        name: "Shield Crest 1",
        url: "/backgrounds/Obie_Shield_Crest_Animation1.mp4",
        type: "video",
      },
      {
        id: "crest2",
        name: "Shield Crest 2",
        url: "/backgrounds/Obie_Shield_Crest_Animation2.mp4",
        type: "video",
      },
    ],
    selectedBackground: userPreferences.selectedBackground || "neon1",
    cycleBackgrounds: userPreferences.cycleBackgrounds ?? true,
    bounceVideos: userPreferences.bounceVideos ?? false,
    backgroundCycleIndex: 0,

    // Display configuration
    selectedDisplay: userPreferences.selectedDisplay || "",
    useFullscreen: userPreferences.useFullscreen ?? true,
    autoDetectDisplay: userPreferences.autoDetectDisplay ?? true,
    playerWindowPosition: userPreferences.playerWindowPosition || null,
    
    // History state
    logs: [],
    userRequests: [],
    creditHistory: [],
    
    // Runtime state
    allKeysExhausted: false,
    isAppPaused: false,
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
    state.playerWindowPosition,
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

  const getUpcomingTitles = () => {
    const upcoming = [];

    // Add priority queue songs first (will be displayed in white)
    for (let i = 0; i < state.priorityQueue.length; i++) {
      upcoming.push(`PRIORITY:${state.priorityQueue[i].title}`);
    }

    // Fill remaining slots with in-memory playlist songs starting from currentVideoIndex
    // (showing the actual upcoming songs)
    if (state.inMemoryPlaylist.length > 0) {
      const startIndex = state.currentVideoIndex + 0; // Start from current position
      const remainingSlots = 4 - upcoming.length;

      for (
        let i = startIndex;
        i < Math.min(startIndex + remainingSlots, state.inMemoryPlaylist.length);
        i++
      ) {
        if (i >= 0 && i < state.inMemoryPlaylist.length) {
          upcoming.push(state.inMemoryPlaylist[i].title);
        }
      }
    }

    return upcoming;
  };

  const isCurrentSongUserRequest = () => {
    return state.userRequests.some(
      (req) => req.title === state.currentlyPlaying,
    );
  };

  const getCurrentPlaylistForDisplay = () => {
    const playlist = [];

    // Add currently playing song at top
    if (state.currentlyPlaying && state.currentlyPlaying !== "Loading...") {
      playlist.push({
        id: "now-playing",
        title: state.currentlyPlaying,
        channelTitle: "Now Playing",
        videoId: "current",
        isNowPlaying: true,
      });
    }

    // Add priority queue
    playlist.push(
      ...state.priorityQueue.map((req) => ({
        ...req,
        isUserRequest: true,
      })),
    );

    // Add next songs from in-memory playlist, but skip if it's the currently playing song
    playlist.push(
      ...state.inMemoryPlaylist
        .filter((song) => song.title !== state.currentlyPlaying)
        .map((song) => ({
          ...song,
          isUserRequest: false,
        })),
    );

    return playlist;
  };

  return {
    state,
    setState,
    addLog,
    addUserRequest,
    addCreditHistory,
    handleBackgroundUpload,
    getUpcomingTitles,
    isCurrentSongUserRequest,
    getCurrentPlaylistForDisplay,
  };
};
