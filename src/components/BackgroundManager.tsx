
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { BackgroundFile, BackgroundQueueItem, BackgroundSettings } from '@/types/jukebox';

const DEFAULT_BACKGROUND: BackgroundFile = {
  id: 'default-black',
  name: 'Default (Black)',
  url: '',
  type: 'image',
};

// Props for queue-based background management
interface QueueBackgroundManagerProps {
  backgrounds: BackgroundFile[];
  backgroundQueue: BackgroundQueueItem[];
  backgroundSettings: BackgroundSettings;
  onBackgroundQueueIndexChange: (index: number) => void;
  backgroundQueueIndex: number;
  bgVisualMode: 'random' | 'images-only' | 'videos-only' | 'custom-queue';
}

// Props for selection-based background management
interface SelectionBackgroundManagerProps {
  backgrounds: BackgroundFile[];
  selectedBackground: string;
  cycleBackgrounds: boolean;
  backgroundCycleIndex: number;
  bounceVideos: boolean;
  onBackgroundCycleIndexChange: (index: number) => void;
  onSelectedBackgroundChange: (id: string) => void;
  backgroundSettings?: BackgroundSettings; // Optional for selection mode
  bgVisualMode: 'random' | 'images-only' | 'videos-only' | 'custom-queue';
}

// Union type for both modes
type BackgroundManagerProps = QueueBackgroundManagerProps | SelectionBackgroundManagerProps;

