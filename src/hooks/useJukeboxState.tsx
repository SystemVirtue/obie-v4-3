import { useState, useEffect } from "react";
import { SearchMethod } from "@/services/musicSearch";

export interface SearchResult {
  id: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  videoUrl: string;
  officialScore?: number;
  duration?: string;
  durationMinutes?: number;
}

export interface PlaylistItem {
  id: string;
  title: string;
  channelTitle: string;
  videoId: string;
  isNowPlaying?: boolean;
  isUserRequest?: boolean;
}

export interface QueuedRequest {
  id: string;
  title: string;
  channelTitle: string;
  videoId: string;
  timestamp: string;
}

export interface LogEntry {
  timestamp: string;
  type: "SONG_PLAYED" | "USER_SELECTION" | "CREDIT_ADDED" | "CREDIT_REMOVED";
  description: string;
  videoId?: string;
  creditAmount?: number;
}

export interface UserRequest {
  timestamp: string;
  title: string;
  videoId: string;
  channelTitle: string;
}

export interface CreditHistory {
  timestamp: string;
  amount: number;
  type: "ADDED" | "REMOVED";
  description: string;
}

export interface BackgroundFile {
  id: string;
  name: string;
  url: string;
  type: "image" | "video";
}

export interface JukeboxState {
  mode: "FREEPLAY" | "PAID";
  credits: number;
  priorityQueue: QueuedRequest[];
  defaultPlaylist: string;
  defaultPlaylistVideos: PlaylistItem[];
  inMemoryPlaylist: PlaylistItem[];
  currentVideoIndex: number;
  isSearchOpen: boolean;
  isAdminOpen: boolean;
  searchResults: SearchResult[];
  searchQuery: string;
  isSearching: boolean;
  selectedCoinAcceptor: string;
  playerWindow: Window | null;
  apiKey: string;
  selectedApiKeyOption: string;
  customApiKey: string;
  autoRotateApiKeys: boolean;
  lastRotationTime: string;
  rotationHistory: Array<{
    timestamp: string;
    from: string;
    to: string;
    reason: string;
  }>;
  searchMethod: SearchMethod;
  logs: LogEntry[];
  userRequests: UserRequest[];
  creditHistory: CreditHistory[];
  backgrounds: BackgroundFile[];
  selectedBackground: string;
  cycleBackgrounds: boolean;
  bounceVideos: boolean;
  backgroundCycleIndex: number;
  showKeyboard: boolean;
  showSearchResults: boolean;
  isPlayerRunning: boolean;
  currentlyPlaying: string;
  currentVideoId: string;
  maxSongLength: number;
  showInsufficientCredits: boolean;
  showDuplicateSong: boolean;
  duplicateSongTitle: string;
  showDisplayConfirmation: boolean;
  pendingDisplayInfo: any | null;
  isPlayerPaused: boolean;
  showSkipConfirmation: boolean;
  showMiniPlayer: boolean;
  testMode: boolean;
  coinValueA: number;
  coinValueB: number;
  allKeysExhausted: boolean;
  isAppPaused: boolean;
  showApiKeyTestDialog: boolean;
}

// Start with empty API key - will be set by API key test dialog
const DEFAULT_API_KEY = "";
const DEFAULT_PLAYLIST_ID =
  import.meta.env.VITE_DEFAULT_PLAYLIST_ID ||
  "PLN9QqCogPsXJCgeL_iEgYnW6Rl_8nIUUH";

// Load user preferences from localStorage
const loadUserPreferences = (): Partial<JukeboxState> => {
  try {
    const saved = localStorage.getItem("USER_PREFERENCES");
    return saved ? JSON.parse(saved) : {};
  } catch (error) {
    console.error("[UserPreferences] Error loading preferences:", error);
    return {};
  }
};

// Save user preferences to localStorage (exclude runtime state)
const saveUserPreferences = (state: JukeboxState) => {
  try {
    const preferencesToSave = {
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
      coinValueA: state.coinValueA,
      coinValueB: state.coinValueB,
    };
    localStorage.setItem("USER_PREFERENCES", JSON.stringify(preferencesToSave));
    console.log("[UserPreferences] Settings saved to localStorage:", preferencesToSave);
  } catch (error) {
    console.error("[UserPreferences] Error saving preferences:", error);
  }
};

export const useJukeboxState = () => {
  const userPreferences = loadUserPreferences();
  
  const [state, setState] = useState<JukeboxState>({
    mode: (userPreferences.mode as "FREEPLAY" | "PAID") || "PAID",
    credits: userPreferences.credits ?? 0,
    priorityQueue: [],
    defaultPlaylist: userPreferences.defaultPlaylist || DEFAULT_PLAYLIST_ID,
    defaultPlaylistVideos: [],
    inMemoryPlaylist: [],
    currentVideoIndex: 0,
    isSearchOpen: false,
    isAdminOpen: false,
    searchResults: [],
    searchQuery: "",
    isSearching: false,
    selectedCoinAcceptor: userPreferences.selectedCoinAcceptor || "",
    playerWindow: null,
    apiKey: userPreferences.apiKey || DEFAULT_API_KEY,
    selectedApiKeyOption: userPreferences.selectedApiKeyOption || "key1",
    customApiKey: userPreferences.customApiKey || "",
    autoRotateApiKeys: userPreferences.autoRotateApiKeys ?? true,
    lastRotationTime: "",
    rotationHistory: [],
    searchMethod: (userPreferences.searchMethod as SearchMethod) || "scraper",
    logs: [],
    userRequests: [],
    creditHistory: [],
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
    showKeyboard: false,
    showSearchResults: false,
    isPlayerRunning: false,
    currentlyPlaying: "Loading...",
    currentVideoId: "",
    maxSongLength: userPreferences.maxSongLength ?? 10,
    showInsufficientCredits: false,
    showDuplicateSong: false,
    duplicateSongTitle: "",
    showDisplayConfirmation: false,
    pendingDisplayInfo: null,
    isPlayerPaused: false,
    showSkipConfirmation: false,
    showMiniPlayer: userPreferences.showMiniPlayer ?? false,
    testMode: userPreferences.testMode ?? false,
    coinValueA: userPreferences.coinValueA ?? 3,
    coinValueB: userPreferences.coinValueB ?? 1,
    allKeysExhausted: false,
    isAppPaused: false,
    showApiKeyTestDialog: false,
  });

  // Save preferences whenever state changes (debounced to avoid excessive writes)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      saveUserPreferences(state);
      console.log("[UserPreferences] Settings saved to localStorage");
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [state]);

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

    // Add priority queue songs first
    for (let i = 0; i < Math.min(3, state.priorityQueue.length); i++) {
      upcoming.push(`🎵 ${state.priorityQueue[i].title}`);
    }

    // Fill remaining slots with in-memory playlist songs
    // Skip the first song if it's currently playing to avoid showing it in "coming up"
    if (upcoming.length < 3 && state.inMemoryPlaylist.length > 0) {
      const remainingSlots = 3 - upcoming.length;
      const startIndex =
        state.currentlyPlaying !== "Loading..." &&
        state.inMemoryPlaylist.length > 0 &&
        state.inMemoryPlaylist[0].title === state.currentlyPlaying
          ? 1
          : 0;

      for (
        let i = startIndex;
        i <
        Math.min(startIndex + remainingSlots, state.inMemoryPlaylist.length);
        i++
      ) {
        upcoming.push(state.inMemoryPlaylist[i].title);
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
