/**
 * YouTube API Key Rotation Service
 * Manages multiple API keys and automatic rotation based on quota usage
 */

import { youtubeQuotaService } from './quota';

export interface APIKeyConfig {
  key1: string;
  key2: string;
  key3: string;
  key4: string;
  key5: string;
  key6: string;
  key7: string;
  key8: string;
}

export interface RotationEvent {
  timestamp: string;
  from: string; // Last 8 chars of old key
  to: string;   // Last 8 chars of new key
  reason: string;
}

export class APIKeyRotationService {
  private rotationHistory: RotationEvent[] = [];
  private readonly MAX_HISTORY = 10;

  constructor(private apiKeys: APIKeyConfig) {}

  /**
   * Get all available API keys as an array
   */
  getAvailableKeys(customKey?: string, includeCustom: boolean = false): string[] {
    const keys = Object.values(this.apiKeys).filter(key => key.length > 0);
    
    if (includeCustom && customKey && customKey.length > 0) {
      keys.push(customKey);
    }
    
    return keys;
  }

  /**
   * Get the key option name from an API key value
   */
  getOptionFromKey(apiKey: string, customKey?: string): string {
    for (const [option, key] of Object.entries(this.apiKeys)) {
      if (key === apiKey) return option;
    }
    return customKey === apiKey ? 'custom' : 'key1';
  }

  /**
   * Get the next available key with quota remaining
   */
  async getNextAvailableKey(
    currentKey: string,
    customKey?: string
  ): Promise<string | null> {
    const availableKeys = this.getAvailableKeys(customKey, true);
    
    // Filter out the current key
    const otherKeys = availableKeys.filter(key => key !== currentKey);
    
    if (otherKeys.length === 0) {
      console.warn('[KeyRotation] No alternative keys available');
      return null;
    }

    // Check each key's quota status
    for (const key of otherKeys) {
      try {
        const quotaStatus = await youtubeQuotaService.checkQuotaUsage(key);
        
        // If quota is under 80%, use this key
        if (quotaStatus.percentage < 80) {
          console.log(`[KeyRotation] Found available key with ${quotaStatus.percentage}% quota used`);
          return key;
        }
      } catch (error) {
        console.error(`[KeyRotation] Error checking key quota:`, error);
        // Continue to next key
      }
    }

    // If all keys are above 80%, return the first one anyway
    console.warn('[KeyRotation] All keys above 80% quota, returning first alternative');
    return otherKeys[0];
  }

  /**
   * Rotate to a specific key and record the event
   */
  recordRotation(fromKey: string, toKey: string, reason: string): void {
    const event: RotationEvent = {
      timestamp: new Date().toISOString(),
      from: fromKey.slice(-8),
      to: toKey.slice(-8),
      reason,
    };

    this.rotationHistory.unshift(event);
    
    // Keep only the last N rotations
    if (this.rotationHistory.length > this.MAX_HISTORY) {
      this.rotationHistory = this.rotationHistory.slice(0, this.MAX_HISTORY);
    }

    console.log(`[KeyRotation] ${reason}: ${event.from} → ${event.to}`);
  }

  /**
   * Get rotation history
   */
  getRotationHistory(): RotationEvent[] {
    return [...this.rotationHistory];
  }

  /**
   * Get quota status for all keys
   */
  async getAllKeysStatus(customKey?: string): Promise<Record<string, { percentage: number; isExhausted: boolean }>> {
    const availableKeys = this.getAvailableKeys(customKey, true);
    const statuses = await youtubeQuotaService.getAllKeysQuotaStatus(availableKeys);
    
    const result: Record<string, { percentage: number; isExhausted: boolean }> = {};
    
    availableKeys.forEach((key, index) => {
      const keyName = this.getOptionFromKey(key, customKey);
      const status = statuses[index];
      
      result[keyName] = {
        percentage: status?.percentage || 0,
        isExhausted: (status?.percentage || 0) >= 100,
      };
    });

    return result;
  }

