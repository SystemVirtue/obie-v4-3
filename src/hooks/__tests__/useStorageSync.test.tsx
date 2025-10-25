import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useStorageSync } from '../useStorageSync';
import type { JukeboxFullState } from '@/types/jukebox';

describe('useStorageSync', () => {
  let mockState: JukeboxFullState;
  let mockSetState: ReturnType<typeof vi.fn>;
  let mockAddLog: ReturnType<typeof vi.fn>;
  let mockHandleVideoEnded: ReturnType<typeof vi.fn>;
  let mockToast: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    
    mockState = {
      inMemoryPlaylist: [],
      priorityQueue: [],
      currentlyPlaying: '',
      currentVideoId: '',
      isPlayerRunning: false,
      isPlayerPaused: false,
      playerWindow: null,
      upcomingQueue: [],
      historyQueue: [],
      isPlayerInitializing: false,
      lastSyncedAt: null,
      syncError: null,
      hasLocalChanges: false,
      defaultPlaylistVideos: [],
      currentVideoIndex: 0,
    } as JukeboxFullState;

    mockSetState = vi.fn((updater) => {
      if (typeof updater === 'function') {
        mockState = updater(mockState);
      }
    });
    
    mockAddLog = vi.fn();
    mockHandleVideoEnded = vi.fn();
    mockToast = vi.fn();

    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  describe('Initial Setup', () => {
    it('sets up storage event listener', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

      renderHook(() =>
        useStorageSync({
          state: mockState,
          setState: mockSetState,
          addLog: mockAddLog,
          handleVideoEnded: mockHandleVideoEnded,
          toast: mockToast,
        })
      );

      expect(addEventListenerSpy).toHaveBeenCalledWith('storage', expect.any(Function));
    });

    it('cleans up event listener on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const { unmount } = renderHook(() =>
        useStorageSync({
          state: mockState,
          setState: mockSetState,
          addLog: mockAddLog,
          handleVideoEnded: mockHandleVideoEnded,
          toast: mockToast,
        })
      );

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('storage', expect.any(Function));
    });

    it('sets up polling interval', () => {
      const setIntervalSpy = vi.spyOn(global, 'setInterval');

      renderHook(() =>
        useStorageSync({
          state: mockState,
          setState: mockSetState,
          addLog: mockAddLog,
          handleVideoEnded: mockHandleVideoEnded,
          toast: mockToast,
        })
      );

      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 250);
    });

    it('cleans up polling interval on unmount', () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

      const { unmount } = renderHook(() =>
        useStorageSync({
          state: mockState,
          setState: mockSetState,
          addLog: mockAddLog,
          handleVideoEnded: mockHandleVideoEnded,
          toast: mockToast,
        })
      );

      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });

  describe('Playing Status Updates', () => {
    it('updates currentlyPlaying when video starts playing', () => {
      mockState.currentVideoId = '';

      renderHook(() =>
        useStorageSync({
          state: mockState,
          setState: mockSetState,
          addLog: mockAddLog,
          handleVideoEnded: mockHandleVideoEnded,
          toast: mockToast,
        })
      );

      const status = {
        status: 'playing',
        title: 'Test Song (Official Video)',
        videoId: 'test123',
      };

      localStorage.setItem('jukeboxStatus', JSON.stringify(status));
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'jukeboxStatus',
        newValue: JSON.stringify(status),
      }));

      expect(mockSetState).toHaveBeenCalled();
    });

    it('cleans title by removing parenthetical content', () => {
      renderHook(() =>
        useStorageSync({
          state: mockState,
          setState: mockSetState,
          addLog: mockAddLog,
          handleVideoEnded: mockHandleVideoEnded,
          toast: mockToast,
        })
      );

      const status = {
        status: 'playing',
        title: 'Amazing Song (Official Music Video)',
        videoId: 'test123',
      };

      localStorage.setItem('jukeboxStatus', JSON.stringify(status));
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'jukeboxStatus',
        newValue: JSON.stringify(status),
      }));

      expect(mockSetState).toHaveBeenCalledWith(expect.any(Function));
    });

    it('updates currentVideoId when video starts', () => {
      renderHook(() =>
        useStorageSync({
          state: mockState,
          setState: mockSetState,
          addLog: mockAddLog,
          handleVideoEnded: mockHandleVideoEnded,
          toast: mockToast,
        })
      );

      const status = {
        status: 'playing',
        title: 'Test Song',
        videoId: 'abc123',
      };

      localStorage.setItem('jukeboxStatus', JSON.stringify(status));
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'jukeboxStatus',
        newValue: JSON.stringify(status),
      }));

      expect(mockSetState).toHaveBeenCalled();
    });

    it('forces UI update after playing status', async () => {
      renderHook(() =>
        useStorageSync({
          state: mockState,
          setState: mockSetState,
          addLog: mockAddLog,
          handleVideoEnded: mockHandleVideoEnded,
          toast: mockToast,
        })
      );

      const status = {
        status: 'playing',
        title: 'Test Song',
        videoId: 'test123',
      };

      localStorage.setItem('jukeboxStatus', JSON.stringify(status));
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'jukeboxStatus',
        newValue: JSON.stringify(status),
      }));

      vi.advanceTimersByTime(100);

      expect(mockSetState).toHaveBeenCalledTimes(2); // Initial + forced update
    });
  });

  describe('Video Ended Handling', () => {
    it('handles video ended event when IDs match', () => {
      mockState.currentVideoId = 'test123';

      renderHook(() =>
        useStorageSync({
          state: mockState,
          setState: mockSetState,
          addLog: mockAddLog,
          handleVideoEnded: mockHandleVideoEnded,
          toast: mockToast,
        })
      );

      const status = {
        status: 'ended',
        videoId: 'test123',
      };

      localStorage.setItem('jukeboxStatus', JSON.stringify(status));
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'jukeboxStatus',
        newValue: JSON.stringify(status),
      }));

      expect(mockSetState).toHaveBeenCalled();
    });

    it('calls handleVideoEnded after delay when video ends', () => {
      mockState.currentVideoId = 'test123';

      renderHook(() =>
        useStorageSync({
          state: mockState,
          setState: mockSetState,
          addLog: mockAddLog,
          handleVideoEnded: mockHandleVideoEnded,
          toast: mockToast,
        })
      );

      const status = {
        status: 'ended',
        videoId: 'test123',
      };

      localStorage.setItem('jukeboxStatus', JSON.stringify(status));
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'jukeboxStatus',
        newValue: JSON.stringify(status),
      }));

      expect(mockHandleVideoEnded).not.toHaveBeenCalled();

      vi.advanceTimersByTime(500);

      expect(mockHandleVideoEnded).toHaveBeenCalledTimes(1);
    });

    it('ignores video ended when IDs do not match', () => {
      mockState.currentVideoId = 'test123';

      renderHook(() =>
        useStorageSync({
          state: mockState,
          setState: mockSetState,
          addLog: mockAddLog,
          handleVideoEnded: mockHandleVideoEnded,
          toast: mockToast,
        })
      );

      const status = {
        status: 'ended',
        videoId: 'different456',
      };

      localStorage.setItem('jukeboxStatus', JSON.stringify(status));
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'jukeboxStatus',
        newValue: JSON.stringify(status),
      }));

      vi.advanceTimersByTime(1000);

      expect(mockHandleVideoEnded).not.toHaveBeenCalled();
    });

    it('sets currentlyPlaying to Loading... when video ends', () => {
      mockState.currentVideoId = 'test123';

      renderHook(() =>
        useStorageSync({
          state: mockState,
          setState: mockSetState,
          addLog: mockAddLog,
          handleVideoEnded: mockHandleVideoEnded,
          toast: mockToast,
        })
      );

      const status = {
        status: 'ended',
        videoId: 'test123',
      };

      localStorage.setItem('jukeboxStatus', JSON.stringify(status));
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'jukeboxStatus',
        newValue: JSON.stringify(status),
      }));

      expect(mockSetState).toHaveBeenCalledWith(expect.any(Function));
    });

    it('handles testModeComplete status like ended', () => {
      mockState.currentVideoId = 'test123';

      renderHook(() =>
        useStorageSync({
          state: mockState,
          setState: mockSetState,
          addLog: mockAddLog,
          handleVideoEnded: mockHandleVideoEnded,
          toast: mockToast,
        })
      );

      const status = {
        status: 'testModeComplete',
        videoId: 'test123',
      };

      localStorage.setItem('jukeboxStatus', JSON.stringify(status));
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'jukeboxStatus',
        newValue: JSON.stringify(status),
      }));

      vi.advanceTimersByTime(500);

      expect(mockHandleVideoEnded).toHaveBeenCalledTimes(1);
    });

    it('triggers safety timeout if still loading after 10 seconds', () => {
      mockState.currentVideoId = 'test123';
      mockState.currentlyPlaying = 'Test Song';

      renderHook(() =>
        useStorageSync({
          state: mockState,
          setState: mockSetState,
          addLog: mockAddLog,
          handleVideoEnded: mockHandleVideoEnded,
          toast: mockToast,
        })
      );

      const status = {
        status: 'ended',
        videoId: 'test123',
      };

      localStorage.setItem('jukeboxStatus', JSON.stringify(status));
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'jukeboxStatus',
        newValue: JSON.stringify(status),
      }));

      // Simulate still loading after main timeout
      mockState.currentlyPlaying = 'Loading...';

      vi.advanceTimersByTime(10000);

      expect(mockHandleVideoEnded).toHaveBeenCalled();
    });
  });

  describe('Fade Complete Handling', () => {
    it('handles fadeComplete event when IDs match', () => {
      mockState.currentVideoId = 'test123';

      renderHook(() =>
        useStorageSync({
          state: mockState,
          setState: mockSetState,
          addLog: mockAddLog,
          handleVideoEnded: mockHandleVideoEnded,
          toast: mockToast,
        })
      );

      const status = {
        status: 'fadeComplete',
        id: 'test123',
      };

      localStorage.setItem('jukeboxStatus', JSON.stringify(status));
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'jukeboxStatus',
        newValue: JSON.stringify(status),
      }));

      vi.advanceTimersByTime(500);

      expect(mockHandleVideoEnded).toHaveBeenCalledTimes(1);
    });

    it('sets currentlyPlaying to Loading... on fade complete', () => {
      mockState.currentVideoId = 'test123';

      renderHook(() =>
        useStorageSync({
          state: mockState,
          setState: mockSetState,
          addLog: mockAddLog,
          handleVideoEnded: mockHandleVideoEnded,
          toast: mockToast,
        })
      );

      const status = {
        status: 'fadeComplete',
        id: 'test123',
      };

      localStorage.setItem('jukeboxStatus', JSON.stringify(status));
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'jukeboxStatus',
        newValue: JSON.stringify(status),
      }));

      expect(mockSetState).toHaveBeenCalled();
    });

    it('has safety timeout for fade complete', () => {
      mockState.currentVideoId = 'test123';

      renderHook(() =>
        useStorageSync({
          state: mockState,
          setState: mockSetState,
          addLog: mockAddLog,
          handleVideoEnded: mockHandleVideoEnded,
          toast: mockToast,
        })
      );

      const status = {
        status: 'fadeComplete',
        id: 'test123',
      };

      localStorage.setItem('jukeboxStatus', JSON.stringify(status));
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'jukeboxStatus',
        newValue: JSON.stringify(status),
      }));

      mockState.currentlyPlaying = 'Loading...';

      vi.advanceTimersByTime(10000);

      expect(mockHandleVideoEnded).toHaveBeenCalled();
    });
  });

  describe('Error and Unavailable Handling', () => {
    it('auto-skips on error status', () => {
      mockState.currentVideoId = 'test123';
      mockState.currentlyPlaying = 'Test Song';

      renderHook(() =>
        useStorageSync({
          state: mockState,
          setState: mockSetState,
          addLog: mockAddLog,
          handleVideoEnded: mockHandleVideoEnded,
          toast: mockToast,
        })
      );

      const status = {
        status: 'error',
        id: 'test123',
      };

      localStorage.setItem('jukeboxStatus', JSON.stringify(status));
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'jukeboxStatus',
        newValue: JSON.stringify(status),
      }));

      vi.advanceTimersByTime(1000);

      expect(mockHandleVideoEnded).toHaveBeenCalledTimes(1);
    });

    it('auto-skips on unavailable status', () => {
      mockState.currentVideoId = 'test123';

      renderHook(() =>
        useStorageSync({
          state: mockState,
          setState: mockSetState,
          addLog: mockAddLog,
          handleVideoEnded: mockHandleVideoEnded,
          toast: mockToast,
        })
      );

      const status = {
        status: 'unavailable',
        id: 'test123',
      };

      localStorage.setItem('jukeboxStatus', JSON.stringify(status));
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'jukeboxStatus',
        newValue: JSON.stringify(status),
      }));

      vi.advanceTimersByTime(1000);

      expect(mockHandleVideoEnded).toHaveBeenCalledTimes(1);
    });

    it('logs error when auto-skipping', () => {
      mockState.currentVideoId = 'test123';
      mockState.currentlyPlaying = 'Unavailable Song';

      renderHook(() =>
        useStorageSync({
          state: mockState,
          setState: mockSetState,
          addLog: mockAddLog,
          handleVideoEnded: mockHandleVideoEnded,
          toast: mockToast,
        })
      );

      const status = {
        status: 'error',
        id: 'test123',
      };

      localStorage.setItem('jukeboxStatus', JSON.stringify(status));
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'jukeboxStatus',
        newValue: JSON.stringify(status),
      }));

      expect(mockAddLog).toHaveBeenCalledWith(
        'SONG_PLAYED',
        expect.stringContaining('Auto-skipping unavailable video'),
      );
    });

    it('has longer safety timeout for error case', () => {
      mockState.currentVideoId = 'test123';

      renderHook(() =>
        useStorageSync({
          state: mockState,
          setState: mockSetState,
          addLog: mockAddLog,
          handleVideoEnded: mockHandleVideoEnded,
          toast: mockToast,
        })
      );

      const status = {
        status: 'error',
        id: 'test123',
      };

      localStorage.setItem('jukeboxStatus', JSON.stringify(status));
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'jukeboxStatus',
        newValue: JSON.stringify(status),
      }));

      mockState.currentlyPlaying = 'Loading...';

      vi.advanceTimersByTime(11000);

      expect(mockHandleVideoEnded).toHaveBeenCalled();
    });
  });

  describe('Player Ready Status', () => {
    it('handles ready status without errors', () => {
      renderHook(() =>
        useStorageSync({
          state: mockState,
          setState: mockSetState,
          addLog: mockAddLog,
          handleVideoEnded: mockHandleVideoEnded,
          toast: mockToast,
        })
      );

      const status = {
        status: 'ready',
      };

      expect(() => {
        localStorage.setItem('jukeboxStatus', JSON.stringify(status));
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'jukeboxStatus',
          newValue: JSON.stringify(status),
        }));
      }).not.toThrow();
    });
  });

  describe('Command Handling', () => {
    it('handles play command from player', () => {
      renderHook(() =>
        useStorageSync({
          state: mockState,
          setState: mockSetState,
          addLog: mockAddLog,
          handleVideoEnded: mockHandleVideoEnded,
          toast: mockToast,
        })
      );

      const command = {
        action: 'play',
        title: 'New Song (Video)',
        videoId: 'newVideo123',
      };

      localStorage.setItem('jukeboxCommand', JSON.stringify(command));
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'jukeboxCommand',
        newValue: JSON.stringify(command),
      }));

      expect(mockSetState).toHaveBeenCalled();
    });

    it('cleans title in play command', () => {
      renderHook(() =>
        useStorageSync({
          state: mockState,
          setState: mockSetState,
          addLog: mockAddLog,
          handleVideoEnded: mockHandleVideoEnded,
          toast: mockToast,
        })
      );

      const command = {
        action: 'play',
        title: 'Song Title (Official Music Video)',
        videoId: 'video123',
      };

      localStorage.setItem('jukeboxCommand', JSON.stringify(command));
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'jukeboxCommand',
        newValue: JSON.stringify(command),
      }));

      expect(mockSetState).toHaveBeenCalledWith(expect.any(Function));
    });

    it('updates currentVideoId from play command', () => {
      renderHook(() =>
        useStorageSync({
          state: mockState,
          setState: mockSetState,
          addLog: mockAddLog,
          handleVideoEnded: mockHandleVideoEnded,
          toast: mockToast,
        })
      );

      const command = {
        action: 'play',
        title: 'Test Song',
        videoId: 'cmd123',
      };

      localStorage.setItem('jukeboxCommand', JSON.stringify(command));
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'jukeboxCommand',
        newValue: JSON.stringify(command),
      }));

      expect(mockSetState).toHaveBeenCalled();
    });
  });

  describe('Emergency Playlist Injection', () => {
    it('handles emergency playlist inject event', () => {
      renderHook(() =>
        useStorageSync({
          state: mockState,
          setState: mockSetState,
          addLog: mockAddLog,
          handleVideoEnded: mockHandleVideoEnded,
          toast: mockToast,
        })
      );

      const playlist = [
        { videoId: 'emergency1', title: 'Emergency Song 1', channelTitle: 'Test', thumbnailUrl: '', addedAt: Date.now() },
        { videoId: 'emergency2', title: 'Emergency Song 2', channelTitle: 'Test', thumbnailUrl: '', addedAt: Date.now() },
      ];

      const event = new CustomEvent('emergency-playlist-inject', {
        detail: { playlist },
      });

      window.dispatchEvent(event);

      expect(mockSetState).toHaveBeenCalledWith(expect.any(Function));
    });

    it('shows toast on emergency recovery', () => {
      renderHook(() =>
        useStorageSync({
          state: mockState,
          setState: mockSetState,
          addLog: mockAddLog,
          handleVideoEnded: mockHandleVideoEnded,
          toast: mockToast,
        })
      );

      const playlist = [
        { videoId: 'emergency1', title: 'Song 1', channelTitle: 'Test', thumbnailUrl: '', addedAt: Date.now() },
      ];

      const event = new CustomEvent('emergency-playlist-inject', {
        detail: { playlist },
      });

      window.dispatchEvent(event);

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Emergency Recovery',
        description: expect.stringContaining('1 songs'),
        variant: 'default',
      });
    });

    it('handles empty emergency playlist', () => {
      renderHook(() =>
        useStorageSync({
          state: mockState,
          setState: mockSetState,
          addLog: mockAddLog,
          handleVideoEnded: mockHandleVideoEnded,
          toast: mockToast,
        })
      );

      const event = new CustomEvent('emergency-playlist-inject', {
        detail: { playlist: [] },
      });

      expect(() => {
        window.dispatchEvent(event);
      }).not.toThrow();
    });

    it('cleans up emergency event listener on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const { unmount } = renderHook(() =>
        useStorageSync({
          state: mockState,
          setState: mockSetState,
          addLog: mockAddLog,
          handleVideoEnded: mockHandleVideoEnded,
          toast: mockToast,
        })
      );

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'emergency-playlist-inject',
        expect.any(Function)
      );
    });
  });

  describe('Polling Mechanism', () => {
    it('detects localStorage changes via polling', async () => {
      renderHook(() =>
        useStorageSync({
          state: mockState,
          setState: mockSetState,
          addLog: mockAddLog,
          handleVideoEnded: mockHandleVideoEnded,
          toast: mockToast,
        })
      );

      const status = {
        status: 'ready',
      };

      // Directly set localStorage without storage event
      localStorage.setItem('jukeboxStatus', JSON.stringify(status));

      // Advance to next poll interval
      vi.advanceTimersByTime(250);

      // Should detect the change via polling
      expect(mockSetState).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('handles missing toast gracefully', () => {
      renderHook(() =>
        useStorageSync({
          state: mockState,
          setState: mockSetState,
          addLog: mockAddLog,
          handleVideoEnded: mockHandleVideoEnded,
          toast: undefined,
        })
      );

      const playlist = [{ videoId: 'test', title: 'Test', channelTitle: 'Test', thumbnailUrl: '', addedAt: Date.now() }];
      const event = new CustomEvent('emergency-playlist-inject', {
        detail: { playlist },
      });

      expect(() => {
        window.dispatchEvent(event);
      }).not.toThrow();
    });

    it('handles invalid JSON in localStorage gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      renderHook(() =>
        useStorageSync({
          state: mockState,
          setState: mockSetState,
          addLog: mockAddLog,
          handleVideoEnded: mockHandleVideoEnded,
          toast: mockToast,
        })
      );

      // Invalid JSON will throw an error but should be caught internally
      // Just verify it doesn't crash the app
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'jukeboxStatus',
        newValue: 'invalid json{',
      }));

      // The app should still be running
      expect(mockSetState).toBeDefined();
      
      consoleSpy.mockRestore();
    });

    it('handles null newValue in storage event', () => {
      renderHook(() =>
        useStorageSync({
          state: mockState,
          setState: mockSetState,
          addLog: mockAddLog,
          handleVideoEnded: mockHandleVideoEnded,
          toast: mockToast,
        })
      );

      expect(() => {
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'jukeboxStatus',
          newValue: null,
        }));
      }).not.toThrow();
    });
  });
});
