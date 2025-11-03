# Kiosk Quick Start Guide

## 🚀 Getting Started

### 1. Open the Kiosk
```
http://localhost:8082/kiosk
```

### 2. Enter Player ID
When first opened, you'll see a dialog asking for a Player Identifier.

**Default Player ID:** `default`

Enter the ID and click "Connect to Player"

### 3. Wait for Validation
The system will:
- Check if the player exists in Supabase
- Verify the player is active
- Confirm recent heartbeat (within 60 seconds)

✅ Success → Main kiosk interface loads  
❌ Error → Retry or change player ID

---

## 🎵 Searching for Music

### Step 1: Click "Search for Music"
Large button in the center of the screen

### Step 2: Type Your Search
Use the virtual keyboard:
- Tap letters to spell artist or song name
- Tap numbers for digits
- Tap SPACE to add a space
- Tap ⌫ to delete last character

**Example:** Type "beatles help"

### Step 3: Execute Search
Tap the green **SEARCH** button

### Step 4: Browse Results
- YouTube iframe shows embedded search
- Side panel shows parsed results with thumbnails
- Scroll through video cards

### Step 5: Select a Video
Tap any video card in the results panel

### Step 6: Confirm Selection
- System checks credits (PAID mode only)
- If insufficient → "Insert Coin(s)" dialog appears
- If sufficient → Request submits to player

### Step 7: Success!
- Toast notification: "Song Requested!"
- Credit deducted (if PAID mode)
- Modal closes
- Ready for next search

---

## 💰 Credit System

### FREEPLAY Mode
- No credits required
- Search and select unlimited songs
- Credits display shows "FREE"

### PAID Mode
- 1 credit = 1 song request
- Credits display shows current balance
- Insert coins to add credits
- Insufficient credits → Dialog prompts for coins

### Coin Acceptor
When a coin is inserted:
1. Serial port detects coin
2. Credits increment immediately
3. Balance syncs to Supabase
4. Admin console updates in real-time

---

## 🔧 Admin Functions

### Change Player ID
1. Click "Change Player" button (top-right)
2. Enter new player ID
3. Click "Save and Reload"
4. Page reloads and validates new player

### Check Connection
The player ID is always displayed:
```
Connected to: default
```

If connection lost:
- Error screen appears
- Options: "Try Again" or "Change Player ID"

---

## 🎹 Virtual Keyboard Reference

### Layout
```
Q W E R T Y U I O P
A S D F G H J K L
Z X C V B N M
1 2 3 4 5 6 7 8 9 0

[    SPACE    ] [ ⌫ ] [ SEARCH ]
```

### Key Colors
- **Gray Keys:** Letters and numbers (slate-600)
- **Red Key:** Backspace (red-600)
- **Green Key:** Search (green-600)

### Touch Behavior
- Tap to input character
- Visual feedback on press (scale down)
- Haptic feedback (if device supports)

---

## 📱 Touchscreen Tips

### Optimal Settings
- Screen brightness: 100%
- Auto-sleep: Disabled
- Orientation: Locked (landscape or portrait)
- Zoom: 100% (no pinch-to-zoom)

### User Experience
- Touch targets ≥44px (iOS standard)
- Clear visual feedback on all taps
- Generous spacing between buttons
- High contrast text (white on dark)

---

## 🐛 Troubleshooting

### Issue: "Player Not Active" Error
**Cause:** Player is not running or not registered  
**Solution:**
1. Start the main player (Index page)
2. Ensure player ID matches
3. Wait 5 seconds for heartbeat
4. Click "Try Again" on kiosk

### Issue: Search Results Not Loading
**Cause:** Proxy server not running  
**Solution:**
1. Check terminal for proxy status
2. Verify port 4321 is open
3. Restart proxy: `node backend/youtubePlaylistProxy.cjs`
4. Try search again

### Issue: Credit Balance Not Updating
**Cause:** Supabase Realtime not connected  
**Solution:**
1. Check network connection
2. Verify Supabase project is running
3. Check browser console for errors
4. Reload kiosk page

### Issue: Coin Acceptor Not Working
**Cause:** Serial port not configured  
**Solution:**
1. Check coin acceptor is connected
2. Verify serial port name (usbserial-1420)
3. Grant browser serial port permissions
4. Restart browser

### Issue: "Insufficient Credits" Won't Dismiss
**Cause:** Modal state stuck  
**Solution:**
1. Insert coin(s) to add credits
2. Click outside modal to close
3. Reload page if necessary

