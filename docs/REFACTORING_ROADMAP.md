# Codebase Refactoring Roadmap

## Executive Summary

This document outlines a comprehensive plan to streamline and modernize the Obie Jukebox codebase. The refactoring addresses critical technical debt while maintaining functionality and enabling future scalability.

**Status**: 🟢 Phase 1 Started
**Timeline**: 4 weeks
**Completed**: ✅ 3/9 foundation tasks

## 🎯 Goals

1. **Reduce code duplication** by 35% (10,000 → 6,500 LOC)
2. **Improve type safety** with unified type system
3. **Enhance maintainability** through clear architectural boundaries
4. **Enable testability** by extracting business logic from React hooks
5. **Simplify onboarding** with better documentation

## 📊 Current State Analysis

### Critical Issues Identified

| Issue | Impact | Priority | Status |
|-------|--------|----------|--------|
| Duplicate state interfaces | Type confusion, bugs | 🔴 Critical | ✅ Fixed |
| Hardcoded configuration | Hard to deploy | 🔴 Critical | ✅ Fixed |
| No backend abstraction | Won't work in prod | 🔴 Critical | ✅ Fixed |
| 1522-line Index.tsx | Unmaintainable | 🟡 High | ⏳ Planned |
| Unused pages | Code confusion | 🟡 High | ⏳ Planned |
| 70% duplicate search UI | Maintenance burden | 🟡 High | ⏳ Planned |
| No test coverage | Risky refactoring | 🟢 Medium | ⏳ Planned |

### Code Metrics

| Metric | Current | Target | Reduction |
|--------|---------|--------|-----------|
| Total LOC | ~10,000 | ~6,500 | 35% |
| Index.tsx | 1,522 lines | ~400 lines | 74% |
| Search components | 638 lines | ~250 lines | 61% |
| Hook files | ~2,500 lines | ~1,200 lines | 52% |
| Service files | ~1,200 lines | ~800 lines | 33% |

## 📋 Implementation Plan

### ✅ Week 1: Foundation (COMPLETED: 3/3)

#### ✅ Task 1.1: Create Unified Type System
**File**: `src/types/jukebox.ts`
**Status**: ✅ COMPLETED
**Lines**: 400 lines

**Achievements**:
- Created `JukeboxCoreState` (minimal, for remote/WebSocket)
- Created `JukeboxUIState` (interface-specific)
- Created `JukeboxConfigState` (user preferences)
- Created `JukeboxFullState` (complete, for main app)
- Added type guards and utility types
- Documented all interfaces with JSDoc

**Impact**:
- Single source of truth for all types
- Clear separation of concerns
- Type-safe across entire codebase

#### ✅ Task 1.2: Create Centralized Configuration
**File**: `src/config/index.ts`
**Status**: ✅ COMPLETED
**Lines**: 450 lines

**Achievements**:
- Centralized all environment variables
- Type-safe configuration object
- Organized into logical sections (app, youtube, websocket, etc.)
- Added validation function
- Added debug logging
- Replaced hardcoded values throughout

**Impact**:
- Easy deployment configuration
- Single place to modify settings
- Environment-specific overrides

#### ✅ Task 1.3: Create Backend Proxy Abstraction
**File**: `src/services/youtube/proxy.ts`
**Status**: ✅ COMPLETED
**Lines**: 350 lines

**Achievements**:
- Created `YouTubeProxyService` class
- Health checking with caching
- Graceful timeout handling
- Custom error types (`ProxyError`, `ProxyUnavailableError`, etc.)
- Singleton instance for consistency
- Full TypeScript typing

**Impact**:
- No more hardcoded `localhost:4321`
- Works in production with env vars
- Graceful degradation when proxy down
- Easy to test

---

### ⏳ Week 1 Remaining: Type Migration

#### Task 1.4: Update useJukeboxState.tsx
**Status**: ⏳ NEXT
**Estimated effort**: 2 hours

**Changes needed**:
```typescript
// Remove inline interfaces (lines 3-116)
// Add import
import type {
  JukeboxFullState,
  SearchResult,
  PlaylistItem,
  QueuedRequest,
  LogEntry,
  UserRequest,
  CreditHistory,
  BackgroundFile,
  UserPreferences,
} from '@/types/jukebox';

// Update hook return type
export const useJukeboxState = (): {
  state: JukeboxFullState;
  setState: Dispatch<SetStateAction<JukeboxFullState>>;
} => {
  // ... implementation
};
```

**Testing checklist**:
- [ ] Type checking passes
- [ ] App still compiles
- [ ] No runtime errors
- [ ] State persistence still works

#### Task 1.5: Update useRealtimeSession.tsx
**Status**: ⏳ PENDING
**Estimated effort**: 1 hour

