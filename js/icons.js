const BASE_URL = (() => {
    const espIp = localStorage.getItem('espIp') || '192.168.178.111';
    return `http://${espIp}`;
})();

const ICONS_PATH = '/ICONS';
let selectedIcon = null;
const renameBtn = document.querySelector('.rename-btn');
const deleteBtn = document.querySelector('.delete-btn');

// Check if we're in an iframe
const isIframe = window !== window.parent;

// Add proxyFetch function
function proxyFetch(url, options = {}) {
    const targetUrl = window !== window.parent ? url.replace(BASE_URL, '') : url;
    
    if (window === window.parent) {
        console.log('Direct request:', targetUrl);
        return fetch(targetUrl, options)
            .then(res => options.method === 'POST' ? { success: true } : res.json())
            .catch(err => {
                console.error('Direct fetch error:', err);
                throw err;
            });
    }

    return new Promise((resolve, reject) => {
        const messageId = Date.now().toString();
        
        const handler = (event) => {
            if (event.data.id !== messageId) return;
            
            window.removeEventListener('message', handler);
            
            if (event.data.success) {
                resolve(event.data.data);
            } else {
                reject(new Error(event.data.error));
            }
        };

        window.addEventListener('message', handler);

        const message = {
            id: messageId,
            url,
            method: options.method || 'GET',
            body: options.body
        };

        console.log('Sending postMessage:', message);
        window.parent.postMessage(message, '*');
    });
}

// Update loadIconsFromESP to use relative URLs in iframe
async function loadIconsFromESP() {
    try {
        // Use relative URL if in iframe
        const data = await proxyFetch(isIframe ? '/list?dir=/ICONS' : `${BASE_URL}/list?dir=${ICONS_PATH}`);
        const container = document.getElementById('esp-icon-grid');
        container.innerHTML = '';

        data.forEach(item => {
            if (item.type === "file") {
                const iconName = item.name;
                const item_div = document.createElement('div');
                item_div.className = 'icon-item';
                
                // Use relative path for image src in iframe
                const imgSrc = isIframe ? 
                    `${ICONS_PATH}/${iconName}` : 
                    `${BASE_URL}${ICONS_PATH}/${iconName}`;

                item_div.innerHTML = `
                    <div class="icon-preview">
                        <img src="${imgSrc}" alt="${iconName}" />
                    </div>
                    <div class="icon-info">
                        <span>${iconName}</span>
                    </div>
                `;

                item_div.addEventListener('click', () => {
                    document.querySelectorAll('.icon-item').forEach(i => i.classList.remove('selected'));
                    item_div.classList.add('selected');
                    selectedIcon = iconName;
                    renameBtn.disabled = false;
                    deleteBtn.disabled = false;
                });

                container.appendChild(item_div);
            }
        });
    } catch (error) {
        console.error('Error loading icons:', error);
        showToast('Error loading icons', 'error');
    }
}

// Update uploadIcon to use relative URL in iframe
async function uploadIcon(file) {
    const formData = new FormData();
    formData.append('file', file, ICONS_PATH + '/' + file.name);

    try {
        await proxyFetch(isIframe ? '/edit' : `${BASE_URL}/edit`, {
            method: 'POST',
            body: formData
        });

        showToast('Icon uploaded successfully', 'success');
        loadIconsFromESP();
    } catch (error) {
        showToast('Error uploading icon', 'error');
    }
}

// Update rename functionality
renameBtn.addEventListener('click', async () => {
    if (!selectedIcon) return;

    const newName = prompt('New name:', selectedIcon.split('.').slice(0, -1).join('.'));
    if (!newName) return;

    const newFileName = `${newName}.${selectedIcon.split('.').pop()}`;
    const oldPath = `${ICONS_PATH}/${selectedIcon}`;
    const newPath = `${ICONS_PATH}/${newFileName}`;

    try {
        await proxyFetch(`${BASE_URL}/edit`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `path=${encodeURIComponent(newPath)}&src=${encodeURIComponent(oldPath)}`
        });

        showToast('Icon renamed successfully', 'success');
        loadIconsFromESP();
    } catch (error) {
        showToast('Error renaming icon', 'error');
    }
});

// Update delete functionality
deleteBtn.addEventListener('click', async () => {
    if (!selectedIcon) return;

    if (!confirm(`Do you want to delete "${selectedIcon}"?`)) return;

    try {
        await proxyFetch(`${BASE_URL}/edit`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `path=${encodeURIComponent(ICONS_PATH + '/' + selectedIcon)}`
        });

        showToast('Icon deleted successfully', 'success');
        loadIconsFromESP();
        selectedIcon = null;
        renameBtn.disabled = true;
        deleteBtn.disabled = true;
    } catch (error) {
        showToast('Error deleting icon', 'error');
    }
});

