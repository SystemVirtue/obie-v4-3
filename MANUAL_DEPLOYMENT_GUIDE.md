# Manual Deployment Guide - Search Kiosk Feature

## ⚠️ Supabase CLI Authentication Required

The Supabase CLI requires interactive browser authentication which I cannot complete automatically. You'll need to follow these manual steps.

---

## 📋 Step-by-Step Deployment Instructions

### Step 1: Login to Supabase CLI (2 minutes)

```bash
cd /Users/mikeclarkin/Documents/GitHub/obie-v4-3

# Login to Supabase (this will open your browser)
supabase login

# Press Enter and authenticate in the browser window
# Once authenticated, return to terminal
```

---

### Step 2: Deploy Database Migration (1 minute)

```bash
# Push the migration to create tables
supabase db push
```

**What this does:**
- Creates `players` table (tracks active player instances)
- Creates `song_requests` table (kiosk → player communication)
- Sets up RLS policies for security
- Enables Realtime notifications on `song_requests`

**Expected output:**
```
✓ Applied migration 20251103000000_create_player_kiosk_tables
```

**If you see errors:**
- Check your internet connection
- Verify the project_id in `supabase/config.toml` is correct
- Try `supabase link --project-ref dccxcquejlgzunenmpbj` first

---

### Step 3: Deploy Edge Functions (2 minutes)

```bash
# Deploy the player registration function
supabase functions deploy register-player

# Deploy the request submission function
supabase functions deploy submit-request
```

**What this does:**
- Deploys `register-player` function (handles player registration + heartbeat)
- Deploys `submit-request` function (validates players + submits requests)

**Expected output:**
```
✓ Deployed register-player (version 1)
✓ Deployed submit-request (version 1)
```

**Verify deployment:**
```bash
supabase functions list
```

You should see both functions with "Active" status.

---

### Step 4: Regenerate TypeScript Types (30 seconds)

```bash
# Generate types from database schema
supabase gen types typescript --project-id dccxcquejlgzunenmpbj > src/integrations/supabase/types.ts
```

**What this does:**
- Generates TypeScript types for `players` and `song_requests` tables
- Updates `src/integrations/supabase/types.ts`
- Resolves TypeScript errors in the codebase

**Verify:**
```bash
# Check that the file was updated
ls -lh src/integrations/supabase/types.ts
```

---

### Step 5: Start Development Server (10 seconds)

```bash
# Start the application
npm run dev
```

**Expected output:**
```
VITE v5.x.x ready in xxx ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

---

## 🧪 Testing Checklist

### Test 1: Player Registration (2 minutes)

1. **Open the main player:**
   ```
   http://localhost:5173
   ```

2. **Check browser console (F12 → Console tab):**
   - Look for: `[Kiosk] Registering player: default`
   - Look for: `[Kiosk] Registered player: default`

3. **Wait 20 seconds and check for heartbeat:**
   - Look for: `[Kiosk] Heartbeat sent`
   - This should repeat every 20 seconds

4. **Verify in Supabase Dashboard:**
   - Go to: https://supabase.com/dashboard/project/dccxcquejlgzunenmpbj/editor
   - Open `players` table
   - You should see a row with:
     - `player_id`: "default"
     - `is_active`: true
     - `last_seen`: current timestamp (updates every 20s)

✅ **Success criteria:** Player appears in database with updating `last_seen` timestamp

---

### Test 2: Kiosk Connection (3 minutes)

1. **Open the kiosk in a new tab/window:**
   ```
   http://localhost:5173/kiosk
   ```

2. **Enter player identifier:**
   - Input: `default`
   - Click: "Connect to Player"

3. **Check for success:**
   - Should see: "Connected to default" message
   - Should see: Credits display
   - Should see: "Search for Music" button

4. **Check browser console:**
   - Look for: `[Kiosk] Validating player: default`
   - Look for: `[Kiosk] Player validated successfully`

✅ **Success criteria:** Kiosk connects successfully and shows main interface

---

### Test 3: Song Request Flow (5 minutes)

1. **In the kiosk tab:**
   - Click: "Search for Music" button
   - Enter when prompted:
     - Video ID: `dQw4w9WgXcQ` (Rick Astley - Never Gonna Give You Up)
     - Title: `Never Gonna Give You Up`
     - Artist: `Rick Astley`
   - Click OK/Submit

2. **Check kiosk console:**
   - Look for: `[Kiosk] Submitting request: Never Gonna Give You Up`
   - Look for: `[Kiosk] Request submitted successfully`

3. **Switch to player tab:**
   - Should see a **toast notification**: "Kiosk Request Received"
   - Should show: "Never Gonna Give You Up" by Rick Astley
   - Check the playlist queue - song should be added!

4. **Check browser console (player tab):**
   - Look for: `[Kiosk] Received song request: Never Gonna Give You Up`

5. **Verify in Supabase Dashboard:**
   - Go to: https://supabase.com/dashboard/project/dccxcquejlgzunenmpbj/editor
   - Open `song_requests` table
   - You should see a row with:
     - `player_id`: "default"
     - `video_id`: "dQw4w9WgXcQ"
     - `title`: "Never Gonna Give You Up"
     - `status`: "delivered" (changed from "pending")

✅ **Success criteria:** Request flows from kiosk → Supabase → player, appears in queue

---

### Test 4: Credits System (2 minutes)

1. **In the kiosk tab, check credits display:**
   - Should show: "0 Credits Available" (or current count)
   - Mode indicator: "FREEPLAY" or "PAID"

2. **If in PAID mode with 0 credits:**
   - Try clicking "Search for Music"
   - Should be **disabled** or show error

3. **To test with credits (manual):**
   - Open browser console on kiosk tab
   - Run: `localStorage.setItem('kiosk_credits', '5')`
   - Refresh page
   - Should show: "5 Credits Available"
   - Submit a request
   - Should deduct to: "4 Credits Available"

✅ **Success criteria:** Credit system works correctly

---

### Test 5: Error Handling (3 minutes)

1. **Test inactive player:**
   - Close the main player tab (http://localhost:5173)
   - Wait 65 seconds (exceeds 60s staleness threshold)
   - In kiosk, try to submit a request
   - Should see error: "Player not responding"

2. **Test invalid player ID:**
   - In kiosk, click "Change Player"
   - Enter: `nonexistent-player`
   - Click Save
   - Should see error: "Player not found or inactive"

3. **Test recovery:**
   - Re-open player tab: http://localhost:5173
   - Wait for heartbeat to register (20s)
   - In kiosk, click "Try Again"
   - Should reconnect successfully

✅ **Success criteria:** Proper error messages and recovery

---

### Test 6: Multi-Player Setup (5 minutes)

1. **Change player identifier:**
   - In main player (http://localhost:5173)
   - Open Admin Console (⚙️ icon)
   - Find "Player Identifier Panel"
   - Change to: `bar-jukebox`
   - Click Save
   - Check console: Should see new registration with new ID

2. **Connect kiosk to new player:**
   - In kiosk tab
   - Click "Change Player"
   - Enter: `bar-jukebox`
   - Click Save
   - Should connect successfully

3. **Submit request:**
   - Submit a test request
   - Should appear in player with `bar-jukebox` identifier

4. **Open second player (optional):**
   - Open: http://localhost:5173 in incognito/different browser
   - Change identifier to: `lounge-player`
   - Open second kiosk tab with identifier: `lounge-player`
   - Submit requests to both - verify they go to correct players

✅ **Success criteria:** Multiple player/kiosk pairs work independently

---

## 🐛 Troubleshooting

### Issue: "Command not found: supabase"
**Solution:**
```bash
npm install -g supabase
```

### Issue: "Not logged in"
**Solution:**
```bash
supabase login
# Follow browser authentication flow
```

### Issue: "Project not linked"
**Solution:**
```bash
supabase link --project-ref dccxcquejlgzunenmpbj
```

### Issue: "Migration already applied"
**This is OK!** It means the database is already up to date.

### Issue: TypeScript errors persist
**Solution:**
```bash
# Make sure types were regenerated
supabase gen types typescript --project-id dccxcquejlgzunenmpbj > src/integrations/supabase/types.ts

