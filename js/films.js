// ============================================
// GESTION DES FILMS (localStorage)
// ============================================

const FILMS_KEY = 'cinevault_films';

class FilmManager {
    constructor() {
        this.films = [];
    }

    async init() {
        // Essayer de charger depuis le localStorage
        const stored = localStorage.getItem(FILMS_KEY);
        if (stored) {
            this.films = JSON.parse(stored);
            return;
        }

        // Sinon charger depuis le fichier JSON local
        try {
            const response = await fetch('data/films.json');
            if (response.ok) {
                const data = await response.json();
                this.films = data.films || [];
                this.save();
            }
        } catch (error) {
            console.error('Erreur chargement films:', error);
            this.showError('Erreur de chargement des films. Utilisation des données locales.');
            this.films = [];
        }
    }

    showError(message) {
        let errorDiv = document.getElementById('filmsError');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.id = 'filmsError';
            errorDiv.style.cssText = `
                background: #FEE2E2;
                color: #DC2626;
                padding: 12px 20px;
                margin: 0 2rem 1rem 2rem;
                border-radius: 8px;
                font-size: 0.9rem;
                display: flex;
                align-items: center;
                gap: 8px;
            `;
            const filmsSection = document.querySelector('.films-section');
            if (filmsSection) {
                filmsSection.parentNode.insertBefore(errorDiv, filmsSection);
            }
        }
        errorDiv.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${message}`;
        errorDiv.style.display = 'flex';
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    }

    save() {
        localStorage.setItem(FILMS_KEY, JSON.stringify(this.films));
    }

    getAll() {
        return [...this.films];
    }

    getById(id) {
        return this.films.find(f => f.id === id);
    }

    search(query) {
        const term = query.toLowerCase();
        return this.films.filter(f =>
            f.title.toLowerCase().includes(term) ||
            f.genre.toLowerCase().includes(term) ||
            (f.director && f.director.toLowerCase().includes(term))
        );
    }

    filterByGenre(genre) {
        if (!genre || genre === 'Tous') return this.getAll();
        return this.films.filter(f => f.genre === genre);
    }

    add(filmData) {
        const film = {
            id: Date.now(),
            ...filmData,
            rating: parseFloat(filmData.rating) || 0,
            year: parseInt(filmData.year),
            cast: typeof filmData.cast === 'string'
                ? filmData.cast.split(',').map(s => s.trim()).filter(Boolean)
                : (filmData.cast || [])
        };
        this.films.push(film);
        this.save();
        return film;
    }

    update(id, filmData) {
        const index = this.films.findIndex(f => f.id === id);
        if (index !== -1) {
            this.films[index] = {
                ...this.films[index],
                ...filmData,
                id,
                rating: parseFloat(filmData.rating) || 0,
                year: parseInt(filmData.year),
                cast: typeof filmData.cast === 'string'
                    ? filmData.cast.split(',').map(s => s.trim()).filter(Boolean)
                    : (filmData.cast || this.films[index].cast)
            };
            this.save();
        }
    }

    delete(id) {
        this.films = this.films.filter(f => f.id !== id);
        this.save();
    }
}

const filmManager = new FilmManager();

// Variables globales pour les filtres et le hero
let currentType = 'all';
let currentGenre = null;
let currentHeroFilmId = null;
let heroInterval = null;

// Créer une carte de film
function createFilmCard(film, index) {
    return `
        <div class="film-card" onclick="openFilmModal(${film.id})" style="transition-delay: ${index * 0.05}s;">
            <div class="film-poster">
                <img src="${film.poster}" alt="${film.title}" loading="lazy"
                     onerror="this.src='https://via.placeholder.com/300x450?text=No+Image'">
                <div class="film-rating">
                    <i class="fas fa-star"></i> ${film.rating}
                </div>
                <div class="film-year-badge">${film.year}</div>
                <div class="film-play-btn" onclick="event.stopPropagation(); window.location.href='player.html?id=${film.id}'">
                    <i class="fas fa-play"></i>
                </div>
            </div>
            <div class="film-info">
                <h3>${film.title}</h3>
                <div class="film-meta">
                    <span>${film.genre}</span>
                    <span>${film.duration}</span>
                </div>
            </div>
        </div>
    `;
}

// Cacher le loader
function hideLoader() {
    const loader = document.getElementById('pageLoader');
    if (loader) {
        loader.style.opacity = '0';
        loader.style.visibility = 'hidden';
        setTimeout(() => {
            loader.remove();
        }, 400);
    }
}

// Animer les cartes
function animateCards() {
    const cards = document.querySelectorAll('.film-card');
    cards.forEach((card, index) => {
        setTimeout(() => {
            card.classList.add('visible');
        }, index * 50);
    });
}

// Filtrer les films selon le type et le genre
function getFilteredFilms() {
    let films = filmManager.getAll();

    if (currentType === 'film') {
        films = films.filter(f => f.type === 'film');
    } else if (currentType === 'serie') {
        films = films.filter(f => f.type === 'serie');
    }

    if (currentGenre) {
        films = films.filter(f => f.genre === currentGenre);
    }

    return films;
}

// Charger les films dans l'UI
async function loadFilmsToUI() {
    await filmManager.init();

    const films = getFilteredFilms();
    const grid = document.getElementById('filmsGrid');
    const count = document.getElementById('filmsCount');

    if (grid) {
        grid.innerHTML = films.length > 0
            ? films.map((film, i) => createFilmCard(film, i)).join('')
            : '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary);">Aucun film trouvé</p>';
    }

    if (count) {
        count.textContent = `${films.length} film${films.length > 1 ? 's' : ''}`;
    }

    hideLoader();
    setTimeout(() => {
        animateCards();
    }, 100);
}

// Recherche et affichage
function searchAndDisplay(query) {
    const heroSection = document.getElementById('heroSection');

    if (!query.trim()) {
        if (heroSection) heroSection.classList.remove('hidden');
        loadFilmsToUI();
        return;
    }

    if (heroSection) heroSection.classList.add('hidden');

    let results = filmManager.search(query);

    if (currentType === 'film') {
        results = results.filter(f => f.type === 'film');
    } else if (currentType === 'serie') {
        results = results.filter(f => f.type === 'serie');
    }
    if (currentGenre) {
        results = results.filter(f => f.genre === currentGenre);
    }

    const grid = document.getElementById('filmsGrid');
    const count = document.getElementById('filmsCount');

    if (grid) {
        grid.innerHTML = results.length > 0
            ? results.map((film, i) => createFilmCard(film, i)).join('')
            : '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); padding: 2rem;">Aucun film trouvé</p>';
        setTimeout(animateCards, 50);
    }

    if (count) {
        count.textContent = `${results.length} film${results.length > 1 ? 's' : ''}`;
    }
}

// Modal de détails
function openFilmModal(filmId) {
    const film = filmManager.getById(filmId);
    if (!film) return;

    const modal = document.getElementById('filmModal');
    const modalBody = modal.querySelector('.modal-body');
    const modalClose = modal.querySelector('.modal-close');
    const modalOverlay = modal.querySelector('.modal-overlay');

    modalBody.innerHTML = `
        <div style="display: flex; gap: 2rem;">
            <img src="${film.poster}" alt="${film.title}"
                 style="width: 250px; border-radius: 12px; object-fit: cover;"
                 onerror="this.src='https://via.placeholder.com/300x450?text=No+Image'">
            <div>
                <h2>${film.title}</h2>
                <div style="display: flex; gap: 1rem; margin: 1rem 0; color: var(--text-secondary);">
                    <span><i class="fas fa-star" style="color: #FFD700;"></i> ${film.rating}</span>
                    <span><i class="fas fa-clock"></i> ${film.duration}</span>
                    <span><i class="fas fa-calendar"></i> ${film.year}</span>
                    <span>${film.genre}</span>
                </div>
                <p style="margin-bottom: 1rem; line-height: 1.6;">${film.description || 'Aucune description disponible.'}</p>
                ${film.director ? `<p style="margin-bottom: 0.5rem;"><strong>Réalisateur:</strong> ${film.director}</p>` : ''}
                ${film.cast && film.cast.length > 0 ? `<p><strong>Casting:</strong> ${film.cast.join(', ')}</p>` : ''}
            </div>
        </div>
    `;

    modal.classList.add('active');

    const closeModal = () => modal.classList.remove('active');
    modalClose.onclick = closeModal;
    modalOverlay.onclick = closeModal;
}

// Scroll vers le film dans la grille
function scrollToFilm(filmId) {
    const cards = document.querySelectorAll('.film-card');
    let targetCard = null;

    cards.forEach(card => {
        if (card.onclick && card.onclick.toString().includes(`openFilmModal(${filmId})`)) {
            targetCard = card;
        }
    });

    if (targetCard) {
        targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        targetCard.style.boxShadow = '0 0 0 4px var(--primary)';
        targetCard.style.transform = 'scale(1.05)';
        setTimeout(() => {
            targetCard.style.boxShadow = '';
            targetCard.style.transform = '';
        }, 1500);
    }
}

// Hero aléatoire
function updateHero(film) {
    if (!film) return;

    currentHeroFilmId = film.id;

    const heroBg = document.getElementById('heroBg');
    const heroContent = document.getElementById('heroContent');

    heroContent.classList.remove('visible');

    const img = new Image();
    img.src = film.poster;
    img.onload = () => {
        heroBg.style.backgroundImage = `url('${film.poster}')`;
        heroBg.classList.add('active');

        document.getElementById('heroTitle').textContent = film.title;
        document.getElementById('heroDescription').textContent = film.description || '';
        document.getElementById('heroRating').textContent = film.rating;
        document.getElementById('heroDuration').textContent = film.duration;
        document.getElementById('heroYear').textContent = film.year;
        document.getElementById('heroGenre').textContent = film.genre;

        setTimeout(() => {
            heroContent.classList.add('visible');
        }, 200);
    };

    if (img.complete) {
        img.onload();
    }
}

function randomizeHero() {
    const films = filmManager.getAll();
    if (films.length === 0) return;
    const randomFilm = films[Math.floor(Math.random() * films.length)];
    updateHero(randomFilm);
}

function startHeroRotation(intervalMs = 8000) {
    stopHeroRotation();
    heroInterval = setInterval(randomizeHero, intervalMs);
}

function stopHeroRotation() {
    if (heroInterval) {
        clearInterval(heroInterval);
        heroInterval = null;
    }
}

// Initialisation
document.addEventListener('DOMContentLoaded', async () => {
    if (window.location.pathname.includes('home.html')) {
        if (!isLoggedIn()) {
            window.location.href = 'index.html';
            return;
        }

        const user = getCurrentUser();
        if (user && document.getElementById('userName')) {
            document.getElementById('userName').textContent = user.name;
        }

        // Charger les films
        await loadFilmsToUI();

        // Initialiser le hero
        randomizeHero();
        startHeroRotation(8000);

        // Recherche
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                searchAndDisplay(e.target.value);
            });
        }

        // Catégories principales
        document.querySelectorAll('#mainCategories .category-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                document.querySelectorAll('#mainCategories .category-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                currentType = btn.dataset.type;
                currentGenre = null;

                const subSection = document.getElementById('subCategoriesSection');
                if (currentType === 'all') {
                    subSection.style.display = 'none';
                } else {
                    subSection.style.display = 'block';
                    document.querySelectorAll('#subCategories .category-btn').forEach(b => b.classList.remove('active'));
                    document.querySelector('#subCategories .category-btn[data-genre="all"]').classList.add('active');
                }

                document.getElementById('searchInput').value = '';
                const heroSection = document.getElementById('heroSection');
                if (heroSection) heroSection.classList.remove('hidden');

                await loadFilmsToUI();
            });
        });

        // Sous-catégories
        document.querySelectorAll('#subCategories .category-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                document.querySelectorAll('#subCategories .category-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                currentGenre = btn.dataset.genre === 'all' ? null : btn.dataset.genre;

                document.getElementById('searchInput').value = '';
                const heroSection = document.getElementById('heroSection');
                if (heroSection) heroSection.classList.remove('hidden');

                await loadFilmsToUI();
            });
        });
    }
});