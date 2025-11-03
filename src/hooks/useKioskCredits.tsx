/**
 * useKioskCredits Hook
 * 
 * Manages credit synchronization between admin console and kiosk for a specific player.
 * - Fetches current mode and credits from Supabase
 * - Listens for real-time updates to credits and mode
 * - Provides functions to update mode and add/deduct credits
 * - Synchronizes with coin acceptor (admin side)
 * 
 * @module hooks/useKioskCredits
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

interface KioskSettings {
  id: string;
  player_id: string;
  mode: "FREEPLAY" | "PAID";
  credits: number;
  updated_at: string;
}

interface UseKioskCreditsOptions {
  /**
   * Unique identifier for this player instance
   */
  playerId: string;
  
  /**
   * Enable/disable the credit synchronization
   */
  enabled?: boolean;
  
  /**
   * Callback when credits change (from any source)
   */
  onCreditsChange?: (credits: number) => void;
  
  /**
   * Callback when mode changes (from any source)
   */
  onModeChange?: (mode: "FREEPLAY" | "PAID") => void;
}

interface UseKioskCreditsReturn {
  /**
   * Current mode (FREEPLAY or PAID)
   */
  mode: "FREEPLAY" | "PAID";
  
  /**
   * Current credit balance
   */
  credits: number;
  
  /**
   * Whether data is loading
   */
  isLoading: boolean;
  
  /**
   * Error message if any
   */
  error: string | null;
  
  /**
   * Update mode (admin only)
   */
  setMode: (mode: "FREEPLAY" | "PAID") => Promise<void>;
  
  /**
   * Set absolute credit value (admin only)
   */
  setCredits: (credits: number) => Promise<void>;
  
  /**
   * Add credits (coin acceptor or manual)
   */
  addCredits: (amount: number) => Promise<void>;
  
  /**
   * Deduct credits (song request)
   */
  deductCredits: (amount: number) => Promise<void>;
  
  /**
   * Check if user has sufficient credits for a song
   */
  hasSufficientCredits: (required: number) => boolean;
}

/**
 * Hook to manage kiosk credit synchronization
 * 
 * @example
 * ```tsx
 * const {
 *   mode,
 *   credits,
 *   setMode,
 *   addCredits,
 *   deductCredits,
 *   hasSufficientCredits
 * } = useKioskCredits({
 *   playerId: "default",
 *   enabled: true,
 *   onCreditsChange: (credits) => console.log("Credits:", credits),
 *   onModeChange: (mode) => console.log("Mode:", mode)
 * });
 * ```
 */
