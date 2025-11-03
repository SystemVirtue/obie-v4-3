# Kiosk Search Results Not Displaying - Investigation

## 🐛 Problem

**Date:** 3 November 2025  
**Status:** 🔍 INVESTIGATING

### User Report
- ✅ `/index` search works perfectly
- ❌ `/kiosk` search returns results in console but doesn't display them
- Console shows search completing successfully with 13 results

### Console Output (Kiosk)
```
Keyboard input: SEARCH
useVideoSearch.tsx:281 Search button pressed, query: FOO
useVideoSearch.tsx:40 performSearch called with query: FOO
useVideoSearch.tsx:120 Starting keyless search for: FOO
searchService.ts:48 [MusicSearch] Returning cached results for: FOO
useVideoSearch.tsx:133 Search completed: (13) [{…}, {…}, {…}, ...]
```

### Expected Behavior
Results should display in a 4x2 grid with pagination (identical to `/index`)

---

## Investigation Steps

### 1. Verify setState Adapter is Being Called

Added logging to SearchKiosk.tsx setState adapter (lines 128-143):

```typescript
if (update.searchResults !== undefined) {
  console.log("[Kiosk setState] Setting searchResults:", update.searchResults.length, "results");
  setSearchResults(update.searchResults);
}
if (update.isSearching !== undefined) {
  console.log("[Kiosk setState] Setting isSearching:", update.isSearching);
  setIsSearching(update.isSearching);
}
if (update.showKeyboard !== undefined) {
  console.log("[Kiosk setState] Setting showKeyboard:", update.showKeyboard);
  setShowKeyboard(update.showKeyboard);
}
if (update.showSearchResults !== undefined) {
  console.log("[Kiosk setState] Setting showSearchResults:", update.showSearchResults);
  setShowSearchResults(update.showSearchResults);
}
```

### What to Check in Browser Console

After clicking SEARCH, you should see:

```
[Kiosk setState] Setting isSearching: true
[Kiosk setState] Setting showKeyboard: false
[Kiosk setState] Setting showSearchResults: true
[Kiosk setState] Setting searchResults: [] (empty while searching)
... (search happens) ...
[Kiosk setState] Setting searchResults: 13 results
[Kiosk setState] Setting isSearching: false
```

### 2. Possible Issues

#### Issue A: showSearchResults Not Being Set
**Symptom:** No log for "Setting showSearchResults: true"  
**Cause:** setState update not including showSearchResults  
**Fix:** Check useVideoSearch performSearch function

#### Issue B: showKeyboard Staying True
**Symptom:** Both keyboard and results trying to render  
**Cause:** showKeyboard not being set to false  
**Result:** Keyboard covers results (CSS z-index issue)  
**Fix:** Verify showKeyboard is set to false when search starts

#### Issue C: isSearching Stuck on True
**Symptom:** "Searching..." message never goes away  
**Cause:** finally block not executing, or isSearching not updating  
**Result:** Results section shows loading spinner instead of results  
**Fix:** Verify finally block in performSearch runs

#### Issue D: searchResults Not Being Set
**Symptom:** setState log shows "0 results" instead of "13 results"  
**Cause:** setState adapter not receiving searchResults update  
**Result:** Empty results array renders nothing  
**Fix:** Check setState call in useVideoSearch

---

## Search Flow Analysis

### Expected Flow

1. **User clicks SEARCH button**
   - SearchKeyboard calls `onKeyPress("SEARCH")`

2. **handleKeyboardInput receives "SEARCH"**
   ```typescript
   case "SEARCH":
     if (newQuery.trim()) {
       setTimeout(() => performSearch(newQuery), 0);
     }
     return prev;
   ```

3. **performSearch starts**
   ```typescript
   setState((prev) => ({
     ...prev,
     isSearching: true,      // ← Show loading
     searchResults: [],      // ← Clear old results
     showKeyboard: false,    // ← Hide keyboard
     showSearchResults: true // ← Show results section
   }));
   ```

4. **Search executes**
   ```typescript
   const searchResults = await musicSearchService.search(...);
   const filteredResults = searchResults.filter(...);
   ```

5. **Results set**
   ```typescript
   setState((prev) => ({ 
     ...prev, 
     searchResults: filteredResults 
   }));
   ```

6. **Loading ends**
   ```typescript
   finally {
     setState((prev) => ({ 
       ...prev, 
       isSearching: false 
     }));
   }
   ```

### SearchInterface Rendering Logic

```typescript
{showKeyboard && <SearchKeyboard />}

{showSearchResults && (
  <div>
    {isSearching ? (
      <div>Searching...</div>
    ) : (
      <div>
        {/* Results grid here */}
      </div>
    )}
  </div>
)}
```

**For results to display:**
- ✅ `showSearchResults` must be `true`
- ✅ `isSearching` must be `false`
- ✅ `searchResults` must have items
- ✅ `showKeyboard` should be `false` (or positioned correctly)

