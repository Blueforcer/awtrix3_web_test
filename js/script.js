
// Sidebar Animation & Overlay
const sidebar = document.querySelector('.sidebar');
const overlay = document.getElementById('overlay');

function toggleSidebar(show) {
    if (show) {
        sidebar.classList.remove('hidden');
        overlay.classList.add('active');
    } else {
        sidebar.classList.add('hidden');
        overlay.classList.remove('active');
    }
}

overlay.addEventListener('click', () => toggleSidebar(false));


// Navigation und Seitenwechsel mit Animation

document.querySelectorAll('.nav-item[data-page]').forEach(nav => {
    nav.addEventListener('click', async (e) => {
        e.preventDefault();
        document.querySelectorAll('.nav-item[data-page]').forEach(item => item.classList.remove('active'));
        nav.classList.add('active');
        toggleSidebar(false);
        const page = nav.getAttribute('data-page');
        await loadPage(page);
    });
});


// Keine nav-group mehr nötig, Navigation ist flach


// Dynamische Seiten laden mit Animation
async function loadPage(pageId) {
    const pageContent = document.getElementById('page-content');
    if (!pageContent) return;
    pageContent.classList.remove('animate__fadeIn');
    void pageContent.offsetWidth; // Reflow for animation
    pageContent.classList.add('animate__fadeIn');
    try {
        if (pageId === 'icons') {
            const res = await fetch('pages/icons.html');
            pageContent.innerHTML = await res.text();
        } else if (pageId === 'dashboard') {
            const res = await fetch('pages/dashboard.html');
            pageContent.innerHTML = await res.text();
        } else if (pageId === 'network') {
            const res = await fetch('pages/network.html');
            pageContent.innerHTML = await res.text();
        } else if (pageId === 'wifi') {
            const res = await fetch('pages/wifi.html');
            pageContent.innerHTML = await res.text();
        } else if (pageId === 'mqtt') {
            const res = await fetch('pages/mqtt.html');
            pageContent.innerHTML = await res.text();
        } else if (pageId === 'settings') {
            const res = await fetch('pages/settings.html');
            pageContent.innerHTML = await res.text();
        } else if (pageId === 'time') {
            const res = await fetch('pages/time.html');
            pageContent.innerHTML = await res.text();
        } else if (pageId === 'creator') {
            pageContent.innerHTML = `<iframe src="piskel/index.html" style="width:100%;height:80vh;border:none;" allowfullscreen></iframe>`;
        } else {
            pageContent.innerHTML = `<div class="card">Seite nicht gefunden.</div>`;
        }
    } catch (err) {
        pageContent.innerHTML = `<div class="card text-danger">Fehler beim Laden der Seite.</div>`;
    }
}




// Initiale Seite laden

window.addEventListener('DOMContentLoaded', () => {
    loadPage('dashboard');
    document.querySelector('.nav-item[data-page="dashboard"]')?.classList.add('active');
});

