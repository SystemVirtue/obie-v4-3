# How /index Receives Kiosk Requests

## 🎯 Summary

**Date:** 3 November 2025  
**Method:** **REAL-TIME PUSH via Supabase Realtime**

The `/index` page receives kiosk song requests through **Supabase Realtime subscriptions** - NOT polling. This is a push-based, event-driven architecture that provides instant notification when a song request is submitted.

---

## Architecture Overview

```
┌─────────────┐                    ┌──────────────┐                    ┌─────────────┐
│   Kiosk     │                    │   Supabase   │                    │    Index    │
│  /kiosk     │                    │   Database   │                    │   /index    │
└─────────────┘                    └──────────────┘                    └─────────────┘
      │                                    │                                    │
      │ 1. User selects song               │                                    │
      │    and confirms                    │                                    │
      │                                    │                                    │
      │ 2. POST to Edge Function           │                                    │
      │    submit-request                  │                                    │
      │───────────────────────────────────>│                                    │
      │                                    │                                    │
      │                                    │ 3. INSERT into song_requests       │
      │                                    │    table                           │
      │                                    │                                    │
      │                                    │ 4. Supabase Realtime broadcasts    │
      │                                    │    INSERT event to subscribers     │
      │                                    │───────────────────────────────────>│
      │                                    │                                    │
      │                                    │                                    │ 5. onSongRequest()
      │                                    │                                    │    callback fires
      │                                    │                                    │
      │                                    │ 6. UPDATE request status           │
      │                                    │<───────────────────────────────────│
      │                                    │    to 'processed'                  │
      │                                    │                                    │
```

---

## Component Breakdown

### 1. Kiosk Submission Flow

**File:** `src/pages/SearchKiosk.tsx` (line 337)

When user confirms song selection:

```typescript
const handleSongSelect = useCallback(async (
  videoId: string,
  title: string,
  artist: string
) => {
  console.log(`[Kiosk] Submitting request: ${title} (${videoId}) to player ${kioskPlayerId}`);
  
  // Call Supabase Edge Function to submit request
  const { data, error } = await supabase.functions.invoke('submit-request', {
    body: {
      player_id: kioskPlayerId,
      video_id: videoId,
      title,
      artist,
    }
  });
  
  if (error) {
    console.error("[Kiosk] Submit request error:", error);
    toast({
      title: "Request Failed",
      description: error.message,
      variant: "destructive",
    });
    return;
  }
  
  console.log("[Kiosk] Request submitted successfully:", data);
  // ... deduct credits, show success toast
}, [kioskPlayerId, mode, credits, decrementCredits, toast]);
```

**What happens:**
- Calls `submit-request` Edge Function
- Passes: `player_id`, `video_id`, `title`, `artist`
- Edge Function validates and inserts into database

---

### 2. Edge Function (Submit Request)

**File:** `supabase/functions/submit-request/index.ts`

```typescript
serve(async (req) => {
  const { player_id, video_id, title, artist } = await req.json();
  
  // 1. Validate player exists and is active
  const { data: player } = await supabaseClient
    .from("players")
    .select("*")
    .eq("player_id", player_id)
    .eq("is_active", true)
    .single();
  
  // 2. Check player was seen recently (< 60 seconds)
  const secondsSinceLastSeen = (now - lastSeen) / 1000;
  if (secondsSinceLastSeen > 60) {
    return error("Player not responding");
  }
  
  // 3. Insert song request into database
  const { data: request } = await supabaseClient
    .from("song_requests")
    .insert({
      player_id,
      video_id,
      title: title || "Unknown Title",
      artist: artist || "Unknown Artist",
      status: "pending", // Default status
    })
    .select()
    .single();
  
  return { success: true, request };
});
```

**Key Points:**
- ✅ Validates player is active
- ✅ Checks player heartbeat (< 60 seconds)
- ✅ Inserts into `song_requests` table
- ✅ Returns immediately (no waiting for player)

---

### 3. Supabase Realtime Broadcast

**How it works:**

When a row is **INSERT**ed into `song_requests` table:
1. Supabase Realtime detects the database change
2. Broadcasts to all subscribers listening to that channel
3. Filters by `player_id` so only the correct player receives it

**No polling required** - the database pushes the event!

---

### 4. Index Page Subscription

**File:** `src/hooks/useKioskRequests.tsx` (line 150)

The `/index` page subscribes to real-time events:

