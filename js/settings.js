import { getBaseUrl, proxyFetch, BASE_URL } from './utils.js';

// Check if we're in an iframe
const isIframe = window !== window.parent;

// Initialize settings listeners
function initializeSettings() {
    loadSettings(); // Load settings when initializing

    // Handle input changes for text and number inputs
    document.querySelectorAll('.settings-section input[type="text"], .settings-section input[type="number"]')
        .forEach(input => {
            input.addEventListener('change', handleSettingChange);
        });

    // Handle checkbox changes
    document.querySelectorAll('.settings-section input[type="checkbox"]')
        .forEach(checkbox => {
            checkbox.addEventListener('change', handleSettingChange);
        });

    // Handle select changes
    document.querySelectorAll('.settings-section select')
        .forEach(select => {
            select.addEventListener('change', handleSettingChange);
        });

    // Special handler for color correction
    const colorInputs = document.querySelector('.color-setting').querySelectorAll('input');
    colorInputs.forEach(input => {
        input.addEventListener('change', () => {
            const [r, g, b] = Array.from(colorInputs).map(input => parseInt(input.value));
            // Convert RGB to uint32_t
            const colorValue = (r << 16) | (g << 8) | b;
            updateSetting('C_CORRECTION', colorValue);
        });
    });

    // Special handler for color temperature
    const tempInputs = document.querySelectorAll('.color-setting')[1].querySelectorAll('input');
    tempInputs.forEach(input => {
        input.addEventListener('change', () => {
            const [r, g, b] = Array.from(tempInputs).map(input => parseInt(input.value));
            const colorValue = (r << 16) | (g << 8) | b;
            updateSetting('C_TEMPERATURE', colorValue);
        });
    });

    // Special handler for all color inputs
    document.querySelectorAll('input[type="color"]').forEach(input => {
        const toggleId = input.id + '_enabled';
        const toggle = document.getElementById(toggleId);

        // Handle toggle changes
        toggle?.addEventListener('change', (e) => {
            input.disabled = !e.target.checked;
            if (!e.target.checked) {
                updateSetting(input.id, 0); // Disable color (value 0)
            } else {
                // Send current color value when enabled
                const hex = input.value;
                const r = parseInt(hex.substr(1, 2), 16);
                const g = parseInt(hex.substr(3, 2), 16);
                const b = parseInt(hex.substr(5, 2), 16);
                const colorValue = (r << 16) | (g << 8) | b;
                updateSetting(input.id, colorValue);
            }
        });

        // Handle color changes (only when enabled)
        input.addEventListener('change', (e) => {
            if (!input.disabled) {
                const hex = e.target.value;
                const r = parseInt(hex.substr(1, 2), 16);
                const g = parseInt(hex.substr(3, 2), 16);
                const b = parseInt(hex.substr(5, 2), 16);
                const colorValue = (r << 16) | (g << 8) | b;
                updateSetting(e.target.id, colorValue);
            }
        });
    });

    // Handle static IP toggle
    const staticIpToggle = document.getElementById('NET_STATIC');
    const ipInputs = document.querySelectorAll('.ip-setting input');

    staticIpToggle?.addEventListener('change', (e) => {
        ipInputs.forEach(input => {
            input.disabled = !e.target.checked;
        });
    });
}

// Show or hide loading indicator
function showLoading(show = true) {
    const loader = document.getElementById('settings-loading');
    if (show) {
        loader.classList.add('active');
    } else {
        loader.classList.remove('active');
    }
}

// Update loadSettings to handle security correctly
async function loadSettings() {
    showLoading(true);
    try {
        const settings = await proxyFetch(`${BASE_URL}/api/system`);
        console.log('Received settings:', settings);
        populateSettings(settings);
    } catch (error) {
        console.error('Error loading settings:', error);
        showToast('Error loading settings', 'error');
    } finally {
        showLoading(false);
    }
}

// Populate all form elements with settings
function populateSettings(settings) {
    console.info("[DEBUG] Erhaltene Einstellungen:", settings);
    Object.entries(settings).forEach(([key, value]) => {
        const element = document.getElementById(key);
        if (!element) return;

        // Handle color inputs
        if (element.type === 'color' && typeof value === 'number') {
            const toggle = document.getElementById(key + '_enabled');
            if (value === 0) {
                // Color is disabled
                element.disabled = true;
                if (toggle) toggle.checked = false;
            } else {
                // Color is enabled, set the color value
                element.disabled = false;
                if (toggle) toggle.checked = true;
                const r = (value >> 16) & 0xFF;
                const g = (value >> 8) & 0xFF;
                const b = value & 0xFF;
                const hex = '#' + [r, g, b].map(x => {
                    const hex = x.toString(16);
                    return hex.length === 1 ? '0' + hex : hex;
                }).join('');
                element.value = hex;
            }
            return;
        }

        // Handle other inputs as before
        if (element.type === 'checkbox') {
            element.checked = value === true || value === "true";
        } else if (element.type === 'number' || element.type === 'text' || element.tagName === 'SELECT') {
            element.value = value ?? '';
        }
    });

    // Handle static IP fields
    if ('NET_STATIC' in settings) {
        const ipInputs = document.querySelectorAll('.ip-setting input');
        const isStatic = settings.NET_STATIC === true || settings.NET_STATIC === "true";
        ipInputs.forEach(input => {
            input.disabled = !isStatic;
        });
    }
}

// Handle setting changes
async function handleSettingChange(event) {
    const input = event.target;
    const id = input.id;
    let value;

    if (input.type === 'checkbox') {
        value = input.checked;
    } else if (input.type === 'number') {
        value = input.type === 'number' && input.step === '0.1' ?
            parseFloat(input.value) : parseInt(input.value);
    } else {
        value = input.value;
    }

    await updateSetting(id, value);
}

// Update updateSetting to handle proxied responses correctly
async function updateSetting(key, value) {
    try {
        const settingsData = {
            [key]: value
        };

        console.log('Sending setting update:', settingsData);

        const response = await proxyFetch(`${BASE_URL}/api/system`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(settingsData)
        });

        // Die Antwort wird wie im Dashboard behandelt
        if (response && response.success === true) {
            showToast('Setting saved', 'success');
        } else {
            showToast('Error saving setting', 'error');
        }

    } catch (error) {
        console.error('Error updating setting:', error);
        showToast('Error saving setting', 'error');
    }
}

initializeSettings();
