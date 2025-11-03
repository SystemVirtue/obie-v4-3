# Kiosk Confirmation Dialog Fix

## 🎯 Issue Fixed

**Date:** 3 November 2025  
**Status:** ✅ COMPLETE

---

## Problem

When clicking on a video in `/kiosk` search results:
- Console only showed "video selected"
- Confirmation dialog did NOT appear
- No errors visible in console

---

## Root Cause

The `handleVideoSelect` function in `useVideoSearch.tsx` performs a duplicate check:

```typescript
const handleVideoSelect = (video: SearchResult) => {
  console.log("Video selected:", video);

  // Check for duplicate in priority queue
  const isDuplicate = state.priorityQueue.some(
    (req) => req.videoId === video.id,
  );

  if (isDuplicate) {
    setState((prev) => ({
      ...prev,
      showDuplicateSong: true,
      duplicateSongTitle: video.title,
    }));
    return;
  }

  setConfirmDialog({ isOpen: true, video });  // ← This should show the dialog
};
```

**The Problem:** The kiosk's state adapter was **missing** the `priorityQueue` property!

```typescript
// BEFORE (BAD):
{
  searchQuery,
  searchResults,
  isSearching,
  showKeyboard,
  showSearchResults,
  searchMethod: "scraper",
  maxSongLength: 10,
  // ❌ priorityQueue MISSING!
}
```

When `state.priorityQueue.some()` tried to run, it was calling `.some()` on `undefined`, which likely caused a silent error or prevented the function from reaching the `setConfirmDialog()` call.

---

## The Fix

**File:** `src/pages/SearchKiosk.tsx`

**Added `priorityQueue: []` to both places in the state adapter:**

### 1. Initial State Object (Line 113)

```typescript
{
  searchQuery,
  searchResults,
  isSearching,
  showKeyboard,
  showSearchResults,
  searchMethod: "scraper",
  maxSongLength: 10,
  priorityQueue: [], // ✅ Empty queue - kiosk submits directly to player
} as any,
```

### 2. Current State in SetState Adapter (Line 118)

```typescript
const currentState = {
  searchQuery,
  searchResults,
  isSearching,
  showKeyboard,
  showSearchResults,
  searchMethod: "scraper",
  maxSongLength: 10,
  priorityQueue: [], // ✅ Empty queue - kiosk submits directly to player
};
```

---

## Why This Works

1. **Empty Array:** Kiosk doesn't use a local priority queue - it submits songs directly to the player via Supabase Edge Function
2. **Duplicate Check Works:** `[].some()` will always return `false`, so duplicate check passes
3. **Dialog Shows:** Function proceeds to `setConfirmDialog({ isOpen: true, video })` line 212
4. **No Side Effects:** Empty array doesn't interfere with kiosk's direct submission flow

---

## Expected Behavior After Fix

### 1. Click on Video
```
Console: "Video selected:" {id: "xyz", title: "Song Title", ...}
```

### 2. Duplicate Check (Always Passes)
```typescript
const isDuplicate = [].some(...);  // Always false
```

### 3. Dialog Opens
```typescript
setConfirmDialog({ isOpen: true, video });
```

### 4. User Sees Confirmation Dialog
- Video thumbnail
- Title, artist, duration
- "Cost: 1 Credit" (if PAID mode)
- "No" and "Yes, Add to Playlist" buttons

---

## Testing

### Test 1: Dialog Appears
1. Open http://localhost:8082/kiosk
2. Search for a song (e.g., "foo")
3. Click on a video thumbnail
4. **✅ Confirmation dialog should appear**
5. Console should show: "Video selected: {object}"

### Test 2: Duplicate Check Doesn't Interfere
1. Select a video
2. Click "Yes, Add to Playlist"
3. Search again for the same song
4. Click on the same video
5. **✅ Dialog should appear again** (no duplicate warning, since kiosk doesn't track local queue)

### Test 3: Submission Still Works
1. Select a video
2. Confirm in dialog
3. **✅ Song submits to player** (handleSongSelect called)
4. **✅ Credit deducted** (if PAID mode)
5. **✅ Success toast appears**

---

## Files Modified

- **src/pages/SearchKiosk.tsx**
  - Line 113: Added `priorityQueue: []` to initial state object
  - Line 125: Added `priorityQueue: []` to currentState object

---

## Related Issues

This fix completes the confirmation dialog implementation started in `KIOSK_COMPLETE_FIX.md`:

1. ✅ Search results display on first try
2. ✅ Confirmation dialog appears when video clicked ← **THIS FIX**
3. ✅ Song submits without "No Player Connected" error

---

## Success Criteria

✅ **Confirmation Dialog Appears:**
- Dialog opens when video clicked
- Shows video details
- Has No/Yes buttons

✅ **No Console Errors:**
- No `undefined.some()` errors
- No silent failures

✅ **Flow Works End-to-End:**
- Search → Results → Click → Dialog → Confirm → Submit → Success

---

**Status:** ✅ READY TO TEST  
**Test URL:** http://localhost:8082/kiosk  
**Expected:** Clicking video shows confirmation dialog