# Restart VS Code or TypeScript server
# In VS Code: Cmd+Shift+P → "TypeScript: Restart TS Server"
```

### Issue: Kiosk can't connect to player
**Check:**
1. Is player tab open and running?
2. Check player console for registration logs
3. Check `players` table in Supabase - is player listed?
4. Is `last_seen` timestamp recent (<60s)?
5. Are player IDs matching exactly?

### Issue: Requests not appearing in player
**Check:**
1. Check player console for real-time subscription logs
2. Check `song_requests` table in Supabase - are requests being created?
3. Check Network tab - are WebSocket connections active?
4. Try refreshing player tab to reconnect

### Issue: Edge function deployment fails
**Check logs:**
```bash
supabase functions logs register-player --tail
supabase functions logs submit-request --tail
```

---

## 📊 Success Metrics

After completing all tests, you should have:

- ✅ Players automatically register on app load
- ✅ Heartbeat updates every 20 seconds
- ✅ Kiosk validates player before accepting requests
- ✅ Requests deliver instantly (<1 second)
- ✅ Requests appear in player queue
- ✅ Toast notifications show on player
- ✅ Credit system works correctly
- ✅ Error handling provides clear messages
- ✅ Multiple players work independently
- ✅ No TypeScript errors in codebase

---

## 🎉 Next Steps After Testing

Once all tests pass:

1. **Commit changes:**
   ```bash
   git add .
   git commit -m "feat: Implement Search Kiosk feature with Supabase integration"
   git push origin Obie-Deploy-#1
   ```

2. **Document deployment:**
   - Update `README.md` with kiosk instructions
   - Add kiosk URL to documentation
   - Document credit system configuration

3. **Production considerations:**
   - Set up proper authentication for kiosk devices
   - Configure credit pricing
   - Set up monitoring/analytics
   - Add rate limiting
   - Configure backup/cleanup policies

4. **Enhancement ideas:**
   - Full YouTube search integration (replace prompt with UI)
   - QR code pairing (scan to connect kiosk to player)
   - Request history/recently played
   - Request approval workflow
   - Analytics dashboard

---

## 📞 Need Help?

- Check browser console for detailed logs
- Check Supabase dashboard for database state
- Check edge function logs: `supabase functions logs <function-name> --tail`
- Review implementation docs: `KIOSK_FEATURE_COMPLETE.md`
- Review technical details: `KIOSK_IMPLEMENTATION_GUIDE.md`

---

**Document Version:** 1.0  
**Last Updated:** November 3, 2025  
**Project:** obie-v4-3  
**Feature:** Search Kiosk System
