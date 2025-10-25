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