```typescript
const setupRealtimeSubscription = useCallback(() => {
  console.log(`[KioskRequests] Setting up realtime subscription for player: ${playerId}`);
  
  const channel = supabase
    .channel(`song-requests-${playerId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",          // ← Listen for new rows
        schema: "public",
        table: "song_requests",   // ← From this table
        filter: `player_id=eq.${playerId}`, // ← Only for THIS player
      },
      (payload) => {
        // 🎉 INSTANT NOTIFICATION when song request arrives!
        console.log("[KioskRequests] New request received:", payload.new);
        
        const { video_id, title, artist, id: request_id } = payload.new;
        
        // Call the song request handler
        onSongRequest(video_id, title, artist);
        
        // Mark as processed in database
        markRequestProcessed(request_id);
      }
    )
    .subscribe((status) => {
      console.log(`[KioskRequests] Subscription status:`, status);
    });
  
  channelRef.current = channel;
}, [playerId, onSongRequest]);
```

**Key Features:**
- ✅ **Real-time** - instant push notification (< 1 second latency)
- ✅ **Filtered** - only receives requests for this player
- ✅ **Event-driven** - no polling, no wasted requests
- ✅ **Automatic** - subscription maintained via WebSocket

---

### 5. Index Page Handler

**File:** `src/pages/Index.tsx` (line 412)

When a request arrives, the callback fires:

```typescript
useKioskRequests({
  playerId: state.playerIdentifier,  // e.g., "default"
  onSongRequest: (videoId, title, artist) => {
    console.log(`[Kiosk] Received song request: ${title} (${videoId})`);
    
    // Add to playlist using existing mechanism
    handleVideoSelect({
      videoId,
      title,
      channelTitle: artist || "Unknown Artist",
      thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/default.jpg`,
      duration: "0:00", // Duration unknown from kiosk
    });
    
    // Show toast notification
    toast({
      title: "Kiosk Request Received",
      description: `"${title}" by ${artist}`,
    });
  },
  enabled: true
});
```

**What happens:**
1. `onSongRequest()` callback fires **immediately** when INSERT occurs
2. Calls `handleVideoSelect()` - same as if user clicked a video
3. Opens confirmation dialog (if not auto-added)
4. Shows toast notification
5. Request is marked as "processed" in database

---

## Database Tables

### `players` Table

```sql
CREATE TABLE public.players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id TEXT UNIQUE NOT NULL,      -- e.g., "default"
  is_active BOOLEAN DEFAULT true,
  last_seen TIMESTAMPTZ DEFAULT now(),  -- Updated by heartbeat
  device_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Purpose:** Track active players that can receive requests

**Heartbeat:**
- Every 20 seconds, `/index` sends heartbeat via `register-player` Edge Function
- Updates `last_seen` timestamp
- Kiosk checks this to ensure player is online before submitting

---

### `song_requests` Table

```sql
CREATE TABLE public.song_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id TEXT NOT NULL,             -- e.g., "default"
  video_id TEXT NOT NULL,              -- YouTube video ID
  title TEXT,
  artist TEXT,
  status TEXT DEFAULT 'pending'        -- 'pending', 'processed', 'rejected'
    CHECK (status IN ('pending', 'processed', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ,
  CONSTRAINT fk_player FOREIGN KEY (player_id) 
    REFERENCES public.players(player_id) ON DELETE CASCADE
);
```

**Purpose:** Store song requests from kiosk

**Lifecycle:**
1. **INSERT** - Kiosk submits request (status: 'pending')
2. **Realtime event** - Player receives notification instantly
3. **UPDATE** - Player marks as 'processed' and sets `processed_at`

---

## Realtime vs Polling

### Why Realtime is Better

| Feature | Realtime (Current) | Polling (Alternative) |
|---------|-------------------|----------------------|
| **Latency** | < 1 second | 5-30 seconds |
| **Bandwidth** | Minimal (WebSocket) | High (repeated queries) |
| **Database Load** | Low (1 subscription) | High (constant SELECT) |
| **Scalability** | Excellent | Poor |
| **Battery/CPU** | Low (idle until event) | High (continuous polling) |
| **Implementation** | Complex initially | Simple but inefficient |

### Realtime Benefits
✅ **Instant delivery** - song plays immediately  
✅ **Low overhead** - WebSocket stays open, no repeated requests  
✅ **Scalable** - handles many kiosks without database strain  
✅ **Battery-friendly** - no continuous polling  
✅ **Event-driven** - react only when needed  

---

## Request Flow Timeline

### Example: User selects "Annie Lennox - Why"

**T=0ms** - User confirms selection on kiosk
```
[Kiosk] Submitting request: Annie Lennox - Why (HG7I4oniOyA) to player default
```

**T=50ms** - Edge Function validates and inserts
```
[Edge Function] Player 'default' is active (last seen 5s ago)
[Edge Function] Inserting request into song_requests table
```

**T=100ms** - Database INSERT completes
```
Database: INSERT INTO song_requests VALUES (...)
```

**T=150ms** - Supabase Realtime broadcasts event
```
Realtime: Broadcasting INSERT event to channel 'song-requests-default'
```

**T=200ms** - Index page receives event via WebSocket
```
[KioskRequests] New request received: {video_id: "HG7I4oniOyA", title: "Annie Lennox - Why", ...}
```

**T=250ms** - Callback fires, adds to queue
```
[Kiosk] Received song request: Annie Lennox - Why (HG7I4oniOyA)
handleVideoSelect() called
Confirmation dialog opens
```

**T=300ms** - Request marked as processed
```
[KioskRequests] Request abc-123-def marked as processed
Database: UPDATE song_requests SET status='processed' WHERE id='abc-123-def'
```

**Total time: ~300ms from submission to notification** 🚀

---

## Player Registration & Heartbeat

### Initial Registration

**File:** `src/hooks/useKioskRequests.tsx` (line 88)

When `/index` loads:

```typescript
const registerPlayer = useCallback(async () => {
  const { data } = await supabase.functions.invoke("register-player", {
    body: {
      player_id: playerId,            // e.g., "default"
      device_name: deviceName,        // e.g., "Player default"
    },
  });
  
  console.log(`[KioskRequests] Player registered:`, data);
}, [playerId, deviceName]);
```

**Edge Function:** `register-player`
- Upserts into `players` table
- Sets `is_active = true`
- Updates `last_seen = now()`

---

### Heartbeat (Every 20 Seconds)

**File:** `src/hooks/useKioskRequests.tsx` (line 200)

```typescript
useEffect(() => {
  // Register immediately
  registerPlayer();
  
  // Setup realtime subscription
  setupRealtimeSubscription();
  
  // Send heartbeat every 20 seconds
  heartbeatIntervalRef.current = setInterval(() => {
    console.log("[KioskRequests] Sending heartbeat");
    registerPlayer();  // Updates last_seen timestamp
  }, 20000);  // 20 seconds
  
  return () => {
    // Cleanup on unmount
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
    cleanupSubscription();
  };
}, []);
```

**Why heartbeat?**
- Keeps `last_seen` timestamp fresh
- Kiosk checks this before submitting (< 60 seconds)
- Prevents requests to offline/disconnected players

---

## Error Handling

### Player Not Found
```typescript
// submit-request Edge Function
if (!player || !player.is_active) {
  return error("Player not found or inactive");
}
```
**Kiosk shows:** "No Player Connected"

---

### Player Not Responding
```typescript
// submit-request Edge Function
if (secondsSinceLastSeen > 60) {
  return error("Player not responding (last seen > 60 seconds ago)");
}
```
**Kiosk shows:** "Player not responding"

---

### Request Failed
```typescript
// Kiosk handles error
if (error) {
  toast({
    title: "Request Failed",
    description: error.message,
    variant: "destructive",
  });
}
```

---

## Console Output Examples

### Successful Request (Kiosk Side)

```
[Kiosk] Submitting request: Annie Lennox - Why (HG7I4oniOyA) to player default
[Kiosk] Request submitted successfully: {success: true, request: {...}}
Toast: "Song Requested!" ✅
```

---

### Successful Receipt (Index Side)

```
[KioskRequests] New request received: {
  id: "abc-123-def",
  player_id: "default",
  video_id: "HG7I4oniOyA",
  title: "Annie Lennox - Why",
  artist: "Annie Lennox",
  status: "pending",
  created_at: "2025-11-03T12:34:56Z"
}
[Kiosk] Received song request: Annie Lennox - Why (HG7I4oniOyA)
handleVideoSelect() called with video
[KioskRequests] Request abc-123-def marked as processed
Toast: "Kiosk Request Received" - "Annie Lennox - Why" by Annie Lennox ✅
```

---

## Summary

### How /index Receives Requests

✅ **Method:** Real-time push via Supabase Realtime (WebSocket)  
✅ **Latency:** < 1 second (typically ~200-300ms)  
✅ **Polling:** NOT USED - event-driven architecture  
✅ **Scalability:** Excellent - WebSocket-based  
✅ **Database Load:** Minimal - single subscription per player  

### Key Technologies

- **Supabase Realtime** - WebSocket-based push notifications
- **postgres_changes** - Database change events
- **Edge Functions** - Serverless request validation and submission
- **Row Level Security** - Secure player/request access
- **Heartbeat System** - Player online/offline detection

### Request Flow Summary

1. Kiosk → `submit-request` Edge Function
2. Edge Function → INSERT into `song_requests` table
3. Supabase Realtime → Broadcasts INSERT event
4. Index subscription → Receives event (< 1 second)
5. Index → Calls `onSongRequest()` callback
6. Index → Adds to playlist, shows toast
7. Index → Marks request as 'processed'

**Total time: ~300ms from submission to playlist** 🚀

---

**Status:** ✅ FULLY DOCUMENTED  
**Architecture:** Push-based, event-driven, real-time  
**Performance:** Excellent (< 1 second latency)
