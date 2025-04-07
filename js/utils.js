/**
 * AWTRIX3 Web Interface Utilities
 * Professional utility functions for common operations
 * @version 2.0.0
 */

import { CONFIG, ENVIRONMENT, ERROR_MESSAGES, VALIDATION } from './config.js';

/**
 * Base URL management with automatic detection and validation
 */
export class URLManager {
  static #baseUrl = '';

  static getBaseUrl() {
    if (this.#baseUrl) return this.#baseUrl;

    if (ENVIRONMENT.isIframe()) {
      try {
        const referrerUrl = document.referrer;
        if (referrerUrl) {
          const url = new URL(referrerUrl);
          this.#baseUrl = `${url.protocol}//${url.host}`;
          this.#logInfo('BASE_URL detected from iframe:', this.#baseUrl);
          return this.#baseUrl;
        }
      } catch (error) {
        this.#logError('Error detecting BASE_URL from iframe:', error);
      }
    }

    // Fallback to stored IP or default
    const storedIP = localStorage.getItem(CONFIG.STORAGE_KEYS.ESP_IP);
    const ip = storedIP || CONFIG.API.DEFAULT_IP;
    
    if (!this.validateIP(ip)) {
      this.#logWarn('Invalid IP detected, using default:', CONFIG.API.DEFAULT_IP);
      this.#baseUrl = `http://${CONFIG.API.DEFAULT_IP}`;
    } else {
      this.#baseUrl = `http://${ip}`;
    }

    this.#logInfo('BASE_URL set to:', this.#baseUrl);
    return this.#baseUrl;
  }

  static setBaseUrl(url) {
    if (this.validateURL(url)) {
      this.#baseUrl = url;
      try {
        const urlObj = new URL(url);
        localStorage.setItem(CONFIG.STORAGE_KEYS.ESP_IP, urlObj.host);
      } catch (error) {
        this.#logError('Error saving IP to localStorage:', error);
      }
    } else {
      throw new Error('Invalid URL provided');
    }
  }

  static validateIP(ip) {
    return VALIDATION.IP_REGEX.test(ip);
  }

  static validateURL(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  static #logInfo(...args) {
    if (CONFIG.DEBUG) console.info('[URLManager]', ...args);
  }

  static #logWarn(...args) {
    if (CONFIG.DEBUG) console.warn('[URLManager]', ...args);
  }

  static #logError(...args) {
    if (PERFORMANCE.LOG_ERRORS) console.error('[URLManager]', ...args);
  }
}

/**
 * Security utilities for input validation and sanitization
 */
export class SecurityUtils {
  static sanitizeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  static validateInput(value, type) {
    switch (type) {
      case 'ip':
        return VALIDATION.IP_REGEX.test(value);
      case 'ssid':
        return value.length <= VALIDATION.SSID_MAX_LENGTH && value.trim().length > 0;
      case 'password':
        return value.length >= VALIDATION.PASSWORD_MIN_LENGTH;
      case 'filename':
        return VALIDATION.FILENAME_REGEX.test(value);
      case 'color':
        return VALIDATION.COLOR_HEX_REGEX.test(value);
      case 'number':
        return !isNaN(value) && isFinite(value);
      default:
        return true;
    }
  }

  static sanitizeFilename(filename) {
    return filename.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 255);
  }

  static escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

/**
 * Enhanced HTTP client with retry logic, timeout, and error handling
 */
export class HTTPClient {
  static async request(url, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.API.TIMEOUT);

    try {
      const response = await this.#fetchWithRetry(url, {
        ...options,
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new HTTPError(`HTTP ${response.status}: ${response.statusText}`, response.status);
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new TimeoutError(ERROR_MESSAGES.TIMEOUT_ERROR);
      }
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new NetworkError(ERROR_MESSAGES.NETWORK_ERROR);
      }
      
      throw error;
    }
  }

  static async #fetchWithRetry(url, options, attempt = 1) {
    try {
      return await fetch(url, options);
    } catch (error) {
      if (attempt < CONFIG.API.RETRY_ATTEMPTS) {
        await this.#delay(CONFIG.API.RETRY_DELAY * attempt);
        return this.#fetchWithRetry(url, options, attempt + 1);
      }
      throw error;
    }
  }

  static #delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Message passing for iframe communication with enhanced error handling
 */
export class MessageHandler {
  static async postMessage(message, targetWindow = window.parent) {
    return new Promise((resolve, reject) => {
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const timeoutId = setTimeout(() => {
        window.removeEventListener('message', handler);
        reject(new TimeoutError('Message timeout'));
      }, CONFIG.API.TIMEOUT);

      const handler = (event) => {
        if (event.data.id !== messageId) return;
        
        clearTimeout(timeoutId);
        window.removeEventListener('message', handler);
        
        if (event.data.success) {
          resolve(event.data.data);
        } else {
          reject(new Error(event.data.error || 'Unknown error'));
        }
      };

      window.addEventListener('message', handler);
      targetWindow.postMessage({ ...message, id: messageId }, '*');
    });
  }
}