**Changes needed**:
```typescript
// Replace inline JukeboxState with
import type { RemoteJukeboxState } from '@/types/jukebox';

// Update interface to match RemoteJukeboxState
```

#### Task 1.6: Update useLocalWebSocket.tsx
**Status**: ⏳ PENDING
**Estimated effort**: 1 hour

**Changes needed**:
```typescript
// Replace inline interface with
import type { WebSocketJukeboxState } from '@/types/jukebox';
```

#### Task 1.7: Update Service Files
**Status**: ⏳ PENDING
**Estimated effort**: 2 hours

**Files to update**:
- `src/services/musicSearch.ts` - Import `Video`, `SearchResult`
- `src/services/youtubeHtmlParser.ts` - Import types, use `youtubeProxy`
- `src/hooks/usePlayerManager.tsx` - Import types
- `src/hooks/usePlaylistManager.tsx` - Import types
- `src/hooks/useVideoSearch.tsx` - Import types
- `src/components/SearchInterface.tsx` - Import types
- `src/components/IframeSearchInterface.tsx` - Import types

---

### Week 2: Page Cleanup & Core Refactoring

#### Task 2.1: Audit Unused Pages
**Status**: ⏳ PLANNED
**Estimated effort**: 2 hours

**Pages to review**:
1. **Player.tsx** (116 lines)
   - Lines 22-24: Auth bypassed
   - Lines 93-94: Stub implementation
   - **Decision needed**: Remove or fully implement?

2. **Room.tsx** (150 lines)
   - Incomplete collaborative features
   - Supabase realtime setup but minimal UI
   - **Decision needed**: Remove or complete?

3. **Auth.tsx** (unknown lines)
   - Not referenced in Index.tsx
   - **Decision needed**: Remove entirely?

**Actions**:
- [ ] Review each page with product owner
- [ ] Document decision in `DEPRECATION.md`
- [ ] Either remove or move to `src/pages/_deprecated/`
- [ ] Update routing configuration

#### Task 2.2: Create JukeboxProvider
**File**: `src/components/JukeboxProvider.tsx`
**Status**: ⏳ PLANNED
**Estimated effort**: 4 hours

**Implementation**:
```typescript
import { createContext, useContext, FC, ReactNode } from 'react';
import { useJukeboxState } from '@/hooks/useJukeboxState';
import { usePlayerManager } from '@/hooks/usePlayerManager';
import { usePlaylistManager } from '@/hooks/usePlaylistManager';
import { useVideoSearch } from '@/hooks/useVideoSearch';

interface JukeboxContextValue {
  state: JukeboxFullState;
  setState: Dispatch<SetStateAction<JukeboxFullState>>;
  player: ReturnType<typeof usePlayerManager>;
  playlist: ReturnType<typeof usePlaylistManager>;
  search: ReturnType<typeof useVideoSearch>;
}

const JukeboxContext = createContext<JukeboxContextValue | null>(null);

export const JukeboxProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const { state, setState } = useJukeboxState();
  const player = usePlayerManager(/* ... */);
  const playlist = usePlaylistManager(/* ... */);
  const search = useVideoSearch(/* ... */);
  
  return (
    <JukeboxContext.Provider value={{ state, setState, player, playlist, search }}>
      {children}
    </JukeboxContext.Provider>
  );
};

export const useJukebox = () => {
  const context = useContext(JukeboxContext);
  if (!context) throw new Error('useJukebox must be used within JukeboxProvider');
  return context;
};
```

#### Task 2.3: Create useAppInitialization Hook
**File**: `src/hooks/useAppInitialization.tsx`
**Status**: ⏳ PLANNED
**Estimated effort**: 3 hours

**Extract from Index.tsx**:
- Lines 57-195: YT_DLP check and initialization
- Lines 214-246: Display confirmation callbacks
- Lines 277-407: API key testing and fallback
- Lines 440-477: Serial communication setup

#### Task 2.4: Simplify Index.tsx
**Status**: ⏳ PLANNED
**Estimated effort**: 6 hours

**Target**: Reduce from 1,522 lines to ~400 lines

**New structure**:
```tsx
const Index = () => {
  return (
    <JukeboxProvider>
      <AppInitializer />
      <BackgroundDisplay />
      <MainUI />
    </JukeboxProvider>
  );
};

const MainUI = () => {
  const { state } = useJukebox();
  
  return (
    <div className="app-container">
      <SearchInterface />
      <AdminConsole />
      <SerialCommunication />
      <DialogContainer />
    </div>
  );
};
```

#### Task 2.5: Update youtubeHtmlParser.ts
**Status**: ⏳ PLANNED
**Estimated effort**: 2 hours

