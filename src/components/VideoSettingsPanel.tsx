import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Monitor, Zap } from 'lucide-react';

interface VideoSettingsPanelProps {
  showMiniPlayer: boolean;
  onShowMiniPlayerChange: (show: boolean) => void;
  maxSongLength: number;
  onMaxSongLengthChange: (minutes: number) => void;
  videoQuality: "auto" | "hd1080" | "hd720" | "large" | "medium" | "small";
  onVideoQualityChange: (quality: "auto" | "hd1080" | "hd720" | "large" | "medium" | "small") => void;
  hideEndCards: boolean;
  onHideEndCardsChange: (hide: boolean) => void;
  adaptiveQualityEnabled: boolean;
  onAdaptiveQualityEnabledChange: (enabled: boolean) => void;
}

export const VideoSettingsPanel: React.FC<VideoSettingsPanelProps> = ({
  showMiniPlayer,
  onShowMiniPlayerChange,
  maxSongLength,
  onMaxSongLengthChange,
  videoQuality,
  onVideoQualityChange,
  hideEndCards,
  onHideEndCardsChange,
  adaptiveQualityEnabled,
  onAdaptiveQualityEnabledChange,
}) => {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Mini Player
        </label>
        <div className="flex items-center gap-2">
          <Checkbox
            id="show-mini-player"
            checked={showMiniPlayer}
            onCheckedChange={onShowMiniPlayerChange}
          />
          <label
            htmlFor="show-mini-player"
            className="text-sm flex items-center gap-2"
          >
            <Monitor className="w-4 h-4" />
            Show Mini-Player on Jukebox UI
          </label>
        </div>
        <p className="text-xs text-slate-600 mt-1">
          Displays a small synchronized video player on the main UI
          (muted)
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Maximum Song Length: {maxSongLength} minutes
        </label>
        <Slider
          value={[maxSongLength]}
          onValueChange={(value) => onMaxSongLengthChange(value[0])}
          min={6}
          max={15}
          step={1}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-slate-500 mt-1">
          <span>6 min</span>
          <span>15 min</span>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Video Quality
        </label>
        <Select
          value={videoQuality}
          onValueChange={onVideoQualityChange}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select video quality" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">Auto (YouTube Default)</SelectItem>
            <SelectItem value="hd1080">1080p HD</SelectItem>
            <SelectItem value="hd720">720p HD</SelectItem>
            <SelectItem value="large">480p Large</SelectItem>
            <SelectItem value="medium">360p Medium</SelectItem>
            <SelectItem value="small">240p Small</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-slate-600 mt-1">
          Set preferred YouTube video quality (may not always be available)
        </p>
      </div>

      <div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="adaptive-quality"
            checked={adaptiveQualityEnabled}
            onCheckedChange={onAdaptiveQualityEnabledChange}
          />
          <label
            htmlFor="adaptive-quality"
            className="text-sm font-medium text-slate-700 cursor-pointer flex items-center gap-2"
          >
            <Zap className="w-4 h-4" />
            Allow Adaptive Video Quality / System Monitoring
          </label>
        </div>
        <p className="text-xs text-slate-600 mt-1">
          Automatically adjust video quality based on device RAM, connection speed, and system load.
          Monitors performance and caps resolution for optimal playback on lower-end devices.
        </p>
      </div>

      <div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="hideEndCards"
            checked={hideEndCards}
            onCheckedChange={onHideEndCardsChange}
          />
          <label
            htmlFor="hideEndCards"
            className="text-sm font-medium text-slate-700 cursor-pointer"
          >
            Hide YouTube End Cards
          </label>
        </div>
        <p className="text-xs text-slate-600 mt-1">
          Note: YouTube end cards cannot be programmatically hidden via iframe API.
          This setting is for future compatibility.
        </p>
      </div>
    </div>
  );
};