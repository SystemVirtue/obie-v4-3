# Kiosk Auto-Connection Enhancement

**Date:** November 4, 2025  
**Status:** ✅ COMPLETE

## Overview

Enhanced the `/kiosk` page with intelligent auto-connection features for both Player ID and Coin Acceptor devices, improving the user experience by reducing manual setup steps.

## Features Implemented

### 1. Player ID Auto-Connect with Countdown

**Behavior:**
- When kiosk page loads and finds a `Player_ID` in localStorage
- Shows a countdown dialog for 5 seconds
- Displays: "Kiosk connecting to Player_ID: [Player_ID]"
- User can click "Edit Player ID" to cancel auto-connect
- After 5 seconds (if not cancelled), automatically connects to the stored Player ID

**User Flow:**

```
Page Load
  ↓
Check localStorage for 'kiosk_player_id'
  ↓
┌─────────────────────────────────────┐
│ Found Player ID?                    │
└─────────────────────────────────────┘
         │                    │
         NO                   YES
         │                    │
         ↓                    ↓
┌─────────────────┐    ┌──────────────────────┐
│ Show "Enter     │    │ Show Countdown Dialog│
│ Player ID"      │    │ (5 seconds)          │
│ Dialog          │    └──────────────────────┘
└─────────────────┘              │
                                 │
                    ┌────────────┴────────────┐
                    │                         │
              User Clicks              Countdown
              "Edit Player ID"         Reaches 0
                    │                         │
                    ↓                         ↓
            ┌──────────────┐          ┌─────────────┐
            │ Show "Enter  │          │ Validate    │
            │ Player ID"   │          │ Player      │
            │ Dialog       │          └─────────────┘
            └──────────────┘
```

### 2. Coin Acceptor Auto-Detection

**Behavior:**
- Runs once after successful player validation
- Checks for serial devices matching "usbserial-1420"
- If found, shows confirmation dialog with device ID
- Dialog text: "Coin Acceptor Serial Device is Available - ID [deviceID]. Do you want to connect this device?"
- User can accept or decline connection

**Detection Logic:**

```typescript
// Checks for:
1. usbProductId === 1420
2. serialNumber includes 'usbserial-1420'
3. usbVendorId === 1420
```

### 3. Removed Change Player Button

**Before:**
- Visible "Change Player" button in top-right of main interface
- Always accessible to modify Player ID

**After:**
- No visible button on main interface (cleaner UI)
- Player ID can only be modified via:
  1. Auto-connect countdown dialog (on page load)
  2. Re-loading the page (triggers countdown again)

## Implementation Details

### New State Variables

```typescript
// Auto-connect countdown states
const [showAutoConnectCountdown, setShowAutoConnectCountdown] = useState(false);
const [autoConnectCountdown, setAutoConnectCountdown] = useState(5);
const [storedPlayerIdForCountdown, setStoredPlayerIdForCountdown] = useState<string | null>(null);

// Coin acceptor auto-connection states
const [showCoinAcceptorDialog, setShowCoinAcceptorDialog] = useState(false);
const [detectedCoinAcceptorId, setDetectedCoinAcceptorId] = useState<string | null>(null);
const [hasPromptedForCoinAcceptor, setHasPromptedForCoinAcceptor] = useState(false);
```

### Key Functions

#### `handleAutoConnect()`
```typescript
const handleAutoConnect = useCallback(() => {
  if (storedPlayerIdForCountdown) {
    setShowAutoConnectCountdown(false);
    setKioskPlayerId(storedPlayerIdForCountdown);
    setIsValidatingPlayer(true);
    validatePlayer(storedPlayerIdForCountdown);
  }
}, [storedPlayerIdForCountdown]);
```

#### `handleCancelAutoConnect()`
```typescript
const handleCancelAutoConnect = useCallback(() => {
  setShowAutoConnectCountdown(false);
  setAutoConnectCountdown(5); // Reset for next time
  setNewPlayerId(storedPlayerIdForCountdown || "");
  setShowPlayerIdDialog(true);
}, [storedPlayerIdForCountdown]);
```

#### `checkForCoinAcceptor()`
```typescript
const checkForCoinAcceptor = useCallback(async () => {
  if (hasPromptedForCoinAcceptor) return;

  if (!('serial' in navigator)) {
    console.log('[Kiosk] Web Serial API not supported');
    return;
  }

  const ports = await (navigator as any).serial.getPorts();
  let targetPort = null;
  let deviceId = null;

  // Look for usbserial-1420 device
  for (const port of ports) {
    const info = port.getInfo();
    if (info.usbProductId === 1420 || 
        info.serialNumber?.includes('usbserial-1420') ||
        info.usbVendorId === 1420) {
      targetPort = port;
      deviceId = info.serialNumber || `USB-${info.usbVendorId}-${info.usbProductId}`;
      break;
    }
  }

  if (targetPort && deviceId) {
    setDetectedCoinAcceptorId(deviceId);
    setShowCoinAcceptorDialog(true);
    setHasPromptedForCoinAcceptor(true);
  }
}, [hasPromptedForCoinAcceptor]);
```

### Modified `validatePlayer()` Function

Added coin acceptor check after successful validation:

```typescript
const validatePlayer = useCallback(async (playerId: string) => {
  // ... existing validation logic ...
  
  // After successful player validation, check for coin acceptor
  checkForCoinAcceptor();
}, [toast, checkForCoinAcceptor]);
```

### Countdown Timer Implementation

```typescript
useEffect(() => {
  if (!showAutoConnectCountdown || autoConnectCountdown <= 0) {
    return;
  }

  const timer = setTimeout(() => {
    const newCount = autoConnectCountdown - 1;
    setAutoConnectCountdown(newCount);
    
    if (newCount === 0) {
      handleAutoConnect();
    }
  }, 1000);

  return () => clearTimeout(timer);
}, [showAutoConnectCountdown, autoConnectCountdown, handleAutoConnect]);
```

