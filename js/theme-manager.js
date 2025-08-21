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
  }\n  \n  setupEventListeners() {\n    // Listen for keyboard shortcuts\n    eventManager.addEventListener(document, 'keydown', (e) => {\n      // Ctrl/Cmd + Shift + T to toggle theme\n      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'T') {\n        e.preventDefault();\n        this.toggleTheme();\n      }\n    });\n    \n    // Listen for theme change events from other components\n    eventManager.addEventListener(document, 'requestThemeChange', (e) => {\n      if (e.detail && e.detail.theme) {\n        this.setTheme(e.detail.theme);\n      }\n    });\n  }\n  \n  setupThemeToggle() {\n    const themeToggle = document.getElementById('theme-toggle');\n    if (!themeToggle) return;\n    \n    // Set initial icon\n    this.updateThemeToggle();\n    \n    // Add click handler\n    eventManager.addEventListener(themeToggle, 'click', () => {\n      this.toggleTheme();\n    });\n    \n    // Add tooltip\n    themeToggle.setAttribute('title', 'Toggle theme (Ctrl+Shift+T)');\n  }\n  \n  updateThemeToggle() {\n    const themeToggle = document.getElementById('theme-toggle');\n    if (!themeToggle) return;\n    \n    const icon = themeToggle.querySelector('i');\n    if (!icon) return;\n    \n    const currentTheme = this.getCurrentTheme();\n    const isLight = currentTheme === 'light';\n    \n    // Update icon with animation\n    icon.style.transform = 'scale(0.8) rotate(180deg)';\n    \n    setTimeout(() => {\n      icon.className = `fas ${isLight ? 'fa-moon' : 'fa-sun'}`;\n      icon.style.transform = 'scale(1) rotate(0deg)';\n    }, CONFIG.UI.ANIMATION_DURATION / 2);\n    \n    // Update button color\n    themeToggle.style.background = isLight \n      ? 'var(--glass-bg)' \n      : 'linear-gradient(135deg, #667eea, #764ba2)';\n  }\n  \n  // Public API Methods\n  toggleTheme() {\n    const current = this.getCurrentTheme();\n    const next = current === 'light' ? 'dark' : 'light';\n    this.setTheme(next);\n  }\n  \n  setTheme(theme) {\n    if (!['light', 'dark', 'auto'].includes(theme)) {\n      console.warn('Invalid theme:', theme);\n      return;\n    }\n    \n    this.saveUserPreference(theme);\n    \n    const effectiveTheme = this.getEffectiveTheme();\n    this.applyTheme(effectiveTheme);\n    this.updateThemeToggle();\n  }\n  \n  getCurrentTheme() {\n    return ThemeManager.#currentTheme;\n  }\n  \n  getUserPreference() {\n    return ThemeManager.#userPreference;\n  }\n  \n  getSystemTheme() {\n    return ThemeManager.#systemTheme;\n  }\n  \n  // Theme variants for specific components\n  getComponentTheme(component) {\n    const base = this.getCurrentTheme();\n    const variants = {\n      light: {\n        sidebar: {\n          background: 'rgba(255, 255, 255, 0.95)',\n          text: '#1e293b'\n        },\n        card: {\n          background: 'rgba(255, 255, 255, 0.8)',\n          border: 'rgba(0, 0, 0, 0.1)'\n        },\n        button: {\n          primary: '#6366f1',\n          secondary: '#f1f5f9'\n        }\n      },\n      dark: {\n        sidebar: {\n          background: 'rgba(30, 41, 59, 0.95)',\n          text: '#ffffff'\n        },\n        card: {\n          background: 'rgba(30, 41, 59, 0.8)',\n          border: 'rgba(255, 255, 255, 0.1)'\n        },\n        button: {\n          primary: '#818cf8',\n          secondary: '#374151'\n        }\n      }\n    };\n    \n    return variants[base]?.[component] || {};\n  }\n  \n  // Export theme configuration for use in other components\n  exportThemeConfig() {\n    return {\n      current: this.getCurrentTheme(),\n      user: this.getUserPreference(),\n      system: this.getSystemTheme(),\n      effective: this.getEffectiveTheme()\n    };\n  }\n}\n\n// CSS for theme transitions\nconst themeTransitionCSS = `\n.theme-transitioning {\n  transition: color 300ms ease, background-color 300ms ease !important;\n}\n\n.theme-transitioning * {\n  transition: color 300ms ease, background-color 300ms ease, border-color 300ms ease !important;\n}\n\n.theme-transition-ripple {\n  transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1) !important;\n}\n\n/* Enhanced theme toggle button */\n.theme-toggle {\n  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);\n}\n\n.theme-toggle i {\n  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);\n}\n\n.theme-toggle:hover {\n  transform: translateY(-2px) scale(1.05) !important;\n}\n\n.theme-toggle:active {\n  transform: translateY(0) scale(0.95) !important;\n}\n`;\n\n// Inject theme transition CSS\nif (!document.querySelector('#theme-transition-styles')) {\n  const style = document.createElement('style');\n  style.id = 'theme-transition-styles';\n  style.textContent = themeTransitionCSS;\n  document.head.appendChild(style);\n}\n\n// Create and export singleton instance\nexport const themeManager = ThemeManager.getInstance();\n\n// Make globally available for debugging\nif (CONFIG.DEBUG) {\n  window.themeManager = themeManager;\n}"