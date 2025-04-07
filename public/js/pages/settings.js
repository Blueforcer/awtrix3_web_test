import { apiClient } from '../modules/api.js';
import { showToast, showModal } from '../modules/ui.js';

// Settings Initialisierung
export function init() {
    // Initial laden
    loadSettings();
    
    // Event Listener für Edit Buttons
    document.querySelectorAll('.edit-btn').forEach(button => {
        button.addEventListener('click', () => {
            const setting = button.dataset.setting;
            openEditModal(setting);
        });
    });
    
    // Event Listener für Slider
    const brightnessSlider = document.getElementById('brightness-slider');
    if (brightnessSlider) {
        brightnessSlider.addEventListener('input', (e) => {
            document.getElementById('brightness-value').textContent = `${e.target.value}%`;
        });
        
        brightnessSlider.addEventListener('change', (e) => {
            updateBrightness(e.target.value);
        });
    }
    
    // Event Listener für Switches
    const autoBrightnessSwitch = document.getElementById('auto-brightness');
    if (autoBrightnessSwitch) {
        autoBrightnessSwitch.addEventListener('change', (e) => {
            updateAutoBrightness(e.target.checked);
        });
    }
    
    const autoUpdatesSwitch = document.getElementById('auto-updates');
    if (autoUpdatesSwitch) {
        autoUpdatesSwitch.addEventListener('change', (e) => {
            updateAutoUpdates(e.target.checked);
        });
    }
}

// Einstellungen laden
async function loadSettings() {
    try {
        const response = await apiClient.getSettings();
        
        if (response.success) {
            const settings = response.data;
            
            // System Einstellungen
            document.getElementById('hostname-value').textContent = settings.hostname;
            document.getElementById('timezone-value').textContent = settings.timezone;
            document.getElementById('ntp-value').textContent = settings.ntpServer;
            
            // Netzwerk Einstellungen
            document.getElementById('ip-config-value').textContent = settings.ipConfig;
            document.getElementById('dns-value').textContent = settings.dnsServers.join(', ');
            
            // Display Einstellungen
            const brightnessSlider = document.getElementById('brightness-slider');
            const brightnessValue = document.getElementById('brightness-value');
            if (brightnessSlider && brightnessValue) {
                brightnessSlider.value = settings.brightness;
                brightnessValue.textContent = `${settings.brightness}%`;
            }
            
            const autoBrightnessSwitch = document.getElementById('auto-brightness');
            if (autoBrightnessSwitch) {
                autoBrightnessSwitch.checked = settings.autoBrightness;
            }
            
            document.getElementById('timeout-value').textContent = formatTimeout(settings.screenTimeout);
            
            // Update Einstellungen
            const autoUpdatesSwitch = document.getElementById('auto-updates');
            if (autoUpdatesSwitch) {
                autoUpdatesSwitch.checked = settings.autoUpdates;
            }
            
            document.getElementById('channel-value').textContent = settings.updateChannel;
        } else {
            console.error('Fehler beim Laden der Einstellungen:', response.error);
            showToast('Fehler beim Laden der Einstellungen', 'error');
        }
    } catch (error) {
        console.error('Fehler beim Laden der Einstellungen:', error);
        showToast('Fehler beim Laden der Einstellungen', 'error');
    }
}

