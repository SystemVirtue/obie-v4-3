import { useEffect, useCallback, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { BackgroundQueueItem } from "@/types/jukebox";

// Re-use the BackgroundQueueItem type from jukebox types
type BackgroundAsset = BackgroundQueueItem;

interface BackgroundSettings {
  backgroundType: string;
  backgroundImageUrl?: string;
  backgroundVideoUrl?: string;
  backgroundQueue: BackgroundAsset[];
}

// Publisher mode props (Index page)
interface PublisherModeProps {
  playerIdentifier: string;
  enabled?: boolean;
  backgroundType: string;
  backgroundImageUrl?: string;
  backgroundVideoUrl?: string;
  backgroundQueue: BackgroundAsset[];
  isSubscriber?: false;
}

// Subscriber mode props (Kiosk page)
interface SubscriberModeProps {
  playerIdentifier: string;
  enabled?: boolean;
  isSubscriber: true;
}

type UseBackgroundSyncProps = PublisherModeProps | SubscriberModeProps;

// Return types
type PublisherReturn = {
  syncToSupabase: (settings: BackgroundSettings) => Promise<void>;
};

type SubscriberReturn = BackgroundSettings;

/**
 * Hook to sync background settings between /index and /kiosk via Supabase
 * 
 * Publisher Mode (/index): Uploads settings to Supabase when changed
 * - Pass backgroundType, backgroundImageUrl, etc. as props
 * - Returns { syncToSupabase } function
 * 
 * Subscriber Mode (/kiosk): Receives settings from Supabase
 * - Pass isSubscriber: true
 * - Returns { backgroundType, backgroundImageUrl, backgroundVideoUrl, backgroundQueue }
 */
export function useBackgroundSync(props: PublisherModeProps): PublisherReturn;
export function useBackgroundSync(props: SubscriberModeProps): SubscriberReturn;
export function useBackgroundSync(props: UseBackgroundSyncProps): PublisherReturn | SubscriberReturn {
  const { playerIdentifier, enabled = true, isSubscriber } = props;

  const syncTimeoutRef = useRef<NodeJS.Timeout>();
  const isInitialMount = useRef(true);

  // Subscriber mode: State to hold received settings
  const [subscriberState, setSubscriberState] = useState<BackgroundSettings>({
    backgroundType: "gradient",
    backgroundImageUrl: undefined,
    backgroundVideoUrl: undefined,
    backgroundQueue: [],
  });

  // Upload background settings to Supabase (Publisher mode)
  const syncToSupabase = useCallback(async (settingsToSync: BackgroundSettings) => {
    if (!enabled || !playerIdentifier) return;

    try {
      console.log("[BackgroundSync] Syncing to Supabase:", settingsToSync);

      const { error } = await supabase
        .from("players")
        .update({
          background_type: settingsToSync.backgroundType,
          background_image_url: settingsToSync.backgroundImageUrl || null,
          background_video_url: settingsToSync.backgroundVideoUrl || null,
          background_queue: settingsToSync.backgroundQueue || [],
          background_updated_at: new Date().toISOString(),
        })
        .eq("player_id", playerIdentifier);

      if (error) {
        console.error("[BackgroundSync] Failed to sync to Supabase:", error);
      } else {
        console.log("[BackgroundSync] Background settings synced successfully");
      }
    } catch (err) {
      console.error("[BackgroundSync] Sync error:", err);
    }
  }, [enabled, playerIdentifier]);

  // Debounced sync to avoid too many updates
  const debouncedSync = useCallback((settingsToSync: BackgroundSettings) => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    syncTimeoutRef.current = setTimeout(() => {
      syncToSupabase(settingsToSync);
    }, 1000); // Wait 1 second after last change
  }, [syncToSupabase]);

  // Publisher Mode: Watch for local background changes and sync to Supabase
  useEffect(() => {
    if (isSubscriber || !enabled || isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const publisherProps = props as PublisherModeProps;
    const settings: BackgroundSettings = {
      backgroundType: publisherProps.backgroundType,
      backgroundImageUrl: publisherProps.backgroundImageUrl,
      backgroundVideoUrl: publisherProps.backgroundVideoUrl,
      backgroundQueue: publisherProps.backgroundQueue,
    };

    debouncedSync(settings);
  }, [
    isSubscriber,
    enabled,
    debouncedSync,
    !isSubscriber && (props as PublisherModeProps).backgroundType,
    !isSubscriber && (props as PublisherModeProps).backgroundImageUrl,
    !isSubscriber && (props as PublisherModeProps).backgroundVideoUrl,
    !isSubscriber && JSON.stringify((props as PublisherModeProps).backgroundQueue),
  ]);

  // Subscriber Mode: Subscribe to Supabase changes
  useEffect(() => {
    if (!isSubscriber || !enabled || !playerIdentifier) return;

    console.log("[BackgroundSync] Setting up realtime subscription for player:", playerIdentifier);

    // Fetch initial background settings
    const fetchInitialSettings = async () => {
      try {
        const { data, error } = await supabase
          .from("players")
          .select("background_type, background_image_url, background_video_url, background_queue")
          .eq("player_id", playerIdentifier)
          .single();

        if (error) {
          console.error("[BackgroundSync] Failed to fetch initial settings:", error);
          return;
        }

        if (data) {
          console.log("[BackgroundSync] Loaded initial background settings:", data);
          setSubscriberState({
            backgroundType: (data as any).background_type || "gradient",
            backgroundImageUrl: (data as any).background_image_url || undefined,
            backgroundVideoUrl: (data as any).background_video_url || undefined,
            backgroundQueue: ((data as any).background_queue as BackgroundAsset[]) || [],
          });
        }
      } catch (err) {
        console.error("[BackgroundSync] Error fetching initial settings:", err);
      }
    };

    fetchInitialSettings();

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`background-${playerIdentifier}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "players",
          filter: `player_id=eq.${playerIdentifier}`,
        },
        (payload) => {
          console.log("[BackgroundSync] Received background update:", payload.new);

          const update = payload.new as any;

          setSubscriberState({
            backgroundType: update.background_type || "gradient",
            backgroundImageUrl: update.background_image_url || undefined,
            backgroundVideoUrl: update.background_video_url || undefined,
            backgroundQueue: (update.background_queue as BackgroundAsset[]) || [],
          });
        }
      )
      .subscribe();

    return () => {
      console.log("[BackgroundSync] Cleaning up subscription");
      channel.unsubscribe();
    };
  }, [isSubscriber, enabled, playerIdentifier]);

  // Cleanup debounce timeout on unmount
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []);

  // Return appropriate values based on mode
  if (isSubscriber) {
    return subscriberState as SubscriberReturn;
  }
  
  return { syncToSupabase } as PublisherReturn;
}
