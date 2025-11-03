# Search Implementation Status

## 🔧 FIXES COMPLETED

### 1. ✅ Search Hanging Issue - RESOLVED
**Problem:** Search was hanging on Index page when user clicked "Search for Music"

**Root Cause:** The YouTube playlist proxy (`backend/youtubePlaylistProxy.cjs`) was missing the `/api/search` endpoint. The application was trying to call `http://localhost:4321/api/search` which returned 404.

**Solution:**
- Added full search endpoint to `backend/youtubePlaylistProxy.cjs`
- Endpoint parses YouTube search results from HTML
- Supports ytInitialData JSON extraction + Cheerio fallback
- Returns structured results with id, title, channelTitle, thumbnailUrl, duration

**Testing:**
```bash
curl "http://localhost:4321/api/search?query=beatles&maxResults=3"
# Successfully returns 3 Beatles videos with full metadata
```

**Proxy Restarted:** ✅ Running on port 4321 with search endpoint active

---

## 🎮 NEXT: Kiosk Search Implementation

### Current Kiosk State
- Basic player validation ✅
- Credit synchronization ✅
- Coin acceptor integration ✅
- Manual song entry (prompt-based) ❌ **Need to replace**

### Required: Full Search UI

The kiosk currently has this placeholder:
```typescript
const handleSearchAndSelect = async () => {
  const videoId = prompt("Enter YouTube Video ID:");
  const title = prompt("Enter Song Title:");
  const artist = prompt("Enter Artist Name:");
  await handleSongSelect(videoId, title, artist);
};
```

**This needs to be replaced with the same professional search system from Index.tsx**

---

## 📋 Implementation Plan

### Phase 1: Copy Search Components ✅
Already available in codebase:
- `src/components/SearchButton.tsx` - Main search trigger button
- `src/hooks/useVideoSearch.tsx` - Search logic and state management
- Search modal UI (inline in Index.tsx)
- Video grid display
- Virtual keyboard (inline in Index.tsx)

### Phase 2: Integrate into Kiosk
**File:** `src/pages/SearchKiosk.tsx`

#### 2.1 Import Required Components
```typescript
import { SearchButton } from "@/components/SearchButton";
import { useVideoSearch } from "@/hooks/useVideoSearch";
// Video grid and keyboard are inline - need to extract or copy
```

#### 2.2 Add Search State
Already have from useVideoSearch:
- `searchQuery` - Current search text
- `searchResults` - Array of video results
- `isSearching` - Loading state
- `showKeyboard` - Virtual keyboard visibility
- `showSearchResults` - Results modal visibility

#### 2.3 Add useVideoSearch Hook
```typescript
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
```

**Problem:** Kiosk doesn't have full `state` object like Index
**Solution:** Create minimal state adapter or use simplified version

#### 2.4 Replace Manual Entry Button
```tsx
// OLD:
<Button onClick={handleSearchAndSelect}>
  Search for Music
</Button>

// NEW:
<SearchButton
  onSearch={() => setState(prev => ({ ...prev, showKeyboard: true }))}
  credits={credits}
  mode={mode}
  onInsufficientCredits={() => setShowInsufficientCredits(true)}
/>
```

#### 2.5 Add Search Modal
Copy from Index.tsx lines ~830-950:
- Virtual keyboard for touch input
- Search results grid with thumbnails
- Video selection with confirmation
- Loading states

#### 2.6 Integrate with Credit System
```typescript
const handleVideoSelectKiosk = async (video: SearchResult) => {
  // Check credits before confirming
  if (!hasSufficientCredits(1)) {
    setShowInsufficientCredits(true);
    return;
  }
  
  // Show confirmation dialog
  setConfirmDialog({ isOpen: true, video });
};

const confirmAddToPlaylistKiosk = async () => {
  if (!confirmDialog.video) return;
  
  const { videoId, title, channelTitle } = confirmDialog.video;
  
  // Submit to Supabase
  await handleSongSelect(videoId, title, channelTitle);
  
  // Deduct credit
  if (mode === "PAID") {
    await deductCredits(1);
  }
  
  setConfirmDialog({ isOpen: false, video: null });
};
```

---

## 🎨 Styling Requirements

### Match Main App Aesthetic
The kiosk currently has:
- Dark gradient background: `bg-gradient-to-b from-slate-900 to-slate-800`
- Cards with transparency: `bg-slate-800/50`
- Amber/yellow accents for interactive elements

**Need to maintain:**
1. Same gradient backgrounds
2. Card styling with backdrop blur
3. Consistent button styles
4. Same color scheme (slate/amber)
5. Professional animations (fade-in, slide-up)
6. Touch-friendly sizing (larger buttons)

### Component Styling Checklist
- [ ] Search button matches Index style
- [ ] Virtual keyboard has large touch targets
- [ ] Video grid cards match main app cards
- [ ] Modal backdrop matches main app modals
- [ ] Loading spinner consistent
- [ ] Confirmation dialog matches existing dialogs

---

## 🔌 Integration Points

### State Management
Kiosk needs minimal state for search:
```typescript
interface KioskSearchState {
  showKeyboard: boolean;
  showSearchResults: boolean;
  searchQuery: string;
  searchResults: SearchResult[];
  isSearching: boolean;
}
```

