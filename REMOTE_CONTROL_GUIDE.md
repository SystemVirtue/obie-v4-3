# Remote Control Setup Guide

## Overview

This jukebox now supports **real-time remote control** from any device on your local network (or anywhere with internet access). Multiple devices can connect simultaneously to control playback, manage the queue, and adjust settings.

## Quick Start

### On the Jukebox (Main Display)

1. Start the jukebox application at `/`
2. Look for the **Remote Control Access** panel
3. Note the **6-character session code** displayed (e.g., `ABC123`)
4. The session code is unique to your jukebox instance

### On Remote Devices (Phone, Tablet, Computer)

1. Open a web browser
2. Navigate to `/remote` on the same domain as the jukebox
   - Example: If jukebox is at `http://192.168.1.100:8080`, go to `http://192.168.1.100:8080/remote`
3. Enter the 6-character session code from the jukebox
4. Click **"Connect to Jukebox"**
5. You're now connected! Control the jukebox in real-time

## Features

### Playback Controls
- **Play** - Start playback
- **Pause** - Pause current song
- **Next** - Skip to next song in queue

### Queue Management  
- View upcoming songs
- See what's currently playing
- Real-time queue updates

### Settings
- **Volume Control** - Adjust jukebox volume remotely
- **Mode Toggle** - Switch between FREEPLAY and PAID modes
- **Add Credits** - Add credits to the jukebox

### Status Monitoring
- Real-time connection status
- Current song display
- Queue length and credits remaining
- Mode indicator

## Network Setup

### Local Network Access

For devices on the same local network:

1. Find your computer's IP address:
   - **Windows**: Run `ipconfig` in Command Prompt
   - **Mac/Linux**: Run `ifconfig` or `ip addr`
   - Look for your local IP (usually starts with `192.168.` or `10.`)

2. On remote devices, use: `http://[YOUR-IP]:8080/remote`
   - Example: `http://192.168.1.100:8080/remote`

### Internet Access

If deployed to a public URL (e.g., via Vercel, Netlify):
- Remote devices can connect from anywhere
- Just use: `https://your-domain.com/remote`

## Security & Sessions

- **Session Codes**: Each jukebox instance generates a unique 6-character code
- **Active Sessions**: Sessions remain active as long as the jukebox is running
- **Multiple Connections**: Multiple remote devices can connect simultaneously
- **Real-time Sync**: All connected devices see updates instantly

## Technical Details

### Architecture

```
┌─────────────┐      ┌──────────────┐      ┌──────────────┐
│   Jukebox   │◄────►│ Lovable Cloud│◄────►│Remote Control│
│  (Display)  │      │  (Realtime)  │      │  (Phone)     │
└─────────────┘      └──────────────┘      └──────────────┘
```

- Uses **Lovable Cloud Realtime** for instant communication
- WebSocket-based connections for low latency
- State synchronized across all connected devices
- Commands broadcast through dedicated channels

### Real-time Events

**Commands Sent from Remote:**
- `PLAY` - Start playback
- `PAUSE` - Pause playback
- `NEXT` - Skip to next song
- `ADD_SONG` - Add song to queue
- `SET_VOLUME` - Change volume
- `SET_MODE` - Toggle FREEPLAY/PAID
- `ADD_CREDITS` - Add credits

**State Updates from Jukebox:**
- Current song and video ID
- Queue contents
- Credit balance
- Playback mode
- Volume level

## Troubleshooting

### Remote Can't Connect

1. **Check session code** - Make sure it matches exactly
2. **Verify network** - Both devices must have internet access
3. **Check firewall** - Ensure WebSocket connections aren't blocked
4. **Refresh jukebox** - Generate a new session code

### Commands Not Working

1. **Check connection status** - Badge should show "Live" in green
2. **Verify permissions** - Some browsers block certain features
3. **Check console logs** - Look for error messages
4. **Re-establish connection** - Try reconnecting

### Session Code Not Displaying

1. **Check authentication** - User may need to sign in
2. **Wait for initialization** - Takes a few seconds on startup
3. **Check logs** - Look for initialization errors

## Advanced Usage

### QR Code Access (Future Feature)

Plan to add QR code generation for easy mobile access:
- Scan QR code to automatically connect
- No need to manually enter session code
- Quick connection for guests

### Multi-Room Support

The system supports multiple simultaneous sessions:
- Each jukebox instance has its own session code
- Remote devices connect to specific sessions
- Useful for multiple jukeboxes in different rooms

### Custom Commands

Developers can extend the command system:
- Add new command types in `useRealtimeSession.tsx`
- Handle custom commands in jukebox logic
- Broadcast custom state updates

## API Reference

### useRealtimeSession Hook

```typescript
const {
  createSession,    // () => Promise<Session>
  joinSession,      // (code: string) => Promise<boolean>
  sendCommand,      // (command: Command) => Promise<boolean>
  broadcastState,   // (state: JukeboxState) => Promise<boolean>
  closeSession,     // () => Promise<void>
  isConnected,      // boolean
  sessionCode,      // string | null
  sessionId,        // string | null
} = useRealtimeSession(options);
```

### Command Interface

```typescript
interface JukeboxCommand {
  type: 'PLAY' | 'PAUSE' | 'NEXT' | 'SET_VOLUME' | ...;
  payload?: any;
  timestamp: string;
  sender: string;
}
```

### State Interface

```typescript
interface JukeboxState {
  isPlaying: boolean;
  currentSong: string;
  currentVideoId: string;
  queue: any[];
  credits: number;
  mode: 'FREEPLAY' | 'PAID';
  volume: number;
}
```

## Support

For issues or questions:
1. Check console logs in browser DevTools
2. Review Lovable Cloud logs
3. Verify database tables: `jukebox_sessions`
4. Check real-time channel subscriptions

## Future Enhancements

- [ ] QR code generation for easy mobile access
- [ ] Voice command integration
- [ ] Advanced queue management (drag-and-drop reorder)
- [ ] User voting system for song requests
- [ ] Analytics dashboard
- [ ] Mobile app version
- [ ] PIN protection for admin functions
- [ ] Guest access limits
