/**
 * AWTRIX3 Event Management System
 * Centralized event handling with cleanup and performance optimization
 * @version 2.0.0
 */

import { CONFIG } from './config.js';
import { DOMUtils, PerformanceUtils } from './utils.js';
import { errorHandler, handleEventError } from './error-handler.js';

/**
 * Event Manager for centralized event handling and cleanup
 */
export class EventManager {
  static #instance = null;
  static #listeners = new Map();
  static #intervals = new Set();
  static #timeouts = new Set();
  static #observers = new Set();
  static #pageChangeCallbacks = new Map();
  static #componentEventHandlers = new Map();

  constructor() {
    if (EventManager.#instance) {
      return EventManager.#instance;
    }

    this.initializePageChangeSystem();
    EventManager.#instance = this;
  }

  static getInstance() {
    if (!EventManager.#instance) {
      EventManager.#instance = new EventManager();
    }
    return EventManager.#instance;
  }

  /**
   * Add event listener with automatic cleanup tracking
   */
  addEventListener(element, event, handler, options = {}) {
    if (!element || typeof handler !== 'function') {
      console.warn('Invalid addEventListener parameters:', { element, event, handler });
      return () => {};
    }

    const wrappedHandler = handleEventError(handler);
    const listenerId = `${event}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    element.addEventListener(event, wrappedHandler, options);
    
    const cleanup = () => {
      element.removeEventListener(event, wrappedHandler, options);
      EventManager.#listeners.delete(listenerId);
    };

    EventManager.#listeners.set(listenerId, {
      element,
      event,
      handler: wrappedHandler,
      cleanup,
      options,
      timestamp: Date.now()
    });

    return cleanup;
  }

  /**
   * Add debounced event listener
   */
  addDebouncedEventListener(element, event, handler, delay = 300, options = {}) {
    const debouncedHandler = PerformanceUtils.debounce(handler, delay);
    return this.addEventListener(element, event, debouncedHandler, options);
  }

  /**
   * Add throttled event listener
   */
  addThrottledEventListener(element, event, handler, limit = 100, options = {}) {
    const throttledHandler = PerformanceUtils.throttle(handler, limit);
    return this.addEventListener(element, event, throttledHandler, options);
  }

  /**
   * Set interval with tracking for cleanup
   */
  setInterval(callback, interval) {
    const wrappedCallback = handleEventError(callback);
    const intervalId = setInterval(wrappedCallback, interval);
    
    EventManager.#intervals.add(intervalId);
    
    return () => {
      clearInterval(intervalId);
      EventManager.#intervals.delete(intervalId);
    };
  }

  /**
   * Set timeout with tracking for cleanup
   */
  setTimeout(callback, delay) {
    const wrappedCallback = handleEventError(callback);
    const timeoutId = setTimeout(() => {
      wrappedCallback();
      EventManager.#timeouts.delete(timeoutId);
    }, delay);
    
    EventManager.#timeouts.add(timeoutId);
    
    return () => {
      clearTimeout(timeoutId);
      EventManager.#timeouts.delete(timeoutId);
    };
  }

  /**
   * Add mutation observer with tracking
   */
  observe(target, callback, options = {}) {
    const wrappedCallback = handleEventError(callback);
    const observer = new MutationObserver(wrappedCallback);
    
    observer.observe(target, {
      childList: true,
      subtree: true,
      ...options
    });

    EventManager.#observers.add(observer);
    
    return () => {
      observer.disconnect();
      EventManager.#observers.delete(observer);
    };
  }

  /**
   * Add intersection observer for lazy loading and visibility
   */
  observeIntersection(elements, callback, options = {}) {
    const wrappedCallback = handleEventError(callback);
    const observer = new IntersectionObserver(wrappedCallback, {
      threshold: 0.1,
      ...options
    });

    if (Array.isArray(elements)) {
      elements.forEach(el => observer.observe(el));
    } else {
      observer.observe(elements);
    }

    EventManager.#observers.add(observer);
    
    return () => {
      observer.disconnect();
      EventManager.#observers.delete(observer);
    };
  }

  /**
   * Component-based event management
   */
  registerComponent(componentId, eventHandlers = {}) {
    const component = {
      id: componentId,
      handlers: new Map(),
      cleanup: new Set()
    };

    // Register event handlers for the component
    Object.entries(eventHandlers).forEach(([selector, handlers]) => {
      const elements = DOMUtils.safeQuerySelectorAll(selector);
      
      elements.forEach(element => {
        Object.entries(handlers).forEach(([event, handler]) => {
          const cleanup = this.addEventListener(element, event, handler);
          component.cleanup.add(cleanup);
        });
      });
    });

    EventManager.#componentEventHandlers.set(componentId, component);
    
    return () => this.unregisterComponent(componentId);
  }

  /**
   * Unregister component and cleanup all its events
   */
  unregisterComponent(componentId) {
    const component = EventManager.#componentEventHandlers.get(componentId);
    
    if (component) {
      component.cleanup.forEach(cleanup => cleanup());
      EventManager.#componentEventHandlers.delete(componentId);
    }
  }

  /**
   * Page change system for SPA-like behavior
   */
  initializePageChangeSystem() {
    // Custom event for page changes
    this.addEventListener(document, 'awtrixPageChange', (e) => {
      const { pageId, previousPageId } = e.detail;
      
      // Cleanup previous page handlers
      if (previousPageId) {
        this.unregisterComponent(`page_${previousPageId}`);
      }

      // Trigger registered callbacks
      const callbacks = EventManager.#pageChangeCallbacks.get(pageId);
      if (callbacks) {
        callbacks.forEach(callback => {
          try {
            callback(pageId, previousPageId);
          } catch (error) {
            errorHandler.handleError(error, { pageId, previousPageId });
          }
        });
      }
    });
  }

  /**
   * Register callback for page change
   */
  onPageChange(pageId, callback) {
    if (!EventManager.#pageChangeCallbacks.has(pageId)) {
      EventManager.#pageChangeCallbacks.set(pageId, new Set());
    }
    
    EventManager.#pageChangeCallbacks.get(pageId).add(callback);
    
    return () => {
      const callbacks = EventManager.#pageChangeCallbacks.get(pageId);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          EventManager.#pageChangeCallbacks.delete(pageId);
        }
      }
    };
  }

  /**
   * Trigger page change event
   */
  triggerPageChange(pageId, previousPageId = null) {
    const event = new CustomEvent('awtrixPageChange', {
      detail: { pageId, previousPageId }
    });
    document.dispatchEvent(event);
  }

  /**
   * Form handling with validation and submission
   */
  handleForm(formSelector, options = {}) {
    const form = DOMUtils.safeQuerySelector(formSelector);
    if (!form) {
      console.warn(`Form not found: ${formSelector}`);
      return () => {};
    }

    const {
      onSubmit,
      onValidate,
      preventSubmit = true,
      showLoading = true,
      resetOnSuccess = false
    } = options;

    const cleanup = this.addEventListener(form, 'submit', async (e) => {
      if (preventSubmit) {
        e.preventDefault();
      }

      const formData = new FormData(form);
      const data = Object.fromEntries(formData);

      try {
        // Show loading state
        if (showLoading) {
          this.setFormLoading(form, true);
        }

        // Validate if validator provided
        if (onValidate) {
          const validation = await onValidate(data);
          if (!validation.valid) {
            this.showFormErrors(form, validation.errors);
            return;
          }
        }

        // Submit
        if (onSubmit) {
          const result = await onSubmit(data, form);
          
          if (result && result.success && resetOnSuccess) {
            form.reset();
          }
        }

      } catch (error) {
        errorHandler.handleError(error, { 
          form: formSelector, 
          data,
          category: 'form_submission'
        });
      } finally {
        if (showLoading) {
          this.setFormLoading(form, false);
        }
      }
    });

    return cleanup;
  }

  /**
   * Set form loading state
   */
  setFormLoading(form, loading) {
    const submitButton = form.querySelector('button[type="submit"]');
    const inputs = form.querySelectorAll('input, select, textarea');

    if (loading) {
      form.classList.add('loading');
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.dataset.originalText = submitButton.textContent;
        submitButton.textContent = 'Loading...';
      }
      inputs.forEach(input => input.disabled = true);
    } else {
      form.classList.remove('loading');
      if (submitButton) {
        submitButton.disabled = false;
        if (submitButton.dataset.originalText) {
          submitButton.textContent = submitButton.dataset.originalText;
        }
      }
      inputs.forEach(input => input.disabled = false);
    }
  }

  /**
   * Show form validation errors
   */
  showFormErrors(form, errors) {
    // Clear existing errors
    form.querySelectorAll('.error-message').forEach(el => el.remove());
    form.querySelectorAll('.error').forEach(el => el.classList.remove('error'));

    // Add new errors
    Object.entries(errors).forEach(([field, message]) => {
      const fieldElement = form.querySelector(`[name="${field}"], #${field}`);
      if (fieldElement) {
        fieldElement.classList.add('error');
        
        const errorElement = document.createElement('div');
        errorElement.className = 'error-message';
        errorElement.textContent = message;
        
        fieldElement.parentNode.insertBefore(errorElement, fieldElement.nextSibling);
      }
    });
  }

  /**
   * Handle file uploads with progress and validation
   */
  handleFileUpload(inputSelector, options = {}) {
    const input = DOMUtils.safeQuerySelector(inputSelector);
    if (!input) {
      console.warn(`File input not found: ${inputSelector}`);
      return () => {};
    }

    const {
      onUpload,
      onProgress,
      onValidate,
      multiple = false
    } = options;

    input.multiple = multiple;

    const cleanup = this.addEventListener(input, 'change', async (e) => {
      const files = Array.from(e.target.files);
      if (files.length === 0) return;

      try {
        // Validate files
        if (onValidate) {
          for (const file of files) {
            const validation = await onValidate(file);
            if (!validation.valid) {
              errorHandler.handleError(new Error(validation.error), {
                category: 'file_validation',
                filename: file.name
              });
              return;
            }
          }
        }

        // Upload files
        if (onUpload) {
          for (const file of files) {
            await onUpload(file, (progress) => {
              if (onProgress) {
                onProgress(progress, file);
              }
            });
          }
        }

      } catch (error) {
        errorHandler.handleError(error, {
          category: 'file_upload',
          filenames: files.map(f => f.name)
        });
      }
    });

    return cleanup;
  }

  /**
   * Cleanup all registered events and intervals
   */
  cleanup() {
    // Clean up event listeners
    EventManager.#listeners.forEach(listener => listener.cleanup());
    EventManager.#listeners.clear();

    // Clean up intervals
    EventManager.#intervals.forEach(intervalId => clearInterval(intervalId));
    EventManager.#intervals.clear();

    // Clean up timeouts
    EventManager.#timeouts.forEach(timeoutId => clearTimeout(timeoutId));
    EventManager.#timeouts.clear();

    // Clean up observers
    EventManager.#observers.forEach(observer => observer.disconnect());
    EventManager.#observers.clear();

    // Clean up component handlers
    EventManager.#componentEventHandlers.forEach(component => {
      component.cleanup.forEach(cleanup => cleanup());
    });
    EventManager.#componentEventHandlers.clear();

    // Clear page change callbacks
    EventManager.#pageChangeCallbacks.clear();
  }

  /**
   * Get event statistics for debugging
   */
  getStats() {
    return {
      listeners: EventManager.#listeners.size,
      intervals: EventManager.#intervals.size,
      timeouts: EventManager.#timeouts.size,
      observers: EventManager.#observers.size,
      components: EventManager.#componentEventHandlers.size,
      pageCallbacks: Array.from(EventManager.#pageChangeCallbacks.values())
        .reduce((total, callbacks) => total + callbacks.size, 0)
    };
  }

  /**
   * Memory cleanup when page is being unloaded
   */
  initializeUnloadCleanup() {
    this.addEventListener(window, 'beforeunload', () => {
      this.cleanup();
    });

    // Cleanup when visibility changes (mobile browsers)
    this.addEventListener(document, 'visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        // Reduce activity when not visible
        EventManager.#intervals.forEach(intervalId => clearInterval(intervalId));
      }
    });
  }
}

// Export singleton instance
export const eventManager = EventManager.getInstance();

// Initialize cleanup on page unload
eventManager.initializeUnloadCleanup();