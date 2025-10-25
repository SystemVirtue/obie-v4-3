/**
 * CHANGELOG - Phase 3
 * 
 * ADDED:
 * - Health check panel for admin console
 * - LocalStorage integrity verification
 * - Player window accessibility check
 * - Playlist validation
 * - Visual status indicators
 * 
 * TESTING:
 * - Verify all checks run correctly
 * - Test with corrupted localStorage
 * - Test with closed player window
 * - Test with empty playlist
 */

import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

interface HealthStatus {
  localStorage: {
    userPreferences: boolean;
    activePlaylist: boolean;
    priorityQueue: boolean;
    playerWindowState: boolean;
  };
  playerWindow: {
    isOpen: boolean;
    isResponding: boolean;
    currentVideo: string | null;
  };
  playlist: {
    isLoaded: boolean;
    videoCount: number;
    queueLength: number;
  };
}

interface AdminConsoleHealthCheckProps {
  playerWindow: Window | null;
  inMemoryPlaylist: any[];
  priorityQueue: any[];
  currentlyPlaying: string;
}

export const AdminConsoleHealthCheck: React.FC<AdminConsoleHealthCheckProps> = ({
  playerWindow,
  inMemoryPlaylist,
  priorityQueue,
  currentlyPlaying,
}) => {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const runHealthCheck = () => {
    setIsChecking(true);

    try {
      // Check localStorage
      const localStorageHealth = {
        userPreferences: !!localStorage.getItem('USER_PREFERENCES'),
        activePlaylist: !!localStorage.getItem('active_playlist_data'),
        priorityQueue: !!localStorage.getItem('PRIORITY_QUEUE'),
        playerWindowState: !!localStorage.getItem('PLAYER_WINDOW_STATE'),
      };

      // Check player window
      const playerWindowHealth = {
        isOpen: !!(playerWindow && !playerWindow.closed),
        isResponding: !!(playerWindow && !playerWindow.closed && playerWindow.document),
        currentVideo: currentlyPlaying !== 'Loading...' ? currentlyPlaying : null,
      };

      // Check playlist
      const playlistHealth = {
        isLoaded: inMemoryPlaylist.length > 0,
        videoCount: inMemoryPlaylist.length,
        queueLength: priorityQueue.length,
      };

      setHealth({
        localStorage: localStorageHealth,
        playerWindow: playerWindowHealth,
        playlist: playlistHealth,
      });
    } catch (error) {
      console.error('[HealthCheck] Error running health check:', error);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    runHealthCheck();
  }, [playerWindow, inMemoryPlaylist, priorityQueue, currentlyPlaying]);

  const getStatusIcon = (status: boolean) => {
    if (status) {
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    }
    return <XCircle className="h-5 w-5 text-red-500" />;
  };

  const getOverallStatus = (): 'healthy' | 'warning' | 'error' => {
    if (!health) return 'warning';

    const issues = [
      !health.localStorage.userPreferences,
      !health.playlist.isLoaded,
      !health.playerWindow.isOpen,
    ];

    const criticalIssues = issues.filter(Boolean).length;

    if (criticalIssues === 0) return 'healthy';
    if (criticalIssues <= 1) return 'warning';
    return 'error';
  };

  const overallStatus = getOverallStatus();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {overallStatus === 'healthy' && (
            <>
              <CheckCircle2 className="h-6 w-6 text-green-500" />
              <span className="text-lg font-semibold text-green-500">System Healthy</span>
            </>
          )}
          {overallStatus === 'warning' && (
            <>
              <AlertCircle className="h-6 w-6 text-yellow-500" />
              <span className="text-lg font-semibold text-yellow-500">Minor Issues</span>
            </>
          )}
          {overallStatus === 'error' && (
            <>
              <XCircle className="h-6 w-6 text-red-500" />
              <span className="text-lg font-semibold text-red-500">Critical Issues</span>
            </>
          )}
        </div>
        <Button
          onClick={runHealthCheck}
          disabled={isChecking}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isChecking ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {health && (
        <div className="grid gap-4 md:grid-cols-3">
          {/* LocalStorage Health */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">LocalStorage</CardTitle>
              <CardDescription>Data persistence status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">User Preferences</span>
                {getStatusIcon(health.localStorage.userPreferences)}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Active Playlist</span>
                {getStatusIcon(health.localStorage.activePlaylist)}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Priority Queue</span>
                {getStatusIcon(health.localStorage.priorityQueue)}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Window State</span>
                {getStatusIcon(health.localStorage.playerWindowState)}
              </div>
            </CardContent>
          </Card>

          {/* Player Window Health */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Player Window</CardTitle>
              <CardDescription>Player accessibility</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Window Open</span>
                {getStatusIcon(health.playerWindow.isOpen)}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Responding</span>
                {getStatusIcon(health.playerWindow.isResponding)}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Playing Video</span>
                {getStatusIcon(!!health.playerWindow.currentVideo)}
              </div>
              {health.playerWindow.currentVideo && (
                <div className="text-xs text-muted-foreground mt-2 truncate">
                  {health.playerWindow.currentVideo}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Playlist Health */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Playlist</CardTitle>
              <CardDescription>Queue status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Playlist Loaded</span>
                {getStatusIcon(health.playlist.isLoaded)}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Video Count</span>
                <span className="text-sm font-medium">{health.playlist.videoCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Priority Queue</span>
                <span className="text-sm font-medium">{health.playlist.queueLength}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recommendations */}
      {health && overallStatus !== 'healthy' && (
        <Card className="border-yellow-500/50 bg-yellow-500/5">
          <CardHeader>
            <CardTitle className="text-sm">Recommendations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {!health.localStorage.userPreferences && (
              <p>• User preferences not saved - settings may reset on page refresh</p>
            )}
            {!health.playerWindow.isOpen && (
              <p>• Player window is closed - click "Open Player" to start playback</p>
            )}
            {!health.playlist.isLoaded && (
              <p>• No playlist loaded - please select a playlist in settings</p>
            )}
            {health.playerWindow.isOpen && !health.playerWindow.isResponding && (
              <p>• Player window not responding - try closing and reopening</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
