# Alternative Deployment - Via Supabase Dashboard

Since you're encountering permissions issues with the CLI, you can deploy directly via the Supabase Dashboard SQL Editor.

---

## 🚀 Quick Deploy via Dashboard (5 minutes)

### Step 1: Open Supabase SQL Editor

Go to: **https://supabase.com/dashboard/project/dccxcquejlgzunenmpbj/sql/new**

---

### Step 2: Copy and Run Migration SQL

Copy the **entire SQL script** below and paste it into the SQL Editor, then click "Run":

```sql
-- ============================================================================
-- SEARCH KIOSK FEATURE - DATABASE MIGRATION
-- Creates tables for player-kiosk communication via Supabase Realtime
-- ============================================================================

-- Create players table (tracks active player instances)
CREATE TABLE IF NOT EXISTS players (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id text NOT NULL UNIQUE,
  device_name text,
  is_active boolean DEFAULT true NOT NULL,
  last_seen timestamptz DEFAULT now() NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create index for faster player lookups
CREATE INDEX IF NOT EXISTS idx_players_player_id ON players(player_id);
CREATE INDEX IF NOT EXISTS idx_players_is_active ON players(is_active);
CREATE INDEX IF NOT EXISTS idx_players_last_seen ON players(last_seen);

-- Create song_requests table (kiosk → player communication)
CREATE TABLE IF NOT EXISTS song_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id text NOT NULL REFERENCES players(player_id) ON DELETE CASCADE,
  video_id text NOT NULL,
  title text NOT NULL,
  artist text,
  status text DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'delivered', 'failed')),
  created_at timestamptz DEFAULT now() NOT NULL,
  processed_at timestamptz
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_song_requests_player_id ON song_requests(player_id);
CREATE INDEX IF NOT EXISTS idx_song_requests_status ON song_requests(status);
CREATE INDEX IF NOT EXISTS idx_song_requests_created_at ON song_requests(created_at);

-- Enable Row Level Security
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE song_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for players table
-- Allow public to register and update player heartbeats
DROP POLICY IF EXISTS "Allow public player registration" ON players;
CREATE POLICY "Allow public player registration"
ON players FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- RLS Policies for song_requests table
-- Allow public to insert song requests
DROP POLICY IF EXISTS "Allow public song requests" ON song_requests;
CREATE POLICY "Allow public song requests"
ON song_requests FOR INSERT
TO public
WITH CHECK (true);

-- Allow public to read song requests
DROP POLICY IF EXISTS "Allow public read song requests" ON song_requests;
CREATE POLICY "Allow public read song requests"
ON song_requests FOR SELECT
TO public
USING (true);

-- Allow public to update song request status
DROP POLICY IF EXISTS "Allow public update song request status" ON song_requests;
CREATE POLICY "Allow public update song request status"
ON song_requests FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

-- Enable Realtime for song_requests table (critical for instant delivery)
ALTER PUBLICATION supabase_realtime ADD TABLE song_requests;

-- Success message
SELECT 'Search Kiosk tables created successfully!' as message;
```

**Expected output:**
```
message: "Search Kiosk tables created successfully!"
```

---

### Step 3: Verify Tables Created

1. Go to **Table Editor**: https://supabase.com/dashboard/project/dccxcquejlgzunenmpbj/editor

2. You should see two new tables:
   - `players` (6 columns)
   - `song_requests` (7 columns)

3. Click on each table to verify the schema matches the migration

---

### Step 4: Deploy Edge Functions

Now deploy the edge functions using the CLI:

```bash
cd /Users/mikeclarkin/Documents/GitHub/obie-v4-3

# Deploy register-player function
supabase functions deploy register-player --project-ref dccxcquejlgzunenmpbj

# Deploy submit-request function
supabase functions deploy submit-request --project-ref dccxcquejlgzunenmpbj
```

**Expected output:**
```
✓ Deployed register-player (version 1)
✓ Deployed submit-request (version 1)
```

**If deployment fails due to permissions:**
You can also deploy via the Dashboard:
1. Go to: https://supabase.com/dashboard/project/dccxcquejlgzunenmpbj/functions
2. Click "Create a new function"
3. Copy the code from `supabase/functions/register-player/index.ts` and `supabase/functions/submit-request/index.ts`

---

### Step 5: Regenerate TypeScript Types

```bash
supabase gen types typescript --project-id dccxcquejlgzunenmpbj > src/integrations/supabase/types.ts
```

**If this fails**, you can skip it for now - the TypeScript errors won't prevent testing.

---

## ✅ Verify Deployment

### Check Tables in Dashboard

**Players Table:**
- Go to: https://supabase.com/dashboard/project/dccxcquejlgzunenmpbj/editor
- Click on `players` table
- Columns should be:
  - id (uuid)
  - player_id (text, UNIQUE)
  - device_name (text, nullable)
  - is_active (boolean, default: true)
  - last_seen (timestamptz)
  - created_at (timestamptz)

