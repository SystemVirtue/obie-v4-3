import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { BackgroundSettings } from '@/types/jukebox';

interface BackgroundSettingsPanelProps {
  settings: BackgroundSettings;
  onSettingsChange: (settings: BackgroundSettings) => void;
  bgVisualMode: 'random' | 'images-only' | 'videos-only' | 'custom-queue';
  onBgVisualModeChange: (mode: 'random' | 'images-only' | 'videos-only' | 'custom-queue') => void;
}

export const BackgroundSettingsPanel: React.FC<BackgroundSettingsPanelProps> = ({
  settings,
  onSettingsChange,
  bgVisualMode,
  onBgVisualModeChange,
}) => {
  // Safety check - ensure settings is defined
  if (!settings) {
    return (
      <Card>
        <CardContent className="p-4">
          <p className="text-sm text-slate-500">Loading background settings...</p>
        </CardContent>
      </Card>
    );
  }

  const updateSetting = <K extends keyof BackgroundSettings>(
    key: K,
    value: BackgroundSettings[K]
  ) => {
    onSettingsChange({
      ...settings,
      [key]: value,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Background Playback Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* BG Visual Mode Selector */}
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium mb-3 block">
              Select Preferred Background Visuals Mode:
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={bgVisualMode === 'random' ? 'default' : 'outline'}
                onClick={() => onBgVisualModeChange('random')}
                className="h-auto p-3 text-left"
              >
                <div className="font-medium">Random</div>
                <div className="text-xs opacity-75">Pick from all assets</div>
              </Button>
              <Button
                variant={bgVisualMode === 'images-only' ? 'default' : 'outline'}
                onClick={() => onBgVisualModeChange('images-only')}
                className="h-auto p-3 text-left"
              >
                <div className="font-medium">Images Only</div>
                <div className="text-xs opacity-75">Images only</div>
              </Button>
              <Button
                variant={bgVisualMode === 'videos-only' ? 'default' : 'outline'}
                onClick={() => onBgVisualModeChange('videos-only')}
                className="h-auto p-3 text-left"
              >
                <div className="font-medium">Videos Only</div>
                <div className="text-xs opacity-75">Videos only</div>
              </Button>
              <Button
                variant={bgVisualMode === 'custom-queue' ? 'default' : 'outline'}
                onClick={() => onBgVisualModeChange('custom-queue')}
                className="h-auto p-3 text-left"
              >
                <div className="font-medium">Custom Queue</div>
                <div className="text-xs opacity-75">Use queue order</div>
              </Button>
            </div>
          </div>
        </div>

        {/* Checkbox Options */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="fit-assets"
              checked={settings.fitAssetsToScreen}
              onCheckedChange={(checked) => updateSetting('fitAssetsToScreen', checked as boolean)}
            />
            <Label htmlFor="fit-assets" className="text-sm font-medium">
              Fit Assets To Screen
            </Label>
            <span className="text-xs text-slate-500">
              Resize all assets to fit onscreen, unstretched
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="dip-to-black"
              checked={settings.dipToBlackFade}
              onCheckedChange={(checked) => updateSetting('dipToBlackFade', checked as boolean)}
            />
            <Label htmlFor="dip-to-black" className="text-sm font-medium">
              Dip-to-Black Fade
            </Label>
            <span className="text-xs text-slate-500">
              500ms opacity fade in/out between background transitions
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="bounce-videos"
              checked={settings.bounceVideos}
              onCheckedChange={(checked) => updateSetting('bounceVideos', checked as boolean)}
            />
            <Label htmlFor="bounce-videos" className="text-sm font-medium">
              Bounce Videos A→B→A
            </Label>
            <span className="text-xs text-slate-500">
              Play videos forwards then backwards
            </span>
          </div>
        </div>

        {/* Dropdown Options */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="video-speed" className="text-sm font-medium">
              Video Playback Speed
            </Label>
            <Select
              value={settings.videoPlaybackSpeed.toString()}
              onValueChange={(value) => updateSetting('videoPlaybackSpeed', parseFloat(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0.25">0.25x</SelectItem>
                <SelectItem value="0.5">0.5x</SelectItem>
                <SelectItem value="0.75">0.75x</SelectItem>
                <SelectItem value="1.0">1.0x (Normal)</SelectItem>
                <SelectItem value="1.25">1.25x</SelectItem>
                <SelectItem value="1.5">1.5x</SelectItem>
                <SelectItem value="1.75">1.75x</SelectItem>
                <SelectItem value="2.0">2.0x</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="video-loop" className="text-sm font-medium">
              Video Loop / Repeat
            </Label>
            <Select
              value={settings.videoLoopRepeat.toString()}
              onValueChange={(value) => updateSetting('videoLoopRepeat', parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">0 (No repeat)</SelectItem>
                <SelectItem value="1">1 time</SelectItem>
                <SelectItem value="2">2 times</SelectItem>
                <SelectItem value="3">3 times</SelectItem>
                <SelectItem value="4">4 times</SelectItem>
                <SelectItem value="5">5 times</SelectItem>
                <SelectItem value="6">6 times</SelectItem>
                <SelectItem value="7">7 times</SelectItem>
                <SelectItem value="8">8 times</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="image-time" className="text-sm font-medium">
              Image Display Time (Seconds)
            </Label>
            <Select
              value={settings.imageDisplayTime.toString()}
              onValueChange={(value) => updateSetting('imageDisplayTime', parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 seconds</SelectItem>
                <SelectItem value="4">4 seconds</SelectItem>
                <SelectItem value="5">5 seconds</SelectItem>
                <SelectItem value="6">6 seconds</SelectItem>
                <SelectItem value="7">7 seconds</SelectItem>
                <SelectItem value="8">8 seconds</SelectItem>
                <SelectItem value="9">9 seconds</SelectItem>
                <SelectItem value="10">10 seconds</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};