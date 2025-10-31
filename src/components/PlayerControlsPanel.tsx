import React from 'react';
import { Button } from '@/components/ui/button';
import { Monitor, Settings2, Pause, Play, SkipForward } from 'lucide-react';

interface PlayerControlsPanelProps {
  playerWindow: Window | null;
  isPlayerRunning: boolean;
  isPlayerPaused: boolean;
  onPlayerToggle: () => void;
  onSkipSong: () => void;
  onInitializePlayer: () => void;
  selectedDisplay: string;
  onSelectedDisplayChange: (display: string) => void;
  useFullscreen: boolean;
  onUseFullscreenChange: (fullscreen: boolean) => void;
  autoDetectDisplay: boolean;
  onAutoDetectDisplayChange: (autoDetect: boolean) => void;
}

export const PlayerControlsPanel: React.FC<PlayerControlsPanelProps> = ({
  playerWindow,
  isPlayerRunning,
  isPlayerPaused,
  onPlayerToggle,
  onSkipSong,
  onInitializePlayer,
  selectedDisplay,
  onSelectedDisplayChange,
  useFullscreen,
  onUseFullscreenChange,
  autoDetectDisplay,
  onAutoDetectDisplayChange,
}) => {
  return (
    <div className="space-y-6">
      {/* Player Status Indicator */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Player Controls
        </label>
        <div className="mb-3 p-2 bg-slate-100 rounded text-sm">
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                playerWindow && !playerWindow.closed
                  ? "bg-green-500"
                  : "bg-red-500"
              }`}
            ></div>
            <span className="font-medium">Player Window:</span>
            <span
              className={
                playerWindow && !playerWindow.closed
                  ? "text-green-700"
                  : "text-red-700"
              }
            >
              {playerWindow && !playerWindow.closed
                ? "Open & Ready"
                : playerWindow
                  ? "Closed"
                  : "Not Created"}
            </span>
          </div>
          <div className="text-xs text-slate-600 mt-1">
            Status: {isPlayerRunning ? "Running" : "Stopped"}
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={onPlayerToggle}
            className={`flex items-center gap-2 ${
              isPlayerRunning && !isPlayerPaused
                ? "bg-red-600 hover:bg-red-700"
                : isPlayerRunning && isPlayerPaused
                ? "bg-green-600 hover:bg-green-700"
                : "bg-green-600 hover:bg-green-700"
            }`}
          >
            {isPlayerRunning && !isPlayerPaused ? (
              <Pause className="w-4 h-4" />
            ) : isPlayerRunning && isPlayerPaused ? (
              <Play className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            {isPlayerRunning && !isPlayerPaused
              ? "Pause Player"
              : isPlayerRunning && isPlayerPaused
              ? "Un-Pause Player"
              : "Start Player"}
          </Button>
          <Button
            onClick={onSkipSong}
            disabled={!isPlayerRunning}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            <SkipForward className="w-4 h-4" />
            Skip Song
          </Button>
          <Button
            onClick={onInitializePlayer}
            disabled={
              isPlayerRunning && playerWindow && !playerWindow.closed
            }
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
            title="Manually open/reopen the player window"
          >
            <Settings2 className="w-4 h-4" />
            Open Player
          </Button>
        </div>

        {/* Display Management Controls */}
        {/* TODO: Extract DisplayControls component */}
        {/* <DisplayControls
          playerWindow={playerWindow}
          onInitializePlayer={onInitializePlayer}
          selectedDisplay={selectedDisplay}
          onSelectedDisplayChange={onSelectedDisplayChange}
          useFullscreen={useFullscreen}
          onUseFullscreenChange={onUseFullscreenChange}
          autoDetectDisplay={autoDetectDisplay}
          onAutoDetectDisplayChange={onAutoDetectDisplayChange}
        /> */}

        {/* Debug Controls */}
        <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
          <div className="text-xs font-medium text-yellow-800 mb-2">
            Debug Controls:
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                console.log("[Debug] Current player state:", {
                  playerWindow: !!playerWindow,
                  closed: playerWindow?.closed,
                  running: isPlayerRunning,
                });
                if (playerWindow) {
                  console.log(
                    "[Debug] Player window details:",
                    playerWindow.location?.href,
                  );
                }
              }}
              size="sm"
              variant="outline"
              className="text-xs"
            >
              Log State
            </Button>
            <Button
              onClick={() => {
                if (playerWindow && !playerWindow.closed) {
                  try {
                    const testCommand = {
                      action: "play",
                      videoId: "dQw4w9WgXcQ",
                      title: "Debug Test Song",
                      artist: "Debug Artist",
                      timestamp: Date.now(),
                    };
                    localStorage.setItem(
                      "jukeboxCommand",
                      JSON.stringify(testCommand),
                    );
                    console.log("[Debug] Test command sent to player");
                  } catch (error) {
                    console.error(
                      "[Debug] Error sending test command:",
                      error,
                    );
                  }
                } else {
                  console.error(
                    "[Debug] No player window available for test",
                  );
                }
              }}
              size="sm"
              className="text-xs bg-yellow-600 hover:bg-yellow-700"
              disabled={!playerWindow || playerWindow.closed}
            >
              Test Command
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};