---

## Testing Instructions

### Step 1: Open Kiosk with Console
```
http://localhost:8082/kiosk
```
Open browser DevTools (F12) → Console tab

### Step 2: Perform Search
1. Enter player ID: `default`
2. Click "Search for Music"
3. Type "foo"
4. Click SEARCH button

### Step 3: Check Console Logs

Look for the sequence:

```
✅ Keyboard input: SEARCH
✅ Search button pressed, query: foo
✅ performSearch called with query: foo
✅ [Kiosk setState] Setting isSearching: true          ← Should see this
✅ [Kiosk setState] Setting showKeyboard: false        ← Should see this
✅ [Kiosk setState] Setting showSearchResults: true    ← Should see this
✅ [Kiosk setState] Setting searchResults: 0 results   ← Should see this
✅ Starting keyless search for: foo
✅ [MusicSearch] Returning cached results for: foo
✅ Search completed: (13) [{…}, ...]
✅ [Kiosk setState] Setting searchResults: 13 results  ← Should see this
✅ [Kiosk setState] Setting isSearching: false         ← Should see this
```

### Step 4: Check UI State

**If results DON'T appear, check:**

1. **Is the keyboard still visible?**
   - If YES → `showKeyboard` not being set to false
   - Check console for `[Kiosk setState] Setting showKeyboard: false`

2. **Is "Searching..." still showing?**
   - If YES → `isSearching` stuck on true
   - Check console for `[Kiosk setState] Setting isSearching: false`

3. **Is the results section visible at all?**
   - If NO → `showSearchResults` not being set to true
   - Check console for `[Kiosk setState] Setting showSearchResults: true`

4. **Is the results section visible but empty?**
   - Check console for `[Kiosk setState] Setting searchResults: X results`
   - If X = 0, results aren't being passed to setState
   - If X = 13, there's a rendering issue

---

## Comparison: Index vs Kiosk

### Index.tsx (Working)
```typescript
const { state, setState } = useJukeboxState();

const { performSearch } = useVideoSearch(
  state,          // ← Full state object
  setState,       // ← Direct setState
  addLog,
  addUserRequest,
  addCreditHistory,
  toast,
  checkAndRotateIfNeeded,
);

<SearchInterface
  searchResults={state.searchResults}
  isSearching={state.isSearching}
  showKeyboard={state.showKeyboard}
  showSearchResults={state.showSearchResults}
  // ...
/>
```

### SearchKiosk.tsx (Not Working?)
```typescript
const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
const [isSearching, setIsSearching] = useState(false);
const [showKeyboard, setShowKeyboard] = useState(false);
const [showSearchResults, setShowSearchResults] = useState(false);

const { performSearch } = useVideoSearch(
  { searchQuery, searchResults, isSearching, showKeyboard, showSearchResults, ... } as any,
  (updater: any) => { /* setState adapter */ },
  // ...
);

<SearchInterface
  searchResults={searchResults}
  isSearching={isSearching}
  showKeyboard={showKeyboard}
  showSearchResults={showSearchResults}
  // ...
/>
```

**Key Difference:** Kiosk uses setState adapter that must manually map each property

**Potential Issue:** If the setState adapter doesn't properly extract and set each property, the UI won't update

---

## Likely Root Cause

Based on the console output showing "Search completed: (13) results", the search is working. The issue is likely:

### Hypothesis 1: setState Adapter Not Being Called
The `setState((prev) => ({ ...prev, searchResults: filteredResults }))` call in useVideoSearch.tsx might not be triggering the setState adapter.

**Why?** The adapter function might not be handling the update correctly.

**Test:** Check if `[Kiosk setState] Setting searchResults: 13 results` appears in console.

### Hypothesis 2: showSearchResults Not Set to True
The initial setState that sets `showSearchResults: true` might not be working.

**Why?** The state adapter might be missing this property update.

**Test:** Check if `[Kiosk setState] Setting showSearchResults: true` appears in console.

### Hypothesis 3: CSS/Z-Index Issue
Both keyboard and results sections are rendering, but keyboard is covering results.

**Why?** Both `showKeyboard` and `showSearchResults` might be true simultaneously.

**Test:** Inspect DOM to see if both sections exist.

---

## Next Steps

1. ✅ Added setState logging to help diagnose
2. ⏳ User needs to test and report console output
3. ⏳ Based on console output, we'll identify exact issue
4. ⏳ Apply targeted fix

---

## Files Modified

- ✅ `src/pages/SearchKiosk.tsx` (lines 128-143)
  - Added console.log to setState adapter for debugging

---

**Status:** 🔍 AWAITING USER TEST  
**Test URL:** http://localhost:8082/kiosk  
**Action Required:** User to perform search and report console output
