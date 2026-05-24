// ============================================
// ADMINISTRATION
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    // Vérifier l'accès admin
    if (!isAdmin()) {
        const password = prompt('Mot de passe administrateur :');
        if (password === 'jtt@123400') {
            setCurrentUser({
                id: 'admin',
                name: 'Administrateur',
                email: 'admin@cinevault.com',
                isAdmin: true
            });
        } else {
            alert('Accès refusé');
            window.location.href = 'index.html';
            return;
        }
    }

    await filmManager.init();
    loadFilmsTable();
    loadStats();
    loadUsersTable();

    // Navigation sidebar
    document.querySelectorAll('.sidebar-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.sidebar-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const section = btn.dataset.section;
            document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
            document.getElementById(section + 'Section').classList.add('active');
        });
    });
});

function loadFilmsTable() {
    const films = filmManager.getAll();
    const table = document.getElementById('filmsTable');
    
    table.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Poster</th>
                    <th>Titre</th>
                    <th>Genre</th>
                    <th>Année</th>
                    <th>Note</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${films.map(f => `
                    <tr>
                        <td>${f.id}</td>
                        <td><img src="${f.poster}" width="40" height="60" style="object-fit: cover; border-radius: 4px;" onerror="this.src='https://via.placeholder.com/40x60'"></td>
                        <td><strong>${f.title}</strong></td>
                        <td>${f.genre}</td>
                        <td>${f.year}</td>
                        <td>⭐ ${f.rating}</td>
                        <td>
                            <div class="table-actions">
                                <button class="btn-icon" onclick="editFilm(${f.id})" title="Modifier">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn-icon" onclick="deleteFilm(${f.id})" title="Supprimer">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function loadUsersTable() {
    const users = auth.getAllUsers();
    const table = document.getElementById('usersTable');
    
    table.innerHTML = users.length > 0 ? `
        <table>
            <thead>
                <tr>
                    <th>Nom</th>
                    <th>Email</th>
                    <th>Date d'inscription</th>
                </tr>
            </thead>
            <tbody>
                ${users.map(u => `
                    <tr>
                        <td>${u.name}</td>
                        <td>${u.email}</td>
                        <td>${new Date(u.createdAt).toLocaleDateString()}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    ` : '<p style="color: var(--text-secondary);">Aucun utilisateur inscrit.</p>';
}

function loadStats() {
    const stats = filmManager.getStats();
    const users = auth.getAllUsers();
    
    document.getElementById('totalFilms').textContent = stats.total;
    document.getElementById('totalUsers').textContent = users.length;
    document.getElementById('totalDownloads').textContent = Math.floor(Math.random() * 50);
}

function showAddFilmForm() {
    document.getElementById('modalTitle').textContent = 'Ajouter un film';
    document.getElementById('filmId').value = '';
    document.getElementById('filmForm').reset();
    document.getElementById('adminModal').classList.add('active');
}

function editFilm(id) {
    const film = filmManager.getById(id);
    if (!film) return;
    
    document.getElementById('modalTitle').textContent = 'Modifier le film';
    document.getElementById('filmId').value = film.id;
    document.getElementById('filmTitle').value = film.title;
    document.getElementById('filmGenre').value = film.genre;
    document.getElementById('filmYear').value = film.year;
    document.getElementById('filmDuration').value = film.duration;
    document.getElementById('filmRating').value = film.rating;
    document.getElementById('filmPoster').value = film.poster;
    document.getElementById('filmDirector').value = film.director || '';
    document.getElementById('filmDescription').value = film.description || '';
    document.getElementById('filmCast').value = (film.cast || []).join(', ');
    
    document.getElementById('adminModal').classList.add('active');
}

function deleteFilm(id) {
    if (confirm('Supprimer ce film ?')) {
        filmManager.delete(id);
        loadFilmsTable();
        loadStats();
    }
}

function closeAdminModal() {
    document.getElementById('adminModal').classList.remove('active');
}

function handleFilmSubmit(e) {
    e.preventDefault();
    
    const id = document.getElementById('filmId').value;
    const data = {
        title: document.getElementById('filmTitle').value,
        genre: document.getElementById('filmGenre').value,
        year: document.getElementById('filmYear').value,
        duration: document.getElementById('filmDuration').value,
        rating: document.getElementById('filmRating').value,
        poster: document.getElementById('filmPoster').value,
        director: document.getElementById('filmDirector').value,
        description: document.getElementById('filmDescription').value,
        cast: document.getElementById('filmCast').value
    };
    
    if (id) {
        filmManager.update(parseInt(id), data);
    } else {
        filmManager.add(data);
    }
    
    closeAdminModal();
    loadFilmsTable();
    loadStats();
}