// UI Components and Utilities
export function initUI() {
    initToasts();
    initModals();
    initForms();
    initButtons();
}

// Toast Notifications
function initToasts() {
    const toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);

    window.showToast = (message, type = 'info', duration = 3000) => {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        toastContainer.appendChild(toast);
        
        // Trigger animation
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });
        
        // Remove toast after duration
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    };
}

// Modal Dialogs
function initModals() {
    window.showModal = (options) => {
        const {
            title,
            content,
            confirmText = 'OK',
            cancelText = 'Cancel',
            onConfirm,
            onCancel
        } = options;

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>${title}</h2>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary modal-cancel">${cancelText}</button>
                    <button class="btn btn-primary modal-confirm">${confirmText}</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        
        // Show modal with animation
        requestAnimationFrame(() => {
            modal.classList.add('show');
        });

        // Event handlers
        const closeModal = () => {
            modal.classList.remove('show');
            setTimeout(() => modal.remove(), 300);
        };

        modal.querySelector('.modal-close').addEventListener('click', closeModal);
        modal.querySelector('.modal-cancel').addEventListener('click', () => {
            closeModal();
            if (onCancel) onCancel();
        });
        modal.querySelector('.modal-confirm').addEventListener('click', () => {
            closeModal();
            if (onConfirm) onConfirm();
        });

        // Close on escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                closeModal();
                if (onCancel) onCancel();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
    };
}

// Form Handling
function initForms() {
    document.addEventListener('submit', async (e) => {
        const form = e.target;
        if (!form.classList.contains('ajax-form')) return;

        e.preventDefault();

        const submitButton = form.querySelector('[type="submit"]');
        const originalText = submitButton.textContent;
        submitButton.disabled = true;
        submitButton.textContent = 'Loading...';

        try {
            const formData = new FormData(form);
            const response = await fetch(form.action, {
                method: form.method,
                body: formData
            });

            if (!response.ok) throw new Error('Form submission failed');

            const result = await response.json();
            
            if (result.success) {
                showToast('Operation successful', 'success');
                if (form.dataset.redirect) {
                    window.location.href = form.dataset.redirect;
                }
            } else {
                showToast(result.error || 'Operation failed', 'error');
            }
        } catch (error) {
            showToast('An error occurred', 'error');
            console.error('Form submission error:', error);
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = originalText;
        }
    });
}

// Button Loading States
function initButtons() {
    document.addEventListener('click', async (e) => {
        const button = e.target.closest('.btn-loading');
        if (!button) return;

        const originalText = button.textContent;
        button.disabled = true;
        button.textContent = 'Loading...';

        try {
            // Wait for the click handler to complete
            await new Promise(resolve => setTimeout(resolve, 100));
        } finally {
            button.disabled = false;
            button.textContent = originalText;
        }
    });
}

// Export utility functions
export {
    showToast,
    showModal
};

// Toast Benachrichtigungen
export function showToast(message, type = 'info') {
    // Toast Container erstellen falls nicht vorhanden
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
    }
    
    // Toast Element erstellen
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    // Icon basierend auf Typ
    const icon = document.createElement('i');
    icon.className = 'fa-solid';
    switch (type) {
        case 'success':
            icon.classList.add('fa-circle-check');
            break;
        case 'error':
            icon.classList.add('fa-circle-xmark');
            break;
        case 'warning':
            icon.classList.add('fa-triangle-exclamation');
            break;
        default:
            icon.classList.add('fa-circle-info');
    }
    
    // Nachricht
    const messageElement = document.createElement('span');
    messageElement.textContent = message;
    
    // Schließen Button
    const closeButton = document.createElement('button');
    closeButton.className = 'toast-close';
    closeButton.innerHTML = '<i class="fa-solid fa-xmark"></i>';
    closeButton.addEventListener('click', () => {
        toast.classList.add('toast-hide');
        setTimeout(() => {
            toastContainer.removeChild(toast);
            if (toastContainer.children.length === 0) {
                document.body.removeChild(toastContainer);
            }
        }, 300);
    });
    
    // Elemente zusammenfügen
    toast.appendChild(icon);
    toast.appendChild(messageElement);
    toast.appendChild(closeButton);
    toastContainer.appendChild(toast);
    
    // Animation
    setTimeout(() => {
        toast.classList.add('toast-show');
    }, 10);
    
    // Automatisch ausblenden nach 5 Sekunden
    setTimeout(() => {
        if (toast.parentElement) {
            toast.classList.add('toast-hide');
            setTimeout(() => {
                if (toast.parentElement) {
                    toastContainer.removeChild(toast);
                    if (toastContainer.children.length === 0) {
                        document.body.removeChild(toastContainer);
                    }
                }
            }, 300);
        }
    }, 5000);
}

