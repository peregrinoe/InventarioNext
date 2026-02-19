// ================================
// SISTEMA DE AUTENTICACIÓN — Supabase
// Roles: superadmin | operador
// ================================
// NOTA: SUPABASE_URL y SUPABASE_KEY están definidas en database.js (carga primero).
// auth.js las reutiliza para no duplicar constantes y evitar el error 42710.

const _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Estado global ───────────────────────────────────────────────────────────
let currentUser = null;   // { username, role, nombre }

// ── Inicialización ──────────────────────────────────────────────────────────
async function initAuth() {
    // Verificar si ya hay una sesión activa (token en localStorage de Supabase)
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

    btn.disabled    = true;
    btn.textContent = 'Verificando...';

    // PASO 1: Buscar el email real según el username en la tabla profiles.
    // Necesitamos una política pública solo para esta consulta de lookup.
    // Usamos una función RPC (ver supabase_setup.sql) para evitar exponer datos.
    const { data: emailData, error: emailError } = await _supabase
        .rpc('get_email_by_username', { p_username: username });

    if (emailError || !emailData) {
        showError();
        return;
    }

    const email = emailData;  // email real del usuario

    // PASO 2: Autenticar con el email real y la contraseña
    const { data, error } = await _supabase.auth.signInWithPassword({ email, password });

    if (error || !data.user) {
        showError();
        return;
    }

    errorEl.style.display = 'none';
    btn.disabled    = false;
    btn.textContent = 'Iniciar sesión';
    await _loadUserProfile(data.user);
}

// ── Cargar perfil desde la tabla `profiles` ─────────────────────────────────
async function _loadUserProfile(authUser) {
    const { data: profile, error } = await _supabase
        .from('profiles')
        .select('role, nombre, username')
        .eq('id', authUser.id)
        .single();

    if (error || !profile) {
        // Si no encuentra perfil, cerrar sesión y mostrar error
        await _supabase.auth.signOut();
        showLogin();
        alert('No se encontró un perfil asociado a este usuario. Contacta al administrador.');
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

    const roleIcon  = currentUser.role === 'superadmin' ? '🛡️' : '👁️';
    const roleName  = currentUser.role === 'superadmin' ? 'Super Admin' : 'Operador';
    const roleColor = currentUser.role === 'superadmin' ? '#10b981' : '#3b82f6';

    document.getElementById('userInfoBar').innerHTML = `
        <span style="display:flex;align-items:center;gap:8px;">
            <span style="background:${roleColor};color:white;padding:4px 12px;border-radius:20px;font-size:0.8em;font-weight:700;">
                ${roleIcon} ${roleName}
            </span>
            <span style="color:#64748b;font-size:0.9em;">${currentUser.nombre}</span>
        </span>
        <button onclick="doLogout()"
            style="background:#f1f5f9;border:1px solid #e2e8f0;color:#64748b;padding:6px 14px;border-radius:8px;cursor:pointer;font-size:0.85em;transition:all 0.2s;"
            onmouseover="this.style.background='#fee2e2';this.style.color='#dc2626'"
            onmouseout="this.style.background='#f1f5f9';this.style.color='#64748b'">
            🚪 Cerrar sesión
        </button>
    `;

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
            .btn-primary:not(.allow-operador),
            .btn-danger,
            .btn-warning:not(.allow-operador):not(.carta-responsiva),
            .btn-success:not(.allow-operador),
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
