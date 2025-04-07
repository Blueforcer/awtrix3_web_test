/**
 * AWTRIX3 Dashboard Module
 * Professional dashboard with live stats, screen display and controls
 * @version 2.0.0
 */

import { CONFIG } from './config.js';
import { statsAPI, displayAPI } from './api-service.js';
import { eventManager } from './event-manager.js';
import { errorHandler, withErrorHandling } from './error-handler.js';
import { toastSystem, loadingSystem, ProgressBar } from './ui-components.js';
import { PerformanceUtils } from './utils.js';

/**
 * Live Matrix Display Component
 */
class MatrixDisplay {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.isRunning = false;
    this.animationId = null;
    
    if (this.canvas && this.ctx) {
      this.canvas.width = CONFIG.UI.CANVAS_DIMENSIONS.WIDTH;
      this.canvas.height = CONFIG.UI.CANVAS_DIMENSIONS.HEIGHT;
      this.setupCanvas();
    }
  }

  setupCanvas() {
    // Set canvas styles for responsive behavior
    this.canvas.style.maxWidth = '100%';
    this.canvas.style.height = 'auto';
    this.canvas.style.border = '2px solid var(--bs-border-color)';
    this.canvas.style.borderRadius = '8px';
  }

  async start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    await this.render();
  }

  stop() {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  async render() {
    if (!this.isRunning || !this.ctx) return;

    try {
      const result = await displayAPI.getScreenData();
      
      if (result.success && result.data) {
        this.drawPixels(result.data);
      }
    } catch (error) {
      console.warn('Failed to get screen data:', error);
    }

    // Schedule next frame
    this.animationId = requestAnimationFrame(() => this.render());
  }

  drawPixels(screenData) {
    if (!this.ctx || !Array.isArray(screenData)) return;

    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const { MATRIX_WIDTH, MATRIX_HEIGHT, CELL_SIZE, CELL_PADDING } = CONFIG.UI.CANVAS_DIMENSIONS;

    for (let y = 0; y < MATRIX_HEIGHT; y++) {
      for (let x = 0; x < MATRIX_WIDTH; x++) {
        const index = y * MATRIX_WIDTH + x;
        const colorValue = screenData[index] || 0;

        const r = (colorValue & 0xff0000) >> 16;
        const g = (colorValue & 0x00ff00) >> 8;
        const b = colorValue & 0x0000ff;

        this.ctx.fillStyle = `rgb(${r},${g},${b})`;
        this.ctx.fillRect(
          x * CELL_SIZE, 
          y * CELL_SIZE, 
          CELL_PADDING, 
          CELL_PADDING
        );
      }
    }
  }

  async captureScreenshot() {
    if (!this.canvas) return null;

    try {
      const dataUrl = this.canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = 'awtrix-screenshot.png';
      link.click();
      
      toastSystem.success('Screenshot saved successfully');
      return dataUrl;
    } catch (error) {
      errorHandler.handleError(error, { context: 'screenshot' });
      return null;
    }
  }

  resize() {
    if (!this.canvas) return;

    const container = this.canvas.parentElement;
    if (!container) return;

    const containerWidth = container.clientWidth;
    const scale = containerWidth / CONFIG.UI.CANVAS_DIMENSIONS.WIDTH;

    this.canvas.style.width = `${containerWidth}px`;
    this.canvas.style.height = `${CONFIG.UI.CANVAS_DIMENSIONS.HEIGHT * scale}px`;
  }
}

/**
 * GIF Recording Component
 */
class GIFRecorder {
  constructor() {
    this.isRecording = false;
    this.encoder = null;
    this.startTime = 0;
    this.frameCount = 0;
    this.recordingTimer = null;
  }

