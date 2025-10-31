import { Card, CardContent } from "@/components/ui/card";

/**
 * NowPlayingTicker Component
 *
 * Displays the currently playing song in a fixed-position card at the top-left
 * of the screen with a yellow border and truncated text.
 *
 * Features:
 * - Responsive sizing for mobile and desktop
 * - Fixed positioning with high z-index (z-20)
 * - Yellow border for visibility
 * - Text truncation to prevent overflow
 * - Semi-transparent background with blur effect
 */

interface NowPlayingTickerProps {
  /**
   * The title/name of the currently playing song.
   * Displays "Loading..." or similar status messages when no song is playing.
   */
  currentlyPlaying: string;
}

export const NowPlayingTicker = ({ currentlyPlaying }: NowPlayingTickerProps) => {
  return (
    <div className="absolute top-2 left-2 sm:top-4 sm:left-4 z-20 max-w-[calc(100vw-1rem)] sm:max-w-none">
      <Card className="bg-black/60 border-yellow-400 shadow-lg backdrop-blur-sm">
        <CardContent className="p-2 sm:p-3">
          <div className="text-amber-100 font-bold text-sm sm:text-lg w-[calc(100vw-4rem)] sm:w-[30.7rem] truncate">
            Now Playing: {currentlyPlaying}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

/**
 * PlayerStatusDisplay Component
 *
 * Displays the current player status in a fixed-position card at the top-right
 * of the screen with status information from the iframe player.
 */

interface PlayerStatusDisplayProps {
  playerStatus: { state: number; description: string; timestamp: number } | null;
  isPlayerRunning: boolean;
  playerWindow: Window | null;
}

export const PlayerStatusDisplay = ({ playerStatus, isPlayerRunning, playerWindow }: PlayerStatusDisplayProps) => {
  const getStatusColor = (state: number) => {
    switch (state) {
      case -1: return "border-gray-400"; // Unstarted
      case 0: return "border-red-400"; // Closed/Ended
      case 1: return "border-green-400"; // Playing
      case 2: return "border-yellow-400"; // Paused
      case 3: return "border-blue-400"; // Buffering
      case 4: return "border-blue-400"; // Buffering
      case 5: return "border-purple-400"; // Cued/Error
      default: return "border-gray-400";
    }
  };

  // Determine the actual player status based on available information
  const getActualPlayerStatus = () => {
    if (playerStatus) {
      return playerStatus;
    }

    // If no playerStatus but we have player state info, derive status
    if (isPlayerRunning) {
      if (playerWindow && !playerWindow.closed) {
        return { state: 1, description: "Playing", timestamp: Date.now() };
      } else {
        return { state: 0, description: "Window Closed", timestamp: Date.now() };
      }
    }

    return { state: -1, description: "Not Started", timestamp: Date.now() };
  };

  const actualStatus = getActualPlayerStatus();

  return (
    <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-20">
      <Card className={`bg-black/60 ${getStatusColor(actualStatus.state)} shadow-lg backdrop-blur-sm`}>
        <CardContent className="p-2 sm:p-3">
          <div className="text-white font-bold text-sm sm:text-base">
            Player Status: {actualStatus.state} {actualStatus.description}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
