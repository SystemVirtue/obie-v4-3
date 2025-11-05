import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";
import { fileURLToPath } from 'url';
import { existsSync, readdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Debug logging for Render
console.log('[Vite Config] __dirname:', __dirname);
console.log('[Vite Config] __filename:', __filename);

// Check if vite.config.ts is already in the src directory
// This happens on Render where the repo is checked out to /opt/render/project/src
const parentDir = path.dirname(__dirname);
const isConfigInSrc = path.basename(__dirname) === 'src';

console.log('[Vite Config] parentDir:', parentDir);
console.log('[Vite Config] isConfigInSrc:', isConfigInSrc);

// If config is already in src, use __dirname, otherwise use __dirname/src
const srcPath = isConfigInSrc ? __dirname : path.join(__dirname, 'src');

console.log('[Vite Config] Resolved srcPath:', srcPath);
console.log('[Vite Config] main.tsx exists:', existsSync(path.join(srcPath, 'main.tsx')));

// Verify hooks directory
const hooksPath = path.join(srcPath, 'hooks');
console.log('[Vite Config] hooksPath:', hooksPath);
console.log('[Vite Config] hooks directory exists:', existsSync(hooksPath));

if (existsSync(hooksPath)) {
  const hookFiles = readdirSync(hooksPath).filter(f => f.includes('Background'));
  console.log('[Vite Config] Background hook files:', hookFiles);
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'favicon-16x16.png', 'favicon-32x32.png', 'apple-touch-icon.png', 'robots.txt'],
      manifest: {
        name: 'Multi-User YouTube Music Player',
        short_name: 'Music Player',
        description: 'Scalable multi-user YouTube music video player',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/android-chrome-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/android-chrome-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    }),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": srcPath,
    },
  },
  define: {
    global: "globalThis",
  },
}));
