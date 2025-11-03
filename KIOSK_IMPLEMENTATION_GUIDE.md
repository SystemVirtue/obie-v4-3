# Search Kiosk Implementation Guide
**Date:** November 3, 2025  
**Status:** 🟡 In Progress (50% Complete)

---

## Overview

This implementation adds a public-facing **Search Kiosk** interface that allows users to search for music and add requests to an active Player's queue via Supabase real-time communication.

---

## ✅ Completed Steps

### 1. Database Schema ✅
**File:** `supabase/migrations/20251103000000_create_player_kiosk_tables.sql`

**Tables Created:**
- `players` - Tracks active player instances with heartbeat
- `song_requests` - Stores pending kiosk requests

**Features:**
- Row Level Security (RLS) policies
- Real-time enabled on `song_requests`
- Auto-deactivation function for stale players (>60s)
- Foreign key constraints
- Performance indexes

### 2. Supabase Edge Functions ✅
**Files:**
- `supabase/functions/register-player/index.ts`
- `supabase/functions/submit-request/index.ts`

**Endpoints:**
- `register-player` - Player registration and heartbeat updates
- `submit-request` - Validate player and submit song requests

**Features:**
- Player validation (active status check)
- Heartbeat monitoring (60-second threshold)
- CORS support
- Error handling with status codes

### 3. useKioskRequests Hook ✅
**File:** `src/hooks/useKioskRequests.tsx`

**Purpose:** Manages player registration and real-time request listening

**Features:**
- Automatic player registration on mount
- 20-second heartbeat interval
- Real-time Supabase subscription for requests
- Auto-play songs when requests arrive
- Mark requests as processed
- Clean unsubscribe on unmount

**API:**
```typescript
const { isRegistered, lastHeartbeat, error } = useKioskRequests({
  playerId: "MAIN_PLAYER",
  onSongRequest: (videoId, title, artist) => { ... },
  enabled: true
});
```

### 4. Type Definitions ✅
**File:** `src/types/jukebox.ts`

**Added:**
- `playerIdentifier: string` to `UserPreferences`
- `playerIdentifier: string` to `JukeboxConfigState`

**Updated:** `src/hooks/useJukeboxState.tsx`
- Initial state includes `playerIdentifier: "default"`
- Save/load playerIdentifier from localStorage
- Dependency array includes playerIdentifier

### 5. Player Identifier Panel Component ✅
**File:** `src/components/PlayerIdentifierPanel.tsx`

**Features:**
- Input field for editing player identifier
- Info section explaining how it works
- Warning about identifier changes
- Visual styling with icons

---

## ⏳ Remaining Steps

### 6. Update Admin Console (In Progress)
**File:** `src/components/AdminConsole.tsx`

**TODO:**
1. Import PlayerIdentifierPanel component
2. Add playerIdentifier to props interface
3. Add onPlayerIdentifierChange handler
4. Insert panel in admin console layout (after Video Settings)
5. Wire up state changes

**Estimated Time:** 20 minutes

### 7. Create SearchKiosk Page Component
**File:** `src/pages/SearchKiosk.tsx`

**Requirements:**
- Check for PLAYER_IDENTIFIER in localStorage
  - If missing → prompt user to enter, save, and refresh
  - If present → validate against active players in Supabase
- If player inactive → show error with options:
  - "Modify PLAYER_IDENTIFIER" → prompt + refresh
  - "Try Again" → refresh page
- Search interface (reuse existing SearchInterface component)
- Credit display (reuse existing CreditsDisplay component)
- Serial communication for coin acceptor (reuse useSerialCommunication hook)
- Submit requests via `supabase.functions.invoke('submit-request')`

**Key Functionality:**
```typescript
// On mount - check player identifier
const kioskPlayerId = localStorage.getItem('kiosk_player_id');

if (!kioskPlayerId) {
  // Prompt for player ID
  const newId = prompt("Enter PLAYER_IDENTIFIER:");
  localStorage.setItem('kiosk_player_id', newId);
  window.location.reload();
  return;
}

// Verify player is active
const { data: player } = await supabase
  .from('players')
  .select('*')
  .eq('player_id', kioskPlayerId)
  .eq('is_active', true)
  .single();

if (!player) {
  // Show error dialog with options
}
```