**Song Requests Table:**
- Click on `song_requests` table
- Columns should be:
  - id (uuid)
  - player_id (text, FK → players)
  - video_id (text)
  - title (text)
  - artist (text, nullable)
  - status (text, default: 'pending')
  - created_at (timestamptz)
  - processed_at (timestamptz, nullable)

### Check Realtime is Enabled

1. Go to: https://supabase.com/dashboard/project/dccxcquejlgzunenmpbj/database/publications
2. Click on `supabase_realtime` publication
3. Verify `song_requests` table is listed
4. If not, run this SQL:
   ```sql
   ALTER PUBLICATION supabase_realtime ADD TABLE song_requests;
   ```

### Check RLS Policies

1. Go to: https://supabase.com/dashboard/project/dccxcquejlgzunenmpbj/auth/policies
2. Verify policies exist for both tables
3. Should see:
   - `players`: "Allow public player registration"
   - `song_requests`: "Allow public song requests", "Allow public read song requests", "Allow public update song request status"

---

## 🧪 Test the Application

Now that the database is deployed, test the application:

### 1. Open Player (Main Jukebox)
```
http://localhost:8082
```

**Check browser console (F12):**
- Should see: `[Kiosk] Registering player: default`
- Should see: `[Kiosk] Registered player: default`
- Wait 20 seconds, should see: `[Kiosk] Heartbeat sent`

**Verify in Supabase Dashboard:**
- Go to `players` table
- Should see a row with `player_id: "default"`
- `is_active` should be `true`
- `last_seen` should be recent (updates every 20s)

---

### 2. Open Kiosk
```
http://localhost:8082/kiosk
```

**On first load:**
- Prompt: "Enter the Player Identifier"
- Enter: `default`
- Click: "Connect to Player"

**Should see:**
- "Connected to default" message
- Credits display (showing 0 credits if in PAID mode)
- "Search for Music" button

**Check browser console:**
- Should see: `[Kiosk] Validating player: default`
- Should see: `[Kiosk] Player validated successfully`

---

### 3. Submit a Test Request

**In kiosk tab:**
1. Click "Search for Music" button
2. When prompted for **Video ID**, enter: `dQw4w9WgXcQ`
3. When prompted for **Title**, enter: `Never Gonna Give You Up`
4. When prompted for **Artist**, enter: `Rick Astley`

**Check kiosk console:**
- Should see: `[Kiosk] Submitting request: Never Gonna Give You Up (dQw4w9WgXcQ) to player default`
- Should see: `[Kiosk] Request submitted successfully`

**Check player tab:**
- Should see **toast notification**: "Kiosk Request Received"
- Message: "Never Gonna Give You Up" by Rick Astley
- Song should be added to the playlist queue!

**Check player console:**
- Should see: `[Kiosk] Received song request: Never Gonna Give You Up (dQw4w9WgXcQ)`

**Verify in Supabase Dashboard:**
- Go to `song_requests` table
- Should see a new row:
  - `player_id`: "default"
  - `video_id`: "dQw4w9WgXcQ"
  - `title`: "Never Gonna Give You Up"
  - `artist`: "Rick Astley"
  - `status`: "delivered" (changed from "pending")

---

## 🎉 Success!

If all the above tests pass, your Search Kiosk feature is **fully operational**!

---

## 🐛 Troubleshooting

### Issue: "Player not found or inactive"
**Check:**
1. Is the main player tab open? (http://localhost:8082)
2. Check player console - is it registering?
3. Check `players` table in Supabase - is there a row with your player_id?
4. Is `is_active` = true?
5. Is `last_seen` within the last 60 seconds?

### Issue: Request not appearing in player
**Check:**
1. Is Realtime enabled on `song_requests` table?
2. Check browser Network tab - is WebSocket connection active?
3. Check player console for subscription errors
4. Try refreshing the player tab

### Issue: TypeScript errors
**These are non-critical!** The app will still work. To fix:
```bash
supabase gen types typescript --project-id dccxcquejlgzunenmpbj > src/integrations/supabase/types.ts
```

---

## 📊 What's Next?

After successful testing:

1. **Replace the manual input with full search:**
   - Integrate YouTube API search in kiosk
   - Use existing `SearchInterface` component
   - Add search results display

2. **Add authentication (optional):**
   - Protect edge functions with API keys
   - Add kiosk device authentication

3. **Add monitoring:**
   - Track request patterns
   - Monitor player uptime
   - Analytics dashboard

4. **Production deployment:**
   - Configure proper domain
   - Set up SSL certificates
   - Deploy to production Supabase project

---

**Document Version:** 1.0  
**Created:** November 3, 2025  
**For:** Search Kiosk Feature Deployment