---

## 🎯 Testing Checklist

Before public deployment, test:

- [ ] Player validation works
- [ ] Search keyboard responds to taps
- [ ] Search executes and returns results
- [ ] Video selection requires credits (PAID mode)
- [ ] Coin acceptor adds credits
- [ ] Credit balance syncs to admin console
- [ ] Request submits to player successfully
- [ ] Success toast appears
- [ ] Modal closes after selection
- [ ] Multiple searches work consecutively
- [ ] Change player ID function works
- [ ] Error dialogs display correctly

---

## 📊 Usage Monitoring

### Logs to Watch
```typescript
// Browser Console (F12)
[Kiosk] Validating player: default
[Kiosk] Player validated successfully
[Kiosk] Search query changed: beatles
[Kiosk] Submitting request: Help! (dQw4w9WgXcQ)
[Kiosk] Request submitted successfully
[Kiosk] Credits updated: 4

// Network Tab
POST https://uwvsnikeongkgbfqnnbz.supabase.co/functions/v1/submit-request
Status: 200 OK

// Proxy Terminal
Received search request: beatles
Found 48 results
Parsing ytInitialData...
```

### Supabase Tables
**Check `kiosk_requests` table:**
```sql
SELECT * FROM kiosk_requests 
WHERE player_id = 'default' 
ORDER BY created_at DESC 
LIMIT 10;
```

**Check `kiosk_settings` table:**
```sql
SELECT * FROM kiosk_settings 
WHERE player_id = 'default';
```

---

## 🚀 Production Deployment

### Pre-Launch Checklist
1. ✅ Proxy server running (localhost:4321)
2. ✅ Supabase edge functions deployed
3. ✅ Player active and registered
4. ✅ Kiosk player ID configured
5. ✅ Coin acceptor connected and tested
6. ✅ Touchscreen calibrated
7. ✅ Browser in fullscreen (F11)
8. ✅ Screen brightness set to 100%
9. ✅ Auto-sleep disabled
10. ✅ Test search and submission

### Kiosk Mode Setup (Optional)
For dedicated kiosk hardware:
```javascript
// Add to kiosk page
if (window.location.pathname === '/kiosk') {
  // Disable right-click
  document.addEventListener('contextmenu', e => e.preventDefault());
  
  // Disable text selection
  document.body.style.userSelect = 'none';
  
  // Disable double-tap zoom
  document.body.style.touchAction = 'manipulation';
  
  // Request fullscreen
  document.documentElement.requestFullscreen();
}
```

---

## 📞 Support

### Common Questions

**Q: How do I change the credit cost per song?**  
A: Currently fixed at 1 credit per song. Modify `handleKioskVideoSelect` to change.

**Q: Can I use a different search method?**  
A: Kiosk uses iframe_search by default. To change, modify the searchMethod in useVideoSearch adapter.

**Q: How do I add more keyboard layouts?**  
A: Edit `@/constants/keyboard` to add new layouts (AZERTY, QWERTZ, etc.)

**Q: Can multiple kiosks connect to one player?**  
A: Yes! Multiple kiosks can submit requests to the same player ID.

**Q: How do I disable the player validation?**  
A: Remove the validation check in `useEffect`, but this is not recommended for production.

---

## 🎨 Customization

### Change Colors
Edit SearchKiosk.tsx:
```typescript
// Background
className="bg-gradient-to-b from-purple-900 to-purple-800"

// Buttons
className="from-blue-500 to-cyan-500"
```

### Change Keyboard Layout
Edit `@/constants/keyboard.ts`:
```typescript
export const KEYBOARD_ROWS = [
  ['A', 'Z', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'], // AZERTY
  // ...
];
```

### Change Credit Cost
Edit `handleKioskVideoSelect`:
```typescript
if (!hasSufficientCredits(2)) { // 2 credits per song
  setShowInsufficientCredits(true);
  return;
}
```

---

## ✨ Tips & Tricks

### Faster Searches
- Recent searches could be cached
- Popular artists as quick buttons
- Barcode scanner for song codes

### Better UX
- Show search history
- Animate credit increments
- Add sound effects on coin insert
- Show queue position after submission

### Advanced Features
- Voice input for accessibility
- QR code for receipt/confirmation
- Multiple language support
- Preview playback (30s clips)

---

**Version:** 1.0.0  
**Last Updated:** 3 November 2025  
**Status:** Production Ready ✅
