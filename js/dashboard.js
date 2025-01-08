// Canvas initialisieren
const c = document.getElementById('c');
let d, w = 1052, h = 260, e, f = false, g = performance.now();

if (c) {
    d = c.getContext('2d');
    c.width = w;
    c.height = h;
}

// Fetch und Canvas-Rendering-Funktion
function j() {
    fetch("http://192.168.20.210/api/screen")
        .then(response => response.json())
        .then(data => {
            if (!d) return; // Canvas nicht verfügbar
            d.clearRect(0, 0, c.width, c.height);
            for (let b = 0; b < 8; b++) {
                for (let i = 0; i < 32; i++) {
                    const k = data[b * 32 + i];
                    const l = (k & 0xff0000) >> 16;
                    const m = (k & 0x00ff00) >> 8;
                    const n = k & 0x0000ff;
                    d.fillStyle = `rgb(${l},${m},${n})`;
                    d.fillRect(i * 33, b * 33, 29, 29);
                }
            }
            if (f) {
                const o = performance.now();
                const p = Math.round(o - g);
                g = o;
                const q = d.getImageData(0, 0, w, h).data;
                // Implementiere quantize und applyPalette
            }
            j(); // Rekursion für kontinuierliches Update
        })
        .catch(error => console.error("Error fetching screen data:", error));
}

// Event-Listener für Buttons
document.getElementById("downloadpng")?.addEventListener("click", () => {
    const a = document.createElement("a");
    a.href = c?.toDataURL();
    a.download = 'awtrix.png';
    a.click();
});

document.getElementById("nextapp")?.addEventListener("click", () => {
    const a = new XMLHttpRequest();
    a.open("POST", "http://192.168.20.210/api/nextapp", true);
    a.send();
});

document.getElementById("previousapp")?.addEventListener("click", () => {
    const a = new XMLHttpRequest();
    a.open("POST", "http://192.168.20.210/api/previousapp", true);
    a.send();
});

document.getElementById("startgif")?.addEventListener("click", async function () {
    const a = this;
    if (f) {
        e.finish();
        const b = e.bytesView();
        l(b, 'awtrix.gif', 'image/gif');
        f = false;
        a.textContent = "Start GIF recording";
    } else {
        e = GIFEncoder();
        g = performance.now();
        f = true;
        a.textContent = "Stop GIF recording";
    }
});

function l(b, a, c) {
    const d = b instanceof Blob ? b : new Blob([b], { type: c });
    const e = URL.createObjectURL(d);
    const f = document.createElement("a");
    f.href = e;
    f.download = a;
    f.click();
}

function formatUptime(seconds) {
    const days = Math.floor(seconds / (24 * 60 * 60));
    const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((seconds % (60 * 60)) / 60);
    const secs = seconds % 60;

    return `${days}d ${hours}h ${minutes}m ${secs}s`;
}


async function fetchAndDisplayStats() {
    try {
        // Hole die Daten von /api/stats
        const response = await fetch('http://192.168.20.210/api/stats');
        if (!response.ok) throw new Error('Fehler beim Laden der Statistiken');
        
        const stats = await response.json();
        const formattedUptime = formatUptime(stats.uptime);
        // Zeige die Daten im entsprechenden Bereich an
        const statsContainer = document.getElementById('stats');
        statsContainer.innerHTML = `
            <div class="stat-card">RAM<br><span> ${stats.ram} KB</span></div>
            <div class="stat-card">Flash<br><span>${stats.flash} </span></div>
            <div class="stat-card">Uptime<br><span>${formattedUptime}</span></div>
            <div class="stat-card">Messages<br><span>${stats.messages}</span></div>
        `;
         
        
    } catch (error) {
        console.error('Fehler beim Abrufen der Statistiken:', error);
    }
}
// Initialisiere das Dashboard
async function initializeDashboard() {
    
    await fetchAndDisplayStats();
}

// Rufe die Initialisierung des Dashboards auf, wenn die Seite geladen wird
initializeDashboard();
// Initialisierung
j(); // Startet das Rendern der Canvas-Daten