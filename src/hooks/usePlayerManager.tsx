import { useToast } from "@/hooks/use-toast";
import { JukeboxState, PlaylistItem, LogEntry } from "./useJukeboxState";
import { displayManager, DisplayInfo } from "@/services/displayManager";
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
  const isProcessingNextSong = React.useRef(false);
  const lastPlayedSongRef = React.useRef<{ videoId: string; timestamp: number } | null>(null);

  const playSong = (
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
    });

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

      if (!displayDetectionFailed) {
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
          useFullscreen = false; // Windowed mode on primary display
        }
      } else {
        // Use primary display when detection failed
        console.log("[InitPlayer] Using primary display (detection failed)");
        targetDisplay = displays[0];
        useFullscreen = false; // Windowed mode when detection fails
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
            
            // Save initial position after load
            displayManager.savePlayerWindowState(playerWindow, currentDisplayId);
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
              setState((prev) => ({
                ...prev,
                playerWindow: null,
                isPlayerRunning: false,
              }));
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
    if (!state.playerWindow || state.playerWindow.closed) {
      console.log("Player window is closed, reopening...");
      // Clear any previous close state since user is explicitly opening
      localStorage.removeItem("jukeboxPlayerWindowState");
      initializePlayer();
      addLog("SONG_PLAYED", "Player window reopened and started");
      return;
    }

    if (state.isPlayerRunning && !state.isPlayerPaused) {
      // Pause player
      if (state.playerWindow && !state.playerWindow.closed) {
        const command = { action: "pause", timestamp: Date.now() };
        try {
          localStorage.setItem(
            "jukeboxCommand",
            JSON.stringify(command),
          );
          addLog("SONG_PLAYED", "Player paused by admin");
        } catch (error) {
          console.error("Error sending pause command:", error);
        }
      }
      setState((prev) => ({ ...prev, isPlayerPaused: true }));
    } else if (state.isPlayerRunning && state.isPlayerPaused) {
      // Resume player
      if (state.playerWindow && !state.playerWindow.closed) {
        const command = { action: "resume", timestamp: Date.now() };
        try {
          localStorage.setItem(
            "jukeboxCommand",
            JSON.stringify(command),
          );
          addLog("SONG_PLAYED", "Player resumed by admin");
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

      // Advance the queue: remove the current song from inMemoryPlaylist
      let newPlaylist = currentState.inMemoryPlaylist;
      if (newPlaylist.length > 0) {
        newPlaylist = newPlaylist.slice(1); // Remove first song
      }

      // Play next song if available
      if (newPlaylist.length > 0) {
        const nextSong = newPlaylist[0];
        setTimeout(() => {
          playSong(
            nextSong.videoId,
            nextSong.title,
            nextSong.channelTitle,
            "SONG_PLAYED",
            0
          );
        }, 500); // Allow fade-out to complete
      } else {
        // No more songs in queue
        addLog("SONG_PLAYED", "Queue ended after skip");
      }

      return { ...currentState, inMemoryPlaylist: newPlaylist, showSkipConfirmation: false };
    });
  };

  const loadPlaylistVideos = async (playlistId: string) => {
    try {
      let allVideos: PlaylistItem[] = [];
      let nextPageToken = '';
      
      // Load ALL videos without any limits
      do {
        const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=50&key=${state.apiKey}${nextPageToken ? `&pageToken=${nextPageToken}` : ''}`;
        const response = await fetch(url);
        
        if (!response.ok) throw new Error('Failed to load playlist');
        
        const data = await response.json();
        const videos: PlaylistItem[] = data.items
          .filter((item: any) => {
            // Filter out private/unavailable videos
            return item.snippet.title !== 'Private video' && 
                       item.snippet.title !== 'Deleted video' && 
                       item.snippet.title !== '[Private video]' &&
                       item.snippet.title !== '[Deleted video]' &&
                       item.snippet.resourceId?.videoId;
          })
          .map((item: any) => ({
            id: item.id,
            title: item.snippet.title.replace(/\([^)]*\)/g, '').trim(),
            channelTitle: item.snippet.channelTitle,
            videoId: item.snippet.resourceId.videoId
          }));
        
        allVideos = [...allVideos, ...videos];
        nextPageToken = data.nextPageToken || '';
        
        console.log(`[LoadPlaylist] Loaded ${videos.length} videos this batch, total so far: ${allVideos.length}`);
      } while (nextPageToken);

      // Shuffle playlist ONCE after loading
      const shuffled = shuffleArray(allVideos);
      setState(prev => ({ 
        ...prev, 
        defaultPlaylistVideos: allVideos, // keep original for reference
        inMemoryPlaylist: [...shuffled], // shuffle for playback
        currentVideoIndex: 0
      }));
      
      console.log(`[LoadPlaylist] Loaded ALL ${allVideos.length} videos from playlist (shuffled order)`);
    } catch (error) {
      console.error('Error loading playlist:', error);
      toast({
        title: "Playlist Error",
        description: "Failed to load default playlist",
        variant: "destructive"
      });
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

  const playNextSong = () => {
    const timestamp = new Date().toISOString();
    console.log(`[PlayNext][${timestamp}] playNextSong called - checking if already processing...`);
    
    // Prevent multiple concurrent executions
    if (isProcessingNextSong.current) {
      console.warn(`[PlayNext][${timestamp}] Already processing next song, ignoring duplicate call`);
      return;
    }
    
    isProcessingNextSong.current = true;
    console.log(`[PlayNext][${timestamp}] Starting song selection process`);
    console.log(`[PlayNext][${timestamp}] Priority queue length: ${state.priorityQueue.length}`);
    console.log(`[PlayNext][${timestamp}] In-memory playlist length: ${state.inMemoryPlaylist.length}`);
    
    try {
      // Always check priority queue first
      if (state.priorityQueue.length > 0) {
        const nextRequest = state.priorityQueue[0];
        console.log(`[PlayNext][${timestamp}] Playing next song from priority queue: "${nextRequest.title}" (${nextRequest.videoId})`);
        
        // Update state first
        setState(prev => ({ 
          ...prev, 
          priorityQueue: prev.priorityQueue.slice(1) 
        }));
        
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
      // Reset the processing flag after a short delay to ensure state updates complete
      setTimeout(() => {
        console.log(`[PlayNext][${new Date().toISOString()}] Resetting processing flag after operation`);
        isProcessingNextSong.current = false;
      }, 1000);
    }
  };

  const handleVideoEnded = () => {
    const timestamp = new Date().toISOString();
    console.log(`[VideoEnded][${timestamp}] Video ended, triggering playNextSong...`);
    playNextSong();
    
    // Reset the processing flag after a short delay to allow state updates to complete
    setTimeout(() => {
      console.log(`[VideoEnded][${timestamp}] Resetting processing flag`);
      isProcessingNextSong.current = false;
    }, 1000); // 1 second delay to ensure state updates complete
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
    
    setState(prev => ({ ...prev, inMemoryPlaylist: newPlaylist }));
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