export const useBackgroundManager = (props: BackgroundManagerProps) => {
  const cycleIntervalRef = useRef<NodeJS.Timeout>();

  // Check if this is queue mode or selection mode
  const isQueueMode = 'backgroundQueue' in props;

  // Queue mode logic
  useEffect(() => {
    if (isQueueMode) {
      const {
        backgroundQueue,
        backgroundSettings,
        onBackgroundQueueIndexChange,
        backgroundQueueIndex
      } = props as QueueBackgroundManagerProps;

      if (backgroundQueue.length > 0) {
        // Auto-play through the background queue
        const getDisplayTime = (item: BackgroundQueueItem) => {
          if (item.type === 'video') {
            return 0; // Videos play until finished (handled by onVideoEnd callback)
          } else {
            // Images use the per-item display duration setting or fallback to global setting
            const durationSetting = item.settings?.displayDuration;
            if (durationSetting) {
              switch (durationSetting) {
                case 'Random Fast': return Math.random() * 5000 + 3000; // 3-8 seconds
                case 'Random Slow': return Math.random() * 10000 + 10000; // 10-20 seconds
                case '15s': return 15000;
                case '30s': return 30000;
                case '45s': return 45000;
                case '1 Minute': return 60000;
                default: return backgroundSettings.imageDisplayTime * 1000;
              }
            }
            return backgroundSettings.imageDisplayTime * 1000;
          }
        };

        const cycleQueue = () => {
          const nextIndex = (backgroundQueueIndex + 1) % backgroundQueue.length;
          onBackgroundQueueIndexChange(nextIndex);
        };

        // Clear existing interval
        if (cycleIntervalRef.current) {
          clearInterval(cycleIntervalRef.current);
        }

        // For videos, progression is handled by the onVideoEnd callback
        // For images, use the configured display time
        const currentItem = backgroundQueue[backgroundQueueIndex];
        if (currentItem && currentItem.type === 'image') {
          const displayTime = getDisplayTime(currentItem);
          if (displayTime > 0) {
            cycleIntervalRef.current = setInterval(cycleQueue, displayTime);
          }
        }
        // Videos will cycle when they end (handled by onVideoEnd callback in BackgroundDisplay)
      } else {
        if (cycleIntervalRef.current) {
          clearInterval(cycleIntervalRef.current);
        }
      }

      return () => {
        if (cycleIntervalRef.current) {
          clearInterval(cycleIntervalRef.current);
        }
      };
    }
  }, [isQueueMode, props]);

  // Selection mode logic
  useEffect(() => {
    if (!isQueueMode) {
      const {
        backgrounds,
        cycleBackgrounds,
        backgroundCycleIndex,
        onBackgroundCycleIndexChange,
        backgroundSettings
      } = props as SelectionBackgroundManagerProps;

      if (cycleBackgrounds && backgrounds.length > 1) {
        // Auto-cycle through backgrounds
        const cycleBackgroundsFn = () => {
          const nextIndex = (backgroundCycleIndex + 1) % backgrounds.length;
          onBackgroundCycleIndexChange(nextIndex);
        };

        // Clear existing interval
        if (cycleIntervalRef.current) {
          clearInterval(cycleIntervalRef.current);
        }

        // Use image display time for cycling, default to 5 seconds if not available
        const displayTime = backgroundSettings?.imageDisplayTime || 5;
        cycleIntervalRef.current = setInterval(cycleBackgroundsFn, displayTime * 1000);
      } else {
        if (cycleIntervalRef.current) {
          clearInterval(cycleIntervalRef.current);
        }
      }

      return () => {
        if (cycleIntervalRef.current) {
          clearInterval(cycleIntervalRef.current);
        }
      };
    }
  }, [isQueueMode, props]);

  const getCurrentBackground = () => {
    const bgVisualMode = isQueueMode
      ? (props as QueueBackgroundManagerProps).bgVisualMode
      : (props as SelectionBackgroundManagerProps).bgVisualMode;

    // Helper functions for different modes
    const getFilteredBackgrounds = (type?: 'image' | 'video') => {
      const allBackgrounds = isQueueMode
        ? (props as QueueBackgroundManagerProps).backgrounds
        : (props as SelectionBackgroundManagerProps).backgrounds;

      if (!type) return allBackgrounds;
      return allBackgrounds.filter(bg => bg.type === type);
    };

    const getRandomBackground = (type?: 'image' | 'video') => {
      const filtered = getFilteredBackgrounds(type);
      if (filtered.length === 0) return DEFAULT_BACKGROUND;
      return filtered[Math.floor(Math.random() * filtered.length)];
    };

    if (bgVisualMode === 'custom-queue' && isQueueMode) {
      const { backgrounds, backgroundQueue, backgroundQueueIndex } = props as QueueBackgroundManagerProps;

      // If background queue is empty, use fallback logic
      if (!backgroundQueue || backgroundQueue.length === 0) {
        // Check if we have a currently playing video with thumbnail
        const currentVideoId = (props as any).currentlyPlayingVideoId;
        const currentThumbnail = (props as any).currentlyPlayingThumbnail;

        if (currentVideoId && currentThumbnail) {
          // DEFAULT BACKGROUND QUEUE: Now playing thumbnail on Neon Frame Border at 2x speed
          return {
            id: 'default-now-playing-overlay',
            name: 'Now Playing Thumbnail Overlay',
            url: '', // Special handling in render
            type: 'composite' as const,
            thumbnailUrl: currentThumbnail,
            overlayVideoUrl: '/backgrounds/Neon_Frame_Border.mp4',
            videoSpeed: 2.0,
            size: '2/3'
          };
        } else {
          // FALLBACK: DJAMMS HeadPhone Girl.jpg
          const headphoneGirl = backgrounds.find(bg => bg.id === 'djamms-headphone-girl');
          return headphoneGirl || backgrounds.find(bg => bg.name?.toLowerCase().includes('headphone')) || backgrounds[0] || DEFAULT_BACKGROUND;
        }
      }

      if (backgroundQueueIndex < backgroundQueue.length) {
        const queueItem = backgroundQueue[backgroundQueueIndex];

        if (!queueItem) {
          // Queue item is undefined, fallback to first background
          return backgrounds.length > 0 ? backgrounds[0] : DEFAULT_BACKGROUND;
        }

        // Find the actual background asset
        if (queueItem.type === 'default') {
          // Handle default assets
          if (queueItem.assetId === 'none-black') {
            return { id: 'none-black', name: 'None (Black)', url: '', type: 'image' as const, settings: queueItem.settings };
          } else if (queueItem.assetId === 'now-playing-thumbnail') {
            return { id: 'now-playing-thumbnail', name: 'Now Playing Thumbnail', url: '', type: 'image' as const, settings: queueItem.settings };
          } else if (queueItem.assetId === 'random-thumbnails') {
            return { id: 'random-thumbnails', name: 'Random Thumbnail Tiles', url: '', type: 'image' as const, settings: queueItem.settings };
          }
        } else if (queueItem.assetId) {
          // Find in backgrounds array
          const foundBackground = backgrounds.find(bg => bg.id === queueItem.assetId);
          if (foundBackground) {
            return { ...foundBackground, settings: queueItem.settings };
          }
          return backgrounds[0] || DEFAULT_BACKGROUND;
        }
      }

      // Fallback to first background if queue is empty or invalid
      const fallback = backgrounds.length > 0 ? backgrounds[0] : DEFAULT_BACKGROUND;
      return { ...fallback, settings: backgroundQueue[backgroundQueueIndex]?.settings };
    } else {
      // Handle different visual modes
      switch (bgVisualMode) {
        case 'random':
          return getRandomBackground();
        case 'images-only':
          return getRandomBackground('image');
        case 'videos-only':
          return getRandomBackground('video');
        default: {
          // Fallback to selection mode logic
          const { backgrounds, selectedBackground, backgroundCycleIndex, cycleBackgrounds } = props as SelectionBackgroundManagerProps;

          // If cycling is enabled, use the cycle index
          if (cycleBackgrounds && backgrounds.length > 0) {
            return backgrounds[backgroundCycleIndex % backgrounds.length];
          }

          // Otherwise use the selected background
          const selected = backgrounds.find(bg => bg.id === selectedBackground);
          return selected || (backgrounds.length > 0 ? backgrounds[0] : DEFAULT_BACKGROUND);
        }
      }
    }
  };

  return { getCurrentBackground };
};

