import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initializeMigrations } from './services/localStorage/migrations';

/**
 * CHANGELOG - Phase 4 Integration
 * ADDED: Automatic migration initialization on app startup
 */
// Initialize migrations before app starts
console.log('[Main] Starting migrations...');
initializeMigrations()
  .then((result) => {
    if (result.success) {
      console.log('[Main] Migrations complete:', result.migrationsRun);
    } else {
      console.error('[Main] Migrations failed:', result.errors);
    }
  })
  .catch((error) => {
    console.error('[Main] Migration initialization error:', error);
  })
  .finally(() => {
    // Render app after migrations
    createRoot(document.getElementById("root")!).render(<App />);
  });
