/**
 * AWTRIX3 Error Handling System
 * Centralized error management with logging, user feedback and recovery
 * @version 2.0.0
 */

import { CONFIG, ERROR_MESSAGES, ENVIRONMENT } from './config.js';
import { HTTPError, NetworkError, TimeoutError, ValidationError } from './utils.js';

/**
 * Error severity levels
 */
export const ErrorSeverity = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

/**
 * Error categories for better handling
 */
export const ErrorCategory = {
  NETWORK: 'network',
  VALIDATION: 'validation',
  API: 'api',
  USER_INPUT: 'user_input',
  SYSTEM: 'system',
  EXTERNAL: 'external'
};

/**
 * Enhanced Error class with additional context
 */
export class AppError extends Error {
  constructor(message, category = ErrorCategory.SYSTEM, severity = ErrorSeverity.MEDIUM, context = {}) {
    super(message);
    this.name = 'AppError';
    this.category = category;
    this.severity = severity;
    this.context = context;
    this.timestamp = new Date().toISOString();
    this.userAgent = navigator.userAgent;
    this.url = window.location.href;
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      category: this.category,
      severity: this.severity,
      context: this.context,
      timestamp: this.timestamp,
      userAgent: this.userAgent,
      url: this.url,
      stack: this.stack
    };
  }
}

/**
 * Error Handler with logging, user feedback and recovery strategies
 */
export class ErrorHandler {
  static #instance = null;
  static #errorLog = [];
  static #maxLogSize = 100;
  static #recoveryStrategies = new Map();

  constructor() {
    if (ErrorHandler.#instance) {
      return ErrorHandler.#instance;
    }

    this.initializeGlobalErrorHandling();
    this.setupRecoveryStrategies();
    
    ErrorHandler.#instance = this;
  }

  static getInstance() {
    if (!ErrorHandler.#instance) {
      ErrorHandler.#instance = new ErrorHandler();
    }
    return ErrorHandler.#instance;
  }

  /**
   * Handle any error with appropriate response
   */
  async handleError(error, context = {}) {
    const appError = this.normalizeError(error, context);
    
    // Log the error
    this.logError(appError);

    // Show user feedback based on severity
    this.showUserFeedback(appError);

    // Attempt recovery if strategy exists
    await this.attemptRecovery(appError);

    // Report to monitoring if enabled
    this.reportError(appError);

    return appError;
  }

  /**
   * Normalize different error types to AppError
   */
  normalizeError(error, context = {}) {
    if (error instanceof AppError) {
      return error;
    }

    let category = ErrorCategory.SYSTEM;
    let severity = ErrorSeverity.MEDIUM;
    let message = error.message || ERROR_MESSAGES.UNKNOWN_ERROR;

    // Categorize known error types
    if (error instanceof NetworkError) {
      category = ErrorCategory.NETWORK;
      severity = ErrorSeverity.HIGH;
      message = ERROR_MESSAGES.NETWORK_ERROR;
    } else if (error instanceof TimeoutError) {
      category = ErrorCategory.NETWORK;
      severity = ErrorSeverity.MEDIUM;
      message = ERROR_MESSAGES.TIMEOUT_ERROR;
    } else if (error instanceof ValidationError) {
      category = ErrorCategory.VALIDATION;
      severity = ErrorSeverity.LOW;
    } else if (error instanceof HTTPError) {
      category = ErrorCategory.API;
      severity = error.status >= 500 ? ErrorSeverity.HIGH : ErrorSeverity.MEDIUM;
      
      // More specific messages based on HTTP status
      if (error.status === 404) {
        message = 'Resource not found';
      } else if (error.status === 403) {
        message = ERROR_MESSAGES.PERMISSION_DENIED;
      } else if (error.status >= 500) {
        message = 'Server error occurred';
      }
    }

    return new AppError(message, category, severity, {
      originalError: error,
      ...context
    });
  }

