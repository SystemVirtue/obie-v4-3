/**
 * MiniPlayer Component
 * 
 * Displays an embedded YouTube player showing the currently playing video.
 * Uses YouTube IFrame API for proper event handling and auto-advance.
 * 
 * Features:
 * - Responsive sizing (smaller on mobile)
 * - Vignette overlay for feathered edges
 * - Autoplay with sound (unmuted when main player)
 * - Auto-advances to next song via localStorage communication
 * - No user controls (pointer-events disabled)
 * - Rounded corners with shadow
 */

import { useEffect, useRef } from 'react';

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

  /**
   * Whether this mini player should be used as the main player (full screen)
   * instead of the small mini player overlay.
   */
  isMainPlayer?: boolean;
}

// Declare YouTube IFrame API types
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export const MiniPlayer = ({ videoId, showMiniPlayer, isMainPlayer = false }: MiniPlayerProps) => {
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const currentVideoIdRef = useRef<string>('');

  // Load YouTube IFrame API
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }
  }, []);

  // Initialize player when API is ready
  useEffect(() => {
    if (!showMiniPlayer || !videoId || !containerRef.current) {
      return;
    }

    const initPlayer = () => {
      if (!window.YT || !window.YT.Player) {
        setTimeout(initPlayer, 100);
        return;
      }

      // Destroy existing player if present
      if (playerRef.current) {
        playerRef.current.destroy();
      }

      // Create player div
      const playerDiv = document.createElement('div');
      playerDiv.id = `mini-player-${Date.now()}`;
      containerRef.current?.appendChild(playerDiv);

      playerRef.current = new window.YT.Player(playerDiv, {
        videoId: videoId,
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay: 1,
          controls: 0,
          showinfo: 0,
          rel: 0,
          modestbranding: 1,
          iv_load_policy: 3,
          fs: 0,
          disablekb: 1,
        },
        events: {
          onReady: (event: any) => {
            console.log('[MiniPlayer] Player ready, video:', videoId);
            currentVideoIdRef.current = videoId;
            // Unmute for main player, mute for small overlay
            if (isMainPlayer) {
              event.target.unMute();
              event.target.setVolume(100);
            } else {
              event.target.mute();
            }
            event.target.playVideo();
          },
          onStateChange: (event: any) => {
            const state = event.data;
            console.log('[MiniPlayer] State change:', state, 'for video:', currentVideoIdRef.current);
            
            // YT.PlayerState.ENDED = 0
            if (state === 0) {
              console.log('[MiniPlayer] Video ended, sending status to localStorage');
              
              // Send ended status via localStorage (same as player.html)
              const statusData = {
                status: 'ended',
                title: 'Video ended',
                videoId: currentVideoIdRef.current,
                id: currentVideoIdRef.current,
                timestamp: Date.now()
              };
              
              localStorage.setItem('jukeboxPlayerStatus', JSON.stringify(statusData));
              console.log('[MiniPlayer] Sent ended status:', statusData);
            }
          },
          onError: (event: any) => {
            console.error('[MiniPlayer] Error:', event.data);
            
            // Send error status
            const statusData = {
              status: 'error',
              title: 'Video error',
              videoId: currentVideoIdRef.current,
              id: currentVideoIdRef.current,
              timestamp: Date.now()
            };
            
            localStorage.setItem('jukeboxPlayerStatus', JSON.stringify(statusData));
          }
        }
      });
    };

    initPlayer();

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [videoId, showMiniPlayer, isMainPlayer]);

  // Don't render if showMiniPlayer is false or no video ID
  if (!showMiniPlayer || !videoId) {
    return null;
  }

  // When used as main player (mini player mode active), make it full screen
  // Otherwise use small mini player overlay
  const containerClasses = isMainPlayer
    ? "fixed inset-0 z-0 w-screen h-screen" // Full screen, behind UI
    : "flex justify-center mb-4 sm:mb-8 px-4";

  const playerClasses = isMainPlayer
    ? "w-full h-full" // Fill entire screen
    : "relative w-40 h-24 sm:w-48 sm:h-27 rounded-lg overflow-hidden shadow-2xl";

  return (
    <div className={containerClasses}>
      <div className={playerClasses} ref={containerRef}>
        {/* Vignette overlay for feathered edges (only for mini player) */}
        {!isMainPlayer && (
          <div className="absolute inset-0 rounded-lg shadow-[inset_0_0_30px_10px_rgba(0,0,0,0.6)] z-10 pointer-events-none"></div>
        )}
      </div>
    </div>
  );
};
