import React, { useEffect, useState, useCallback, useRef } from "react";
import type { BackgroundQueueItem } from "@/types/jukebox";

interface BackgroundDisplayProps {
  backgroundType?: string;
  backgroundImageUrl?: string;
  backgroundVideoUrl?: string;
  backgroundQueue?: BackgroundQueueItem[];
}

/**
 * BackgroundSyncDisplay Component
 * 
 * Displays background assets with proper queue logic:
 * - Images: Display for specified duration (default 30s)
 * - Videos: Play for specified number of loops
 * - Black background as default
 * 
 * Props from useBackgroundSync hook
 */
const BackgroundSyncDisplay: React.FC<BackgroundDisplayProps> = ({
  backgroundType = "gradient",
  backgroundImageUrl,
  backgroundVideoUrl,
  backgroundQueue = [],
}) => {
  const [currentAssetIndex, setCurrentAssetIndex] = useState(0);
  const [videoLoopCount, setVideoLoopCount] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  const hasQueue = backgroundQueue.length > 0;
  const currentAsset = hasQueue ? backgroundQueue[currentAssetIndex] : null;

  // Helper: Parse display duration from settings string to seconds
  const getImageDuration = (asset: BackgroundQueueItem): number => {
    if (!asset.settings?.displayDuration) return 30; // Default 30 seconds

    const duration = asset.settings.displayDuration;
    if (duration === 'Random Fast') return Math.floor(Math.random() * 10) + 5; // 5-15s
    if (duration === 'Random Slow') return Math.floor(Math.random() * 30) + 30; // 30-60s
    if (duration === '15s') return 15;
    if (duration === '30s') return 30;
    if (duration === '45s') return 45;
    if (duration === '1 Minute') return 60;
    return 30; // Fallback
  };

  // Helper: Get video loop count (default 1 loop for videos)
  const getVideoLoops = (_asset: BackgroundQueueItem): number => {
    // For now, default to 1 loop. Can be extended to read from settings if added
    return 1;
  };

  // Reset queue position when queue changes
  useEffect(() => {
    setCurrentAssetIndex(0);
    setVideoLoopCount(0);
  }, [backgroundQueue.length]);

  // Handle image duration timer
  useEffect(() => {
    if (!currentAsset || currentAsset.type !== "image") return;

    const durationSeconds = getImageDuration(currentAsset);
    const duration = durationSeconds * 1000;
    console.log(`[BackgroundDisplay] Image will display for ${durationSeconds} seconds`);

    const timer = setTimeout(() => {
      console.log("[BackgroundDisplay] Image duration complete, moving to next asset");
      setCurrentAssetIndex((prev) => (prev + 1) % backgroundQueue.length);
      setVideoLoopCount(0);
    }, duration);

    return () => clearTimeout(timer);
  }, [currentAsset, currentAssetIndex, backgroundQueue.length]);

  // Handle video loop completion
  const handleVideoEnded = useCallback(() => {
    if (!currentAsset || currentAsset.type !== "video") return;

    const maxLoops = getVideoLoops(currentAsset);
    const newLoopCount = videoLoopCount + 1;

    console.log(`[BackgroundDisplay] Video loop ${newLoopCount}/${maxLoops} complete`);

    if (newLoopCount >= maxLoops) {
      console.log("[BackgroundDisplay] Video loops complete, moving to next asset");
      setCurrentAssetIndex((prev) => (prev + 1) % backgroundQueue.length);
      setVideoLoopCount(0);
    } else {
      // Restart video for next loop
      setVideoLoopCount(newLoopCount);
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch((err) => {
          console.error("[BackgroundDisplay] Error replaying video:", err);
        });
      }
    }
  }, [currentAsset, videoLoopCount, currentAssetIndex, backgroundQueue.length]);

  // Render current background
  const renderBackground = () => {
    // Queue mode: Show asset from queue
    if (hasQueue && currentAsset) {
      if (currentAsset.type === "video") {
        return (
          <video
            ref={videoRef}
            key={`${currentAssetIndex}-${videoLoopCount}`}
            className="w-full h-full object-cover"
            src={currentAsset.url}
            autoPlay
            muted
            playsInline
            onEnded={handleVideoEnded}
          />
        );
      } else {
        return (
          <img
            key={currentAssetIndex}
            src={currentAsset.url}
            alt="Background"
            className="w-full h-full object-cover"
          />
        );
      }
    }

    // Single asset mode: Show configured background
    if (backgroundType === "video" && backgroundVideoUrl) {
      return (
        <video
          className="w-full h-full object-cover"
          src={backgroundVideoUrl}
          autoPlay
          loop
          muted
          playsInline
        />
      );
    }

    if (backgroundType === "image" && backgroundImageUrl) {
      return (
        <img
          src={backgroundImageUrl}
          alt="Background"
          className="w-full h-full object-cover"
        />
      );
    }

    // Default: Black background (no gradient)
    return <div className="w-full h-full bg-black" />;
  };

  return (
    <div className="fixed inset-0 z-0 bg-black">
      {renderBackground()}
      {/* Dark overlay for better content visibility */}
      <div className="absolute inset-0 bg-black/30" />
    </div>
  );
};

export default BackgroundSyncDisplay;
