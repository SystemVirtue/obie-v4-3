import type { DisplayInfo } from "@/types/jukebox";

interface DisplayPreference {
  preferExternal: boolean;
  fullscreen: boolean;
  rememberedChoice: boolean;
  lastUsedDisplay?: string;
}

/**
 * CHANGELOG - 2025-01-XX
 * ADDED: Player window position/size tracking
 */
interface PlayerWindowState {
  position: { x: number; y: number };
  size: { width: number; height: number };
  displayId: string;
  isFullscreen: boolean;
  lastUpdated: string;
}

/**
 * DisplayManager - Handles external display detection and window positioning
 *
 * Features:
 * - Automatic detection of external displays using modern Screen API
 * - User preference management for display selection
 * - Fullscreen mode support with fallback options
 * - Browser compatibility with graceful degradation
 *
 * Usage:
 * 1. Call getRecommendedDisplayConfig() to get optimal display setup
 * 2. Use getBestExternalDisplay() to check for external monitors
 * 3. Generate window features with generateWindowFeatures()
 * 4. Save user preferences with saveDisplayPreference()
 */
class DisplayManager {
  private cachedDisplays: DisplayInfo[] = [];
  private lastDetectionTime = 0;
  private readonly CACHE_DURATION = 5000; // 5 seconds
  private playerWindow: Window | null = null;

  // Check if the browser supports multi-screen API (Window Management API)
  isMultiScreenSupported(): boolean {
    return (
      'getScreenDetails' in window ||
      ('getScreens' in window && typeof (window as any).getScreens === 'function')
    );
  }

  // Detect available displays using Window Management API
  async detectDisplays(): Promise<DisplayInfo[]> {
    try {
      // Check for Window Management API (previously called Screen API)
      if ('getScreenDetails' in window) {
        console.log('[DisplayManager] Using Window Management API');
        const screenDetails = await (window as any).getScreenDetails();
        
        const displays: DisplayInfo[] = screenDetails.screens.map(
          (screen: any, index: number) => ({
            id: `display-${index}`,
            name: screen.label || `Display ${index + 1}`,
            width: screen.availWidth || screen.width,
            height: screen.availHeight || screen.height,
            left: screen.availLeft || screen.left,
            top: screen.availTop || screen.top,
            isPrimary: screen.isPrimary || false,
            isInternal: screen.isInternal || false,
          }),
        );

        console.log('[DisplayManager] Detected displays:', displays);
        this.cachedDisplays = displays;
        this.lastDetectionTime = Date.now();
        return displays;
      }
      
      // Fallback: Try legacy getScreens API
      if ('getScreens' in window && typeof (window as any).getScreens === 'function') {
        console.log('[DisplayManager] Using legacy getScreens API');
        const screens = await (window as any).getScreens();

        const displays: DisplayInfo[] = screens.map(
          (screen: any, index: number) => ({
            id: `display-${index}`,
            name: screen.label || `Display ${index + 1}`,
            width: screen.width,
            height: screen.height,
            left: screen.left,
            top: screen.top,
            isPrimary: screen.isPrimary || false,
            isInternal: screen.isInternal || false,
          }),
        );

        console.log('[DisplayManager] Detected displays (legacy):', displays);
        this.cachedDisplays = displays;
        this.lastDetectionTime = Date.now();
        return displays;
      }

      // Final fallback: Use window.screen
      console.log('[DisplayManager] Falling back to window.screen');
      return [
        {
          id: "primary",
          name: "Primary Display",
          width: window.screen.availWidth || window.screen.width,
          height: window.screen.availHeight || window.screen.height,
          left: 0,
          top: 0,
          isPrimary: true,
          isInternal: true,
        },
      ];
    } catch (error) {
      console.error('[DisplayManager] Error detecting displays:', error);
      // Fallback to current screen
      return [
        {
          id: "primary",
          name: "Primary Display",
          width: window.screen.availWidth || window.screen.width,
          height: window.screen.availHeight || window.screen.height,
          left: 0,
          top: 0,
          isPrimary: true,
          isInternal: true,
        },
      ];
    }
  }

  // Get cached displays if recent, otherwise detect
  async getDisplays(): Promise<DisplayInfo[]> {
    const now = Date.now();
    if (
      this.cachedDisplays.length > 0 &&
      now - this.lastDetectionTime < this.CACHE_DURATION
    ) {
      return this.cachedDisplays;
    }
    return this.detectDisplays();
  }

  // Find the best external display for video
  async getBestExternalDisplay(): Promise<DisplayInfo | null> {
    const displays = await this.getDisplays();

    // Find the largest external display
    const externalDisplays = displays.filter(
      (d) => !d.isPrimary && !d.isInternal,
    );

    if (externalDisplays.length === 0) {
      return null;
    }

    // Sort by screen area (width * height) - largest first
    externalDisplays.sort((a, b) => b.width * b.height - a.width * a.height);

    return externalDisplays[0];
  }

