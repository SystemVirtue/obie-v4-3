import { useToast } from "@/hooks/use-toast";
import { JukeboxState, PlaylistItem, LogEntry } from "./useJukeboxState";
import { displayManager, DisplayInfo } from "@/services/displayManager";
import { youtubeAPIClient } from "@/services/youtube/api/client";
import * as React from 'react';

export const usePlayerManager = (
  state: JukeboxState,
  setState: React.Dispatch<React.SetStateAction<JukeboxState>>,
  addLog: (
    type: LogEntry["type"],
    description: string,
    videoId?: string,
    creditAmount?: number,
  ) => void,
  onDisplayConfirmationNeeded?: (
    displayInfo: DisplayInfo,
    onConfirm: (useFullscreen: boolean, rememberChoice: boolean) => void,
    onCancel: () => void,
  ) => void,
  ) => {
  const { toast } = useToast();
  const lastPlayedSongRef = React.useRef<{ videoId: string; timestamp: number } | null>(null);  const playSong = (
    videoId: string,
    title: string,
    artist: string,
    logType: "SONG_PLAYED" | "USER_SELECTION",
    retryCount: number = 0,
  ) => {
    const MAX_RETRIES = 2;

    // Validate input parameters
    if (!videoId || !title) {
      console.error("[PlaySong] Invalid parameters:", {
        videoId,
        title,
        artist,
      });
      toast({
        title: "Invalid Song",
        description: "Cannot play song - missing video ID or title.",
        variant: "destructive",
      });
      return;
    }

    // Prevent duplicate play commands for the same song within a short time window
    const now = Date.now();
    if (lastPlayedSongRef.current &&
        lastPlayedSongRef.current.videoId === videoId &&
        (now - lastPlayedSongRef.current.timestamp) < 2000) { // 2 second deduplication window
      console.log(`[PlaySong] Duplicate play command prevented for: ${videoId} - ${title}`);
      return;
    }

    // Update last played song reference
    lastPlayedSongRef.current = { videoId, timestamp: now };

    console.log(
      `[PlaySong] Starting: ${videoId} - ${title} by ${artist} (retry: ${retryCount})`,
    );

    // Prevent infinite loops by limiting retries
    if (retryCount >= MAX_RETRIES) {
      console.error(
        `[PlaySong] Maximum retry attempts reached for ${videoId} - ${title}, stopping`,
      );

      // Set a more informative error state
      setState((prev) => ({
        ...prev,
        currentlyPlaying: "Player Error - Please restart",
        currentVideoId: "",
      }));

      toast({
        title: "Player Error",
        description:
          "Unable to play song after multiple attempts. Please open player manually or restart the app.",
        variant: "destructive",
      });
      return;
    }

    // Use setState callback to get current state and avoid stale closures
    setState((currentState) => {
      console.log(`[PlaySong] Current player window state:`, {
        exists: !!currentState.playerWindow,
        closed: currentState.playerWindow?.closed,
        isPlayerRunning: currentState.isPlayerRunning,
      });

      // If no player window exists, try to create one immediately
      if (!currentState.playerWindow || currentState.playerWindow.closed) {
        console.warn(
          "[PlaySong] No player window available, creating one now...",
        );

        // Try to open player window immediately
        const emergencyPlayerWindow = window.open(
          "/player.html",
          "JukeboxPlayer",
          "width=800,height=600,scrollbars=no,menubar=no,toolbar=no,location=no,status=no",
        );

        if (emergencyPlayerWindow) {
          console.log(
            "[PlaySong] Emergency player window created successfully",
          );

          // Update state with new window
          const newState = {
            ...currentState,
            playerWindow: emergencyPlayerWindow,
            isPlayerRunning: true,
          };

          // Use a flag to prevent double retries
          let hasRetried = false;

          // Wait for window to load before retrying
          const handleLoad = () => {
            if (!hasRetried) {
              hasRetried = true;
              console.log("[PlaySong] Emergency window loaded, retrying song");
              setTimeout(() => {
                playSong(videoId, title, artist, logType, retryCount + 1);
              }, 1000);
            }
          };

          emergencyPlayerWindow.addEventListener("load", handleLoad);

          // Fallback timeout in case load event doesn't fire (reduced to avoid conflicts)
          setTimeout(() => {
            if (!hasRetried) {
              hasRetried = true;
              console.log("[PlaySong] Fallback retry with emergency window");
              emergencyPlayerWindow.removeEventListener("load", handleLoad);
              playSong(videoId, title, artist, logType, retryCount + 1);
            }
          }, 2000);

          return newState;
        } else {
          console.error("[PlaySong] Could not create emergency player window");
          toast({
            title: "Player Window Required",
            description:
              "Please click 'Open Player' in the admin panel to start the video player.",
            variant: "destructive",
          });
          return currentState;
        }
      }

      // Player window exists and is not closed, send play command
      if (currentState.playerWindow && !currentState.playerWindow.closed) {
        // Calculate total queue size (priority queue + in-memory playlist)
        const totalQueueSize = currentState.priorityQueue.length + currentState.inMemoryPlaylist.length;
        
        const command = {
          action: "play",
          videoId: videoId,
          title: title,
          artist: artist,
          timestamp: Date.now(),
          testMode: currentState.testMode,
          queueCount: totalQueueSize,
          videoQuality: currentState.videoQuality,
        };

        try {
          // Set command in parent window's localStorage - it will be visible to player window
          localStorage.setItem(
            "jukeboxCommand",
            JSON.stringify(command),
          );

          console.log(
            `[PlaySong] Command sent successfully. VideoID: ${videoId}, TestMode: ${currentState.testMode}`,
          );

          const description =
            logType === "USER_SELECTION"
              ? `Playing user request: ${title}${currentState.testMode ? " (TEST MODE - 20s)" : ""}`
              : `Autoplay: ${title}${currentState.testMode ? " (TEST MODE - 20s)" : ""}`;
          addLog(logType, description, videoId);

          // Update state with new video info
          return {
            ...currentState,
            currentlyPlaying: title.replace(/\([^)]*\)/g, "").trim(),
            currentVideoId: videoId,
          };
        } catch (error) {
          console.error("[PlaySong] Error sending command to player:", error);
          return currentState;
        }
      } else {
        console.error("[PlaySong] Player window not available for retry");
        console.log("[PlaySong] Current state details:", {
          playerWindow: currentState.playerWindow,
          isPlayerRunning: currentState.isPlayerRunning,
          windowClosed: currentState.playerWindow?.closed,
          windowExists: !!currentState.playerWindow,
        });

        toast({
          title: "Player Window Missing",
          description:
            "Player window not available. Please use admin panel to open player.",
          variant: "destructive",
        });

        return currentState;
      }
    });
  };

  const initializePlayer = async () => {
    console.log("[InitPlayer] Starting player initialization...");
    console.log("[InitPlayer] Current state:", {
      hasWindow: !!state.playerWindow,
      windowClosed: state.playerWindow?.closed,
      isRunning: state.isPlayerRunning,
      showMiniPlayer: state.showMiniPlayer,
    });

    // If mini player mode is active, don't initialize a window
    if (state.showMiniPlayer) {
      console.log("[InitPlayer] Mini player mode active, skipping window initialization");
      return;
    }

    // If display selection dialog is open or should be shown on startup, don't initialize
    if (state.showDisplaySelectionDialog || state.showDisplaySelectionDialogOnStartup) {
      console.log("[InitPlayer] Display selection dialog is active, skipping player initialization");
      return;
    }

    // Add cooldown to prevent rapid initialization attempts
    const lastInitAttempt = localStorage.getItem("lastInitAttempt");
    if (lastInitAttempt) {
      const timeSinceLastInit = Date.now() - parseInt(lastInitAttempt);
      if (timeSinceLastInit < 2000) {
        // 2 second cooldown (reduced from 5 seconds)
        console.log("[InitPlayer] Cooldown active, skipping initialization");
        return;
      }
    }
    localStorage.setItem("lastInitAttempt", Date.now().toString());

    // Check if player window state exists in localStorage
    const playerWindowState = localStorage.getItem("jukeboxPlayerWindowState");
    if (playerWindowState) {
      try {
        const parsedState = JSON.parse(playerWindowState);
        const timeSinceClose = Date.now() - parsedState.timestamp;

        // If player was closed recently (within 30 seconds), don't auto-reopen
        if (parsedState.isClosed && timeSinceClose < 30000) {
          console.log(
            "[InitPlayer] Player was recently closed by user, skipping auto-initialization",
          );
          return;
        }
      } catch (error) {
        console.warn(
          "[InitPlayer] Failed to parse player window state:",
          error,
        );
      }
    }

    if (state.playerWindow && !state.playerWindow.closed) {
      console.log("[InitPlayer] Player window already exists and is open");
      return;
    }

    try {
      // Try to detect displays, but fall back gracefully if it fails
      console.log("[InitPlayer] Attempting to detect available displays...");
      let displays: DisplayInfo[] = [];
      let displayDetectionFailed = false;

      try {
        const displayPromise = displayManager.getDisplays();
        const timeoutPromise = new Promise<DisplayInfo[]>((_, reject) =>
          setTimeout(() => reject(new Error("Display detection timeout")), 2000),
        );

        displays = await Promise.race([displayPromise, timeoutPromise]);
        console.log("[InitPlayer] Available displays:", displays);
      } catch (displayError) {
        console.warn("[InitPlayer] Display detection failed, using fallback:", displayError);
        displayDetectionFailed = true;
        // Fallback to primary display only
        displays = [{
          id: "primary",
          name: "Primary Display",
          width: window.screen.availWidth || window.screen.width,
          height: window.screen.availHeight || window.screen.height,
          left: 0,
          top: 0,
          isPrimary: true,
          isInternal: true,
        }];
      }

      let targetDisplay = null;
      let useFullscreen = false;

      // Check if user has a default player display setting
      if (state.userDefaultPlayerDisplay) {
        console.log("[InitPlayer] Using user default player display:", state.userDefaultPlayerDisplay);
        const userDisplay = displays.find(d => d.id === state.userDefaultPlayerDisplay!.displayId);
        if (userDisplay) {
          targetDisplay = userDisplay;
          useFullscreen = state.userDefaultPlayerDisplay.fullscreen;
          console.log(`[InitPlayer] Found user default display: ${userDisplay.name} (${useFullscreen ? "fullscreen" : "windowed"})`);
          
          // Save the intended window state for the selected display
          displayManager.saveDisplayWindowState(userDisplay, useFullscreen);
        } else {
          console.warn("[InitPlayer] User default display not found, falling back to auto-detection");
        }
      }

      // Auto-detect display if no user preference or preference not found
      if (!targetDisplay && !displayDetectionFailed) {
        // Prefer secondary display if available and detection succeeded
        const secondaryDisplay = displays.find((display) => !display.isPrimary);
        if (secondaryDisplay) {
          console.log(
            "[InitPlayer] Secondary display found, using it:",
            secondaryDisplay.name,
          );
          targetDisplay = secondaryDisplay;
          useFullscreen = true; // Default to fullscreen on secondary display
        } else {
          console.log("[InitPlayer] No secondary display found, using primary");
          targetDisplay = displays.find((d) => d.isPrimary) || displays[0];
          useFullscreen = true; // Default to fullscreen on primary display if permissions allow
        }
      } else if (!targetDisplay) {
        // Use primary display when detection failed
        console.log("[InitPlayer] Using primary display (detection failed)");
        targetDisplay = displays[0];
        useFullscreen = true; // Default to fullscreen even when detection fails, if permissions allow
      }

      if (targetDisplay) {
        console.log(
          `[InitPlayer] Opening player on ${targetDisplay.name} (${useFullscreen ? "fullscreen" : "windowed"})`,
        );
        
        // Close existing player window if open
        if (state.playerWindow && !state.playerWindow.closed) {
          state.playerWindow.close();
        }
        
        let playerWindow: Window | null;
        
        if (displayDetectionFailed) {
          // When display detection fails, open with basic features to avoid positioning issues
          console.log("[InitPlayer] Using basic window features due to display detection failure");
          playerWindow = window.open(
            "/player.html",
            "JukeboxPlayer",
            "width=800,height=600,scrollbars=no,menubar=no,toolbar=no,location=no,status=no,resizable=yes",
          );
        } else {
          // Use proper display positioning when detection succeeded
          const features = displayManager.generateWindowFeatures(
            targetDisplay,
            useFullscreen,
          );
          playerWindow = window.open(
            "/player.html",
            "JukeboxPlayer",
            features,
          );
        }

        if (playerWindow) {
          console.log("[InitPlayer] Player window opened successfully");

          /**
           * CHANGELOG - 2025-01-XX
           * ADDED: Window position/size tracking on resize and close
           */
          const currentDisplayId = targetDisplay.id;
          
          // Track window resize events
          const handleResize = () => {
            if (playerWindow && !playerWindow.closed) {
              displayManager.savePlayerWindowState(playerWindow, currentDisplayId);
            }
          };
          
          // Track player window close events
          const handlePlayerWindowClose = () => {
            console.log("[InitPlayer] Player window closed by user");
            
            // Reset player state immediately when window closes
            setState((prev) => ({
              ...prev,
              playerWindow: null,
              isPlayerRunning: false,
              showDisplaySelectionDialogOnStartup: true, // Force dialog on next startup
              showDisplaySelectionDialog: true, // Show dialog immediately
            }));
            
            // DON'T save window state when user closes the window
            // Only save state during resize/move events, not on close
            // displayManager.savePlayerWindowState(playerWindow, currentDisplayId);
            
            // DON'T set closed state in localStorage when user closes window
            // This prevents the closed state from being persisted
            // localStorage.setItem(
            //   "jukeboxPlayerWindowState",
            //   JSON.stringify({
            //     isClosed: true,
            //     timestamp: Date.now(),
            //     closedByUser: true,
            //   }),
            // );
          };
          
          // Attach resize listener after window loads
          playerWindow.addEventListener('load', () => {
            playerWindow.addEventListener('resize', handleResize);
            
            // Removed: Save initial position after load - now handled by saveDisplayWindowState for user defaults
            // displayManager.savePlayerWindowState(playerWindow, currentDisplayId);
          }, { once: true });

          // Set up close event listener
          playerWindow.addEventListener(
            "beforeunload",
            handlePlayerWindowClose,
          );

          // Also monitor for window being closed via polling
          const closeCheckInterval = setInterval(() => {
            if (playerWindow.closed) {
              console.log("[InitPlayer] Detected player window was closed");
              clearInterval(closeCheckInterval);
              handlePlayerWindowClose();
            }
          }, 1000);

          setState((prev) => ({
            ...prev,
            playerWindow,
            isPlayerRunning: true,
          }));

          /**
           * CHANGELOG - 2025-01-XX
           * MODIFIED: Enhanced fullscreen enforcement with multiple attempts
           */
          // Request fullscreen if needed and supported
          if (useFullscreen) {
            playerWindow.addEventListener("load", () => {
              const requestFullscreen = () => {
                try {
                  if (!playerWindow.document.fullscreenElement) {
                    playerWindow.document.documentElement.requestFullscreen({
                      navigationUI: 'hide'
                    }).catch((err) => {
                      console.warn('[Fullscreen] Request failed:', err);
                    });
                  }
                } catch (error) {
                  console.warn("Could not enter fullscreen mode:", error);
                }
              };
              
              // Try immediately
              setTimeout(requestFullscreen, 500);
              
              // Try again after delay (some browsers need this)
              setTimeout(requestFullscreen, 1500);
              
              // Watch for fullscreen exit and re-request
              playerWindow.document.addEventListener('fullscreenchange', () => {
                if (!playerWindow.document.fullscreenElement) {
                  console.log('[Fullscreen] User exited fullscreen, re-requesting...');
                  setTimeout(requestFullscreen, 100);
                }
              });
            });
          }

          // Start first song after initialization delay
          setTimeout(() => {
            console.log("[InitPlayer] Auto-starting first song");
            setState((currentState) => {
              if (currentState.inMemoryPlaylist.length > 0) {
                const firstSong = currentState.inMemoryPlaylist[0];
                playSong(
                  firstSong.videoId,
                  firstSong.title,
                  firstSong.channelTitle,
                  "SONG_PLAYED",
                  0,
                );
              }
              return currentState;
            });
          }, 3000);

          const displayInfo = displayDetectionFailed
            ? `on primary display (fallback mode)`
            : useFullscreen
            ? `on ${targetDisplay.name} (fullscreen)`
            : `on ${targetDisplay.name}`;
          addLog(
            "SONG_PLAYED",
            `Player window opened successfully ${displayInfo}`,
          );

          toast({
            title: "Player Started",
            description: `Video player opened ${displayInfo}`,
            variant: "default",
          });
        } else {
          console.error(
            "[InitPlayer] Failed to open player window - likely popup blocked",
          );
          toast({
            title: "Popup Blocked",
            description:
              "Please allow popups for this site and try again using the 'Open Player' button in admin panel.",
            variant: "destructive",
          });
        }
      } else {
        throw new Error("No displays available");
      }
    } catch (error: any) {
      console.error("[InitPlayer] Error during player initialization:", error);

      // If it's a display detection timeout, provide specific guidance
      if (error.message.includes("timeout")) {
        console.log(
          "[InitPlayer] Display detection timed out, using basic fallback",
        );
      }

      // Fallback to basic window opening
      console.log("[InitPlayer] Falling back to basic window opening...");
      try {
        const playerWindow = window.open(
          "/player.html",
          "JukeboxPlayer",
          "width=800,height=600,scrollbars=no,menubar=no,toolbar=no,location=no,status=no",
        );

        if (playerWindow) {
          setState((prev) => ({
            ...prev,
            playerWindow,
            isPlayerRunning: true,
          }));
          addLog("SONG_PLAYED", "Player window opened (fallback mode)");
          toast({
            title: "Player Started",
            description: "Video player opened in fallback mode",
            variant: "default",
          });
        } else {
          throw new Error("Could not open player window");
        }
      } catch (fallbackError) {
        console.error("[InitPlayer] Fallback also failed:", fallbackError);
        toast({
          title: "Player Window Blocked",
          description:
            "Browser blocked the player window. Please allow popups for this site, then click the Settings icon (bottom-left) → 'Open Player'.",
          variant: "default",
          duration: 8000,
        });
      }
    }
  };

  const openPlayerWindow = (display: DisplayInfo, fullscreen: boolean) => {
    console.log(
      `Opening player window on ${display.name} (${fullscreen ? "fullscreen" : "windowed"})`,
    );

    // Clear any previous close state since user is explicitly opening
    localStorage.removeItem("jukeboxPlayerWindowState");

    // Save the intended window state for the selected display
    displayManager.saveDisplayWindowState(display, fullscreen);

    const features = displayManager.generateWindowFeatures(display, fullscreen);
    const playerWindow = window.open("/player.html", "JukeboxPlayer", features);

    if (playerWindow) {
      setState((prev) => ({ ...prev, playerWindow, isPlayerRunning: true }));
      console.log("Player window opened successfully on external display");

      // Request fullscreen after window loads if needed
      if (fullscreen) {
        playerWindow.addEventListener("load", () => {
          setTimeout(() => {
            try {
              playerWindow.document.documentElement.requestFullscreen();
            } catch (error) {
              console.warn("Could not enter fullscreen mode:", error);
            }
          }, 1000);
        });
      }

      // Start first song after initialization
      setTimeout(() => {
        setState((currentState) => {
          if (currentState.inMemoryPlaylist.length > 0) {
            const firstSong = currentState.inMemoryPlaylist[0];
            console.log(
              "Auto-starting first song after player initialization:",
              firstSong.title,
            );
            playSong(
              firstSong.videoId,
              firstSong.title,
              firstSong.channelTitle,
              "SONG_PLAYED",
              0,
            );
          }
          return currentState;
        });
      }, 3000);

      addLog(
        "SONG_PLAYED",
        `Player opened on ${display.name}${fullscreen ? " (fullscreen)" : ""}`,
      );

      toast({
        title: "Player Started",
        description: `Video player opened on ${display.name}${fullscreen ? " in fullscreen mode" : ""}`,
        variant: "default",
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to open player window. Please allow popups.",
        variant: "destructive",
      });
    }
  };

  const openBasicPlayerWindow = () => {
    console.log("Opening basic player window as fallback");

    // Clear any previous close state since user is explicitly opening
    localStorage.removeItem("jukeboxPlayerWindowState");

    const playerWindow = window.open(
      "/player.html",
      "JukeboxPlayer",
      "width=800,height=600,scrollbars=no,menubar=no,toolbar=no,location=no,status=no",
    );

    if (playerWindow) {
      setState((prev) => ({ ...prev, playerWindow, isPlayerRunning: true }));
      console.log("Basic player window opened successfully");

      setTimeout(() => {
        setState((currentState) => {
          if (currentState.inMemoryPlaylist.length > 0) {
            const firstSong = currentState.inMemoryPlaylist[0];
            playSong(
              firstSong.videoId,
              firstSong.title,
              firstSong.channelTitle,
              "SONG_PLAYED",
              0,
            );
          }
          return currentState;
        });
      }, 3000);
    } else {
      toast({
        title: "Error",
        description: "Failed to open player window. Please allow popups.",
        variant: "destructive",
      });
    }
  };

  const handlePlayerToggle = () => {
    if (state.showMiniPlayer) {
      console.log("Mini player mode active, cannot toggle window-based player");
      return;
    }

    if (!state.playerWindow || state.playerWindow.closed) {
      console.log("Player window is closed, reopening...");
      // Clear any previous close state since user is explicitly opening
      localStorage.removeItem("jukeboxPlayerWindowState");
      initializePlayer();
      addLog("SONG_PLAYED", "Player window reopened and started");
      return;
    }

    if (state.isPlayerRunning && !state.isPlayerPaused) {
      // Pause player with fade out
      if (state.playerWindow && !state.playerWindow.closed) {
        const command = {
          action: "fadePause",
          fadeDuration: 2000, // Fade out over 2 seconds
          timestamp: Date.now()
        };
        try {
          localStorage.setItem(
            "jukeboxCommand",
            JSON.stringify(command),
          );
          addLog("SONG_PLAYED", "Player paused by admin (with fade out)");
        } catch (error) {
          console.error("Error sending pause command:", error);
        }
      }
      setState((prev) => ({ ...prev, isPlayerPaused: true }));
    } else if (state.isPlayerRunning && state.isPlayerPaused) {
      // Resume player with fade in
      if (state.playerWindow && !state.playerWindow.closed) {
        const command = {
          action: "fadeIn",
          fadeDuration: 2000, // Fade in over 2 seconds
          timestamp: Date.now()
        };
        try {
          localStorage.setItem(
            "jukeboxCommand",
            JSON.stringify(command),
          );
          addLog("SONG_PLAYED", "Player resumed by admin (with fade in)");
        } catch (error) {
          console.error("Error sending resume command:", error);
        }
      }
      setState((prev) => ({ ...prev, isPlayerPaused: false }));
    } else {
      // Start player
      setState((prev) => ({
        ...prev,
        isPlayerRunning: true,
        isPlayerPaused: false,
      }));
      setState((currentState) => {
        if (currentState.inMemoryPlaylist.length > 0) {
          const firstSong = currentState.inMemoryPlaylist[0];
          playSong(
            firstSong.videoId,
            firstSong.title,
            firstSong.channelTitle,
            "SONG_PLAYED",
            0,
          );
        }
        return currentState;
      });
      addLog("SONG_PLAYED", "Player started by admin");
    }
  };

  const handleSkipSong = () => {
    const isUserRequest = state.userRequests.some(
      (req) => req.title === state.currentlyPlaying,
    );
    if (isUserRequest) {
      setState((prev) => ({ ...prev, showSkipConfirmation: true }));
    } else {
      performSkip();
    }
  };

  const performSkip = () => {
    setState((currentState) => {
      console.log(
        `[PerformSkip] Skipping current video: ${currentState.currentVideoId}`,
      );
      console.log(
        `[PerformSkip] Currently playing: ${currentState.currentlyPlaying}`,
      );

      if (currentState.playerWindow && !currentState.playerWindow.closed) {
        const command = {
          action: "fadeOutAndBlack",
          fadeDuration: 2000, // Shorter fade for better UX
          timestamp: Date.now(),
        };
        try {
          localStorage.setItem(
            "jukeboxCommand",
            JSON.stringify(command),
          );
          addLog("SONG_PLAYED", `SKIPPING: ${currentState.currentlyPlaying}`);
          console.log("[PerformSkip] Skip command sent successfully");
        } catch (error) {
          console.error("Error sending skip command:", error);
        }
      } else {
        console.error("[PerformSkip] No player window available for skip");
      }

      // Check if currently playing song is from priority queue
      const isFromPriority = currentState.priorityQueue.length > 0 &&
        currentState.priorityQueue[0].title === currentState.currentlyPlaying;

      // If skipping a priority queue song, remove it from the queue
      let updatedPriorityQueue = currentState.priorityQueue;
      if (isFromPriority) {
        console.log('[PerformSkip] Removing skipped priority song from queue');
        updatedPriorityQueue = currentState.priorityQueue.slice(1);

        // Save updated queue to localStorage
        try {
          localStorage.setItem('PRIORITY_QUEUE', JSON.stringify(updatedPriorityQueue));
          console.log('[PerformSkip] Saved updated priority queue to localStorage');
        } catch (error) {
          console.error('[PerformSkip] Failed to save priority queue:', error);
        }
      }

      // Advance the queue: check priority queue first, then regular playlist
      let nextSong = null;
      let nextVideoIndex = currentState.currentVideoIndex;

      // First check priority queue (after removing skipped song if applicable)
      if (updatedPriorityQueue.length > 0) {
        nextSong = updatedPriorityQueue[0];
        console.log('[PerformSkip] Next song from priority queue:', nextSong.title);
      }
      // If no priority queue songs, use regular playlist with currentVideoIndex
      else if (currentState.inMemoryPlaylist.length > 0) {
        // Use currentVideoIndex to get the next song (same as playNextSong)
        nextSong = currentState.inMemoryPlaylist[currentState.currentVideoIndex];

        if (!nextSong) {
          console.warn('[PerformSkip] No video at current index, resetting to 0');
          nextVideoIndex = 0;
          nextSong = currentState.inMemoryPlaylist[0];
        }

        console.log('[PerformSkip] Next song from regular playlist:', nextSong.title, 'Index:', currentState.currentVideoIndex);

        // Increment currentVideoIndex and wrap around
        nextVideoIndex = (currentState.currentVideoIndex + 1) % currentState.inMemoryPlaylist.length;
      }

      // Play next song if available
      if (nextSong) {
        setTimeout(() => {
          playSong(
            nextSong.videoId,
            nextSong.title,
            nextSong.channelTitle,
            "SONG_PLAYED",
            0
          );
        }, 3000); // Allow fade-out to complete (increased from 2500ms for more buffer)
      } else {
        // No more songs in queue
        addLog("SONG_PLAYED", "Queue ended after skip");
      }

      return { ...currentState, priorityQueue: updatedPriorityQueue, currentVideoIndex: nextVideoIndex, showSkipConfirmation: false };
    });
  };

  const loadPlaylistVideos = async (playlistId: string) => {
    try {
      console.log(`[PlayerManager] Loading playlist videos for: ${playlistId}`);

      // Use the cached YouTube API client
      const allVideos = await youtubeAPIClient.getPlaylist(playlistId, state.apiKey);

      const filteredVideos = allVideos
        .filter((item: any) => {
          // Filter out private/unavailable videos
          return item.title !== 'Private video' &&
                 item.title !== 'Deleted video' &&
                 item.title !== '[Private video]' &&
                 item.title !== '[Deleted video]' &&
                 item.videoId;
        })
        .map((item: any) => ({
          id: item.id,
          title: item.title.replace(/\([^)]*\)/g, '').trim(),
          channelTitle: item.channelTitle,
          videoId: item.videoId,
        }));

      console.log(`[PlayerManager] Loaded ${filteredVideos.length} videos from playlist`);

      setState((prev) => ({
        ...prev,
        defaultPlaylistVideos: filteredVideos,
        inMemoryPlaylist: [...filteredVideos],
        currentVideoIndex: 0,
      }));

      return filteredVideos;
    } catch (error) {
      console.error('[PlayerManager] Failed to load playlist videos:', error);
      throw error;
    }
  };

  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const playNextSong = (() => {
    // Replace unreliable flag with proper queue/debounce mechanism
    const playNextSongQueue = React.useRef<Promise<void> | null>(null);
    const lastPlayNextSongCall = React.useRef(0);

    return async () => {
      const now = Date.now();
      const timestamp = new Date().toISOString();

      // Prevent calls more frequent than 500ms apart (debouncing)
      if (now - lastPlayNextSongCall.current < 500) {
        console.log(`[PlayNext][${timestamp}] Call too frequent, debouncing`);
        return;
      }
      lastPlayNextSongCall.current = now;

      // Queue the operation to prevent concurrent execution
      if (playNextSongQueue.current) {
        console.log(`[PlayNext][${timestamp}] Operation already queued, waiting...`);
        await playNextSongQueue.current;
        return;
      }

      // Create a new queued operation
      playNextSongQueue.current = (async () => {
        console.log(`[PlayNext][${timestamp}] Starting song selection process`);
        console.log(`[PlayNext][${timestamp}] Priority queue length: ${state.priorityQueue.length}`);
        console.log(`[PlayNext][${timestamp}] In-memory playlist length: ${state.inMemoryPlaylist.length}`);

        try {
          // Always check priority queue first
          if (state.priorityQueue.length > 0) {
            const nextRequest = state.priorityQueue[0];
            console.log(`[PlayNext][${timestamp}] Playing next song from priority queue: "${nextRequest.title}" (${nextRequest.videoId})`);

            // CRITICAL FIX: Don't remove from priority queue here - only remove when song finishes
            // Removal now happens in handleVideoEnded()

            // Then play the song
            playSong(nextRequest.videoId, nextRequest.title, nextRequest.channelTitle, 'USER_SELECTION');
            return;
          }

          // Play from in-memory playlist - SEQUENTIAL ORDER
          if (state.inMemoryPlaylist.length > 0) {
            const nextVideo = state.inMemoryPlaylist[0];
            console.log(`[PlayNext][${timestamp}] Playing next song from in-memory playlist: "${nextVideo.title}" (${nextVideo.videoId})`);

            // Move played song to end of playlist (circular playlist)
            setState(prev => ({
              ...prev,
              inMemoryPlaylist: [...prev.inMemoryPlaylist.slice(1), nextVideo]
            }));

            // Then play the song
            playSong(nextVideo.videoId, nextVideo.title, nextVideo.channelTitle, 'SONG_PLAYED');
          } else {
            console.warn(`[PlayNext][${timestamp}] No songs available in playlist or priority queue!`);
          }
        } catch (error) {
          console.error(`[PlayNext][${timestamp}] Error in playNextSong:`, error);
        } finally {
          // Clear the queue after completion
          playNextSongQueue.current = null;
        }
      })();

      // Wait for the queued operation to complete
      await playNextSongQueue.current;
    };
  })();

  const handleVideoEnded = () => {
    const timestamp = new Date().toISOString();
    console.log(`[VideoEnded][${timestamp}] Video ended, triggering playNextSong...`);
    playNextSong();
  };

  const handleDefaultPlaylistChange = (playlistId: string) => {
    setState(prev => ({ ...prev, defaultPlaylist: playlistId }));
    loadPlaylistVideos(playlistId);
  };

  const handlePlaylistReorder = (newPlaylist: PlaylistItem[]) => {
    setState(prev => ({ ...prev, inMemoryPlaylist: newPlaylist }));
  };

  const handlePlaylistShuffle = () => {
    console.log('[Shuffle] Manual shuffle requested by user');
    // Don't shuffle if currently playing - only shuffle the remaining playlist
    const currentSong = state.inMemoryPlaylist.find(song => song.title === state.currentlyPlaying);
    const remainingPlaylist = state.inMemoryPlaylist.filter(song => song.title !== state.currentlyPlaying);
    const shuffledRemaining = shuffleArray(remainingPlaylist);
    
    // If there's a current song, keep it at the front
    const newPlaylist = currentSong ? [currentSong, ...shuffledRemaining] : shuffledRemaining;
    
    // After shuffle, current song is at index 0, so next song is at index 1
    const newCurrentVideoIndex = currentSong ? 1 : 0;
    
    setState(prev => ({ ...prev, inMemoryPlaylist: newPlaylist, currentVideoIndex: newCurrentVideoIndex }));
    addLog('SONG_PLAYED', 'Playlist shuffled by admin (excluding current song)');
    toast({
      title: "Playlist Shuffled",
      description: "The playlist order has been randomized (current song unchanged)",
    });
  };

  return {
    initializePlayer,
    playSong,
    handlePlayerToggle,
    handleSkipSong,
    performSkip,
    loadPlaylistVideos,
    playNextSong,
    handleVideoEnded,
    handleDefaultPlaylistChange,
    handlePlaylistReorder,
    handlePlaylistShuffle,
  };
};
