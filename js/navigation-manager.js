/**
 * AWTRIX3 Navigation Management System
 * Handles page loading and history
 * @version 2.0.0
 */

import { DOMUtils, PerformanceUtils } from './utils.js';
import { errorHandler } from './error-handler.js';
import { eventManager } from './event-manager.js';

export class NavigationManager {
  static #currentPage = null;
  static #history = [];

  static async loadPage(pageId) {
    const previousPage = NavigationManager.#currentPage;
    
    try {
      // Update navigation state in the UI
      document.querySelectorAll('.nav-item[data-page]').forEach(item => {
        item.classList.toggle('active', item.getAttribute('data-page') === pageId);
      });

      const pageContent = DOMUtils.safeQuerySelector('#page-content');
      if (!pageContent) {
        throw new Error('Page content container not found');
      }

      pageContent.classList.add('loading');
      
      try {
        let content = '';
        
        if (pageId === 'creator') {
          content = `<iframe src="piskel/index.html" style="width:100%;height:80vh;border:none;" allowfullscreen></iframe>`;
        } else {
          const response = await fetch(`pages/${pageId}.html`);
          if (!response.ok) {
            throw new Error(`Failed to load page: ${pageId} (Status: ${response.status})`);
          }
          content = await response.text();
        }

        // Animate page transition
        pageContent.classList.remove('animate__fadeIn');
        await PerformanceUtils.animationFrame();
        
        pageContent.innerHTML = content;
        pageContent.classList.add('animate__fadeIn');

        NavigationManager.#currentPage = pageId;
        if (NavigationManager.#history[NavigationManager.#history.length - 1] !== pageId) {
            NavigationManager.#history.push(pageId);
        }

        eventManager.triggerPageChange(pageId, previousPage);

      } catch (error) {
        pageContent.innerHTML = `<div class="card error-card">
          <div class="error-icon"><i class="fas fa-exclamation-triangle"></i></div>
          <h4>Error Loading Page</h4>
          <p>${error.message}</p>
          <button onclick="location.reload()">Reload</button>
        </div>`;
        throw error;
      } finally {
        pageContent.classList.remove('loading');
      }

    } catch (error) {
      errorHandler.handleError(error, {
        pageId,
        previousPage,
        category: 'navigation'
      });
    }
  }

  static getCurrentPage() {
    return NavigationManager.#currentPage;
  }

  static getHistory() {
    return [...NavigationManager.#history];
  }

  static canGoBack() {
    return NavigationManager.#history.length > 1;
  }

  static goBack() {
    if (NavigationManager.canGoBack()) {
      NavigationManager.#history.pop();
      const previousPage = NavigationManager.#history[NavigationManager.#history.length - 1];
      return NavigationManager.loadPage(previousPage);
    }
  }
}