// Edit Modal öffnen
function openEditModal(setting) {
    const template = document.getElementById('edit-modal-template');
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = template.innerHTML;
    
    const title = modal.querySelector('.modal-title');
    const body = modal.querySelector('.modal-body');
    const saveBtn = modal.querySelector('.save-btn');
    const cancelBtn = modal.querySelector('.cancel-btn');
    
    // Modal Inhalt basierend auf Einstellung
    switch (setting) {
        case 'hostname':
            title.textContent = 'Hostname bearbeiten';
            body.innerHTML = `
                <div class="form-group">
                    <label for="hostname-input" class="form-label">Hostname</label>
                    <input type="text" id="hostname-input" class="form-input" value="${document.getElementById('hostname-value').textContent}">
                </div>
            `;
            break;
            
        case 'timezone':
            title.textContent = 'Zeitzone bearbeiten';
            body.innerHTML = `
                <div class="form-group">
                    <label for="timezone-select" class="form-label">Zeitzone</label>
                    <select id="timezone-select" class="form-select">
                        <option value="Europe/Berlin">Europe/Berlin</option>
                        <option value="Europe/London">Europe/London</option>
                        <option value="America/New_York">America/New_York</option>
                        <option value="Asia/Tokyo">Asia/Tokyo</option>
                    </select>
                </div>
            `;
            document.getElementById('timezone-select').value = document.getElementById('timezone-value').textContent;
            break;
            
        case 'ntp':
            title.textContent = 'NTP Server bearbeiten';
            body.innerHTML = `
                <div class="form-group">
                    <label for="ntp-input" class="form-label">NTP Server</label>
                    <input type="text" id="ntp-input" class="form-input" value="${document.getElementById('ntp-value').textContent}">
                </div>
            `;
            break;
            
        case 'ip':
            title.textContent = 'IP Konfiguration bearbeiten';
            body.innerHTML = `
                <div class="form-group">
                    <label for="ip-config-select" class="form-label">IP Konfiguration</label>
                    <select id="ip-config-select" class="form-select">
                        <option value="DHCP">DHCP</option>
                        <option value="Static">Statisch</option>
                    </select>
                </div>
                <div id="static-ip-fields" style="display: none;">
                    <div class="form-group">
                        <label for="ip-address" class="form-label">IP Adresse</label>
                        <input type="text" id="ip-address" class="form-input" placeholder="192.168.1.100">
                    </div>
                    <div class="form-group">
                        <label for="subnet-mask" class="form-label">Subnetzmaske</label>
                        <input type="text" id="subnet-mask" class="form-input" placeholder="255.255.255.0">
                    </div>
                    <div class="form-group">
                        <label for="gateway" class="form-label">Gateway</label>
                        <input type="text" id="gateway" class="form-input" placeholder="192.168.1.1">
                    </div>
                </div>
            `;
            
            const ipConfigSelect = document.getElementById('ip-config-select');
            const staticIpFields = document.getElementById('static-ip-fields');
            
            ipConfigSelect.value = document.getElementById('ip-config-value').textContent;
            if (ipConfigSelect.value === 'Static') {
                staticIpFields.style.display = 'block';
            }
            
            ipConfigSelect.addEventListener('change', () => {
                staticIpFields.style.display = ipConfigSelect.value === 'Static' ? 'block' : 'none';
            });
            break;
            
        case 'dns':
            title.textContent = 'DNS Server bearbeiten';
            body.innerHTML = `
                <div class="form-group">
                    <label for="dns-input" class="form-label">DNS Server (durch Komma getrennt)</label>
                    <input type="text" id="dns-input" class="form-input" value="${document.getElementById('dns-value').textContent}">
                </div>
            `;
            break;
            
        case 'timeout':
            title.textContent = 'Bildschirmzeitout bearbeiten';
            body.innerHTML = `
                <div class="form-group">
                    <label for="timeout-select" class="form-label">Bildschirmzeitout</label>
                    <select id="timeout-select" class="form-select">
                        <option value="300">5 Minuten</option>
                        <option value="600">10 Minuten</option>
                        <option value="900">15 Minuten</option>
                        <option value="1800">30 Minuten</option>
                        <option value="3600">1 Stunde</option>
                        <option value="0">Nie</option>
                    </select>
                </div>
            `;
            const currentTimeout = document.getElementById('timeout-value').textContent;
            const timeoutSelect = document.getElementById('timeout-select');
            for (const option of timeoutSelect.options) {
                if (option.text === currentTimeout) {
                    timeoutSelect.value = option.value;
                    break;
                }
            }
            break;
            
        case 'channel':
            title.textContent = 'Update Kanal bearbeiten';
            body.innerHTML = `
                <div class="form-group">
                    <label for="channel-select" class="form-label">Update Kanal</label>
                    <select id="channel-select" class="form-select">
                        <option value="stable">Stable</option>
                        <option value="beta">Beta</option>
                        <option value="alpha">Alpha</option>
                    </select>
                </div>
            `;
            document.getElementById('channel-select').value = document.getElementById('channel-value').textContent.toLowerCase();
            break;
    }
    
    // Event Listener für Buttons
    saveBtn.addEventListener('click', () => {
        saveSetting(setting, modal);
    });
    
    cancelBtn.addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    
    // Modal zum DOM hinzufügen
    document.body.appendChild(modal);
}