### API Integration
- Already configured: `musicSearchService.search()`
- Search method: `"scraper"` or `"iframe_search"`
- Proxy URL: `http://localhost:4321`
- Max results: 48 (same as Index)

### Credit Flow
```
1. User clicks "Search for Music" 
   ↓
2. Virtual keyboard appears (no credit check)
   ↓
3. User types search query
   ↓
4. Search executes (no credit check)
   ↓
5. Results display in grid (no credit check)
   ↓
6. User selects video
   ↓
7. **CREDIT CHECK** - hasSufficientCredits(1)
   ↓
8a. If insufficient → Show "Insert Coin(s)" dialog
8b. If sufficient → Show confirmation dialog
   ↓
9. User confirms
   ↓
10. Submit to Supabase
   ↓
11. Deduct 1 credit (if PAID mode)
   ↓
12. Show success toast
```

---

## 📦 Dependencies

Already installed:
- `@/components/SearchButton`
- `@/hooks/useVideoSearch`
- `@/services/youtube/search/searchService`
- Supabase client for submission
- Toast notifications

New extractions needed:
- Virtual keyboard component (currently inline in Index)
- Video grid component (currently inline in Index)
- Search modal layout (currently inline in Index)

**Option 1:** Extract to shared components
**Option 2:** Copy inline code to Kiosk
**Recommendation:** Option 2 for MVP (faster), Option 1 for production

---

## 🚀 Implementation Steps

### Step 1: Add Search State to Kiosk
```typescript
const [showKeyboard, setShowKeyboard] = useState(false);
const [showSearchResults, setShowSearchResults] = useState(false);
const [searchQuery, setSearchQuery] = useState("");
const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
const [isSearching, setIsSearching] = useState(false);
```

### Step 2: Implement Search Function
```typescript
const performSearch = async (query: string) => {
  if (!query.trim()) return;
  
  setIsSearching(true);
  setSearchResults([]);
  setShowKeyboard(false);
  setShowSearchResults(true);
  
  try {
    const results = await musicSearchService.search(
      query,
      "iframe_search", // Use proxy method
      undefined,
      48
    );
    
    setSearchResults(results);
    
    if (results.length === 0) {
      toast({
        title: "No Results",
        description: "No music videos found for your search.",
        variant: "default",
      });
    }
  } catch (error) {
    console.error("Search error:", error);
    toast({
      title: "Search Error",
      description: "Unable to search. Please try again.",
      variant: "destructive",
    });
  } finally {
    setIsSearching(false);
  }
};
```

### Step 3: Add Virtual Keyboard
Copy from Index.tsx:
- Keyboard layout (QWERTY + numbers)
- Key press handlers
- Backspace/Clear/Search buttons
- Touch-optimized sizing

### Step 4: Add Results Grid
Copy from Index.tsx:
- Video card layout
- Thumbnail images
- Title + artist display
- Duration badges
- Click handlers

### Step 5: Test Flow
1. Open `/kiosk`
2. Connect to player
3. Click "Search for Music"
4. Virtual keyboard appears
5. Type "beatles"
6. Click Search
7. Results grid displays
8. Click a video
9. Confirmation dialog shows
10. Confirm → Check credits
11. If insufficient → Dialog
12. If sufficient → Submit + deduct

---

## 📝 Files to Modify

1. **src/pages/SearchKiosk.tsx** (PRIMARY)
   - Add search state
   - Add performSearch function
   - Add virtual keyboard UI
   - Add results grid UI
   - Wire up credit checking

2. **src/hooks/useVideoSearch.tsx** (OPTIONAL)
   - May need kiosk-specific variant
   - Or use existing with adapter

3. **src/components/SearchButton.tsx** (REVIEW)
   - Ensure works with kiosk context
   - May need prop adjustments

---

## 🧪 Testing Checklist

- [ ] Search button appears on kiosk
- [ ] Clicking search shows keyboard
- [ ] Keyboard input works
- [ ] Search executes and shows loading
- [ ] Results display in grid
- [ ] Clicking video shows confirmation
- [ ] Insufficient credits shows dialog
- [ ] Sufficient credits allows selection
- [ ] Request submits to Supabase
- [ ] Credit deducts after selection
- [ ] Toast notifications appear
- [ ] Styling matches main app
- [ ] Touch targets are large enough
- [ ] Animations are smooth

---

## ⏱️ Estimated Effort

- Extract/copy UI components: 30 minutes
- Integrate search logic: 20 minutes
- Wire up credit checking: 10 minutes
- Style matching: 20 minutes
- Testing: 20 minutes

**Total:** ~100 minutes (1.5-2 hours)

---

## 🎯 Success Criteria

1. ✅ Kiosk has professional search UI matching Index
2. ✅ Virtual keyboard works for touch input
3. ✅ Search returns results from proxy
4. ✅ Results display in grid with thumbnails
5. ✅ Credit checking integrated properly
6. ✅ Insufficient credits dialog works
7. ✅ Song submission to Supabase works
8. ✅ Credit deduction synchronizes
9. ✅ Styling matches main app aesthetic
10. ✅ User experience is smooth and professional

---

**STATUS:** Ready to implement
**BLOCKER:** None (proxy fixed, credit system working)
**NEXT ACTION:** Begin Step 1 of implementation
