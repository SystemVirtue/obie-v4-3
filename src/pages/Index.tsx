import React, { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Check, X, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SearchInterface } from "@/components/SearchInterface";
import { IframeSearchInterface } from "@/components/IframeSearchInterface";
import { youtubeHtmlParserService } from "@/services/youtube/scraper";
import "@/utils/emergencyFallback";
import { InsufficientCreditsDialog } from "@/components/InsufficientCreditsDialog";
import { DuplicateSongDialog } from "@/components/DuplicateSongDialog";
import { AdminConsole } from "@/components/AdminConsole";
import { useSerialCommunication } from "@/components/SerialCommunication";
import {
  useBackgroundManager,
  BackgroundDisplay,
} from "@/components/BackgroundManager";
import { useJukeboxState } from "@/hooks/useJukeboxState";
import { usePlayerManager } from "@/hooks/usePlayerManager";
import { usePlaylistManager } from "@/hooks/usePlaylistManager";
import { useVideoSearch } from "@/hooks/useVideoSearch";
import { useApiKeyRotation } from "@/hooks/useApiKeyRotation";
import { LoadingIndicator } from "@/components/LoadingIndicator";
import { CreditsDisplay } from "@/components/CreditsDisplay";
import { DisplayConfirmationDialog } from "@/components/DisplayConfirmationDialog";
import { QuotaExhaustedDialog } from "@/components/QuotaExhaustedDialog";
import { ApiKeyTestDialog } from "@/components/ApiKeyTestDialog";
import { PlaylistImportPopover } from "@/components/PlaylistImportPopover";
import {
  NowPlayingTicker,
  PlayerStatusDisplay,
} from "@/components/NowPlayingTicker";
import { MiniPlayer } from "@/components/MiniPlayer";
import { SearchButton } from "@/components/SearchButton";
import { UpcomingQueue } from "@/components/UpcomingQueue";
import { FooterControls } from "@/components/FooterControls";
import { DisplaySelectionDialog } from "@/components/DisplaySelectionDialog";
import { PermissionDialog } from "@/components/PermissionDialog";
import { useDisplayConfirmation } from "@/hooks/useDisplayConfirmation";
import { useStorageSync } from "@/hooks/useStorageSync";
import { usePlayerInitialization } from "@/hooks/usePlayerInitialization";
import type { DisplayInfo } from "@/types/jukebox";
import { youtubeQuotaService } from "@/services/youtube/api";
import { shouldTestApiKeys } from "@/utils/apiKeyValidator";
import { useAppInitialization } from "@/hooks/useAppInitialization";
import { apiKeyRotation } from "@/services/youtube/api/keyRotation";