  /**
   * Check if rotation is needed based on quota usage
   */
  async shouldRotate(currentKey: string, threshold: number = 80): Promise<boolean> {
    try {
      const quotaStatus = await youtubeQuotaService.checkQuotaUsage(currentKey);
      return quotaStatus.percentage >= threshold;
    } catch (error) {
      console.error('[KeyRotation] Error checking if rotation needed:', error);
      return false;
    }
  }

  /**
   * Perform automatic rotation if needed
   */
  async autoRotate(
    currentKey: string,
    customKey?: string,
    threshold: number = 80
  ): Promise<string | null> {
    const shouldRotate = await this.shouldRotate(currentKey, threshold);
    
    if (!shouldRotate) {
      return null; // No rotation needed
    }

    const nextKey = await this.getNextAvailableKey(currentKey, customKey);
    
    if (nextKey && nextKey !== currentKey) {
      this.recordRotation(currentKey, nextKey, 'Quota threshold exceeded');
      return nextKey;
    }

    return null;
  }

  /**
   * Validate all available keys and return only valid ones with quota remaining
   */
  async getValidKeysWithQuota(customKey?: string): Promise<{ key: string; option: string; quotaPercentage: number }[]> {
    const availableKeys = this.getAvailableKeys(customKey, true);
    const validKeys: { key: string; option: string; quotaPercentage: number }[] = [];

    console.log(`[KeyRotation] Validating ${availableKeys.length} API keys...`);

    // Check each key's validity and quota status
    for (const key of availableKeys) {
      try {
        // First check if key is valid by testing it
        const { testApiKey } = await import('@/utils/apiKeyTester');
        const testResult = await testApiKey(key);

        if (testResult.isValid && !testResult.quotaUsed) {
          // Key is valid and not quota-exhausted, now check quota percentage
          const quotaStatus = await youtubeQuotaService.checkQuotaUsage(key);

          // Only include keys with less than 95% quota used (leave some buffer)
          if (quotaStatus.percentage < 95) {
            const option = this.getOptionFromKey(key, customKey);
            validKeys.push({
              key,
              option,
              quotaPercentage: quotaStatus.percentage
            });
            console.log(`[KeyRotation] ✓ Valid key ${option}: ${quotaStatus.percentage.toFixed(1)}% quota used`);
          } else {
            console.log(`[KeyRotation] ✗ Key ${this.getOptionFromKey(key, customKey)} quota too high: ${quotaStatus.percentage.toFixed(1)}%`);
          }
        } else {
          console.log(`[KeyRotation] ✗ Invalid or quota-exhausted key ${this.getOptionFromKey(key, customKey)}: ${testResult.message}`);
        }
      } catch (error) {
        console.error(`[KeyRotation] Error validating key ${this.getOptionFromKey(key, customKey)}:`, error);
      }
    }

    console.log(`[KeyRotation] Found ${validKeys.length} valid keys with available quota`);
    return validKeys;
  }
}

// Singleton instance with default keys
export const apiKeyRotation = new APIKeyRotationService({
  key1: 'AIzaSyC12QKbzGaKZw9VD3-ulxU_mrd0htZBiI4',
  key2: 'AIzaSyDQ_Jx4Dwje2snQisj7hEFVK9lJJ0tptcc',
  key3: 'AIzaSyDy6_QI9SP5nOZRVoNa5xghSHtY3YWX5kU',
  key4: 'AIzaSyCPAY_ukeGnAGJdCvYk1bVVDxZjQRJqsdk',
  key5: 'AIzaSyD7iB_2dHUu9yS87WD4wMbkJQduibU5vco',
  key6: 'AIzaSyCgtXTfFuUiiBsNXH6z_k9-GiCqiS0Cgso',
  key7: 'AIzaSyCKHHGkaztp8tfs2BVxiny0InE_z-kGDtY',
  key8: 'AIzaSyBGcwaCm70o4ir0CKcNIJ0V_7TeyY2cwdA',
});