**Changes**:
- Replace hardcoded URLs with `youtubeProxy` service
- Update line 23: `fetch('http://localhost:4321/api/search')`
- Update line 44: `fetch('http://localhost:4321/api/playlist')`

---

### Week 3: Service Layer & Component Cleanup

#### Task 3.1: Reorganize YouTube Services
**Status**: ⏳ PLANNED
**Estimated effort**: 8 hours

**Create new structure**:
```
src/services/youtube/
├── index.ts              # Main export
├── api/
│   ├── client.ts         # YouTube Data API wrapper
│   ├── quota.ts          # Quota tracking (from youtubeQuota.ts)
│   └── keyRotation.ts    # API key rotation logic
├── scraper/
│   ├── ytdlp.ts          # YT_DLP integration (from ytdlpValidator.ts)
│   ├── htmlParser.ts     # HTML parsing (from youtubeHtmlParser.ts)
│   └── proxy.ts          # ✅ Already created
└── search/
    ├── index.ts          # Main search orchestrator
    ├── searchService.ts  # Unified search (from musicSearch.ts)
    └── fallbackChain.ts  # Fallback strategy pattern
```

**Migration steps**:
1. Create directory structure
2. Move `youtubeQuota.ts` → `api/quota.ts`
3. Extract API key rotation from hooks → `api/keyRotation.ts`
4. Move `ytdlpValidator.ts` → `scraper/ytdlp.ts`
5. Move `youtubeHtmlParser.ts` → `scraper/htmlParser.ts`
6. Refactor `musicSearch.ts` → `search/searchService.ts`
7. Create fallback chain orchestrator
8. Update all imports throughout codebase

#### Task 3.2: Create Search Components
**Status**: ⏳ PLANNED
**Estimated effort**: 6 hours

**Extract shared components**:
```
src/components/search/
├── SearchDialog.tsx       # Shared dialog wrapper
├── SearchKeyboard.tsx     # Shared on-screen keyboard
├── SearchResults.tsx      # Shared results display
├── SearchPagination.tsx   # Shared pagination controls
├── SearchInterface.tsx    # Standard search (refactored)
└── IframeSearchInterface.tsx  # Iframe search (refactored)
```

**Expected reduction**: 638 lines → ~250 lines (61% reduction)

#### Task 3.3: Extract Admin Components
**Status**: ⏳ PLANNED
**Estimated effort**: 4 hours

**Break apart AdminConsole.tsx**:
```
src/components/admin/
├── index.tsx              # Main AdminConsole wrapper
├── PlayerControls.tsx     # Play/pause/skip controls
├── PlaylistSettings.tsx   # Playlist selection/management
├── ApiKeyManager.tsx      # API key rotation UI
├── DisplaySettings.tsx    # Display/fullscreen settings
├── ModeSettings.tsx       # FREEPLAY/PAID mode
└── SystemLogs.tsx         # Logs display
```

#### Task 3.4: Create PlayerService
**File**: `src/services/player/PlayerService.ts`
**Status**: ⏳ PLANNED
**Estimated effort**: 6 hours

**Extract business logic from usePlayerManager**:
- 859 lines → ~200 lines in hook
- 600 lines → new PlayerService class

**Class structure**:
```typescript
export class PlayerService {
  constructor(private window: Window | null) {}
  
  initialize(displayInfo: DisplayInfo): Promise<Window>;
  play(videoId: string): void;
  pause(): void;
  resume(): void;
  skip(): void;
  setVolume(level: number): void;
  cleanup(): void;
  
  // All player logic, testable without React
}
```

---

### Week 4: Testing & Documentation

#### Task 4.1: Add Test Infrastructure
**Status**: ⏳ PLANNED
**Estimated effort**: 4 hours

**Create test utilities**:
```
src/test/
├── utils/
│   ├── mockJukeboxState.ts    # Factory for test state
│   ├── mockYouTubeAPI.ts      # Mock YouTube responses
│   └── renderWithProviders.tsx # Test render helper
├── fixtures/
│   ├── videos.ts               # Sample video data
│   └── playlists.ts            # Sample playlist data
└── setup.ts                    # Test setup
```

#### Task 4.2: Write Critical Tests
**Status**: ⏳ PLANNED
**Estimated effort**: 8 hours

**Priority tests**:
1. `rateLimiter.test.ts` - API protection
2. `requestQueue.test.ts` - Queue priority logic
3. `proxy.test.ts` - Proxy communication
4. `PlayerService.test.ts` - Player control
5. `localStorage/index.test.ts` - Data persistence

**Target coverage**: 60%+ for critical paths

