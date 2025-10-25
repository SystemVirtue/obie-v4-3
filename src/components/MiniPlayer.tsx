/**
 * MiniPlayer Component
 * 
 * Displays a small embedded YouTube player showing the currently playing video.
 * The player is muted, has no controls, and is for visual feedback only.
 * 
 * Features:
 * - Responsive sizing (smaller on mobile)
 * - Vignette overlay for feathered edges
 * - Autoplay but muted (no sound)
 * - No user controls (pointer-events disabled)
 * - Rounded corners with shadow
 */

interface MiniPlayerProps {
  /**
   * The YouTube video ID to display.
   * Format: 11-character YouTube video ID (e.g., "dQw4w9WgXcQ")
   */
  videoId: string;
  
  /**
   * Whether to show the mini player.
   * Typically controlled by user preference in settings.
   */
  showMiniPlayer: boolean;
}

export const MiniPlayer = ({ videoId, showMiniPlayer }: MiniPlayerProps) => {
  // Don't render if showMiniPlayer is false or no video ID
  if (!showMiniPlayer || !videoId) {
    return null;
  }

  return (
    <div className="flex justify-center mb-4 sm:mb-8 px-4">
      <div className="relative w-40 h-24 sm:w-48 sm:h-27 rounded-lg overflow-hidden shadow-2xl">
        {/* Vignette overlay for feathered edges */}
        <div className="absolute inset-0 rounded-lg shadow-[inset_0_0_30px_10px_rgba(0,0,0,0.6)] z-10 pointer-events-none"></div>
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=0&showinfo=0&rel=0&modestbranding=1&iv_load_policy=3&fs=0&disablekb=1`}
          className="w-full h-full border-0"
          allow="autoplay; encrypted-media"
          allowFullScreen={false}
          style={{ pointerEvents: "none" }}
          title="Mini Player"
        />
      </div>
    </div>
  );
};
