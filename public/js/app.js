// Importiere Module
import { ApiClient } from './modules/api.js';
import { showToast, showModal, initThemeToggle } from './modules/ui.js';

// Initialisiere API Client
const api = new ApiClient();

// Initialisiere Theme Toggle
initThemeToggle();

// Navigation
const initNavigation = () => {
    const navLinks = document.querySelectorAll('.nav-link');
    const currentPath = window.location.pathname;
    
    navLinks.forEach(link => {
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('active');
        }
        
        link.addEventListener('click', (e) => {
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
        });
    });
};

// Lade Seite
const loadPage = async (path) => {
    try {
        const response = await fetch(path);
        if (!response.ok) throw new Error('Seite konnte nicht geladen werden');
        
        const html = await response.text();
        document.querySelector('.app-content').innerHTML = html;
        
        // Initialisiere seitenspezifische Skripte
        const script = document.createElement('script');
        script.type = 'module';
        script.src = `/js/pages${path.replace('.html', '.js')}`;
        document.body.appendChild(script);
        
    } catch (error) {
        showToast(error.message, 'error');
    }
};

// Event Listener für Navigation
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    
    // Lade Dashboard als Startseite
    if (window.location.pathname === '/') {
        loadPage('/pages/dashboard.html');
    }
});

// Globale Fehlerbehandlung
window.addEventListener('error', (event) => {
    showToast('Ein unerwarteter Fehler ist aufgetreten', 'error');
    console.error(event.error);
});

// Offline-Erkennung
window.addEventListener('online', () => {
    showToast('Verbindung wiederhergestellt', 'success');
});

window.addEventListener('offline', () => {
    showToast('Verbindung verloren', 'error');
}); 