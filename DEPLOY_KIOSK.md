# Search Kiosk - Quick Deployment Guide

## 🚀 Deploy in 5 Minutes

### Step 1: Deploy Database (30 seconds)
```bash
cd /Users/mikeclarkin/Documents/GitHub/obie-v4-3
supabase db push
```

**What this does:** Creates `players` and `song_requests` tables with RLS policies

**Expected output:**
```
✓ Applied migration 20251103000000_create_player_kiosk_tables
```

---

### Step 2: Deploy Edge Functions (60 seconds)
```bash
supabase functions deploy register-player
supabase functions deploy submit-request
```

**What this does:** Deploys player registration and request submission APIs

**Expected output:**
```
✓ Deployed register-player (version 1)
✓ Deployed submit-request (version 1)
```

---

### Step 3: Regenerate Types (30 seconds)
```bash
supabase gen types typescript --project-id dccxcquejlgzunenmpbj > src/integrations/supabase/types.ts
```

**What this does:** Updates TypeScript types for new database tables

**Expected output:**
```
✓ Generated types to src/integrations/supabase/types.ts
```

---

### Step 4: Test Application (3 minutes)
```bash
npm run dev
```

**Open in browser:**
1. Player: http://localhost:5173
2. Kiosk: http://localhost:5173/kiosk

**Quick test:**
1. ✅ Player loads → Check console for "Registering player: default"
2. ✅ Kiosk loads → Enter player ID "default" → Should connect
3. ✅ Search song on kiosk → Select song → Should appear in player queue
4. ✅ Check player for toast notification

---

## ⚡ One-Command Deploy

Copy-paste this entire block:

```bash
cd /Users/mikeclarkin/Documents/GitHub/obie-v4-3 && \
supabase db push && \
supabase functions deploy register-player && \
supabase functions deploy submit-request && \
supabase gen types typescript --project-id dccxcquejlgzunenmpbj > src/integrations/supabase/types.ts && \
echo "✅ Deployment complete! Run 'npm run dev' to test"
```

---

## 🐛 Troubleshooting

### "Command not found: supabase"
```bash
npm install -g supabase
```

### "Not logged in"
```bash
supabase login
```

### "Project not linked"
```bash
supabase link --project-ref dccxcquejlgzunenmpbj
```

### "Migration already applied"
This is fine! It means the database is already up to date.

### "Function deployment failed"
Check function logs:
```bash
supabase functions logs register-player --tail
```

---

## 📊 Verify Deployment

### Check Database
```bash
# Option 1: Supabase CLI
supabase db remote status

# Option 2: Supabase Dashboard
# Visit: https://supabase.com/dashboard/project/dccxcquejlgzunenmpbj/editor
# Check for "players" and "song_requests" tables
```

### Check Edge Functions
```bash
supabase functions list
```

**Expected output:**
```
┌─────────────────┬────────┐
│ Name            │ Status │
├─────────────────┼────────┤
│ register-player │ Active │
│ submit-request  │ Active │
└─────────────────┴────────┘
```

### Check Types
```bash
# Should see Player and SongRequest types
grep "Player" src/integrations/supabase/types.ts
grep "SongRequest" src/integrations/supabase/types.ts
```

---

## 📝 Post-Deployment Checklist

- [ ] Database tables created (`players`, `song_requests`)
- [ ] Edge functions deployed (status: Active)
- [ ] TypeScript types regenerated (no errors in IDE)
- [ ] Player loads without errors
- [ ] Kiosk loads and connects to player
- [ ] Song request flows from kiosk to player
- [ ] Toast notifications appear on player

---

## 🎯 Next Steps

After successful deployment:

1. **Multi-device testing:** Open kiosk on tablet/phone
2. **Multi-player testing:** Run multiple player instances with different IDs
3. **Performance testing:** Submit rapid requests to test queue handling
4. **Network testing:** Test on slow connections (throttle Chrome DevTools)
5. **Error testing:** Kill player, try kiosk request, verify error handling

---

## 📚 Full Documentation

For detailed implementation details, see:
- `KIOSK_FEATURE_COMPLETE.md` - Complete implementation summary
- `KIOSK_IMPLEMENTATION_GUIDE.md` - Technical deep-dive
- `PROJECT_REVIEW_2025-11-03.md` - Full project analysis

---

**Deployment Status:** ⏳ Ready to Deploy  
**Estimated Time:** 5 minutes  
**Last Updated:** November 3, 2025
