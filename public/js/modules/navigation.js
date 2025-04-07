import { loadPage } from '../app.js';

export function initNavigation() {
    // Menu toggle functionality
    const menuToggle = document.getElementById('menu-toggle');
    const overlay = document.getElementById('overlay');
    const sidebar = document.querySelector('.sidebar');
    
    menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
        menuToggle.setAttribute('aria-expanded', 
            sidebar.classList.contains('active'));
    });
    
    // Close menu when clicking overlay
    overlay.addEventListener('click', () => {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
        menuToggle.setAttribute('aria-expanded', 'false');
    });
    
    // Navigation item click handlers
    document.querySelectorAll('.nav-item').forEach(item => {
        if (item.dataset.page) {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                loadPage(item.dataset.page);
                
                // Close menu on mobile after navigation
                if (window.innerWidth < 768) {
                    sidebar.classList.remove('active');
                    overlay.classList.remove('active');
                    menuToggle.setAttribute('aria-expanded', 'false');
                }
            });
        }
    });
    
    // Nav group toggle functionality
    document.querySelectorAll('.nav-item-parent').forEach(parent => {
        parent.addEventListener('click', () => {
            const group = parent.closest('.nav-group');
            group.classList.toggle('expanded');
            
            // Update arrow rotation
            const arrow = parent.querySelector('.nav-arrow');
            arrow.style.transform = group.classList.contains('expanded') 
                ? 'rotate(180deg)' 
                : 'rotate(0)';
        });
    });
    
    // Handle keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && sidebar.classList.contains('active')) {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
            menuToggle.setAttribute('aria-expanded', 'false');
        }
    });
} 