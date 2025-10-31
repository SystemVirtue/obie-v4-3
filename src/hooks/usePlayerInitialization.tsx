/**
 * Player Initialization Hook
 * 
 * Manages automatic player initialization and first song autoplay logic.
 * Ensures the player starts playing when:
 * - Playlist has songs
 * - No priority queue items
 * - Player is not paused
 * - Nothing is currently playing
 * 
 * @module hooks/usePlayerInitialization
 */

import { useRef, useEffect } from "react";
import { logger } from "@/utils/logger";
import { JukeboxFullState } from "@/types/jukebox";

export interface UsePlayerInitializationOptions {
  state: JukeboxFullState;
  playNextSong: () => void;
  showDisplaySelectionDialog: () => void;
}

/**
 * Hook to handle automatic player initialization and first song autoplay
 * 
 * @param options - Configuration options
 * @returns void
 * 
 * @example
 * ```tsx
 * usePlayerInitialization({
 *   state: jukebox.state,
 *   playNextSong: playlistManager.playNextSong
 * });
 * ```
 */
export const usePlayerInitialization = ({
  state,
  playNextSong,
  showDisplaySelectionDialog,
}: UsePlayerInitializationOptions): void => {
  // Track if we've already started the first song to prevent multiple triggers
  const hasStartedFirstSongRef = useRef(false);

  /**
   * Auto-start first song when conditions are met:
   * - Playlist has songs (inMemoryPlaylist.length > 0)
   * - No priority queue items (priorityQueue.length === 0)
   * - Player is not paused (!isPlayerPaused)
   * - Nothing is currently playing or showing "Loading..."
   * - Haven't already started a song (hasStartedFirstSongRef === false)
   * - Current song doesn't show an error
   */
  useEffect(() => {
    // Only log detailed conditions when debugging or when something significant changes
    const shouldLog = process.env.NODE_ENV === 'development' &&
      (state.inMemoryPlaylist.length > 0 || state.priorityQueue.length > 0);

    if (shouldLog) {
      logger.debug("Checking autoplay conditions:", {
        inMemoryLength: state.inMemoryPlaylist.length,
        priorityQueueLength: state.priorityQueue.length,
        isPlayerRunning: state.isPlayerRunning,
        currentlyPlaying: state.currentlyPlaying,
        hasStarted: hasStartedFirstSongRef.current,
      });
    }

    // Check if conditions are met for autoplay
    if (
      state.inMemoryPlaylist.length > 0 &&
      state.priorityQueue.length === 0 &&
      !state.isPlayerPaused
    ) {
      // Only auto-start if nothing is currently playing and not already started
      // Also prevent autoplay if there's a player error
      const shouldAutoStart =
        (state.currentlyPlaying === "Loading..." || state.currentlyPlaying === "") &&
        !hasStartedFirstSongRef.current &&
        !state.currentlyPlaying.includes("Error");

      if (shouldAutoStart) {
        hasStartedFirstSongRef.current = true;

        console.log("[PlayerInit] Auto-starting first song from playlist...");
        console.log("[PlayerInit] Current playlist state:", {
          inMemoryLength: state.inMemoryPlaylist.length,
          firstSong: state.inMemoryPlaylist[0]?.title,
          priorityQueue: state.priorityQueue.length,
        });

        // Check if player window needs initialization
        const needsPlayerInit =
          !state.playerWindow ||
          state.playerWindow.closed ||
          !state.isPlayerRunning;

        // Skip player initialization if mini player mode is active
        if (state.showMiniPlayer) {
          console.log("[PlayerInit] Mini player mode active, skipping window initialization");
          // Still start the song since the embedded player will handle it
          setTimeout(() => playNextSong(), 0);
        } else if (needsPlayerInit) {
          console.log("[PlayerInit] Player window closed/not running");

          // Check if we should show display selection dialog on startup
          if (state.showDisplaySelectionDialogOnStartup) {
            console.log("[PlayerInit] Showing display selection dialog on startup");
            showDisplaySelectionDialog();
          } else {
            console.log("[PlayerInit] Player initialization needed but delegating to auto-init system");
            // Don't call initializePlayer() here - let the auto-init system in Index.tsx handle it
            // This prevents duplicate initialization calls
          }
        } else {
          // Player is ready, start immediately
          console.log("[PlayerInit] Player ready, starting song immediately");
          setTimeout(() => playNextSong(), 0);
        }
      }
    } else if (state.inMemoryPlaylist.length === 0) {
      // Reset flag if playlist is empty (allows restart when playlist reloads)
      if (hasStartedFirstSongRef.current) {
        console.log("[PlayerInit] Playlist empty, resetting autostart flag");
        hasStartedFirstSongRef.current = false;
      }
    }
  }, [
    state.inMemoryPlaylist,
    state.priorityQueue,
    state.isPlayerRunning,
    state.isPlayerPaused,
    state.playerWindow,
    state.currentlyPlaying,
    playNextSong,
  ]);

  /**
   * Reset autostart flag when playlist changes dramatically
   * This allows the hook to trigger autostart again if the playlist is reloaded
   */
  useEffect(() => {
    // If we had started but now have no songs, reset for next time
    if (hasStartedFirstSongRef.current && state.inMemoryPlaylist.length === 0) {
      console.log("[PlayerInit] Playlist cleared, resetting autostart capability");
      hasStartedFirstSongRef.current = false;
    }
  }, [state.inMemoryPlaylist.length]);
};