export const useKioskCredits = ({
  playerId,
  enabled = true,
  onCreditsChange,
  onModeChange,
}: UseKioskCreditsOptions): UseKioskCreditsReturn => {
  const [mode, setModeState] = useState<"FREEPLAY" | "PAID">("FREEPLAY");
  const [credits, setCreditsState] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const channelRef = useRef<RealtimeChannel | null>(null);
  const settingsIdRef = useRef<string | null>(null);
  
  // Store callbacks in refs to avoid triggering effects on change
  const onCreditsChangeRef = useRef(onCreditsChange);
  const onModeChangeRef = useRef(onModeChange);
  
  // Update refs when callbacks change
  useEffect(() => {
    onCreditsChangeRef.current = onCreditsChange;
    onModeChangeRef.current = onModeChange;
  }, [onCreditsChange, onModeChange]);

  /**
   * Fetch current kiosk settings from database
   */
  const fetchSettings = useCallback(async () => {
    if (!enabled || !playerId) return;

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("kiosk_settings")
        .select("*")
        .eq("player_id", playerId)
        .single();

      if (fetchError && fetchError.code !== "PGRST116") {
        throw fetchError;
      }

      if (data) {
        settingsIdRef.current = data.id;
        setModeState(data.mode as "FREEPLAY" | "PAID");
        setCreditsState(data.credits);
        onCreditsChangeRef.current?.(data.credits);
        onModeChangeRef.current?.(data.mode as "FREEPLAY" | "PAID");
      } else {
        // Create default settings if none exist
        const { data: newData, error: insertError } = await supabase
          .from("kiosk_settings")
          .insert({
            player_id: playerId,
            mode: "FREEPLAY",
            credits: 0,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        
        if (newData) {
          settingsIdRef.current = newData.id;
          setModeState(newData.mode as "FREEPLAY" | "PAID");
          setCreditsState(newData.credits);
          onCreditsChangeRef.current?.(newData.credits);
          onModeChangeRef.current?.(newData.mode as "FREEPLAY" | "PAID");
        }
      }
    } catch (err) {
      console.error("[KioskCredits] Error fetching settings:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [enabled, playerId]);

  /**
   * Set up real-time subscription for settings changes
   */
  const setupRealtimeSubscription = useCallback(() => {
    if (!enabled || !playerId || channelRef.current) return;

    console.log(`[KioskCredits] Setting up realtime subscription for player: ${playerId}`);

    const channel = supabase
      .channel(`kiosk-settings-${playerId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "kiosk_settings",
          filter: `player_id=eq.${playerId}`,
        },
        (payload) => {
          console.log("[KioskCredits] Settings changed:", payload);
          
          if (payload.eventType === "UPDATE" || payload.eventType === "INSERT") {
            const newSettings = payload.new as KioskSettings;
            setModeState(newSettings.mode);
            setCreditsState(newSettings.credits);
            onCreditsChangeRef.current?.(newSettings.credits);
            onModeChangeRef.current?.(newSettings.mode);
          }
        }
      )
      .subscribe((status) => {
        console.log(`[KioskCredits] Subscription status:`, status);
      });

    channelRef.current = channel;
  }, [enabled, playerId]);

  /**
   * Clean up subscription
   */
  const cleanupSubscription = useCallback(async () => {
    if (channelRef.current) {
      console.log("[KioskCredits] Cleaning up subscription");
      await supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, []);

  /**
   * Update mode
   */
  const setMode = useCallback(async (newMode: "FREEPLAY" | "PAID") => {
    if (!playerId) return;

    try {
      const { error: updateError } = await supabase.functions.invoke("update-kiosk-settings", {
        body: { player_id: playerId, mode: newMode },
      });

      if (updateError) throw updateError;
      
      console.log(`[KioskCredits] Mode updated to ${newMode}`);
    } catch (err) {
      console.error("[KioskCredits] Error updating mode:", err);
      setError(err instanceof Error ? err.message : "Failed to update mode");
      throw err;
    }
  }, [playerId]);

  /**
   * Set absolute credit value
   */
  const setCredits = useCallback(async (newCredits: number) => {
    if (!playerId) return;

    try {
      const { error: updateError } = await supabase.functions.invoke("update-kiosk-settings", {
        body: { player_id: playerId, credits: Math.max(0, newCredits) },
      });

      if (updateError) throw updateError;
      
      console.log(`[KioskCredits] Credits set to ${newCredits}`);
    } catch (err) {
      console.error("[KioskCredits] Error setting credits:", err);
      setError(err instanceof Error ? err.message : "Failed to set credits");
      throw err;
    }
  }, [playerId]);

  /**
   * Add credits
   */
  const addCredits = useCallback(async (amount: number) => {
    if (!playerId || amount <= 0) return;

    try {
      const { error: updateError } = await supabase.functions.invoke("update-kiosk-settings", {
        body: { player_id: playerId, delta_credits: amount },
      });

      if (updateError) throw updateError;
      
      console.log(`[KioskCredits] Added ${amount} credits`);
    } catch (err) {
      console.error("[KioskCredits] Error adding credits:", err);
      setError(err instanceof Error ? err.message : "Failed to add credits");
      throw err;
    }
  }, [playerId]);

  /**
   * Deduct credits
   */
  const deductCredits = useCallback(async (amount: number) => {
    if (!playerId || amount <= 0) return;

    try {
      const { error: updateError } = await supabase.functions.invoke("update-kiosk-settings", {
        body: { player_id: playerId, delta_credits: -amount },
      });

      if (updateError) throw updateError;
      
      console.log(`[KioskCredits] Deducted ${amount} credits`);
    } catch (err) {
      console.error("[KioskCredits] Error deducting credits:", err);
      setError(err instanceof Error ? err.message : "Failed to deduct credits");
      throw err;
    }
  }, [playerId]);

  /**
   * Check if user has sufficient credits
   */
  const hasSufficientCredits = useCallback((required: number) => {
    return mode === "FREEPLAY" || credits >= required;
  }, [mode, credits]);

  /**
   * Initialize: fetch settings and set up subscription
   */
  useEffect(() => {
    if (!enabled || !playerId) {
      setIsLoading(false);
      return;
    }

    // Fetch initial settings
    fetchSettings();

    // Set up realtime subscription
    setupRealtimeSubscription();

    // Cleanup on unmount
    return () => {
      cleanupSubscription();
    };
    // Only depend on enabled and playerId to prevent recursion
    // The callback functions (fetchSettings, setupRealtimeSubscription, cleanupSubscription)
    // are stable and don't need to be in dependencies
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, playerId]);

  return {
    mode,
    credits,
    isLoading,
    error,
    setMode,
    setCredits,
    addCredits,
    deductCredits,
    hasSufficientCredits,
  };
};
