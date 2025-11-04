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
  const fadeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const playerElementRef = useRef<HTMLDivElement>(null);
  const isPlayerReadyRef = useRef<boolean>(false);
  const pendingVideoIdRef = useRef<string>('');

  // Load YouTube IFrame API
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }
  }, []);

  // Initialize player when API is ready (only once)
  useEffect(() => {
    if (!showMiniPlayer || !containerRef.current) {
      return;
    }

    const initPlayer = () => {
      if (!window.YT || !window.YT.Player) {
        setTimeout(initPlayer, 100);
        return;
      }

      // Only create player if it doesn't exist
      if (playerRef.current) {
        return;
      }

      // Create player div
      const playerDiv = document.createElement('div');
      playerDiv.id = `mini-player-${Date.now()}`;
      containerRef.current?.appendChild(playerDiv);

      playerRef.current = new window.YT.Player(playerDiv, {
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
            console.log('[MiniPlayer] Player ready');
            isPlayerReadyRef.current = true;
            
            // Unmute for main player, mute for small overlay
            if (isMainPlayer) {
              event.target.unMute();
              event.target.setVolume(100);
            } else {
              event.target.mute();
            }

            // Load pending video if one was queued
            if (pendingVideoIdRef.current) {
              console.log('[MiniPlayer] Loading pending video:', pendingVideoIdRef.current);
              const videoToLoad = pendingVideoIdRef.current;
              pendingVideoIdRef.current = '';
              currentVideoIdRef.current = videoToLoad;
              
              event.target.loadVideoById({
                videoId: videoToLoad,
                startSeconds: 0
              });
            }
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
              
              localStorage.setItem('jukeboxStatus', JSON.stringify(statusData));
              console.log('[MiniPlayer] Sent ended status:', statusData);
            }
            // YT.PlayerState.PLAYING = 1
            else if (state === 1) {
              console.log('[MiniPlayer] Video playing:', currentVideoIdRef.current);
            }
          },
          onError: (event: any) => {
            const errorCode = event.data;
            const errorMessages: { [key: number]: string } = {
              2: 'Invalid video ID',
              5: 'HTML5 player error',
              100: 'Video not found',
              101: 'Video not allowed',
              150: 'Video not allowed'
            };
            
            const errorMessage = errorMessages[errorCode] || `Unknown error (${errorCode})`;
            console.error('[MiniPlayer] Error:', errorCode, '-', errorMessage, 'Video ID:', currentVideoIdRef.current);
            
            // Send error status to trigger skip
            const statusData = {
              status: 'error',
              title: errorMessage,
              videoId: currentVideoIdRef.current,
              id: currentVideoIdRef.current,
              timestamp: Date.now()
            };
            
            localStorage.setItem('jukeboxStatus', JSON.stringify(statusData));
            console.log('[MiniPlayer] Sent error status to trigger auto-skip');
          }
        }
      });
    };

    initPlayer();

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
        isPlayerReadyRef.current = false;
        pendingVideoIdRef.current = '';
      }
    };
  }, [showMiniPlayer, isMainPlayer]);

  // Load new video when videoId changes
  useEffect(() => {
    if (!showMiniPlayer || !videoId || !playerRef.current) {
      return;
    }

    // Validate video ID format (YouTube IDs are typically 11 characters)
    if (!videoId || videoId.length < 5) {
      console.error('[MiniPlayer] Invalid video ID format:', videoId);
      return;
    }

    console.log('[MiniPlayer] Loading new video:', videoId);

    // Clear any ongoing fade when new video loads
    if (fadeTimerRef.current) {
      clearInterval(fadeTimerRef.current);
      fadeTimerRef.current = null;
      console.log('[MiniPlayer] Cleared ongoing fade for new video');
    }

    // Reset opacity for new video
    if (playerElementRef.current) {
      playerElementRef.current.style.opacity = '1';
    }

    // Check if player is ready
    if (!isPlayerReadyRef.current) {
      console.log('[MiniPlayer] Player not ready yet, queuing video:', videoId);
      pendingVideoIdRef.current = videoId;
      return;
    }

    // Load the new video
    currentVideoIdRef.current = videoId;
    try {
      if (playerRef.current.loadVideoById) {
        playerRef.current.loadVideoById({
          videoId: videoId,
          startSeconds: 0
        });
        console.log('[MiniPlayer] Video loaded successfully');
      }
    } catch (error) {
      console.error('[MiniPlayer] Error loading video:', error);
    }
  }, [videoId, showMiniPlayer]);

  // Listen for skip/fade commands via localStorage
  useEffect(() => {
    if (!showMiniPlayer || !isMainPlayer) {
      return;
    }

    const fadeOutAndComplete = (statusType: string) => {
      console.log('[MiniPlayer] Fading out with volume and opacity...');
      
      // Clear any existing fade timer
      if (fadeTimerRef.current) {
        clearInterval(fadeTimerRef.current);
        fadeTimerRef.current = null;
      }

      if (!playerRef.current || !playerElementRef.current) {
        console.warn('[MiniPlayer] Player not ready for fade');
        return;
      }

      const startVolume = playerRef.current.getVolume();
      const fadeSteps = 40; // 40 steps * 50ms = 2 seconds
      const fadeInterval = 50; // ms per step
      let currentStep = 0;

      fadeTimerRef.current = setInterval(() => {
        currentStep++;
        const progress = currentStep / fadeSteps;

        // Fade volume from startVolume to 0
        const newVolume = startVolume * (1 - progress);
        if (playerRef.current) {
          playerRef.current.setVolume(Math.max(0, newVolume));
        }

        // Fade opacity from 1 to 0
        const newOpacity = 1 - progress;
        if (playerElementRef.current) {
          playerElementRef.current.style.opacity = Math.max(0, newOpacity).toString();
        }

        if (currentStep >= fadeSteps) {
          if (fadeTimerRef.current) {
            clearInterval(fadeTimerRef.current);
            fadeTimerRef.current = null;
          }
          console.log('[MiniPlayer] Fade complete, pausing video and sending status:', statusType);
          
          if (playerRef.current) {
            playerRef.current.pauseVideo();
            playerRef.current.setVolume(startVolume); // Restore volume for next song
          }

          // Send status via localStorage
          const statusData = {
            status: statusType,
            title: statusType === 'fadeComplete' ? 'Fade complete' : 'Skip complete',
            videoId: currentVideoIdRef.current,
            id: currentVideoIdRef.current,
            timestamp: Date.now()
          };
          
          localStorage.setItem('jukeboxStatus', JSON.stringify(statusData));
          currentVideoIdRef.current = '';
          console.log('[MiniPlayer] Fade cleanup complete, ready for next video');
        }
      }, fadeInterval);
    };

    const fadeInAndComplete = () => {
      console.log('[MiniPlayer] Fading in with volume and opacity...');
      
      // Clear any existing fade timer
      if (fadeTimerRef.current) {
        clearInterval(fadeTimerRef.current);
        fadeTimerRef.current = null;
      }

      if (!playerRef.current || !playerElementRef.current) {
        return;
      }

      const targetVolume = 100;
      const fadeSteps = 20; // 20 steps * 50ms = 1 second (faster fade in)
      const fadeInterval = 50;
      let currentStep = 0;

      fadeTimerRef.current = setInterval(() => {
        currentStep++;
        const progress = currentStep / fadeSteps;

        // Fade volume from 0 to targetVolume
        const newVolume = targetVolume * progress;
        if (playerRef.current) {
          playerRef.current.setVolume(Math.min(targetVolume, newVolume));
        }

        // Fade opacity from 0 to 1
        const newOpacity = progress;
        if (playerElementRef.current) {
          playerElementRef.current.style.opacity = Math.min(1, newOpacity).toString();
        }

        if (currentStep >= fadeSteps) {
          if (fadeTimerRef.current) {
            clearInterval(fadeTimerRef.current);
            fadeTimerRef.current = null;
          }
          console.log('[MiniPlayer] Fade in complete');
        }
      }, fadeInterval);
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'jukeboxCommand' && e.newValue) {
        try {
          const command = JSON.parse(e.newValue);
          console.log('[MiniPlayer] Received command:', command.action);

          switch (command.action) {
            case 'fadeOutAndBlack':
              fadeOutAndComplete('skipComplete');
              break;
            case 'fadeOut':
              fadeOutAndComplete('fadeComplete');
              break;
            case 'pause':
              fadeOutAndComplete('pauseComplete');
              break;
            case 'resume':
              if (playerRef.current) {
                playerRef.current.playVideo();
                fadeInAndComplete();
              }
              break;
          }
        } catch (error) {
          console.error('[MiniPlayer] Error parsing command:', error);
        }
      }
    };

    // Poll for localStorage changes (storage events don't fire in same window)
    let lastCommand = localStorage.getItem('jukeboxCommand');
    const pollInterval = setInterval(() => {
      const currentCommand = localStorage.getItem('jukeboxCommand');
      if (currentCommand !== lastCommand) {
        lastCommand = currentCommand;
        if (currentCommand) {
          // Simulate storage event for polling-detected changes
          handleStorageChange({
            key: 'jukeboxCommand',
            newValue: currentCommand,
            oldValue: null,
            url: window.location.href,
            storageArea: localStorage,
          } as StorageEvent);
        }
      }
    }, 100); // Check every 100ms for responsiveness

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(pollInterval);
      if (fadeTimerRef.current) {
        clearInterval(fadeTimerRef.current);
        fadeTimerRef.current = null;
      }
    };
  }, [showMiniPlayer, isMainPlayer]);

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
      <div 
        className={playerClasses} 
        ref={(el) => {
          if (el) {
            containerRef.current = el;
            playerElementRef.current = el;
            // Set initial opacity and transition
            el.style.opacity = '1';
            el.style.transition = 'opacity 0.05s ease-out';
          }
        }}
      >
        {/* Vignette overlay for feathered edges (only for mini player) */}
        {!isMainPlayer && (
          <div className="absolute inset-0 rounded-lg shadow-[inset_0_0_30px_10px_rgba(0,0,0,0.6)] z-10 pointer-events-none"></div>
        )}
      </div>
    </div>
  );
};
