/**
 * AWTRIX3 Web Interface Main Application
 * Professional main application file with proper architecture
 * @version 2.0.0
 */

import { CONFIG } from './config.js';
import { URLManager } from './utils.js';
import { eventManager, NavigationManager } from './event-manager.js';
import { errorHandler } from './error-handler.js';
import { toastSystem } from './ui-components.js';
import { themeManager } from './theme-manager.js';

/**
 * Main Application Class
 */
class AWTRIX3App {
  constructor() {
    this.initialized = false;
    this.currentPage = null;
    
    // Initialize URL management
    URLManager.getBaseUrl();
  }

  async initialize() {
    if (this.initialized) return;

    try {
      // Initialize core systems
      await this.initializeCore();
      
      // Setup navigation
      this.setupNavigation();
      
      // Setup sidebar functionality
      this.setupSidebar();
      
      // Load initial page
      await NavigationManager.loadPage('dashboard');
      
      this.initialized = true;
      console.info('AWTRIX3 App initialized successfully');
      
    } catch (error) {
      errorHandler.handleError(error, { 
        context: 'app_initialization',
        severity: 'critical' 
      });
    }
  }

  async initializeCore() {
    // Initialize error handling first
    errorHandler.getInstance();
    
    // Initialize event management
    eventManager.getInstance();
    
    // Initialize toast system
    toastSystem.getInstance();
    
    // Initialize theme management
    themeManager.getInstance();
    
    // Load initial configuration
    await this.loadConfiguration();
  }

  async loadConfiguration() {
    // Load user preferences from localStorage
    try {
      const stored = localStorage.getItem(CONFIG.STORAGE_KEYS.USER_PREFERENCES);
      if (stored) {
        const preferences = JSON.parse(stored);
        this.applyUserPreferences(preferences);
      }
    } catch (error) {
      console.warn('Failed to load user preferences:', error);
    }
  }

  applyUserPreferences(preferences) {
    // Apply theme, language, or other user preferences
    if (preferences.theme) {
      document.body.className = document.body.className.replace(/theme-\w+/g, '') + ` theme-${preferences.theme}`;
    }
    
    if (preferences.animations === false) {
      document.body.classList.add('no-animations');
    }
  }

  setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item[data-page]');
    
    navItems.forEach(navItem => {
      const cleanup = eventManager.addEventListener(navItem, 'click', async (e) => {
        e.preventDefault();
        
        const pageId = navItem.getAttribute('data-page');
        if (!pageId || pageId === this.currentPage) return;
        
        try {
          // Update active state
          navItems.forEach(item => item.classList.remove('active'));
          navItem.classList.add('active');
          
          // Hide sidebar on mobile
          this.hideSidebar();
          
          // Load page
          await NavigationManager.loadPage(pageId);
          this.currentPage = pageId;
          
          // Save current page to preferences
          this.saveCurrentPage(pageId);
          
        } catch (error) {
          errorHandler.handleError(error, { 
            context: 'navigation',
            pageId 
          });
        }
      });

      // Store cleanup function for later use
      navItem._cleanup = cleanup;
    });

    // Handle browser back/forward buttons
    eventManager.addEventListener(window, 'popstate', (e) => {
      if (e.state && e.state.page) {
        NavigationManager.loadPage(e.state.page);
      }
    });
  }

  setupSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('overlay');
    const menuToggle = document.getElementById('menu-toggle');

    if (!sidebar || !overlay) return;

    // Toggle sidebar function
    const toggleSidebar = (show) => {
      if (show) {
        sidebar.classList.remove('hidden');
        overlay.classList.add('active');
        document.body.classList.add('sidebar-open');
      } else {
        sidebar.classList.add('hidden');
        overlay.classList.remove('active');
        document.body.classList.remove('sidebar-open');
      }
    };

    // Event listeners
    if (menuToggle) {
      eventManager.addEventListener(menuToggle, 'click', () => {
        const isHidden = sidebar.classList.contains('hidden');
        toggleSidebar(isHidden);
      });
    }

    eventManager.addEventListener(overlay, 'click', () => {
      toggleSidebar(false);
    });

    // Close sidebar on escape key
    eventManager.addEventListener(document, 'keydown', (e) => {
      if (e.key === 'Escape' && !sidebar.classList.contains('hidden')) {
        toggleSidebar(false);
      }
    });

    // Handle responsive behavior
    this.handleResponsiveSidebar();
  }

  handleResponsiveSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;

    const mediaQuery = window.matchMedia('(max-width: 768px)');
    
    const handleMediaChange = (e) => {
      if (e.matches) {
        // Mobile - hide sidebar by default
        sidebar.classList.add('hidden');
      } else {
        // Desktop - show sidebar
        sidebar.classList.remove('hidden');
        document.getElementById('overlay')?.classList.remove('active');
      }
    };

    // Initial check
    handleMediaChange(mediaQuery);
    
    // Listen for changes
    eventManager.addEventListener(mediaQuery, 'change', handleMediaChange);
  }

  hideSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('overlay');
    
    if (sidebar && window.innerWidth <= 768) {
      sidebar.classList.add('hidden');
      overlay?.classList.remove('active');
      document.body.classList.remove('sidebar-open');
    }
  }

  saveCurrentPage(pageId) {
    try {
      const preferences = this.getUserPreferences();
      preferences.lastPage = pageId;
      localStorage.setItem(CONFIG.STORAGE_KEYS.USER_PREFERENCES, JSON.stringify(preferences));
    } catch (error) {
      console.warn('Failed to save current page:', error);
    }
  }

  getUserPreferences() {
    try {
      const stored = localStorage.getItem(CONFIG.STORAGE_KEYS.USER_PREFERENCES);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }

  // Public API methods
  getCurrentPage() {
    return NavigationManager.getCurrentPage();
  }

  async navigateToPage(pageId) {
    const navItem = document.querySelector(`[data-page="${pageId}"]`);
    if (navItem) {
      navItem.click();
    } else {
      await NavigationManager.loadPage(pageId);
    }
  }

  // Cleanup method for testing or page unload
  cleanup() {
    // Clean up all event listeners
    eventManager.cleanup();
    
    // Clean up navigation listeners
    document.querySelectorAll('.nav-item[data-page]').forEach(item => {
      if (item._cleanup) {
        item._cleanup();
      }
    });
  }

  // Health check method
  async healthCheck() {
    try {
      const { apiManager } = await import('./api-service.js');
      return await apiManager.healthCheck();
    } catch (error) {
      return false;
    }
  }

  // Get application statistics
  getStats() {
    return {
      initialized: this.initialized,
      currentPage: this.currentPage,
      events: eventManager.getStats(),
      errors: errorHandler.getErrorStats(),
      preferences: this.getUserPreferences()
    };
  }
}

// Initialize application
const app = new AWTRIX3App();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => app.initialize());
} else {
  app.initialize();
}

// Make app globally available for debugging
if (CONFIG.DEBUG) {
  window.awtrixApp = app;
}

// Export for module usage
export default app;