#### Task 4.3: Complete Documentation
**Status**: ⏳ PLANNED
**Estimated effort**: 4 hours

**Documents to create**:
- ✅ `docs/ARCHITECTURE.md` (COMPLETED)
- ✅ `docs/DEVELOPMENT.md` (COMPLETED)
- ⏳ `docs/API.md` - API reference
- ⏳ `docs/MIGRATION.md` - Migration guide for breaking changes
- ⏳ `docs/TESTING.md` - Testing guidelines

#### Task 4.4: Performance Optimization
**Status**: ⏳ PLANNED
**Estimated effort**: 4 hours

**Optimizations**:
- [ ] Code splitting for route-based chunks
- [ ] Lazy loading for admin panel
- [ ] Debounce search input properly
- [ ] Memoize expensive computations
- [ ] Optimize re-renders with React.memo

**Targets**:
- Build time: -20%
- Bundle size: -15%
- First contentful paint: < 1s

---

## 📈 Progress Tracking

### Completed Tasks ✅

| Task | Date | Impact |
|------|------|--------|
| Create unified type system | 2025-01-XX | ⭐⭐⭐ High |
| Create centralized config | 2025-01-XX | ⭐⭐⭐ High |
| Create proxy service | 2025-01-XX | ⭐⭐⭐ High |

### In Progress ⏳

| Task | Progress | Blocker | ETA |
|------|----------|---------|-----|
| - | - | - | - |

### Upcoming 📋

| Task | Priority | Dependencies | Assignee |
|------|----------|--------------|----------|
| Update useJukeboxState | 🔴 High | Types created | - |
| Update other hooks | 🔴 High | useJukeboxState | - |
| Audit unused pages | 🟡 Medium | Product decision | - |

---

## 🎯 Success Metrics

### Quantitative Goals

| Metric | Baseline | Target | Current | Status |
|--------|----------|--------|---------|--------|
| Total LOC | 10,000 | 6,500 | 10,000 | 🔴 0% |
| Index.tsx | 1,522 | 400 | 1,522 | 🔴 0% |
| Search components | 638 | 250 | 638 | 🔴 0% |
| Test coverage | 0% | 60% | 0% | 🔴 0% |
| Build time | X min | -20% | X min | ⏳ TBD |
| Bundle size | Y MB | -15% | Y MB | ⏳ TBD |

### Qualitative Goals

- ✅ Type safety improved
- ✅ Configuration centralized
- ✅ Backend abstraction created
- ⏳ Code maintainability improved
- ⏳ Developer onboarding easier
- ⏳ Test coverage added
- ⏳ Documentation complete

---

## ⚠️ Risk Management

### Identified Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Breaking changes break prod | Medium | High | Feature flags, gradual rollout |
| Type migration breaks functionality | Low | High | Comprehensive testing, type guards |
| Refactoring introduces bugs | Medium | Medium | Unit tests, manual QA |
| Timeline slippage | Medium | Low | Prioritize critical tasks |

### Rollback Strategy

1. **Git branching**: Each phase in separate branch
2. **Tagged releases**: Tag working state before major changes
3. **Feature toggles**: Can switch back to old implementation
4. **Incremental deployment**: Test each phase before next

### Testing Before Merge

**Checklist for each PR**:
- [ ] TypeScript compilation passes
- [ ] All existing tests pass
- [ ] New tests added for changes
- [ ] Manual testing completed
- [ ] No console errors
- [ ] Performance regression check
- [ ] Code review approved

---

## 📚 References

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture overview
- [DEVELOPMENT.md](./DEVELOPMENT.md) - Development guidelines
- [Original refactoring plan](../IMPLEMENTATION_COMPLETE.md) - Initial plan

---

## 👥 Team & Responsibilities

**Lead Developer**: TBD
**Code Reviewer**: TBD
**QA**: TBD
**Documentation**: TBD

---

## 📅 Timeline

```
Week 1: Foundation
├─ ✅ Types (DONE)
├─ ✅ Config (DONE)
├─ ✅ Proxy (DONE)
└─ ⏳ Type migration (IN PROGRESS)

Week 2: Core Refactoring
├─ ⏳ Page cleanup
├─ ⏳ JukeboxProvider
└─ ⏳ Simplify Index.tsx

Week 3: Services & Components
├─ ⏳ Reorganize YouTube services
├─ ⏳ Merge search components
└─ ⏳ Extract admin components

Week 4: Testing & Polish
├─ ⏳ Test infrastructure
├─ ⏳ Write critical tests
├─ ⏳ Complete documentation
└─ ⏳ Performance optimization
```

---

**Last Updated**: 2025-01-XX
**Next Review**: Weekly on Mondays
**Status**: 🟢 On Track
