
import React, { useRef, useEffect, useState } from 'react';

interface BackgroundFile {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'video';
}

interface BackgroundManagerProps {
  backgrounds: BackgroundFile[];
  selectedBackground: string;
  cycleBackgrounds: boolean;
  backgroundCycleIndex: number;
  bounceVideos: boolean;
  onBackgroundCycleIndexChange: (index: number) => void;
  // Remove onSelectedBackgroundChange - cycling shouldn't update user selection
}

export const useBackgroundManager = ({
  backgrounds,
  selectedBackground,
  cycleBackgrounds,
  backgroundCycleIndex,
  bounceVideos,
  onBackgroundCycleIndexChange
}: BackgroundManagerProps) => {
  const cycleIntervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (cycleBackgrounds && backgrounds.length > 1) {
      const validBackgrounds = backgrounds.filter(bg => bg.id !== 'default');
      if (validBackgrounds.length > 0) {
        cycleIntervalRef.current = setInterval(() => {
          const nextIndex = (backgroundCycleIndex + 1) % validBackgrounds.length;
          onBackgroundCycleIndexChange(nextIndex);
        }, 25000);
      }
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
  }, [cycleBackgrounds, backgrounds, backgroundCycleIndex, onBackgroundCycleIndexChange]);

  const getCurrentBackground = () => {
    if (cycleBackgrounds && backgrounds.length > 1) {
      // When cycling, show the background at the current cycle index
      const validBackgrounds = backgrounds.filter(bg => bg.id !== 'default');
      if (validBackgrounds.length > 0 && backgroundCycleIndex < validBackgrounds.length) {
        return validBackgrounds[backgroundCycleIndex];
      }
    }
    // When not cycling or fallback, show the selected background
    return backgrounds.find(bg => bg.id === selectedBackground) || backgrounds[0];
  };

  return { getCurrentBackground };
};

export const BackgroundDisplay: React.FC<{
  background: BackgroundFile;
  bounceVideos: boolean;
  children: React.ReactNode;
}> = ({ background, bounceVideos, children }) => {
  const backgroundVideoRef = useRef<HTMLVideoElement>(null);
  const [currentBackground, setCurrentBackground] = useState<BackgroundFile>(background);
  const [nextBackground, setNextBackground] = useState<BackgroundFile | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Handle background transitions with fade effect
  useEffect(() => {
    if (currentBackground.id !== background.id) {
      // Start transition to new background
      setNextBackground(background);
      setIsTransitioning(true);

      // After fade out completes, switch to new background
      const timer = setTimeout(() => {
        setCurrentBackground(background);
        setNextBackground(null);
        setIsTransitioning(false);
      }, 500); // 500ms total transition

      return () => clearTimeout(timer);
    }
  }, [background.id, currentBackground.id]);

  useEffect(() => {
    const video = backgroundVideoRef.current;
    if (!video || currentBackground.type !== 'video' || !bounceVideos) return;

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
  }, [currentBackground, bounceVideos]);

  const renderBackground = (bg: BackgroundFile, isFadingOut = false) => (
    <div
      className={`absolute inset-0 transition-opacity duration-500 ease-in-out ${
        isFadingOut ? 'opacity-0' : 'opacity-100'
      }`}
      style={{
        backgroundImage: bg.type === 'image' ? `url('${bg.url}')` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {bg.type === 'video' && (
        <video
          ref={bg === currentBackground ? backgroundVideoRef : undefined}
          autoPlay
          loop={!bounceVideos}
          muted
          className="absolute inset-0 w-full h-full object-cover"
          src={bg.url}
        />
      )}
    </div>
  );

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
