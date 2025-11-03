/**
 * useKioskRequests Hook
 * 
 * Manages player registration with Supabase and listens for incoming kiosk requests.
 * - Registers player on mount with PLAYER_IDENTIFIER
 * - Sends heartbeat every 20 seconds
 * - Subscribes to real-time song requests
 * - Automatically plays songs when requests arrive
 * 
 * @module hooks/useKioskRequests
 */

import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

interface UseKioskRequestsOptions {
  /**
   * Unique identifier for this player instance
   */
  playerId: string;
  
  /**
   * Function to call when a song request is received
   * @param videoId - YouTube video ID to play
   * @param title - Song title
   * @param artist - Artist name
   */
  onSongRequest: (videoId: string, title: string, artist: string) => void;
  
  /**
   * Optional device name for this player
   */
  deviceName?: string;
  
  /**
   * Enable/disable the kiosk request system
   */
  enabled?: boolean;
}

interface UseKioskRequestsReturn {
  /**
   * Whether the player is registered and active
   */
  isRegistered: boolean;
  
  /**
   * Last time player sent heartbeat
   */
  lastHeartbeat: Date | null;
  
  /**
   * Error message if registration failed
   */
  error: string | null;
}

/**
 * Hook to handle player registration and kiosk requests
 * 
 * @example
 * ```tsx
 * const { isRegistered, lastHeartbeat } = useKioskRequests({
 *   playerId: "MAIN_PLAYER",
 *   onSongRequest: (videoId, title, artist) => {
 *     playSong(videoId, title, artist, "USER_SELECTION");
 *   },
 *   enabled: true
 * });
 * ```
 */
export const useKioskRequests = ({
  playerId,
  onSongRequest,
  deviceName,
  enabled = true,
}: UseKioskRequestsOptions): UseKioskRequestsReturn => {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isRegisteredRef = useRef(false);
  const lastHeartbeatRef = useRef<Date | null>(null);
  const errorRef = useRef<string | null>(null);
  
  // Store callback in ref to avoid triggering effects on change
  const onSongRequestRef = useRef(onSongRequest);
  
  // Update ref when callback changes
  useEffect(() => {
    onSongRequestRef.current = onSongRequest;
  }, [onSongRequest]);

  /**
   * Register or update player with Supabase
   */
  const registerPlayer = useCallback(async () => {
    if (!enabled || !playerId) return;

    try {
      console.log(`[KioskRequests] Registering player: ${playerId}`);
      
      const { data, error } = await supabase.functions.invoke("register-player", {
        body: {
          player_id: playerId,
          device_name: deviceName || `Player ${playerId}`,
        },
      });

      if (error) {
        console.error("[KioskRequests] Registration failed:", error);
        errorRef.current = error.message;
        isRegisteredRef.current = false;
        return;
      }

      console.log(`[KioskRequests] Player registered:`, data);
      isRegisteredRef.current = true;
      lastHeartbeatRef.current = new Date();
      errorRef.current = null;
    } catch (err) {
      console.error("[KioskRequests] Registration error:", err);
      errorRef.current = err instanceof Error ? err.message : "Unknown error";
      isRegisteredRef.current = false;
    }
  }, [enabled, playerId, deviceName]);

  /**
   * Mark a request as processed in the database
   */
  const markRequestProcessed = useCallback(async (requestId: string) => {
    try {
      const { error } = await supabase
        .from("song_requests")
        .update({
          status: "processed",
          processed_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (error) {
        console.error("[KioskRequests] Failed to mark request as processed:", error);
      } else {
        console.log(`[KioskRequests] Request ${requestId} marked as processed`);
      }
    } catch (err) {
      console.error("[KioskRequests] Error marking request as processed:", err);
    }
  }, []);

  /**
   * Set up real-time subscription for song requests
   */
  const setupRealtimeSubscription = useCallback(() => {
    if (!enabled || !playerId || channelRef.current) return;

    console.log(`[KioskRequests] Setting up realtime subscription for player: ${playerId}`);

    const channel = supabase
      .channel(`song-requests-${playerId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "song_requests",
          filter: `player_id=eq.${playerId}`,
        },
        (payload) => {
          console.log("[KioskRequests] New request received:", payload.new);
          
          const { video_id, title, artist, id: request_id } = payload.new as {
            video_id: string;
            title: string;
            artist: string;
            id: string;
          };

          // Call the song request handler using ref to avoid subscription recreation
          onSongRequestRef.current(video_id, title || "Unknown Title", artist || "Unknown Artist");

          // Mark as processed
          markRequestProcessed(request_id);
        }
      )
      .subscribe((status) => {
        console.log(`[KioskRequests] Subscription status:`, status);
      });

    channelRef.current = channel;
  }, [enabled, playerId, markRequestProcessed]);

  /**
   * Clean up subscription
   */
  const cleanupSubscription = useCallback(async () => {
    if (channelRef.current) {
      console.log("[KioskRequests] Cleaning up subscription");
      await supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, []);

  /**
   * Initialize player registration and subscription
   */
  useEffect(() => {
    if (!enabled) {
      console.log("[KioskRequests] Kiosk requests disabled");
      return;
    }

    if (!playerId || playerId.trim() === "") {
      console.warn("[KioskRequests] No player ID provided");
      return;
    }

    // Initial registration
    registerPlayer();

    // Set up realtime subscription
    setupRealtimeSubscription();

    // Set up heartbeat (every 20 seconds)
    heartbeatIntervalRef.current = setInterval(() => {
      console.log("[KioskRequests] Sending heartbeat...");
      registerPlayer();
    }, 20000);

    // Cleanup on unmount
    return () => {
      console.log("[KioskRequests] Cleaning up...");
      
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      
      cleanupSubscription();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, playerId]); // registerPlayer, setupRealtimeSubscription, cleanupSubscription are stable now

  return {
    isRegistered: isRegisteredRef.current,
    lastHeartbeat: lastHeartbeatRef.current,
    error: errorRef.current,
  };
};
