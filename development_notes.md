# Obie's Jukebox - Development Notes

## Project Overview
This is a complete YouTube-based jukebox application built with React, TypeScript, Vite, Tailwind CSS, and Lovable Cloud (Supabase backend).

**Key Features:**
- Keyless YouTube video search and playback via Supabase Edge Functions
- Multi-display window management for player/admin separation
- Credit-based song request system
- Serial communication for coin acceptors (hardware integration)
- Real-time session management
- Background video/image cycling

---

## Backend Infrastructure (Lovable Cloud / Supabase)

### Project Configuration
- **Project ID:** `azjyolfdzwuhmgmitowu`
- **URL:** `https://azjyolfdzwuhmgmitowu.supabase.co`
- **Anon Key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF6anlvbGZkend1aG1nbWl0b3d1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyMjAzMDksImV4cCI6MjA3Njc5NjMwOX0.vvcMRt4OFmgIvZ3s1Cw90dES20msWLDfwLzAMLe2Q7o`

### Database Schema

#### Table: `jukebox_sessions`
Stores active jukebox sessions with real-time state synchronization.

```sql
CREATE TABLE public.jukebox_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_code TEXT NOT NULL UNIQUE,
  owner_id UUID REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT true,
  current_state JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.jukebox_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view active sessions"
  ON public.jukebox_sessions
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Owners can manage their sessions"
  ON public.jukebox_sessions
  FOR ALL
  USING (auth.uid() = owner_id);

-- Trigger for updated_at
CREATE TRIGGER update_jukebox_sessions_updated_at
  BEFORE UPDATE ON public.jukebox_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
```

**Columns:**
- `id` (UUID, PK): Unique session identifier
- `session_code` (TEXT, UNIQUE): Human-readable 6-char session code
- `owner_id` (UUID, FK): References auth.users
- `is_active` (BOOLEAN): Session status
- `current_state` (JSONB): Complete jukebox state snapshot
- `created_at` (TIMESTAMP): Session creation time
- `updated_at` (TIMESTAMP): Last update time

---

#### Table: `rooms`
Stores room/venue information for multi-location jukebox deployments.

```sql
CREATE TABLE public.rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view public rooms"
  ON public.rooms
  FOR SELECT
  USING (is_public = true OR auth.uid() = owner_id);

CREATE POLICY "Owners can manage their rooms"
  ON public.rooms
  FOR ALL
  USING (auth.uid() = owner_id);
```

**Columns:**
- `id` (UUID, PK): Unique room identifier
- `name` (TEXT): Room/venue name
- `owner_id` (UUID, FK): Owner reference
- `is_public` (BOOLEAN): Public visibility
- `created_at` (TIMESTAMP): Creation timestamp

---

#### Table: `playlists`
Stores user-requested songs and default playlists.

```sql
CREATE TABLE public.playlists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  room_id UUID REFERENCES public.rooms(id),
  video_id TEXT NOT NULL,
  title TEXT NOT NULL,
  artist TEXT DEFAULT '',
  position INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own playlists"
  ON public.playlists
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own playlists"
  ON public.playlists
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own playlists"
  ON public.playlists
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own playlists"
  ON public.playlists
  FOR DELETE
  USING (auth.uid() = user_id);
```

**Columns:**
- `id` (UUID, PK): Unique playlist entry ID
- `user_id` (UUID, FK): User who added the song
- `room_id` (UUID, FK): Optional room association
- `video_id` (TEXT): YouTube video ID
- `title` (TEXT): Song title
- `artist` (TEXT): Artist name
- `position` (INTEGER): Queue position
- `created_at` (TIMESTAMP): Addition timestamp

---

#### Table: `approved_devices`
Tracks approved devices for authentication and access control.

```sql
CREATE TABLE public.approved_devices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  device_id TEXT NOT NULL,
  device_name TEXT,
  approved_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.approved_devices ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own approved devices"
  ON public.approved_devices
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own approved devices"
  ON public.approved_devices
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own approved devices"
  ON public.approved_devices
  FOR DELETE
  USING (auth.uid() = user_id);
