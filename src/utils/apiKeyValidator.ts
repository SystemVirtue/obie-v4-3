/**
 * Utility to determine if API key testing is needed
 */

import { youtubeQuotaService } from "@/services/youtube/api";

export interface KeyValidationResult {
  shouldTest: boolean;
  reason: string;
  currentKey?: string;
  quotaPercentage?: number;
}

/**
 * Check if API key testing should run
 * Only tests if:
 * 1. No current API key assigned
 * 2. Current key has < 10% quota remaining
 * 3. Error indicates quota exhausted
 */
export const shouldTestApiKeys = async (
  currentKey: string | undefined,
  checkQuota: boolean = true,
): Promise<KeyValidationResult> => {
  // Case 1: No API key assigned
  if (!currentKey || !currentKey.startsWith("AIza") || currentKey.length < 20) {
    return {
      shouldTest: true,
      reason: "No valid API key assigned",
    };
  }

  // Case 2: Check quota if requested
  if (checkQuota) {
    try {
      const quotaUsage = await youtubeQuotaService.checkQuotaUsage(currentKey);
      const percentage = quotaUsage.percentage;

      // Less than 10% quota remaining
      if (percentage >= 90) {
        return {
          shouldTest: true,
          reason: "Current key has less than 10% quota remaining",
          currentKey,
          quotaPercentage: percentage,
        };
      }

      // Key is good
      return {
        shouldTest: false,
        reason: "Current key has sufficient quota",
        currentKey,
        quotaPercentage: percentage,
      };
    } catch (error) {
      // Case 3: Error checking quota (likely exhausted or invalid)
      return {
        shouldTest: true,
        reason: "Error checking current key - may be exhausted",
        currentKey,
      };
    }
  }

  // Skip quota check, key exists, assume it's valid
  return {
    shouldTest: false,
    reason: "Current key exists (quota check skipped)",
    currentKey,
  };
};
