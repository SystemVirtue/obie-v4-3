import React from 'react';
import { Button } from '@/components/ui/button';
import { Settings2, Download, Upload } from 'lucide-react';
import { PlaylistItem, QueuedRequest } from '@/types/jukebox';

interface SettingsManagementPanelProps {
  mode: "FREEPLAY" | "PAID";
  credits: number;
  defaultPlaylist: string;
  apiKey: string;
  selectedApiKeyOption: string;
  customApiKey: string;
  autoRotateApiKeys: boolean;
  searchMethod: string;
  selectedCoinAcceptor: string;
  selectedBackground: string;
  cycleBackgrounds: boolean;
  bounceVideos: boolean;
  maxSongLength: number;
  showMiniPlayer: boolean;
  testMode: boolean;
  videoQuality: "auto" | "hd1080" | "hd720" | "large" | "medium" | "small";
  hideEndCards: boolean;
  coinValueA: number;
  coinValueB: number;
  selectedDisplay: string;
  useFullscreen: boolean;
  autoDetectDisplay: boolean;
  currentPlaylistVideos: PlaylistItem[];
  priorityQueue: QueuedRequest[];
}

export const SettingsManagementPanel: React.FC<SettingsManagementPanelProps> = ({
  mode,
  credits,
  defaultPlaylist,
  apiKey,
  selectedApiKeyOption,
  customApiKey,
  autoRotateApiKeys,
  searchMethod,
  selectedCoinAcceptor,
  selectedBackground,
  cycleBackgrounds,
  bounceVideos,
  maxSongLength,
  showMiniPlayer,
  testMode,
  videoQuality,
  hideEndCards,
  coinValueA,
  coinValueB,
  selectedDisplay,
  useFullscreen,
  autoDetectDisplay,
  currentPlaylistVideos,
  priorityQueue,
}) => {
  return (
    <div className="space-y-4">
      {/* Master Save Button */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
        <Button
          onClick={() => {
            // Save USER_PREFERENCES
            const userPrefs = {
              mode,
              credits,
              defaultPlaylist,
              apiKey,
              selectedApiKeyOption,
              customApiKey,
              autoRotateApiKeys,
              searchMethod,
              selectedCoinAcceptor,
              selectedBackground,
              cycleBackgrounds,
              bounceVideos,
              maxSongLength,
              showMiniPlayer,
              testMode,
              videoQuality,
              hideEndCards,
              coinValueA,
              coinValueB,
              selectedDisplay,
              useFullscreen,
              autoDetectDisplay,
              playerWindowPosition: null, // Will be saved separately
            };
            localStorage.setItem('USER_PREFERENCES', JSON.stringify(userPrefs));

            // Save ACTIVE_PLAYLIST (current in-memory playlist)
            if (currentPlaylistVideos && currentPlaylistVideos.length > 0) {
              localStorage.setItem('ACTIVE_QUEUE', JSON.stringify(currentPlaylistVideos));
            }

            // Save CURRENT_QUEUE_INDEX
            localStorage.setItem('current_video_index', '0'); // Reset to start on save

            // Save PRIORITY_QUEUE
            if (priorityQueue && priorityQueue.length > 0) {
              localStorage.setItem('PRIORITY_QUEUE', JSON.stringify(priorityQueue));
            }

            // Save ACTIVE_PLAYLIST_DATA (original loaded playlist)
            localStorage.setItem('active_playlist_data', JSON.stringify(currentPlaylistVideos));

            console.log('[Master Save] All current configuration saved to localStorage');
            alert('Current configuration saved successfully!');
          }}
          className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2 w-full"
          size="lg"
        >
          <Settings2 className="w-5 h-5" />
          SAVE CURRENT CONFIGURATION
        </Button>
        <p className="text-xs text-green-700 mt-2">
          Master save button - writes all current settings, playlists, and queue state to localStorage.
        </p>
      </div>

      <div className="flex gap-2">
        <Button
          onClick={() => {
            const settings = {
              version: "1.0",
              timestamp: new Date().toISOString(),
              preferences: localStorage.getItem('USER_PREFERENCES'),
              playlists: localStorage.getItem('CUSTOM_PLAYLISTS'),
            };

            const blob = new Blob([JSON.stringify(settings, null, 2)], {
              type: 'application/json'
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `jukebox-settings-${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
          }}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Export Settings
        </Button>
        <Button
          onClick={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'application/json';
            input.onchange = (e) => {
              const file = (e.target as HTMLInputElement).files?.[0];
              if (!file) return;

              const reader = new FileReader();
              reader.onload = (event) => {
                try {
                  const settings = JSON.parse(event.target?.result as string);

                  if (settings.version !== "1.0") {
                    alert("Incompatible settings version");
                    return;
                  }

                  if (settings.preferences) {
                    localStorage.setItem('USER_PREFERENCES', settings.preferences);
                  }
                  if (settings.playlists) {
                    localStorage.setItem('CUSTOM_PLAYLISTS', settings.playlists);
                  }

                  alert("Settings imported successfully! Reloading page...");
                  window.location.reload();
                } catch (error) {
                  alert("Failed to import settings: Invalid file format");
                }
              };
              reader.readAsText(file);
            };
            input.click();
          }}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Upload className="w-4 h-4" />
          Import Settings
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Export your settings to backup or transfer to another device. Import will reload the page.
      </p>
    </div>
  );
};