// ============================================
// GESTION DES TÉLÉCHARGEMENTS
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    if (!isLoggedIn()) {
        window.location.href = 'index.html';
        return;
    }

    // Simulation de progression
    const progressBar = document.querySelector('.download-item.downloading .progress-fill');
    if (progressBar) {
        let progress = 67;
        const interval = setInterval(() => {
            progress += Math.random() * 5;
            if (progress >= 100) {
                progress = 100;
                clearInterval(interval);
                // Mettre à jour le statut
                const item = document.querySelector('.download-item.downloading');
                if (item) {
                    item.className = 'download-item completed';
                    item.querySelector('.download-overlay').innerHTML = '<i class="fas fa-check-circle"></i>';
                    item.querySelector('.progress-fill').style.width = '100%';
                }
            }
            progressBar.style.width = Math.min(progress, 100) + '%';
        }, 2000);
    }
});