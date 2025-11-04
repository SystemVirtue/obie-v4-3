/**
 * Search Kiosk Page
 * 
 * Public-facing touchscreen interface for searching music and submitting
 * song requests to an active Player via Supabase.
 * 
 * Features:
 * - Player validation on startup
 * - Search interface (reuses existing components)
 * - Credit display and coin acceptor integration
 * - Real-time request submission to Supabase
 * - Error handling for inactive players
 * 
 * @module pages/SearchKiosk
 */

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { CreditsDisplay } from "@/components/CreditsDisplay";
import { InsufficientCreditsDialog } from "@/components/InsufficientCreditsDialog";
import { SearchInterface } from "@/components/SearchInterface";
import { SearchButton } from "@/components/SearchButton";
import { useSerialCommunication } from "@/components/SerialCommunication";
import { useKioskCredits } from "@/hooks/useKioskCredits";
import { useVideoSearch } from "@/hooks/useVideoSearch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle, Monitor, RefreshCw, Edit, Loader2, Check, X } from "lucide-react";
import type { SearchResult } from "@/types/search";

/**
 * Search Kiosk Component
 * 
 * Manages player identification, validation, and song request submission
 */
export default function SearchKiosk() {
  const { toast } = useToast();
  
  // Player identifier management
  const [kioskPlayerId, setKioskPlayerId] = useState<string | null>(null);
  const [isValidatingPlayer, setIsValidatingPlayer] = useState(true);
  const [playerValidationError, setPlayerValidationError] = useState<string | null>(null);
  const [showPlayerIdDialog, setShowPlayerIdDialog] = useState(false);
  const [newPlayerId, setNewPlayerId] = useState("");
  
  // Auto-connect countdown states
  const [showAutoConnectCountdown, setShowAutoConnectCountdown] = useState(false);
  const [autoConnectCountdown, setAutoConnectCountdown] = useState(5);
  const [storedPlayerIdForCountdown, setStoredPlayerIdForCountdown] = useState<string | null>(null);
  
  // Coin acceptor auto-connection states
  const [showCoinAcceptorDialog, setShowCoinAcceptorDialog] = useState(false);
  const [detectedCoinAcceptorId, setDetectedCoinAcceptorId] = useState<string | null>(null);
  const [hasPromptedForCoinAcceptor, setHasPromptedForCoinAcceptor] = useState(false);
  
  // Search state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Insufficient credits dialog
  const [showInsufficientCredits, setShowInsufficientCredits] = useState(false);
  
  // Request submission state
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  
  // Use kiosk credits hook for synchronization
  const {
    mode,
    credits,
    addCredits,
    deductCredits,
    hasSufficientCredits,
  } = useKioskCredits({
    playerId: kioskPlayerId || "",
    enabled: !!kioskPlayerId,
    onCreditsChange: (newCredits) => {
      console.log(`[Kiosk] Credits updated: ${newCredits}`);
    },
    onModeChange: (newMode) => {
      console.log(`[Kiosk] Mode updated: ${newMode}`);
    },
  });
  
  // Serial communication for coin acceptor
  useSerialCommunication({
    mode,
    selectedCoinAcceptor: "usbserial-1420", // Configure coin acceptor for kiosk
    onCreditsChange: (delta) => {
      // When coin is inserted, add credits via the hook
      addCredits(delta).catch(err => {
        console.error("[Kiosk] Failed to add credits:", err);
      });
    },
    credits,
    onAddLog: (type, message) => console.log(`[Kiosk Serial] ${type}: ${message}`),
    coinValueA: 1,
    coinValueB: 1,
  });
  
  // Video search hook with kiosk-specific state adapter
  const {
    performSearch: performVideoSearch,
    handleVideoSelect,
    handleKeyboardInput,
    confirmDialog,
    setConfirmDialog,
    confirmAddToPlaylist,
  } = useVideoSearch(
    // State adapter - map kiosk state to expected structure
    {
      searchQuery,
      searchResults,
      isSearching,
      showKeyboard,
      showSearchResults,
      searchMethod: "scraper", // Use YT-DLP scraper with CORS support
      maxSongLength: 10, // Default max song length (10 minutes)
      priorityQueue: [], // Empty queue - kiosk submits directly to player
    } as any,
    // SetState adapter
    (updater: any) => {
      const currentState = {
        searchQuery,
        searchResults,
        isSearching,
        showKeyboard,
        showSearchResults,
        searchMethod: "scraper",
        maxSongLength: 10,
        priorityQueue: [], // Empty queue - kiosk submits directly to player
      };
      
      const update = typeof updater === 'function' 
        ? updater(currentState)
        : updater;
      
      // Only update if values have actually changed
      if (update.searchQuery !== undefined && update.searchQuery !== searchQuery) {
        setSearchQuery(update.searchQuery);
      }
      if (update.searchResults !== undefined && update.searchResults !== searchResults) {
        console.log("[Kiosk setState] Setting searchResults:", update.searchResults.length, "results");
        setSearchResults(update.searchResults);
      }
      // CRITICAL: Always set isSearching to avoid race conditions with async state updates
      if (update.isSearching !== undefined) {
        console.log("[Kiosk setState] Setting isSearching:", update.isSearching);
        setIsSearching(update.isSearching);
      }
      if (update.showKeyboard !== undefined && update.showKeyboard !== showKeyboard) {
        console.log("[Kiosk setState] Setting showKeyboard:", update.showKeyboard);
        setShowKeyboard(update.showKeyboard);
      }
      if (update.showSearchResults !== undefined && update.showSearchResults !== showSearchResults) {
        console.log("[Kiosk setState] Setting showSearchResults:", update.showSearchResults);
        setShowSearchResults(update.showSearchResults);
      }
    },
    // Logging functions (simplified for kiosk)
    (type: string, message: string) => console.log(`[Kiosk ${type}] ${message}`),
    () => {}, // addUserRequest - not used in kiosk
    () => {}, // addCreditHistory - not used in kiosk
    toast,
    async () => Promise.resolve(), // checkAndRotateIfNeeded - not used in kiosk
  );

  /**
   * Check localStorage for player ID on mount
   */
  useEffect(() => {
    const storedPlayerId = localStorage.getItem('kiosk_player_id');
    
    if (!storedPlayerId || storedPlayerId.trim() === "") {
      // No player ID stored - prompt user immediately
      setIsValidatingPlayer(false);
      setShowPlayerIdDialog(true);
    } else {
      // Player ID exists - show countdown dialog
      setStoredPlayerIdForCountdown(storedPlayerId);
      setShowAutoConnectCountdown(true);
      setIsValidatingPlayer(false);
    }
  }, []);

  /**
   * Countdown timer for auto-connect
   */
  useEffect(() => {
    if (!showAutoConnectCountdown || autoConnectCountdown <= 0) {
      return;
    }

    const timer = setTimeout(() => {
      const newCount = autoConnectCountdown - 1;
      setAutoConnectCountdown(newCount);
      
      if (newCount === 0) {
        // Auto-connect after countdown
        handleAutoConnect();
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [showAutoConnectCountdown, autoConnectCountdown]);

  /**
   * Handle auto-connect after countdown
   */
  const handleAutoConnect = useCallback(() => {
    if (storedPlayerIdForCountdown) {
      setShowAutoConnectCountdown(false);
      setKioskPlayerId(storedPlayerIdForCountdown);
      setIsValidatingPlayer(true);
      validatePlayer(storedPlayerIdForCountdown);
    }
  }, [storedPlayerIdForCountdown]);

  /**
   * Handle cancelling auto-connect (show edit dialog)
   */
  const handleCancelAutoConnect = useCallback(() => {
    setShowAutoConnectCountdown(false);
    setAutoConnectCountdown(5); // Reset for next time
    setNewPlayerId(storedPlayerIdForCountdown || "");
    setShowPlayerIdDialog(true);
  }, [storedPlayerIdForCountdown]);

  /**
   * Validate that the player is active in Supabase
   */
  const validatePlayer = useCallback(async (playerId: string) => {
    setIsValidatingPlayer(true);
    setPlayerValidationError(null);
    
    try {
      console.log(`[Kiosk] Validating player: ${playerId}`);
      
      // Check if player exists and is active
      const { data: player, error } = await supabase
        .from("players")
        .select("*")
        .eq("player_id", playerId)
        .eq("is_active", true)
        .single();

      if (error || !player) {
        console.error("[Kiosk] Player validation failed:", error);
        setPlayerValidationError(
          `Player "${playerId}" not found or inactive. Please ensure the player is running.`
        );
        setIsValidatingPlayer(false);
        return;
      }

      // Check if player was seen recently (within 60 seconds)
      const lastSeen = new Date(player.last_seen);
      const now = new Date();
      const secondsSinceLastSeen = (now.getTime() - lastSeen.getTime()) / 1000;

      if (secondsSinceLastSeen > 60) {
        console.warn(`[Kiosk] Player last seen ${secondsSinceLastSeen}s ago`);
        setPlayerValidationError(
          `Player "${playerId}" not responding (last seen ${Math.round(secondsSinceLastSeen)}s ago). Please check the player.`
        );
        setIsValidatingPlayer(false);
        return;
      }

      console.log(`[Kiosk] Player validated successfully:`, player);
      setIsValidatingPlayer(false);
      setPlayerValidationError(null);
      
      toast({
        title: "Player Connected",
        description: `Connected to ${player.device_name || playerId}`,
      });
      
      // After successful player validation, check for coin acceptor
      checkForCoinAcceptor();
    } catch (err) {
      console.error("[Kiosk] Validation error:", err);
      setPlayerValidationError(
        err instanceof Error ? err.message : "Failed to validate player"
      );
      setIsValidatingPlayer(false);
    }
  }, [toast]);

  /**
   * Check for coin acceptor device after player validation
   */
  const checkForCoinAcceptor = useCallback(async () => {
    // Only check once per session
    if (hasPromptedForCoinAcceptor) {
      return;
    }

    // Check if Web Serial API is supported
    if (!('serial' in navigator)) {
      console.log('[Kiosk] Web Serial API not supported');
      return;
    }

    try {
      console.log('[Kiosk] Checking for coin acceptor devices...');
      
      const ports = await (navigator as any).serial.getPorts();
      let targetPort = null;
      let deviceId = null;

      // Look for usbserial-1420 device
      for (const port of ports) {
        const info = port.getInfo();
        console.log('[Kiosk] Found serial device:', info);
        
        if (info.usbProductId === 1420 || 
            info.serialNumber?.includes('usbserial-1420') ||
            info.usbVendorId === 1420) {
          targetPort = port;
          deviceId = info.serialNumber || `USB-${info.usbVendorId}-${info.usbProductId}`;
          break;
        }
      }

      if (targetPort && deviceId) {
        console.log('[Kiosk] Coin acceptor device detected:', deviceId);
        setDetectedCoinAcceptorId(deviceId);
        setShowCoinAcceptorDialog(true);
        setHasPromptedForCoinAcceptor(true);
      } else {
        console.log('[Kiosk] No coin acceptor device found');
        setHasPromptedForCoinAcceptor(true); // Don't check again this session
      }
    } catch (err) {
      console.error('[Kiosk] Error checking for coin acceptor:', err);
      setHasPromptedForCoinAcceptor(true); // Don't check again this session
    }
  }, [hasPromptedForCoinAcceptor]);

  /**
   * Handle connecting to coin acceptor
   */
  const handleConnectCoinAcceptor = useCallback(() => {
    setShowCoinAcceptorDialog(false);
    toast({
      title: "Coin Acceptor",
      description: "Coin acceptor connection will be handled by the serial communication hook",
    });
  }, [toast]);

  /**
   * Handle declining coin acceptor connection
   */
  const handleDeclineCoinAcceptor = useCallback(() => {
    setShowCoinAcceptorDialog(false);
    console.log('[Kiosk] User declined coin acceptor connection');
  }, []);

  /**
   * Handle saving a new player ID
   */
  const handleSavePlayerId = useCallback(() => {
    if (!newPlayerId || newPlayerId.trim() === "") {
      toast({
        title: "Invalid Player ID",
        description: "Please enter a valid player identifier",
        variant: "destructive",
      });
      return;
    }

    localStorage.setItem('kiosk_player_id', newPlayerId.trim());
    setKioskPlayerId(newPlayerId.trim());
    setShowPlayerIdDialog(false);
    setNewPlayerId("");
    
    // Reload the page to re-validate
    window.location.reload();
  }, [newPlayerId, toast]);

  /**
   * Handle modifying the player ID (show dialog)
   */
  const handleModifyPlayerId = useCallback(() => {
    setNewPlayerId(kioskPlayerId || "");
    setShowPlayerIdDialog(true);
  }, [kioskPlayerId]);

  /**
   * Handle retrying player validation
   */
  const handleRetryValidation = useCallback(() => {
    if (kioskPlayerId) {
      validatePlayer(kioskPlayerId);
    }
  }, [kioskPlayerId, validatePlayer]);

  /**
   * Handle song selection (simplified for MVP - manual input)
   */
  const handleSearchAndSelect = useCallback(async () => {
    const videoId = prompt("Enter YouTube Video ID:");
    if (!videoId) return;
    
    const title = prompt("Enter Song Title:");
    if (!title) return;
    
    const artist = prompt("Enter Artist Name (optional):") || "Unknown Artist";
    
    await handleSongSelect(videoId, title, artist);
  }, []);
  
  /**
   * Handle video selection from search results
   * This will show the confirmation dialog from useVideoSearch
   */
  const handleKioskVideoSelect = useCallback((video: SearchResult) => {
    // Check credits before selection
    if (!hasSufficientCredits(1)) {
      setShowInsufficientCredits(true);
      return;
    }
    
    // Convert SearchResult to match handleVideoSelect's expected type
    const videoForHandler = {
      ...video,
      videoId: video.id, // Map id to videoId for compatibility
    };
    
    // Use handleVideoSelect from useVideoSearch - it will show confirmation dialog
    handleVideoSelect(videoForHandler as any);
  }, [hasSufficientCredits, handleVideoSelect]);

  const handleSongSelect = useCallback(async (
    videoId: string,
    title: string,
    artist: string
  ) => {
    if (!kioskPlayerId) {
      toast({
        title: "No Player Connected",
        description: "Please connect to a player first",
        variant: "destructive",
      });
      return;
    }

    // Check credits in PAID mode - show dialog if insufficient
    if (!hasSufficientCredits(1)) {
      setShowInsufficientCredits(true);
      return;
    }

    setIsSubmittingRequest(true);

    try {
      console.log(`[Kiosk] Submitting request: ${title} (${videoId}) to player ${kioskPlayerId}`);
      
      // Deduct credit BEFORE submitting (so if submission fails, credit is already deducted)
      if (mode === "PAID") {
        await deductCredits(1);
      }
      
      // Submit request via Supabase edge function
      const { data, error } = await supabase.functions.invoke("submit-request", {
        body: {
          player_id: kioskPlayerId,
          video_id: videoId,
          title: title,
          artist: artist,
        },
      });

      if (error) {
        console.error("[Kiosk] Request submission failed:", error);
        
        // Check if player became inactive
        if (error.message?.includes("not found") || error.message?.includes("inactive")) {
          setPlayerValidationError(
            `Player "${kioskPlayerId}" is no longer active. Please check the player.`
          );
        }
        
        toast({
          title: "Request Failed",
          description: error.message || "Failed to submit song request",
          variant: "destructive",
        });
        return;
      }

      console.log("[Kiosk] Request submitted successfully:", data);
      
      // Show success toast
      toast({
        title: "Song Requested!",
        description: `"${title}" has been added to the queue`,
      });

      // Reset search interface - exit search and return to main screen
      setSearchQuery("");
      setSearchResults([]);
      setShowKeyboard(false);
      setShowSearchResults(false);
      setIsSearchOpen(false);
    } catch (err) {
      console.error("[Kiosk] Error submitting request:", err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to submit request",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingRequest(false);
    }
  }, [kioskPlayerId, mode, hasSufficientCredits, deductCredits, toast, setPlayerValidationError]);

  /**
   * Confirm and submit song to player (called after confirmation dialog)
   */
  const handleConfirmAddToPlaylist = useCallback(() => {
    if (!confirmDialog.video) return;
    
    const video = confirmDialog.video;
    
    // Close the confirmation dialog
    setConfirmDialog({ isOpen: false, video: null });
    
    // Submit the song request to the player (use videoId or id)
    const videoId = (video as any).videoId || (video as any).id;
    handleSongSelect(videoId, video.title, video.channelTitle);
  }, [confirmDialog, setConfirmDialog, handleSongSelect]);

  // Show auto-connect countdown dialog
  if (showAutoConnectCountdown) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-amber-500 border-2">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Monitor className="w-16 h-16 mx-auto text-amber-500" />
              <h1 className="text-2xl font-bold text-slate-900">
                Kiosk Auto-Connect
              </h1>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-slate-700 mb-2">
                  Kiosk connecting to Player ID:
                </p>
                <p className="text-2xl font-mono font-bold text-amber-600">
                  {storedPlayerIdForCountdown}
                </p>
              </div>
              
              <div className="text-6xl font-bold text-amber-600">
                {autoConnectCountdown}
              </div>
              
              <p className="text-slate-600">
                Auto-connecting in {autoConnectCountdown} second{autoConnectCountdown !== 1 ? 's' : ''}...
              </p>
              
              <Button
                onClick={handleCancelAutoConnect}
                variant="outline"
                size="lg"
                className="w-full"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Player ID
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show player ID input dialog if no player ID
  if (showPlayerIdDialog) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Monitor className="w-16 h-16 mx-auto text-amber-500" />
              <h1 className="text-2xl font-bold text-slate-900">
                Search Kiosk Setup
              </h1>
              <p className="text-slate-600">
                Enter the Player Identifier to connect this kiosk to a player
              </p>
              
              <div className="space-y-2">
                <label htmlFor="player-id" className="block text-sm font-medium text-slate-700">
                  Player Identifier
                </label>
                <Input
                  id="player-id"
                  value={newPlayerId}
                  onChange={(e) => setNewPlayerId(e.target.value)}
                  placeholder="e.g., default"
                  className="text-center text-lg"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSavePlayerId();
                    }
                  }}
                />
              </div>
              
              <Button
                onClick={handleSavePlayerId}
                className="w-full"
                size="lg"
              >
                Connect to Player
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show validation error if player is invalid
  if (playerValidationError) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-red-500">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <AlertCircle className="w-16 h-16 mx-auto text-red-500" />
              <h1 className="text-2xl font-bold text-slate-900">
                Player Not Active
              </h1>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">
                  {playerValidationError}
                </p>
              </div>
              
              <div className="flex flex-col gap-2">
                <Button
                  onClick={handleRetryValidation}
                  variant="default"
                  size="lg"
                  className="w-full"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
                
                <Button
                  onClick={handleModifyPlayerId}
                  variant="outline"
                  size="lg"
                  className="w-full"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Change Player ID
                </Button>
              </div>
              
              <p className="text-xs text-slate-500">
                Current Player ID: <span className="font-mono font-bold">{kioskPlayerId}</span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show loading while validating
  if (isValidatingPlayer) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Loader2 className="w-16 h-16 mx-auto text-amber-500 animate-spin" />
              <h1 className="text-2xl font-bold text-slate-900">
                Connecting to Player
              </h1>
              <p className="text-slate-600">
                Validating player "{kioskPlayerId}"...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main kiosk interface
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 relative overflow-hidden">
      {/* Header */}
      <div className="relative z-10 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-4xl font-bold text-white mb-2">
              Music Search Kiosk
            </h1>
            <p className="text-slate-400">
              Connected to: <span className="text-amber-500 font-mono">{kioskPlayerId}</span>
            </p>
          </div>
          
          {/* Credits Display */}
          <div className="mb-6">
            <CreditsDisplay 
              credits={credits}
              mode={mode}
            />
          </div>
          
          {/* Search Button - matches Index.tsx */}
          <div className="flex justify-center">
            <SearchButton
              onClick={() => {
                setIsSearchOpen(true);
                setShowKeyboard(true);
                setShowSearchResults(false);
              }}
            />
          </div>
          
          {/* Info Card */}
          <Card className="mt-8 bg-slate-800/50 border-slate-700">
            <CardContent className="pt-6">
              <div className="text-center space-y-2">
                <p className="text-slate-300">
                  {mode === "PAID" 
                    ? "Insert coins to add credits, then search for your favorite songs!"
                    : "Search for your favorite songs - it's free!"}
                </p>
                <p className="text-sm text-slate-400">
                  Your requests will be sent to the main player in real-time
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Search Interface - YT-DLP Scraper with CORS support */}
      <SearchInterface
        isOpen={isSearchOpen}
        onClose={() => {
          console.log("[Kiosk] Search interface closing");
          setIsSearchOpen(false);
          setShowKeyboard(false);
          setShowSearchResults(false);
          setSearchQuery("");
          setSearchResults([]);
        }}
        searchQuery={searchQuery}
        onSearchQueryChange={(query) => {
          console.log("[Kiosk] Search query changed:", query);
          setSearchQuery(query);
        }}
        searchResults={searchResults}
        isSearching={isSearching}
        showKeyboard={showKeyboard}
        showSearchResults={showSearchResults}
        onKeyboardInput={handleKeyboardInput}
        onVideoSelect={handleKioskVideoSelect}
        onBackToSearch={() => {
          console.log("[Kiosk] Back to search pressed");
          setShowSearchResults(false);
          setShowKeyboard(true);
        }}
        mode={mode}
        credits={credits}
        onInsufficientCredits={() => setShowInsufficientCredits(true)}
      />
      
      {/* Player ID Change Dialog */}
      <Dialog open={showPlayerIdDialog && !!kioskPlayerId} onOpenChange={setShowPlayerIdDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Player Identifier</DialogTitle>
            <DialogDescription>
              Enter a new player identifier to connect to a different player
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="new-player-id" className="block text-sm font-medium text-slate-700">
                New Player Identifier
              </label>
              <Input
                id="new-player-id"
                value={newPlayerId}
                onChange={(e) => setNewPlayerId(e.target.value)}
                placeholder={kioskPlayerId || ""}
                autoFocus
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPlayerIdDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePlayerId}>
              Save and Reload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Insufficient Credits Dialog */}
      <InsufficientCreditsDialog
        isOpen={showInsufficientCredits}
        onClose={() => setShowInsufficientCredits(false)}
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
              Confirm adding this song to the player's playlist.
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
                  {mode === "PAID" && (
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
              onClick={handleConfirmAddToPlaylist}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
            >
              <Check className="w-4 h-4" />
              Yes, Add to Playlist
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Coin Acceptor Connection Dialog */}
      <Dialog open={showCoinAcceptorDialog} onOpenChange={setShowCoinAcceptorDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Coin Acceptor Device Available</DialogTitle>
            <DialogDescription>
              A coin acceptor serial device has been detected.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800 mb-2">
                <strong>Device ID:</strong>
              </p>
              <p className="text-lg font-mono text-green-900">
                {detectedCoinAcceptorId}
              </p>
            </div>
            <p className="text-sm text-slate-600 mt-4">
              Do you want to connect this device for accepting coin payments?
            </p>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={handleDeclineCoinAcceptor}>
              No, Skip
            </Button>
            <Button onClick={handleConnectCoinAcceptor}>
              Yes, Connect Device
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
