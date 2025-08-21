/**
 * AWTRIX3 Theme Management System
 * Modern theme switching with smooth transitions and user preferences
 * @version 2.0.0
 */

import { CONFIG } from './config.js';
import { eventManager } from './event-manager.js';
import { toastSystem } from './ui-components.js';

export class ThemeManager {
  static #instance = null;
  static #currentTheme = 'light';
  static #systemTheme = 'light';
  static #userPreference = null;
  
  constructor() {
    if (ThemeManager.#instance) {
      return ThemeManager.#instance;
    }
    
    this.initialize();
    ThemeManager.#instance = this;
  }
  
  static getInstance() {
    if (!ThemeManager.#instance) {
      ThemeManager.#instance = new ThemeManager();
    }
    return ThemeManager.#instance;
  }
  
  initialize() {
    // Detect system theme preference
    this.detectSystemTheme();
    
    // Load user preference
    this.loadUserPreference();
    
    // Apply initial theme
    this.applyTheme(this.getEffectiveTheme());
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Setup theme toggle button
    this.setupThemeToggle();
    
    console.info('Theme Manager initialized:', {
      system: ThemeManager.#systemTheme,
      user: ThemeManager.#userPreference,
      current: ThemeManager.#currentTheme
    });
  }
  
  detectSystemTheme() {
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      ThemeManager.#systemTheme = mediaQuery.matches ? 'dark' : 'light';
      
      // Listen for system theme changes
      eventManager.addEventListener(mediaQuery, 'change', (e) => {
        ThemeManager.#systemTheme = e.matches ? 'dark' : 'light';
        
        // Apply new theme if user hasn't set a preference
        if (!ThemeManager.#userPreference) {
          this.applyTheme(ThemeManager.#systemTheme);
          this.updateThemeToggle();
        }
      });
    }
  }
  
  loadUserPreference() {
    try {
      const stored = localStorage.getItem('awtrix_theme_preference');
      if (stored && ['light', 'dark', 'auto'].includes(stored)) {
        ThemeManager.#userPreference = stored;
      }
    } catch (error) {
      console.warn('Failed to load theme preference:', error);
    }
  }
  
  saveUserPreference(theme) {
    try {
      localStorage.setItem('awtrix_theme_preference', theme);
      ThemeManager.#userPreference = theme;
    } catch (error) {
      console.warn('Failed to save theme preference:', error);
    }
  }
  
  getEffectiveTheme() {
    if (!ThemeManager.#userPreference || ThemeManager.#userPreference === 'auto') {
      return ThemeManager.#systemTheme;
    }
    return ThemeManager.#userPreference;
  }
  
  applyTheme(theme) {
    if (!['light', 'dark'].includes(theme)) {
      console.warn('Invalid theme:', theme);
      return;
    }
    
    const html = document.documentElement;
    const previousTheme = ThemeManager.#currentTheme;
    
    // Add transition class for smooth theme change
    html.classList.add('theme-transitioning');
    
    // Apply theme
    html.setAttribute('data-theme', theme);
    ThemeManager.#currentTheme = theme;
    
    // Update meta theme color for mobile browsers
    this.updateMetaThemeColor(theme);
    
    // Animate theme transition
    this.animateThemeTransition(previousTheme, theme);
    
    // Remove transition class after animation
    setTimeout(() => {
      html.classList.remove('theme-transitioning');
    }, CONFIG.UI.ANIMATION_DURATION);
    
    // Dispatch theme change event
    const event = new CustomEvent('themeChange', {
      detail: { theme, previousTheme }
    });
    document.dispatchEvent(event);
    
    // Show toast notification
    if (previousTheme !== theme) {
      const themeLabel = theme === 'dark' ? 'Dark' : 'Light';
      toastSystem.info(`Switched to ${themeLabel} theme`, { duration: 2000 });
    }
  }
  
  updateMetaThemeColor(theme) {
    const metaThemeColor = document.querySelector('meta[name=\"theme-color\"]');
    if (metaThemeColor) {
      const color = theme === 'dark' ? '#1e293b' : '#6366f1';
      metaThemeColor.setAttribute('content', color);
    }
  }
  