// Einstellung speichern
async function saveSetting(setting, modal) {
    let value;
    
    // Wert aus Modal holen
    switch (setting) {
        case 'hostname':
            value = document.getElementById('hostname-input').value;
            break;
            
        case 'timezone':
            value = document.getElementById('timezone-select').value;
            break;
            
        case 'ntp':
            value = document.getElementById('ntp-input').value;
            break;
            
        case 'ip':
            const ipConfig = document.getElementById('ip-config-select').value;
            if (ipConfig === 'Static') {
                value = {
                    config: ipConfig,
                    address: document.getElementById('ip-address').value,
                    subnet: document.getElementById('subnet-mask').value,
                    gateway: document.getElementById('gateway').value
                };
            } else {
                value = { config: ipConfig };
            }
            break;
            
        case 'dns':
            value = document.getElementById('dns-input').value.split(',').map(s => s.trim());
            break;
            
        case 'timeout':
            value = parseInt(document.getElementById('timeout-select').value);
            break;
            
        case 'channel':
            value = document.getElementById('channel-select').value;
            break;
    }
    
    try {
        const response = await apiClient.updateSetting(setting, value);
        
        if (response.success) {
            showToast('Einstellung wurde gespeichert', 'success');
            loadSettings(); // Einstellungen neu laden
            document.body.removeChild(modal);
        } else {
            showToast(`Fehler beim Speichern: ${response.error}`, 'error');
        }
    } catch (error) {
        console.error('Fehler beim Speichern der Einstellung:', error);
        showToast('Fehler beim Speichern der Einstellung', 'error');
    }
}

// Helligkeit aktualisieren
async function updateBrightness(value) {
    try {
        const response = await apiClient.updateSetting('brightness', parseInt(value));
        
        if (response.success) {
            showToast('Helligkeit wurde aktualisiert', 'success');
        } else {
            showToast('Fehler beim Aktualisieren der Helligkeit', 'error');
        }
    } catch (error) {
        console.error('Fehler beim Aktualisieren der Helligkeit:', error);
        showToast('Fehler beim Aktualisieren der Helligkeit', 'error');
    }
}

// Automatische Helligkeit aktualisieren
async function updateAutoBrightness(enabled) {
    try {
        const response = await apiClient.updateSetting('autoBrightness', enabled);
        
        if (response.success) {
            showToast('Automatische Helligkeit wurde aktualisiert', 'success');
        } else {
            showToast('Fehler beim Aktualisieren der automatischen Helligkeit', 'error');
        }
    } catch (error) {
        console.error('Fehler beim Aktualisieren der automatischen Helligkeit:', error);
        showToast('Fehler beim Aktualisieren der automatischen Helligkeit', 'error');
    }
}

// Automatische Updates aktualisieren
async function updateAutoUpdates(enabled) {
    try {
        const response = await apiClient.updateSetting('autoUpdates', enabled);
        
        if (response.success) {
            showToast('Automatische Updates wurden aktualisiert', 'success');
        } else {
            showToast('Fehler beim Aktualisieren der automatischen Updates', 'error');
        }
    } catch (error) {
        console.error('Fehler beim Aktualisieren der automatischen Updates:', error);
        showToast('Fehler beim Aktualisieren der automatischen Updates', 'error');
    }
}

// Hilfsfunktion: Timeout formatieren
function formatTimeout(seconds) {
    if (seconds === 0) return 'Nie';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
        return `${hours} Stunde${hours > 1 ? 'n' : ''}`;
    } else {
        return `${minutes} Minute${minutes > 1 ? 'n' : ''}`;
    }
} 