import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePlayerInitialization } from '../usePlayerInitialization';
import type { JukeboxFullState } from '@/types/jukebox';

describe('usePlayerInitialization', () => {
  let mockState: JukeboxFullState;
  let mockInitializePlayer: ReturnType<typeof vi.fn>;
  let mockPlayNextSong: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    
    mockState = {
      inMemoryPlaylist: [],
      priorityQueue: [],
      currentlyPlaying: 'Loading...',
      isPlayerRunning: false,
      isPlayerPaused: false,
      playerWindow: null,
      upcomingQueue: [],
      historyQueue: [],
      isPlayerInitializing: false,
      lastSyncedAt: null,
      syncError: null,
      hasLocalChanges: false,
    } as JukeboxFullState;

    mockInitializePlayer = vi.fn().mockResolvedValue(undefined);
    mockPlayNextSong = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Initial State', () => {
    it('does not autoplay when playlist is empty', () => {
      renderHook(() =>
        usePlayerInitialization({
          state: mockState,
          initializePlayer: mockInitializePlayer,
          playNextSong: mockPlayNextSong,
        })
      );

      vi.runAllTimers();

      expect(mockPlayNextSong).not.toHaveBeenCalled();
      expect(mockInitializePlayer).not.toHaveBeenCalled();
    });

    it('does not autoplay when player is paused', () => {
      mockState.inMemoryPlaylist = [
        { videoId: 'test1', title: 'Test Song', channelTitle: 'Test Channel', thumbnailUrl: '', addedAt: Date.now() },
      ];
      mockState.isPlayerPaused = true;

      renderHook(() =>
        usePlayerInitialization({
          state: mockState,
          initializePlayer: mockInitializePlayer,
          playNextSong: mockPlayNextSong,
        })
      );

      vi.runAllTimers();

      expect(mockPlayNextSong).not.toHaveBeenCalled();
    });

    it('does not autoplay when priority queue has items', () => {
      mockState.inMemoryPlaylist = [
        { videoId: 'test1', title: 'Test Song', channelTitle: 'Test Channel', thumbnailUrl: '', addedAt: Date.now() },
      ];
      mockState.priorityQueue = [
        { videoId: 'priority1', title: 'Priority Song', channelTitle: 'Test', thumbnailUrl: '', addedAt: Date.now() },
      ];

      renderHook(() =>
        usePlayerInitialization({
          state: mockState,
          initializePlayer: mockInitializePlayer,
          playNextSong: mockPlayNextSong,
        })
      );

      vi.runAllTimers();

      expect(mockPlayNextSong).not.toHaveBeenCalled();
    });

    it('does not autoplay when something is already playing', () => {
      mockState.inMemoryPlaylist = [
        { videoId: 'test1', title: 'Test Song', channelTitle: 'Test Channel', thumbnailUrl: '', addedAt: Date.now() },
      ];
      mockState.currentlyPlaying = 'Currently Playing Song';

      renderHook(() =>
        usePlayerInitialization({
          state: mockState,
          initializePlayer: mockInitializePlayer,
          playNextSong: mockPlayNextSong,
        })
      );

      vi.runAllTimers();

      expect(mockPlayNextSong).not.toHaveBeenCalled();
    });

    it('does not autoplay when there is an error', () => {
      mockState.inMemoryPlaylist = [
        { videoId: 'test1', title: 'Test Song', channelTitle: 'Test Channel', thumbnailUrl: '', addedAt: Date.now() },
      ];
      mockState.currentlyPlaying = 'Error: Failed to load';

      renderHook(() =>
        usePlayerInitialization({
          state: mockState,
          initializePlayer: mockInitializePlayer,
          playNextSong: mockPlayNextSong,
        })
      );

      vi.runAllTimers();

      expect(mockPlayNextSong).not.toHaveBeenCalled();
    });
  });

  describe('Autoplay with Player Initialization', () => {
    it('initializes player and plays first song when player window is null', async () => {
      mockState.inMemoryPlaylist = [
        { videoId: 'test1', title: 'Test Song', channelTitle: 'Test Channel', thumbnailUrl: '', addedAt: Date.now() },
      ];
      mockState.playerWindow = null;

      renderHook(() =>
        usePlayerInitialization({
          state: mockState,
          initializePlayer: mockInitializePlayer,
          playNextSong: mockPlayNextSong,
        })
      );

      await vi.runAllTimersAsync();

      expect(mockInitializePlayer).toHaveBeenCalledTimes(1);
      expect(mockPlayNextSong).toHaveBeenCalledTimes(1);
    });

    it('initializes player when player window is closed', async () => {
      mockState.inMemoryPlaylist = [
        { videoId: 'test1', title: 'Test Song', channelTitle: 'Test Channel', thumbnailUrl: '', addedAt: Date.now() },
      ];
      mockState.playerWindow = { closed: true } as Window;

      renderHook(() =>
        usePlayerInitialization({
          state: mockState,
          initializePlayer: mockInitializePlayer,
          playNextSong: mockPlayNextSong,
        })
      );

      await vi.runAllTimersAsync();

      expect(mockInitializePlayer).toHaveBeenCalledTimes(1);
      expect(mockPlayNextSong).toHaveBeenCalledTimes(1);
    });

    it('initializes player when player is not running', async () => {
      mockState.inMemoryPlaylist = [
        { videoId: 'test1', title: 'Test Song', channelTitle: 'Test Channel', thumbnailUrl: '', addedAt: Date.now() },
      ];
      mockState.playerWindow = { closed: false } as Window;
      mockState.isPlayerRunning = false;

      renderHook(() =>
        usePlayerInitialization({
          state: mockState,
          initializePlayer: mockInitializePlayer,
          playNextSong: mockPlayNextSong,
        })
      );

      await vi.runAllTimersAsync();

      expect(mockInitializePlayer).toHaveBeenCalledTimes(1);
      expect(mockPlayNextSong).toHaveBeenCalledTimes(1);
    });

    it('plays song with 1000ms delay after player initialization', async () => {
      mockState.inMemoryPlaylist = [
        { videoId: 'test1', title: 'Test Song', channelTitle: 'Test Channel', thumbnailUrl: '', addedAt: Date.now() },
      ];
      mockState.playerWindow = null;

      renderHook(() =>
        usePlayerInitialization({
          state: mockState,
          initializePlayer: mockInitializePlayer,
          playNextSong: mockPlayNextSong,
        })
      );

      // Fast-forward through initialization
      await vi.runAllTimersAsync();

      expect(mockPlayNextSong).toHaveBeenCalled();
    });

    it('handles player initialization failure gracefully', async () => {
      mockState.inMemoryPlaylist = [
        { videoId: 'test1', title: 'Test Song', channelTitle: 'Test Channel', thumbnailUrl: '', addedAt: Date.now() },
      ];
      mockState.playerWindow = null;
      mockInitializePlayer.mockRejectedValueOnce(new Error('Init failed'));

      renderHook(() =>
        usePlayerInitialization({
          state: mockState,
          initializePlayer: mockInitializePlayer,
          playNextSong: mockPlayNextSong,
        })
      );

      await vi.runAllTimersAsync();

      expect(mockInitializePlayer).toHaveBeenCalledTimes(1);
      expect(mockPlayNextSong).toHaveBeenCalledTimes(1);
    });
  });

  describe('Autoplay Without Player Initialization', () => {
    it('plays song immediately when player is ready', () => {
      mockState.inMemoryPlaylist = [
        { videoId: 'test1', title: 'Test Song', channelTitle: 'Test Channel', thumbnailUrl: '', addedAt: Date.now() },
      ];
      mockState.playerWindow = { closed: false } as Window;
      mockState.isPlayerRunning = true;

      renderHook(() =>
        usePlayerInitialization({
          state: mockState,
          initializePlayer: mockInitializePlayer,
          playNextSong: mockPlayNextSong,
        })
      );

      vi.runAllTimers();

      expect(mockInitializePlayer).not.toHaveBeenCalled();
      expect(mockPlayNextSong).toHaveBeenCalledTimes(1);
    });

    it('plays song with minimal delay when player ready', () => {
      mockState.inMemoryPlaylist = [
        { videoId: 'test1', title: 'Test Song', channelTitle: 'Test Channel', thumbnailUrl: '', addedAt: Date.now() },
      ];
      mockState.playerWindow = { closed: false } as Window;
      mockState.isPlayerRunning = true;

      renderHook(() =>
        usePlayerInitialization({
          state: mockState,
          initializePlayer: mockInitializePlayer,
          playNextSong: mockPlayNextSong,
        })
      );

      // Should use setTimeout with 0ms delay
      expect(mockPlayNextSong).not.toHaveBeenCalled();

      vi.runAllTimers();

      expect(mockPlayNextSong).toHaveBeenCalledTimes(1);
    });
  });

  describe('Autostart Prevention', () => {
    it('only autostarts once per session', () => {
      mockState.inMemoryPlaylist = [
        { videoId: 'test1', title: 'Test Song', channelTitle: 'Test Channel', thumbnailUrl: '', addedAt: Date.now() },
      ];
      mockState.playerWindow = { closed: false } as Window;
      mockState.isPlayerRunning = true;

      const { rerender } = renderHook(() =>
        usePlayerInitialization({
          state: mockState,
          initializePlayer: mockInitializePlayer,
          playNextSong: mockPlayNextSong,
        })
      );

      vi.runAllTimers();

      expect(mockPlayNextSong).toHaveBeenCalledTimes(1);

      // Rerender with same state
      rerender();
      vi.runAllTimers();

      // Should still only be called once
      expect(mockPlayNextSong).toHaveBeenCalledTimes(1);
    });

    it('resets autostart flag when playlist becomes empty', () => {
      mockState.inMemoryPlaylist = [
        { videoId: 'test1', title: 'Test Song', channelTitle: 'Test Channel', thumbnailUrl: '', addedAt: Date.now() },
      ];
      mockState.playerWindow = { closed: false } as Window;
      mockState.isPlayerRunning = true;

      const { rerender } = renderHook(
        (props) =>
          usePlayerInitialization({
            state: props.state,
            initializePlayer: mockInitializePlayer,
            playNextSong: mockPlayNextSong,
          }),
        { initialProps: { state: mockState } }
      );

      vi.runAllTimers();
      expect(mockPlayNextSong).toHaveBeenCalledTimes(1);

      // Clear playlist
      mockState.inMemoryPlaylist = [];
      rerender({ state: mockState });
      vi.runAllTimers();

      // Add songs back
      mockState.inMemoryPlaylist = [
        { videoId: 'test2', title: 'New Song', channelTitle: 'Test', thumbnailUrl: '', addedAt: Date.now() },
      ];
      rerender({ state: mockState });
      vi.runAllTimers();

      // Should autostart again
      expect(mockPlayNextSong).toHaveBeenCalledTimes(2);
    });

    it('allows autostart after playlist is cleared and reloaded', () => {
      // Start with songs and autoplay
      mockState.inMemoryPlaylist = [
        { videoId: 'test1', title: 'Test Song', channelTitle: 'Test Channel', thumbnailUrl: '', addedAt: Date.now() },
      ];
      mockState.playerWindow = { closed: false } as Window;
      mockState.isPlayerRunning = true;

      const { rerender } = renderHook(
        (props) =>
          usePlayerInitialization({
            state: props.state,
            initializePlayer: mockInitializePlayer,
            playNextSong: mockPlayNextSong,
          }),
        { initialProps: { state: mockState } }
      );

      vi.runAllTimers();
      expect(mockPlayNextSong).toHaveBeenCalledTimes(1);

      // Simulate playlist being cleared
      const clearedState = { ...mockState, inMemoryPlaylist: [], currentlyPlaying: '' };
      rerender({ state: clearedState });

      // Simulate new playlist being loaded
      const newState = {
        ...mockState,
        inMemoryPlaylist: [
          { videoId: 'test2', title: 'New Song', channelTitle: 'Test', thumbnailUrl: '', addedAt: Date.now() },
        ],
        currentlyPlaying: 'Loading...',
      };
      rerender({ state: newState });
      vi.runAllTimers();

      // Should trigger autostart again
      expect(mockPlayNextSong).toHaveBeenCalledTimes(2);
    });
  });

  describe('Edge Cases', () => {
    it('handles empty string as currentlyPlaying', () => {
      mockState.inMemoryPlaylist = [
        { videoId: 'test1', title: 'Test Song', channelTitle: 'Test Channel', thumbnailUrl: '', addedAt: Date.now() },
      ];
      mockState.currentlyPlaying = '';
      mockState.playerWindow = { closed: false } as Window;
      mockState.isPlayerRunning = true;

      renderHook(() =>
        usePlayerInitialization({
          state: mockState,
          initializePlayer: mockInitializePlayer,
          playNextSong: mockPlayNextSong,
        })
      );

      vi.runAllTimers();

      expect(mockPlayNextSong).toHaveBeenCalledTimes(1);
    });

    it('does not trigger multiple times on rapid rerenders', () => {
      mockState.inMemoryPlaylist = [
        { videoId: 'test1', title: 'Test Song', channelTitle: 'Test Channel', thumbnailUrl: '', addedAt: Date.now() },
      ];
      mockState.playerWindow = { closed: false } as Window;
      mockState.isPlayerRunning = true;

      const { rerender } = renderHook(() =>
        usePlayerInitialization({
          state: mockState,
          initializePlayer: mockInitializePlayer,
          playNextSong: mockPlayNextSong,
        })
      );

      rerender();
      rerender();
      rerender();

      vi.runAllTimers();

      expect(mockPlayNextSong).toHaveBeenCalledTimes(1);
    });

    it('handles very long playlist arrays', () => {
      const largePlaylist = Array.from({ length: 1000 }, (_, i) => ({
        videoId: `test${i}`,
        title: `Song ${i}`,
        channelTitle: 'Test',
        thumbnailUrl: '',
        addedAt: Date.now(),
      }));

      mockState.inMemoryPlaylist = largePlaylist;
      mockState.playerWindow = { closed: false } as Window;
      mockState.isPlayerRunning = true;

      renderHook(() =>
        usePlayerInitialization({
          state: mockState,
          initializePlayer: mockInitializePlayer,
          playNextSong: mockPlayNextSong,
        })
      );

      vi.runAllTimers();

      expect(mockPlayNextSong).toHaveBeenCalledTimes(1);
    });

    it('handles state changes during initialization', async () => {
      mockState.inMemoryPlaylist = [
        { videoId: 'test1', title: 'Test Song', channelTitle: 'Test Channel', thumbnailUrl: '', addedAt: Date.now() },
      ];
      mockState.playerWindow = null;

      // Slow initialization
      mockInitializePlayer.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 2000))
      );

      renderHook(() =>
        usePlayerInitialization({
          state: mockState,
          initializePlayer: mockInitializePlayer,
          playNextSong: mockPlayNextSong,
        })
      );

      await vi.runAllTimersAsync();

      expect(mockPlayNextSong).toHaveBeenCalled();
    });
  });
});