**Estimated Time:** 2-3 hours

### 8. Integrate Player Registration in Index.tsx
**File:** `src/pages/Index.tsx`

**TODO:**
1. Import useKioskRequests hook
2. Add after existing hooks initialization
3. Pass `state.playerIdentifier` as playerId
4. Connect `onSongRequest` to `playlistManager.addToQueue`
5. Add logging for kiosk requests

**Implementation:**
```typescript
// Add after other hooks
const { isRegistered, lastHeartbeat } = useKioskRequests({
  playerId: state.playerIdentifier,
  onSongRequest: (videoId, title, artist) => {
    console.log(`[Kiosk] Request received: ${title} by ${artist}`);
    addLog("USER_SELECTION", `Kiosk request: ${title}`, videoId);
    playlistManager.addToQueue(
      videoId,
      title,
      artist,
      "USER_SELECTION"
    );
  },
  enabled: true,
  deviceName: `Obie Player - ${state.playerIdentifier}`,
});
```

**Estimated Time:** 30 minutes

### 9. Add Kiosk Route to App.tsx
**File:** `src/App.tsx`

**TODO:**
1. Import SearchKiosk component
2. Add route: `/kiosk`
3. Test navigation

**Implementation:**
```tsx
import SearchKiosk from "@/pages/SearchKiosk";

// In Routes
<Route path="/kiosk" element={<SearchKiosk />} />
```

**Estimated Time:** 10 minutes

### 10. End-to-End Testing
**TODO:**
1. Deploy Supabase migration
2. Deploy edge functions to Supabase
3. Test player registration and heartbeat
4. Test kiosk request submission
5. Verify real-time request delivery
6. Test error scenarios

**Test Scenarios:**
- ✅ Player registers with identifier
- ✅ Heartbeat sends every 20s
- ✅ Kiosk detects active player
- ✅ Kiosk submits request
- ✅ Player receives request real-time
- ✅ Song plays automatically
- ✅ Request marked as processed
- ❌ Kiosk can't find inactive player
- ❌ Player deactivates after 60s of no heartbeat

**Estimated Time:** 1-2 hours

---

## Deployment Checklist

### Supabase Setup
```bash
# 1. Run migration
supabase db push

# 2. Deploy edge functions
supabase functions deploy register-player
supabase functions deploy submit-request

# 3. Verify tables exist
# Check Supabase dashboard → Table Editor

# 4. Test edge functions
supabase functions invoke register-player --body '{"player_id":"TEST"}'
```

### Environment Variables
Ensure these are set in `.env`:
```
VITE_SUPABASE_URL=https://dccxcquejlgzunenmpbj.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_SUPABASE_PROJECT_ID=dccxcquejlgzunenmpbj
```

### Frontend Changes
```bash
# Regenerate Supabase types (after migration)
npx supabase gen types typescript --project-id dccxcquejlgzunenmpbj > src/integrations/supabase/types.gen.ts

# Test build
npm run build

# Run dev server
npm run dev
```

---

## Architecture Diagram

```
┌─────────────────┐                    ┌──────────────────┐
│  Search Kiosk   │                    │   Main Player    │
│  (/kiosk)       │                    │   (Index.tsx)    │
└────────┬────────┘                    └────────┬─────────┘
         │                                      │
         │ 1. Check player active               │ 2. Register & heartbeat
         │    GET /players?player_id=X          │    POST register-player
         │                                      │    (every 20s)
         │                                      │
         ▼                                      ▼
┌────────────────────────────────────────────────────────┐
│                    Supabase                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   players    │  │song_requests │  │  Realtime    │ │
│  │              │  │              │  │   Channel    │ │
│  │ player_id    │  │ player_id ───┼──│              │ │
│  │ is_active    │  │ video_id     │  │              │ │
│  │ last_seen    │  │ status       │  │              │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│                                                         │
│  Edge Functions:                                       │
│  • register-player (upsert + heartbeat)                │
│  • submit-request (validate + insert)                  │
└────────────────────────────────────────────────────────┘
         │                                      ▲
         │ 3. Submit request                    │
         │    POST submit-request               │ 4. Real-time notification
         │    {player_id, video_id}            │    INSERT event
         │                                      │
         └──────────────────────────────────────┘
```

