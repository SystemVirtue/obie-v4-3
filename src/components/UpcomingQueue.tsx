import { Card, CardContent } from "@/components/ui/card";

/**
 * UpcomingQueue Component
 * 
 * Displays a scrolling ticker of upcoming songs at the bottom of the screen.
 * Shows both priority queue items and regular playlist songs in order.
 * 
 * Features:
 * - Fixed position at bottom of screen
 * - Scrolling marquee animation
 * - Numbered list of upcoming songs
 * - Responsive text sizing
 * - Semi-transparent black background
 * - Test mode indicator (if enabled)
 */

interface UpcomingQueueProps {
  /**
   * Array of song titles to display in the queue.
   * Priority queue songs are prefixed with "PRIORITY:" and will be displayed in white.
   * Should be pre-formatted and cleaned (e.g., parentheses removed).
   */
  upcomingTitles: string[];
  
  /**
   * Whether test mode is enabled.
   * Shows a yellow indicator above the ticker if true.
   */
  testMode?: boolean;
}

export const UpcomingQueue = ({ upcomingTitles, testMode = false }: UpcomingQueueProps) => {
  return (
    <>
      {/* Test Mode Indicator - positioned above Coming Up ticker */}
      {testMode && (
        <div className="fixed bottom-16 left-0 right-0 flex justify-center z-30">
          <Card className="bg-yellow-600/90 border-yellow-400 backdrop-blur-sm">
            <CardContent className="p-2 px-4">
              <div className="text-yellow-100 font-bold text-lg">
                TEST MODE ON - 20 Second Videos
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Coming Up Ticker - Responsive bottom ticker */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/80 text-amber-200 py-1 sm:py-2 overflow-hidden">
        <div
          className="whitespace-nowrap animate-marquee-fast"
          key={`upcoming-${upcomingTitles.length}-${upcomingTitles[0] || ""}`}
        >
          <span className="text-sm sm:text-lg font-bold">COMING UP: </span>
          {upcomingTitles.map((title, index) => {
            const isPriority = title.startsWith('PRIORITY:');
            const displayTitle = isPriority ? title.replace('PRIORITY:', '') : title;
            return (
              <span
                key={`${index}-${title}`}
                className={`text-sm sm:text-lg ${isPriority ? 'text-white' : 'text-amber-200'}`}
                style={{ margin: '0 2rem' }} // Increased spacing between songs
              >
                {displayTitle}
              </span>
            );
          })}
        </div>
      </div>
    </>
  );
};