function Index() {
  const { toast } = useToast();

  // Override localStorage.setItem to show debug toast
  const originalSetItem = localStorage.setItem;
  localStorage.setItem = function(key: string, value: string) {
    const oldValue = localStorage.getItem(key);
    originalSetItem.call(this, key, value);
    
    let changeDetails = "";
    if (key === "USER_PREFERENCES" && oldValue) {
      try {
        const oldPrefs = JSON.parse(oldValue);
        const newPrefs = JSON.parse(value);
        const changes = [];
        for (const prop in newPrefs) {
          if (oldPrefs[prop] !== newPrefs[prop]) {
            changes.push(`${prop}: ${oldPrefs[prop]} → ${newPrefs[prop]}`);
          }
        }
        changeDetails = changes.length > 0 ? ` Changes: ${changes.join(", ")}` : " (no changes detected)";
      } catch (e) {
        changeDetails = " (JSON parse error)";
      }
    }
    
    // Defer toast to next tick to avoid setState during render
    setTimeout(() => {
      toast({
        title: "LocalStorage Updated",
        description: `Updated: ${key}${changeDetails}`,
        duration: 2000,
      });
    }, 0);
  };

  const {
    state,
    setState,
    addLog,
    addUserRequest,
    addCreditHistory,
    handleBackgroundUpload,
    handleAddToBackgroundQueue,
    handleRemoveFromBackgroundQueue,
    handleReorderBackgroundQueue,
    handleUpdateBackgroundQueueItem,
    handleTestBackgroundQueue,
    handleBackgroundSettingsChange,
    upcomingTitles,
    isCurrentSongUserRequest,
    getCurrentPlaylistForDisplay,
  } = useJukeboxState();

  // App initialization checks (moved to hook)
  useAppInitialization({ state, setState, addLog });

  const displayConfirmation = useDisplayConfirmation();

  const {
    initializePlayer,
    playSong,
    handlePlayerToggle,
    handleSkipSong,
    performSkip,
  } = usePlayerManager(
    state,
    setState,
    addLog,
    displayConfirmation.handleDisplayConfirmationNeeded,
  );

  const {
    loadPlaylistVideos,
    playNextSong,
    handleVideoEnded,
    handleDefaultPlaylistChange,
    handlePlaylistReorder,
    handlePlaylistShuffle,
    isImportingPlaylist,
  } = usePlaylistManager(state, setState, addLog, playSong, toast);

  // Storage synchronization hook (player window communication)
  useStorageSync({
    state,
    setState,
    addLog,
    handleVideoEnded,
    toast,
  });

  // Player initialization hook (auto-start first song)
  usePlayerInitialization({
    state,
    playNextSong,
    showDisplaySelectionDialog: () => setState(prev => ({ ...prev, showDisplaySelectionDialog: true })),
  });

  const {
    trackApiUsageWithRotation,
    checkAndRotateIfNeeded,
    getAllKeysStatus,
  } = useApiKeyRotation(state, setState, toast);

  // Handle all keys exhausted callback
  const handleAllKeysExhausted = useCallback(() => {
    console.log("[Quota] All API keys exhausted - opening test dialog");
    setState((prev) => ({
      ...prev,
      showApiKeyTestDialog: true, // Open dialog to find a working key
      allKeysExhausted: true,
      isAppPaused: true,
    }));
  }, [setState]);

  // Set up quota exhausted callback
  useEffect(() => {
    youtubeQuotaService.setAllKeysExhaustedCallback(handleAllKeysExhausted);

    return () => {
      youtubeQuotaService.setAllKeysExhaustedCallback(null);
    };
  }, [handleAllKeysExhausted]);

  // Permission dialog state
  const [permissionDialogState, setPermissionDialogState] = useState<{
    isOpen: boolean;
    permissionType: 'autoplay' | 'fullscreen' | null;
  }>({
    isOpen: false,
    permissionType: null,
  });

  // Permission dialog handlers
  const handlePermissionGranted = useCallback((permissionType: 'autoplay' | 'fullscreen') => {
    console.log(`[Permissions] ${permissionType} permission granted`);
    
    // Send response back to player window
    const response = {
      type: 'permissionResponse',
      permission: permissionType,
      granted: true,
    };
    
    // Try to send to player window
    if (state.playerWindow && !state.playerWindow.closed) {
      state.playerWindow.postMessage(response, '*');
    }
    
    // Also store in localStorage as backup
    localStorage.setItem('jukeboxPermissionResponse', JSON.stringify(response));
    
    // Close dialog
    setPermissionDialogState({ isOpen: false, permissionType: null });
  }, [state.playerWindow]);

  const handlePermissionDenied = useCallback((permissionType: 'autoplay' | 'fullscreen') => {
    console.log(`[Permissions] ${permissionType} permission denied`);
    
    // Send response back to player window
    const response = {
      type: 'permissionResponse',
      permission: permissionType,
      granted: false,
    };
    
    // Try to send to player window
    if (state.playerWindow && !state.playerWindow.closed) {
      state.playerWindow.postMessage(response, '*');
    }
    
    // Also store in localStorage as backup
    localStorage.setItem('jukeboxPermissionResponse', JSON.stringify(response));
    
    // Close dialog
    setPermissionDialogState({ isOpen: false, permissionType: null });
  }, [state.playerWindow]);

  // Listen for permission requests from player window
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'permissionRequest') {
        console.log('[Permissions] Received permission request:', event.data);
        setPermissionDialogState({
          isOpen: true,
          permissionType: event.data.permission,
        });
      }
    };

    window.addEventListener('message', handleMessage);
    
    // Also check localStorage for permission requests (polling fallback)
    const checkForPermissionRequests = () => {
      const requestStr = localStorage.getItem('jukeboxPermissionRequest');
      if (requestStr) {
        try {
          const request = JSON.parse(requestStr);
          if (request.type === 'permissionRequest') {
            console.log('[Permissions] Found permission request in localStorage:', request);
            setPermissionDialogState({
              isOpen: true,
              permissionType: request.permission,
            });
            // Clear the request
            localStorage.removeItem('jukeboxPermissionRequest');
          }
        } catch (e) {
          console.error('[Permissions] Error parsing permission request:', e);
        }
      }
    };
    
    // Check immediately and then poll
    checkForPermissionRequests();
    const interval = setInterval(checkForPermissionRequests, 1000);
    
    return () => {
      window.removeEventListener('message', handleMessage);
      clearInterval(interval);
    };
  }, []);

  // Handle quota exhausted dialog OK click
  const handleQuotaExhaustedOk = useCallback(() => {
    setState((prev) => ({
      ...prev,
      allKeysExhausted: false,
      isAppPaused: false,
    }));
  }, [setState]);

  // Handle API key test dialog completion
  const handleApiKeyTestComplete = useCallback(
    (results: any[]) => {
      console.log("[Init] API key test results:", results);

      // Find the first working key (status === "success")
      const workingKey = results.find((r) => r.status === "success");

      if (workingKey) {
        console.log(
          `[Init] Found working key: ...${workingKey.key.slice(-8)} (${workingKey.keyName})`,
        );

        // Map the key name to the correct option
        let selectedOption = "key1";
        if (workingKey.keyName.includes("Key 1")) selectedOption = "key1";
        else if (workingKey.keyName.includes("Key 2")) selectedOption = "key2";
        else if (workingKey.keyName.includes("Key 3")) selectedOption = "key3";
        else if (workingKey.keyName.includes("Key 4")) selectedOption = "key4";
        else if (workingKey.keyName.includes("Key 5")) selectedOption = "key5";

        console.log(
          `[Init] Setting API key to ${selectedOption} with key ...${workingKey.key.slice(-8)}`,
        );

        setState((prev) => ({
          ...prev,
          apiKey: workingKey.key,
          selectedApiKeyOption: selectedOption,
          showApiKeyTestDialog: false,
        }));

        // Show success message
        toast({
          title: "API Key Selected",
          description: `Using ${workingKey.keyName} - Quota: ${workingKey.quotaUsage?.used || 0}/${workingKey.quotaUsage?.limit || 10000} (${workingKey.quotaUsage?.percentage?.toFixed(1) || 0}%)`,
          variant: "default",
        });
      } else {
        console.log(
          "[Init] NO working keys found - ALL keys failed! Using HTML parser fallback mode",
        );

        // DO NOT open admin panel - use HTML parser instead
        setState((prev) => ({
          ...prev,
          showApiKeyTestDialog: false,
          // DO NOT set isAdminOpen: true
        }));

        // Show fallback mode message
        toast({
          title: "Fallback Mode Active",
          description:
            "All YouTube API keys quota exceeded. Loading curated playlist without API usage.",
          variant: "default",
        });

        // Immediately load playlist using HTML parser - bypass API key requirement
        console.log(
          "[Init] Loading fallback playlist using HTML parser for:",
          state.defaultPlaylist,
        );

        // Use HTML parser directly since we have no working API keys
        youtubeHtmlParserService
          .parsePlaylist(state.defaultPlaylist)
          .then((fallbackVideos) => {
            console.log(
              `[Init] HTML parser generated ${fallbackVideos.length} fallback videos`,
            );

            setState((prev) => ({
              ...prev,
              defaultPlaylistVideos: fallbackVideos,
              inMemoryPlaylist: [...fallbackVideos],
              currentVideoIndex: 0,
            }));

            addLog(
              "SONG_PLAYED",
              `Loaded HTML parser playlist with ${fallbackVideos.length} songs due to quota exhaustion`,
            );

            toast({
              title: "Playlist Loaded",
              description: `Loaded ${fallbackVideos.length} popular songs using fallback mode.`,
              variant: "default",
            });
          })
          .catch((error) => {
            console.error("[Init] HTML parser failed:", error);
            toast({
              title: "Fallback Failed",
              description:
                "Unable to load fallback playlist. Please refresh the page.",
              variant: "destructive",
            });
          });
      }
    },
    [setState, toast, addLog, state.defaultPlaylist],
  );

  const {
    performSearch,
    handleVideoSelect,
    confirmAddToPlaylist,
    handleKeyboardInput,
    confirmDialog,
    setConfirmDialog,
  } = useVideoSearch(
    state,
    setState,
    addLog,
    addUserRequest,
    addCreditHistory,
    toast,
    checkAndRotateIfNeeded,
  );

  // Periodic check for rotation (every 5 minutes)
  useEffect(() => {
    if (!state.autoRotateApiKeys) return;

    const interval = setInterval(
      () => {
        checkAndRotateIfNeeded();
      },
      5 * 60 * 1000,
    ); // 5 minutes

    return () => clearInterval(interval);
  }, [state.autoRotateApiKeys, checkAndRotateIfNeeded]);

  // Use refs to store latest values for the storage event handler
  const stateRef = useRef(state);
  const handleVideoEndedRef = useRef(handleVideoEnded);

  // Update refs whenever values change
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    handleVideoEndedRef.current = handleVideoEnded;
  }, [handleVideoEnded]);

  // Use background manager hook - conditionally use queue mode based on bgVisualMode
  const { getCurrentBackground } = useBackgroundManager(
    state.bgVisualMode === 'custom-queue'
      ? {
          backgrounds: state.backgrounds,
          backgroundQueue: state.backgroundQueue,
          backgroundSettings: state.backgroundSettings,
          onBackgroundQueueIndexChange: (index) =>
            setState((prev) => ({ ...prev, backgroundQueueIndex: index })),
          backgroundQueueIndex: state.backgroundQueueIndex,
          bgVisualMode: state.bgVisualMode,
        }
      : {
          backgrounds: state.backgrounds,
          selectedBackground: state.selectedBackground,
          cycleBackgrounds: state.cycleBackgrounds,
          backgroundCycleIndex: state.backgroundCycleIndex,
          bounceVideos: state.bounceVideos,
          backgroundSettings: state.backgroundSettings,
          onBackgroundCycleIndexChange: (index) =>
            setState((prev) => ({ ...prev, backgroundCycleIndex: index })),
          onSelectedBackgroundChange: (id) =>
            setState((prev) => ({ ...prev, selectedBackground: id })),
          bgVisualMode: state.bgVisualMode,
        }
  );

  // Use serial communication hook with new props
  useSerialCommunication({
    mode: state.mode,
    selectedCoinAcceptor: state.selectedCoinAcceptor,
    onCreditsChange: (delta) =>
      setState((prev) => ({ ...prev, credits: prev.credits + delta })),

    credits: state.credits,
    onAddLog: addLog,
    coinValueA: state.coinValueA,
    coinValueB: state.coinValueB,
  });

  // Initialize playlist ONLY when API key is properly selected AND playlist changes
  const [hasInitialized, setHasInitialized] = useState(false);
  useEffect(() => {
    // Don't initialize if API key test dialog is still open
    if (state.showApiKeyTestDialog) {
      console.log(
        "[Init] Skipping playlist load - API key test dialog is open",
      );
      return;
    }

    // Don't initialize if no valid API key is set AND we don't have a fallback playlist loaded
    if (
      (!state.apiKey || state.apiKey.length < 20) &&
      state.defaultPlaylistVideos.length === 0
    ) {
      console.log(
        "[Init] No valid API key and no fallback playlist - waiting for API key test completion or fallback load",
      );
      return;
    }

    // Don't initialize if selectedApiKeyOption is still "custom" (means no proper key selected)
    if (state.selectedApiKeyOption === "custom" && !state.customApiKey) {
      console.log(
        "[Init] Skipping playlist load - API key not properly selected yet",
      );
      return;
    }

    // Only run once after API key is properly set
    if (hasInitialized) {
      return;
    }

    console.log(
      `[Init] Loading initial playlist with selected key: ${state.selectedApiKeyOption} (...${state.apiKey.slice(-8)})`,
    );
    setHasInitialized(true);

    // Check if quota is exhausted for current API key
    const quotaExhaustedKey = `quota-exhausted-${state.apiKey.slice(-8)}`;
    const quotaExhaustedTime = localStorage.getItem(quotaExhaustedKey);
    if (quotaExhaustedTime) {
      const timeSinceExhaustion = Date.now() - parseInt(quotaExhaustedTime);
      // If quota was exhausted recently (within 1 hour), skip loading
      if (timeSinceExhaustion < 3600000) {
        console.log("[Init] API key quota exhausted, skipping playlist load");
        return;
      }
    }

    loadPlaylistVideos(state.defaultPlaylist);
  }, [
    state.showApiKeyTestDialog,
    state.apiKey,
    state.selectedApiKeyOption,
    state.customApiKey,
    hasInitialized,
  ]); // Depend on API key selection state

  // Initialize player only after playlist is loaded and ready
  useEffect(() => {
    // Only log in development and reduce frequency
    if (process.env.NODE_ENV === 'development') {
      console.log("[Auto-init] Checking player initialization conditions:", {
        playlistLength: state.defaultPlaylistVideos.length,
        hasPlayerWindow: !!state.playerWindow,
        isPlayerRunning: state.isPlayerRunning,
        windowClosed: state.playerWindow?.closed,
      });
    }

    // Check if playlist is empty but don't auto-open admin - let API key rotation handle it
    const hasEmptyPlaylist = state.defaultPlaylistVideos.length === 0;

    if (hasEmptyPlaylist && state.apiKey) {
      console.log(
        "[Auto-init] Empty playlist detected - API key rotation will handle this",
      );
      // Don't auto-open admin panel - the API key test dialog already handled key selection
      // If playlist loading fails, rotation will find a working key or exhaust all keys
    }

    // Only auto-initialize if user hasn't manually closed the player recently
    const playerWindowState = localStorage.getItem("jukeboxPlayerWindowState");
    let shouldAutoInit = true;

    if (playerWindowState) {
      try {
        const parsedState = JSON.parse(playerWindowState);
        const timeSinceClose = Date.now() - parsedState.timestamp;
        // Don't auto-init if user closed it recently (within 5 minutes)
        if (parsedState.isClosed && timeSinceClose < 300000) {
          shouldAutoInit = false;
        }
      } catch (error) {
        // If we can't parse, assume we should auto-init
        shouldAutoInit = true;
      }
    }

    // Check if user needs to select a display first
    // Show dialog if showDisplaySelectionDialogOnStartup is enabled (AutoOpenPlayer is FALSE)
    const needsDisplaySelection = state.showDisplaySelectionDialogOnStartup;

    console.log("[Auto-init] Display selection check:", {
      userDefaultPlayerDisplay: state.userDefaultPlayerDisplay,
      showDisplaySelectionDialogOnStartup: state.showDisplaySelectionDialogOnStartup,
      needsDisplaySelection
    });

    if (needsDisplaySelection) {
      console.log("[Auto-init] User needs to select display first, showing dialog");
      setState((prev) => ({ ...prev, showDisplaySelectionDialog: true }));
      return;
    }

    if (
      state.defaultPlaylistVideos.length > 0 &&
      (!state.playerWindow || state.playerWindow.closed) &&
      !state.isPlayerRunning &&
      !state.showMiniPlayer &&
      shouldAutoInit
    ) {
      console.log(
        "[Auto-init] ALL CONDITIONS MET - Initializing player:",
        {
          playlistLength: state.defaultPlaylistVideos.length,
          hasPlayerWindow: !!state.playerWindow,
          windowClosed: state.playerWindow?.closed,
          isPlayerRunning: state.isPlayerRunning,
          showMiniPlayer: state.showMiniPlayer,
          shouldAutoInit,
          userDefaultPlayerDisplay: !!state.userDefaultPlayerDisplay,
          showDisplaySelectionDialogOnStartup: state.showDisplaySelectionDialogOnStartup
        }
      );

      // Try initialization with a more permissive approach
      let retryCount = 0;
      const maxRetries = 0; // Don't retry automatically to avoid being aggressive

      const tryInitialization = async () => {
        console.log(`[Auto-init] Attempt ${retryCount + 1}/${maxRetries + 1}`);

        try {
          await initializePlayer();

          // Check if player was successfully created
          setTimeout(() => {
            setState((currentState) => {
              if (
                !currentState.playerWindow ||
                currentState.playerWindow.closed
              ) {
                retryCount++;
                if (retryCount <= maxRetries) {
                  console.log(
                    `[Auto-init] Retry ${retryCount}/${maxRetries} in 2 seconds...`,
                  );
                  setTimeout(tryInitialization, 2000);
                } else {
                  console.error(
                    "[Auto-init] Failed to initialize player after all retries",
                  );
                  // Only show this message if we actually tried to initialize
                  if (retryCount > 0) {
                    toast({
                      title: "Player Window Blocked",
                      description:
                        "Browser blocked the player window. Please allow popups for this site, then click 'Open Player' in the admin panel (Settings icon bottom-left).",
                      variant: "default",
                      duration: 6000,
                    });
                  }
                }
              } else {
                console.log("[Auto-init] Player successfully initialized!");
              }
              return currentState;
            });
          }, 1500);
        } catch (error) {
          console.error("[Auto-init] Error during initialization:", error);
          retryCount++;
          if (retryCount <= maxRetries) {
            setTimeout(tryInitialization, 2000);
          }
        }
      };

      // Start with a small delay
      setTimeout(tryInitialization, 500);
    } else {
      console.log("[Auto-init] Skipping initialization - conditions not met:", {
        playlistLength: state.defaultPlaylistVideos.length,
        hasPlayerWindow: !!state.playerWindow,
        windowClosed: state.playerWindow?.closed,
        isPlayerRunning: state.isPlayerRunning,
        showMiniPlayer: state.showMiniPlayer,
        shouldAutoInit,
        userDefaultPlayerDisplay: !!state.userDefaultPlayerDisplay,
        showDisplaySelectionDialogOnStartup: state.showDisplaySelectionDialogOnStartup
      });
    }
  }, [
    state.defaultPlaylistVideos.length,
    state.playerWindow,
    state.isPlayerRunning,
    initializePlayer,
    toast,
  ]);

  // Emergency recovery event listener
  useEffect(() => {
    const handleEmergencyPlaylistInject = (event: any) => {
      console.log("[Emergency] Received emergency playlist injection");
      const { playlist } = event.detail;

      if (playlist && Array.isArray(playlist)) {
        setState((prev) => ({
          ...prev,
          defaultPlaylistVideos: playlist,
          inMemoryPlaylist: [...playlist],
          currentVideoIndex: 0,
        }));

        toast({
          title: "Emergency Recovery",
          description: `Injected ${playlist.length} songs from emergency fallback playlist.`,
          variant: "default",
        });

        console.log(
          `[Emergency] Successfully injected ${playlist.length} songs`,
        );
      }
    };

    window.addEventListener(
      "emergency-playlist-inject",
      handleEmergencyPlaylistInject,
    );
    return () =>
      window.removeEventListener(
        "emergency-playlist-inject",
        handleEmergencyPlaylistInject,
      );
  }, [setState, toast]);

  const currentBackground = getCurrentBackground() || {
    id: 'default-black',
    name: 'Default (Black)',
    url: '',
    type: 'image' as const,
  };

  // Determine when to show the loading indicator
  const isLoading =
    // When API key test dialog is open
    state.showApiKeyTestDialog ||
    // When the application is initializing
    state.defaultPlaylistVideos.length === 0 ||
    // When playlist is loading
    state.currentlyPlaying === "Loading..." ||
    // When searching for videos
    state.isSearching ||
    // When player is not running yet
    (!state.isPlayerRunning && state.defaultPlaylistVideos.length > 0);

  return (
    <BackgroundDisplay
      background={currentBackground}
      backgroundSettings={state.backgroundSettings}
      onVideoEnd={() => {
        // Advance to next background in queue
        const nextIndex = (state.backgroundQueueIndex + 1) % state.backgroundQueue.length;
        setState((prev) => ({ ...prev, backgroundQueueIndex: nextIndex }));
      }}
    >
      <LoadingIndicator isVisible={isLoading} />
      <CreditsDisplay credits={state.credits} mode={state.mode} />
      <div className="relative z-10 min-h-screen p-8 flex flex-col">
        {/* Now Playing Ticker */}
        <NowPlayingTicker currentlyPlaying={state.currentlyPlaying} />

        {/* Player Status Display */}
        <PlayerStatusDisplay 
          playerStatus={state.playerStatus} 
          isPlayerRunning={state.isPlayerRunning}
          playerWindow={state.playerWindow}
        />

        {/* Credits display has been moved to the CreditsDisplay component */}


        {/* Mini Player */}
        <MiniPlayer
          videoId={state.currentVideoId}
          showMiniPlayer={state.showMiniPlayer}
          isMainPlayer={state.showMiniPlayer}
        />

        {/* Search Button */}
        <SearchButton
          onClick={() =>
            setState((prev) => ({
              ...prev,
              isSearchOpen: true,
              showKeyboard: true,
              showSearchResults: false,
            }))
          }
        />

        {/* Upcoming Queue */}
        <UpcomingQueue
          upcomingTitles={upcomingTitles}
          testMode={state.testMode}
        />

        {/* Footer Controls */}
        <FooterControls
          onOpenAdmin={() =>
            setState((prev) => ({ ...prev, isAdminOpen: true }))
          }
        />
      </div>

      {/* Skip Confirmation Dialog */}
      <Dialog
        open={state.showSkipConfirmation}
        onOpenChange={(open) =>
          !open &&
          setState((prev) => ({ ...prev, showSkipConfirmation: false }))
        }
      >
        <DialogContent className="bg-gradient-to-b from-amber-50 to-amber-100 border-amber-600">
          <DialogHeader>
            <DialogTitle className="text-xl text-amber-900">
              Skip User Selection?
            </DialogTitle>
            <DialogDescription className="text-amber-800">
              Confirm if you want to skip the current user-requested song.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <p className="text-amber-800">
              Current song is a user selection. Are you sure you want to skip to
              the next song?
            </p>
          </div>

          <DialogFooter className="flex gap-4">
            <Button
              variant="outline"
              onClick={() =>
                setState((prev) => ({ ...prev, showSkipConfirmation: false }))
              }
              className="flex items-center gap-2 border-red-300 text-red-700 hover:bg-red-50"
            >
              <X className="w-4 h-4" />
              No
            </Button>
            <Button
              onClick={performSkip}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
            >
              <Check className="w-4 h-4" />
              Yes, Skip
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Conditionally render search interface based on search method */}
      {state.searchMethod === "iframe_search" ? (
        <IframeSearchInterface
          isOpen={state.isSearchOpen}
          onClose={() => {
            console.log("Iframe search interface closing");
            setState((prev) => ({
              ...prev,
              isSearchOpen: false,
              showKeyboard: false,
              showSearchResults: false,
              searchQuery: "",
              searchResults: [],
            }));
          }}
          searchQuery={state.searchQuery}
          onSearchQueryChange={(query) => {
            console.log("Iframe search query changed:", query);
            setState((prev) => ({ ...prev, searchQuery: query }));
          }}
          searchResults={state.searchResults}
          isSearching={state.isSearching}
          showKeyboard={state.showKeyboard}
          showSearchResults={state.showSearchResults}
          onKeyboardInput={handleKeyboardInput}
          onVideoSelect={handleVideoSelect}
          onBackToSearch={() => {
            console.log("Back to iframe search pressed");
            setState((prev) => ({
              ...prev,
              showSearchResults: false,
              showKeyboard: true,
            }));
          }}
          mode={state.mode}
          credits={state.credits}
          onInsufficientCredits={() =>
            setState((prev) => ({ ...prev, showInsufficientCredits: true }))
          }
        />
      ) : (
        <SearchInterface
          isOpen={state.isSearchOpen}
          onClose={() => {
            console.log("API search interface closing");
            setState((prev) => ({
              ...prev,
              isSearchOpen: false,
              showKeyboard: false,
              showSearchResults: false,
              searchQuery: "",
              searchResults: [],
            }));
          }}
          searchQuery={state.searchQuery}
          onSearchQueryChange={(query) => {
            console.log("API search query changed:", query);
            setState((prev) => ({ ...prev, searchQuery: query }));
          }}
          searchResults={state.searchResults}
          isSearching={state.isSearching}
          showKeyboard={state.showKeyboard}
          showSearchResults={state.showSearchResults}
          onKeyboardInput={handleKeyboardInput}
          onVideoSelect={handleVideoSelect}
          onBackToSearch={() => {
            console.log("Back to API search pressed");
            setState((prev) => ({
              ...prev,
              showSearchResults: false,
              showKeyboard: true,
            }));
          }}
          mode={state.mode}
          credits={state.credits}
          onInsufficientCredits={() =>
            setState((prev) => ({ ...prev, showInsufficientCredits: true }))
          }
        />
      )}

      {/* Insufficient Credits Dialog */}
      <InsufficientCreditsDialog
        isOpen={state.showInsufficientCredits}
        onClose={() =>
          setState((prev) => ({
            ...prev,
            showInsufficientCredits: false,
            isSearchOpen: false,
            showKeyboard: false,
            showSearchResults: false,
            searchQuery: "",
            searchResults: [],
          }))
        }
      />

      {/* Duplicate Song Dialog */}
      <DuplicateSongDialog
        isOpen={state.showDuplicateSong}
        onClose={() =>
          setState((prev) => ({
            ...prev,
            showDuplicateSong: false,
            duplicateSongTitle: "",
          }))
        }
        songTitle={state.duplicateSongTitle}
      />

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialog.isOpen}
        onOpenChange={(open) =>
          !open && setConfirmDialog({ isOpen: false, video: null })
        }
      >
        <DialogContent className="bg-gradient-to-b from-amber-50 to-amber-100 border-amber-600">
          <DialogHeader>
            <DialogTitle className="text-xl text-amber-900">
              Add song to Playlist?
            </DialogTitle>
            <DialogDescription className="text-amber-800">
              Confirm adding this song to your playlist for playback.
            </DialogDescription>
          </DialogHeader>

          {confirmDialog.video && (
            <div className="py-4">
              <div className="flex gap-3">
                <img
                  src={confirmDialog.video.thumbnailUrl}
                  alt={confirmDialog.video.title}
                  className="w-20 h-15 object-cover rounded"
                />
                <div>
                  <h3 className="font-semibold text-amber-900">
                    {confirmDialog.video.title}
                  </h3>
                  <p className="text-amber-700">
                    {confirmDialog.video.channelTitle}
                  </p>
                  {confirmDialog.video.duration && (
                    <p className="text-amber-600 text-sm">
                      {confirmDialog.video.duration}
                    </p>
                  )}
                  {state.mode === "PAID" && (
                    <p className="text-sm text-amber-600 mt-1">
                      Cost: 1 Credit
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-4">
            <Button
              variant="outline"
              onClick={() => setConfirmDialog({ isOpen: false, video: null })}
              className="flex items-center gap-2 border-red-300 text-red-700 hover:bg-red-50"
            >
              <X className="w-4 h-4" />
              No
            </Button>
            <Button
              onClick={confirmAddToPlaylist}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
            >
              <Check className="w-4 h-4" />
              Yes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Admin Console Dialog */}
      <AdminConsole
        isOpen={state.isAdminOpen}
        onClose={() => setState((prev) => ({ ...prev, isAdminOpen: false }))}
        mode={state.mode}
        onModeChange={(mode) => setState((prev) => ({ ...prev, mode }))}
        credits={state.credits}
        onCreditsChange={(credits) => setState((prev) => ({ ...prev, credits }))}
        apiKey={state.apiKey}
        onApiKeyChange={(key) => setState((prev) => ({ ...prev, apiKey: key }))}
        selectedApiKeyOption={state.selectedApiKeyOption}
        onApiKeyOptionChange={(option) =>
          setState((prev) => ({ ...prev, selectedApiKeyOption: option }))
        }
        customApiKey={state.customApiKey}
        onCustomApiKeyChange={(key) =>
          setState((prev) => ({ ...prev, customApiKey: key }))
        }
        autoRotateApiKeys={state.autoRotateApiKeys}
        onAutoRotateChange={(enabled) =>
          setState((prev) => ({ ...prev, autoRotateApiKeys: enabled }))
        }
        rotationHistory={state.rotationHistory}
        lastRotationTime={state.lastRotationTime}
        searchMethod={state.searchMethod}
        onSearchMethodChange={(method) =>
          setState((prev) => ({ ...prev, searchMethod: method }))
        }
        selectedCoinAcceptor={state.selectedCoinAcceptor}
        onCoinAcceptorChange={(device) =>
          setState((prev) => ({ ...prev, selectedCoinAcceptor: device }))
        }
        logs={state.logs}
        userRequests={state.userRequests}
        creditHistory={state.creditHistory}
        backgrounds={state.backgrounds}
        selectedBackground={state.selectedBackground}
        onBackgroundChange={(id) =>
          setState((prev) => ({ ...prev, selectedBackground: id }))
        }
        cycleBackgrounds={state.cycleBackgrounds}
        onCycleBackgroundsChange={(cycle) =>
          setState((prev) => ({ ...prev, cycleBackgrounds: cycle }))
        }
        bounceVideos={state.bounceVideos}
        onBounceVideosChange={(bounce) =>
          setState((prev) => ({ ...prev, bounceVideos: bounce }))
        }
        backgroundQueue={state.backgroundQueue}
        onAddToBackgroundQueue={handleAddToBackgroundQueue}
        onRemoveFromBackgroundQueue={handleRemoveFromBackgroundQueue}
        onReorderBackgroundQueue={handleReorderBackgroundQueue}
        onUpdateBackgroundQueueItem={handleUpdateBackgroundQueueItem}
        onTestBackgroundQueue={handleTestBackgroundQueue}
        isTestingBackgroundQueue={state.isTestingBackgroundQueue}
        currentTestIndex={state.currentTestIndex}
        backgroundSettings={state.backgroundSettings}
        onBackgroundSettingsChange={handleBackgroundSettingsChange}
        onBackgroundUpload={handleBackgroundUpload}
        onAddLog={addLog}
        onAddUserRequest={addUserRequest}
        onAddCreditHistory={addCreditHistory}
        playerWindow={state.playerWindow}
        isPlayerRunning={state.isPlayerRunning}
        isPlayerPaused={state.isPlayerPaused}
        onPlayerToggle={handlePlayerToggle}
        onSkipSong={handleSkipSong}
        onInitializePlayer={initializePlayer}
        maxSongLength={state.maxSongLength}
        onMaxSongLengthChange={(minutes) =>
          setState((prev) => ({ ...prev, maxSongLength: minutes }))
        }
        defaultPlaylist={state.defaultPlaylist}
        onDefaultPlaylistChange={async (playlistId) => {
          // Update defaultPlaylist in state immediately for UI feedback
          setState((prev) => ({ ...prev, defaultPlaylist: playlistId }));

          // Show import loading popover
          setState((prev) => ({
            ...prev,
            isImportingPlaylist: true,
            importProgress: 10,
            importError: null
          }));

          // Try proxy first, then fallback to YouTube Data API if needed
          let playlistItems = [];
          let usedFallback = false;
          try {
            setState((prev) => ({ ...prev, importProgress: 25 }));
            const { youtubeProxy } = await import("@/services/youtube/proxy");
            playlistItems = await youtubeProxy.getPlaylist(playlistId);
            setState((prev) => ({ ...prev, importProgress: 60 }));
          } catch (proxyError) {
            if (typeof window !== "undefined" && window.console) {
              console.warn("[Admin] Proxy failed, will try YouTube Data API:", proxyError);
            }
            setState((prev) => ({ ...prev, importProgress: 40 }));
          }

          // If proxy failed or returned too few songs, try YouTube Data API
          if (!playlistItems || playlistItems.length < 10) {
            usedFallback = true;
            try {
              const { youtubeAPIClient } = await import("@/services/youtube/api/client");

              // Get validated API keys with available quota
              const validKeys = await apiKeyRotation.getValidKeysWithQuota(state.customApiKey);

              if (validKeys.length === 0) {
                console.error("[Admin] No valid API keys available for playlist import");
                setState((prev) => ({
                  ...prev,
                  importProgress: 0,
                  importError: "No valid API keys available. Please check your API key configuration."
                }));
                return;
              }

              // Use the first valid key
              const apiKey = validKeys[0].key;
              console.log(`[Admin] Using validated API key for playlist import: ${validKeys[0].option}`);

              setState((prev) => ({ ...prev, importProgress: 70 }));
              playlistItems = await youtubeAPIClient.getPlaylist(playlistId, apiKey);
              setState((prev) => ({ ...prev, importProgress: 90 }));
              if (typeof window !== "undefined" && window.console) {
                console.log(`[Admin] Fallback: Loaded ${playlistItems.length} videos from YouTube Data API for playlist ${playlistId}`);
              }
            } catch (apiError) {
              console.error("[Admin] Fallback YouTube Data API failed:", apiError);
              setState((prev) => ({
                ...prev,
                importProgress: 0,
                importError: apiError instanceof Error ? apiError.message : "Failed to import playlist. Please try again."
              }));
              return;
            }
          }

          // Save to localStorage and update state if we got any items
          if (playlistItems && playlistItems.length > 0) {
            localStorage.setItem("active_playlist", JSON.stringify(playlistItems));
            setState((prev) => ({
              ...prev,
              defaultPlaylist: playlistId,
              defaultPlaylistVideos: playlistItems,
              inMemoryPlaylist: [...playlistItems],
              currentVideoIndex: 0,
              importProgress: 100,
            }));

            // Auto-hide popover after success
            setTimeout(() => {
              setState((prev) => ({
                ...prev,
                isImportingPlaylist: false,
                importProgress: 0,
                importError: null
              }));
            }, 1000);

            if (typeof window !== "undefined" && window.console) {
              console.log(`[Admin] Loaded ${playlistItems.length} videos from ${usedFallback ? "YouTube Data API" : "proxy"} for playlist ${playlistId}`);
            }
          } else {
            setState((prev) => ({
              ...prev,
              importProgress: 0,
              importError: "No videos found in playlist. Please check the playlist ID and try again."
            }));
          }
        }}
        currentPlaylistVideos={getCurrentPlaylistForDisplay()}
        onPlaylistReorder={(newPlaylist) =>
          setState((prev) => ({ ...prev, inMemoryPlaylist: newPlaylist }))
        }
        onPlaylistShuffle={() => {
          // Don't shuffle if currently playing - only shuffle the remaining playlist
          const currentSong = state.inMemoryPlaylist.find(song => song.title === state.currentlyPlaying);
          const remainingPlaylist = state.inMemoryPlaylist.filter(song => song.title !== state.currentlyPlaying);
          const shuffledRemaining = remainingPlaylist.sort(() => Math.random() - 0.5);
          
          // If there's a current song, keep it at the front
          const shuffled = currentSong ? [currentSong, ...shuffledRemaining] : shuffledRemaining;
          
          // After shuffle, current song is at index 0, so next song is at index 1
          const newCurrentVideoIndex = currentSong ? 1 : 0;
          
          setState((prev) => ({ 
            ...prev, 
            inMemoryPlaylist: shuffled,
            currentVideoIndex: newCurrentVideoIndex
          }));
          
          addLog('SONG_PLAYED', 'Playlist shuffled by admin (excluding current song)');
          toast({
            title: "Playlist Shuffled",
            description: "The playlist order has been randomized (current song unchanged)",
          });
        }}
        currentlyPlaying={state.currentlyPlaying}
        priorityQueue={state.priorityQueue}
        showMiniPlayer={state.showMiniPlayer}
        onShowMiniPlayerChange={(show) =>
          setState((prev) => ({ ...prev, showMiniPlayer: show }))
        }
        testMode={state.testMode}
        onTestModeChange={(testMode) =>
          setState((prev) => ({ ...prev, testMode: testMode }))
        }
        coinValueA={state.coinValueA}
        onCoinValueAChange={(value) =>
          setState((prev) => ({ ...prev, coinValueA: value }))
        }
        coinValueB={state.coinValueB}
        onCoinValueBChange={(value) =>
          setState((prev) => ({ ...prev, coinValueB: value }))
        }
        videoQuality={state.videoQuality}
        onVideoQualityChange={(quality) =>
          setState((prev) => ({ ...prev, videoQuality: quality }))
        }
        hideEndCards={state.hideEndCards}
        onHideEndCardsChange={(hide) =>
          setState((prev) => ({ ...prev, hideEndCards: hide }))
        }
        selectedDisplay={state.selectedDisplay}
        onSelectedDisplayChange={(display) =>
          setState((prev) => ({ ...prev, selectedDisplay: display, autoDetectDisplay: false }))
        }
        useFullscreen={state.useFullscreen}
        onUseFullscreenChange={(fullscreen) =>
          setState((prev) => ({ ...prev, useFullscreen: fullscreen }))
        }
        autoDetectDisplay={state.autoDetectDisplay}
        onAutoDetectDisplayChange={(autoDetect) =>
          setState((prev) => ({ ...prev, autoDetectDisplay: autoDetect }))
        }
        adaptiveQualityEnabled={state.adaptiveQualityEnabled}
        onAdaptiveQualityEnabledChange={(enabled) =>
          setState((prev) => ({ ...prev, adaptiveQualityEnabled: enabled }))
        }
        showDisplaySelectionDialogOnStartup={state.showDisplaySelectionDialogOnStartup}
        onShowDisplaySelectionDialogOnStartupChange={(show) =>
          setState((prev) => ({ ...prev, showDisplaySelectionDialogOnStartup: show }))
        }
        bgVisualMode={state.bgVisualMode}
        onBgVisualModeChange={(mode) =>
          setState((prev) => ({ ...prev, bgVisualMode: mode }))
        }
      />

      {/* Display Selection Dialog */}
      <DisplaySelectionDialog
        isOpen={state.showDisplaySelectionDialog}
        onClose={() => setState(prev => ({ ...prev, showDisplaySelectionDialog: false }))}
        onSelectDisplay={(displayId) => {
          // Set both selectedDisplay and userDefaultPlayerDisplay for persistence
          setState(prev => ({
            ...prev,
            selectedDisplay: displayId,
            userDefaultPlayerDisplay: {
              displayId,
              fullscreen: prev.useFullscreen,
              position: prev.playerWindowPosition
            },
            showDisplaySelectionDialog: false,
            showDisplaySelectionDialogOnStartup: false
          }));
          // Initialize player with selected display
          initializePlayer();
        }}
        onAutoOpenPlayer={() => {
          // Set default display based on current selection or primary display
          const defaultDisplayId = state.selectedDisplay || 'primary';
          setState(prev => ({
            ...prev,
            userDefaultPlayerDisplay: {
              displayId: defaultDisplayId,
              fullscreen: prev.useFullscreen,
              position: prev.playerWindowPosition
            },
            showDisplaySelectionDialog: false,
            showDisplaySelectionDialogOnStartup: false
          }));
          initializePlayer();
        }}
        currentDefaultDisplay={state.selectedDisplay}
        useFullscreen={state.useFullscreen}
        isPlayerRunning={state.isPlayerRunning}
      />

      {/* Display Confirmation Dialog */}
      <DisplayConfirmationDialog
        isOpen={!!displayConfirmation.pendingDisplayConfirmation}
        displayInfo={displayConfirmation.pendingDisplayConfirmation?.displayInfo || null}
        onConfirm={displayConfirmation.handleDisplayConfirmationResponse}
        onCancel={displayConfirmation.handleDisplayConfirmationCancel}
      />

      {/* API Key Test Dialog */}
      <ApiKeyTestDialog
        isOpen={state.showApiKeyTestDialog}
        onComplete={handleApiKeyTestComplete}
      />

      {/* Quota Exhausted Dialog */}
      <QuotaExhaustedDialog
        isOpen={state.allKeysExhausted}
        onOkClick={handleQuotaExhaustedOk}
      />

      {/* Playlist Import Popover */}
      <PlaylistImportPopover
        isOpen={state.isImportingPlaylist}
        progress={state.importProgress}
        error={state.importError}
        onClose={() => setState(prev => ({
          ...prev,
          isImportingPlaylist: false,
          importProgress: 0,
          importError: null
        }))}
      />

      {/* App Pause Overlay */}
      {state.isAppPaused && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
          <div className="text-white text-center">
            <h2 className="text-4xl font-bold mb-4">APP PAUSED</h2>
            <p className="text-xl">
              All API keys exhausted. Please acknowledge the dialog to continue.
            </p>
          </div>
        </div>
      )}

      {/* Permission Dialog */}
      <PermissionDialog
        isOpen={permissionDialogState.isOpen}
        onClose={() => setPermissionDialogState({ isOpen: false, permissionType: null })}
        permissionType={permissionDialogState.permissionType || 'autoplay'}
        onPermissionGranted={handlePermissionGranted}
        onPermissionDenied={handlePermissionDenied}
      />

    </BackgroundDisplay>
  );

}
export default Index;
