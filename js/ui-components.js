/**
 * AWTRIX3 UI Components System
 * Reusable UI components with consistent behavior and styling
 * @version 2.0.0
 */

import { CONFIG, ERROR_MESSAGES, SUCCESS_MESSAGES } from './config.js';
import { DOMUtils, SecurityUtils, PerformanceUtils } from './utils.js';
import { eventManager } from './event-manager.js';
import { errorHandler } from './error-handler.js';

/**
 * Toast Notification System
 */
export class ToastSystem {
  static #instance = null;
  static #container = null;
  static #activeToasts = new Set();

  constructor() {
    if (ToastSystem.#instance) {
      return ToastSystem.#instance;
    }

    this.initializeContainer();
    ToastSystem.#instance = this;
    
    // Make globally available
    window.toastSystem = this;
  }

  static getInstance() {
    if (!ToastSystem.#instance) {
      ToastSystem.#instance = new ToastSystem();
    }
    return ToastSystem.#instance;
  }

  initializeContainer() {
    ToastSystem.#container = document.getElementById('toast-container');
    
    if (!ToastSystem.#container) {
      ToastSystem.#container = DOMUtils.createElement('div', 'toast-container');
      ToastSystem.#container.id = 'toast-container';
      document.body.appendChild(ToastSystem.#container);
    }
  }

  show(message, type = 'info', options = {}) {
    const {
      duration = CONFIG.UI.TOAST_DURATION,
      persistent = false,
      actions = [],
      html = false
    } = options;

    const toast = this.createToast(message, type, { actions, html });
    ToastSystem.#container.appendChild(toast);
    ToastSystem.#activeToasts.add(toast);

    // Animate in
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    // Auto-remove if not persistent
    if (!persistent) {
      setTimeout(() => {
        this.remove(toast);
      }, duration);
    }

    return {
      remove: () => this.remove(toast),
      update: (newMessage, newType) => this.updateToast(toast, newMessage, newType)
    };
  }

  createToast(message, type, options = {}) {
    const toast = DOMUtils.createElement('div', `toast toast-${type}`);
    
    const iconMap = {
      success: 'fa-check-circle',
      error: 'fa-exclamation-circle',
      warning: 'fa-exclamation-triangle',
      info: 'fa-info-circle'
    };

    const content = options.html ? message : SecurityUtils.sanitizeHTML(message);
    
    toast.innerHTML = `
      <div class="toast-content">
        <i class="fas ${iconMap[type] || iconMap.info} toast-icon"></i>
        <div class="toast-message">${content}</div>
        ${options.actions && options.actions.length > 0 ? this.createActionButtons(options.actions) : ''}
        <button class="toast-close" aria-label="Close">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;

    // Add event listeners
    const closeButton = toast.querySelector('.toast-close');
    eventManager.addEventListener(closeButton, 'click', () => this.remove(toast));

    // Add action button listeners
    if (options.actions) {
      options.actions.forEach((action, index) => {
        const button = toast.querySelector(`[data-action="${index}"]`);
        if (button && action.handler) {
          eventManager.addEventListener(button, 'click', () => {
            try {
              action.handler();
              if (action.closeOnClick !== false) {
                this.remove(toast);
              }
            } catch (error) {
              errorHandler.handleError(error, { context: 'toast_action' });
            }
          });
        }
      });
    }

    return toast;
  }

  createActionButtons(actions) {
    return `
      <div class="toast-actions">
        ${actions.map((action, index) => 
          `<button class="btn btn-sm btn-outline-light" data-action="${index}">
            ${SecurityUtils.sanitizeHTML(action.text)}
           </button>`
        ).join('')}
      </div>
    `;
  }

  updateToast(toast, message, type) {
    const messageEl = toast.querySelector('.toast-message');
    const iconEl = toast.querySelector('.toast-icon');
    
    if (messageEl) {
      messageEl.textContent = SecurityUtils.sanitizeHTML(message);
    }
    
    if (iconEl && type) {
      const iconMap = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
      };
      
      iconEl.className = `fas ${iconMap[type] || iconMap.info} toast-icon`;
      toast.className = `toast toast-${type} show`;
    }
  }

  remove(toast) {
    if (!ToastSystem.#activeToasts.has(toast)) return;

    toast.classList.add('hide');
    
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
      ToastSystem.#activeToasts.delete(toast);
    }, CONFIG.UI.ANIMATION_DURATION);
  }

  removeAll() {
    ToastSystem.#activeToasts.forEach(toast => this.remove(toast));
  }

  // Convenience methods
  success(message, options = {}) {
    return this.show(message, 'success', options);
  }

  error(message, options = {}) {
    return this.show(message, 'error', options);
  }

  warning(message, options = {}) {
    return this.show(message, 'warning', options);
  }

  info(message, options = {}) {
    return this.show(message, 'info', options);
  }
}

/**
 * Loading System for visual feedback
 */
export class LoadingSystem {
  static #activeLoaders = new Map();

  static show(target, options = {}) {
    const {
      text = 'Loading...',
      spinner = 'default',
      overlay = true,
      size = 'medium'
    } = options;

    const targetElement = typeof target === 'string' ? 
      DOMUtils.safeQuerySelector(target) : target;

    if (!targetElement) {
      console.warn('Loading target not found:', target);
      return () => {};
    }

    // Remove existing loader if present
    this.hide(targetElement);

    const loader = this.createLoader(text, spinner, size, overlay);
    
    if (overlay) {
      targetElement.style.position = 'relative';
      targetElement.appendChild(loader);
    } else {
      targetElement.classList.add('loading');
      targetElement.appendChild(loader);
    }

    this.#activeLoaders.set(targetElement, loader);

    return () => this.hide(targetElement);
  }

  static createLoader(text, spinner, size, overlay) {
    const loader = DOMUtils.createElement('div', 
      `loading-component ${overlay ? 'loading-overlay' : ''} loading-${size}`
    );

    const spinnerHTML = this.getSpinnerHTML(spinner);
    
    loader.innerHTML = `
      <div class="loading-content">
        ${spinnerHTML}
        ${text ? `<div class="loading-text">${SecurityUtils.sanitizeHTML(text)}</div>` : ''}
      </div>
    `;

    return loader;
  }

  static getSpinnerHTML(type) {
    const spinners = {
      default: '<div class="spinner-border" role="status"><span class="visually-hidden">Loading...</span></div>',
      dots: '<div class="spinner-dots"><span></span><span></span><span></span></div>',
      pulse: '<div class="spinner-pulse"></div>',
      bars: '<div class="spinner-bars"><span></span><span></span><span></span><span></span></span></div>'
    };

    return spinners[type] || spinners.default;
  }

  static hide(target) {
    const targetElement = typeof target === 'string' ? 
      DOMUtils.safeQuerySelector(target) : target;

    if (!targetElement) return;

    const loader = this.#activeLoaders.get(targetElement);
    if (loader) {
      loader.remove();
      targetElement.classList.remove('loading');
      this.#activeLoaders.delete(targetElement);
    }
  }

  static hideAll() {
    this.#activeLoaders.forEach((loader, target) => {
      this.hide(target);
    });
  }

  static isLoading(target) {
    const targetElement = typeof target === 'string' ? 
      DOMUtils.safeQuerySelector(target) : target;
    
    return this.#activeLoaders.has(targetElement);
  }
}

/**
 * Modal System for dialogs and popups
 */
export class ModalSystem {
  static #activeModals = new Set();
  static #modalStack = [];

  static show(options = {}) {
    const {
      title = '',
      content = '',
      size = 'medium',
      backdrop = true,
      keyboard = true,
      actions = [],
      className = '',
      onShow = null,
      onHide = null
    } = options;

    const modal = this.createModal(title, content, size, actions, className);
    document.body.appendChild(modal);
    
    this.#activeModals.add(modal);
    this.#modalStack.push(modal);

    // Show modal with animation
    requestAnimationFrame(() => {
      modal.classList.add('show');
      document.body.classList.add('modal-open');
    });

    // Event listeners
    if (backdrop) {
      eventManager.addEventListener(modal, 'click', (e) => {
        if (e.target === modal) {
          this.hide(modal);
        }
      });
    }

    if (keyboard) {
      eventManager.addEventListener(document, 'keydown', (e) => {
        if (e.key === 'Escape' && this.#modalStack[this.#modalStack.length - 1] === modal) {
          this.hide(modal);
        }
      });
    }

    // Close button
    const closeButton = modal.querySelector('.modal-close');
    if (closeButton) {
      eventManager.addEventListener(closeButton, 'click', () => this.hide(modal));
    }

    // Action buttons
    actions.forEach((action, index) => {
      const button = modal.querySelector(`[data-action="${index}"]`);
      if (button && action.handler) {
        eventManager.addEventListener(button, 'click', async () => {
          try {
            const result = await action.handler(modal);
            if (action.closeOnClick !== false && result !== false) {
              this.hide(modal);
            }
          } catch (error) {
            errorHandler.handleError(error, { context: 'modal_action' });
          }
        });
      }
    });

    if (onShow) {
      try {
        onShow(modal);
      } catch (error) {
        errorHandler.handleError(error, { context: 'modal_show' });
      }
    }

    return {
      element: modal,
      hide: () => this.hide(modal),
      update: (newOptions) => this.updateModal(modal, newOptions)
    };
  }

  static createModal(title, content, size, actions, className) {
    const modal = DOMUtils.createElement('div', `modal ${className}`);
    modal.tabIndex = -1;
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    
    if (title) {
      modal.setAttribute('aria-labelledby', 'modal-title');
    }

    const actionsHTML = actions.length > 0 ? `
      <div class="modal-actions">
        ${actions.map((action, index) => 
          `<button class="btn btn-${action.variant || 'primary'}" data-action="${index}">
            ${SecurityUtils.sanitizeHTML(action.text)}
           </button>`
        ).join('')}
      </div>
    ` : '';

    modal.innerHTML = `
      <div class="modal-dialog modal-${size}">
        <div class="modal-content">
          ${title ? `
            <div class="modal-header">
              <h5 class="modal-title" id="modal-title">${SecurityUtils.sanitizeHTML(title)}</h5>
              <button class="modal-close" aria-label="Close">
                <i class="fas fa-times"></i>
              </button>
            </div>
          ` : ''}
          <div class="modal-body">
            ${typeof content === 'string' ? content : content.outerHTML || ''}
          </div>
          ${actionsHTML ? `<div class="modal-footer">${actionsHTML}</div>` : ''}
        </div>
      </div>
    `;

    return modal;
  }

  static hide(modal) {
    if (!this.#activeModals.has(modal)) return;

    modal.classList.remove('show');
    
    setTimeout(() => {
      if (modal.parentNode) {
        modal.parentNode.removeChild(modal);
      }
      
      this.#activeModals.delete(modal);
      const stackIndex = this.#modalStack.indexOf(modal);
      if (stackIndex > -1) {
        this.#modalStack.splice(stackIndex, 1);
      }

      // Remove modal-open class if no modals are active
      if (this.#activeModals.size === 0) {
        document.body.classList.remove('modal-open');
      }
    }, CONFIG.UI.ANIMATION_DURATION);
  }

  static hideAll() {
    this.#activeModals.forEach(modal => this.hide(modal));
  }

  static updateModal(modal, options) {
    if (options.title) {
      const titleEl = modal.querySelector('.modal-title');
      if (titleEl) {
        titleEl.textContent = SecurityUtils.sanitizeHTML(options.title);
      }
    }

    if (options.content) {
      const bodyEl = modal.querySelector('.modal-body');
      if (bodyEl) {
        bodyEl.innerHTML = typeof options.content === 'string' ? 
          options.content : options.content.outerHTML || '';
      }
    }
  }

  // Convenience methods
  static confirm(message, title = 'Confirm') {
    return new Promise((resolve) => {
      this.show({
        title,
        content: `<p>${SecurityUtils.sanitizeHTML(message)}</p>`,
        actions: [
          {
            text: 'Cancel',
            variant: 'secondary',
            handler: () => resolve(false)
          },
          {
            text: 'OK',
            variant: 'primary',
            handler: () => resolve(true)
          }
        ]
      });
    });
  }

  static alert(message, title = 'Alert') {
    return new Promise((resolve) => {
      this.show({
        title,
        content: `<p>${SecurityUtils.sanitizeHTML(message)}</p>`,
        actions: [
          {
            text: 'OK',
            variant: 'primary',
            handler: () => resolve(true)
          }
        ]
      });
    });
  }

  static prompt(message, defaultValue = '', title = 'Input') {
    return new Promise((resolve) => {
      const input = DOMUtils.createElement('input', 'form-control');
      input.type = 'text';
      input.value = defaultValue;
      input.placeholder = SecurityUtils.sanitizeHTML(message);

      const container = DOMUtils.createElement('div');
      container.innerHTML = `
        <p>${SecurityUtils.sanitizeHTML(message)}</p>
        ${input.outerHTML}
      `;

      this.show({
        title,
        content: container,
        actions: [
          {
            text: 'Cancel',
            variant: 'secondary',
            handler: () => resolve(null)
          },
          {
            text: 'OK',
            variant: 'primary',
            handler: (modal) => {
              const inputEl = modal.querySelector('input');
              resolve(inputEl ? inputEl.value : null);
            }
          }
        ],
        onShow: (modal) => {
          const inputEl = modal.querySelector('input');
          if (inputEl) {
            inputEl.focus();
            inputEl.select();
          }
        }
      });
    });
  }
}

/**
 * Progress Bar Component
 */
export class ProgressBar {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' ? 
      DOMUtils.safeQuerySelector(container) : container;
    
    this.options = {
      min: 0,
      max: 100,
      value: 0,
      animated: true,
      striped: false,
      variant: 'primary',
      height = '1rem',
      showLabel: true,
      ...options
    };

    this.element = this.create();
    if (this.container) {
      this.container.appendChild(this.element);
    }
  }

  create() {
    const progress = DOMUtils.createElement('div', 'progress');
    progress.style.height = this.options.height;

    const bar = DOMUtils.createElement('div', 
      `progress-bar bg-${this.options.variant} ${this.options.animated ? 'progress-bar-animated' : ''} ${this.options.striped ? 'progress-bar-striped' : ''}`
    );

    bar.setAttribute('role', 'progressbar');
    bar.setAttribute('aria-valuenow', this.options.value);
    bar.setAttribute('aria-valuemin', this.options.min);
    bar.setAttribute('aria-valuemax', this.options.max);

    progress.appendChild(bar);
    this.bar = bar;

    this.update(this.options.value);
    return progress;
  }

  update(value) {
    const clampedValue = Math.max(this.options.min, Math.min(this.options.max, value));
    const percentage = ((clampedValue - this.options.min) / (this.options.max - this.options.min)) * 100;

    this.bar.style.width = `${percentage}%`;
    this.bar.setAttribute('aria-valuenow', clampedValue);

    if (this.options.showLabel) {
      this.bar.textContent = `${Math.round(percentage)}%`;
    }

    this.options.value = clampedValue;
  }

  setVariant(variant) {
    this.bar.className = this.bar.className.replace(/bg-\w+/, `bg-${variant}`);
    this.options.variant = variant;
  }

  destroy() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }
}

/**
 * Tabs Component
 */
export class TabSystem {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' ? 
      DOMUtils.safeQuerySelector(container) : container;
    
    this.options = {
      activeTab: 0,
      onTabChange: null,
      ...options
    };

    this.tabs = [];
    this.activeIndex = 0;
    this.init();
  }

  init() {
    if (!this.container) return;

    const tabItems = this.container.querySelectorAll('.tab-item');
    const tabContents = this.container.querySelectorAll('.tab-content');

    tabItems.forEach((tab, index) => {
      eventManager.addEventListener(tab, 'click', () => {
        this.switchTo(index);
      });
    });

    this.switchTo(this.options.activeTab);
  }

  switchTo(index) {
    const tabItems = this.container.querySelectorAll('.tab-item');
    const tabContents = this.container.querySelectorAll('.tab-content');

    if (index < 0 || index >= tabItems.length) return;

    // Update tab items
    tabItems.forEach((tab, i) => {
      tab.classList.toggle('active', i === index);
    });

    // Update tab contents
    tabContents.forEach((content, i) => {
      content.classList.toggle('active', i === index);
    });

    const previousIndex = this.activeIndex;
    this.activeIndex = index;

    // Trigger callback
    if (this.options.onTabChange) {
      try {
        this.options.onTabChange(index, previousIndex);
      } catch (error) {
        errorHandler.handleError(error, { context: 'tab_change' });
      }
    }
  }

  getActiveIndex() {
    return this.activeIndex;
  }

  addTab(title, content) {
    // Implementation for dynamically adding tabs
    // This would require more complex DOM manipulation
  }
}

// Initialize global systems
export const toastSystem = ToastSystem.getInstance();
export const loadingSystem = LoadingSystem;
export const modalSystem = ModalSystem;

// Global convenience functions for backward compatibility
window.showToast = (message, type, options) => toastSystem.show(message, type, options);