  /**
   * Log errors with rotation to prevent memory issues
   */
  logError(appError) {
    const logEntry = {
      ...appError.toJSON(),
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    ErrorHandler.#errorLog.unshift(logEntry);

    // Rotate log if too large
    if (ErrorHandler.#errorLog.length > ErrorHandler.#maxLogSize) {
      ErrorHandler.#errorLog = ErrorHandler.#errorLog.slice(0, ErrorHandler.#maxLogSize);
    }

    // Console logging based on environment
    if (CONFIG.DEBUG || ENVIRONMENT.isDevelopment()) {
      console.group(`🚨 ${appError.category.toUpperCase()} Error [${appError.severity.toUpperCase()}]`);
      console.error('Message:', appError.message);
      console.error('Context:', appError.context);
      console.error('Stack:', appError.stack);
      console.groupEnd();
    } else if (appError.severity === ErrorSeverity.CRITICAL) {
      console.error('Critical Error:', appError.message, appError.context);
    }
  }

  /**
   * Show appropriate user feedback based on error severity and category
   */
  showUserFeedback(appError) {
    const toastSystem = window.toastSystem || this.createFallbackToast();
    
    let message = appError.message;
    let type = 'error';
    let duration = CONFIG.UI.TOAST_DURATION;

    // Adjust feedback based on severity
    switch (appError.severity) {
      case ErrorSeverity.LOW:
        type = 'warning';
        duration = CONFIG.UI.TOAST_DURATION * 0.8;
        break;
      case ErrorSeverity.MEDIUM:
        type = 'error';
        break;
      case ErrorSeverity.HIGH:
        type = 'error';
        duration = CONFIG.UI.TOAST_DURATION * 1.5;
        break;
      case ErrorSeverity.CRITICAL:
        type = 'error';
        duration = CONFIG.UI.TOAST_DURATION * 2;
        message = `Critical Error: ${message}`;
        break;
    }

    // Category-specific adjustments
    if (appError.category === ErrorCategory.VALIDATION) {
      type = 'warning';
    } else if (appError.category === ErrorCategory.NETWORK) {
      message += ' Please check your connection.';
    }

    toastSystem.show(message, type, { duration });
  }

  /**
   * Attempt error recovery based on category and context
   */
  async attemptRecovery(appError) {
    const strategy = ErrorHandler.#recoveryStrategies.get(appError.category);
    
    if (strategy) {
      try {
        await strategy(appError);
      } catch (recoveryError) {
        console.warn('Recovery strategy failed:', recoveryError);
      }
    }
  }

  /**
   * Setup recovery strategies for different error categories
   */
  setupRecoveryStrategies() {
    ErrorHandler.#recoveryStrategies.set(ErrorCategory.NETWORK, async (error) => {
      // Attempt to reconnect or switch to fallback
      const apiManager = await import('./api-service.js').then(m => m.apiManager);
      const isOnline = await apiManager.healthCheck();
      
      if (!isOnline && error.context.retry !== false) {
        // Try default IP as fallback
        try {
          await apiManager.reconnect(`http://${CONFIG.API.DEFAULT_IP}`);
        } catch {
          // Could not recover
        }
      }
    });

