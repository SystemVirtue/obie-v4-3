import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { displayManager } from '@/services/displayManager';
import type { DisplayInfo } from '@/types/jukebox';
import { clearUserPreferencesCache } from '@/hooks/useJukeboxState';

interface DisplaySelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDisplay: (displayId: string) => void;
  onAutoOpenPlayer: () => void;
  currentDefaultDisplay: string;
  useFullscreen: boolean;
  isPlayerRunning?: boolean;
}

export const DisplaySelectionDialog: React.FC<DisplaySelectionDialogProps> = ({
  isOpen,
  onClose,
  onSelectDisplay,
  onAutoOpenPlayer,
  currentDefaultDisplay,
  useFullscreen,
  isPlayerRunning = false,
}) => {
  const [displays, setDisplays] = useState<DisplayInfo[]>([]);
  const [selectedDisplay, setSelectedDisplay] = useState<string>(currentDefaultDisplay);
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [currentWindowDisplay, setCurrentWindowDisplay] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadDisplays();
      detectCurrentWindowDisplay();
    }
  }, [isOpen]);

  const loadDisplays = async () => {
    try {
      const availableDisplays = await displayManager.getDisplays();
      setDisplays(availableDisplays);
    } catch (error) {
      console.error('Failed to load displays:', error);
    }
  };

  const detectCurrentWindowDisplay = () => {
    // Detect which display the current window is on
    const currentScreen = {
      left: window.screenX || window.screenLeft || 0,
      top: window.screenY || window.screenTop || 0,
      width: window.screen.width,
      height: window.screen.height,
    };

    // Find the display that matches the current window's screen
    // We'll check if the window position is within a display's bounds
    setTimeout(() => {
      setDisplays(currentDisplays => {
        const matchingDisplay = currentDisplays.find(display => {
          const displayRight = display.left + display.width;
          const displayBottom = display.top + display.height;
          const windowCenterX = currentScreen.left + (window.innerWidth / 2);
          const windowCenterY = currentScreen.top + (window.innerHeight / 2);

          // Check if window center is within display bounds
          return windowCenterX >= display.left && 
                 windowCenterX <= displayRight && 
                 windowCenterY >= display.top && 
                 windowCenterY <= displayBottom;
        });

        if (matchingDisplay) {
          setCurrentWindowDisplay(matchingDisplay.id);
        }

        return currentDisplays;
      });
    }, 100); // Small delay to ensure window position is accurate
  };

  const handleIdentifyDisplays = async () => {
    setIsIdentifying(true);
    try {
      // This will show display IDs for 3 seconds then auto-close
      await displayManager.identifyDisplays();
    } catch (error) {
      console.error('Failed to identify displays:', error);
    } finally {
      setIsIdentifying(false);
    }
  };

  const handleDisplaySelect = (displayId: string) => {
    setSelectedDisplay(displayId);
  };

  const handleContinue = () => {
    // Find the selected display information
    const selectedDisplayInfo = displays.find(d => d.id === selectedDisplay);

    if (selectedDisplayInfo) {
      // Save complete player display configuration to localStorage
      const playerConfig = {
        displayId: selectedDisplay,
        fullscreen: useFullscreen,
        position: {
          x: selectedDisplayInfo.left,
          y: selectedDisplayInfo.top,
          width: selectedDisplayInfo.width,
          height: selectedDisplayInfo.height,
        },
      };

      // Update localStorage directly
      try {
        const existingPrefs = JSON.parse(localStorage.getItem('USER_PREFERENCES') || '{}');
        existingPrefs.userDefaultPlayerDisplay = playerConfig;
        existingPrefs.selectedDisplay = selectedDisplay;
        existingPrefs.showDisplaySelectionDialogOnStartup = false; // Disable dialog for future startups

        localStorage.setItem('USER_PREFERENCES', JSON.stringify(existingPrefs));
        console.log('[DisplaySelection] Saved new default player display configuration:', playerConfig);
        
        // Clear the cache to ensure changes are reflected on page refresh
        clearUserPreferencesCache();
      } catch (error) {
        console.error('[DisplaySelection] Failed to save configuration:', error);
      }

      // Call the original callback
      onSelectDisplay(selectedDisplay);

      // Close dialog
      onClose();

      // Refresh the page to apply changes
      setTimeout(() => {
        window.location.reload();
      }, 500);
    }
  };

  const handleAutoOpen = () => {
    onAutoOpenPlayer();
    onClose();
  };

  // Calculate button positions based on display arrangement
  const getDisplayButtonStyle = (display: DisplayInfo) => {
    // Scale down to 1:10 (divide by 10)
    const scaledWidth = Math.max(display.width / 10, 50); // Minimum 50px
    const scaledHeight = Math.max(display.height / 10, 50); // Minimum 50px

    // Position relative to other displays (scaled)
    const baseLeft = 50; // Base left margin
    const baseTop = 150; // Base top margin

    // Calculate relative position (scaled down)
    const relativeLeft = display.left / 10;
    const relativeTop = display.top / 10;

    return {
      width: scaledWidth,
      height: scaledHeight,
      left: baseLeft + relativeLeft,
      top: baseTop + relativeTop,
      position: 'absolute' as const,
      border: `4px solid ${display.id === currentDefaultDisplay ? '#22c55e' : '#ef4444'}`,
      backgroundColor: display.id === selectedDisplay ? '#3b82f6' : '#1f2937',
      color: 'white',
      fontSize: '12px',
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      borderRadius: '4px',
      padding: '4px',
      textAlign: 'center' as const,
    };
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Select Video Player Display</DialogTitle>
          <DialogDescription>
            Video Player Default Display is currently [{currentDefaultDisplay}].
            {isPlayerRunning && (
              <span className="text-amber-600 font-semibold block mt-2">
                ⚠️ A video is currently playing. Changing displays will interrupt playback.
              </span>
            )}
            {!isPlayerRunning && (
              <>To open the Video Player, choose from the options below:</>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* Display buttons container */}
          <div className="relative mb-8" style={{ height: '400px', border: '1px solid #374151', borderRadius: '8px' }}>
            {displays.map((display, index) => (
              <button
                key={display.id}
                style={getDisplayButtonStyle(display)}
                onClick={() => handleDisplaySelect(display.id)}
                className="hover:opacity-80 transition-opacity"
              >
                <div className="font-bold text-xs">
                  Display #{index + 1}
                </div>
                <div className="text-xs">
                  {display.id}
                </div>
                <div className="text-xs">
                  {display.width}x{display.height}
                </div>
                {display.id === currentDefaultDisplay && (
                  <div className="text-xs font-bold text-green-300 mt-1">
                    (CURRENT DEFAULT)
                  </div>
                )}
                {display.id === currentWindowDisplay && (
                  <div className="text-xs font-bold text-blue-300 mt-1">
                    (THIS DISPLAY)
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-4">
            <div className="flex gap-4 justify-center">
              <Button
                onClick={handleIdentifyDisplays}
                disabled={isIdentifying}
                variant="outline"
                className="min-w-[200px]"
              >
                {isIdentifying ? 'Identifying...' : 'Identify All Display #\'s'}
              </Button>

              {isPlayerRunning ? (
                <>
                  <Button
                    onClick={onClose}
                    variant="outline"
                    className="min-w-[200px]"
                  >
                    Cancel (Keep Current Playback)
                  </Button>
                  <Button
                    onClick={handleContinue}
                    variant="destructive"
                    className="min-w-[200px]"
                  >
                    Change Display (Interrupt Playback)
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    onClick={handleContinue}
                    className="min-w-[200px]"
                  >
                    Open Player (Use Current Selection)
                  </Button>

                  <Button
                    onClick={handleAutoOpen}
                    variant="secondary"
                    className="min-w-[200px]"
                  >
                    Auto Open Player
                  </Button>
                </>
              )}
            </div>

            <div className="text-center text-sm text-gray-600">
              {isPlayerRunning
                ? "Select 'Cancel' to keep current playback, or 'Change Display' to interrupt and switch displays."
                : "Select from the available displays above, or to use default just select 'Continue'"
              }
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};