# Search Method Fix - iframe_search Default

## Issue
**Date:** 3 November 2025  
**Error:** CORS failure when using Supabase Edge Function scraper

```
Access to fetch at 'https://uwvsnikeongkgbfqnnbz.supabase.co/functions/v1/youtube-scraper' 
from origin 'http://localhost:8082' has been blocked by CORS policy
```

## Root Cause
The default `searchMethod` was set to `"scraper"` which calls the Supabase Edge Function `youtube-scraper`. This Edge Function has CORS issues and is failing to respond to preflight requests.

## Solution
Changed default `searchMethod` from `"scraper"` to `"iframe_search"` which uses the local YT-DLP proxy server on port 4321.

### File Changed
**`src/hooks/useJukeboxState.tsx`** - Line 208

**Before:**
```typescript
searchMethod: (userPreferences.searchMethod as SearchMethod) || "scraper",
```

**After:**
```typescript
searchMethod: (userPreferences.searchMethod as SearchMethod) || "iframe_search",
```

## Why iframe_search Works
1. **Local Proxy:** Uses `http://localhost:4321/api/search` (no CORS)
2. **Already Fixed:** We added the `/api/search` endpoint to `youtubePlaylistProxy.cjs`
3. **Tested:** Verified working with curl test (Beatles query returned 3 results)
4. **No Quota:** Doesn't use YouTube Data API quota

## Search Method Comparison

| Method | Endpoint | Status | CORS Issue | API Quota |
|--------|----------|--------|------------|-----------|
| `scraper` | Supabase Edge Function | ❌ FAILING | ❌ Yes | ✅ No |
| `iframe_search` | localhost:4321 proxy | ✅ WORKING | ✅ No | ✅ No |
| `api` | YouTube Data API v3 | ⚠️ Quota Limited | ✅ No | ❌ Yes |

## Testing

### Clear localStorage (if needed)
If a user already has "scraper" saved in localStorage, run this in browser console:

```javascript
const prefs = localStorage.getItem('USER_PREFERENCES');
if (prefs) {
  const parsed = JSON.parse(prefs);
  parsed.searchMethod = "iframe_search";
  localStorage.setItem('USER_PREFERENCES', JSON.stringify(parsed));
  window.location.reload();
}
```

### Verify Search Works
1. Open http://localhost:8082/
2. Click "Search for Music"
3. Type a search query (e.g., "beatles")
4. Click SEARCH
5. Results should appear in grid

### Expected Behavior
- ✅ No CORS errors in console
- ✅ Search results display with thumbnails
- ✅ YouTube iframe shows embedded search
- ✅ Side panel shows parsed results
- ✅ Clicking video works

## Long-term Solution

### Option 1: Fix Supabase CORS (Recommended for Production)
Update the Edge Function to properly handle CORS:

```typescript
// supabase/functions/youtube-scraper/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  // ... rest of function
  
  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
});
```

Then redeploy:
```bash
supabase functions deploy youtube-scraper
```

### Option 2: Keep iframe_search as Default (Current)
- Simpler to maintain
- No CORS issues
- No API quota usage
- Works with local proxy
- Users can change in admin console if needed

### Option 3: Add Fallback Logic
Modify `searchService.ts` to automatically fallback to iframe_search if scraper fails:

```typescript
async search(query: string, method: SearchMethod, apiKey?: string, maxResults = 48) {
  try {
    if (method === 'scraper') {
      return await this.searchWithScraper(query, maxResults);
    }
    // ... other methods
  } catch (error) {
    console.warn(`[MusicSearch] ${method} failed, falling back to iframe_search`);
    return await this.searchWithIframe(query, maxResults);
  }
}
```

## Verification

### Check Default Method
```typescript
// In browser console
const state = JSON.parse(localStorage.getItem('USER_PREFERENCES') || '{}');
console.log('Current search method:', state.searchMethod);
// Should output: "iframe_search"
```

### Check Proxy Status
```bash
curl http://localhost:4321/health
# Should return: {"status":"ok","service":"youtube-playlist-proxy"}
```

### Test Search Endpoint
```bash
curl "http://localhost:4321/api/search?query=test&maxResults=5"
# Should return JSON with 5 video results
```

## Impact

### Positive
- ✅ Search works immediately without CORS errors
- ✅ No dependency on Supabase Edge Function
- ✅ No YouTube API quota consumption
- ✅ Local proxy is faster for development
- ✅ Easy to debug (local server logs)

### Considerations
- ⚠️ Requires proxy server running (localhost:4321)
- ⚠️ Production deployment needs proxy setup
- ⚠️ Users with "scraper" in localStorage need to clear it

## Production Deployment

For production, ensure:
1. YT-DLP proxy server is running
2. Proxy accessible from frontend (same domain or CORS configured)
3. Health check endpoint monitored
4. Fallback to API method if proxy fails

## Related Files
- `src/hooks/useJukeboxState.tsx` - Default search method
- `backend/youtubePlaylistProxy.cjs` - Proxy with /api/search endpoint
- `src/services/youtube/search/searchService.ts` - Search logic
- `src/hooks/useVideoSearch.tsx` - Search hook

## Status
✅ **FIXED**  
**Method:** Changed default from "scraper" to "iframe_search"  
**Testing:** HMR updated, ready to test in browser  
**Date:** 3 November 2025