/**
 * Enhanced proxy fetch with proper error handling and response processing
 */
export async function proxyFetch(url, options = {}) {
  const startTime = performance.now();
  
  try {
    let result;
    
    if (ENVIRONMENT.isIframe()) {
      result = await MessageHandler.postMessage({
        url: url.replace(URLManager.getBaseUrl(), ''),
        method: options.method || 'GET',
        body: options.body,
        isImage: options.isImage
      });
    } else {
      const response = await HTTPClient.request(url, options);
      
      if (options.method === 'POST') {
        result = { success: true };
      } else {
        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          result = await response.json();
        } else {
          result = await response.text();
        }
      }
    }

    if (PERFORMANCE.MEASURE_API_CALLS) {
      const duration = performance.now() - startTime;
      console.info(`API Call: ${url} took ${duration.toFixed(2)}ms`);
    }

    return result;
  } catch (error) {
    if (PERFORMANCE.LOG_ERRORS) {
      console.error('ProxyFetch Error:', { url, options, error });
    }
    throw error;
  }
}

/**
 * Color conversion utilities
 */
export class ColorUtils {
  static hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  static rgbToHex(r, g, b) {
    return "#" + [r, g, b].map(x => {
      const hex = Math.max(0, Math.min(255, x)).toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    }).join("");
  }

  static rgbToInt(r, g, b) {
    return (r << 16) | (g << 8) | b;
  }

  static intToRgb(colorInt) {
    return {
      r: (colorInt >> 16) & 0xFF,
      g: (colorInt >> 8) & 0xFF,
      b: colorInt & 0xFF
    };
  }

  static hexToInt(hex) {
    const rgb = this.hexToRgb(hex);
    return rgb ? this.rgbToInt(rgb.r, rgb.g, rgb.b) : 0;
  }

  static intToHex(colorInt) {
    const rgb = this.intToRgb(colorInt);
    return this.rgbToHex(rgb.r, rgb.g, rgb.b);
  }
}

/**
 * File handling utilities with validation
 */
export class FileUtils {
  static validateFile(file) {
    const errors = [];

    if (!CONFIG.UPLOAD.ALLOWED_TYPES.includes(file.type)) {
      errors.push(ERROR_MESSAGES.INVALID_FILE_TYPE);
    }

    if (file.size > CONFIG.UPLOAD.MAX_FILE_SIZE) {
      errors.push(ERROR_MESSAGES.FILE_TOO_LARGE);
    }

    return errors;
  }

  static async validateImageDimensions(file) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const isValid = CONFIG.UPLOAD.VALID_DIMENSIONS.some(
          dim => img.width === dim.width && img.height === dim.height
        );
        resolve(isValid);
        URL.revokeObjectURL(img.src);
      };
      img.onerror = () => resolve(false);
      img.src = URL.createObjectURL(file);
    });
  }

  static async fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}

/**
 * DOM utilities for safe manipulation
 */
export class DOMUtils {
  static safeQuerySelector(selector, context = document) {
    try {
      return context.querySelector(selector);
    } catch (error) {
      console.warn('Invalid selector:', selector, error);
      return null;
    }
  }

  static safeQuerySelectorAll(selector, context = document) {
    try {
      return context.querySelectorAll(selector);
    } catch (error) {
      console.warn('Invalid selector:', selector, error);
      return [];
    }
  }

  static createElement(tag, className = '', innerHTML = '') {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (innerHTML) element.innerHTML = SecurityUtils.sanitizeHTML(innerHTML);
    return element;
  }

  static addEventListenerSafe(element, event, handler, options = {}) {
    if (element && typeof handler === 'function') {
      element.addEventListener(event, handler, options);
      return () => element.removeEventListener(event, handler, options);
    }
    return () => {};
  }
}

/**
 * Performance utilities
 */
export class PerformanceUtils {
  static debounce(func, wait, immediate = false) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        timeout = null;
        if (!immediate) func.apply(this, args);
      };
      const callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) func.apply(this, args);
    };
  }

  static throttle(func, limit) {
    let inThrottle;
    return function executedFunction(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  static async animationFrame() {
    return new Promise(resolve => requestAnimationFrame(resolve));
  }
}

/**
 * Custom Error Classes
 */
export class HTTPError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'HTTPError';
    this.status = status;
  }
}

export class NetworkError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class TimeoutError extends Error {
  constructor(message) {
    super(message);
    this.name = 'TimeoutError';
  }
}

export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Legacy support - keep BASE_URL export
export let BASE_URL = URLManager.getBaseUrl();
export const getBaseUrl = () => URLManager.getBaseUrl();