  // Generate window features string for opening popup
  generateWindowFeatures(
    display: DisplayInfo,
    fullscreen: boolean = false,
  ): string {
    if (fullscreen) {
      return `width=${display.width},height=${display.height},left=${display.left},top=${display.top},scrollbars=no,menubar=no,toolbar=no,location=no,status=no,resizable=no`;
    } else {
      // Use 100% of display size for windowed mode (matches user requirement)
      const width = display.width;
      const height = display.height;
      const left = display.left;
      const top = display.top;

      return `width=${width},height=${height},left=${left},top=${top},scrollbars=no,menubar=no,toolbar=no,location=no,status=no,resizable=yes`;
    }
  }

  // Check if user has permission for the Window Management API
  async requestScreenPermission(): Promise<boolean> {
    try {
      if (!this.isMultiScreenSupported()) {
        return true; // No permission needed for single screen
      }

      // Request permission for Window Management API
      if ('getScreenDetails' in window) {
        const screenDetails = await (window as any).getScreenDetails();
        return screenDetails.screens.length > 0;
      }
      
      // Fallback to legacy API
      if ('getScreens' in window) {
        const screens = await (window as any).getScreens();
        return screens.length > 0;
      }
      
      return true;
    } catch (error) {
      console.warn(
        '[DisplayManager] Permission not granted or API not available:',
        error,
      );
      return false;
    }
  }

  // Get display preference from localStorage
  getDisplayPreference(): DisplayPreference {
    try {
      const stored = localStorage.getItem("displayPreference");
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error("Error reading display preference:", error);
    }

    // Default preference
    return {
      preferExternal: true,
      fullscreen: true,
      rememberedChoice: false,
    };
  }

  // Save display preference to localStorage
  saveDisplayPreference(preference: DisplayPreference): void {
    try {
      localStorage.setItem("displayPreference", JSON.stringify(preference));
    } catch (error) {
      console.error("Error saving display preference:", error);
    }
  }

  // Get the recommended display configuration
  async getRecommendedDisplayConfig(): Promise<{
    display: DisplayInfo;
    useFullscreen: boolean;
    requiresPermission: boolean;
  }> {
    const displays = await this.getDisplays();
    const preference = this.getDisplayPreference();
    const externalDisplay = await this.getBestExternalDisplay();

    // If external display available and preferred
    if (externalDisplay && preference.preferExternal) {
      return {
        display: externalDisplay,
        useFullscreen: preference.fullscreen,
        requiresPermission: true,
      };
    }

    // Fall back to primary display
    const primaryDisplay = displays.find((d) => d.isPrimary) || displays[0];
    return {
      display: primaryDisplay,
      useFullscreen: false,
      requiresPermission: false,
    };
  }

  // Close any existing player window
  closePlayerWindow(): void {
    if (this.playerWindow && !this.playerWindow.closed) {
      console.log('[DisplayManager] Closing existing player window');
      this.playerWindow.close();
    }
    this.playerWindow = null;
  }

  // Open player on specific display with fullscreen support
  async openPlayerOnDisplay(
    display: DisplayInfo,
    fullscreen: boolean = true
  ): Promise<Window | null> {
    try {
      // Close any existing player window first
      this.closePlayerWindow();

      const features = this.generateWindowFeatures(display, fullscreen);
      const playerUrl = `${window.location.origin}/player.html`;
      
      console.log('[DisplayManager] Opening player on:', display.name);
      console.log('[DisplayManager] Window features:', features);

      const newWindow = window.open(playerUrl, 'jukebox-player', features);
      
      if (!newWindow) {
        console.error('[DisplayManager] Failed to open window - popup blocked?');
        return null;
      }

      this.playerWindow = newWindow;

      // Move window to target display using Window Management API
      if (this.isMultiScreenSupported()) {
        try {
          // Wait for window to load before moving
          newWindow.addEventListener('load', () => {
            if ('moveTo' in newWindow && 'resizeTo' in newWindow) {
              newWindow.moveTo(display.left, display.top);
              newWindow.resizeTo(display.width, display.height);
              console.log(`[DisplayManager] Moved window to ${display.name} at (${display.left}, ${display.top})`);
            }
          }, { once: true });
        } catch (error) {
          console.warn('[DisplayManager] Could not move window to display:', error);
        }
      }

      // Request fullscreen after window loads
      if (fullscreen) {
        newWindow.addEventListener('load', () => {
          setTimeout(() => {
            newWindow.document.documentElement.requestFullscreen?.({
              navigationUI: 'hide'
            }).catch((err) => {
              console.warn('[DisplayManager] Fullscreen failed:', err);
            });
          }, 500);
        });
      }

      return newWindow;
    } catch (error) {
      console.error('[DisplayManager] Error opening player:', error);
      return null;
    }
  }

  // Check if player window is still open
  isPlayerWindowOpen(): boolean {
    return this.playerWindow !== null && !this.playerWindow.closed;
  }

