/**
 * CHANGELOG - Phase 2
 * 
 * ADDED:
 * - Request queue with priority handling
 * - Integration with rate limiter
 * - Automatic retry with exponential backoff
 * - Request deduplication
 * 
 * TESTING:
 * - Test priority ordering works correctly
 * - Verify rate limiting is respected
 * - Check retry logic with exponential backoff
 * - Test deduplication prevents duplicate requests
 */

import { rateLimiter } from './rateLimiter';

type RequestPriority = 'high' | 'normal' | 'low';
type RequestType = 'search' | 'playlist' | 'validation';

interface QueuedRequest<T = any> {
  id: string;
  type: RequestType;
  serviceName: string;
  params: any;
  priority: RequestPriority;
  retryCount: number;
  maxRetries: number;
  resolve: (value: T) => void;
  reject: (error: any) => void;
  executor: () => Promise<T>;
}

class RequestQueue {
  private queue: QueuedRequest[] = [];
  private processing = false;
  private readonly MAX_RETRIES = 3;
  private readonly BASE_RETRY_DELAY = 1000; // 1 second
  private activeRequests = new Set<string>();

  /**
   * Generate a unique request ID for deduplication
   */
  private generateRequestId(type: RequestType, params: any): string {
    return `${type}-${JSON.stringify(params)}`;
  }

  /**
   * Check if a similar request is already queued or processing
   */
  private isDuplicate(requestId: string): boolean {
    return (
      this.activeRequests.has(requestId) ||
      this.queue.some(req => req.id === requestId)
    );
  }

  /**
   * Enqueue a new request with priority
   */
  async enqueue<T>(
    type: RequestType,
    serviceName: string,
    params: any,
    executor: () => Promise<T>,
    priority: RequestPriority = 'normal'
  ): Promise<T> {
    const requestId = this.generateRequestId(type, params);

    // Check for duplicate requests
    if (this.isDuplicate(requestId)) {
      console.log(`[RequestQueue] Duplicate request detected, skipping: ${requestId}`);
      return Promise.reject(new Error('Duplicate request in progress'));
    }

    return new Promise((resolve, reject) => {
      const request: QueuedRequest<T> = {
        id: requestId,
        type,
        serviceName,
        params,
        priority,
        retryCount: 0,
        maxRetries: this.MAX_RETRIES,
        resolve,
        reject,
        executor,
      };

      this.queue.push(request);
      console.log(`[RequestQueue] Enqueued ${type} request (priority: ${priority}), queue length: ${this.queue.length}`);
      
      this.processQueue();
    });
  }

  /**
   * Process the queue
   */
  private async processQueue() {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;

    try {
      // Sort queue by priority
      this.sortQueue();

      const request = this.queue.shift();
      if (!request) {
        this.processing = false;
        return;
      }

      // Mark as active
      this.activeRequests.add(request.id);

      // Check rate limit
      if (!rateLimiter.canMakeRequest(request.serviceName)) {
        const waitTime = rateLimiter.getWaitTime(request.serviceName);
        console.log(`[RequestQueue] Rate limited, waiting ${waitTime}s for ${request.serviceName}`);
        
        // Re-queue the request
        this.queue.unshift(request);
        this.activeRequests.delete(request.id);
        
        // Wait and try again
        await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
        this.processing = false;
        this.processQueue();
        return;
      }

      // Execute request
      try {
        console.log(`[RequestQueue] Executing ${request.type} request (attempt ${request.retryCount + 1}/${request.maxRetries + 1})`);
        const result = await request.executor();
        request.resolve(result);
        this.activeRequests.delete(request.id);
      } catch (error) {
        console.error(`[RequestQueue] Request failed:`, error);

        // Retry logic
        if (request.retryCount < request.maxRetries) {
          request.retryCount++;
          const retryDelay = this.BASE_RETRY_DELAY * Math.pow(2, request.retryCount - 1);
          
          console.log(`[RequestQueue] Retrying in ${retryDelay}ms (attempt ${request.retryCount}/${request.maxRetries})`);
          
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          
          // Re-queue with lower priority
          request.priority = 'low';
          this.queue.push(request);
          this.activeRequests.delete(request.id);
        } else {
          console.error(`[RequestQueue] Max retries reached for ${request.type} request`);
          request.reject(error);
          this.activeRequests.delete(request.id);
        }
      }
    } catch (error) {
      console.error('[RequestQueue] Error processing queue:', error);
    } finally {
      this.processing = false;
      
      // Continue processing if there are more items
      if (this.queue.length > 0) {
        this.processQueue();
      }
    }
  }

  /**
   * Sort queue by priority
   */
  private sortQueue() {
    const priorityValues = { high: 3, normal: 2, low: 1 };
    this.queue.sort((a, b) => priorityValues[b.priority] - priorityValues[a.priority]);
  }

  /**
   * Get queue status
   */
  getStatus(): { queueLength: number; activeRequests: number; processing: boolean } {
    return {
      queueLength: this.queue.length,
      activeRequests: this.activeRequests.size,
      processing: this.processing,
    };
  }

  /**
   * Clear the queue
   */
  clear(): void {
    this.queue = [];
    this.activeRequests.clear();
    this.processing = false;
    console.log('[RequestQueue] Queue cleared');
  }
}

// Export singleton instance
export const requestQueue = new RequestQueue();