  async startRecording(canvas) {
    if (this.isRecording || !canvas) return false;

    try {
      // Dynamic import for GIF encoder to reduce initial bundle size
      const { GIFEncoder, quantize, applyPalette } = await import('https://unpkg.com/gifenc@1.0.3');
      
      this.encoder = GIFEncoder();
      this.isRecording = true;
      this.startTime = performance.now();
      this.frameCount = 0;

      this.captureFrame(canvas, GIFEncoder, quantize, applyPalette);
      this.updateRecordingUI(true);

      toastSystem.info('GIF recording started', { duration: 1500 });
      return true;

    } catch (error) {
      errorHandler.handleError(error, { context: 'gif_recording_start' });
      return false;
    }
  }

  stopRecording() {
    if (!this.isRecording || !this.encoder) return null;

    this.isRecording = false;
    this.encoder.finish();
    
    const gifBlob = new Blob([this.encoder.bytesView()], { type: 'image/gif' });
    this.downloadGIF(gifBlob);
    
    this.updateRecordingUI(false);
    this.encoder = null;

    toastSystem.success(`GIF recording completed (${this.frameCount} frames)`);
    return gifBlob;
  }

  captureFrame(canvas, GIFEncoder, quantize, applyPalette) {
    if (!this.isRecording || !this.encoder) return;

    const currentTime = performance.now();
    const deltaTime = Math.round(currentTime - this.startTime);
    
    const imageData = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    const palette = quantize(imageData, 256, { format: 'rgb444' });
    const indexedPixels = applyPalette(imageData, palette, 'rgb444');

    this.encoder.writeFrame(indexedPixels, canvas.width, canvas.height, {
      palette,
      delay: Math.max(deltaTime, 50) // Minimum 50ms between frames
    });

    this.frameCount++;
    this.startTime = currentTime;

    // Schedule next frame
    if (this.isRecording) {
      requestAnimationFrame(() => this.captureFrame(canvas, GIFEncoder, quantize, applyPalette));
    }
  }

  downloadGIF(blob) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `awtrix-${new Date().getTime()}.gif`;
    link.click();
    URL.revokeObjectURL(url);
  }

  updateRecordingUI(isRecording) {
    const button = document.getElementById('record-gif-btn');
    const timeDisplay = document.getElementById('recording-time');
    
    if (!button) return;

    if (isRecording) {
      button.classList.add('recording');
      button.innerHTML = '<i class="fas fa-stop"></i> Stop Recording <span id="record-time"></span>';
      
      this.recordingTimer = setInterval(() => {
        const elapsed = Math.floor((Date.now() - (this.startTime || Date.now())) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        
        const timeEl = document.getElementById('record-time');
        if (timeEl) {
          timeEl.textContent = ` (${minutes}:${seconds.toString().padStart(2, '0')})`;
        }
      }, 1000);
      
    } else {
      button.classList.remove('recording');
      button.innerHTML = '<i class="fas fa-record-vinyl"></i> Record GIF';
      
      if (this.recordingTimer) {
        clearInterval(this.recordingTimer);
        this.recordingTimer = null;
      }
    }
  }
}

/**
 * System Statistics Component
 */
class SystemStats {
  constructor(container) {
    this.container = container;
    this.refreshInterval = null;
    this.isActive = false;
    this.charts = {};
  }

  async start() {
    if (this.isActive) return;
    
    this.isActive = true;
    await this.loadStats();
    
    this.refreshInterval = eventManager.setInterval(
      () => this.loadStats(),
      CONFIG.UI.STATS_REFRESH_INTERVAL
    );
  }

  stop() {
    this.isActive = false;
    
    if (this.refreshInterval) {
      this.refreshInterval();
      this.refreshInterval = null;
    }

    // Destroy any charts
    Object.values(this.charts).forEach(chart => {
      if (chart && typeof chart.destroy === 'function') {
        chart.destroy();
      }
    });
    this.charts = {};
  }

  async loadStats() {
    try {
      const result = await statsAPI.getStats();
      
      if (result.success && result.data) {
        const formattedStats = statsAPI.formatStats(result.data);
        this.updateDisplay(formattedStats);
      } else {
        this.showError();
      }
    } catch (error) {
      console.warn('Failed to load stats:', error);
      this.showError();
    }
  }

