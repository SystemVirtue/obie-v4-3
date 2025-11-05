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

// IMPORTANT: Even when config is in "src" directory on Render,
// the actual source files are in src/src/ (doubled path)
// So we ALWAYS need to append 'src' to get to the source files
const srcPath = path.join(__dirname, 'src');

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

// Verify components/ui directory for troubleshooting
const uiPath = path.join(srcPath, 'components', 'ui');
console.log('[Vite Config] UI components path:', uiPath);
console.log('[Vite Config] UI directory exists:', existsSync(uiPath));

if (existsSync(uiPath)) {
  const uiFiles = readdirSync(uiPath);
  console.log('[Vite Config] UI files count:', uiFiles.length);
  console.log('[Vite Config] UI files (first 20):', uiFiles.slice(0, 20));
  const toasterFiles = uiFiles.filter(f => f.toLowerCase().includes('toast'));
  console.log('[Vite Config] Toast-related files:', toasterFiles);
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
    extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'],
  },
  define: {
    global: "globalThis",
  },
}));
