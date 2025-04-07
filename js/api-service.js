/**
 * AWTRIX3 API Service Layer
 * Centralized API communication with consistent error handling
 * @version 2.0.0
 */

import { CONFIG, ERROR_MESSAGES, SUCCESS_MESSAGES } from './config.js';
import { URLManager, proxyFetch, SecurityUtils, ValidationError } from './utils.js';

/**
 * Base API Service with common functionality
 */
class BaseAPIService {
  constructor() {
    this.baseUrl = URLManager.getBaseUrl();
  }

  async request(endpoint, options = {}) {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const result = await proxyFetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });

      return { success: true, data: result };
    } catch (error) {
      console.error(`API Request failed: ${endpoint}`, error);
      return { 
        success: false, 
        error: error.message || ERROR_MESSAGES.UNKNOWN_ERROR,
        originalError: error 
      };
    }
  }

  validateAndSanitizeData(data, validators = {}) {
    const sanitized = {};
    const errors = [];

    for (const [key, value] of Object.entries(data)) {
      if (validators[key]) {
        const validator = validators[key];
        
        if (validator.required && (value === undefined || value === null || value === '')) {
          errors.push(`${key} is required`);
          continue;
        }

        if (value !== undefined && value !== null && value !== '') {
          if (validator.type && !SecurityUtils.validateInput(value, validator.type)) {
            errors.push(`Invalid ${key}: ${validator.message || 'Invalid format'}`);
            continue;
          }

          if (validator.sanitize) {
            sanitized[key] = SecurityUtils.sanitizeHTML(value);
          } else {
            sanitized[key] = value;
          }
        } else {
          sanitized[key] = validator.default || value;
        }
      } else {
        sanitized[key] = value;
      }
    }

    if (errors.length > 0) {
      throw new ValidationError(errors.join(', '));
    }

    return sanitized;
  }
}

/**
 * System Settings API Service
 */
export class SystemAPIService extends BaseAPIService {
  async getSettings() {
    return this.request(CONFIG.API.ENDPOINTS.SYSTEM);
  }

