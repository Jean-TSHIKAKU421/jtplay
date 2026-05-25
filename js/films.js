// ============================================
// GESTION DES FILMS (API + localStorage fallback)
// ============================================

// Gestion du scroll
const header = document.querySelector('.header');
const searchBarMobile = document.getElementById('searchBarMobile');
const scrollToTopBtn = document.getElementById('scrollToTopBtn');
let lastScrollY = window.scrollY;

function onScroll() {
    const currentScrollY = window.scrollY;

    // Bouton retour en haut
    if (currentScrollY > 300) {
        scrollToTopBtn.classList.add('visible');
    } else {
        scrollToTopBtn.classList.remove('visible');
    }

    // Sur mobile : masquer le header et afficher la barre de recherche mobile
    if (window.innerWidth <= 768) {
        if (currentScrollY > 100) {
            // On cache le header
            header.classList.add('hide-header');
            // On affiche la barre de recherche mobile
            searchBarMobile.classList.add('visible');
        } else {
            // On est tout en haut : on réaffiche le header et on cache la barre mobile
            header.classList.remove('hide-header');
            searchBarMobile.classList.remove('visible');
        }
    }

    lastScrollY = currentScrollY;
}

window.addEventListener('scroll', onScroll, { passive: true });

// Synchroniser les deux champs de recherche
const mainSearch = document.getElementById('searchInput');
const mobileSearch = document.getElementById('searchInputMobile');
if (mainSearch && mobileSearch) {
    mainSearch.addEventListener('input', (e) => {
        mobileSearch.value = e.target.value;
        searchAndDisplay(e.target.value);
    });
    mobileSearch.addEventListener('input', (e) => {
        mainSearch.value = e.target.value;
        searchAndDisplay(e.target.value);
    });
}

// Bouton retour en haut
scrollToTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

const FILMS_KEY = 'cinevault_films';
let currentType = 'all';
let currentGenre = null;
let currentSort = 'date';   // 'date', 'name', 'rating'
let currentHeroFilmId = null;
let heroInterval = null;

class FilmManager {
    constructor() {
        this.films = [];
    }

    // Initialisation : charge depuis l'API, puis fallback localStorage
    async init() {
        try {
            const response = await fetch('/api/films');
            if (response.ok) {
                const data = await response.json();
                this.films = data.films || [];
                this.saveLocal();
                console.log('✅ Films chargés depuis API');
            } else {
                throw new Error('API error');
            }
        } catch (error) {
            console.warn('⚠️ Fallback localStorage pour films');
            this.loadLocal();
        }
    }

    loadLocal() {
        const stored = localStorage.getItem(FILMS_KEY);
        this.films = stored ? JSON.parse(stored) : [];
    }

    saveLocal() {
        localStorage.setItem(FILMS_KEY, JSON.stringify(this.films));
    }

