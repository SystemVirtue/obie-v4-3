/**
 * Display Confirmation Hook
 * 
 * Manages the display confirmation dialog state and callbacks.
 * Used when the player needs to confirm which display to use and whether to use fullscreen.
 * 
 * @module hooks/useDisplayConfirmation
 */

import { useState, useCallback } from "react";
import type { DisplayInfo } from "../types/jukebox";

export interface PendingDisplayConfirmation {
  displayInfo: DisplayInfo;
  onConfirm: (useFullscreen: boolean, rememberChoice: boolean) => void;
  onCancel: () => void;
}

export interface UseDisplayConfirmationReturn {
  pendingDisplayConfirmation: PendingDisplayConfirmation | null;
  handleDisplayConfirmationNeeded: (
    displayInfo: DisplayInfo,
    onConfirm: (useFullscreen: boolean, rememberChoice: boolean) => void,
    onCancel: () => void,
  ) => void;
  handleDisplayConfirmationResponse: (
    useFullscreen: boolean,
    rememberChoice: boolean,
  ) => void;
  handleDisplayConfirmationCancel: () => void;
}

/**
 * Hook to manage display confirmation dialog state
 * 
 * @returns Display confirmation state and handlers
 * 
 * @example
 * ```tsx
 * const displayConfirmation = useDisplayConfirmation();
 * 
 * // When player needs display confirmation
 * displayConfirmation.handleDisplayConfirmationNeeded(
 *   displayInfo,
 *   (useFullscreen, rememberChoice) => {
 *     // Handle confirmation
 *   },
 *   () => {
 *     // Handle cancel
 *   }
 * );
 * 
 * // In the dialog component
 * <DisplayConfirmationDialog
 *   isOpen={!!displayConfirmation.pendingDisplayConfirmation}
 *   displayInfo={displayConfirmation.pendingDisplayConfirmation?.displayInfo}
 *   onConfirm={displayConfirmation.handleDisplayConfirmationResponse}
 *   onCancel={displayConfirmation.handleDisplayConfirmationCancel}
 * />
 * ```
 */
export const useDisplayConfirmation = (): UseDisplayConfirmationReturn => {
  const [pendingDisplayConfirmation, setPendingDisplayConfirmation] =
    useState<PendingDisplayConfirmation | null>(null);

  /**
   * Called when display confirmation is needed
   * Stores the display info and callbacks for later use
   */
  const handleDisplayConfirmationNeeded = useCallback(
    (
      displayInfo: DisplayInfo,
      onConfirm: (useFullscreen: boolean, rememberChoice: boolean) => void,
      onCancel: () => void,
    ) => {
      setPendingDisplayConfirmation({ displayInfo, onConfirm, onCancel });
    },
    [],
  );

  /**
   * Called when user confirms the display choice
   * Executes the stored onConfirm callback and clears the pending state
   */
  const handleDisplayConfirmationResponse = useCallback(
    (useFullscreen: boolean, rememberChoice: boolean) => {
      if (pendingDisplayConfirmation) {
        pendingDisplayConfirmation.onConfirm(useFullscreen, rememberChoice);
        setPendingDisplayConfirmation(null);
      }
    },
    [pendingDisplayConfirmation],
  );

  /**
   * Called when user cancels the display choice
   * Executes the stored onCancel callback and clears the pending state
   */
  const handleDisplayConfirmationCancel = useCallback(() => {
    if (pendingDisplayConfirmation) {
      pendingDisplayConfirmation.onCancel();
      setPendingDisplayConfirmation(null);
    }
  }, [pendingDisplayConfirmation]);

  return {
    pendingDisplayConfirmation,
    handleDisplayConfirmationNeeded,
    handleDisplayConfirmationResponse,
    handleDisplayConfirmationCancel,
  };
};