  async updateSettings(settings) {
    const validators = {
      NET_STATIC: { type: 'boolean' },
      NET_IP: { type: 'ip', message: 'Invalid IP address format' },
      NET_GW: { type: 'ip', message: 'Invalid gateway IP format' },
      NET_SN: { type: 'ip', message: 'Invalid subnet mask format' },
      NET_PDNS: { type: 'ip', message: 'Invalid primary DNS format' },
      NET_SDNS: { type: 'ip', message: 'Invalid secondary DNS format' },
      MQTT_ACTIVE: { type: 'boolean' },
      MQTT_HOST: { type: 'string', sanitize: true },
      MQTT_PORT: { type: 'number', message: 'Port must be a valid number' },
      MQTT_USER: { type: 'string', sanitize: true },
      MQTT_PASS: { type: 'string' }, // No sanitization for passwords
      MQTT_PREFIX: { type: 'string', sanitize: true }
    };

    try {
      const sanitizedSettings = this.validateAndSanitizeData(settings, validators);
      return this.request(CONFIG.API.ENDPOINTS.SYSTEM, {
        method: 'POST',
        body: JSON.stringify(sanitizedSettings)
      });
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async updateSingleSetting(key, value) {
    return this.updateSettings({ [key]: value });
  }
}

/**
 * WiFi API Service
 */
export class WiFiAPIService extends BaseAPIService {
  async updateWiFiSettings(settings) {
    const validators = {
      ssid: { 
        required: true, 
        type: 'ssid', 
        message: 'SSID must be 1-32 characters',
        sanitize: true 
      },
      password: { 
        required: true, 
        type: 'password', 
        message: 'Password must be at least 8 characters' 
      }
    };

    try {
      const sanitizedSettings = this.validateAndSanitizeData(settings, validators);
      return this.request(CONFIG.API.ENDPOINTS.WIFI, {
        method: 'POST',
        body: JSON.stringify(sanitizedSettings)
      });
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

/**
 * Statistics API Service
 */
export class StatsAPIService extends BaseAPIService {
  async getStats() {
    return this.request(CONFIG.API.ENDPOINTS.STATS);
  }

  formatStats(rawStats) {
    if (!rawStats || typeof rawStats !== 'object') {
      return null;
    }

    return {
      ram: {
        used: rawStats.usedRam || 0,
        total: rawStats.totalRam || 0,
        percentage: rawStats.totalRam ? Math.round((rawStats.usedRam / rawStats.totalRam) * 100) : 0
      },
      flash: {
        used: rawStats.usedFlash || 0,
        total: rawStats.totalFlash || 0,
        percentage: rawStats.totalFlash ? Math.round((rawStats.usedFlash / rawStats.totalFlash) * 100) : 0
      },
      uptime: rawStats.uptime || 0,
      wifi: {
        signal: rawStats.wifi_signal || 0,
        strength: this.calculateSignalStrength(rawStats.wifi_signal || 0),
        ssid: SecurityUtils.sanitizeHTML(rawStats.ssid || ''),
        ip: rawStats.ip_address || ''
      },
      currentApp: SecurityUtils.sanitizeHTML(rawStats.app || '')
    };
  }

  calculateSignalStrength(signalDb) {
    if (signalDb === 0) return 0;
    return Math.min(Math.max(2 * (signalDb + 100), 0), 100);
  }

  getSignalQuality(strength) {
    if (strength >= CONFIG.NETWORK.SIGNAL_STRENGTH_THRESHOLDS.EXCELLENT) return 'excellent';
    if (strength >= CONFIG.NETWORK.SIGNAL_STRENGTH_THRESHOLDS.GOOD) return 'good';
    if (strength >= CONFIG.NETWORK.SIGNAL_STRENGTH_THRESHOLDS.FAIR) return 'fair';
    if (strength >= CONFIG.NETWORK.SIGNAL_STRENGTH_THRESHOLDS.POOR) return 'poor';
    return 'very-poor';
  }
}

/**
 * Display/Screen API Service
 */
export class DisplayAPIService extends BaseAPIService {
  async getScreenData() {
    return this.request(CONFIG.API.ENDPOINTS.SCREEN);
  }

  async nextApp() {
    return this.request(CONFIG.API.ENDPOINTS.NEXTAPP, { method: 'POST' });
  }

  async previousApp() {
    return this.request(CONFIG.API.ENDPOINTS.PREVIOUSAPP, { method: 'POST' });
  }

  processScreenData(rawData) {
    if (!Array.isArray(rawData)) {
      throw new Error('Invalid screen data format');
    }

    const processedData = [];
    for (let y = 0; y < CONFIG.UI.CANVAS_DIMENSIONS.MATRIX_HEIGHT; y++) {
      for (let x = 0; x < CONFIG.UI.CANVAS_DIMENSIONS.MATRIX_WIDTH; x++) {
        const index = y * CONFIG.UI.CANVAS_DIMENSIONS.MATRIX_WIDTH + x;
        const colorValue = rawData[index] || 0;
        
        processedData.push({
          x,
          y,
          color: {
            r: (colorValue & 0xff0000) >> 16,
            g: (colorValue & 0x00ff00) >> 8,
            b: colorValue & 0x0000ff
          },
          hex: `#${colorValue.toString(16).padStart(6, '0')}`
        });
      }
    }

    return processedData;
  }
}

/**
 * File Management API Service
 */
export class FileAPIService extends BaseAPIService {
  async listFiles(directory = CONFIG.PATHS.ICONS) {
    const result = await this.request(`${CONFIG.API.ENDPOINTS.LIST}?dir=${encodeURIComponent(directory)}`);
    
    if (result.success && Array.isArray(result.data)) {
      return {
        ...result,
        data: result.data.map(file => ({
          ...file,
          name: SecurityUtils.sanitizeHTML(file.name),
          path: SecurityUtils.sanitizeHTML(file.path || '')
        }))
      };
    }

    return result;
  }

  async uploadFile(file, targetPath) {
    try {
      // Validate file first
      const fileErrors = FileUtils.validateFile(file);
      if (fileErrors.length > 0) {
        return { success: false, error: fileErrors.join(', ') };
      }

      // Validate image dimensions if it's an image
      if (file.type.startsWith('image/')) {
        const isValidDimensions = await FileUtils.validateImageDimensions(file);
        if (!isValidDimensions) {
          return { success: false, error: ERROR_MESSAGES.INVALID_DIMENSIONS };
        }
      }

      // Convert to base64 for transmission
      const base64Data = await FileUtils.fileToBase64(file);
      const sanitizedFilename = SecurityUtils.sanitizeFilename(file.name);
      
      const uploadData = {
        isFile: true,
        name: sanitizedFilename,
        path: `${targetPath}/${sanitizedFilename}`,
        data: base64Data
      };

      return this.request(CONFIG.API.ENDPOINTS.EDIT, {
        method: 'POST',
        body: uploadData
      });

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async deleteFile(filePath) {
    const sanitizedPath = SecurityUtils.sanitizeHTML(filePath);
    
    return this.request(CONFIG.API.ENDPOINTS.EDIT, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `path=${encodeURIComponent(sanitizedPath)}`
    });
  }

  async renameFile(oldPath, newPath) {
    const sanitizedOldPath = SecurityUtils.sanitizeHTML(oldPath);
    const sanitizedNewPath = SecurityUtils.sanitizeHTML(newPath);
    
    return this.request(CONFIG.API.ENDPOINTS.EDIT, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `path=${encodeURIComponent(sanitizedNewPath)}&src=${encodeURIComponent(sanitizedOldPath)}`
    });
  }

  async getImageUrl(imagePath) {
    if (ENVIRONMENT.isIframe()) {
      // For iframe mode, we need to get base64 data
      try {
        const result = await proxyFetch(imagePath, { isImage: true });
        return result; // Should be base64 data URL
      } catch (error) {
        console.warn('Failed to load image via proxy:', error);
        return imagePath; // Fallback to original path
      }
    } else {
      // Direct mode, return full URL
      return `${this.baseUrl}${imagePath}`;
    }
  }
}

/**
 * External Services (LaMetric, etc.)
 */
export class ExternalAPIService {
  async getLaMetricIcon(iconId) {
    try {
      const sanitizedIconId = SecurityUtils.sanitizeHTML(iconId.toString());
      const url = `${CONFIG.EXTERNAL.LAMETRIC_ICON_BASE}${sanitizedIconId}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Icon not found');
      }

      return {
        success: true,
        url,
        blob: await response.blob(),
        contentType: response.headers.get('content-type')
      };
    } catch (error) {
      return {
        success: false,
        error: 'LaMetric icon not found or unavailable'
      };
    }
  }

  async downloadLaMetricIcon(iconId) {
    const result = await this.getLaMetricIcon(iconId);
    
    if (!result.success) {
      return result;
    }

    try {
      let processedBlob = result.blob;
      let extension = '.gif';

      // Convert JPEG/PNG to JPEG for consistency
      if (result.contentType === 'image/jpeg' || result.contentType === 'image/png') {
        extension = '.jpg';
        processedBlob = await this.convertImageToJPEG(result.blob);
      }

      return {
        success: true,
        filename: `${iconId}${extension}`,
        blob: processedBlob
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to process downloaded icon'
      };
    }
  }

  async convertImageToJPEG(blob) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(blob);

      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        canvas.getContext('2d').drawImage(img, 0, 0);

        canvas.toBlob((jpegBlob) => {
          URL.revokeObjectURL(objectUrl);
          if (jpegBlob) {
            resolve(jpegBlob);
          } else {
            reject(new Error('Failed to convert image'));
          }
        }, 'image/jpeg', 1);
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Failed to load image'));
      };

      img.src = objectUrl;
    });
  }
}

/**
 * Centralized API Manager - Singleton pattern
 */
export class APIManager {
  static #instance = null;

  constructor() {
    if (APIManager.#instance) {
      return APIManager.#instance;
    }

    this.system = new SystemAPIService();
    this.wifi = new WiFiAPIService();
    this.stats = new StatsAPIService();
    this.display = new DisplayAPIService();
    this.files = new FileAPIService();
    this.external = new ExternalAPIService();

    APIManager.#instance = this;
  }

  static getInstance() {
    if (!APIManager.#instance) {
      APIManager.#instance = new APIManager();
    }
    return APIManager.#instance;
  }

  // Convenience methods for common operations
  async healthCheck() {
    try {
      const result = await this.stats.getStats();
      return result.success;
    } catch {
      return false;
    }
  }

  async reconnect(newBaseUrl) {
    if (newBaseUrl) {
      URLManager.setBaseUrl(newBaseUrl);
      
      // Update all service base URLs
      Object.values(this).forEach(service => {
        if (service instanceof BaseAPIService) {
          service.baseUrl = newBaseUrl;
        }
      });
    }

    return this.healthCheck();
  }
}

// Export singleton instance
export const apiManager = APIManager.getInstance();

// Export individual services for direct access if needed
export const systemAPI = apiManager.system;
export const wifiAPI = apiManager.wifi;
export const statsAPI = apiManager.stats;
export const displayAPI = apiManager.display;
export const fileAPI = apiManager.files;
export const externalAPI = apiManager.external;