  // Get reference to player window
  getPlayerWindow(): Window | null {
    if (this.playerWindow && this.playerWindow.closed) {
      this.playerWindow = null;
    }
    return this.playerWindow;
  }

  /**
   * CHANGELOG - 2025-01-XX
   * ADDED: Window position/size persistence methods
   */
  
  // Save player window position and size
  savePlayerWindowState(window: Window, displayId: string): void {
    try {
      const state: PlayerWindowState = {
        position: { 
          x: window.screenX || window.screenLeft || 0, 
          y: window.screenY || window.screenTop || 0
        },
        size: { 
          width: window.outerWidth || 800, 
          height: window.outerHeight || 600
        },
        displayId,
        isFullscreen: !!window.document.fullscreenElement,
        lastUpdated: new Date().toISOString()
      };
      
      localStorage.setItem('PLAYER_WINDOW_STATE', JSON.stringify(state));
      console.log('[DisplayManager] Saved window state:', state);
    } catch (error) {
      console.error('[DisplayManager] Failed to save window state:', error);
    }
  }

  // Save intended window state for a display (used when user selects default display)
  saveDisplayWindowState(display: DisplayInfo, fullscreen: boolean): void {
    try {
      let width: number;
      let height: number;
      let x: number;
      let y: number;

      if (fullscreen) {
        width = display.width;
        height = display.height;
        x = display.left;
        y = display.top;
      } else {
        // Use 100% of display size for windowed mode (matches user requirement)
        width = display.width;
        height = display.height;
        x = display.left;
        y = display.top;
      }

      const state: PlayerWindowState = {
        position: { x, y },
        size: { width, height },
        displayId: display.id,
        isFullscreen: fullscreen,
        lastUpdated: new Date().toISOString()
      };
      
      localStorage.setItem('PLAYER_WINDOW_STATE', JSON.stringify(state));
      console.log('[DisplayManager] Saved display-based window state:', state);
    } catch (error) {
      console.error('[DisplayManager] Failed to save display-based window state:', error);
    }
  }

  // Get saved player window position and size
  getPlayerWindowState(): PlayerWindowState | null {
    try {
      const stored = localStorage.getItem('PLAYER_WINDOW_STATE');
      if (!stored) return null;
      
      const state = JSON.parse(stored) as PlayerWindowState;
      
      // Verify state is not too old (>7 days)
      const lastUpdated = new Date(state.lastUpdated);
      const daysSinceUpdate = (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSinceUpdate > 7) {
        console.log('[DisplayManager] Window state is stale, ignoring');
        return null;
      }
      
      return state;
    } catch (error) {
      console.error('[DisplayManager] Failed to load window state:', error);
      return null;
    }
  }

  // Clear saved window state
  clearPlayerWindowState(): void {
    try {
      localStorage.removeItem('PLAYER_WINDOW_STATE');
      console.log('[DisplayManager] Cleared window state');
    } catch (error) {
      console.error('[DisplayManager] Failed to clear window state:', error);
    }
  }

  // Identify displays by showing display IDs on each screen
  async identifyDisplays(): Promise<void> {
    try {
      const displays = await this.getDisplays();
      const identifyWindows: Window[] = [];

      // Create identification windows on each display
      for (let i = 0; i < displays.length; i++) {
        const display = displays[i];

        // Calculate window size: screenwidth/3 x screenheight/3
        const windowWidth = Math.floor(display.width / 3);
        const windowHeight = Math.floor(display.height / 3);

        // Calculate window position to center on the display
        const centerX = display.left + (display.width / 2) - (windowWidth / 2);
        const centerY = display.top + (display.height / 2) - (windowHeight / 2);

        const features = `width=${windowWidth},height=${windowHeight},left=${centerX},top=${centerY},resizable=no,scrollbars=no,status=no,toolbar=no,menubar=no`;

        const identifyWindow = window.open(
          'about:blank',
          `display-identify-${i}`,
          features
        );

        if (identifyWindow) {
          identifyWindows.push(identifyWindow);

          // Write identification content with large font
          identifyWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>Display ${i + 1}</title>
              <style>
                body {
                  margin: 0;
                  padding: 0;
                  background: #000;
                  color: #fff;
                  font-family: Arial, sans-serif;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  height: 100vh;
                  text-align: center;
                  font-size: 66px;
                  font-weight: bold;
                }
              </style>
            </head>
            <body>
              #${i + 1}
            </body>
            </html>
          `);

          identifyWindow.document.close();
        }
      }

      // Return a promise that resolves when the identification is complete
      return new Promise((resolve) => {
        const closeWindows = () => {
          identifyWindows.forEach(win => {
            if (win && !win.closed) {
              win.close();
            }
          });
          resolve();
        };

        // Close windows after 3 seconds
        setTimeout(closeWindows, 3000);
      });

    } catch (error) {
      console.error('[DisplayManager] Failed to identify displays:', error);
      throw error;
    }
  }
}

export const displayManager = new DisplayManager();
export type { DisplayInfo, DisplayPreference, PlayerWindowState };
