// ============================================
// GESTION DU THÈME
// ============================================

function initTheme() {
    const saved = localStorage.getItem('cinevault_theme') || 'light';
    applyTheme(saved);
}

function applyTheme(theme) {
    document.body.setAttribute('data-theme', theme);
    updateThemeIcon(theme);
}

function toggleTheme() {
    const current = document.body.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    
    applyTheme(next);
    localStorage.setItem('cinevault_theme', next);
    
    // Mettre à jour le toggle dans les paramètres
    const darkToggle = document.getElementById('darkModeToggle');
    if (darkToggle) {
        darkToggle.checked = next === 'dark';
    }
}

function updateThemeIcon(theme) {
    const icons = document.querySelectorAll('#themeIcon');
    icons.forEach(icon => {
        icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    });
}

function changeFontSize(delta) {
    const html = document.documentElement;
    const current = parseFloat(getComputedStyle(html).fontSize);
    const next = Math.max(12, Math.min(24, current + delta));
    
    html.style.fontSize = next + 'px';
    localStorage.setItem('cinevault_font_size', next);
    
    const display = document.getElementById('fontSizeDisplay');
    if (display) {
        display.textContent = Math.round((next / 16) * 100) + '%';
    }
}

function loadFontSize() {
    const saved = localStorage.getItem('cinevault_font_size');
    if (saved) {
        document.documentElement.style.fontSize = saved + 'px';
        const display = document.getElementById('fontSizeDisplay');
        if (display) {
            display.textContent = Math.round((parseFloat(saved) / 16) * 100) + '%';
        }
    }
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    loadFontSize();
    
    // Mettre à jour le toggle dans les paramètres
    const darkToggle = document.getElementById('darkModeToggle');
    if (darkToggle) {
        darkToggle.checked = document.body.getAttribute('data-theme') === 'dark';
    }
});