```

**Columns:**
- `id` (UUID, PK): Unique device approval ID
- `user_id` (UUID, FK): Device owner
- `device_id` (TEXT): Unique device identifier
- `device_name` (TEXT): Human-readable device name
- `approved_at` (TIMESTAMP): Approval timestamp

---

### Database Functions

#### `generate_session_code()`
Generates unique 6-character session codes for jukebox sessions.

```sql
CREATE OR REPLACE FUNCTION public.generate_session_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  code TEXT;
  exists BOOLEAN;
BEGIN
  LOOP
    code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
    SELECT EXISTS(SELECT 1 FROM public.jukebox_sessions WHERE session_code = code) INTO exists;
    EXIT WHEN NOT exists;
  END LOOP;
  RETURN code;
END;
$function$;
```

---

#### `update_updated_at_column()`
Trigger function to automatically update `updated_at` timestamps.

```sql
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;
```

---

## Supabase Edge Functions

### Function: `youtube-scraper`
**Purpose:** Keyless YouTube video search and playlist parsing via HTML scraping.

**Endpoint:** `https://azjyolfdzwuhmgmitowu.supabase.co/functions/v1/youtube-scraper`

**Method:** POST

**Request Body:**
```json
{
  "action": "search" | "playlist",
  "query": "string (for search)",
  "url": "string (for playlist)",
  "limit": 48
}
```

**Response:**
```json
{
  "videos": [
    {
      "id": "video_id",
      "title": "Video Title",
      "channelTitle": "Channel Name",
      "thumbnailUrl": "https://...",
      "videoUrl": "https://youtube.com/watch?v=...",
      "duration": "3:45",
      "durationMinutes": 4
    }
  ]
}
```

