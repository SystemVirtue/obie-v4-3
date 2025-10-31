/**
 * Standardized Error Handling System
 * Provides consistent error logging, categorization, and recovery patterns
 */

export enum ErrorSeverity {
  LOW = 'low',       // Non-critical, user can continue
  MEDIUM = 'medium', // Affects functionality but has fallbacks
  HIGH = 'high',     // Critical functionality broken
  CRITICAL = 'critical' // App-breaking errors
}

export enum ErrorCategory {
  NETWORK = 'network',
  API = 'api',
  PARSING = 'parsing',
  VALIDATION = 'validation',
  STORAGE = 'storage',
  PLAYER = 'player',
  PLAYLIST = 'playlist',
  SEARCH = 'search',
  CONFIGURATION = 'configuration',
  UNKNOWN = 'unknown'
}

export interface ErrorContext {
  component?: string;
  operation?: string;
  userId?: string;
  playlistId?: string;
  videoId?: string;
  apiKey?: string;
  retryCount?: number;
  timestamp?: number;
  userAgent?: string;
  url?: string;
}

export interface StandardizedError {
  id: string;
  message: string;
  originalError?: Error | unknown;
  severity: ErrorSeverity;
  category: ErrorCategory;
  context: ErrorContext;
  timestamp: number;
  stack?: string;
  recoverable: boolean;
  recoveryAction?: string;
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorLog: StandardizedError[] = [];
  private readonly MAX_LOG_SIZE = 100;

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Handle an error with standardized logging and categorization
   */
  handleError(
    error: Error | unknown,
    category: ErrorCategory,
    severity: ErrorSeverity,
    context: ErrorContext = {},
    recoverable: boolean = true,
    recoveryAction?: string
  ): StandardizedError {
    const standardizedError: StandardizedError = {
      id: this.generateErrorId(),
      message: this.extractMessage(error),
      originalError: error,
      severity,
      category,
      context: {
        ...context,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
      },
      timestamp: Date.now(),
      stack: error instanceof Error ? error.stack : undefined,
      recoverable,
      recoveryAction,
    };

    // Log to console with consistent format
    this.logError(standardizedError);

    // Store in memory log
    this.errorLog.unshift(standardizedError);
    if (this.errorLog.length > this.MAX_LOG_SIZE) {
      this.errorLog.pop();
    }

    // Report critical errors
    if (severity === ErrorSeverity.CRITICAL) {
      this.reportCriticalError(standardizedError);
    }

    return standardizedError;
  }

  /**
   * Handle network-related errors
   */
  handleNetworkError(
    error: Error | unknown,
    operation: string,
    context: ErrorContext = {}
  ): StandardizedError {
    const isRetryable = this.isRetryableNetworkError(error);

    return this.handleError(
      error,
      ErrorCategory.NETWORK,
      ErrorSeverity.MEDIUM,
      { ...context, operation },
      isRetryable,
      isRetryable ? 'Retry operation after delay' : 'Check network connection'
    );
  }

  /**
   * Handle API-related errors
   */
  handleApiError(
    error: Error | unknown,
    operation: string,
    context: ErrorContext = {}
  ): StandardizedError {
    const severity = this.determineApiErrorSeverity(error);

    return this.handleError(
      error,
      ErrorCategory.API,
      severity,
      { ...context, operation },
      severity !== ErrorSeverity.CRITICAL,
      this.getApiRecoveryAction(error)
    );
  }

  /**
   * Handle playlist-related errors
   */
  handlePlaylistError(
    error: Error | unknown,
    operation: string,
    context: ErrorContext = {}
  ): StandardizedError {
    return this.handleError(
      error,
      ErrorCategory.PLAYLIST,
      ErrorSeverity.HIGH,
      { ...context, operation },
      true,
      'Try loading playlist again or use fallback method'
    );
  }

  /**
   * Handle player-related errors
   */
  handlePlayerError(
    error: Error | unknown,
    operation: string,
    context: ErrorContext = {}
  ): StandardizedError {
    return this.handleError(
      error,
      ErrorCategory.PLAYER,
      ErrorSeverity.HIGH,
      { ...context, operation },
      true,
      'Reinitialize player or refresh page'
    );
  }