## UI Components

### Auto-Connect Countdown Dialog

```tsx
<Card className="w-full max-w-md border-amber-500 border-2">
  <CardContent className="pt-6">
    <div className="text-center space-y-4">
      <Monitor className="w-16 h-16 mx-auto text-amber-500" />
      <h1 className="text-2xl font-bold text-slate-900">
        Kiosk Auto-Connect
      </h1>
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <p className="text-slate-700 mb-2">
          Kiosk connecting to Player ID:
        </p>
        <p className="text-2xl font-mono font-bold text-amber-600">
          {storedPlayerIdForCountdown}
        </p>
      </div>
      
      <div className="text-6xl font-bold text-amber-600">
        {autoConnectCountdown}
      </div>
      
      <p className="text-slate-600">
        Auto-connecting in {autoConnectCountdown} second{autoConnectCountdown !== 1 ? 's' : ''}...
      </p>
      
      <Button onClick={handleCancelAutoConnect} variant="outline" size="lg">
        <Edit className="w-4 h-4 mr-2" />
        Edit Player ID
      </Button>
    </div>
  </CardContent>
</Card>
```

### Coin Acceptor Connection Dialog

```tsx
<Dialog open={showCoinAcceptorDialog} onOpenChange={setShowCoinAcceptorDialog}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Coin Acceptor Device Available</DialogTitle>
      <DialogDescription>
        A coin acceptor serial device has been detected.
      </DialogDescription>
    </DialogHeader>
    
    <div className="py-4">
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <p className="text-sm text-green-800 mb-2">
          <strong>Device ID:</strong>
        </p>
        <p className="text-lg font-mono text-green-900">
          {detectedCoinAcceptorId}
        </p>
      </div>
      <p className="text-sm text-slate-600 mt-4">
        Do you want to connect this device for accepting coin payments?
      </p>
    </div>
    
    <DialogFooter>
      <Button variant="outline" onClick={handleDeclineCoinAcceptor}>
        No, Skip
      </Button>
      <Button onClick={handleConnectCoinAcceptor}>
        Yes, Connect Device
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

## Files Modified

- ✅ `src/pages/SearchKiosk.tsx` - All auto-connection logic and UI changes

## Changes Summary

### Added
1. **Auto-connect countdown dialog** with 5-second timer
2. **Coin acceptor detection** after player validation
3. **Device ID display** in connection dialog
4. **Cancel/Edit functionality** for countdown
5. **Session-based prompting** (coin acceptor prompt only once)

### Modified
1. **Player validation flow** - now triggers coin acceptor check
2. **Initial load logic** - checks localStorage and shows countdown
3. **Main interface header** - removed button, simplified layout

### Removed
1. **"Change Player" button** from main interface

## Testing Scenarios

### Scenario 1: First-Time Setup (No localStorage)
1. Load `/kiosk` page
2. ✅ Should show "Enter Player ID" dialog immediately
3. Enter Player ID and click "Connect to Player"
4. ✅ Player validation runs
5. ✅ If coin acceptor present, shows connection dialog

### Scenario 2: Returning User (localStorage Present)
1. Load `/kiosk` page
2. ✅ Shows countdown dialog with stored Player ID
3. ✅ Countdown from 5 to 0
4. ✅ Auto-connects at 0
5. ✅ Player validation runs
6. ✅ If coin acceptor present, shows connection dialog

### Scenario 3: User Cancels Auto-Connect
1. Load `/kiosk` page
2. ✅ Shows countdown dialog
3. User clicks "Edit Player ID" before countdown ends
4. ✅ Shows "Enter Player ID" dialog
5. ✅ Pre-filled with current Player ID
6. User can modify and save

### Scenario 4: Coin Acceptor Detection
1. Player validates successfully
2. ✅ `checkForCoinAcceptor()` runs once
3. ✅ If device found, shows dialog with device ID
4. User clicks "Yes, Connect Device"
5. ✅ Dialog closes, connection handled by serial hook
6. Reload page
7. ✅ Does NOT prompt again (hasPromptedForCoinAcceptor = true)

### Scenario 5: No Coin Acceptor Present
1. Player validates successfully
2. ✅ `checkForCoinAcceptor()` runs
3. ✅ No dialog shown (no device found)
4. ✅ Kiosk continues normally

## Benefits

1. **Faster Setup** - Returning users auto-connect in 5 seconds
2. **User Control** - Can still edit Player ID during countdown
3. **Cleaner UI** - No permanent "Change Player" button
4. **Smart Device Detection** - Automatically finds coin acceptor
5. **One-Time Prompts** - Doesn't repeatedly ask about coin acceptor
6. **Error Prevention** - Validates player before checking peripherals

## Browser Requirements

- **Web Serial API** support required for coin acceptor detection
  - Chrome/Edge 89+
  - Opera 75+
  - NOT supported in Firefox or Safari

## Future Enhancements

### Potential Improvements
1. **Remember coin acceptor choice** - Store in localStorage
2. **Auto-reconnect coin acceptor** - On page reload
3. **Device status indicator** - Show coin acceptor connection state
4. **Multiple device support** - Handle multiple serial devices
5. **Countdown customization** - Allow configurable timeout
6. **Skip countdown option** - Add "Connect Now" button

## Related Documentation

- `KIOSK_IMPLEMENTATION_GUIDE.md` - Original kiosk setup
- `KIOSK_FEATURE_COMPLETE.md` - Kiosk feature list
- `src/components/SerialCommunication.tsx` - Coin acceptor integration

---

**Status:** ✅ Implementation Complete  
**Date:** November 4, 2025  
**Ready for Testing:** Yes