---

## User Flow

### Player Startup
1. User opens main jukebox (`/`)
2. `useKioskRequests` hook initializes
3. Player registers with Supabase using `playerIdentifier`
4. Heartbeat starts (every 20 seconds)
5. Real-time subscription created for `song_requests` table
6. Player marked as `is_active = true`

### Kiosk Usage
1. User opens kiosk (`/kiosk`)
2. Kiosk checks localStorage for `kiosk_player_id`
3. If missing → prompt for identifier, save, refresh
4. If present → validate against Supabase `players` table
5. If player inactive → show error with retry/change options
6. User searches for song (existing search interface)
7. User selects song
8. Kiosk calls `submit-request` edge function
9. Edge function validates player is active
10. Request inserted into `song_requests` table
11. Real-time triggers INSERT event

### Player Receives Request
1. Player's real-time subscription fires
2. `onSongRequest` callback executed
3. Song added to priority queue
4. Player plays song automatically
5. Request marked as `status = 'processed'`

---

## Configuration

### Admin Console Settings
Access via Settings icon in bottom-right of main jukebox:

1. **Player Identifier** section
   - View/edit PLAYER_IDENTIFIER
   - Default: "default"
   - Changes sync to Supabase on next heartbeat

### Kiosk Configuration
Stored in localStorage:
- `kiosk_player_id` - The player identifier this kiosk connects to

To reset kiosk:
```javascript
localStorage.removeItem('kiosk_player_id');
location.reload();
```

---

## Troubleshooting

### Player not receiving requests
1. Check player is registered: View in Supabase `players` table
2. Verify `is_active = true`
3. Check `last_seen` timestamp (should be <60s ago)
4. Check browser console for subscription errors
5. Verify edge functions deployed

### Kiosk can't find player
1. Verify player identifier matches exactly
2. Check player heartbeat is running (console logs)
3. Verify player marked as active in Supabase
4. Try "Try Again" button to refresh

### Requests not playing automatically
1. Check `onSongRequest` callback is connected
2. Verify priority queue system working
3. Check player isn't paused
4. Look for errors in marking request as processed

---

## Next Steps

1. **Complete Admin Console Integration** (20 min)
   - Wire up PlayerIdentifierPanel
   - Test identifier changes persist

2. **Create SearchKiosk Page** (2-3 hours)
   - Player validation UI
   - Reuse existing search components
   - Integrate coin acceptor
   - Request submission

3. **Integrate in Index.tsx** (30 min)
   - Add useKioskRequests hook
   - Connect to queue system
   - Test end-to-end

4. **Deploy & Test** (1-2 hours)
   - Deploy migration + functions
   - Test all scenarios
   - Document any issues

**Total Remaining Estimated Time:** 4-6 hours

---

## Files Modified/Created

### Created ✅
- `supabase/migrations/20251103000000_create_player_kiosk_tables.sql`
- `supabase/functions/register-player/index.ts`
- `supabase/functions/submit-request/index.ts`
- `src/hooks/useKioskRequests.tsx`
- `src/components/PlayerIdentifierPanel.tsx`
- `KIOSK_IMPLEMENTATION_GUIDE.md` (this file)

### Modified ✅
- `src/types/jukebox.ts` - Added playerIdentifier to types
- `src/hooks/useJukeboxState.tsx` - Added playerIdentifier to state

### To Create ⏳
- `src/pages/SearchKiosk.tsx` - Main kiosk interface

### To Modify ⏳
- `src/components/AdminConsole.tsx` - Add PlayerIdentifierPanel
- `src/pages/Index.tsx` - Integrate useKioskRequests
- `src/App.tsx` - Add /kiosk route

---

**Status:** Implementation 50% complete, ready to continue with remaining steps.