  updateDisplay(stats) {
    if (!stats || !this.container) return;

    // Update RAM usage
    this.updateStat('ram-usage', 
      `${this.formatBytes(stats.ram.used)} / ${this.formatBytes(stats.ram.total)} (${stats.ram.percentage}%)`
    );
    
    // Update Flash usage
    this.updateStat('flash-usage',
      `${this.formatBytes(stats.flash.used)} / ${this.formatBytes(stats.flash.total)} (${stats.flash.percentage}%)`
    );
    
    // Update Uptime
    this.updateStat('uptime', this.formatUptime(stats.uptime));
    
    // Update WiFi Signal
    this.updateStat('wifi-signal', 
      `${stats.wifi.strength}% (${stats.wifi.signal} dB)`
    );
    
    // Update Current App
    this.updateStat('current-app', stats.currentApp || 'None');
    
    // Update SSID and IP
    this.updateStat('wifi-ssid', stats.wifi.ssid || 'Not connected');
    this.updateStat('wifi-ip', stats.wifi.ip || 'N/A');

    // Update progress bars if they exist
    this.updateProgressBar('ram-progress', stats.ram.percentage);
    this.updateProgressBar('flash-progress', stats.flash.percentage);

    // Remove error states
    this.container.querySelectorAll('.stat-error').forEach(el => {
      el.classList.remove('stat-error');
    });
  }

  updateStat(id, value) {
    const element = document.getElementById(id);
    if (element) {
      // Animate value change
      element.style.transform = 'translateY(-3px)';
      element.style.opacity = '0.7';
      
      setTimeout(() => {
        element.textContent = value;
        element.style.transform = 'translateY(0)';
        element.style.opacity = '1';
      }, 100);
    }
  }

  updateProgressBar(id, percentage) {
    const progressBar = document.getElementById(id);
    if (progressBar) {
      const bar = progressBar.querySelector('.progress-bar');
      if (bar) {
        bar.style.width = `${Math.min(100, Math.max(0, percentage))}%`;
        bar.setAttribute('aria-valuenow', percentage);
        
        // Update color based on usage
        bar.className = bar.className.replace(/bg-\w+/, this.getProgressColor(percentage));
      }
    }
  }

  getProgressColor(percentage) {
    if (percentage < 50) return 'bg-success';
    if (percentage < 75) return 'bg-warning';
    return 'bg-danger';
  }

  showError() {
    const statElements = ['ram-usage', 'flash-usage', 'uptime', 'wifi-signal', 'current-app'];
    
    statElements.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        element.textContent = '--';
        element.closest('.stat-card')?.classList.add('stat-error');
      }
    });
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatUptime(seconds) {
    const days = Math.floor(seconds / (24 * 60 * 60));
    const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((seconds % (60 * 60)) / 60);
    const secs = seconds % 60;

    return `${days}d ${hours}h ${minutes}m ${secs}s`;
  }
}

/**
 * Dashboard Controller
 */