document.querySelectorAll('.tab-btn').forEach(button => {
    button.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

        button.classList.add('active');
        document.getElementById(`${button.dataset.tab}-tab`).classList.add('active');
    });
});

document.getElementById('icon-upload').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!['image/gif', 'image/jpeg'].includes(file.type)) {
        showToast('Nur GIF oder JPG Dateien sind erlaubt', 'error');
        return;
    }

    const img = new Image();
    img.src = URL.createObjectURL(file);
    await img.decode();

    const validDimensions =
        (img.width === 8 && img.height === 8) ||
        (img.width === 32 && img.height === 8);

    if (!validDimensions) {
        showToast('Bild muss 8x8 oder 32x8 Pixel groß sein', 'error');
        return;
    }

    uploadIcon(file);
});

function createLametricLink() {
    const iconId = document.getElementById("lametric-iconID").value;
    const preview = document.createElement("img");
    
    // Entferne den onerror Handler vom Image Element
    preview.src = "https://developer.lametric.com/content/apps/icon_thumbs/" + iconId;
    
    const container = document.getElementById("icon-container");
    container.innerHTML = "";
    container.appendChild(preview);

    // Error handling über fetch
    fetch(preview.src)
        .then(response => {
            if (!response.ok) throw new Error('Icon nicht gefunden');
        })
        .catch(() => {
            container.innerHTML = ""; // Leere Container bei Fehler
            showToast('Diese Icon ID existiert nicht', 'error');
        });
}

async function downloadLametricImage() {
    const iconId = document.getElementById("lametric-iconID").value;

    try {
        const response = await fetch("https://developer.lametric.com/content/apps/icon_thumbs/" + iconId);
        const blob = await response.blob();
        let extension = "";

        const contentType = response.headers.get("content-type");

        if (contentType === "image/jpeg" || contentType === "image/png") {
            extension = ".jpg";
            const img = new Image();
            const objectUrl = URL.createObjectURL(blob);

            img.onload = function () {
                const canvas = document.createElement("canvas");
                canvas.width = img.width;
                canvas.height = img.height;
                canvas.getContext("2d").drawImage(img, 0, 0, img.width, img.height);

                canvas.toBlob((blob) => {
                    sendBlob(blob, iconId, extension);
                }, "image/jpeg", 1);

                URL.revokeObjectURL(objectUrl);
            };

            img.src = objectUrl;
        } else if (response.headers.get("content-type") === "image/gif") {
            extension = ".gif";
            sendBlob(blob, iconId, extension);
        }
    } catch (error) {
        console.log("Error");
        showToast('Diese Icon ID existiert nicht', 'error');
    }
}

// Update sendBlob to use proxyFetch and relative URLs
async function sendBlob(blob, iconId, extension) {
    const formData = new FormData();
    formData.append("upfile", blob, "ICONS/" + iconId + extension);

    try {
        await proxyFetch(isIframe ? '/edit' : `${BASE_URL}/edit`, {
            method: 'POST',
            body: formData
        });
        
        showToast('Icon erfolgreich gespeichert', 'success');
        loadIconsFromESP();
    } catch (error) {
        console.error(error);
        showToast(`Fehler beim Speichern des Icons: ${error.message}`, 'error');
    }
}

document.getElementById('preview-lametric')?.addEventListener('click', createLametricLink);
document.getElementById('import-lametric')?.addEventListener('click', downloadLametricImage);

// Modal Funktionalität
const uploadModal = document.getElementById('upload-modal');
const lametricModal = document.getElementById('lametric-modal');

document.getElementById('show-lametric')?.addEventListener('click', () => {
    lametricModal.classList.add('active');
});

document.querySelectorAll('.close-modal').forEach(btn => {
    btn.addEventListener('click', () => {
        uploadModal.classList.remove('active');
        lametricModal.classList.remove('active');
    });
});

// Entferne den doppelten Event Listener
document.getElementById('preview-lametric')?.addEventListener('click', () => {
    // Nur Import-Button aktivieren, createLametricLink wird bereits durch den anderen Listener aufgerufen
    document.getElementById('import-lametric').disabled = false;
});

// Schließen bei Klick außerhalb
window.addEventListener('click', (e) => {
    if (e.target === uploadModal || e.target === lametricModal) {
        uploadModal.classList.remove('active');
        lametricModal.classList.remove('active');
    }
});

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

loadIconsFromESP();