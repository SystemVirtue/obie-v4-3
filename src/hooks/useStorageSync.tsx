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
  const lastHeartbeatRef = useRef<number>(Date.now());
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout>();

  // Keep refs updated
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    handleVideoEndedRef.current = handleVideoEnded;
  }, [handleVideoEnded]);

  // Clear heartbeat timeout when player stops running
  useEffect(() => {
    if (!state.isPlayerRunning && heartbeatTimeoutRef.current) {
      console.log("[StorageSync] Player stopped running, clearing heartbeat timeout");
      clearTimeout(heartbeatTimeoutRef.current);
      heartbeatTimeoutRef.current = undefined;
    }
  }, [state.isPlayerRunning]);

  /**
   * Handle storage change events from player window
   * Processes jukeboxStatus events
   */
  const handleStorageChange = useCallback(
    (event: StorageEvent) => {
      // Handle jukeboxStatus events (player status updates)
      if (event.key === "jukeboxStatus" && event.newValue) {
        try {
          const status = JSON.parse(event.newValue);
          const currentState = stateRef.current;
          
          console.log("[StorageSync] Received heartbeat:", status, "isPlayerRunning:", currentState.isPlayerRunning);
          
          // Update last heartbeat timestamp for any status message
          lastHeartbeatRef.current = Date.now();
          
          // Only set heartbeat timeout if player is supposed to be running
          if (currentState.isPlayerRunning) {
            // Clear any existing heartbeat timeout
            if (heartbeatTimeoutRef.current) {
              console.log("[StorageSync] Clearing existing heartbeat timeout");
              clearTimeout(heartbeatTimeoutRef.current);
            }
            
            // Set new heartbeat timeout (10 seconds - slightly longer than player heartbeat interval)
            heartbeatTimeoutRef.current = setTimeout(() => {
              console.log("[StorageSync] Player heartbeat timeout - checking if player window is still responsive");
            }, 10000);
          } else {
            console.log("[StorageSync] Player not running, ignoring heartbeat timeout");
          }
          
          // Only log in development to reduce console noise
          if (process.env.NODE_ENV === 'development') {
            console.log("[StorageSync] Parsed status:", status);
            console.log("[StorageSync] Current video ID in state:", currentState.currentVideoId);
          }

          // Update currently playing when video starts
          if (status.status === "playing" && status.title && status.videoId) {
            const cleanTitle = status.title.replace(/\([^)]*\)/g, "").trim();
            
            // Check if this is a new song (different from last playing)
            if (cleanTitle !== currentState.lastPlayingId) {
              if (process.env.NODE_ENV === 'development') {
                console.log("[StorageSync] New song detected. Updating currently playing:", cleanTitle, "VideoID:", status.videoId);
                console.log("[StorageSync] Previous lastPlayingId:", currentState.lastPlayingId);
              }
              
              setState((prev) => ({
                ...prev,
                lastPlayingId: prev.currentlyPlaying, // Store current as last playing before updating
                currentlyPlaying: cleanTitle,
                currentVideoId: status.videoId,
              }));

              // Force UI update for coming up titles
              setTimeout(() => {
                setState((prev) => ({ ...prev }));
              }, 100);
            } else {
              if (process.env.NODE_ENV === 'development') {
                console.log("[StorageSync] Ignoring duplicate song status:", cleanTitle, "VideoID:", status.videoId);
              }
            }
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

        // Handle fade complete (natural end of song)
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

        // Handle skip complete (manual skip with fade)
        if (status.status === "skipComplete") {
          const statusVideoId = status.id;
          console.log("[StorageSync] Skip complete. Status ID:", statusVideoId);

          // For skips, just update the UI state but don't trigger handleVideoEnded
          // The performSkip function already handles playing the next song
          if (statusVideoId && statusVideoId === currentState.currentVideoId) {
            console.log("[StorageSync] Skip complete for current video");
            
            setState((prev) => ({
              ...prev,
              currentlyPlaying: "Loading...",
              currentVideoId: "",
            }));
          }
        }

        // Handle pause complete (pause with fade)
        if (status.status === "pauseComplete") {
          const statusVideoId = status.id;
          console.log("[StorageSync] Pause complete. Status ID:", statusVideoId);

          // For pauses, just log the completion - no state changes needed
          // The pause command already set isPlayerPaused: true
          if (statusVideoId && statusVideoId === currentState.currentVideoId) {
            console.log("[StorageSync] Pause complete for current video, video is now faded out and paused");
          } else {
            console.log("[StorageSync] Video ID mismatch for pause, ignoring");
          }
        }

        // Handle resume complete (resume with fade)
        if (status.status === "resumeComplete") {
          const statusVideoId = status.id;
          console.log("[StorageSync] Resume complete. Status ID:", statusVideoId);

          // For resumes, just log the completion - no state changes needed
          // The resume command already set isPlayerPaused: false
          if (statusVideoId && statusVideoId === currentState.currentVideoId) {
            console.log("[StorageSync] Resume complete for current video, video is now playing");
          } else {
            console.log("[StorageSync] Video ID mismatch for resume, ignoring");
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
      if (heartbeatTimeoutRef.current) {
        clearTimeout(heartbeatTimeoutRef.current);
      }
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
