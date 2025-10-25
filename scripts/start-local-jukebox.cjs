#!/usr/bin/env node

/**
 * Local Jukebox Server Launcher
 * Starts the WebSocket server for local-only jukebox operation
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🎵 Starting Local Jukebox Server...\n');

const serverPath = path.join(__dirname, '../backend/websocket-server.js');

const server = spawn('node', [serverPath], {
  stdio: 'inherit',
  env: {
    ...process.env,
    WS_PORT: process.env.WS_PORT || '3001',
  },
});

server.on('error', (error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

server.on('exit', (code) => {
  if (code !== 0) {
    console.error(`Server exited with code ${code}`);
    process.exit(code);
  }
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down...');
  server.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  server.kill('SIGTERM');
  process.exit(0);
});
