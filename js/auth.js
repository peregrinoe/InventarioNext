// ================================
// SISTEMA DE AUTENTICACIÓN
// Roles: superadmin | operador
// ================================

const USERS = [
    { username: 'admin',    password: 'Admin2024!',    role: 'superadmin', nombre: 'Super Administrador' },
    { username: 'operador', password: 'Operador2024!', role: 'operador',   nombre: 'Operador'            }
];

let currentUser = null;

// ── Inicialización ──────────────────────────────────────────────────────────
function initAuth() {
    const saved = sessionStorage.getItem('inventario_session');
    if (saved) {
        try {
            currentUser = JSON.parse(saved);
            showApp();
            return;
        } catch(e) { sessionStorage.removeItem('inventario_session'); }
    }
    showLogin();
}

// ── Login / Logout ──────────────────────────────────────────────────────────
function doLogin(event) {
    event.preventDefault();
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errorEl = document.getElementById('loginError');

    const user = USERS.find(u => u.username === username && u.password === password);
    if (!user) {
        errorEl.textContent = '❌ Usuario o contraseña incorrectos';
        errorEl.style.display = 'block';
        document.getElementById('loginPassword').value = '';
        // shake animation
        document.getElementById('loginCard').classList.add('shake');
        setTimeout(() => document.getElementById('loginCard').classList.remove('shake'), 500);
        return;
    }

    currentUser = { username: user.username, role: user.role, nombre: user.nombre };
    sessionStorage.setItem('inventario_session', JSON.stringify(currentUser));
    errorEl.style.display = 'none';
    showApp();
}

function doLogout() {
    if (!confirm('¿Cerrar sesión?')) return;
    currentUser = null;
    sessionStorage.removeItem('inventario_session');
    showLogin();
}

// ── Mostrar / ocultar pantallas ─────────────────────────────────────────────
function showLogin() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('userInfoBar').style.display = 'none';
    document.getElementById('appContainer').style.display = 'none';
    document.getElementById('loginUsername').value = '';
    document.getElementById('loginPassword').value = '';
    document.getElementById('loginError').style.display = 'none';
}

function showApp() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('userInfoBar').style.display = 'flex';
    document.getElementById('appContainer').style.display = 'block';

    // Mostrar nombre e ícono de rol en el header
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
        <button onclick="doLogout()" style="background:#f1f5f9;border:1px solid #e2e8f0;color:#64748b;padding:6px 14px;border-radius:8px;cursor:pointer;font-size:0.85em;transition:all 0.2s;" onmouseover="this.style.background='#fee2e2';this.style.color='#dc2626'" onmouseout="this.style.background='#f1f5f9';this.style.color='#64748b'">
            🚪 Cerrar sesión
        </button>
    `;

    applyRoleRestrictions();

    // Cargar datos después de mostrar la app
    if (typeof loadData === 'function') loadData();
}

// ── Aplicar restricciones por rol ───────────────────────────────────────────
function applyRoleRestrictions() {
    if (!currentUser) return;

    if (currentUser.role === 'operador') {
        // Ocultar todos los botones de acción (crear, editar, eliminar, asignar, devolver)
        const style = document.createElement('style');
        style.id = 'operador-restrictions';
        style.textContent = `
            /* Ocultar botones de alta y edición */
            .btn-primary:not(.allow-operador),
            .btn-danger,
            .btn-warning:not(.allow-operador),
            .btn-success:not(.allow-operador),
            .backup-controls .btn-info { display: none !important; }

            /* Ocultar controles de importar */
            #fileInput { display: none !important; }

            /* Badge visual de solo lectura */
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

        // Exportar datos sí está permitido - reactivar solo ese botón
        const exportBtn = document.querySelector('.backup-controls .btn-success');
        if (exportBtn) exportBtn.style.display = 'inline-flex';

        // Deshabilitar apertura de modales de creación/edición
        patchModalsForOperador();
    }
}

// Parchea openModal para que operador no pueda abrir modales de escritura
function patchModalsForOperador() {
    const originalOpenModal = window.openModal;
    window.openModal = function(modalId) {
        const readonlyModals = [
            'modalDetalleColaborador', 'modalDetalleEquipo',
            'modalDetalleCelular',     'modalDetalleLicencia'
        ];
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

    // Bloquear también funciones de acción directa
    const blockFn = (name) => {
        window[name] = function() {
            showNotification('🔒 No tienes permisos para realizar esta acción', 'error');
        };
    };

    [   'deleteColaborador', 'deleteEquipo', 'deleteCelular', 'deleteLicencia',
        'devolverEquipo',    'devolverCelular',
        'abrirAsignarCelular', 'abrirNuevaAsignacion', 'abrirAsignarUsuarios',
        'saveColaborador',   'saveEquipo',   'saveCelular',
        'saveAsignacion',    'saveLicencia', 'saveAsignacionCelular',
        'guardarAsignacionesLicencia', 'guardarCitaMantenimiento',
        'confirmarMantenimientoCompletado'
    ].forEach(blockFn);
}

// ── Helper público ──────────────────────────────────────────────────────────
function isSuperAdmin() {
    return currentUser && currentUser.role === 'superadmin';
}

function isOperador() {
    return currentUser && currentUser.role === 'operador';
}