// Modal Dialog
export function showModal(options) {
    const {
        title = '',
        content = '',
        confirmText = 'Bestätigen',
        cancelText = 'Abbrechen',
        onConfirm = () => {},
        onCancel = () => {}
    } = options;
    
    // Modal Container
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    
    // Modal Content
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    
    // Header
    const header = document.createElement('div');
    header.className = 'modal-header';
    
    const titleElement = document.createElement('h3');
    titleElement.className = 'modal-title';
    titleElement.textContent = title;
    
    const closeButton = document.createElement('button');
    closeButton.className = 'modal-close';
    closeButton.innerHTML = '<i class="fa-solid fa-xmark"></i>';
    closeButton.addEventListener('click', () => {
        closeModal(modal);
        onCancel();
    });
    
    header.appendChild(titleElement);
    header.appendChild(closeButton);
    
    // Body
    const body = document.createElement('div');
    body.className = 'modal-body';
    
    // Content kann String oder HTMLElement sein
    if (typeof content === 'string') {
        body.innerHTML = content;
    } else {
        body.appendChild(content);
    }
    
    // Footer
    const footer = document.createElement('div');
    footer.className = 'modal-footer';
    
    const cancelButton = document.createElement('button');
    cancelButton.className = 'btn btn-secondary';
    cancelButton.textContent = cancelText;
    cancelButton.addEventListener('click', () => {
        closeModal(modal);
        onCancel();
    });
    
    const confirmButton = document.createElement('button');
    confirmButton.className = 'btn btn-primary';
    confirmButton.textContent = confirmText;
    confirmButton.addEventListener('click', () => {
        closeModal(modal);
        onConfirm();
    });
    
    footer.appendChild(cancelButton);
    footer.appendChild(confirmButton);
    
    // Alles zusammenfügen
    modalContent.appendChild(header);
    modalContent.appendChild(body);
    modalContent.appendChild(footer);
    modal.appendChild(modalContent);
    
    // Modal zum DOM hinzufügen
    document.body.appendChild(modal);
    
    // Animation
    setTimeout(() => {
        modal.classList.add('modal-show');
    }, 10);
    
    // ESC Taste zum Schließen
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            closeModal(modal);
            onCancel();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
    
    // Klick außerhalb zum Schließen
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal(modal);
            onCancel();
        }
    });
    
    return modal;
}

// Modal schließen
function closeModal(modal) {
    modal.classList.remove('modal-show');
    modal.classList.add('modal-hide');
    
    setTimeout(() => {
        if (modal.parentElement) {
            document.body.removeChild(modal);
        }
    }, 300);
}

// Theme Toggle
export function initThemeToggle() {
    const themeToggle = document.getElementById('theme-toggle');
    if (!themeToggle) return;
    
    // Theme aus localStorage laden oder System-Präferenz verwenden
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
    } else if (systemPrefersDark) {
        document.documentElement.setAttribute('data-theme', 'dark');
    }
    
    // Icon aktualisieren
    updateThemeIcon();
    
    // Click Handler
    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        
        updateThemeIcon();
    });
    
    // System Theme Änderungen überwachen
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem('theme')) {
            document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
            updateThemeIcon();
        }
    });
}

// Theme Icon aktualisieren
function updateThemeIcon() {
    const themeToggle = document.getElementById('theme-toggle');
    if (!themeToggle) return;
    
    const icon = themeToggle.querySelector('i');
    const currentTheme = document.documentElement.getAttribute('data-theme');
    
    if (currentTheme === 'dark') {
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
    } else {
        icon.classList.remove('fa-sun');
        icon.classList.add('fa-moon');
    }
} 