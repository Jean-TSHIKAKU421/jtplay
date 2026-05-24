// ============================================
// AUTHENTIFICATION
// ============================================

const AUTH_KEY = 'cinevault_current_user';
const USERS_KEY = 'cinevault_users';
const ADMIN_PASSWORD = 'jtt@123400';

class AuthManager {
    constructor() {
        this.loadUsers();
    }

    loadUsers() {
        const stored = localStorage.getItem(USERS_KEY);
        this.users = stored ? JSON.parse(stored) : [];
    }

    saveUsers() {
        localStorage.setItem(USERS_KEY, JSON.stringify(this.users));
    }

    findUser(email) {
        return this.users.find(u => u.email === email);
    }

    register(name, email, password) {
        if (this.findUser(email)) {
            throw new Error('Cet email est déjà utilisé');
        }

        const user = {
            id: Date.now().toString(),
            name,
            email,
            password,
            createdAt: new Date().toISOString(),
            isAdmin: false
        };

        this.users.push(user);
        this.saveUsers();
        return user;
    }

    login(email, password) {
        // Vérifier admin
        if (password === ADMIN_PASSWORD) {
            return {
                id: 'admin',
                name: 'Administrateur',
                email: email || 'admin@cinevault.com',
                isAdmin: true
            };
        }

        const user = this.findUser(email);
        if (!user || user.password !== password) {
            throw new Error('Email ou mot de passe incorrect');
        }

        return user;
    }

    getAllUsers() {
        return [...this.users];
    }
}

const auth = new AuthManager();

// Fonctions globales
function setCurrentUser(user) {
    sessionStorage.setItem(AUTH_KEY, JSON.stringify(user));
}

function getCurrentUser() {
    const data = sessionStorage.getItem(AUTH_KEY);
    return data ? JSON.parse(data) : null;
}

function isLoggedIn() {
    return getCurrentUser() !== null;
}

function isAdmin() {
    const user = getCurrentUser();
    return user && user.isAdmin;
}

function logout() {
    sessionStorage.removeItem(AUTH_KEY);
    window.location.href = 'index.html';
}

// Vérifier l'authentification (sauf sur index.html et admin.html)
const currentPage = window.location.pathname.split('/').pop();
if (currentPage !== 'index.html' && currentPage !== 'admin.html' && currentPage !== '') {
    if (!isLoggedIn()) {
        window.location.href = 'index.html';
    }
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    // Gestion des tabs
    document.querySelectorAll('.switch-tab').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const tab = link.dataset.tab;
            switchAuthTab(tab);
        });
    });

    // Gestion des tabs de l'auth card
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            switchAuthTab(tabName);
        });
    });

    // Gestion de la visibilité du mot de passe
    document.querySelectorAll('.toggle-password').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.dataset.target;
            const input = document.getElementById(targetId);
            const icon = btn.querySelector('i');
            
            if (input.type === 'password') {
                input.type = 'text';
                icon.className = 'fas fa-eye-slash';
            } else {
                input.type = 'password';
                icon.className = 'fas fa-eye';
            }
        });
    });

    // Gestion du formulaire de connexion
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Gestion du formulaire d'inscription
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
});

function switchAuthTab(tab) {
    document.querySelectorAll('.auth-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.tab === tab);
    });
    document.querySelectorAll('.auth-form').forEach(f => {
        f.classList.toggle('active', f.id === (tab === 'login' ? 'loginForm' : 'registerForm'));
    });
    hideAlerts();
}

function hideAlerts() {
    document.querySelectorAll('.alert').forEach(a => {
        a.style.display = 'none';
        a.textContent = '';
    });
}

function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errorDiv = document.getElementById('loginError');

    try {
        const user = auth.login(email, password);
        setCurrentUser(user);
        
        if (user.isAdmin) {
            window.location.href = 'admin.html';
        } else {
            window.location.href = 'home.html';
        }
    } catch (error) {
        errorDiv.textContent = error.message;
        errorDiv.style.display = 'block';
    }
}

function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const errorDiv = document.getElementById('registerError');
    const successDiv = document.getElementById('registerSuccess');

    hideAlerts();

    if (password.length < 6) {
        errorDiv.textContent = 'Le mot de passe doit contenir au moins 6 caractères';
        errorDiv.style.display = 'block';
        return;
    }

    try {
        auth.register(name, email, password);
        successDiv.textContent = '✅ Compte créé avec succès ! Vous pouvez vous connecter.';
        successDiv.style.display = 'block';
        
        document.getElementById('registerForm').reset();
        
        setTimeout(() => {
            switchAuthTab('login');
            document.getElementById('loginEmail').value = email;
        }, 2000);
    } catch (error) {
        errorDiv.textContent = error.message;
        errorDiv.style.display = 'block';
    }
}