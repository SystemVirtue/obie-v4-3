import { WebSocketServer } from 'ws';
import express from 'express';
import session from 'express-session';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import cors from 'cors';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cors());
app.use(express.json());

// Session middleware for secure auth
app.use(session({
  secret: 'jukebox-local-secret-change-this',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true, 
    secure: false, // Set to true if using HTTPS
    sameSite: 'strict' 
  }
}));

app.use(express.static(path.join(__dirname, '../public')));

const PERSIST_FILE = path.join(__dirname, 'queue.json');
let state = { 
  venues: { 
    local: { 
      queue: [], 
      current: null, 
      state: 'paused', 
      deviceId: null,
      volume: 50,
      currentTime: 0,
      duration: 0
    } 
  } 
};

// Load persistence on startup
if (fs.existsSync(PERSIST_FILE)) {
  try {
    state = JSON.parse(fs.readFileSync(PERSIST_FILE, 'utf8'));
    console.log('✓ Queue loaded from queue.json');
  } catch (e) {
    console.error('✗ Corrupted queue.json, starting fresh');
  }
}

// Save to disk
function saveState() {
  try {
    fs.writeFileSync(PERSIST_FILE, JSON.stringify(state, null, 2));
  } catch (e) {
    console.error('Failed to save queue:', e);
  }
}

const PORT = process.env.WS_PORT || 3001;
const server = app.listen(PORT, () => {
  console.log(`\n🎵 Jukebox Server Running`);
  console.log(`   Player: http://localhost:${PORT}`);
  console.log(`   Admin:  http://localhost:${PORT}/admin`);
  console.log(`   WebSocket: ws://localhost:${PORT}\n`);
});

const wss = new WebSocketServer({ server });

const clients = new Map(); // ws → { type, deviceId }
const pendingDevices = new Map(); // code → deviceId

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const type = url.searchParams.get('type');
  const deviceId = url.searchParams.get('deviceId');

  console.log(`[WS] ${type} connected (${deviceId})`);

  ws.on('message', (data) => {
    const msg = JSON.parse(data);

    // PLAYER READY
    if (msg.type === 'ready' && type === 'player') {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      pendingDevices.set(code, msg.deviceId);
      ws.send(JSON.stringify({ type: 'show_code', code }));
      clients.set(ws, { type: 'player', deviceId: msg.deviceId });
      console.log(`[Device] Approval code generated: ${code}`);
      return;
    }

    // APPROVE DEVICE
    if (msg.type === 'device_approve' && type === 'admin') {
      const deviceId = pendingDevices.get(msg.code);
      if (deviceId) {
        state.venues.local.deviceId = deviceId;
        saveState();
        broadcast({ type: 'approved' });
        broadcast({ 
          type: 'load_playlist', 
          queue: state.venues.local.queue,
          current: state.venues.local.current 
        }, 'player');
        pendingDevices.delete(msg.code);
        console.log(`[Device] Approved: ${deviceId}`);
      }
      return;
    }

    // PLAYER STATE UPDATE
    if (msg.type === 'state' && type === 'player') {
      Object.assign(state.venues.local, {
        state: msg.state,
        currentTime: msg.currentTime,
        duration: msg.duration,
        currentVideoId: msg.currentVideoId
      });
      saveState();
      broadcast({ type: 'state_update', ...state.venues.local }, 'admin');
      return;
    }

    // QUEUE ADD
    if (msg.type === 'queue_add') {
      state.venues.local.queue.push({ 
        videoId: msg.videoId, 
        title: msg.title || 'Unknown Track',
        addedAt: new Date().toISOString()
      });
      saveState();
      broadcast({ type: 'queue_update', queue: state.venues.local.queue });
      console.log(`[Queue] Added: ${msg.title}`);
      return;
    }

    // QUEUE REORDER
    if (msg.type === 'queue_reorder') {
      const { from, to } = msg;
      const [moved] = state.venues.local.queue.splice(from, 1);
      state.venues.local.queue.splice(to, 0, moved);
      saveState();
      broadcast({ type: 'queue_update', queue: state.venues.local.queue });
      return;
    }

    // QUEUE REMOVE
    if (msg.type === 'queue_remove') {
      const removed = state.venues.local.queue.splice(msg.index, 1);
      saveState();
      broadcast({ type: 'queue_update', queue: state.venues.local.queue });
      console.log(`[Queue] Removed: ${removed[0]?.title}`);
      return;
    }

    // CONTROL COMMANDS
    if (msg.type === 'control' && type === 'admin') {
      if (msg.action === 'clear_queue') {
        state.venues.local.queue = [];
        state.venues.local.current = null;
        saveState();
        broadcast({ type: 'queue_update', queue: [] });
        console.log(`[Queue] Cleared`);
      } else {
        broadcast(msg, 'player');
        console.log(`[Control] ${msg.action} ${msg.value || ''}`);
      }
    }
  });

  ws.on('close', () => {
    const info = clients.get(ws);
    console.log(`[WS] ${info?.type} disconnected`);
    clients.delete(ws);
  });

  ws.on('error', (err) => {
    console.error('[WS] Error:', err);
  });
});

// Send full state to newly connected clients
setInterval(() => {
  for (const [ws, info] of clients) {
    if (info.type === 'player' && state.venues.local.deviceId === info.deviceId) {
      ws.send(JSON.stringify({
        type: 'load_playlist',
        queue: state.venues.local.queue,
        current: state.venues.local.current
      }));
    } else if (info.type === 'admin') {
      ws.send(JSON.stringify({
        type: 'state_update',
        ...state.venues.local
      }));
      ws.send(JSON.stringify({
        type: 'queue_update',
        queue: state.venues.local.queue
      }));
    }
  }
}, 5000);

function broadcast(msg, filterType) {
  const payload = JSON.stringify(msg);
  for (const [client, info] of clients) {
    if (!filterType || info.type === filterType) {
      if (client.readyState === 1) { // OPEN
        client.send(payload);
      }
    }
  }
}

// REST API endpoints
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    venue: state.venues.local,
    clients: Array.from(clients.values())
  });
});

// Auth endpoints
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  // Simple local auth - customize as needed
  if (email === 'admin' && password === 'admin') {
    req.session.userId = 'admin-local';
    req.session.email = email;
    res.json({ success: true, user: { id: req.session.userId, email } });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

app.get('/api/auth/session', (req, res) => {
  if (req.session.userId) {
    res.json({ authenticated: true, user: { id: req.session.userId, email: req.session.email } });
  } else {
    res.json({ authenticated: false });
  }
});

// Routes
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../public/player.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, '../public/admin.html')));
