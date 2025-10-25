/**
 * Storage Sync Hook
 * 
 * Manages synchronization between the main jukebox interface and the player window
 * via localStorage events. Handles:
 * - Video playback status updates
 * - Video ended/error events with auto-skip
 * - Command messages from player window
 * - Emergency playlist recovery
 * 
 * @module hooks/useStorageSync
 */

import { useEffect, useCallback, useRef } from "react";
import type { JukeboxFullState, LogEntry } from "@/types/jukebox";

export interface UseStorageSyncOptions {
  state: JukeboxFullState;
  setState: React.Dispatch<React.SetStateAction<JukeboxFullState>>;
  addLog: (
    type: LogEntry["type"],
    description: string,
    videoId?: string,
    creditAmount?: number
  ) => void;
  handleVideoEnded: () => void;
  toast?: any;
}

/**
 * Hook to sync state via localStorage between main interface and player window
 * 
 * @param options - Configuration options
 * @returns void
 * 
 * @example
 * ```tsx
 * useStorageSync({
 *   state: jukebox.state,
 *   setState: jukebox.setState,
 *   addLog: jukebox.addLog,
 *   handleVideoEnded: playlistManager.handleVideoEnded,
 *   toast: jukebox.toast
 * });
 * ```
 */
export const useStorageSync = ({
  state,
  setState,
  addLog,
  handleVideoEnded,
  toast,
}: UseStorageSyncOptions): void => {
  // Use refs to access latest values without triggering re-renders
  const stateRef = useRef(state);
  const handleVideoEndedRef = useRef(handleVideoEnded);

  // Keep refs updated
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    handleVideoEndedRef.current = handleVideoEnded;
  }, [handleVideoEnded]);

  /**
   * Handle storage change events from player window
   * Processes jukeboxStatus and jukeboxCommand events
   */
  const handleStorageChange = useCallback(
    (event: StorageEvent) => {
      // Handle jukeboxStatus events (player status updates)
      if (event.key === "jukeboxStatus" && event.newValue) {
        try {
          const status = JSON.parse(event.newValue);
          const currentState = stateRef.current;
          console.log("[StorageSync] Parsed status:", status);
          console.log("[StorageSync] Current video ID in state:", currentState.currentVideoId);

          // Update currently playing when video starts
          if (status.status === "playing" && status.title && status.videoId) {
            const cleanTitle = status.title.replace(/\([^)]*\)/g, "").trim();
            console.log("[StorageSync] Updating currently playing:", cleanTitle, "VideoID:", status.videoId);
            
            setState((prev) => ({
            ...prev,
            currentlyPlaying: cleanTitle,
            currentVideoId: status.videoId,
          }));

          // Force UI update for coming up titles
          setTimeout(() => {
            setState((prev) => ({ ...prev }));
          }, 100);
        }

        // Handle video ended or test mode complete
        if (status.status === "ended" || status.status === "testModeComplete") {
          const statusVideoId = status.id || status.videoId;
          console.log("[StorageSync] Video ended. Status ID:", statusVideoId, "Current ID:", currentState.currentVideoId);

          if (statusVideoId && statusVideoId === currentState.currentVideoId) {
            console.log("[StorageSync] Video IDs match, processing end event");
            
            setState((prev) => ({
              ...prev,
              currentlyPlaying: "Loading...",
              currentVideoId: "",
            }));

            // Trigger next song
            setTimeout(() => {
              console.log("[StorageSync] Triggering handleVideoEnded for autoplay");
              handleVideoEndedRef.current();

              // Update UI
              setTimeout(() => {
                setState((prev) => ({ ...prev }));
              }, 500);
            }, 500);

            // Safety timeout: force next song if still loading after 10s
            setTimeout(() => {
              setState((currentState) => {
                if (currentState.currentlyPlaying === "Loading...") {
                  console.warn("[StorageSync] Still loading after 10s, forcing next song");
                  handleVideoEndedRef.current();
                  return { ...currentState, currentlyPlaying: "Recovering..." };
                }
                return currentState;
              });
            }, 10000);
          } else {
            console.log("[StorageSync] Video ID mismatch, ignoring end event");
          }
        }

        // Handle fade complete (skip with fade animation)
        if (status.status === "fadeComplete") {
          const statusVideoId = status.id;
          console.log("[StorageSync] Fade complete. Status ID:", statusVideoId);

          if (statusVideoId && statusVideoId === currentState.currentVideoId) {
            console.log("[StorageSync] Fade complete for current video, processing autoplay");
            
            setState((prev) => ({
              ...prev,
              currentlyPlaying: "Loading...",
              currentVideoId: "",
            }));

            setTimeout(() => {
              console.log("[StorageSync] Triggering handleVideoEnded after fade");
              handleVideoEndedRef.current();

              // Update UI
              setTimeout(() => {
                setState((prev) => ({ ...prev }));
              }, 500);
            }, 500);

            // Safety timeout for fade
            setTimeout(() => {
              setState((currentState) => {
                if (currentState.currentlyPlaying === "Loading...") {
                  console.warn("[StorageSync] Still loading after fade timeout, forcing next song");
                  handleVideoEndedRef.current();
                  return { ...currentState, currentlyPlaying: "Recovering..." };
                }
                return currentState;
              });
            }, 10000);
          }
        }

        // Handle video errors/unavailable - auto-skip
        if (status.status === "error" || status.status === "unavailable") {
          const statusVideoId = status.id;
          console.log("[StorageSync] Video error/unavailable. Status ID:", statusVideoId);

          if (statusVideoId && statusVideoId === currentState.currentVideoId) {
            console.log("[StorageSync] Auto-skipping unavailable video");
            
            addLog(
              "SONG_PLAYED",
              `Auto-skipping unavailable video: ${currentState.currentlyPlaying}`,
            );
            
            setState((prev) => ({
              ...prev,
              currentlyPlaying: "Loading...",
              currentVideoId: "",
            }));

            setTimeout(() => {
              console.log("[StorageSync] Triggering handleVideoEnded after error");
              handleVideoEndedRef.current();

              // Update UI
              setTimeout(() => {
                setState((prev) => ({ ...prev }));
              }, 500);
            }, 1000);

            // Safety timeout for error case
            setTimeout(() => {
              setState((currentState) => {
                if (currentState.currentlyPlaying === "Loading...") {
                  console.warn("[StorageSync] Still loading after error timeout, forcing next song");
                  handleVideoEndedRef.current();
                  return { ...currentState, currentlyPlaying: "Recovering..." };
                }
                return currentState;
              });
            }, 11000); // 1000ms initial delay + 10000ms safety
          }
        }

        // Handle player ready status
        if (status.status === "ready") {
          console.log("[StorageSync] Player window ready");
        }
        } catch (error) {
          console.warn("[StorageSync] Failed to parse jukeboxStatus JSON:", error);
        }
      }

      // Handle jukeboxCommand events (play commands from player)
      if (event.key === "jukeboxCommand" && event.newValue) {
        const command = JSON.parse(event.newValue);
        
        if (command.action === "play" && command.title && command.videoId) {
          console.log("[StorageSync] Play command detected:", command.videoId, command.title);
          
          const cleanTitle = command.title.replace(/\([^)]*\)/g, "").trim();
          setState((prev) => ({
            ...prev,
            currentlyPlaying: cleanTitle,
            currentVideoId: command.videoId,
          }));

          // Force UI update
          setTimeout(() => {
            setState((prev) => ({ ...prev }));
          }, 100);
        }
      }
    },
    [setState, addLog],
  );

  /**
   * Set up storage event listener and polling
   * 
   * IMPORTANT: Storage events don't fire in the same window that made the change,
   * so we use polling to detect changes made by the player window
   */
  useEffect(() => {
    window.addEventListener("storage", handleStorageChange);
    
    // Poll for localStorage changes (storage events don't fire in same window)
    let lastStatus = localStorage.getItem('jukeboxStatus');
    const pollInterval = setInterval(() => {
      const currentStatus = localStorage.getItem('jukeboxStatus');
      if (currentStatus !== lastStatus) {
        lastStatus = currentStatus;
        if (currentStatus) {
          // Simulate storage event for polling-detected changes
          handleStorageChange({
            key: 'jukeboxStatus',
            newValue: currentStatus,
            oldValue: null,
            url: window.location.href,
            storageArea: localStorage,
          } as StorageEvent);
        }
      }
    }, 250); // Check every 250ms for responsiveness
    
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(pollInterval);
    };
  }, [handleStorageChange]);

  /**
   * Emergency recovery event listener
   * Handles emergency playlist injection when normal loading fails
   */
  useEffect(() => {
    const handleEmergencyPlaylistInject = (event: any) => {
      console.log("[StorageSync] Emergency playlist injection received");
      const { playlist } = event.detail;

      if (playlist && Array.isArray(playlist)) {
        setState((prev) => ({
          ...prev,
          defaultPlaylistVideos: playlist,
          inMemoryPlaylist: [...playlist],
          currentVideoIndex: 0,
        }));

        if (toast) {
          toast({
            title: "Emergency Recovery",
            description: `Injected ${playlist.length} songs from emergency fallback playlist.`,
            variant: "default",
          });
        }

        console.log(`[StorageSync] Successfully injected ${playlist.length} songs`);
      }
    };

    window.addEventListener("emergency-playlist-inject", handleEmergencyPlaylistInject);
    
    return () => {
      window.removeEventListener("emergency-playlist-inject", handleEmergencyPlaylistInject);
    };
  }, [setState, toast]);
};