export const BackgroundDisplay: React.FC<{
  background: BackgroundFile;
  backgroundSettings: BackgroundSettings;
  onVideoEnd?: () => void;
  children: React.ReactNode;
}> = ({ background, backgroundSettings, onVideoEnd, children }) => {
  // Ensure we have a valid background object
  const safeBackground = background && background.id ? background : {
    id: 'default-black',
    name: 'Default (Black)',
    url: '',
    type: 'image' as const,
  };

  const backgroundVideoRef = useRef<HTMLVideoElement>(null);
  const [currentBackground, setCurrentBackground] = useState<BackgroundFile>(safeBackground);
  const [nextBackground, setNextBackground] = useState<BackgroundFile | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Handle background asset loading errors
  const handleAssetLoadError = useCallback((error: string) => {
    console.warn(`Background asset failed to load: ${error}`);
    setLoadError(error);
    // Could trigger fallback to next background or default here
  }, []);

  // Clear error when background changes successfully
  const handleAssetLoadSuccess = useCallback(() => {
    setLoadError(null);
  }, []);

  // Handle background transitions with fade effect
  useEffect(() => {
    if (currentBackground.id !== safeBackground.id) {
      // Start transition to new background
      setNextBackground(safeBackground);
      setIsTransitioning(true);

      // After fade out completes, switch to new background
      const timer = setTimeout(() => {
        setCurrentBackground(safeBackground);
        setNextBackground(null);
        setIsTransitioning(false);
      }, 500); // 500ms total transition

      return () => clearTimeout(timer);
    }
  }, [safeBackground.id, currentBackground.id]);

  useEffect(() => {
    const video = backgroundVideoRef.current;
    if (!video || currentBackground.type !== 'video' || !backgroundSettings.bounceVideos) return;

    let direction = 1; // 1 for forward, -1 for backward

    const handleTimeUpdate = () => {
      if (direction === 1 && video.currentTime >= video.duration - 0.1) {
        // Reached end, start playing backward
        direction = -1;
        video.pause();

        const playBackward = () => {
          if (video.currentTime <= 0.1) {
            // Reached beginning, start playing forward again
            direction = 1;
            video.play();
            return;
          }
          video.currentTime -= 0.1;
          requestAnimationFrame(playBackward);
        };
        playBackward();
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [currentBackground, backgroundSettings.bounceVideos]);

  // Handle video end for queue progression
  useEffect(() => {
    const video = backgroundVideoRef.current;
    if (!video || currentBackground.type !== 'video') return;

    const handleVideoEnd = () => {
      if (onVideoEnd) {
        onVideoEnd();
      }
    };

    video.addEventListener('ended', handleVideoEnd);
    return () => {
      video.removeEventListener('ended', handleVideoEnd);
    };
  }, [currentBackground, onVideoEnd]);

  // Set video playback rate
  useEffect(() => {
    const video = backgroundVideoRef.current;
    if (video && currentBackground.type === 'video') {
      const itemSettings = (currentBackground as any).settings;
      const speedSetting = itemSettings?.videoSpeed;
      let playbackRate = backgroundSettings.videoPlaybackSpeed;

      if (speedSetting) {
        switch (speedSetting) {
          case '0.25': playbackRate = 0.25; break;
          case '0.5': playbackRate = 0.5; break;
          case '0.75': playbackRate = 0.75; break;
          case '1.0': playbackRate = 1.0; break;
          case '1.25': playbackRate = 1.25; break;
          case '1.5': playbackRate = 1.5; break;
          case '1.75': playbackRate = 1.75; break;
          case '2.0': playbackRate = 2.0; break;
          default: playbackRate = backgroundSettings.videoPlaybackSpeed;
        }
      }

      video.playbackRate = playbackRate;
    }
  }, [currentBackground, backgroundSettings.videoPlaybackSpeed]);

  const renderBackground = (bg: BackgroundFile, isFadingOut = false) => {
    // Get per-item settings or fall back to global settings
    const itemSettings = (bg as any).settings;
    const shouldFade = itemSettings?.fadeInOut !== 'No Fade' ? backgroundSettings.dipToBlackFade : false;
    const fitToScreen = itemSettings?.scaling === 'Fit-To-Screen' || (!itemSettings?.scaling && backgroundSettings.fitAssetsToScreen);

    // Determine object fit based on scaling setting
    const getObjectFit = () => {
      if (!itemSettings?.scaling) return backgroundSettings.fitAssetsToScreen ? 'contain' : 'cover';
      switch (itemSettings.scaling) {
        case 'Original Size': return 'none';
        case 'Fit-To-Screen': return 'contain';
        case 'Fill-Screen': return 'cover';
        case 'Stretch to Screen': return 'fill';
        default: return backgroundSettings.fitAssetsToScreen ? 'contain' : 'cover';
      }
    };

    const objectFit = getObjectFit();

    // Handle composite backgrounds (thumbnail overlay on video)
    if ((bg as any).type === 'composite') {
      const compositeBg = bg as any;

      return (
        <div
          className={`absolute inset-0 transition-opacity duration-500 ease-in-out ${
            isFadingOut && shouldFade ? 'opacity-0' : 'opacity-100'
          }`}
          style={{
            backgroundColor: 'black'
          }}
        >
          {/* Base video */}
          {compositeBg.overlayVideoUrl && (
            <video
              ref={bg === currentBackground ? backgroundVideoRef : undefined}
              autoPlay
              loop={!backgroundSettings.bounceVideos && backgroundSettings.videoLoopRepeat > 0}
              muted
              className="absolute inset-0 w-full h-full object-cover"
              src={compositeBg.overlayVideoUrl}
              style={{
                objectFit: fitToScreen ? 'contain' : 'cover',
                transform: `scale(${compositeBg.videoSpeed || backgroundSettings.videoPlaybackSpeed})`,
                transformOrigin: 'center'
              }}
              onError={(e) => {
                console.error(`Failed to load composite video: ${compositeBg.overlayVideoUrl}`, e);
                if (handleAssetLoadError) {
                  handleAssetLoadError(`Failed to load composite video: ${compositeBg.overlayVideoUrl}`);
                }
              }}
              onLoadStart={() => {
                if (handleAssetLoadSuccess) {
                  handleAssetLoadSuccess();
                }
              }}
            />
          )}

          {/* Thumbnail overlay */}
          {compositeBg.thumbnailUrl && (
            <>
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{
                  backgroundImage: `url('${compositeBg.thumbnailUrl}')`,
                  backgroundSize: compositeBg.size === '2/3' ? '66%' : 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                  mixBlendMode: 'screen',
                  opacity: 0.8
                }}
              />
              {/* Hidden image element for error detection on thumbnail */}
              <img
                src={compositeBg.thumbnailUrl}
                alt=""
                className="hidden"
                onError={(e) => {
                  console.error(`Failed to load thumbnail: ${compositeBg.thumbnailUrl}`, e);
                  if (handleAssetLoadError) {
                    handleAssetLoadError(`Failed to load thumbnail: ${compositeBg.thumbnailUrl}`);
                  }
                }}
                onLoad={() => {
                  if (handleAssetLoadSuccess) {
                    handleAssetLoadSuccess();
                  }
                }}
              />
            </>
          )}
        </div>
      );
    }    return (
      <div
        className={`absolute inset-0 transition-opacity duration-500 ease-in-out ${
          isFadingOut && shouldFade ? 'opacity-0' : 'opacity-100'
        }`}
        style={{
          backgroundImage: bg.type === 'image' ? `url('${bg.url}')` : 'none',
          backgroundSize: fitToScreen ? 'contain' : 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundColor: bg.id === 'none-black' || bg.id === 'default-black' ? 'black' : 'transparent'
        }}
      >
        {bg.type === 'video' && (
          <video
            ref={bg === currentBackground ? backgroundVideoRef : undefined}
            autoPlay
            loop={!backgroundSettings.bounceVideos && backgroundSettings.videoLoopRepeat > 0}
            muted
            className="absolute inset-0 w-full h-full object-cover"
            src={bg.url}
            style={{
              objectFit: fitToScreen ? 'contain' : 'cover',
              transform: `scale(${backgroundSettings.videoPlaybackSpeed})`,
              transformOrigin: 'center'
            }}
            onError={(e) => {
              console.error(`Failed to load video: ${bg.url}`, e);
              if (handleAssetLoadError) {
                handleAssetLoadError(`Failed to load video: ${bg.url}`);
              }
            }}
            onLoadStart={() => {
              if (handleAssetLoadSuccess) {
                handleAssetLoadSuccess();
              }
            }}
          />
        )}
        {/* Hidden image element for error detection on background images */}
        {bg.type === 'image' && (
          <img
            src={bg.url}
            alt=""
            className="hidden"
            onError={(e) => {
              console.error(`Failed to load background image: ${bg.url}`, e);
              if (handleAssetLoadError) {
                handleAssetLoadError(`Failed to load background image: ${bg.url}`);
              }
            }}
            onLoad={() => {
              if (handleAssetLoadSuccess) {
                handleAssetLoadSuccess();
              }
            }}
          />
        )}
        {/* Handle special default backgrounds */}
        {bg.id === 'now-playing-thumbnail' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
            <div className="text-white text-center">
              <div className="text-2xl font-bold">Now Playing</div>
              <div className="text-lg">Thumbnail Display</div>
            </div>
          </div>
        )}
        {bg.id === 'random-thumbnails' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
            <div className="text-white text-center">
              <div className="text-2xl font-bold">Random Thumbnails</div>
              <div className="text-lg">Tile Display</div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Current background */}
      {renderBackground(currentBackground, isTransitioning)}

      {/* Next background (during transition) */}
      {nextBackground && renderBackground(nextBackground)}

      {/* Overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-40 transition-opacity duration-500 ease-in-out" />

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};
