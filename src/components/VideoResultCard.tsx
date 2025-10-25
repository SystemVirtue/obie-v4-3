import React from "react";
import { SearchResult } from "@/types/search";

interface VideoResultCardProps {
  video: SearchResult;
  onClick: (video: SearchResult) => void;
  variant?: "grid" | "list";
}

export const VideoResultCard: React.FC<VideoResultCardProps> = ({
  video,
  onClick,
  variant = "grid",
}) => {
  if (variant === "list") {
    // Compact list view for iframe interface
    return (
      <div
        onClick={() => onClick(video)}
        className="bg-slate-700/60 rounded-lg p-3 cursor-pointer hover:bg-slate-600/60 transition-colors border border-slate-600 hover:border-amber-500"
      >
        <div className="flex gap-3">
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            className="w-16 h-12 object-cover rounded"
          />
          <div className="flex-1 min-w-0">
            <h4 className="text-white text-sm font-medium line-clamp-2 mb-1">
              {video.title}
            </h4>
            <p className="text-slate-400 text-xs">{video.channelTitle}</p>
            {video.duration && (
              <p className="text-slate-300 text-xs mt-1">{video.duration}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Grid view for standard search interface
  return (
    <div
      onClick={() => onClick(video)}
      className="bg-slate-800/80 backdrop-blur rounded-lg overflow-hidden cursor-pointer hover:bg-slate-700/80 transition-colors border border-slate-600 hover:border-amber-500 transform hover:scale-105 transition-all duration-200"
      style={{
        filter: "drop-shadow(-5px -5px 10px rgba(0,0,0,0.6))",
      }}
    >
      <img
        src={video.thumbnailUrl}
        alt={video.title}
        className="w-full h-32 object-cover"
      />
      <div className="p-3">
        <h3 className="font-semibold text-white text-sm mb-1 line-clamp-2">
          {video.title}
        </h3>
        <p className="text-slate-400 text-xs">{video.channelTitle}</p>
        {video.duration && (
          <p className="text-slate-300 text-xs mt-1">{video.duration}</p>
        )}
      </div>
    </div>
  );
};
