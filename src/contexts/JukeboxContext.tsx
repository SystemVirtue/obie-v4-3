/**
 * Jukebox Provider - Central State Management Context
 * 
 * This provider wraps the entire jukebox application, managing state and
 * coordinating between different feature hooks (player, playlist, search, etc.)
 * 
 * @module contexts/JukeboxContext
 */

import { createContext, useContext, FC, ReactNode } from "react";
import { useJukeboxState } from "@/hooks/useJukeboxState";
import { usePlayerManager } from "@/hooks/usePlayerManager";
import { usePlaylistManager } from "@/hooks/usePlaylistManager";
import { useVideoSearch } from "@/hooks/useVideoSearch";
import { useApiKeyRotation } from "@/hooks/useApiKeyRotation";
import { useQuotaErrorHandler } from "@/hooks/useQuotaErrorHandler";
import type { JukeboxFullState } from "@/types/jukebox";
import { useToast } from "@/hooks/use-toast";

// ============================================================================
// Context Type Definition
// ============================================================================

interface JukeboxContextValue {
  // State
  state: JukeboxFullState;
  setState: React.Dispatch<React.SetStateAction<JukeboxFullState>>;
  
  // State helpers from useJukeboxState
  addLog: (
    type: "SONG_PLAYED" | "USER_SELECTION" | "CREDIT_ADDED" | "CREDIT_REMOVED",
    description: string,
    videoId?: string,
    creditAmount?: number
  ) => void;
  addUserRequest: (title: string, videoId: string, channelTitle: string) => void;
  addCreditHistory: (amount: number, type: "ADDED" | "REMOVED", description: string) => void;
  handleBackgroundUpload: (file: File) => Promise<void>;
  getUpcomingTitles: () => string[];
  isCurrentSongUserRequest: () => boolean;
  getCurrentPlaylistForDisplay: () => any[];
  
  // Player manager
  player: {
    initializePlayer: (displayInfo: any) => Promise<void>;
    playSong: (videoId: string, title: string, channelTitle: string) => void;
    playNextInQueue: () => void;
    togglePlayPause: () => void;
    handleSkipSong: () => void;
    handleVolumeChange: (newVolume: number) => void;
    closePlayer: () => void;
  };
  
  // Playlist manager
  playlist: {
    addToQueue: (song: any) => void;
    removeFromQueue: (videoId: string) => void;
    clearQueue: () => void;
    shufflePlaylist: () => void;
    loadPlaylist: (playlistId: string) => Promise<void>;
    handleNextSong: () => void;
    handlePreviousSong: () => void;
  };
  
  // Search
  search: {
    handleSearch: (query: string) => Promise<void>;
    handleVideoSelect: (video: any) => void;
    clearSearch: () => void;
  };
  
  // API key rotation
  apiKeyRotation: {
    checkAndRotateIfNeeded: () => Promise<void>;
    manualRotate: () => Promise<void>;
  };
  
  // Toast notifications
  toast: ReturnType<typeof useToast>["toast"];
}

// ============================================================================
// Context Creation
// ============================================================================

const JukeboxContext = createContext<JukeboxContextValue | null>(null);

// ============================================================================
// Provider Component
// ============================================================================

interface JukeboxProviderProps {
  children: ReactNode;
}

