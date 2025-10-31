import { JukeboxState, PlaylistItem, LogEntry } from "./useJukeboxState";
import { youtubeQuotaService } from "@/services/youtube/api";
import { youtubeHtmlParserService } from "@/services/youtube/scraper";
import { youtubeAPIClient } from "@/services/youtube/api/client";
import { handlePlaylistError, handleApiError, handleNetworkError } from "@/utils/errorHandler";
import React from "react"; // Import React to use useRef and useCallback

export const usePlaylistManager = (
  state: JukeboxState,
  setState: React.Dispatch<React.SetStateAction<JukeboxState>>,
  addLog: (
    type: LogEntry["type"],
    description: string,
    videoId?: string,
    creditAmount?: number,
  ) => void,
  playSong: (
    videoId: string,
    title: string,
    artist: string,
    logType: "SONG_PLAYED" | "USER_SELECTION",
  ) => void,
  toast: any,
) => {
  // At the top of the usePlaylistManager function, after the parameters
  const lastPlayedVideoId = React.useRef<string | null>(null);
  const isPlayingNext = React.useRef<boolean>(false);
  const [isImportingPlaylist, setIsImportingPlaylist] = React.useState<boolean>(false);

  const loadPlaylistVideos = async (playlistId: string) => {
    // Global guard: prevent any playlist loading if we're in a bad state
    if (state.allKeysExhausted || state.isAppPaused) {
      console.log(
        "[PlaylistManager] Skipping playlist load - app is paused or keys exhausted",
      );
      return;
    }

    console.log("Loading playlist videos for:", playlistId);

    /**
     * CHANGELOG - Phase 4
     * REMOVED: active_playlist_url check (consolidated to USER_PREFERENCES)
     */
    // Check localStorage for cached playlist
    const cachedPlaylistData = localStorage.getItem('active_playlist_data');

    if (cachedPlaylistData) {
      try {
        const parsedData: PlaylistItem[] = JSON.parse(cachedPlaylistData);
        console.log(`[PlaylistManager] Loading ${parsedData.length} videos from localStorage cache`);
        
        // Use the cached data as-is (it maintains the rotation order)
        setState((prev) => ({
          ...prev,
          defaultPlaylistVideos: parsedData,
          inMemoryPlaylist: parsedData, // Don't spread, use the order from cache directly
          // Don't reset currentVideoIndex - preserve the saved position
        }));
        
        toast({
          title: "Playlist Loaded",
          description: `Loaded ${parsedData.length} songs from cache.`,
          variant: "default",
        });
        
        addLog(
          "SONG_PLAYED",
          `Loaded ${parsedData.length} songs from cached playlist`,
        );
        
        return;
      } catch (error) {
        console.error("[PlaylistManager] Failed to parse cached playlist, downloading fresh:", error);
        // Continue to download if cache is corrupted
      }
    }

    console.log("[PlaylistManager] Cache miss or different playlist - downloading from YouTube");

    // Fallback if no API key or all keys exhausted
    if (!state.apiKey || state.allKeysExhausted) {
      console.log(
        "No valid API key available or all keys exhausted - using backend proxy fallback immediately",
      );
      try {
        const fallbackVideos = await youtubeHtmlParserService.parsePlaylist(playlistId);
        console.log(
          `[LoadPlaylist] Proxy fallback generated ${fallbackVideos.length} videos`,
        );
        setState((prev) => ({
          ...prev,
          defaultPlaylistVideos: fallbackVideos,
          inMemoryPlaylist: [...fallbackVideos],
          currentVideoIndex: 0,
        }));
        toast({
          title: "Fallback Mode Active",
          description: `Loaded ${fallbackVideos.length} songs using fallback mode.`,
          variant: "default",
        });
        addLog(
          "SONG_PLAYED",
          `Loaded proxy fallback playlist with ${fallbackVideos.length} songs - no valid API key`,
        );
        return;
      } catch (error) {
        console.error("Proxy fallback failed:", error);
        toast({
          title: "Fallback Failed",
          description: "Unable to load fallback playlist from backend proxy. Please check your connection.",
          variant: "destructive",
        });
        return;
      }
    }

    // Validate API key format
    if (!state.apiKey.startsWith("AIza") || state.apiKey.length < 20) {
      console.error("Invalid API key format");
      toast({
        title: "Configuration Error",
        description:
          "Invalid YouTube API key format. Please check admin settings.",
        variant: "destructive",
      });
      return;
    }

    try {
      let allVideos: PlaylistItem[] = [];
      let nextPageToken = "";

      // Load ALL videos without any limits
      do {
        // Validate parameters before constructing URL
        if (!playlistId || typeof playlistId !== "string") {
          throw new Error("Invalid playlist ID provided");
        }
        if (!state.apiKey || typeof state.apiKey !== "string") {
          throw new Error("Invalid API key provided");
        }

        const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${encodeURIComponent(playlistId)}&maxResults=50&key=${encodeURIComponent(state.apiKey)}${nextPageToken ? `&pageToken=${encodeURIComponent(nextPageToken)}` : ""}`;

        console.log(`[LoadPlaylist] Fetching: ${url}`);
        console.log(
          `[LoadPlaylist] API Key: ${state.apiKey ? `...${state.apiKey.slice(-8)}` : "NOT SET"}`,
        );
        console.log(`[LoadPlaylist] Playlist ID: ${playlistId}`);
        console.log(`[LoadPlaylist] Browser online: ${navigator.onLine}`);

        // Check for basic requirements before attempting fetch
        if (!state.apiKey || state.apiKey.length < 20) {
          console.error(
            "[LoadPlaylist] Invalid or missing API key, using fallback",
          );
          toast({
            title: "Configuration Error",
            description:
              "YouTube API key is missing or invalid. Please check admin settings.",
            variant: "default",
          });

          allVideos = [];
          break;
        }

        // Check if quota is exhausted for this API key and skip API calls
        const quotaExhaustedKey = `quota-exhausted-${state.apiKey.slice(-8)}`;
        const quotaExhaustedTime = localStorage.getItem(quotaExhaustedKey);
        if (quotaExhaustedTime) {
          const timeSinceExhaustion = Date.now() - parseInt(quotaExhaustedTime);
          // Wait 1 hour before retrying API calls after quota exhaustion
          if (timeSinceExhaustion < 3600000) {
            console.log(
              `[LoadPlaylist] API quota exhausted for this key, using fallback immediately`,
            );
            allVideos = [];
            break;
          } else {
            // Clear the flag after 1 hour to allow retry
            localStorage.removeItem(quotaExhaustedKey);
          }
        }

        // If we've had persistent fetch failures, skip to fallback immediately
        const failureKey = `playlist-fetch-failures-${playlistId}`;
        const failures = parseInt(localStorage.getItem(failureKey) || "0");
        if (failures >= 3) {
          console.log(
            `[LoadPlaylist] Too many previous failures (${failures}), using fallback immediately`,
          );
          toast({
            title: "Using Offline Mode",
            description:
              "YouTube API has persistent issues. Using fallback playlist.",
            variant: "default",
          });
          allVideos = [];
          break;
        }

        // Use cached YouTube API client instead of direct fetch
        let data;
        try {
          console.log(
            `[LoadPlaylist] Making cached request to YouTube API (attempt after ${failures} previous failures)...`,
          );

          // Use the cached API client instead of direct fetch
          const response = await youtubeAPIClient.makeRequest(
            'playlistItems',
            {
              part: 'snippet',
              playlistId: playlistId,
              maxResults: '50',
              ...(nextPageToken && { pageToken: nextPageToken }),
            },
            state.apiKey
          );

          data = response;
          console.log(`[LoadPlaylist] Response received from cached API client`);
          console.log(
            `[LoadPlaylist] Received ${data.items?.length || 0} items`,
          );

          // Track API usage (only if not from cache)
          youtubeQuotaService.trackApiUsage(state.apiKey, "playlistItems", 1);
        } catch (error: any) {
          // Track failures for future reference
          const failureKey = `playlist-fetch-failures-${playlistId}`;
          const currentFailures =
            parseInt(localStorage.getItem(failureKey) || "0") + 1;
          localStorage.setItem(failureKey, currentFailures.toString());

          console.error("[LoadPlaylist] Fetch error details:", {
            message: error.message,
            name: error.name,
            stack: error.stack,
            failureCount: currentFailures,
          });

          // Provide specific error messages for different types of failures
          if (error.message.includes("Failed to fetch")) {
            console.log(
              `[LoadPlaylist] Network connectivity issue (failure #${currentFailures}), using fallback`,
            );
            toast({
              title: "Network Error",
              description: `Unable to connect to YouTube API (attempt ${currentFailures}). Using fallback playlist.`,
              variant: "default",
            });
          } else if (error.message.includes("CORS")) {
            console.log(
              `[LoadPlaylist] CORS issue (failure #${currentFailures}), using fallback`,
            );
            toast({
              title: "Access Error",
              description:
                "API access blocked by browser. Using fallback playlist.",
              variant: "default",
            });
          } else if (
            error.message.includes("timeout") ||
            error.name === "TimeoutError"
          ) {
            console.log(
              `[LoadPlaylist] Request timeout (failure #${currentFailures}), using fallback`,
            );
            toast({
              title: "Timeout Error",
              description:
                "YouTube API request timed out. Using fallback playlist.",
              variant: "default",
            });
          } else {
            console.log(
              `[LoadPlaylist] Unknown error (failure #${currentFailures}), using fallback`,
            );
            toast({
              title: "API Unavailable",
              description: `YouTube API error (${error.message}). Using fallback playlist.`,
              variant: "default",
            });
          }

          // If this is the 3rd failure, clear the failure count after some time
          if (currentFailures >= 3) {
            setTimeout(() => {
              localStorage.removeItem(failureKey);
              console.log(
                "[LoadPlaylist] Cleared failure count, will retry API on next load",
              );
            }, 300000); // Reset after 5 minutes
          }

          // Any error triggers fallback
          allVideos = [];
          break;
        }

        // Success - clear any previous failure count
        if (data) {
          const failureKey = `playlist-fetch-failures-${playlistId}`;
          localStorage.removeItem(failureKey);
        }

        // Data processing continues here - response is already handled above

        // Skip processing if we don't have data (e.g., quota exceeded case)
        if (!data || !data.items) {
          console.log(
            "No data to process, continuing to next iteration or fallback",
          );
          break;
        }

        const videos: PlaylistItem[] = data.items
          .filter((item: any) => {
            // Filter out private/unavailable videos
            return (
              item.snippet.title !== "Private video" &&
              item.snippet.title !== "Deleted video" &&
              item.snippet.title !== "[Private video]" &&
              item.snippet.title !== "[Deleted video]" &&
              item.snippet.resourceId?.videoId
            );
          })
          .map((item: any) => ({
            id: item.id,
            title: item.snippet.title.replace(/\([^)]*\)/g, "").trim(),
            channelTitle: item.snippet.channelTitle,
            videoId: item.snippet.resourceId.videoId,
          }));

        allVideos = [...allVideos, ...videos];
        nextPageToken = data.nextPageToken || "";

        console.log(
          `[LoadPlaylist] Loaded ${videos.length} videos this batch, total so far: ${allVideos.length}`,
        );
      } while (nextPageToken);

      // Check if we got any videos, if not, proceed directly to fallback
      if (allVideos.length === 0) {
        console.log(
          "No videos loaded, proceeding to HTML parser fallback playlist",
        );

        try {
          // Use HTML parser service to generate a fallback playlist
          const fallbackVideos =
            await youtubeHtmlParserService.parsePlaylist(playlistId);

          console.log(
            `[LoadPlaylist] HTML parser generated ${fallbackVideos.length} fallback videos`,
          );

          // Save fallback to localStorage (Phase 4: removed active_playlist_url)
          localStorage.setItem('active_playlist_data', JSON.stringify(fallbackVideos));
          console.log(`[PlaylistManager] Saved ${fallbackVideos.length} fallback videos to localStorage`);

          setState((prev) => ({
            ...prev,
            defaultPlaylistVideos: fallbackVideos,
            inMemoryPlaylist: [...fallbackVideos], // Use a copy to avoid mutation issues
            currentVideoIndex: 0,
          }));

          // Only show this toast if we haven't already shown the quota exhausted message
          const quotaExhaustedKey = `quota-exhausted-${state.apiKey.slice(-8)}`;
          if (!localStorage.getItem(quotaExhaustedKey)) {
            toast({
              title: "Fallback Mode Active",
              description:
                "YouTube API unavailable. Using curated music playlist with popular songs. No API quota used!",
              variant: "default",
            });
          }

          addLog(
            "SONG_PLAYED",
            `Loaded HTML parser fallback playlist with ${fallbackVideos.length} songs`,
          );

          return; // Exit the function successfully
        } catch (fallbackError) {
          console.error("HTML parser fallback also failed:", fallbackError);

          // Last resort: create minimal empty playlist to prevent hanging
          const emptyPlaylist: PlaylistItem[] = [];
          setState((prev) => ({
            ...prev,
            defaultPlaylistVideos: emptyPlaylist,
            inMemoryPlaylist: emptyPlaylist,
            currentVideoIndex: 0,
          }));

          toast({
            title: "Offline Mode",
            description:
              "All music services unavailable. Please check your connection or try again later.",
            variant: "destructive",
          });

          return;
        }
      }

      // Shuffle playlist ONCE after loading
      const shuffled = shuffleArray(allVideos);
      
      // Save to localStorage (Phase 4: removed active_playlist_url)
      localStorage.setItem('active_playlist_data', JSON.stringify(allVideos));
      console.log(`[PlaylistManager] Saved ${allVideos.length} videos to localStorage`);
      
      setState((prev) => ({
        ...prev,
        defaultPlaylistVideos: allVideos, // keep original for reference
        inMemoryPlaylist: [...shuffled], // shuffle for playback
        currentVideoIndex: 0,
      }));

      console.log(
        `[LoadPlaylist] Loaded ALL ${allVideos.length} videos from playlist (shuffled order)`,
      );
    } catch (error: any) { // Explicitly type error as 'any' for better error handling
      console.error("Error loading playlist:", error);

      // Provide fallback content when API is unavailable
      if (
        error instanceof Error &&
        (error.message.includes("Network error") ||
          error.message.includes("Failed to fetch") ||
          error.message.includes("Quota exceeded") ||
          error.message.includes("No videos available"))
      ) {
        console.log(
          "API unavailable or quota exceeded, providing HTML parser fallback playlist content",
        );

        try {
          // Use HTML parser service to generate a fallback playlist
          const fallbackVideos =
            await youtubeHtmlParserService.parsePlaylist(playlistId);

          console.log(
            `[LoadPlaylist] HTML parser generated ${fallbackVideos.length} fallback videos for error case`,
          );

          // Save fallback to localStorage (Phase 4: removed active_playlist_url)
          localStorage.setItem('active_playlist_data', JSON.stringify(fallbackVideos));
          console.log(`[PlaylistManager] Saved ${fallbackVideos.length} fallback videos (error case) to localStorage`);

          setState((prev) => ({
            ...prev,
            defaultPlaylistVideos: fallbackVideos,
            inMemoryPlaylist: [...fallbackVideos],
            currentVideoIndex: 0,
          }));
        } catch (fallbackError) {
          console.error(
            "HTML parser fallback also failed in error case:",
            fallbackError,
          );

          // Last resort: create minimal empty playlist
          const emptyPlaylist: PlaylistItem[] = [];
          setState((prev) => ({
            ...prev,
            defaultPlaylistVideos: emptyPlaylist,
            inMemoryPlaylist: emptyPlaylist,
            currentVideoIndex: 0,
          }));
        }

        const isQuotaIssue = error.message.includes("Quota exceeded");
        toast({
          title: isQuotaIssue
            ? "Quota Exceeded - Fallback Mode"
            : "Offline Mode",
          description: isQuotaIssue
            ? "YouTube API quota exceeded. Using fallback playlist. Enable API key rotation in admin settings for better reliability."
            : "Using fallback playlist due to YouTube API connectivity issues. Check your API key in admin settings.",
          variant: "default",
        });

        addLog(
          "SONG_PLAYED",
          isQuotaIssue
            ? "Loaded fallback playlist due to quota exhaustion"
            : "Loaded fallback playlist due to API unavailability",
        );
      } else {
        toast({
          title: "Playlist Error",
          description:
            "Failed to load default playlist. Check API key and playlist ID in admin settings.",
          variant: "destructive",
        });
      }
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

  const playNextSong = React.useCallback(() => {
    // Prevent multiple simultaneous calls to playNextSong
    if (isPlayingNext.current) {
      console.log('[PlayNext] playNextSong already in progress, skipping duplicate call');
      return;
    }

    isPlayingNext.current = true;
    console.log('[PlayNext] playNextSong called - checking priority queue first...');
    console.log('[PlayNext] Priority queue length:', state.priorityQueue.length);
    console.log('[PlayNext] In-memory playlist length:', state.inMemoryPlaylist.length);

    try {
      // Always check priority queue first
      if (state.priorityQueue.length > 0) {
        console.log('[PlayNext] Playing next song from priority queue');
        const nextRequest = state.priorityQueue[0];

        console.log('[PlayNext] Next priority song:', nextRequest.title, 'VideoID:', nextRequest.videoId);

        // CRITICAL FIX: Don't remove from priority queue here - only remove when song finishes
        // Removal now happens in handleVideoEnded()

        lastPlayedVideoId.current = nextRequest.videoId;
        playSong(
          nextRequest.videoId,
          nextRequest.title,
          nextRequest.channelTitle,
          'USER_SELECTION',
        );
        return;
      }

      // Play from in-memory playlist - SEQUENTIAL ORDER with position persistence
      if (state.inMemoryPlaylist.length > 0) {
        console.log('[PlayNext] Playing next song from in-memory playlist (sequential order)');

        // Use currentVideoIndex to get the next song
        const nextVideo = state.inMemoryPlaylist[state.currentVideoIndex];

        if (!nextVideo) {
          console.warn('[PlayNext] No video at current index, resetting to 0');
          setState(prev => ({ ...prev, currentVideoIndex: 0 }));
          isPlayingNext.current = false;
          return;
        }

        console.log('[PlayNext] Next playlist song:', nextVideo.title, 'VideoID:', nextVideo.videoId, 'Index:', state.currentVideoIndex);

        // Increment currentVideoIndex and wrap around
        const nextIndex = (state.currentVideoIndex + 1) % state.inMemoryPlaylist.length;

        setState(prev => {
          return {
            ...prev,
            currentVideoIndex: nextIndex
          };
        });

        lastPlayedVideoId.current = nextVideo.videoId;
        playSong(
          nextVideo.videoId,
          nextVideo.title,
          nextVideo.channelTitle,
          'SONG_PLAYED',
        );
      } else {
        console.warn('[PlayNext] No songs available in playlist or priority queue!');
      }
    } catch (error) {
      console.error('[PlayNext] Error in playNextSong:', error);
    } finally {
      isPlayingNext.current = false;
    }
  }, [state.priorityQueue, state.inMemoryPlaylist, state.currentlyPlaying, playSong, setState]); // Added state.currentlyPlaying to dependencies

  const handleVideoEnded = React.useCallback(() => {
    console.log('[VideoEnded] Video ended, removing from priority queue if applicable and triggering next song...');

    // CRITICAL FIX: Only remove from priority queue when song actually finishes
    if (state.priorityQueue.length > 0) {
      console.log('[VideoEnded] Removing completed priority song from queue');
      setState(prev => {
        const newQueue = prev.priorityQueue.slice(1);

        // Save updated queue to localStorage
        try {
          localStorage.setItem('PRIORITY_QUEUE', JSON.stringify(newQueue));
          console.log('[VideoEnded] Saved updated priority queue to localStorage');
        } catch (error) {
          console.error('[VideoEnded] Failed to save priority queue:', error);
        }

        return {
          ...prev,
          priorityQueue: newQueue,
        };
      });
    }

    // Then play the next song
    playNextSong();
  }, [playNextSong, state.priorityQueue.length]);

  /**
   * CHANGELOG - 2025-01-XX
   * ADDED: Playlist URL validation before loading
   */
  const handleDefaultPlaylistChange = async (playlistId: string) => {
    console.log("[PlaylistManager] Playlist selection changed to:", playlistId);
    
    // Set loading state
    setIsImportingPlaylist(true);
    
    const { validatePlaylistUrl } = await import('@/utils/playlistValidator');
    
    try {
      const validation = validatePlaylistUrl(playlistId);
      
      if (!validation.isValid) {
        console.error("[PlaylistManager] Invalid playlist URL:", validation.error);
        toast({
          title: "Invalid Playlist",
          description: validation.error || "Please enter a valid YouTube playlist URL or ID",
          variant: "destructive",
        });
        return;
      }
      
      const validatedId = validation.playlistId!;
      console.log("[PlaylistManager] Validated playlist ID:", validatedId);
      
      // Update state with new playlist ID
      setState((prev) => ({ ...prev, defaultPlaylist: validatedId }));
      
      // Save to localStorage immediately (remove duplicate active_playlist_url)
      localStorage.setItem('USER_PREFERENCES', JSON.stringify({
        ...JSON.parse(localStorage.getItem('USER_PREFERENCES') || '{}'),
        defaultPlaylist: validatedId
      }));
      
      // Load the playlist immediately (this will update the queue, not interrupt current song)
      await loadPlaylistVideos(validatedId);
      
      // Reset current video index to start of new playlist
      setState((prev) => ({ ...prev, currentVideoIndex: 0 }));
      
      toast({
        title: "Playlist Changed",
        description: "Queue updated with new playlist",
      });
    } catch (error) {
      console.error("[PlaylistManager] Error loading playlist:", error);
      toast({
        title: "Playlist Load Failed",
        description: "Failed to load the selected playlist. Please try again.",
        variant: "destructive",
      });
    } finally {
      // Reset loading state
      setIsImportingPlaylist(false);
    }
  };

  const handlePlaylistReorder = (newPlaylist: PlaylistItem[]) => {
    setState((prev) => ({ ...prev, inMemoryPlaylist: newPlaylist }));
  };

  const handlePlaylistShuffle = () => {
    console.log("[Shuffle] Manual shuffle requested by user");
    // Don't shuffle if currently playing - only shuffle the remaining playlist
    const currentSong = state.inMemoryPlaylist.find(
      (song) => song.title === state.currentlyPlaying,
    );
    const remainingPlaylist = state.inMemoryPlaylist.filter(
      (song) => song.title !== state.currentlyPlaying,
    );
    const shuffledRemaining = shuffleArray(remainingPlaylist);

    // If there's a current song, keep it at the front
    const newPlaylist = currentSong
      ? [currentSong, ...shuffledRemaining]
      : shuffledRemaining;

    setState((prev) => ({ ...prev, inMemoryPlaylist: newPlaylist, currentVideoIndex: currentSong ? 1 : 0 }));
    
    // Save shuffled playlist to localStorage
    try {
      localStorage.setItem('ACTIVE_QUEUE', JSON.stringify(newPlaylist));
      console.log('[Shuffle] Saved shuffled playlist to ACTIVE_QUEUE localStorage');
    } catch (error) {
      console.error('[Shuffle] Failed to save shuffled playlist:', error);
    }
    
    addLog(
      "SONG_PLAYED",
      "Playlist shuffled by admin (excluding current song)",
    );
    toast({
      title: "Playlist Shuffled",
      description:
        "The playlist order has been randomized (current song unchanged)",
    });
  };

  return {
    loadPlaylistVideos,
    playNextSong,
    handleVideoEnded,
    handleDefaultPlaylistChange,
    handlePlaylistReorder,
    handlePlaylistShuffle,
    shufflePlaylist: handlePlaylistShuffle,
    isImportingPlaylist,
  };
};
