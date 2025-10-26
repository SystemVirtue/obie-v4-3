import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePlaylistManager } from '../usePlaylistManager';
import type { JukeboxFullState } from '@/types/jukebox';

describe('usePlaylistManager - Priority Queue', () => {
  let mockState: JukeboxFullState;
  let mockSetState: ReturnType<typeof vi.fn>;
  let mockAddLog: ReturnType<typeof vi.fn>;
  let mockPlaySong: ReturnType<typeof vi.fn>;
  let mockToast: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockState = {
      // Core state
      isPlaying: false,
      currentSong: 'Loading...',
      currentVideoId: '',
      volume: 50,
      isPlayerPaused: false,
      queue: [],
      priorityQueue: [],
      mode: 'FREEPLAY',
      credits: 0,

      // UI state
      isSearchOpen: false,
      showKeyboard: false,
      showSearchResults: false,
      searchQuery: '',
      searchResults: [],
      isSearching: false,

      // Config state
      enablePriorityQueue: true,
      enablePaidMode: false,
      enableAdminConsole: true,
      enableRemoteControl: false,
      enableWebSocket: false,
      enableBackgrounds: false,
      enableSearch: true,
      enablePlaylist: true,
      enableHistory: true,
      enableUpcoming: true,
      enableMiniPlayer: true,
      enableFooterControls: true,
      enableNowPlayingTicker: true,
      enableBackToSearchButton: true,
      enablePlayerClosedNotification: true,
      enableVideoResultCard: true,
      enableSearchKeyboard: true,
      enableSearchButton: true,
      enableUpcomingQueue: true,

      // Playlist state
      inMemoryPlaylist: [],
      defaultPlaylistId: '',
      defaultPlaylistName: '',
      defaultPlaylistVideos: [],

      // Runtime state
      currentlyPlaying: 'Loading...',
      isPlayerRunning: false,
      playerWindow: null,
      upcomingQueue: [],
      historyQueue: [],
      isPlayerInitializing: false,
      lastSyncedAt: null,
      syncError: null,
      hasLocalChanges: false,

      // History state
      recentSearches: [],
      recentRequests: [],
    } as unknown as JukeboxFullState;

    mockSetState = vi.fn();
    mockAddLog = vi.fn();
    mockPlaySong = vi.fn();
    mockToast = vi.fn();
  });

  describe('playNextSong with Priority Queue', () => {
    it('plays from priority queue when available', () => {
      const priorityRequests = [
        { id: '1', videoId: 'vid1', title: 'Song 1', channelTitle: 'Artist 1', timestamp: '2024-01-01T00:00:00Z' },
        { id: '2', videoId: 'vid2', title: 'Song 2', channelTitle: 'Artist 2', timestamp: '2024-01-01T00:01:00Z' },
      ];

      mockState.priorityQueue = priorityRequests;

      const { result } = renderHook(() =>
        usePlaylistManager(mockState, mockSetState, mockAddLog, mockPlaySong, mockToast)
      );

      result.current.playNextSong();

      expect(mockPlaySong).toHaveBeenCalledWith('vid1', 'Song 1', 'Artist 1', 'USER_SELECTION');
      // CRITICAL FIX: setState should NOT be called here anymore - removal happens in handleVideoEnded
      expect(mockSetState).not.toHaveBeenCalled();
    });

    it('does not remove song from priority queue when starting playback', () => {
      const priorityRequests = [
        { id: '1', videoId: 'vid1', title: 'Song 1', channelTitle: 'Artist 1', timestamp: '2024-01-01T00:00:00Z' },
        { id: '2', videoId: 'vid2', title: 'Song 2', channelTitle: 'Artist 2', timestamp: '2024-01-01T00:01:00Z' },
      ];

      mockState.priorityQueue = priorityRequests;

      const { result } = renderHook(() =>
        usePlaylistManager(mockState, mockSetState, mockAddLog, mockPlaySong, mockToast)
      );

      result.current.playNextSong();

      // CRITICAL FIX: Priority queue should remain unchanged when song starts playing
      expect(mockSetState).not.toHaveBeenCalled();
      expect(mockState.priorityQueue).toHaveLength(2); // Still 2 songs in queue
    });

    it('allows duplicate songs in priority queue', () => {
      const priorityRequests = [
        { id: '1', videoId: 'vid1', title: 'Song 1', channelTitle: 'Artist 1', timestamp: '2024-01-01T00:00:00Z' },
        { id: '2', videoId: 'vid1', title: 'Song 1', channelTitle: 'Artist 1', timestamp: '2024-01-01T00:01:00Z' }, // Same song
      ];

      mockState.priorityQueue = priorityRequests;

      const { result } = renderHook(() =>
        usePlaylistManager(mockState, mockSetState, mockAddLog, mockPlaySong, mockToast)
      );

      result.current.playNextSong();

      expect(mockPlaySong).toHaveBeenCalledWith('vid1', 'Song 1', 'Artist 1', 'USER_SELECTION');
      // CRITICAL FIX: setState should NOT be called here - queue remains unchanged until song finishes
      expect(mockSetState).not.toHaveBeenCalled();
      expect(mockState.priorityQueue).toHaveLength(2); // Both songs still in queue
    });
  });

  describe('handleVideoEnded with Priority Queue', () => {
    it('removes completed priority song from queue when video ends', () => {
      const priorityRequests = [
        { id: '1', videoId: 'vid1', title: 'Song 1', channelTitle: 'Artist 1', timestamp: '2024-01-01T00:00:00Z' },
        { id: '2', videoId: 'vid2', title: 'Song 2', channelTitle: 'Artist 2', timestamp: '2024-01-01T00:01:00Z' },
      ];

      mockState.priorityQueue = priorityRequests;

      const { result } = renderHook(() =>
        usePlaylistManager(mockState, mockSetState, mockAddLog, mockPlaySong, mockToast)
      );

      result.current.handleVideoEnded();

      // Should remove the first priority song
      expect(mockSetState).toHaveBeenCalled();
      const setStateCall = mockSetState.mock.calls[0][0];
      const newState = setStateCall(mockState);

      expect(newState.priorityQueue).toHaveLength(1);
      expect(newState.priorityQueue[0].id).toBe('2');

      // Note: playNextSong gets called again but due to async setState,
      // it may still see the old state in this test. The important thing
      // is that the state update removes the completed song correctly.
    });

    it('handles empty priority queue gracefully', () => {
      mockState.priorityQueue = [];
      mockState.inMemoryPlaylist = [{ id: '1', videoId: 'playlist1', title: 'Playlist Song', channelTitle: 'Artist' }];
      mockState.currentVideoIndex = 0;

      const { result } = renderHook(() =>
        usePlaylistManager(mockState, mockSetState, mockAddLog, mockPlaySong, mockToast)
      );

      result.current.handleVideoEnded();

      // Should not modify priority queue state when empty
      // But should modify playlist state for regular playlist progression
      expect(mockSetState).toHaveBeenCalledTimes(1); // Only for playlist index update
      expect(mockPlaySong).toHaveBeenCalled(); // Should play from regular playlist
    });
  });
});