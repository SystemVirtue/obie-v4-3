/**
 * Utility to validate YT_DLP (youtube-scraper) function availability
 */

import { supabase } from "@/integrations/supabase/client";

export interface YtdlpValidationResult {
  isWorking: boolean;
  message: string;
  error?: string;
}

// Cache validation result to prevent infinite loops
let cachedResult: YtdlpValidationResult | null = null;
let lastValidationTime = 0;
const CACHE_DURATION = 60000; // 1 minute cache

/**
 * Test if the youtube-scraper edge function is working
 * Makes a simple test request to validate functionality
 * Results are cached for 1 minute to prevent infinite loops
 */
export const validateYtdlp = async (): Promise<YtdlpValidationResult> => {
  // Return cached result if available and fresh
  const now = Date.now();
  if (cachedResult && (now - lastValidationTime) < CACHE_DURATION) {
    console.log("[YT_DLP] Returning cached validation result");
    return cachedResult;
  }

  console.log("[YT_DLP] Testing youtube-scraper function...");

  try {
    const { data, error } = await supabase.functions.invoke("youtube-scraper", {
      body: JSON.stringify({
        action: "search",
        query: "music",
        limit: 1,
      }),
    });

    if (error) {
      console.error("[YT_DLP] Test failed:", error);
      const result = {
        isWorking: false,
        message: "YT_DLP function not responding",
        error: error.message,
      };
      cachedResult = result;
      lastValidationTime = now;
      return result;
    }

    if (data && data.videos && Array.isArray(data.videos)) {
      console.log(
        `[YT_DLP] Test successful - received ${data.videos.length} results`,
      );
      const result = {
        isWorking: true,
        message: "Keyless_IO_OK",
      };
      cachedResult = result;
      lastValidationTime = now;
      return result;
    }

    const result = {
      isWorking: false,
      message: "YT_DLP returned invalid response",
    };
    cachedResult = result;
    lastValidationTime = now;
    return result;
  } catch (error) {
    console.error("[YT_DLP] Test exception:", error);
    const result = {
      isWorking: false,
      message: "YT_DLP test failed",
      error: error instanceof Error ? error.message : "Unknown error",
    };
    cachedResult = result;
    lastValidationTime = now;
    return result;
  }
};

/**
 * Clear the cached validation result
 */
export const clearYtdlpCache = () => {
  cachedResult = null;
  lastValidationTime = 0;
  console.log("[YT_DLP] Cache cleared");
};