**Full Source Code:**
```typescript
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScraperRequest {
  action: 'search' | 'playlist';
  query?: string;
  url?: string;
  limit?: number;
}

interface VideoResult {
  id: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  videoUrl: string;
  duration?: string;
  durationMinutes?: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, query, url, limit = 48 }: ScraperRequest = await req.json();
    console.log(\`[YouTube Scraper] Action: \${action}, Query: \${query}, Limit: \${limit}\`);

    let videos: VideoResult[] = [];

    if (action === 'search' && query) {
      videos = await scrapeYouTubeSearch(query, limit);
    } else if (action === 'playlist' && url) {
      videos = await scrapeYouTubePlaylist(url, limit);
    } else {
      throw new Error('Invalid action or missing parameters');
    }

    return new Response(
      JSON.stringify({ videos }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[YouTube Scraper] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function scrapeYouTubeSearch(query: string, limit: number): Promise<VideoResult[]> {
  const searchUrl = \`https://www.youtube.com/results?search_query=\${encodeURIComponent(query)}&sp=EgIQAQ%253D%253D\`;
  
  console.log(\`[Scraper] Fetching search results from: \${searchUrl}\`);
  
  const response = await fetch(searchUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });

  if (!response.ok) {
    throw new Error(\`YouTube search failed: \${response.status}\`);
  }

  const html = await response.text();
  return parseSearchResults(html, limit);
}

async function scrapeYouTubePlaylist(playlistUrl: string, limit: number): Promise<VideoResult[]> {
  console.log(\`[Scraper] Fetching playlist from: \${playlistUrl}\`);
  
  const response = await fetch(playlistUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });

  if (!response.ok) {
    throw new Error(\`YouTube playlist fetch failed: \${response.status}\`);
  }

  const html = await response.text();
  return parsePlaylistResults(html, limit);
}

function parseSearchResults(html: string, limit: number): VideoResult[] {
  const videos: VideoResult[] = [];
  
  // Extract ytInitialData JSON from the page
  const ytInitialDataMatch = html.match(/var ytInitialData = ({.*?});/);
  if (!ytInitialDataMatch) {
    console.error('[Scraper] Could not find ytInitialData in HTML');
    return videos;
  }

  try {
    const data = JSON.parse(ytInitialDataMatch[1]);
    const contents = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents;
    
    if (!contents) {
      console.error('[Scraper] Unexpected data structure');
      return videos;
    }

    for (const section of contents) {
      const items = section?.itemSectionRenderer?.contents || [];
      
      for (const item of items) {
        if (videos.length >= limit) break;
        
        const videoRenderer = item?.videoRenderer;
        if (!videoRenderer) continue;

        const videoId = videoRenderer.videoId;
        const title = videoRenderer.title?.runs?.[0]?.text || 'Unknown Title';
        const channelTitle = videoRenderer.ownerText?.runs?.[0]?.text || 'Unknown Channel';
        const thumbnail = videoRenderer.thumbnail?.thumbnails?.[0]?.url || '';
        const lengthText = videoRenderer.lengthText?.simpleText || '0:00';
        
        videos.push({
          id: videoId,
          title: cleanTitle(title),
          channelTitle,
          thumbnailUrl: thumbnail.startsWith('//') ? \`https:\${thumbnail}\` : thumbnail,
          videoUrl: \`https://www.youtube.com/watch?v=\${videoId}\`,
          duration: lengthText,
          durationMinutes: parseDurationToMinutes(lengthText),
        });
      }
      
      if (videos.length >= limit) break;
    }
  } catch (error) {
    console.error('[Scraper] Error parsing search results:', error);
  }

  console.log(\`[Scraper] Parsed \${videos.length} videos from search\`);
  return videos;
}

function parsePlaylistResults(html: string, limit: number): VideoResult[] {
  const videos: VideoResult[] = [];
  
  const ytInitialDataMatch = html.match(/var ytInitialData = ({.*?});/);
  if (!ytInitialDataMatch) {
    console.error('[Scraper] Could not find ytInitialData in playlist HTML');
    return videos;
  }

  try {
    const data = JSON.parse(ytInitialDataMatch[1]);
    const contents = data?.contents?.twoColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents?.[0]?.playlistVideoListRenderer?.contents;
    
    if (!contents) {
      console.error('[Scraper] Unexpected playlist data structure');
      return videos;
    }

    for (const item of contents) {
      if (videos.length >= limit) break;
      
      const videoRenderer = item?.playlistVideoRenderer;
      if (!videoRenderer) continue;

      const videoId = videoRenderer.videoId;
      const title = videoRenderer.title?.runs?.[0]?.text || 'Unknown Title';
      const channelTitle = videoRenderer.shortBylineText?.runs?.[0]?.text || 'Unknown Channel';
      const thumbnail = videoRenderer.thumbnail?.thumbnails?.[0]?.url || '';
      const lengthText = videoRenderer.lengthText?.simpleText || '0:00';
      
      videos.push({
        id: videoId,
        title: cleanTitle(title),
        channelTitle,
        thumbnailUrl: thumbnail.startsWith('//') ? \`https:\${thumbnail}\` : thumbnail,
        videoUrl: \`https://www.youtube.com/watch?v=\${videoId}\`,
        duration: lengthText,
        durationMinutes: parseDurationToMinutes(lengthText),
      });
    }
  } catch (error) {
    console.error('[Scraper] Error parsing playlist results:', error);
  }

  console.log(\`[Scraper] Parsed \${videos.length} videos from playlist\`);
  return videos;
}

function cleanTitle(title: string): string {
  return title.replace(/\\([^)]*\\)/g, '').trim();
}

function parseDurationToMinutes(duration: string): number {
  const parts = duration.split(':').map(Number);
  if (parts.length === 2) {
    return parts[0] + (parts[1] > 30 ? 1 : 0);
  } else if (parts.length === 3) {
    return parts[0] * 60 + parts[1] + (parts[2] > 30 ? 1 : 0);
  }
  return 0;
}
```

**Deployment:**
Edge functions are automatically deployed when changes are pushed to the repository. They are located in `supabase/functions/youtube-scraper/index.ts`.

**Testing:**
```bash
curl -X POST \
  https://azjyolfdzwuhmgmitowu.supabase.co/functions/v1/youtube-scraper \
  -H "Content-Type: application/json" \
  -H "apikey: YOUR_ANON_KEY" \
  -d '{"action":"search","query":"music","limit":5}'
```

---

## Environment Variables

### Required for Local Development
Create `.env` file in project root:

