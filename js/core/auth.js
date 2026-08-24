// ================================
// SISTEMA DE AUTENTICACIÓN — Supabase
// Roles: superadmin | operador
// ================================

const _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Estado global ───────────────────────────────────────────────────────────
let currentUser = null;

// ── Rate limiting para login (en memoria) ───────────────────────────────────
const _loginAttempts = {};
const _MAX_LOGIN_ATTEMPTS = 5;
const _LOCKOUT_MS         = 15 * 60 * 1000;

// ── Inicialización ──────────────────────────────────────────────────────────
async function initAuth() {
    const { data: { session } } = await _supabase.auth.getSession();
    if (session) {
        await _loadUserProfile(session.user);
    } else {
        showLogin();
    }
}

// ── Login ───────────────────────────────────────────────────────────────────
async function doLogin(event) {
    event.preventDefault();
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errorEl  = document.getElementById('loginError');
    const btn      = document.querySelector('.login-btn');

    const showError = () => {
        errorEl.textContent = '❌ Usuario o contraseña incorrectos';
        errorEl.style.display = 'block';
        document.getElementById('loginPassword').value = '';
        document.getElementById('loginCard').classList.add('shake');
        setTimeout(() => document.getElementById('loginCard').classList.remove('shake'), 500);
        btn.disabled    = false;
        btn.textContent = 'Iniciar sesión';
    };

    const attempt = _loginAttempts[username] || { count: 0, lockedUntil: 0 };
    if (attempt.lockedUntil > Date.now()) {
        const mins = Math.ceil((attempt.lockedUntil - Date.now()) / 60000);
        errorEl.textContent = `🔒 Demasiados intentos. Espera ${mins} minuto(s).`;
        errorEl.style.display = 'block';
        return;
    }

    btn.disabled    = true;
    btn.textContent = 'Verificando...';

    const { data: emailData, error: emailError } = await _supabase
        .rpc('get_email_by_username', { p_username: username });

    if (emailError || !emailData) {
        const cur = _loginAttempts[username] || { count: 0, lockedUntil: 0 };
        cur.count += 1;
        cur.lockedUntil = cur.count >= _MAX_LOGIN_ATTEMPTS ? Date.now() + _LOCKOUT_MS : 0;
        _loginAttempts[username] = cur;
        showError();
        return;
    }

    const { data, error } = await _supabase.auth.signInWithPassword({ email: emailData, password });

    if (error || !data.user) {
        const cur = _loginAttempts[username] || { count: 0, lockedUntil: 0 };
        cur.count += 1;
        cur.lockedUntil = cur.count >= _MAX_LOGIN_ATTEMPTS ? Date.now() + _LOCKOUT_MS : 0;
        _loginAttempts[username] = cur;
        showError();
        return;
    }

    delete _loginAttempts[username];
    errorEl.style.display = 'none';
    btn.disabled    = false;
    btn.textContent = 'Iniciar sesión';
    await _loadUserProfile(data.user);
}

// ── Cargar perfil ────────────────────────────────────────────────────────────
async function _loadUserProfile(authUser) {
    const { data: profile, error } = await _supabase
        .from('profiles')
        .select('role, nombre, username')
        .eq('id', authUser.id)
        .single();

    if (error || !profile) {
        await _supabase.auth.signOut();
        showLogin();
        alert('No se encontró un perfil asociado. Contacta al administrador.');
        return;
    }

    currentUser = {
        username: profile.username || authUser.email,
        role:     profile.role,
        nombre:   profile.nombre
    };
    showApp();
}

// ── Logout ──────────────────────────────────────────────────────────────────
async function doLogout() {
    if (!confirm('¿Cerrar sesión?')) return;
    await _supabase.auth.signOut();
    currentUser = null;
    sessionStorage.clear();
    localStorage.removeItem('sb-' + new URL(SUPABASE_URL).hostname.split('.')[0] + '-auth-token');
    showLogin();
}

// ── Mostrar / ocultar pantallas ─────────────────────────────────────────────
function showLogin() {
    document.getElementById('loginScreen').style.display   = 'flex';
    document.getElementById('userInfoBar').style.display   = 'none';
    document.getElementById('appContainer').style.display  = 'none';
    document.getElementById('loginUsername').value         = '';
    document.getElementById('loginPassword').value         = '';
    document.getElementById('loginError').style.display    = 'none';
}