    // Sauvegarde sur l'API et en local
    async save() {
        this.saveLocal();
        try {
            await fetch('/api/films', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ films: this.films })
            });
            console.log('💾 Films sauvegardés sur le serveur');
        } catch (error) {
            console.error('Erreur sauvegarde films sur le serveur', error);
        }
    }

    // Remet les IDs de 1 à N après suppression
    reindexIds() {
        this.films.forEach((film, index) => {
            film.id = index + 1;
        });
    }

    // Générer un ID séquentiel (max + 1)
    getNextId() {
        return this.films.length + 1;
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

    // Ajout d'un film avec ID auto
    async add(filmData) {
        const film = {
            id: this.getNextId(),
            ...filmData,
            rating: parseFloat(filmData.rating) || 0,
            year: parseInt(filmData.year),
            cast: typeof filmData.cast === 'string'
                ? filmData.cast.split(',').map(s => s.trim()).filter(Boolean)
                : (filmData.cast || [])
        };
        this.films.push(film);
        await this.save();
        return film;
    }

    // Mise à jour d'un film existant
    async update(id, filmData) {
        const index = this.films.findIndex(f => f.id === id);
        if (index !== -1) {
            this.films[index] = {
                ...this.films[index],
                ...filmData,
                id: id,
                rating: parseFloat(filmData.rating) || 0,
                year: parseInt(filmData.year),
                cast: typeof filmData.cast === 'string'
                    ? filmData.cast.split(',').map(s => s.trim()).filter(Boolean)
                    : (filmData.cast || this.films[index].cast)
            };
            await this.save();
        }
    }

    // Suppression d'un film
    async delete(id) {
        this.films = this.films.filter(f => f.id !== id);
        this.reindexIds();   // On ré-indexe automatiquement
        await this.save();
    }

    async addEpisode(serieId, episodeData) {
        const serie = this.films.find(f => f.id === serieId);
        if (!serie) return null;
        if (!serie.episodes) serie.episodes = [];
        serie.episodes.push(episodeData);
        await this.save();
        return episodeData;
    }

    async updateEpisode(serieId, episodeIndex, episodeData) {
        const serie = this.films.find(f => f.id === serieId);
        if (!serie || !serie.episodes) return null;
        if (episodeIndex >= 0 && episodeIndex < serie.episodes.length) {
            serie.episodes[episodeIndex] = episodeData;
            await this.save();
            return episodeData;
        }
        return null;
    }

    async deleteEpisode(serieId, episodeIndex) {
        const serie = this.films.find(f => f.id === serieId);
        if (!serie || !serie.episodes) return false;
        if (episodeIndex >= 0 && episodeIndex < serie.episodes.length) {
            serie.episodes.splice(episodeIndex, 1);
            await this.save();
            return true;
        }
        return false;
    }
}

const filmManager = new FilmManager();

// ================ TRI ================
function applySort(films) {
    const sorted = [...films];
    switch (currentSort) {
        case 'name':
            sorted.sort((a, b) => a.title.localeCompare(b.title, 'fr', { sensitivity: 'base' }));
            break;
        case 'rating':
            sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
            break;
        case 'date':
        default:
            sorted.sort((a, b) => (b.year || 0) - (a.year || 0));
            break;
    }
    return sorted;
}

// ================ INTERFACE UTILISATEUR ================

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
        setTimeout(() => loader.remove(), 400);
    }
}

// Animer les cartes une par une
function animateCards() {
    const cards = document.querySelectorAll('.film-card');
    cards.forEach((card, i) => {
        setTimeout(() => card.classList.add('visible'), i * 50);
    });
}

// Récupère les films filtrés et triés
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

    // Appliquer le tri
    films = applySort(films);

    return films;
}

// Charge les films dans la grille
async function loadFilmsToUI() {
    await filmManager.init();
    // Sécurité : cacher le loader après 5 secondes max
    setTimeout(hideLoader, 5000);

    const films = getFilteredFilms();
    const grid = document.getElementById('filmsGrid');
    const count = document.getElementById('filmsCount');

    if (grid) {
        grid.innerHTML = films.length > 0
            ? films.map((f, i) => createFilmCard(f, i)).join('')
            : '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary);">Aucun film trouvé</p>';
    }
    if (count) count.textContent = `${films.length} film${films.length > 1 ? 's' : ''}`;

    hideLoader();
    setTimeout(animateCards, 100);
}

// Recherche + filtres + tri
function searchAndDisplay(query) {
    const heroSection = document.getElementById('heroSection');
    if (!query.trim()) {
        if (heroSection) heroSection.classList.remove('hidden');
        loadFilmsToUI();
        return;
    }
    if (heroSection) heroSection.classList.add('hidden');

    let results = filmManager.search(query);

    if (currentType === 'film') results = results.filter(f => f.type === 'film');
    else if (currentType === 'serie') results = results.filter(f => f.type === 'serie');
    if (currentGenre) results = results.filter(f => f.genre === currentGenre);

    // Appliquer le tri
    results = applySort(results);

    const grid = document.getElementById('filmsGrid');
    const count = document.getElementById('filmsCount');
    if (grid) {
        grid.innerHTML = results.length > 0
            ? results.map((f, i) => createFilmCard(f, i)).join('')
            : '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); padding: 2rem;">Aucun film trouvé</p>';
        setTimeout(animateCards, 50);
    }
    if (count) count.textContent = `${results.length} film${results.length > 1 ? 's' : ''}`;
}

