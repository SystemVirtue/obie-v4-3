import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { config } from "@/config";
import { youtubeProxy } from "@/services/youtube/proxy";
import type { JukeboxFullState, PlaylistItem } from "@/types/jukebox";

// Small helper to add timeouts to promises so we don't hang waiting forever
function withTimeout<T>(promise: Promise<T>, ms: number, message = "Operation timed out") {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(message));
    }, ms);

    promise
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

interface InitializationStatus {
  isInitialized: boolean;
  isInitializing: boolean;
  ytdlpAvailable: boolean;
  apiKeysValid: boolean;
  playlistLoaded: boolean;
  error: string | null;
}

interface UseAppInitializationOptions {
  state: JukeboxFullState;
  setState: React.Dispatch<React.SetStateAction<JukeboxFullState>>;
  addLog: (type: string, description: string, videoId?: string) => void;
}

/**
 * Hook to handle application initialization
 */
export const useAppInitialization = ({
  state,
  setState,
  addLog,
}: UseAppInitializationOptions) => {
  const { toast } = useToast();
  const [status, setStatus] = useState<InitializationStatus>({
    isInitialized: false,
    isInitializing: false,
    ytdlpAvailable: false,
    apiKeysValid: false,
    playlistLoaded: false,
    error: null,
  });

  // =========================================================================
  // YT_DLP Validation
  // =========================================================================

  const checkYtdlp = useCallback(async (): Promise<boolean> => {
    console.log("[Init] Checking YT_DLP availability...");
    
    try {
      // Give the proxy a short timeout so we don't wait forever
      const isAvailable = await withTimeout(
        youtubeProxy.isAvailable(),
        8000,
        "YT proxy availability check timed out"
      );
      
      if (isAvailable) {
        console.log("[Init] YT_DLP proxy is working!");
        toast({
          title: "YouTube Scraper OK",
          description: "Direct YouTube access available - no API keys needed",
          variant: "default",
          duration: 2000,
        });
        
        // Set search method to scraper
        setState((prev) => ({
          ...prev,
          searchMethod: "scraper",
        }));
        
        setStatus((prev) => ({ ...prev, ytdlpAvailable: true }));
        return true;
      } else {
        console.warn("[Init] YT_DLP proxy not available, will use API method");
        setStatus((prev) => ({ ...prev, ytdlpAvailable: false }));
        return false;
      }
    } catch (error) {
      console.error("[Init] Error checking YT_DLP:", error);
      setStatus((prev) => ({ ...prev, ytdlpAvailable: false }));
      return false;
    }
  }, [setState, toast]);

  // =========================================================================
  // API Key Validation
  // =========================================================================

  const checkApiKeys = useCallback(async (): Promise<boolean> => {
    console.log("[Init] Checking API keys...");
    
    // If YT_DLP is available, we don't need API keys
    if (status.ytdlpAvailable) {
      console.log("[Init] Skipping API key check (YT_DLP available)");
      setStatus((prev) => ({ ...prev, apiKeysValid: true }));
      return true;
    }
    
    // Check if we have at least one API key configured
    const hasApiKey = state.apiKey || config.youtube.apiKeys.length > 0;
    
    if (!hasApiKey) {
      console.warn("[Init] No API keys configured");
      setState((prev) => ({
        ...prev,
        showApiKeyTestDialog: true,
      }));
      setStatus((prev) => ({ ...prev, apiKeysValid: false }));
      return false;
    }
    
    // TODO: Add actual API key validation by making a test request
    console.log("[Init] API keys appear to be configured");
    setStatus((prev) => ({ ...prev, apiKeysValid: true }));
    return true;
  }, [state.apiKey, status.ytdlpAvailable, setState]);

  // =========================================================================
  // Default Playlist Loading
  // =========================================================================

  const loadDefaultPlaylist = useCallback(async (): Promise<boolean> => {
    console.log("[Init] Loading default playlist...");
    
    // Check if playlist already exists in localStorage
    const storedPlaylist = localStorage.getItem("active_playlist");
    const storedQueue = localStorage.getItem("PRIORITY_QUEUE");
    
    if (storedPlaylist || storedQueue) {
      console.log("[Init] Playlist already loaded from localStorage");
      setStatus((prev) => ({ ...prev, playlistLoaded: true }));
      return true;
    }
    
    // Load default playlist
    const playlistId = state.defaultPlaylist || config.youtube.defaultPlaylistId;
    
    try {
      console.log(`[Init] Fetching playlist: ${playlistId}`);
      
      let videos: PlaylistItem[] = [];
      
      // Try proxy first if available
      if (status.ytdlpAvailable) {
        try {
          // Allow a bit more time for playlist fetchs but still bound it
          videos = await withTimeout(
            youtubeProxy.getPlaylist(playlistId),
            15000,
            "YT proxy getPlaylist timed out"
          );
          console.log(`[Init] Loaded ${videos.length} videos via proxy`);
        } catch (error) {
          console.warn("[Init] Proxy failed or timed out, trying Supabase function...", error);
        }
      }
      
      // Fallback to Supabase function if proxy failed or unavailable
      if (videos.length === 0) {
        const { supabase } = await import("@/integrations/supabase/client");
        const playlistUrl = `https://www.youtube.com/playlist?list=${playlistId}`;

        // Bound the Supabase function invocation so it doesn't hang the init
        const invokePromise = supabase.functions.invoke("youtube-scraper", {
          body: {
            action: "playlist",
            url: playlistUrl,
            limit: 48,
          },
        });

        const { data, error } = await withTimeout(
          invokePromise as Promise<any>,
          20000,
          "Supabase function invoke timed out"
        );
        
        if (error) {
          throw new Error(`Supabase function error: ${error.message}`);
        }
        
        if (data?.videos && Array.isArray(data.videos)) {
          videos = data.videos.map((video: any) => ({
            id: video.id,
            videoId: video.id,
            title: video.title,
            channelTitle: video.channelTitle || "Unknown",
            isNowPlaying: false,
            isUserRequest: false,
          }));
          console.log(`[Init] Loaded ${videos.length} videos via Supabase function`);
        }
      }
      
      if (videos.length > 0) {
        // Save to localStorage
        localStorage.setItem("active_playlist", JSON.stringify(videos));
        
        // Update state
        setState((prev) => ({
          ...prev,
          defaultPlaylistVideos: videos,
          inMemoryPlaylist: [...videos],
          currentVideoIndex: 0,
        }));
        
        addLog(
          "SONG_PLAYED",
          `Loaded default playlist with ${videos.length} songs`
        );
        
        toast({
          title: "Playlist Loaded",
          description: `Loaded ${videos.length} songs from default playlist`,
          variant: "default",
        });
        
        setStatus((prev) => ({ ...prev, playlistLoaded: true }));
        return true;
      } else {
        throw new Error("No videos found in playlist");
      }
    } catch (error) {
      console.error("[Init] Failed to load default playlist:", error);
      toast({
        title: "Playlist Load Failed",
        description: "Could not load default playlist. You can add songs manually.",
        variant: "destructive",
      });
      setStatus((prev) => ({
        ...prev,
        playlistLoaded: false,
        error: (error as Error).message,
      }));
      return false;
    }
  }, [
    state.defaultPlaylist,
    status.ytdlpAvailable,
    setState,
    addLog,
    toast,
  ]);

  // =========================================================================
  // Main Initialization Sequence
  // =========================================================================

  const initialize = useCallback(async () => {
    if (status.isInitializing || status.isInitialized) {
      console.log("[Init] Already initialized or initializing, skipping");
      return;
    }
    
    console.log("[Init] Starting initialization sequence...");
    setStatus((prev) => ({ ...prev, isInitializing: true }));
    
    try {
      // Step 1: Check YT_DLP
      const ytdlpOk = await checkYtdlp();
      
      // Step 2: Check API keys (if needed)
      const apiKeysOk = await checkApiKeys();
      
      // Step 3: Load default playlist (if nothing in localStorage)
      const playlistOk = await loadDefaultPlaylist();
      
      // Mark as initialized
      setStatus((prev) => ({
        ...prev,
        isInitialized: true,
        isInitializing: false,
      }));
      
      console.log("[Init] Initialization complete", {
        ytdlpOk,
        apiKeysOk,
        playlistOk,
      });
      
      addLog("SONG_PLAYED", "Jukebox initialized successfully");
    } catch (error) {
      console.error("[Init] Initialization failed:", error);
      setStatus((prev) => ({
        ...prev,
        isInitializing: false,
        error: (error as Error).message,
      }));
      
      toast({
        title: "Initialization Error",
        description: "Some features may not work correctly. Check console for details.",
        variant: "destructive",
      });
    }
  }, [
    status.isInitializing,
    status.isInitialized,
    checkYtdlp,
    checkApiKeys,
    loadDefaultPlaylist,
    addLog,
    toast,
  ]);

  // =========================================================================
  // Auto-initialize on mount
  // =========================================================================

  useEffect(() => {
    // Run initialization but guard it with an overall timeout so a hung
    // initialize() doesn't leave the app stuck in initializing state.
    (async () => {
      try {
        await withTimeout(initialize(), 30000, "Initialization timed out");
      } catch (err) {
        console.error("[Init] Initialization failed or timed out:", err);
        setStatus((prev) => ({ ...prev, isInitializing: false, error: (err as Error).message }));
      }
    })();
  }, []); // Only run once on mount

  // =========================================================================
  // Return status and manual re-initialize function
  // =========================================================================

  return {
    ...status,
    reinitialize: initialize,
  };
};