function showApp() {
    document.getElementById('loginScreen').style.display   = 'none';
    document.getElementById('userInfoBar').style.display   = 'flex';
    document.getElementById('appContainer').style.display  = 'block';

    const roleIcon  = currentUser.role === 'superadmin'
        ? '<i data-lucide="shield-check" style="width:14px;height:14px;vertical-align:middle;margin-right:3px;"></i>'
        : '<i data-lucide="eye" style="width:14px;height:14px;vertical-align:middle;margin-right:3px;"></i>';
    const roleName  = currentUser.role === 'superadmin' ? 'Super Admin' : 'Operador';
    const roleColor = currentUser.role === 'superadmin' ? '#10b981' : '#3b82f6';

    document.getElementById('userInfoBar').innerHTML = `
        <div class="topbar-user">
            <span class="topbar-role-badge" style="background:${roleColor};">${roleIcon}${escapeHTML(roleName)}</span>
            <span class="topbar-nombre">${escapeHTML(currentUser.nombre)}</span>
        </div>
        <div class="topbar-actions">
            <button id="themeToggle" class="topbar-theme-btn" onclick="toggleTheme()" title="Modo claro / oscuro"><i data-lucide="moon" style="width:16px;height:16px;vertical-align:middle;"></i></button>
            <button id="logoutBtn" class="topbar-logout-btn" onclick="doLogout()"><i data-lucide="log-out" style="width:14px;height:14px;vertical-align:middle;margin-right:4px;"></i> Cerrar sesi\u00f3n</button>
        </div>
    `;
    _syncThemeIcon();
    refreshIcons();

    applyRoleRestrictions();

    if (typeof loadData === 'function') loadData();
}

// ── Restricciones por rol ───────────────────────────────────────────────────
function applyRoleRestrictions() {
    if (!currentUser) return;

    if (currentUser.role === 'operador') {
        const style = document.createElement('style');
        style.id = 'operador-restrictions';
        style.textContent = `
            .btn-primary:not(.allow-operador):not(#logoutBtn):not(.topbar-logout-btn):not(.topbar-theme-btn),
            .btn-danger:not(#logoutBtn):not(.topbar-logout-btn),
            .btn-warning:not(.allow-operador):not(.carta-responsiva):not(.topbar-logout-btn),
            .btn-success:not(.allow-operador):not(#logoutBtn):not(.topbar-logout-btn),
            .backup-controls .btn-info { display: none !important; }

            #fileInput { display: none !important; }

            .section-header::after {
                content: '👁️ Solo lectura';
                font-size: 0.75em;
                background: #dbeafe;
                color: #1e40af;
                padding: 4px 10px;
                border-radius: 20px;
                font-weight: 600;
                margin-left: 10px;
            }
        `;
        document.head.appendChild(style);

        const exportBtn = document.querySelector('.backup-controls .btn-success');
        if (exportBtn) exportBtn.style.display = 'inline-flex';

        patchModalsForOperador();
    }
}

function patchModalsForOperador() {
    const originalOpenModal = window.openModal;
    window.openModal = function(modalId) {
        const blockedModals = [
            'modalColaborador', 'modalEquipo', 'modalCelular',
            'modalAsignacion',  'modalLicencia', 'modalAsignarUsuarios',
            'modalAsignacionCelular', 'modalAgendarMantenimiento',
            'modalCompletarMantenimiento'
        ];
        if (blockedModals.includes(modalId)) {
            showNotification('🔒 No tienes permisos para realizar esta acción', 'error');
            return;
        }
        originalOpenModal(modalId);
    };

    const blockFn = (name) => {
        window[name] = function() {
            showNotification('🔒 No tienes permisos para realizar esta acción', 'error');
        };
    };

    [
        'deleteColaborador', 'deleteEquipo', 'deleteCelular', 'deleteLicencia',
        'devolverEquipo',    'devolverCelular',
        'abrirAsignarCelular', 'abrirNuevaAsignacion', 'abrirAsignarUsuarios',
        'saveColaborador',   'saveEquipo',   'saveCelular',
        'saveAsignacion',    'saveLicencia', 'saveAsignacionCelular',
        'guardarAsignacionesLicencia', 'guardarCitaMantenimiento',
        'confirmarMantenimientoCompletado'
        // descargarCartaResponsiva NO está bloqueada — el operador puede descargar PDFs
    ].forEach(blockFn);
}

// ── Helpers públicos ────────────────────────────────────────────────────────
function isSuperAdmin() { return currentUser && currentUser.role === 'superadmin'; }
function isOperador()   { return currentUser && currentUser.role === 'operador'; }

// ── Theme toggle ────────────────────────────────────────────────────────────
function toggleTheme() {
    const isLight = document.body.classList.toggle('light-mode');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    _syncThemeIcon();
}

function _syncThemeIcon() {
    const btn = document.getElementById('themeToggle');
    if (!btn) return;
    const isLight = document.body.classList.contains('light-mode');
    btn.innerHTML = isLight
        ? '<i data-lucide="sun" style="width:16px;height:16px;vertical-align:middle;"></i>'
        : '<i data-lucide="moon" style="width:16px;height:16px;vertical-align:middle;"></i>';
    btn.title = isLight ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro';
    refreshIcons();
}

// Aplicar tema guardado al cargar
(function _applyStoredTheme() {
    if (localStorage.getItem('theme') === 'light') {
        document.body.classList.add('light-mode');
    }
})();
