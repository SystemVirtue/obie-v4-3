# Development Guide

## Table of Contents
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Using New Architecture](#using-new-architecture)
- [Backend Setup](#backend-setup)
- [Environment Variables](#environment-variables)
- [Common Tasks](#common-tasks)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

## Getting Started

### Prerequisites
- Node.js 18+ or Bun 1.0+
- YouTube Data API key (optional, for API search)
- Python 3.8+ with yt-dlp (optional, for proxy server)

### Installation

```bash
# Clone the repository
git clone https://github.com/SystemVirtue/obie-v4-3.git
cd obie-v4-3

# Install dependencies
bun install
# or
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your configuration
nano .env
```

### Quick Start

```bash
# Start development server (frontend only)
bun run dev

# Start with backend proxy (recommended)
bun run dev:full

# Start proxy server separately
cd backend
node youtubePlaylistProxy.cjs
```

## Project Structure

```
obie-v4-3/
├── src/
│   ├── components/          # React components
│   │   ├── admin/          # Admin console components (planned)
│   │   ├── search/         # Search interface components (planned)
│   │   └── *.tsx           # Current components
│   ├── hooks/              # Custom React hooks
│   ├── pages/              # Page components (routes)
│   ├── services/           # Business logic services
│   │   ├── youtube/        # YouTube integration (new structure)
│   │   │   ├── proxy.ts    # ✅ Backend proxy service
│   │   │   └── ...         # (to be organized)
│   │   ├── localStorage/   # Storage abstraction
│   │   └── *.ts            # Other services
│   ├── types/              # TypeScript type definitions
│   │   └── jukebox.ts      # ✅ Unified type system
│   ├── config/             # Configuration management
│   │   └── index.ts        # ✅ Centralized config
│   └── utils/              # Utility functions
├── backend/                # Backend services
│   ├── websocket-server.js       # WebSocket for remote sync
│   └── youtubePlaylistProxy.cjs  # YouTube scraping proxy
├── public/                 # Static assets
├── docs/                   # Documentation
│   ├── ARCHITECTURE.md     # ✅ Architecture overview
│   ├── DEVELOPMENT.md      # ✅ This file
│   └── API.md             # (to be created)
└── supabase/              # Supabase backend functions
```

## Development Workflow

### Branch Strategy

```
main                 # Production-ready code
  └── develop        # Development branch
       ├── feature/* # Feature branches
       ├── refactor/* # Refactoring branches
       └── fix/*     # Bug fix branches
```

### Recommended Flow

1. **Create feature branch** from `develop`
2. **Make changes** following architecture guidelines
3. **Test locally** with `bun run dev`
4. **Run type checking** with `bun run type-check`
5. **Commit** with descriptive messages
6. **Push** and create pull request to `develop`

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code refactoring
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `test`: Adding tests
- `chore`: Maintenance tasks

**Example**:
```
feat(search): add YouTube proxy fallback

- Add YouTubeProxyService class for backend communication
- Replace hardcoded localhost:4321 URLs
- Add health checking with caching
- Support graceful degradation when proxy unavailable

Closes #123
```

## Using New Architecture

### Importing Unified Types

**Before** (❌ deprecated):
```typescript
// Inline type definition in hook
export interface JukeboxState {
  isPlaying: boolean;
  currentSong: string;
  // ... 62 properties
}
```

**After** (✅ use unified types):
```typescript
import type { JukeboxFullState, JukeboxCoreState } from '@/types/jukebox';

// For full app state
const state: JukeboxFullState = { /* ... */ };

// For remote control (minimal state)
const remoteState: JukeboxCoreState = { /* ... */ };
```

### Using Centralized Configuration

**Before** (❌ hardcoded values):
```typescript
const QUOTA_LIMIT = 10000;
const PROXY_URL = 'http://localhost:4321';
const DEFAULT_PLAYLIST = 'PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf';
```

**After** (✅ use config):
```typescript
import { config } from '@/config';

const quotaLimit = config.youtube.quotaLimit;
const proxyUrl = config.youtube.proxyUrl;
const defaultPlaylist = config.youtube.defaultPlaylistId;
```

### Using YouTube Proxy Service

**Before** (❌ direct fetch with hardcoded URL):
```typescript
const response = await fetch(
  `http://localhost:4321/api/search?query=${query}`
);
```

**After** (✅ use proxy service):
```typescript
import { youtubeProxy } from '@/services/youtube/proxy';

// Check if proxy is available
const available = await youtubeProxy.isAvailable();
if (!available) {
  // Fall back to alternative method
}

// Search videos
try {
  const results = await youtubeProxy.searchVideos(query, 10);
  console.log('Found', results.length, 'videos');
} catch (error) {
  if (error instanceof ProxyUnavailableError) {
    // Handle proxy being down
  }
}

// Get playlist
const videos = await youtubeProxy.getPlaylist(playlistId);
```

### Type Guards

Use type guards to safely check object types:

```typescript
import { isVideo, isQueuedRequest } from '@/types/jukebox';

function processItem(item: unknown) {
  if (isVideo(item)) {
    // TypeScript knows item is Video
    console.log(item.title, item.channelTitle);
  }
  
  if (isQueuedRequest(item)) {
    // TypeScript knows item is QueuedRequest
    console.log('Requested at:', item.timestamp);
  }
}
```

## Backend Setup

### YouTube Playlist Proxy

The proxy server uses yt-dlp to bypass YouTube API quotas.

**Setup**:
```bash
# Install yt-dlp
pip3 install yt-dlp

# Or on macOS with Homebrew
brew install yt-dlp

# Verify installation
yt-dlp --version
```

**Start proxy**:
```bash
cd backend
node youtubePlaylistProxy.cjs
```

**Test proxy**:
```bash
# Health check
curl http://localhost:4321/health

# Search test
curl "http://localhost:4321/api/search?query=test&maxResults=5"

# Playlist test
curl "http://localhost:4321/api/playlist?playlist=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf"
```

### WebSocket Server

For real-time synchronization between main jukebox and remote controls.

**Start WebSocket server**:
```bash
cd backend
node websocket-server.js
```

**Default port**: 3001

**Test connection**:
```javascript
const ws = new WebSocket('ws://localhost:3001');
ws.onopen = () => console.log('Connected!');
ws.onmessage = (event) => console.log('Message:', event.data);
```

## Environment Variables

### Complete .env Reference

```bash
# ============================================================================
# Application
# ============================================================================
VITE_APP_VERSION=1.0.0
VITE_DEBUG=false

# ============================================================================
# YouTube Configuration
# ============================================================================
# Proxy server URL (for scraping)
VITE_PROXY_URL=http://localhost:4321

# YouTube Data API keys (comma-separated for rotation)
VITE_YOUTUBE_API_KEYS=your-key-1,your-key-2,your-key-3

# Auto-rotate keys when quota exhausted
VITE_AUTO_ROTATE_KEYS=true

# Daily quota limit (units)
VITE_YOUTUBE_QUOTA_LIMIT=10000

# Default playlist to load
VITE_DEFAULT_PLAYLIST_ID=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf

# Proxy timeouts (milliseconds)
VITE_PROXY_HEALTH_TIMEOUT=2000
VITE_PROXY_REQUEST_TIMEOUT=10000

# ============================================================================
# WebSocket Configuration
# ============================================================================
VITE_WS_URL=ws://localhost:3001
VITE_WS_RECONNECT_DELAY=3000
VITE_WS_MAX_RECONNECT_ATTEMPTS=0
VITE_WS_HEARTBEAT_INTERVAL=30000
VITE_WS_DEBUG=false

# ============================================================================
# Supabase Configuration
# ============================================================================
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
VITE_SUPABASE_REALTIME_ENABLED=true

# ============================================================================
# Player Configuration
# ============================================================================
VITE_DEFAULT_VOLUME=50
VITE_MAX_SONG_LENGTH=10
VITE_AUTO_ADVANCE=true
VITE_SHOW_MINI_PLAYER=false
VITE_SHOW_PLAYER_CONTROLS=true

# ============================================================================
# Jukebox Configuration
# ============================================================================
VITE_DEFAULT_MODE=PAID
VITE_INITIAL_CREDITS=0
VITE_COST_PER_SONG=1
VITE_COIN_VALUE_A=3
VITE_COIN_VALUE_B=1
VITE_TEST_MODE=false
VITE_ALLOW_DUPLICATES=false
VITE_MAX_QUEUE_SIZE=50
VITE_ENABLE_PRIORITY_QUEUE=true

# ============================================================================
# Search Configuration
# ============================================================================
VITE_DEFAULT_SEARCH_METHOD=scraper
VITE_SEARCH_DEBOUNCE=500
VITE_SHOW_KEYBOARD=true
VITE_SEARCH_RESULTS_PER_PAGE=10
VITE_ENABLE_SEARCH_HISTORY=true
VITE_MAX_SEARCH_HISTORY=20

# ============================================================================
# Background Configuration
# ============================================================================
VITE_DEFAULT_BACKGROUND=neon1
VITE_CYCLE_BACKGROUNDS=true
VITE_BACKGROUND_CYCLE_INTERVAL=30000
VITE_BOUNCE_VIDEOS=false

# ============================================================================
# Feature Flags
# ============================================================================
VITE_FEATURE_REMOTE_CONTROL=true
VITE_FEATURE_ADMIN_CONSOLE=true
VITE_FEATURE_COLLABORATIVE_ROOMS=false
VITE_FEATURE_API_KEY_ROTATION=true
VITE_FEATURE_EMERGENCY_FALLBACK=true
VITE_FEATURE_ANALYTICS=false
```

### Required vs Optional Variables

**Required** (for basic functionality):
- None! App works without any env vars using defaults

**Recommended** (for full functionality):
- `VITE_YOUTUBE_API_KEYS` - For YouTube Data API search
- `VITE_PROXY_URL` - For proxy-based search (if not localhost)

**Optional** (for advanced features):
- `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` - For remote control
- `VITE_WS_URL` - For WebSocket sync (if not localhost)

## Common Tasks

### Adding a New Service

1. **Create service file**:
```typescript
// src/services/myService.ts
export class MyService {
  async doSomething(): Promise<Result> {
    // Implementation
  }
}

export const myService = new MyService();
export default myService;
```

2. **Add types** to `src/types/jukebox.ts` if needed

3. **Add configuration** to `src/config/index.ts` if needed

4. **Use in components/hooks**:
```typescript
import { myService } from '@/services/myService';

const result = await myService.doSomething();
```

### Adding a New Hook

1. **Create hook file**:
```typescript
// src/hooks/useMyFeature.tsx
import { useState, useEffect } from 'react';
import type { JukeboxFullState } from '@/types/jukebox';

export const useMyFeature = (state: JukeboxFullState) => {
  // Hook implementation
  return {
    // Return values
  };
};
```

2. **Document hook** in `docs/API.md`

3. **Use in component**:
```typescript
import { useMyFeature } from '@/hooks/useMyFeature';

const MyComponent = () => {
  const feature = useMyFeature(state);
  // ...
};
```

### Adding a New Page

1. **Create page component**:
```typescript
// src/pages/MyPage.tsx
const MyPage = () => {
  return <div>My Page</div>;
};

export default MyPage;
```

2. **Add route** in `App.tsx` or router config

3. **Update navigation** if needed

### Running Tests

```bash
# Run all tests
bun test

# Run tests in watch mode
bun test --watch

# Run specific test file
bun test src/services/youtube/proxy.test.ts

# Run tests with coverage
bun test --coverage
```

### Building for Production

```bash
# Build frontend
bun run build

# Preview production build
bun run preview

# Type check
bun run type-check

# Lint
bun run lint
```

## Testing

### Unit Testing

**Example test** for YouTube proxy service:

```typescript
// src/services/youtube/proxy.test.ts
import { describe, it, expect, beforeEach } from 'bun:test';
import { YouTubeProxyService, ProxyUnavailableError } from './proxy';

describe('YouTubeProxyService', () => {
  let service: YouTubeProxyService;

  beforeEach(() => {
    service = new YouTubeProxyService('http://localhost:4321');
  });

  it('should search for videos', async () => {
    const results = await service.searchVideos('test', 5);
    expect(results).toBeArray();
    expect(results.length).toBeLessThanOrEqual(5);
  });

  it('should handle proxy unavailable', async () => {
    const badService = new YouTubeProxyService('http://localhost:9999');
    const available = await badService.isAvailable();
    expect(available).toBe(false);
  });
});
```

### Integration Testing

**Example test** for search flow:

```typescript
// src/components/SearchInterface.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchInterface } from './SearchInterface';

describe('SearchInterface', () => {
  it('should display search results', async () => {
    render(<SearchInterface {...mockProps} />);
    
    const input = screen.getByPlaceholderText('Search for songs...');
    fireEvent.change(input, { target: { value: 'test' } });
    
    // Wait for results
    await screen.findByText(/Found \d+ results/);
    
    expect(screen.getByText('Test Video')).toBeInTheDocument();
  });
});
```

## Troubleshooting

### Common Issues

#### 1. Proxy server not connecting

**Error**: `ProxyUnavailableError: Cannot connect to proxy server`

**Solutions**:
- Verify proxy is running: `curl http://localhost:4321/health`
- Check `VITE_PROXY_URL` environment variable
- Ensure yt-dlp is installed: `yt-dlp --version`
- Check firewall isn't blocking port 4321

#### 2. YouTube API quota exceeded

**Error**: `Quota exceeded for this API key`

**Solutions**:
- Add multiple API keys in `VITE_YOUTUBE_API_KEYS` (comma-separated)
- Enable auto-rotation: `VITE_AUTO_ROTATE_KEYS=true`
- Switch to scraper method: `searchMethod: 'scraper'`
- Wait for quota reset (midnight Pacific Time)

#### 3. WebSocket connection fails

**Error**: `WebSocket connection to 'ws://localhost:3001' failed`

**Solutions**:
- Start WebSocket server: `cd backend && node websocket-server.js`
- Check port 3001 is not in use: `lsof -i :3001`
- Update `VITE_WS_URL` if using different port/host

#### 4. Player window not opening

**Possible causes**:
- Pop-up blocker
- Display not detected
- Electron API not available

**Solutions**:
- Allow pop-ups for localhost
- Use manual display selection in admin panel
- Check browser console for errors

#### 5. Type errors after updating

**Error**: `Property 'xyz' does not exist on type 'JukeboxFullState'`

**Solution**:
- Update imports to use unified types from `@/types/jukebox`
- Check type definition matches new structure
- Run `bun run type-check` for detailed errors

### Debug Mode

Enable debug logging:

```bash
# .env
VITE_DEBUG=true
VITE_WS_DEBUG=true
```

Then check browser console for detailed logs:
- `[YouTubeProxy]` - Proxy operations
- `[PlayerManager]` - Player communication
- `[WebSocket]` - Real-time sync
- `[RateLimiter]` - API rate limiting

### Getting Help

1. **Check documentation**:
   - `docs/ARCHITECTURE.md` - System design
   - `docs/API.md` - API reference (to be created)
   - Inline code comments

2. **Search issues**: Check if issue already reported on GitHub

3. **Create issue**: Include:
   - Environment details (OS, Node version, browser)
   - Steps to reproduce
   - Error messages and stack traces
   - Relevant code snippets

4. **Ask in discussions**: For questions and feature requests

## Next Steps

After setting up your development environment:

1. **Read** [ARCHITECTURE.md](./ARCHITECTURE.md) to understand system design
2. **Review** existing code to understand current implementation
3. **Follow** the refactoring plan to contribute to codebase improvements
4. **Write tests** for any new features you add
5. **Update documentation** when making architectural changes

Happy coding! 🎵
