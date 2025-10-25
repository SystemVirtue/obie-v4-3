# Jukebox Architecture Documentation

## Table of Contents
- [Overview](#overview)
- [Architecture Layers](#architecture-layers)
- [Core Concepts](#core-concepts)
- [Data Flow](#data-flow)
- [Service Layer](#service-layer)
- [State Management](#state-management)
- [Component Structure](#component-structure)
- [Integration Points](#integration-points)

## Overview

The Jukebox application is a YouTube-based music player with admin controls, queue management, and remote access capabilities. It supports both free-play and paid modes with coin acceptor integration.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Presentation Layer                       │
│  (React Components: Index, Admin, Remote, Player)           │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────┐
│                     Application Layer                        │
│  (Custom Hooks: useJukeboxState, usePlayerManager, etc.)    │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────┐
│                      Service Layer                           │
│  (YouTube API, WebSocket, Storage, Rate Limiting)           │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────┐
│                    Infrastructure Layer                      │
│  (Supabase, Local Backend Proxy, Serial Communication)      │
└─────────────────────────────────────────────────────────────┘
```

## Architecture Layers

### 1. Presentation Layer
**Location**: `src/pages/`, `src/components/`

Responsible for:
- User interface rendering
- User interaction handling
- Visual feedback
- Responsive layout

Key Components:
- **Index.tsx**: Main jukebox interface
- **Admin.tsx**: Administrative control panel
- **Remote.tsx**: Remote control interface
- **Player.tsx**: Video player window

### 2. Application Layer
**Location**: `src/hooks/`

Responsible for:
- Business logic orchestration
- State management
- Cross-cutting concerns
- Feature coordination

Key Hooks:
- **useJukeboxState**: Central state management
- **usePlayerManager**: Player window control
- **usePlaylistManager**: Queue and playlist logic
- **useVideoSearch**: Search functionality
- **useApiKeyRotation**: API key management

### 3. Service Layer
**Location**: `src/services/`

Responsible for:
- External API communication
- Data transformation
- Caching and optimization
- Error handling

Key Services:
- **YouTube Services**: API client, scraper, proxy
- **Storage Services**: LocalStorage abstraction
- **Rate Limiting**: Request throttling
- **Circuit Breaker**: Fault tolerance

### 4. Infrastructure Layer
**Location**: `backend/`, `supabase/`

Responsible for:
- Backend server operations
- Database operations
- Real-time communication
- Hardware integration

## Core Concepts

### State Management

The application uses a **layered state architecture**:

```typescript
// Core state (minimal, for remote control)
JukeboxCoreState {
  isPlaying, currentSong, currentVideoId, volume,
  queue, priorityQueue, mode, credits
}

// UI state (interface-specific)
JukeboxUIState {
  isSearchOpen, showKeyboard, searchResults,
  isAdminOpen, dialog states
}

// Config state (user preferences)
JukeboxConfigState {
  apiKey, searchMethod, maxSongLength,
  coin values, backgrounds
}

// Full state = Core + UI + Config + Playlist + Runtime + History
JukeboxFullState
```

**Benefits**:
- Remote clients only need `JukeboxCoreState`
- WebSocket only syncs essential state
- Easy to test individual layers
- Clear separation of concerns

### Player Communication

The player runs in a **separate window** with cross-window messaging:

```
┌──────────────────┐         postMessage          ┌──────────────────┐
│   Main Window    │ ────────────────────────────> │  Player Window   │
│  (Controller)    │                                │   (YouTube)      │
│                  │ <──────────────────────────── │                  │
└──────────────────┘    message event listener    └──────────────────┘

Messages:
- PLAY { videoId }
- PAUSE
- RESUME
- SET_VOLUME { volume }
- SKIP
- UPDATE_STATE { isPlaying, currentTime, ... }
```

### YouTube Integration Strategy

**Multi-layered fallback approach**:

```
1. YouTube Data API (primary)
   ├─ Pros: Official, reliable, metadata-rich
   └─ Cons: Quota limits, requires API key

2. Backend Proxy + yt-dlp (fallback #1)
   ├─ Pros: No quota, works without API key
   └─ Cons: Requires local server, slower

3. HTML Scraping (fallback #2)
   ├─ Pros: No backend required
   └─ Cons: Fragile, may break with YouTube changes

4. Iframe Search (fallback #3)
   ├─ Pros: Always works
   └─ Cons: No programmatic control, manual selection
```

### Queue Management

**Two-tier queue system**:

```
┌─────────────────────────────────────────┐
│         Priority Queue (Paid)           │  <-- User-requested songs
│  [Song A] [Song B] [Song C]             │      (added with credits)
└─────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│       Default Playlist (Free)           │  <-- Background playlist
│  [Song 1] [Song 2] [Song 3] ...         │      (plays when queue empty)
└─────────────────────────────────────────┘
```

**Playback Order**:
1. Check priority queue → if not empty, play next
2. Check default playlist → play current index, increment
3. Loop back to start of playlist when finished

## Data Flow

### Song Request Flow

```
User clicks song
       │
       ▼
┌──────────────────────┐
│ Check credits (PAID) │ ──> Insufficient? ──> Show dialog ──> End
└──────────┬───────────┘
           │ Sufficient
           ▼
┌──────────────────────┐
│ Check for duplicates │ ──> Duplicate? ──> Show dialog ──> End
└──────────┬───────────┘
           │ Not duplicate
           ▼
┌──────────────────────┐
│ Add to priority queue│
│ Deduct credits (PAID)│
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Save to localStorage │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  Sync to WebSocket   │ (if connected)
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  Play if nothing is  │
│   currently playing  │
└──────────────────────┘
```

### Search Flow

```
User types query
       │
       ▼
┌──────────────────────┐
│  Debounce (500ms)    │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  Check rate limit    │ ──> Exceeded? ──> Show error ──> End
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  Check API quota     │
└──────────┬───────────┘
           │
    ┌──────┴──────┐
    │             │
    ▼             ▼
Quota OK    Quota exhausted
    │             │
    │             ▼
    │      ┌──────────────────────┐
    │      │ Try API key rotation │
    │      └──────┬───────────────┘
    │             │
    │      ┌──────┴──────┐
    │      │             │
    │      ▼             ▼
    │  Rotation OK   All keys exhausted
    │      │             │
    └──────┤             ▼
           │      ┌──────────────────────┐
           │      │  Fall back to proxy  │
           │      └──────────────────────┘
           │
           ▼
┌──────────────────────┐
│   Execute search     │
│  (API/Proxy/Scraper) │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Filter by max length │
│  (maxSongLength)     │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  Display results     │
└──────────────────────┘
```

## Service Layer

### YouTube Services

**Directory Structure** (Planned Refactor):
```
src/services/youtube/
├── index.ts              # Main export
├── api/
│   ├── client.ts         # YouTube Data API wrapper
│   ├── quota.ts          # Quota tracking
│   └── keyRotation.ts    # API key rotation logic
├── scraper/
│   ├── ytdlp.ts          # YT_DLP integration
│   ├── htmlParser.ts     # HTML parsing fallback
│   └── proxy.ts          # Backend proxy communication ✅ CREATED
└── search/
    ├── index.ts          # Main search orchestrator
    ├── searchService.ts  # Unified search
    └── fallbackChain.ts  # Fallback strategy pattern
```

### Storage Services

**LocalStorage abstraction**:
```typescript
src/services/localStorage/
├── index.ts              # Main export with unified API
├── preferences.ts        # User preferences
├── queue.ts              # Priority queue persistence
├── history.ts            # Credit and search history
└── cache.ts              # Temporary data caching
```

### Resilience Services

**Circuit Breaker Pattern**:
```typescript
const result = await circuitBreaker.execute(
  'youtube-api',
  async () => await youtubeAPI.search(query)
);
```

**Rate Limiting**:
```typescript
const allowed = await rateLimiter.checkLimit('search', userId);
if (!allowed) throw new RateLimitError();
```

## State Management

### State Persistence

**What gets saved to localStorage**:
- ✅ User preferences (mode, credits, API keys, etc.)
- ✅ Priority queue (survives page refresh)
- ✅ Credit history
- ❌ Runtime state (player window, current song)
- ❌ UI state (dialogs open, search results)

**Persistence Flow**:
```typescript
useEffect(() => {
  // Save preferences whenever they change
  saveUserPreferences(state);
}, [
  state.mode,
  state.credits,
  state.apiKey,
  // ... other preference fields
]);

useEffect(() => {
  // Save priority queue whenever it changes
  savePriorityQueue(state.priorityQueue);
}, [state.priorityQueue]);
```

### State Synchronization

**WebSocket real-time sync**:
```
Main Jukebox (Host)
        │
        │ broadcasts state changes
        ▼
   WebSocket Server (port 3001)
        │
        │ relays to all connected clients
        ▼
Remote Control Clients (read-only view)
```

**Supabase realtime sync** (for Remote.tsx):
```
Main Jukebox
        │
        │ updates Supabase session
        ▼
   Supabase Realtime
        │
        │ broadcasts to subscribers
        ▼
Remote Control Page (via session code)
```

## Component Structure

### Main Application (Index.tsx)

**Current Structure** (needs refactoring):
```tsx
Index.tsx (1522 lines) ❌ TOO LARGE
├── useState (massive JukeboxState)
├── useEffect (YT_DLP check)
├── useEffect (API key validation)
├── useEffect (playlist loading)
├── usePlayerManager
├── usePlaylistManager
├── useVideoSearch
├── useApiKeyRotation
├── useQuotaErrorHandler
└── 50+ callbacks and event handlers
```

**Proposed Structure** (simplified):
```tsx
Index.tsx (~400 lines) ✅ CLEAN
└── JukeboxProvider
    ├── AppInitializer (YT_DLP, API, playlist setup)
    ├── BackgroundDisplay
    ├── SearchInterface
    ├── AdminConsole
    ├── SerialCommunication
    └── DialogContainer (all dialogs)
```

### Search Interface

**Current duplication**:
- SearchInterface.tsx (293 lines)
- IframeSearchInterface.tsx (345 lines)
- ~70% duplicate code ❌

**Proposed structure**:
```tsx
src/components/search/
├── SearchDialog.tsx       # Shared dialog wrapper
├── SearchKeyboard.tsx     # Shared on-screen keyboard
├── SearchResults.tsx      # Shared results display
├── SearchInterface.tsx    # Standard search (uses above)
└── IframeSearchInterface.tsx  # Iframe search (uses above)
```

## Integration Points

### Serial Communication (Coin Acceptor)

**Flow**:
```
Coin Inserted
     │
     ▼
Serial Port (9600 baud)
     │
     ▼
SerialCommunication.tsx
     │
     ▼
Parse coin type (A or B)
     │
     ▼
Add credits (coinValueA or coinValueB)
     │
     ▼
Update state.credits
     │
     ▼
Show toast notification
```

### Display Management

**Multi-display support**:
```typescript
// Get available displays
const displays = await window.electronAPI?.getDisplays();

// Open player on specific display
const playerWindow = window.open(
  '/player.html',
  '_blank',
  `width=${display.bounds.width},height=${display.bounds.height},...`
);
```

### Backend Proxy Integration

**New proxy service** (✅ created):
```typescript
import { youtubeProxy } from '@/services/youtube/proxy';

// Check if proxy is available
const available = await youtubeProxy.isAvailable();

// Search videos
const results = await youtubeProxy.searchVideos(query, 10);

// Get playlist
const videos = await youtubeProxy.getPlaylist(playlistId);
```

**Configuration**:
```typescript
// src/config/index.ts
export const youtube = {
  proxyUrl: getEnv('VITE_PROXY_URL', 'http://localhost:4321'),
  proxyHealthCheckTimeout: 2000,
  proxyRequestTimeout: 10000,
};
```

## Next Steps

### Immediate Priorities
1. ✅ Create unified type system (`src/types/jukebox.ts`)
2. ✅ Create centralized config (`src/config/index.ts`)
3. ✅ Create proxy service abstraction (`src/services/youtube/proxy.ts`)
4. ⏳ Update hooks to use unified types
5. ⏳ Remove unused pages (Player, Room, Auth)
6. ⏳ Refactor Index.tsx with JukeboxProvider pattern

### Week 2-3 Priorities
7. Reorganize YouTube services into folder structure
8. Extract business logic from hooks to services
9. Merge duplicate search interfaces
10. Create domain-specific contexts

### Week 4 Priorities
11. Add test utilities and key unit tests
12. Complete documentation
13. Performance optimization
14. Bundle size reduction

## Migration Guide

See [DEVELOPMENT.md](./DEVELOPMENT.md) for detailed migration instructions when updating code to use the new architecture.