class DashboardController {
  constructor() {
    this.matrixDisplay = null;
    this.gifRecorder = new GIFRecorder();
    this.systemStats = null;
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      await this.setupComponents();
      this.setupEventListeners();
      this.setupResponsiveHandling();
      
      this.isInitialized = true;
      console.info('Dashboard initialized successfully');
      
    } catch (error) {
      errorHandler.handleError(error, { 
        context: 'dashboard_initialization',
        severity: 'high' 
      });
    }
  }

  async setupComponents() {
    // Initialize Matrix Display
    const canvas = document.getElementById('matrix-canvas');
    if (canvas) {
      this.matrixDisplay = new MatrixDisplay(canvas);
      await this.matrixDisplay.start();
    }

    // Initialize System Stats
    const statsContainer = document.getElementById('stats-container');
    if (statsContainer) {
      this.systemStats = new SystemStats(statsContainer);
      await this.systemStats.start();
    }
  }

  setupEventListeners() {
    // Screenshot button
    const screenshotBtn = document.getElementById('screenshot-btn');
    if (screenshotBtn && this.matrixDisplay) {
      eventManager.addEventListener(screenshotBtn, 'click', 
        withErrorHandling(() => this.matrixDisplay.captureScreenshot())
      );
    }

    // GIF Recording button
    const gifBtn = document.getElementById('record-gif-btn');
    if (gifBtn) {
      eventManager.addEventListener(gifBtn, 'click', 
        withErrorHandling(async () => {
          if (this.gifRecorder.isRecording) {
            this.gifRecorder.stopRecording();
          } else {
            const canvas = document.getElementById('matrix-canvas');
            await this.gifRecorder.startRecording(canvas);
          }
        })
      );
    }

    // App Navigation buttons
    const nextAppBtn = document.getElementById('next-app-btn');
    if (nextAppBtn) {
      eventManager.addEventListener(nextAppBtn, 'click',
        withErrorHandling(async () => {
          loadingSystem.show(nextAppBtn, { size: 'small', text: '' });
          try {
            await displayAPI.nextApp();
            toastSystem.success('Switched to next app');
          } finally {
            loadingSystem.hide(nextAppBtn);
          }
        })
      );
    }

    const prevAppBtn = document.getElementById('prev-app-btn');
    if (prevAppBtn) {
      eventManager.addEventListener(prevAppBtn, 'click',
        withErrorHandling(async () => {
          loadingSystem.show(prevAppBtn, { size: 'small', text: '' });
          try {
            await displayAPI.previousApp();
            toastSystem.success('Switched to previous app');
          } finally {
            loadingSystem.hide(prevAppBtn);
          }
        })
      );
    }

    // Fullscreen button
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    if (fullscreenBtn) {
      eventManager.addEventListener(fullscreenBtn, 'click', () => {
        const container = document.querySelector('.matrix-container');
        if (container && container.requestFullscreen) {
          container.requestFullscreen().catch(err => {
            console.warn('Fullscreen not supported:', err);
          });
        }
      });
    }
  }

  setupResponsiveHandling() {
    // Handle window resize for canvas
    const debouncedResize = PerformanceUtils.debounce(() => {
      if (this.matrixDisplay) {
        this.matrixDisplay.resize();
      }
    }, 250);

    eventManager.addEventListener(window, 'resize', debouncedResize);
    eventManager.addEventListener(window, 'orientationchange', debouncedResize);

    // Initial resize
    if (this.matrixDisplay) {
      this.matrixDisplay.resize();
    }
  }

  // Public methods for external control
  async refresh() {
    if (this.systemStats) {
      await this.systemStats.loadStats();
    }
  }

  pause() {
    if (this.matrixDisplay) {
      this.matrixDisplay.stop();
    }
    if (this.systemStats) {
      this.systemStats.stop();
    }
  }

  resume() {
    if (this.matrixDisplay) {
      this.matrixDisplay.start();
    }
    if (this.systemStats) {
      this.systemStats.start();
    }
  }

  cleanup() {
    this.pause();
    
    if (this.gifRecorder && this.gifRecorder.isRecording) {
      this.gifRecorder.stopRecording();
    }
  }
}

// Initialize dashboard when page loads
let dashboardController = null;

eventManager.onPageChange('dashboard', async () => {
  if (dashboardController) {
    dashboardController.cleanup();
  }
  
  // Small delay to ensure DOM is ready
  await new Promise(resolve => setTimeout(resolve, 100));
  
  dashboardController = new DashboardController();
  await dashboardController.initialize();
});

// Handle page visibility changes
eventManager.addEventListener(document, 'visibilitychange', () => {
  if (dashboardController) {
    if (document.visibilityState === 'hidden') {
      dashboardController.pause();
    } else {
      dashboardController.resume();
    }
  }
});

// Export for external use
export { DashboardController };