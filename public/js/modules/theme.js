// Theme Configuration
const THEME_CONFIG = {
    defaultTheme: 'light',
    themes: {
        light: {
            '--bg-primary': '#ffffff',
            '--bg-secondary': '#f5f5f5',
            '--text-primary': '#333333',
            '--text-secondary': '#666666',
            '--accent-color': '#2196F3',
            '--border-color': '#e0e0e0',
            '--shadow-color': 'rgba(0, 0, 0, 0.1)'
        },
        dark: {
            '--bg-primary': '#1a1a1a',
            '--bg-secondary': '#2d2d2d',
            '--text-primary': '#ffffff',
            '--text-secondary': '#b3b3b3',
            '--accent-color': '#64B5F6',
            '--border-color': '#404040',
            '--shadow-color': 'rgba(0, 0, 0, 0.3)'
        }
    }
};

// Theme Manager
class ThemeManager {
    constructor(config = THEME_CONFIG) {
        this.config = config;
        this.currentTheme = localStorage.getItem('theme') || config.defaultTheme;
        this.init();
    }

    init() {
        // Apply saved theme
        this.applyTheme(this.currentTheme);

        // Add theme toggle button to header
        this.addThemeToggle();

        // Listen for system theme changes
        this.watchSystemTheme();
    }

    applyTheme(themeName) {
        const theme = this.config.themes[themeName];
        if (!theme) return;

        Object.entries(theme).forEach(([property, value]) => {
            document.documentElement.style.setProperty(property, value);
        });

        // Update meta theme-color
        document.querySelector('meta[name="theme-color"]')
            .setAttribute('content', theme['--bg-primary']);

        // Update current theme
        this.currentTheme = themeName;
        localStorage.setItem('theme', themeName);

        // Dispatch theme change event
        window.dispatchEvent(new CustomEvent('themechange', { 
            detail: { theme: themeName } 
        }));
    }

    addThemeToggle() {
        const header = document.querySelector('.header');
        if (!header) return;

        const toggle = document.createElement('button');
        toggle.className = 'theme-toggle';
        toggle.setAttribute('aria-label', 'Theme umschalten');
        toggle.innerHTML = `
            <i class="fa-solid fa-sun light-icon"></i>
            <i class="fa-solid fa-moon dark-icon"></i>
        `;

        toggle.addEventListener('click', () => {
            const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
            this.applyTheme(newTheme);
        });

        header.appendChild(toggle);
    }

    watchSystemTheme() {
        // Check if user prefers dark mode
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
        
        // Update theme when system preference changes
        prefersDark.addEventListener('change', (e) => {
            if (!localStorage.getItem('theme')) {
                this.applyTheme(e.matches ? 'dark' : 'light');
            }
        });

        // Initial check
        if (!localStorage.getItem('theme')) {
            this.applyTheme(prefersDark.matches ? 'dark' : 'light');
        }
    }
}

// Initialize theme manager
let themeManager;

export function initTheme() {
    themeManager = new ThemeManager();
}

export { themeManager }; 