// Modal de détails d'un film
function openFilmModal(filmId) {
    const film = filmManager.getById(filmId);
    if (!film) return;

    const modal = document.getElementById('filmModal');
    modal.querySelector('.modal-body').innerHTML = `
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
    modal.querySelector('.modal-close').onclick = () => modal.classList.remove('active');
    modal.querySelector('.modal-overlay').onclick = () => modal.classList.remove('active');
}

// Faire défiler jusqu'à la carte du film
function scrollToFilm(filmId) {
    const cards = document.querySelectorAll('.film-card');
    let target = null;
    cards.forEach(c => {
        if (c.onclick && c.onclick.toString().includes(`openFilmModal(${filmId})`)) target = c;
    });
    if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        target.style.boxShadow = '0 0 0 4px var(--primary)';
        target.style.transform = 'scale(1.05)';
        setTimeout(() => {
            target.style.boxShadow = '';
            target.style.transform = '';
        }, 1500);
    }
}

// ===================== HERO (rotation aléatoire) =====================
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
        setTimeout(() => heroContent.classList.add('visible'), 200);
    };
    if (img.complete) img.onload();
}

function randomizeHero() {
    const films = filmManager.getAll();
    if (films.length > 0) updateHero(films[Math.floor(Math.random() * films.length)]);
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

// ===================== INITIALISATION =====================
document.addEventListener('DOMContentLoaded', async () => {
    // Vérifier qu'on est sur home.html
    if (!window.location.pathname.includes('home.html')) return;
    if (!isLoggedIn()) {
        window.location.href = 'index.html';
        return;
    }

    const user = getCurrentUser();
    if (user) document.getElementById('userName').textContent = user.name;

    // Charger les films et afficher
    await loadFilmsToUI();

    // Hero aléatoire
    randomizeHero();
    startHeroRotation(8000);

    // Recherche
    document.getElementById('searchInput').addEventListener('input', e => searchAndDisplay(e.target.value));

    // Catégories principales
    document.querySelectorAll('#mainCategories .category-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            document.querySelectorAll('#mainCategories .category-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentType = btn.dataset.type;
            currentGenre = null;
            const sub = document.getElementById('subCategoriesSection');
            if (currentType === 'all') sub.style.display = 'none';
            else {
                sub.style.display = 'block';
                document.querySelectorAll('#subCategories .category-btn').forEach(b => b.classList.remove('active'));
                document.querySelector('#subCategories .category-btn[data-genre="all"]').classList.add('active');
            }
            document.getElementById('searchInput').value = '';
            document.getElementById('heroSection').classList.remove('hidden');
            await loadFilmsToUI();
        });
    });

    // Sous-catégories (genres)
    document.querySelectorAll('#subCategories .category-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            document.querySelectorAll('#subCategories .category-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentGenre = btn.dataset.genre === 'all' ? null : btn.dataset.genre;
            document.getElementById('searchInput').value = '';
            document.getElementById('heroSection').classList.remove('hidden');
            await loadFilmsToUI();
        });
    });

    // Bouton Trie
    const sortBtn = document.getElementById('sortBtn');
    const sortDropdown = document.getElementById('sortDropdown');
    const sortOptions = document.querySelectorAll('.sort-option');

    sortBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        sortDropdown.classList.toggle('show');
    });

    document.addEventListener('click', () => {
        sortDropdown.classList.remove('show');
    });

    sortDropdown.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    sortOptions.forEach(option => {
        option.addEventListener('click', async () => {
            sortOptions.forEach(opt => opt.classList.remove('active'));
            option.classList.add('active');
            currentSort = option.dataset.sort;
            sortDropdown.classList.remove('show');

            const searchInput = document.getElementById('searchInput');
            if (searchInput && searchInput.value.trim()) {
                searchAndDisplay(searchInput.value);
            } else {
                await loadFilmsToUI();
            }
        });
    });
});