  /**
   * Handle search-related errors
   */
  handleSearchError(
    error: Error | unknown,
    operation: string,
    context: ErrorContext = {}
  ): StandardizedError {
    return this.handleError(
      error,
      ErrorCategory.SEARCH,
      ErrorSeverity.MEDIUM,
      { ...context, operation },
      true,
      'Try different search method or check query'
    );
  }

  /**
   * Get recent errors for debugging
   */
  getRecentErrors(limit: number = 10): StandardizedError[] {
    return this.errorLog.slice(0, limit);
  }

  /**
   * Get errors by category
   */
  getErrorsByCategory(category: ErrorCategory): StandardizedError[] {
    return this.errorLog.filter(error => error.category === category);
  }

  /**
   * Clear error log
   */
  clearLog(): void {
    this.errorLog = [];
  }

  /**
   * Export error log for debugging
   */
  exportLog(): string {
    return JSON.stringify(this.errorLog, null, 2);
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private extractMessage(error: Error | unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    return 'Unknown error occurred';
  }

  private logError(error: StandardizedError): void {
    const prefix = `[${error.category.toUpperCase()}]`;
    const contextStr = this.formatContext(error.context);

    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
        console.error(`${prefix} CRITICAL: ${error.message}${contextStr}`, error.originalError);
        break;
      case ErrorSeverity.HIGH:
        console.error(`${prefix} HIGH: ${error.message}${contextStr}`, error.originalError);
        break;
      case ErrorSeverity.MEDIUM:
        console.warn(`${prefix} MEDIUM: ${error.message}${contextStr}`, error.originalError);
        break;
      case ErrorSeverity.LOW:
        console.info(`${prefix} LOW: ${error.message}${contextStr}`, error.originalError);
        break;
    }
  }

  private formatContext(context: ErrorContext): string {
    const parts: string[] = [];

    if (context.component) parts.push(`component=${context.component}`);
    if (context.operation) parts.push(`operation=${context.operation}`);
    if (context.playlistId) parts.push(`playlist=${context.playlistId}`);
    if (context.videoId) parts.push(`video=${context.videoId}`);
    if (context.retryCount !== undefined) parts.push(`retry=${context.retryCount}`);

    return parts.length > 0 ? ` (${parts.join(', ')})` : '';
  }

  private isRetryableNetworkError(error: Error | unknown): boolean {
    if (!(error instanceof Error)) return false;

    const message = error.message.toLowerCase();
    return message.includes('network') ||
           message.includes('timeout') ||
           message.includes('fetch') ||
           message.includes('connection');
  }

  private determineApiErrorSeverity(error: Error | unknown): ErrorSeverity {
    if (!(error instanceof Error)) return ErrorSeverity.MEDIUM;

    const message = error.message.toLowerCase();
    if (message.includes('quota') || message.includes('key')) {
      return ErrorSeverity.HIGH;
    }
    if (message.includes('network') || message.includes('timeout')) {
      return ErrorSeverity.MEDIUM;
    }
    return ErrorSeverity.LOW;
  }

  private getApiRecoveryAction(error: Error | unknown): string {
    if (!(error instanceof Error)) return 'Retry operation';

    const message = error.message.toLowerCase();
    if (message.includes('quota')) {
      return 'Wait for quota reset or configure new API key';
    }
    if (message.includes('key')) {
      return 'Check API key configuration';
    }
    if (message.includes('network')) {
      return 'Check network connection and retry';
    }
    return 'Retry operation or try alternative method';
  }

  private reportCriticalError(error: StandardizedError): void {
    // In a production app, this would send to error reporting service
    console.error('CRITICAL ERROR REPORT:', {
      id: error.id,
      message: error.message,
      category: error.category,
      context: error.context,
      stack: error.stack,
    });
  }
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance();

// Convenience functions for common error types
export const handleNetworkError = (error: Error | unknown, operation: string, context?: ErrorContext) =>
  errorHandler.handleNetworkError(error, operation, context);

export const handleApiError = (error: Error | unknown, operation: string, context?: ErrorContext) =>
  errorHandler.handleApiError(error, operation, context);

export const handlePlaylistError = (error: Error | unknown, operation: string, context?: ErrorContext) =>
  errorHandler.handlePlaylistError(error, operation, context);

export const handlePlayerError = (error: Error | unknown, operation: string, context?: ErrorContext) =>
  errorHandler.handlePlayerError(error, operation, context);

export const handleSearchError = (error: Error | unknown, operation: string, context?: ErrorContext) =>
  errorHandler.handleSearchError(error, operation, context);