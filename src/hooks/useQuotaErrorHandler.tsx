/**
 * Hook to handle API quota errors and trigger testing when quota is exhausted
 */

import { useCallback } from "react";
import { shouldTestApiKeys } from "@/utils/apiKeyValidator";

interface QuotaErrorHandlerProps {
  currentApiKey: string;
  onQuotaExhausted: () => void;
}

export const useQuotaErrorHandler = ({
  currentApiKey,
  onQuotaExhausted,
}: QuotaErrorHandlerProps) => {
  /**
   * Handle API errors that might indicate quota exhaustion
   * Triggers API key testing if quota error is detected
   */
  const handleApiError = useCallback(
    async (error: any): Promise<boolean> => {
      const errorMessage = error?.message || error?.toString() || "";

      // Check if error indicates quota exhaustion
      const isQuotaError =
        errorMessage.includes("quotaExceeded") ||
        errorMessage.includes("quota") ||
        errorMessage.includes("403");

      if (isQuotaError) {
        console.log(
          "[QuotaError] Detected quota exhaustion error:",
          errorMessage,
        );

        // Validate current key and trigger testing if needed
        const validation = await shouldTestApiKeys(currentApiKey, true);

        if (validation.shouldTest) {
          console.log(
            "[QuotaError] Triggering API key test due to quota error",
          );
          onQuotaExhausted();
          return true; // Error was handled
        }
      }

      return false; // Error was not a quota error or doesn't need handling
    },
    [currentApiKey, onQuotaExhausted],
  );

  return { handleApiError };
};
