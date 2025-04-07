import { apiClient } from '../modules/api.js';
import { showToast, showModal } from '../modules/ui.js';

// Dashboard Initialisierung
export function init() {
    // Initial laden
    updateSystemStatus();
    updateNetworkStatus();
    updateSystemLog();
    
    // Event Listener für Buttons
    document.getElementById('restart-btn').addEventListener('click', handleRestart);
    document.getElementById('update-btn').addEventListener('click', checkForUpdates);
    document.getElementById('backup-btn').addEventListener('click', createBackup);
    document.getElementById('refresh-log-btn').addEventListener('click', updateSystemLog);
    document.getElementById('download-log-btn').addEventListener('click', downloadLogs);
    
    // Automatische Aktualisierung alle 10 Sekunden
    setInterval(updateSystemStatus, 10000);
    setInterval(updateNetworkStatus, 10000);
}

// System Status aktualisieren
async function updateSystemStatus() {
    try {
        const response = await apiClient.getSystemStatus();
        
        if (response.success) {
            const data = response.data;
            
            // CPU Auslastung
            document.getElementById('cpu-usage').textContent = `${data.cpu}%`;
            
            // Speicherauslastung
            const memoryUsed = Math.round(data.memory.used / 1024);
            const memoryTotal = Math.round(data.memory.total / 1024);
            document.getElementById('memory-usage').textContent = `${memoryUsed}MB / ${memoryTotal}MB`;
            
            // Temperatur
            document.getElementById('temperature').textContent = `${data.temperature}°C`;
            
            // Uptime
            document.getElementById('uptime').textContent = formatUptime(data.uptime);
        } else {
            console.error('Fehler beim Laden des Systemstatus:', response.error);
        }
    } catch (error) {
        console.error('Fehler beim Aktualisieren des Systemstatus:', error);
    }
}

// Netzwerk Status aktualisieren
async function updateNetworkStatus() {
    try {
        const response = await apiClient.getWifiStatus();
        
        if (response.success) {
            const data = response.data;
            
            // WLAN Status
            document.getElementById('wifi-status').textContent = data.connected ? 'Verbunden' : 'Nicht verbunden';
            
            // Signalstärke
            if (data.connected) {
                document.getElementById('signal-strength').textContent = `${data.signal}%`;
            } else {
                document.getElementById('signal-strength').textContent = '--';
            }
            
            // IP-Adresse
            document.getElementById('ip-address').textContent = data.ip || '--';
        } else {
            console.error('Fehler beim Laden des Netzwerkstatus:', response.error);
        }
    } catch (error) {
        console.error('Fehler beim Aktualisieren des Netzwerkstatus:', error);
    }
}

// System Log aktualisieren
async function updateSystemLog() {
    try {
        const response = await apiClient.request('/system/log');
        
        if (response.success) {
            document.getElementById('log-content').textContent = response.data.log;
        } else {
            document.getElementById('log-content').textContent = 'Fehler beim Laden der Logs';
        }
    } catch (error) {
        console.error('Fehler beim Aktualisieren der Logs:', error);
        document.getElementById('log-content').textContent = 'Fehler beim Laden der Logs';
    }
}

// Neustart bestätigen und ausführen
function handleRestart() {
    showModal({
        title: 'System neustarten',
        content: 'Möchten Sie das System wirklich neustarten?',
        confirmText: 'Neustarten',
        cancelText: 'Abbrechen',
        onConfirm: async () => {
            try {
                const response = await apiClient.restartSystem();
                
                if (response.success) {
                    showToast('System wird neustartet...', 'info');
                    // Warten und Seite neu laden
                    setTimeout(() => {
                        window.location.reload();
                    }, 5000);
                } else {
                    showToast('Fehler beim Neustarten', 'error');
                }
            } catch (error) {
                console.error('Fehler beim Neustarten:', error);
                showToast('Fehler beim Neustarten', 'error');
            }
        }
    });
}

// Nach Updates prüfen
async function checkForUpdates() {
    try {
        const response = await apiClient.request('/system/check-update');
        
        if (response.success) {
            if (response.data.updateAvailable) {
                showModal({
                    title: 'Update verfügbar',
                    content: `Version ${response.data.version} ist verfügbar. Möchten Sie jetzt aktualisieren?`,
                    confirmText: 'Aktualisieren',
                    cancelText: 'Später',
                    onConfirm: async () => {
                        try {
                            const updateResponse = await apiClient.request('/system/update', { method: 'POST' });
                            
                            if (updateResponse.success) {
                                showToast('Update wird installiert...', 'info');
                                // Warten und Seite neu laden
                                setTimeout(() => {
                                    window.location.reload();
                                }, 10000);
                            } else {
                                showToast('Fehler beim Update', 'error');
                            }
                        } catch (error) {
                            console.error('Fehler beim Update:', error);
                            showToast('Fehler beim Update', 'error');
                        }
                    }
                });
            } else {
                showToast('Keine Updates verfügbar', 'info');
            }
        } else {
            showToast('Fehler beim Prüfen auf Updates', 'error');
        }
    } catch (error) {
        console.error('Fehler beim Prüfen auf Updates:', error);
        showToast('Fehler beim Prüfen auf Updates', 'error');
    }
}

// Backup erstellen
async function createBackup() {
    try {
        const response = await apiClient.request('/system/backup', { method: 'POST' });
        
        if (response.success) {
            // Download-Link erstellen
            const link = document.createElement('a');
            link.href = response.data.downloadUrl;
            link.download = `awtrix3_backup_${new Date().toISOString().slice(0, 10)}.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            showToast('Backup wurde erstellt', 'success');
        } else {
            showToast('Fehler beim Erstellen des Backups', 'error');
        }
    } catch (error) {
        console.error('Fehler beim Erstellen des Backups:', error);
        showToast('Fehler beim Erstellen des Backups', 'error');
    }
}

// Logs herunterladen
async function downloadLogs() {
    try {
        const response = await apiClient.request('/system/log/download', { method: 'GET' });
        
        if (response.success) {
            // Download-Link erstellen
            const link = document.createElement('a');
            link.href = response.data.downloadUrl;
            link.download = `awtrix3_logs_${new Date().toISOString().slice(0, 10)}.txt`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            showToast('Logs wurden heruntergeladen', 'success');
        } else {
            showToast('Fehler beim Herunterladen der Logs', 'error');
        }
    } catch (error) {
        console.error('Fehler beim Herunterladen der Logs:', error);
        showToast('Fehler beim Herunterladen der Logs', 'error');
    }
}

// Hilfsfunktion: Uptime formatieren
function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
        return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
        return `${hours}h ${minutes}m`;
    } else {
        return `${minutes}m`;
    }
} 