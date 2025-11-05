import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Handle Render.com's unusual directory structure where repo is checked out to /opt/render/project/src
// If __dirname already ends with 'src', don't append it again
const srcPath = __dirname.endsWith('src') 
  ? __dirname 
  : path.resolve(__dirname, 'src');

// Verify the path exists, fallback to __dirname/src if needed
const resolvedSrcPath = existsSync(path.join(srcPath, 'main.tsx'))
  ? srcPath
  : path.resolve(__dirname, 'src');

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
      "@": resolvedSrcPath,
    },
  },
  define: {
    global: "globalThis",
  },
}));