  animateThemeTransition(from, to) {
    // Create a ripple effect for theme transition
    const ripple = document.createElement('div');
    ripple.className = 'theme-transition-ripple';
    ripple.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      width: 0;
      height: 0;
      border-radius: 50%;
      background: ${to === 'dark' ? '#1e293b' : '#ffffff'};
      opacity: 0.8;
      z-index: 9999;
      pointer-events: none;
      transform: translate(-50%, -50%);
      transition: all ${CONFIG.UI.ANIMATION_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1);
    `;
    
    document.body.appendChild(ripple);
    
    // Animate ripple
    requestAnimationFrame(() => {
      const size = Math.max(window.innerWidth, window.innerHeight) * 2;
      ripple.style.width = `${size}px`;
      ripple.style.height = `${size}px`;
      ripple.style.opacity = '0';
    });
    
    // Remove ripple after animation
    setTimeout(() => {
      if (ripple.parentNode) {
        ripple.parentNode.removeChild(ripple);
      }
    }, CONFIG.UI.ANIMATION_DURATION);
  }
  
  setupEventListeners() {
    // Listen for keyboard shortcuts
    eventManager.addEventListener(document, 'keydown', (e) => {
      // Ctrl/Cmd + Shift + T to toggle theme
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'T') {
        e.preventDefault();
        this.toggleTheme();
      }
    });
    
    // Listen for theme change events from other components
    eventManager.addEventListener(document, 'requestThemeChange', (e) => {
      if (e.detail && e.detail.theme) {
        this.setTheme(e.detail.theme);
      }
    });
  }
  
  setupThemeToggle() {
    const themeToggle = document.getElementById('theme-toggle');
    if (!themeToggle) return;
    
    // Set initial icon
    this.updateThemeToggle();
    
    // Add click handler
    eventManager.addEventListener(themeToggle, 'click', () => {
      this.toggleTheme();
    });
    
    // Add tooltip
    themeToggle.setAttribute('title', 'Toggle theme (Ctrl+Shift+T)');
  }
  
  updateThemeToggle() {
    const themeToggle = document.getElementById('theme-toggle');
    if (!themeToggle) return;
    
    const icon = themeToggle.querySelector('i');
    if (!icon) return;
    
    const currentTheme = this.getCurrentTheme();
    const isLight = currentTheme === 'light';
    
    // Update icon with animation
    icon.style.transform = 'scale(0.8) rotate(180deg)';
    
    setTimeout(() => {
      icon.className = `fas ${isLight ? 'fa-moon' : 'fa-sun'}`;
      icon.style.transform = 'scale(1) rotate(0deg)';
    }, CONFIG.UI.ANIMATION_DURATION / 2);
    
    // Update button color
    themeToggle.style.background = isLight 
      ? 'var(--glass-bg)' 
      : 'linear-gradient(135deg, #667eea, #764ba2)';
  }
  
  // Public API Methods
  toggleTheme() {
    const current = this.getCurrentTheme();
    const next = current === 'light' ? 'dark' : 'light';
    this.setTheme(next);
  }
  
  setTheme(theme) {
    if (!['light', 'dark', 'auto'].includes(theme)) {
      console.warn('Invalid theme:', theme);
      return;
    }
    
    this.saveUserPreference(theme);
    
    const effectiveTheme = this.getEffectiveTheme();
    this.applyTheme(effectiveTheme);
    this.updateThemeToggle();
  }
  
  getCurrentTheme() {
    return ThemeManager.#currentTheme;
  }
  
  getUserPreference() {
    return ThemeManager.#userPreference;
  }
  
  getSystemTheme() {
    return ThemeManager.#systemTheme;
  }
  
  // Theme variants for specific components
  getComponentTheme(component) {
    const base = this.getCurrentTheme();
    const variants = {
      light: {
        sidebar: {
          background: 'rgba(255, 255, 255, 0.95)',
          text: '#1e293b'
        },
        card: {
          background: 'rgba(255, 255, 255, 0.8)',
          border: 'rgba(0, 0, 0, 0.1)'
        },
        button: {
          primary: '#6366f1',
          secondary: '#f1f5f9'
        }
      },
      dark: {
        sidebar: {
          background: 'rgba(30, 41, 59, 0.95)',
          text: '#ffffff'
        },
        card: {
          background: 'rgba(30, 41, 59, 0.8)',
          border: 'rgba(255, 255, 255, 0.1)'
        },
        button: {
          primary: '#818cf8',
          secondary: '#374151'
        }
      }
    };
    
    return variants[base]?.[component] || {};
  }
  
  // Export theme configuration for use in other components
  exportThemeConfig() {
    return {
      current: this.getCurrentTheme(),
      user: this.getUserPreference(),
      system: this.getSystemTheme(),
      effective: this.getEffectiveTheme()
    };
  }
}

// CSS for theme transitions
const themeTransitionCSS = `
.theme-transitioning {
  transition: color 300ms ease, background-color 300ms ease !important;
}

.theme-transitioning * {
  transition: color 300ms ease, background-color 300ms ease, border-color 300ms ease !important;
}

.theme-transition-ripple {
  transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1) !important;
}

/* Enhanced theme toggle button */
.theme-toggle {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.theme-toggle i {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.theme-toggle:hover {
  transform: translateY(-2px) scale(1.05) !important;
}

.theme-toggle:active {
  transform: translateY(0) scale(0.95) !important;
}
`;

// Inject theme transition CSS
if (!document.querySelector('#theme-transition-styles')) {
  const style = document.createElement('style');
  style.id = 'theme-transition-styles';
  style.textContent = themeTransitionCSS;
  document.head.appendChild(style);
}

// Create and export singleton instance
export const themeManager = ThemeManager.getInstance();

// Make globally available for debugging
if (CONFIG.DEBUG) {
  window.themeManager = themeManager;
}