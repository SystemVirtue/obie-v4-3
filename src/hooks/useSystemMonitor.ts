import { useEffect, useState, useCallback } from 'react';

export interface SystemProfile {
  memory?: number; // GB (powers of 2)
  cores: number; // CPU cores
  connection?: {
    effectiveType: string; // '4g', '3g', 'slow-2g', etc.
    downlink: number; // Mbps
    rtt: number; // ms
  };
  performance?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
  };
}

export type AdaptiveQuality = 'hd1080' | 'hd720' | 'medium' | 'small';

export function useSystemMonitor(enabled: boolean = true) {
  const [systemProfile, setSystemProfile] = useState<SystemProfile>({
    cores: navigator.hardwareConcurrency || 2,
  });

  const [bandwidth, setBandwidth] = useState<number | null>(null);

  const updateSystemProfile = useCallback(() => {
    const profile: SystemProfile = {
      cores: navigator.hardwareConcurrency || 2,
    };

    // Device Memory API (Chrome/Edge)
    if ('deviceMemory' in navigator) {
      profile.memory = (navigator as any).deviceMemory;
    }

    // Network Information API
    const connection = (navigator as any).connection ||
                      (navigator as any).mozConnection ||
                      (navigator as any).webkitConnection;

    if (connection) {
      profile.connection = {
        effectiveType: connection.effectiveType || 'unknown',
        downlink: connection.downlink || 0,
        rtt: connection.rtt || 0,
      };
    }

    // Performance Memory API (Chrome only)
    if ('memory' in performance) {
      profile.performance = {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
      };
    }

    setSystemProfile(profile);
  }, []);

  // Bandwidth test function
  const measureBandwidth = useCallback(async (): Promise<number> => {
    try {
      // Use a small test file from a CDN
      const testUrl = 'https://www.gstatic.com/generate_204'; // 0-byte response
      const start = performance.now();

      const response = await fetch(testUrl, {
        method: 'HEAD',
        cache: 'no-store',
      });

      const end = performance.now();
      const duration = end - start;

      // Rough estimation: assume 204 response is ~1KB
      const bytes = 1024;
      const bitsPerSecond = (bytes * 8) / (duration / 1000);
      const mbps = bitsPerSecond / (1024 * 1024);

      return Math.max(0.1, mbps); // Minimum 0.1 Mbps
    } catch (error) {
      console.warn('Bandwidth test failed:', error);
      return 1.0; // Fallback to 1 Mbps
    }
  }, []);

  // Calculate optimal quality based on system profile
  const getOptimalQuality = useCallback((): AdaptiveQuality => {
    if (!enabled) return 'hd1080';

    const { memory, cores, connection } = systemProfile;

    // Very low-end device
    if (memory && memory <= 2) {
      return 'small';
    }

    // Slow connection
    if (connection) {
      if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
        return 'small';
      }
      if (connection.effectiveType === '3g' || connection.downlink < 1.5) {
        return 'medium';
      }
    }

    // Low CPU cores
    if (cores <= 2) {
      return 'medium';
    }

    // Bandwidth-based adjustment
    if (bandwidth !== null && bandwidth < 2) {
      return 'medium';
    }
    if (bandwidth !== null && bandwidth < 5) {
      return 'hd720';
    }

    // Default to high quality
    return 'hd1080';
  }, [enabled, systemProfile, bandwidth]);

  useEffect(() => {
    if (!enabled) return;

    // Initial update
    updateSystemProfile();

    // Run bandwidth test
    measureBandwidth().then(setBandwidth);

    // Set up connection monitoring
    const connection = (navigator as any).connection ||
                      (navigator as any).mozConnection ||
                      (navigator as any).webkitConnection;

    if (connection) {
      const handleConnectionChange = () => {
        updateSystemProfile();
        // Re-measure bandwidth on connection change
        measureBandwidth().then(setBandwidth);
      };

      connection.addEventListener('change', handleConnectionChange);

      return () => {
        connection.removeEventListener('change', handleConnectionChange);
      };
    }

    // Periodic bandwidth re-measurement (every 5 minutes)
    const bandwidthInterval = setInterval(() => {
      measureBandwidth().then(setBandwidth);
    }, 5 * 60 * 1000);

    return () => clearInterval(bandwidthInterval);
  }, [enabled, updateSystemProfile, measureBandwidth]);

  return {
    systemProfile,
    bandwidth,
    optimalQuality: getOptimalQuality(),
    refreshProfile: updateSystemProfile,
  };
}