import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * PlayerClosedNotification Component
 * 
 * Displays a warning notification when the player window is closed but the
 * player is supposed to be running. Provides a "Reopen Player" button to
 * reinitialize the player window.
 * 
 * Features:
 * - Only shows when player window is closed but isPlayerRunning is true
 * - Fixed positioning at top-right (z-20)
 * - Red theme to indicate warning/error state
 * - Responsive layout (column on mobile, row on desktop)
 * - Reopen button to recover from closed state
 */

interface PlayerClosedNotificationProps {
  /**
   * Reference to the player window object.
   * Used to check if window exists and is not closed.
   */
  playerWindow: Window | null;
  
  /**
   * Whether the player is supposed to be running.
   * Notification only shows if this is true and window is closed.
   */
  isPlayerRunning: boolean;
  
  /**
   * Callback to reinitialize the player window.
   * Called when user clicks "Reopen Player" button.
   */
  onReopenPlayer: () => void | Promise<void>;
}

export const PlayerClosedNotification = ({
  playerWindow,
  isPlayerRunning,
  onReopenPlayer,
}: PlayerClosedNotificationProps) => {
  // Only show if player should be running but window is closed
  const shouldShow = (!playerWindow || playerWindow.closed) && isPlayerRunning;

  if (!shouldShow) {
    return null;
  }

  return (
    <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-20 max-w-[calc(100vw-1rem)] sm:max-w-none">
      <Card className="bg-red-900/80 border-red-400 shadow-lg backdrop-blur-sm">
        <CardContent className="p-2 sm:p-3">
          <div className="flex items-center gap-2 sm:gap-3 flex-col sm:flex-row">
            <div className="text-red-100 font-medium text-xs sm:text-sm text-center sm:text-left">
              ⚠️ Player Window Closed
            </div>
            <Button
              onClick={() => {
                console.log("Reopening player window from notification");
                onReopenPlayer();
              }}
              className="bg-red-600 hover:bg-red-700 text-white text-xs px-2 py-1 sm:px-3 sm:py-1 h-auto w-full sm:w-auto"
            >
              Reopen Player
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