```env
VITE_SUPABASE_URL=https://azjyolfdzwuhmgmitowu.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF6anlvbGZkend1aG1nbWl0b3d1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyMjAzMDksImV4cCI6MjA3Njc5NjMwOX0.vvcMRt4OFmgIvZ3s1Cw90dES20msWLDfwLzAMLe2Q7o
VITE_SUPABASE_PROJECT_ID=azjyolfdzwuhmgmitowu
```

---

## Frontend Architecture

### Key Technologies
- **React 18** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** with shadcn/ui components
- **React Router** for navigation
- **@supabase/supabase-js** for backend integration

### Main Routes
- `/` - Main jukebox interface (Index.tsx)
- `/player` - YouTube player window (Player.tsx)
- `/admin` - Admin console (Admin.tsx)
- `/auth` - Authentication (Auth.tsx)
- `/room/:roomId` - Room-specific view (Room.tsx)
- `/remote` - Remote control interface (Remote.tsx)

### State Management
Primary state is managed via `useJukeboxState` hook in `src/hooks/useJukeboxState.tsx`. State includes:
- Player status (playing, paused, loading)
- Playlist (default and user-requested songs)
- Credits system
- Search results
- API key rotation
- Background management
- Display configuration

### Communication Between Windows
The main app and player window communicate via:
1. **localStorage** with `jukeboxCommand` and `jukeboxStatus` keys
2. **storage events** for cross-window messaging
3. Player window listens for commands and updates status

---

## Deployment Instructions

### Remix/Fork Setup
1. **Clone/Remix the repository**
2. **Create a new Supabase project:**
   - Go to https://supabase.com/dashboard
   - Create new project
   - Note the Project URL and anon key

3. **Run database migrations:**
   ```sql
   -- Copy all SQL from "Database Schema" section above
   -- Run in Supabase SQL Editor in order:
   -- 1. Create tables
   -- 2. Enable RLS
   -- 3. Create policies
   -- 4. Create functions
   -- 5. Create triggers
   ```

4. **Deploy Edge Functions:**
   ```bash
   # Install Supabase CLI
   npm install -g supabase
   
   # Link to your project
   supabase link --project-ref YOUR_PROJECT_ID
   
   # Deploy edge function
   supabase functions deploy youtube-scraper
   ```

5. **Configure environment:**
   - Update `.env` with your Supabase credentials
   - Update `src/integrations/supabase/client.ts` if needed

6. **Install and run:**
   ```bash
   npm install
   npm run dev
   ```

---

## Known Issues & Security Notes

### Security Finding
**Active Jukebox Sessions Exposed to All Users:**
The `jukebox_sessions` table RLS policy allows anyone to view all active sessions. Consider restricting to:
```sql
-- More restrictive policy
DROP POLICY "Anyone can view active sessions" ON public.jukebox_sessions;

CREATE POLICY "Users can view their own sessions"
  ON public.jukebox_sessions
  FOR SELECT
  USING (auth.uid() = owner_id);
```

### Browser Compatibility
- Window Management API requires Chrome/Edge with `--enable-experimental-web-platform-features`
- Popup blockers may prevent player window from opening
- Full-screen API requires user gesture

### Rate Limiting
The youtube-scraper function may be rate-limited by YouTube if overused. Consider implementing:
- Request throttling on frontend
- Caching of search results
- Exponential backoff on errors

---

## Additional Resources

### Key Files
- `src/hooks/useJukeboxState.tsx` - Main state management
- `src/services/musicSearch.ts` - YouTube search abstraction
- `src/services/displayManager.ts` - Multi-display window management
- `src/components/AdminConsole.tsx` - Configuration UI
- `public/player.html` - Standalone player window

### Scripts
- `npm run dev` - Start development server
- `npm run build` - Production build
- `npm run start:ws` - Start WebSocket server (optional, for network control)
- `npm run start:local` - Complete local setup

---

## Support & Documentation
- **Lovable Docs:** https://docs.lovable.dev/
- **Supabase Docs:** https://supabase.com/docs
- **Project GitHub:** [Your Repository URL]

---

*Last Updated: 2025-01-23*
*Version: 1.0.0*
