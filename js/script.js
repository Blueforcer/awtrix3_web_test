// Add service worker registration code at the beginning of the file
async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            const basePath = '/awtrix3_web_test';
            const registration = await navigator.serviceWorker.register(`${basePath}/sw.js`, {
                scope: basePath
            });
            
            // Get the ESP IP from localStorage or use a default
            const espIp = localStorage.getItem('espIpAddress') || '192.168.178.111';
            
            await navigator.serviceWorker.ready;
            
            if (registration.active) {
                registration.active.postMessage({
                    type: 'SET_ESP_IP',
                    ip: espIp
                });
            }
        } catch (error) {
            console.error('ServiceWorker registration failed:', error);
        }
    }
}

// Call the registration function
registerServiceWorker();

// Sidebar und Menü-Toggle
const menuToggle = document.getElementById("menu-toggle");
const sidebar = document.querySelector(".sidebar");
const overlay = document.createElement('div');
overlay.classList.add('overlay');
document.body.appendChild(overlay);

// Sidebar-Interaktionen
menuToggle?.addEventListener('click', () => {
    sidebar?.classList.toggle('hidden');
    overlay.classList.toggle('active');
});

overlay.addEventListener('click', () => {
    sidebar?.classList.add('hidden');
    overlay.classList.remove('active');
});

// Navigation und Seitenwechsel
document.querySelectorAll('.nav-item').forEach(nav => {
    nav.addEventListener('click', async (e) => {
        e.preventDefault();
        document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
        nav.classList.add('active');

        const page = nav.getAttribute('data-page');
        await loadPage(page); // Dynamische Seite laden
    });
});

// Add handler for nav groups
document.querySelectorAll('.nav-item-parent').forEach(item => {
    item.addEventListener('click', () => {
        const group = item.closest('.nav-group');
        group.classList.toggle('open');
    });
});

// Dynamische Seiten laden
async function loadPage(pageId) {
    try {
        // Special handling for creator page
        if (pageId === 'creator') {
            const content = document.getElementById('content');
            if (content) {
                content.innerHTML = `
                    <iframe 
                        src="piskel/index.html" 
                        style="width: 100%; height: 100vh; border: none;"
                        allowfullscreen>
                    </iframe>`;
                return;
            }
        }

        // Normal page loading for all other pages
        const response = await fetch(`pages/${pageId}.html`);
        if (!response.ok) throw new Error(`Fehler beim Laden der Seite: ${pageId}`);
        const html = await response.text();

        const content = document.getElementById('content');
        if (content) {
            content.innerHTML = html;
            // Dynamisches Skript laden
            const script = document.createElement('script');
            script.src = `js/${pageId}.js`;
            script.type = 'module';
            // Event erst dispatchen, wenn das Skript geladen ist
            script.onload = () => {
                document.dispatchEvent(new CustomEvent('awtrixPageChange', {
                    detail: { pageId }
                }));
            };
            document.body.appendChild(script);
        } else {
            console.error('Content-Container (#content) nicht gefunden.');
        }
                // Dynamisches Skript laden
                const script = document.createElement('script');
                script.src = `js/${pageId}.js`; // Stelle sicher, dass das Skript für die Seite existiert
                script.type = 'module'; // Füge dies hinzu, wenn das Skript ein Modul ist
                document.body.appendChild(script);
                console.log(script.src);
        
    } catch (error) {
        console.error('Fehler beim Laden der Seite:', error);
    }
}

// Toast Notification System
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = type === 'success' ? 'fa-check-circle' : 
                 type === 'error' ? 'fa-exclamation-circle' : 
                 'fa-info-circle';
    
    toast.innerHTML = `
        <i class="fas ${icon}"></i>
        <span>${message}</span>
    `;
    
    const container = document.getElementById('toast-container');
    container.appendChild(toast);
    
    // Automatisches Entfernen nach 3 Sekunden
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Update the BASE_URL to use the relative path
const BASE_URL = '/api';  // This will be intercepted by the service worker

// Standardseite beim Start laden
(async () => {
    const defaultPage = 'dashboard'; // Setze hier die Standardseite
    await loadPage(defaultPage);
    document.querySelector(`.nav-item[data-page="${defaultPage}"]`)?.classList.add('active');
})();

