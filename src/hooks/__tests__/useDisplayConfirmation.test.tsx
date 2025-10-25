import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDisplayConfirmation } from '../useDisplayConfirmation';
import type { DisplayInfo } from '@/types/jukebox';

describe('useDisplayConfirmation', () => {
  let mockDisplayInfo: DisplayInfo;
  let mockOnConfirm: ReturnType<typeof vi.fn>;
  let mockOnCancel: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockDisplayInfo = {
      id: 'display-1',
      label: 'Primary Display',
      isPrimary: true,
      bounds: { x: 0, y: 0, width: 1920, height: 1080 },
    };
    mockOnConfirm = vi.fn();
    mockOnCancel = vi.fn();
  });

  describe('Initial State', () => {
    it('initializes with null pendingDisplayConfirmation', () => {
      const { result } = renderHook(() => useDisplayConfirmation());

      expect(result.current.pendingDisplayConfirmation).toBeNull();
    });

    it('returns all expected handler functions', () => {
      const { result } = renderHook(() => useDisplayConfirmation());

      expect(result.current.handleDisplayConfirmationNeeded).toBeInstanceOf(Function);
      expect(result.current.handleDisplayConfirmationResponse).toBeInstanceOf(Function);
      expect(result.current.handleDisplayConfirmationCancel).toBeInstanceOf(Function);
    });
  });

  describe('handleDisplayConfirmationNeeded', () => {
    it('sets pendingDisplayConfirmation with provided data', () => {
      const { result } = renderHook(() => useDisplayConfirmation());

      act(() => {
        result.current.handleDisplayConfirmationNeeded(
          mockDisplayInfo,
          mockOnConfirm,
          mockOnCancel
        );
      });

      expect(result.current.pendingDisplayConfirmation).not.toBeNull();
      expect(result.current.pendingDisplayConfirmation?.displayInfo).toEqual(mockDisplayInfo);
      expect(result.current.pendingDisplayConfirmation?.onConfirm).toBe(mockOnConfirm);
      expect(result.current.pendingDisplayConfirmation?.onCancel).toBe(mockOnCancel);
    });

    it('overwrites previous pending confirmation', () => {
      const { result } = renderHook(() => useDisplayConfirmation());

      const firstDisplayInfo: DisplayInfo = {
        id: 'display-1',
        label: 'First Display',
        isPrimary: true,
        bounds: { x: 0, y: 0, width: 1920, height: 1080 },
      };

      const secondDisplayInfo: DisplayInfo = {
        id: 'display-2',
        label: 'Second Display',
        isPrimary: false,
        bounds: { x: 1920, y: 0, width: 1920, height: 1080 },
      };

      const firstOnConfirm = vi.fn();
      const secondOnConfirm = vi.fn();

      act(() => {
        result.current.handleDisplayConfirmationNeeded(
          firstDisplayInfo,
          firstOnConfirm,
          mockOnCancel
        );
      });

      act(() => {
        result.current.handleDisplayConfirmationNeeded(
          secondDisplayInfo,
          secondOnConfirm,
          mockOnCancel
        );
      });

      expect(result.current.pendingDisplayConfirmation?.displayInfo).toEqual(secondDisplayInfo);
      expect(result.current.pendingDisplayConfirmation?.onConfirm).toBe(secondOnConfirm);
    });

    it('handler function is stable across renders', () => {
      const { result, rerender } = renderHook(() => useDisplayConfirmation());

      const firstHandler = result.current.handleDisplayConfirmationNeeded;
      
      rerender();
      
      const secondHandler = result.current.handleDisplayConfirmationNeeded;

      expect(firstHandler).toBe(secondHandler);
    });
  });

  describe('handleDisplayConfirmationResponse', () => {
    it('calls onConfirm callback with useFullscreen and rememberChoice', () => {
      const { result } = renderHook(() => useDisplayConfirmation());

      act(() => {
        result.current.handleDisplayConfirmationNeeded(
          mockDisplayInfo,
          mockOnConfirm,
          mockOnCancel
        );
      });

      act(() => {
        result.current.handleDisplayConfirmationResponse(true, false);
      });

      expect(mockOnConfirm).toHaveBeenCalledTimes(1);
      expect(mockOnConfirm).toHaveBeenCalledWith(true, false);
    });

    it('calls onConfirm with different parameter combinations', () => {
      const { result } = renderHook(() => useDisplayConfirmation());

      act(() => {
        result.current.handleDisplayConfirmationNeeded(
          mockDisplayInfo,
          mockOnConfirm,
          mockOnCancel
        );
      });

      act(() => {
        result.current.handleDisplayConfirmationResponse(false, true);
      });

      expect(mockOnConfirm).toHaveBeenCalledWith(false, true);
    });

    it('clears pendingDisplayConfirmation after calling onConfirm', () => {
      const { result } = renderHook(() => useDisplayConfirmation());

      act(() => {
        result.current.handleDisplayConfirmationNeeded(
          mockDisplayInfo,
          mockOnConfirm,
          mockOnCancel
        );
      });

      expect(result.current.pendingDisplayConfirmation).not.toBeNull();

      act(() => {
        result.current.handleDisplayConfirmationResponse(true, true);
      });

      expect(result.current.pendingDisplayConfirmation).toBeNull();
    });

    it('does not call onConfirm if no pending confirmation', () => {
      const { result } = renderHook(() => useDisplayConfirmation());

      act(() => {
        result.current.handleDisplayConfirmationResponse(true, false);
      });

      expect(mockOnConfirm).not.toHaveBeenCalled();
    });

    it('does not throw error if called without pending confirmation', () => {
      const { result } = renderHook(() => useDisplayConfirmation());

      expect(() => {
        act(() => {
          result.current.handleDisplayConfirmationResponse(true, false);
        });
      }).not.toThrow();
    });

    it('does not call onCancel when responding with confirmation', () => {
      const { result } = renderHook(() => useDisplayConfirmation());

      act(() => {
        result.current.handleDisplayConfirmationNeeded(
          mockDisplayInfo,
          mockOnConfirm,
          mockOnCancel
        );
      });

      act(() => {
        result.current.handleDisplayConfirmationResponse(true, false);
      });

      expect(mockOnCancel).not.toHaveBeenCalled();
    });
  });

  describe('handleDisplayConfirmationCancel', () => {
    it('calls onCancel callback', () => {
      const { result } = renderHook(() => useDisplayConfirmation());

      act(() => {
        result.current.handleDisplayConfirmationNeeded(
          mockDisplayInfo,
          mockOnConfirm,
          mockOnCancel
        );
      });

      act(() => {
        result.current.handleDisplayConfirmationCancel();
      });

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it('clears pendingDisplayConfirmation after calling onCancel', () => {
      const { result } = renderHook(() => useDisplayConfirmation());

      act(() => {
        result.current.handleDisplayConfirmationNeeded(
          mockDisplayInfo,
          mockOnConfirm,
          mockOnCancel
        );
      });

      expect(result.current.pendingDisplayConfirmation).not.toBeNull();

      act(() => {
        result.current.handleDisplayConfirmationCancel();
      });

      expect(result.current.pendingDisplayConfirmation).toBeNull();
    });

    it('does not call onCancel if no pending confirmation', () => {
      const { result } = renderHook(() => useDisplayConfirmation());

      act(() => {
        result.current.handleDisplayConfirmationCancel();
      });

      expect(mockOnCancel).not.toHaveBeenCalled();
    });

    it('does not throw error if called without pending confirmation', () => {
      const { result } = renderHook(() => useDisplayConfirmation());

      expect(() => {
        act(() => {
          result.current.handleDisplayConfirmationCancel();
        });
      }).not.toThrow();
    });

    it('does not call onConfirm when canceling', () => {
      const { result } = renderHook(() => useDisplayConfirmation());

      act(() => {
        result.current.handleDisplayConfirmationNeeded(
          mockDisplayInfo,
          mockOnConfirm,
          mockOnCancel
        );
      });

      act(() => {
        result.current.handleDisplayConfirmationCancel();
      });

      expect(mockOnConfirm).not.toHaveBeenCalled();
    });
  });

  describe('State Management', () => {
    it('maintains separate pending confirmations when called multiple times', () => {
      const { result } = renderHook(() => useDisplayConfirmation());

      const firstOnConfirm = vi.fn();

      act(() => {
        result.current.handleDisplayConfirmationNeeded(
          mockDisplayInfo,
          firstOnConfirm,
          mockOnCancel
        );
      });

      act(() => {
        result.current.handleDisplayConfirmationResponse(true, false);
      });

      expect(firstOnConfirm).toHaveBeenCalledTimes(1);

      const secondOnConfirm = vi.fn();

      act(() => {
        result.current.handleDisplayConfirmationNeeded(
          mockDisplayInfo,
          secondOnConfirm,
          mockOnCancel
        );
      });

      act(() => {
        result.current.handleDisplayConfirmationResponse(false, true);
      });

      expect(secondOnConfirm).toHaveBeenCalledTimes(1);
      expect(firstOnConfirm).toHaveBeenCalledTimes(1); // Still only called once
    });

    it('can set new confirmation after cancel', () => {
      const { result } = renderHook(() => useDisplayConfirmation());

      act(() => {
        result.current.handleDisplayConfirmationNeeded(
          mockDisplayInfo,
          mockOnConfirm,
          mockOnCancel
        );
      });

      act(() => {
        result.current.handleDisplayConfirmationCancel();
      });

      expect(result.current.pendingDisplayConfirmation).toBeNull();

      const newOnConfirm = vi.fn();
      const newOnCancel = vi.fn();

      act(() => {
        result.current.handleDisplayConfirmationNeeded(
          mockDisplayInfo,
          newOnConfirm,
          newOnCancel
        );
      });

      expect(result.current.pendingDisplayConfirmation).not.toBeNull();
      expect(result.current.pendingDisplayConfirmation?.onConfirm).toBe(newOnConfirm);
    });

    it('preserves displayInfo structure correctly', () => {
      const { result } = renderHook(() => useDisplayConfirmation());

      const complexDisplayInfo: DisplayInfo = {
        id: 'display-3',
        label: 'Ultra Wide Monitor',
        isPrimary: false,
        bounds: { x: 0, y: 1080, width: 3440, height: 1440 },
      };

      act(() => {
        result.current.handleDisplayConfirmationNeeded(
          complexDisplayInfo,
          mockOnConfirm,
          mockOnCancel
        );
      });

      expect(result.current.pendingDisplayConfirmation?.displayInfo).toEqual(complexDisplayInfo);
      expect(result.current.pendingDisplayConfirmation?.displayInfo.id).toBe('display-3');
      expect(result.current.pendingDisplayConfirmation?.displayInfo.label).toBe('Ultra Wide Monitor');
      expect(result.current.pendingDisplayConfirmation?.displayInfo.isPrimary).toBe(false);
      expect(result.current.pendingDisplayConfirmation?.displayInfo.bounds.width).toBe(3440);
    });
  });

  describe('Edge Cases', () => {
    it('handles rapid successive confirmations', () => {
      const { result } = renderHook(() => useDisplayConfirmation());

      // First confirmation
      act(() => {
        result.current.handleDisplayConfirmationNeeded(
          mockDisplayInfo,
          mockOnConfirm,
          mockOnCancel
        );
      });

      act(() => {
        result.current.handleDisplayConfirmationResponse(true, false);
      });

      expect(mockOnConfirm).toHaveBeenCalledTimes(1);

      // Second confirmation
      act(() => {
        result.current.handleDisplayConfirmationNeeded(
          mockDisplayInfo,
          mockOnConfirm,
          mockOnCancel
        );
      });

      act(() => {
        result.current.handleDisplayConfirmationResponse(false, true);
      });

      expect(mockOnConfirm).toHaveBeenCalledTimes(2);
      expect(result.current.pendingDisplayConfirmation).toBeNull();
    });

    it('handles confirmation with all false parameters', () => {
      const { result } = renderHook(() => useDisplayConfirmation());

      act(() => {
        result.current.handleDisplayConfirmationNeeded(
          mockDisplayInfo,
          mockOnConfirm,
          mockOnCancel
        );
      });

      act(() => {
        result.current.handleDisplayConfirmationResponse(false, false);
      });

      expect(mockOnConfirm).toHaveBeenCalledWith(false, false);
    });

    it('handles confirmation with all true parameters', () => {
      const { result } = renderHook(() => useDisplayConfirmation());

      act(() => {
        result.current.handleDisplayConfirmationNeeded(
          mockDisplayInfo,
          mockOnConfirm,
          mockOnCancel
        );
      });

      act(() => {
        result.current.handleDisplayConfirmationResponse(true, true);
      });

      expect(mockOnConfirm).toHaveBeenCalledWith(true, true);
    });
  });
});
