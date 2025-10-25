# Network Access Guide

## How to Access Admin Panel from Other Devices on Your Local Network

### Overview
Your jukebox system runs a WebSocket server that can be accessed by any device on your local network. This allows you to control the player from your phone, tablet, or another computer.

### Setup Steps

#### 1. Start the Local Server
```bash
npm run start:local
# or
bun run start:local
```

The server will start on port 3001 (or your configured WS_PORT).

#### 2. Find Your Computer's IP Address

**On Windows:**
```bash
ipconfig
```
Look for "IPv4 Address" under your active network connection (usually starts with 192.168.x.x or 10.0.x.x)

**On Mac/Linux:**
```bash
ifconfig
# or
ip addr show
```
Look for "inet" address under your active network interface (en0 for Mac, eth0/wlan0 for Linux)

**Example IP:** `192.168.1.100`

#### 3. Access from Other Devices

Once you have your IP address, you can access the jukebox from any device on your network:

**Player Screen (TV/Monitor):**
```
http://192.168.1.100:3001/
```

**Admin Control Panel (Phone/Tablet/Computer):**
```
http://192.168.1.100:3001/admin
```

### Important Notes

#### Firewall Configuration
You may need to allow incoming connections on port 3001:

**Windows Firewall:**
1. Open Windows Defender Firewall
2. Click "Advanced settings"
3. Click "Inbound Rules" → "New Rule"
4. Select "Port" → Next
5. Enter port 3001 → Next
6. Allow the connection → Next
7. Select all profiles → Next
8. Name it "Jukebox Server" → Finish

**Mac Firewall:**
1. System Preferences → Security & Privacy → Firewall
2. Click "Firewall Options"
3. Add Node.js or your terminal application
4. Set to "Allow incoming connections"

**Linux (ufw):**
```bash
sudo ufw allow 3001/tcp
```

#### Network Requirements
- All devices must be on the same local network (WiFi/Ethernet)
- The server computer must remain on and running the jukebox server
- For best performance, use a wired connection for the player display

#### Security Considerations
- This setup is designed for LOCAL network use only
- Default authentication: username `admin`, password `admin`
- Change the default credentials in `backend/websocket-server.js` for production use
- Do not expose this server to the public internet without proper security measures

### WebSocket Connection

The system uses WebSocket for real-time communication:
- Player connects with: `ws://YOUR_IP:3001?type=player&deviceId=DEVICE_ID`
- Admin connects with: `ws://YOUR_IP:3001?type=admin&deviceId=DEVICE_ID`

The connection is established automatically when you open the player or admin pages.

### Display Management

#### Multi-Monitor Setup
When using the Display Management feature in the Admin Console:

1. **Open Admin Panel** on your control device (phone/laptop)
2. **Navigate to Display Management** section
3. **Select Target Display** - choose which monitor/screen to show the player
4. **Choose Mode:**
   - **Fullscreen**: Opens player in fullscreen on selected display (recommended)
   - **Windowed**: Opens player in a resizable window

#### Window Management API Features

The system uses modern browser APIs for advanced display control:

- **Multi-Monitor Detection**: Automatically detects all connected displays
- **Screen Positioning**: Opens player on the exact screen you select
- **Fullscreen Control**: Automatically enters fullscreen mode on the target display
- **Window Tracking**: Ensures only one player window is open at a time

**Browser Requirements:**
- Chrome/Edge 105+ for full Multi-Screen Window Placement API
- Firefox/Safari: Falls back to standard window.open() with positioning

#### Typical Setup
1. Connect your TV/external monitor to the computer running the server
2. Open the admin panel on your phone/tablet at `http://YOUR_IP:3001/admin`
3. Use Display Management to open the player on your TV in fullscreen
4. Control playback from your phone while the player shows on TV

### Troubleshooting

**Can't connect from other devices?**
- Verify both devices are on the same network
- Check firewall settings
- Try accessing `http://YOUR_IP:3001/api/status` to test server accessibility
- Ensure the server is running (check terminal output)

**Player not showing on selected display?**
- Make sure you're using Chrome/Edge 105+ for best results
- Check if popup blocker is enabled (must allow popups)
- Try the "Windowed" mode if fullscreen isn't working
- Verify the display is connected and detected by your OS

**WebSocket connection issues?**
- Check browser console for connection errors
- Verify port 3001 is not blocked
- Try refreshing the page
- Restart the server if needed

**Old player windows not closing?**
- The system automatically closes old windows before opening new ones
- If a window persists, close it manually and try again
- Check browser console for any errors

### Advanced Configuration

You can customize the server port by setting the `WS_PORT` environment variable:

```bash
WS_PORT=8080 npm run start:local
```

Then access via: `http://YOUR_IP:8080/admin`