    ErrorHandler.#recoveryStrategies.set(ErrorCategory.API, async (error) => {
      // For API errors, we might want to refresh data
      if (error.context.autoRefresh && error.severity !== ErrorSeverity.CRITICAL) {
        setTimeout(() => {
          window.location.reload();
        }, 5000);
      }
    });

    ErrorHandler.#recoveryStrategies.set(ErrorCategory.VALIDATION, async (error) => {
      // For validation errors, focus on the problematic field
      if (error.context.fieldId) {
        const field = document.getElementById(error.context.fieldId);
        if (field) {
          field.focus();
          field.classList.add('error');
          setTimeout(() => field.classList.remove('error'), 3000);
        }
      }
    });
  }

  /**
   * Report errors to monitoring service (if configured)
   */
  reportError(appError) {
    if (!CONFIG.PERFORMANCE?.ANALYTICS_ENABLED || !ENVIRONMENT.isProduction()) {
      return;
    }

    // Only report medium and high severity errors in production
    if (appError.severity === ErrorSeverity.LOW) {
      return;
    }

    // In a real application, you would send this to your monitoring service
    // e.g., Sentry, LogRocket, custom analytics endpoint
    try {
      // Example: send to analytics
      // analytics.track('error', appError.toJSON());
    } catch (reportingError) {
      console.warn('Failed to report error to monitoring:', reportingError);
    }
  }

  /**
   * Initialize global error handling
   */
  initializeGlobalErrorHandling() {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(event.reason, {
        type: 'unhandledrejection',
        promise: event.promise
      });
      event.preventDefault(); // Prevent default browser behavior
    });

    // Handle global JavaScript errors
    window.addEventListener('error', (event) => {
      this.handleError(new Error(event.message), {
        type: 'global_error',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });

    // Handle resource loading errors
    document.addEventListener('error', (event) => {
      if (event.target !== window) {
        this.handleError(new Error(`Failed to load resource: ${event.target.src || event.target.href}`), {
          type: 'resource_error',
          element: event.target.tagName,
          source: event.target.src || event.target.href
        });
      }
    }, true);
  }

  /**
   * Create fallback toast system if none exists
   */
  createFallbackToast() {
    return {
      show: (message, type = 'info', options = {}) => {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          padding: 12px 24px;
          background: ${type === 'error' ? '#dc3545' : type === 'warning' ? '#ffc107' : '#28a745'};
          color: white;
          border-radius: 4px;
          z-index: 10000;
          opacity: 0;
          transition: opacity 0.3s ease;
        `;

        toast.innerHTML = `
          <i class="fas fa-${type === 'error' ? 'exclamation-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
          <span style="margin-left: 8px;">${message}</span>
        `;

        document.body.appendChild(toast);

        // Animate in
        requestAnimationFrame(() => {
          toast.style.opacity = '1';
        });

        // Remove after duration
        setTimeout(() => {
          toast.style.opacity = '0';
          setTimeout(() => {
            if (toast.parentNode) {
              toast.parentNode.removeChild(toast);
            }
          }, 300);
        }, options.duration || CONFIG.UI.TOAST_DURATION);
      }
    };
  }

  /**
   * Get error log for debugging/reporting
   */
  getErrorLog(limit = 50) {
    return ErrorHandler.#errorLog.slice(0, limit);
  }

  /**
   * Clear error log
   */
  clearErrorLog() {
    ErrorHandler.#errorLog = [];
  }

  /**
   * Get error statistics
   */
  getErrorStats() {
    const stats = {
      total: ErrorHandler.#errorLog.length,
      bySeverity: {},
      byCategory: {},
      last24Hours: 0
    };

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    ErrorHandler.#errorLog.forEach(error => {
      // Count by severity
      stats.bySeverity[error.severity] = (stats.bySeverity[error.severity] || 0) + 1;
      
      // Count by category
      stats.byCategory[error.category] = (stats.byCategory[error.category] || 0) + 1;
      
      // Count recent errors
      if (new Date(error.timestamp) > oneDayAgo) {
        stats.last24Hours++;
      }
    });

    return stats;
  }
}

/**
 * Convenience functions for common error handling patterns
 */
export const errorHandler = ErrorHandler.getInstance();

export function handleAsync(asyncFn) {
  return async (...args) => {
    try {
      return await asyncFn(...args);
    } catch (error) {
      await errorHandler.handleError(error, { 
        function: asyncFn.name,
        args: args.length 
      });
      throw error; // Re-throw for caller to handle if needed
    }
  };
}

export function handleEventError(handler) {
  return (event) => {
    try {
      return handler(event);
    } catch (error) {
      errorHandler.handleError(error, {
        event: event.type,
        target: event.target?.tagName
      });
    }
  };
}

export function createBoundaryHandler(component, fallback) {
  return (error) => {
    errorHandler.handleError(error, { component });
    
    if (typeof fallback === 'function') {
      return fallback(error);
    }
    
    return fallback;
  };
}

// Utility to wrap API calls with consistent error handling
export function withErrorHandling(apiCall, context = {}) {
  return async (...args) => {
    try {
      const result = await apiCall(...args);
      
      if (result && !result.success && result.error) {
        throw new AppError(result.error, ErrorCategory.API, ErrorSeverity.MEDIUM, context);
      }
      
      return result;
    } catch (error) {
      await errorHandler.handleError(error, {
        apiCall: apiCall.name,
        ...context
      });
      throw error;
    }
  };
}