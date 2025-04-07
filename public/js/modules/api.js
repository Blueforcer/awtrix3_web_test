// API Configuration
const API_CONFIG = {
    baseUrl: '/api',
    timeout: 5000,
    retryAttempts: 3
};

// API Endpoints
const ENDPOINTS = {
    system: {
        status: '/system/status',
        restart: '/system/restart',
        update: '/system/update'
    },
    network: {
        wifi: {
            scan: '/network/wifi/scan',
            connect: '/network/wifi/connect',
            status: '/network/wifi/status'
        },
        settings: '/network/settings'
    },
    time: {
        status: '/time/status',
        set: '/time/set'
    },
    icons: {
        list: '/icons/list',
        upload: '/icons/upload',
        delete: '/icons/delete'
    }
};

// API Response Handler
class ApiResponse {
    constructor(success, data, error = null) {
        this.success = success;
        this.data = data;
        this.error = error;
    }

    static success(data) {
        return new ApiResponse(true, data);
    }

    static error(error) {
        return new ApiResponse(false, null, error);
    }
}

// API Client für die Kommunikation mit dem ESP32
class ApiClient {
    constructor() {
        this.baseUrl = 'http://awtrix3.local';
        this.timeout = 5000; // 5 Sekunden Timeout
    }

    // Basis Request Methode
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: this.timeout
        };

        try {
            const response = await fetch(url, { ...defaultOptions, ...options });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('API Request failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // System Status
    async getSystemStatus() {
        return this.request('/api/system/status');
    }

    async restartSystem() {
        return this.request('/api/system/restart', { method: 'POST' });
    }

    async updateSystem() {
        return this.request('/api/system/update', { method: 'POST' });
    }

    async createBackup() {
        return this.request('/api/system/backup', { method: 'POST' });
    }

    async getLogs() {
        return this.request('/api/system/logs');
    }

    // WLAN Funktionen
    async getWifiStatus() {
        return this.request('/api/network/wifi/status');
    }

    async scanWifiNetworks() {
        return this.request('/api/network/wifi/scan', { method: 'POST' });
    }

    async connectToWifi(credentials) {
        return this.request('/api/network/wifi/connect', {
            method: 'POST',
            body: JSON.stringify(credentials)
        });
    }

    async disconnectWifi() {
        return this.request('/api/network/wifi/disconnect', { method: 'POST' });
    }

    // Einstellungen
    async getSettings() {
        return this.request('/api/settings');
    }

    async updateSetting(key, value) {
        return this.request('/api/settings', {
            method: 'POST',
            body: JSON.stringify({ key, value })
        });
    }

    // Apps
    async getApps() {
        return this.request('/api/apps');
    }

    async installApp(appId) {
        return this.request(`/api/apps/${appId}/install`, { method: 'POST' });
    }

    async uninstallApp(appId) {
        return this.request(`/api/apps/${appId}/uninstall`, { method: 'POST' });
    }

    async updateApp(appId) {
        return this.request(`/api/apps/${appId}/update`, { method: 'POST' });
    }

    async getAppConfig(appId) {
        return this.request(`/api/apps/${appId}/config`);
    }

    async updateAppConfig(appId, config) {
        return this.request(`/api/apps/${appId}/config`, {
            method: 'POST',
            body: JSON.stringify(config)
        });
    }

    // Notifications
    async sendNotification(notification) {
        return this.request('/api/notifications', {
            method: 'POST',
            body: JSON.stringify(notification)
        });
    }

    async getNotificationHistory() {
        return this.request('/api/notifications/history');
    }

    async clearNotificationHistory() {
        return this.request('/api/notifications/history', { method: 'DELETE' });
    }
}

// API Client Instanz exportieren
export const apiClient = new ApiClient();

export function initApi() {
    // Initialize API client and any necessary setup
    window.api = apiClient;
}

export { apiClient, ENDPOINTS }; 