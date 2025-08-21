/**
 * AWTRIX3 Web Interface Configuration
 * Central configuration file for constants, settings and defaults
 * @version 2.0.0
 * @author Professional Refactor
 */

export const CONFIG = {
  // API Configuration
  API: {
    DEFAULT_IP: '192.168.168.191',
    TIMEOUT: 10000,
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000,
    ENDPOINTS: {
      SYSTEM: '/api/system',
      STATS: '/api/stats', 
      SCREEN: '/api/screen',
      WIFI: '/api/wifi',
      NEXTAPP: '/api/nextapp',
      PREVIOUSAPP: '/api/previousapp',
      LIST: '/list',
      EDIT: '/edit'
    }
  },

  // UI Configuration
  UI: {
    ANIMATION_DURATION: 300,
    TOAST_DURATION: 3000,
    STATS_REFRESH_INTERVAL: 5000,
    CANVAS_DIMENSIONS: {
      WIDTH: 1052,
      HEIGHT: 260,
      MATRIX_WIDTH: 32,
      MATRIX_HEIGHT: 8,
      CELL_SIZE: 33,
      CELL_PADDING: 29
    }
  },

  // File Upload Configuration
  UPLOAD: {
    ALLOWED_TYPES: ['image/gif', 'image/jpeg'],
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
    VALID_DIMENSIONS: [
      { width: 8, height: 8 },
      { width: 32, height: 8 }
    ]
  },

  // Network Configuration
  NETWORK: {
    SIGNAL_STRENGTH_THRESHOLDS: {
      EXCELLENT: 80,
      GOOD: 60,
      FAIR: 40,
      POOR: 20
    }
  },

  // Paths
  PATHS: {
    ICONS: '/ICONS',
    PAGES: 'pages'
  },

  // External Services
  EXTERNAL: {
    LAMETRIC_ICON_BASE: 'https://developer.lametric.com/content/apps/icon_thumbs/'
  },

  // Local Storage Keys
  STORAGE_KEYS: {
    ESP_IP: 'espIp',
    USER_PREFERENCES: 'awtrixPreferences'
  },

  // Debug Mode
  DEBUG: false
};

// Environment detection
export const ENVIRONMENT = {
  isIframe: () => window !== window.parent,
  isDevelopment: () => CONFIG.DEBUG || location.hostname === 'localhost',
  isProduction: () => !CONFIG.DEBUG && location.hostname !== 'localhost'
};

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network connection failed. Please check your connection.',
  TIMEOUT_ERROR: 'Request timed out. Please try again.',
  INVALID_RESPONSE: 'Invalid response received from server.',
  FILE_TOO_LARGE: 'File is too large. Maximum size is 5MB.',
  INVALID_FILE_TYPE: 'Invalid file type. Only GIF and JPEG files are allowed.',
  INVALID_DIMENSIONS: 'Invalid image dimensions. Must be 8x8 or 32x8 pixels.',
  SAVE_FAILED: 'Failed to save settings. Please try again.',
  LOAD_FAILED: 'Failed to load data. Please check connection.',
  PERMISSION_DENIED: 'Operation not permitted.',
  UNKNOWN_ERROR: 'An unknown error occurred. Please try again.'
};

// Success Messages
export const SUCCESS_MESSAGES = {
  SETTINGS_SAVED: 'Settings saved successfully',
  FILE_UPLOADED: 'File uploaded successfully',
  ITEM_DELETED: 'Item deleted successfully',
  ITEM_RENAMED: 'Item renamed successfully',
  CONNECTION_SUCCESS: 'Connected successfully'
};

// Validation Rules
export const VALIDATION = {
  IP_REGEX: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
  SSID_MAX_LENGTH: 32,
  PASSWORD_MIN_LENGTH: 8,
  FILENAME_REGEX: /^[a-zA-Z0-9._-]+$/,
  COLOR_HEX_REGEX: /^#[0-9A-Fa-f]{6}$/
};

// Performance Monitoring
export const PERFORMANCE = {
  MEASURE_API_CALLS: ENVIRONMENT.isDevelopment(),
  LOG_ERRORS: true,
  ANALYTICS_ENABLED: ENVIRONMENT.isProduction()
};