export const JukeboxProvider: FC<JukeboxProviderProps> = ({ children }) => {
  const { toast } = useToast();
  
  // Initialize core state
  const jukeboxStateHook = useJukeboxState();
  const {
    state,
    setState,
    addLog,
    addUserRequest,
    addCreditHistory,
    handleBackgroundUpload,
    getUpcomingTitles,
    isCurrentSongUserRequest,
    getCurrentPlaylistForDisplay,
  } = jukeboxStateHook;

  // Initialize player manager
  const playerManager = usePlayerManager(
    state,
    setState,
    addLog,
    (displayInfo) => {
      // Display confirmation callback
      setState((prev) => ({
        ...prev,
        showDisplayConfirmation: true,
        pendingDisplayInfo: displayInfo,
      }));
    }
  );

  // Initialize playlist manager
  const playlistManager = usePlaylistManager(
    state,
    setState,
    addLog,
    playerManager.playSong,
    toast
  );

  // Initialize API key rotation
  const apiKeyRotation = useApiKeyRotation(state, setState, addLog);

  // Initialize quota error handler
  useQuotaErrorHandler(state, setState, apiKeyRotation.checkAndRotateIfNeeded);

  // Initialize search
  const searchManager = useVideoSearch(
    state,
    setState,
    addLog,
    playlistManager.addToQueue,
    addCreditHistory,
    toast,
    apiKeyRotation.checkAndRotateIfNeeded
  );

  // Construct context value
  const contextValue: JukeboxContextValue = {
    // State
    state,
    setState,
    addLog,
    addUserRequest,
    addCreditHistory,
    handleBackgroundUpload,
    getUpcomingTitles,
    isCurrentSongUserRequest,
    getCurrentPlaylistForDisplay,
    
    // Player
    player: {
      initializePlayer: playerManager.initializePlayer,
      playSong: playerManager.playSong,
      playNextInQueue: playerManager.playNextInQueue,
      togglePlayPause: playerManager.togglePlayPause,
      handleSkipSong: playerManager.handleSkipSong,
      handleVolumeChange: playerManager.handleVolumeChange,
      closePlayer: playerManager.closePlayer,
    },
    
    // Playlist
    playlist: {
      addToQueue: playlistManager.addToQueue,
      removeFromQueue: playlistManager.removeFromQueue,
      clearQueue: playlistManager.clearQueue,
      shufflePlaylist: playlistManager.shufflePlaylist,
      loadPlaylist: playlistManager.loadPlaylist,
      handleNextSong: playlistManager.handleNextSong,
      handlePreviousSong: playlistManager.handlePreviousSong,
    },
    
    // Search
    search: {
      handleSearch: searchManager.handleSearch,
      handleVideoSelect: searchManager.handleVideoSelect,
      clearSearch: searchManager.clearSearch,
    },
    
    // API key rotation
    apiKeyRotation: {
      checkAndRotateIfNeeded: apiKeyRotation.checkAndRotateIfNeeded,
      manualRotate: apiKeyRotation.checkAndRotateIfNeeded,
    },
    
    // Toast
    toast,
  };

  return (
    <JukeboxContext.Provider value={contextValue}>
      {children}
    </JukeboxContext.Provider>
  );
};

// ============================================================================
// Custom Hook
// ============================================================================

/**
 * Hook to access jukebox context
 * 
 * @throws {Error} If used outside of JukeboxProvider
 * @returns Jukebox context value with state and actions
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { state, player, playlist } = useJukebox();
 *   
 *   return (
 *     <button onClick={() => player.togglePlayPause()}>
 *       {state.isPlaying ? 'Pause' : 'Play'}
 *     </button>
 *   );
 * }
 * ```
 */
export const useJukebox = (): JukeboxContextValue => {
  const context = useContext(JukeboxContext);
  
  if (!context) {
    throw new Error(
      "useJukebox must be used within a JukeboxProvider. " +
      "Wrap your component tree with <JukeboxProvider>."
    );
  }
  
  return context;
};

// ============================================================================
// Convenience Hooks
// ============================================================================

/**
 * Hook to access only jukebox state (read-only)
 */
export const useJukeboxStateOnly = () => {
  const { state } = useJukebox();
  return state;
};

/**
 * Hook to access only player controls
 */
export const usePlayer = () => {
  const { player, state } = useJukebox();
  return { ...player, isPlaying: state.isPlaying, volume: state.volume };
};

/**
 * Hook to access only playlist controls
 */
export const usePlaylist = () => {
  const { playlist, state } = useJukebox();
  return {
    ...playlist,
    queue: state.queue,
    priorityQueue: state.priorityQueue,
    playlist: state.inMemoryPlaylist,
  };
};

/**
 * Hook to access only search functionality
 */
export const useSearch = () => {
  const { search, state } = useJukebox();
  return {
    ...search,
    query: state.searchQuery,
    results: state.searchResults,
    isSearching: state.isSearching,
  };
};

/**
 * Export the context for advanced use cases
 */
export { JukeboxContext };
