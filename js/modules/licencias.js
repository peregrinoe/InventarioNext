// LICENCIAS
async function saveLicencia(event) {
    event.preventDefault();
    
    const id = document.getElementById('licenciaId').value;
    
    const licencia = {
        _id: id || 'LIC' + Date.now(),
        software: document.getElementById('licenciaSoftware').value,
        tipo: document.getElementById('licenciaTipo').value,
        clave: document.getElementById('licenciaClave').value,
        fechaCompra: document.getElementById('licenciaFechaCompra').value,
        fechaVencimiento: document.getElementById('licenciaFechaVencimiento').value,
        estado: document.getElementById('licenciaEstado').value,
        notas: document.getElementById('licenciaNotas').value,
        createdAt: id ? database.licencias.find(l => l._id === id).createdAt : new Date().toISOString()
    };
    
    try {
        validateFields(
            { 'Software': licencia.software, 'Tipo': licencia.tipo },
            {
                'Software': { required: true, maxLen: 150 },
                'Tipo':     { required: true, maxLen: 100 }
            }
        );
    } catch (validationError) {
        showNotification('❌ ' + validationError.message, 'error');
        return;
    }

    if (id) {
        const index = database.licencias.findIndex(l => l._id === id);
        database.licencias[index] = licencia;
        showNotification('✅ Licencia actualizada');
    } else {
        database.licencias.push(licencia);
        showNotification('✅ Licencia creada');
    }
    
    try {
        await upsertLicencia(licencia);
        renderLicencias();
        closeModal('modalLicencia');
    } catch(e) {
        console.error('Error guardando licencia:', e);
        showNotification('❌ Error al guardar. Revisa la consola.', 'error');
    }
}

function renderLicencias() {
    const tbody = document.getElementById('licenciasTableBody');
    
    if (database.licencias.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">
                    <div class="empty-state-icon">🔑</div>
                    <h3>No hay licencias registradas</h3>
                    <p>Haz clic en "Nueva Licencia" para comenzar</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = database.licencias.map(lic => {
        const cantidadAsignada = database.licenciasAsignaciones.filter(la => 
            la.licenciaId === lic._id
        ).length;
        
        const estadoBadge = lic.estado === 'Activa' ? 'badge-success' : 
                          lic.estado === 'Vencida' ? 'badge-danger' : 'badge-info';
        
        return `
            <tr>
                <td><strong>${escapeHTML(lic.software)}</strong></td>
                <td>${escapeHTML(lic.tipo)}</td>
                <td style="font-family: monospace; font-size: 0.9em;">${escapeHTML(lic.clave) || '-'}</td>
                <td><span class="badge badge-info">${cantidadAsignada} usuario(s)</span></td>
                <td>${lic.fechaVencimiento ? new Date(lic.fechaVencimiento).toLocaleDateString() : '-'}</td>
                <td><span class="badge ${estadoBadge}">${escapeHTML(lic.estado)}</span></td>
                <td class="action-buttons">
                    <button class="btn btn-sm btn-success" onclick='abrirAsignarUsuarios("${lic._id}")'><i data-lucide="users"></i> Asignar</button>
                    <button class="btn btn-sm btn-info" onclick='verDetalleLicencia("${lic._id}")'><i data-lucide="eye"></i> Ver</button>
                    <button class="btn btn-sm btn-primary" onclick='editLicencia("${lic._id}")'><i data-lucide="pencil"></i></button>
                    <button class="btn btn-sm btn-danger" onclick='deleteLicencia("${lic._id}")'><i data-lucide="trash-2"></i></button>
                </td>
            </tr>
        `;
    }).join('');
    refreshIcons();
}

function filterLicencias() {
    const searchTerm = document.getElementById('searchLicencia').value.toLowerCase();
    const rows = document.querySelectorAll('#licenciasTableBody tr');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
}

function editLicencia(id) {
    const licencia = database.licencias.find(l => l._id === id);
    
    document.getElementById('licenciaId').value = licencia._id;
    document.getElementById('licenciaSoftware').value = licencia.software;
    document.getElementById('licenciaTipo').value = licencia.tipo;
    document.getElementById('licenciaClave').value = licencia.clave || '';
    document.getElementById('licenciaFechaCompra').value = licencia.fechaCompra || '';
    document.getElementById('licenciaFechaVencimiento').value = licencia.fechaVencimiento || '';
    document.getElementById('licenciaEstado').value = licencia.estado;
    document.getElementById('licenciaNotas').value = licencia.notas || '';
    
    document.getElementById('modalLicenciaTitle').textContent = 'Editar Licencia';
    openModal('modalLicencia');
}

async function deleteLicencia(id) {
    const asignaciones = database.licenciasAsignaciones.filter(la => la.licenciaId === id);
    
    if (asignaciones.length > 0) {
        if (!confirm(`Esta licencia está asignada a ${asignaciones.length} usuario(s). ¿Deseas eliminarla de todas formas? Se eliminarán todas las asignaciones.`)) {
            return;
        }
        // Eliminar todas las asignaciones
        database.licenciasAsignaciones = database.licenciasAsignaciones.filter(la => la.licenciaId !== id);
    }
    
    if (confirm('¿Estás seguro de eliminar esta licencia?')) {
        try {
            await deleteLicenciaDB(id);
            database.licencias = database.licencias.filter(l => l._id !== id);
            database.licenciasAsignaciones = database.licenciasAsignaciones.filter(la => la.licenciaId !== id);
            renderLicencias();
            renderColaboradores();
            showNotification('✅ Licencia eliminada');
        } catch(e) {
            console.error('Error eliminando licencia:', e);
            showNotification('❌ Error al eliminar. Revisa la consola.', 'error');
        }
    }
}

function abrirAsignarUsuarios(licenciaId) {
    const licencia = database.licencias.find(l => l._id === licenciaId);
    if (!licencia) return;
    
    document.getElementById('licenciaAsignarId').value = licenciaId;
    document.getElementById('licenciaAsignarNombre').textContent = licencia.software;
    
    const asignacionesActuales = database.licenciasAsignaciones
        .filter(la => la.licenciaId === licenciaId)
        .map(la => la.colaboradorId);
    
    const listaHTML = database.colaboradores.map(col => {
        const isAsignado = asignacionesActuales.includes(col._id);
        const fotoHTML = col.foto ? 
            `<img src="${col.foto}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">` :
            `<div style="width: 40px; height: 40px; border-radius: 50%; background: #667eea; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold;">${col.nombre.charAt(0)}</div>`;
        
        return `
            <div class="usuario-asignar-item" data-nombre="${col.nombre.toLowerCase()}" style="display: flex; align-items: center; gap: 15px; padding: 12px; border: 2px solid ${isAsignado ? '#667eea' : '#e2e8f0'}; border-radius: 8px; margin-bottom: 10px; background: ${isAsignado ? '#f0f4ff' : 'white'}; cursor: pointer;" onclick="toggleAsignacionLicencia('${col._id}', this)">
                ${fotoHTML}
                <div style="flex: 1;">
                    <strong style="color: #1e293b;">${col.nombre}</strong>
                    <p style="margin: 4px 0 0 0; color: #64748b; font-size: 0.9em;">${col.departamento} - ${col.puesto}</p>
                </div>
                <input type="checkbox" ${isAsignado ? 'checked' : ''} style="width: 20px; height: 20px; cursor: pointer;" onclick="event.stopPropagation();">
            </div>
        `;
    }).join('');
    
    document.getElementById('listaUsuariosAsignar').innerHTML = listaHTML;
    openModal('modalAsignarUsuarios');
}

function toggleAsignacionLicencia(colaboradorId, element) {
    const checkbox = element.querySelector('input[type="checkbox"]');
    checkbox.checked = !checkbox.checked;
    
    if (checkbox.checked) {
        element.style.borderColor = '#667eea';
        element.style.background = '#f0f4ff';
    } else {
        element.style.borderColor = '#e2e8f0';
        element.style.background = 'white';
    }
}

function filterUsuariosAsignar() {
    const searchTerm = document.getElementById('searchUsuarioAsignar').value.toLowerCase();
    const items = document.querySelectorAll('.usuario-asignar-item');
    
    items.forEach(item => {
        const nombre = item.getAttribute('data-nombre');
        item.style.display = nombre.includes(searchTerm) ? 'flex' : 'none';
    });
}

async function guardarAsignacionesLicencia() {
    const licenciaId = document.getElementById('licenciaAsignarId').value;
    const checkboxes = document.querySelectorAll('#listaUsuariosAsignar input[type="checkbox"]');
    
    try {
        await deleteLicenciaAsignacionesPorLicencia(licenciaId);
        database.licenciasAsignaciones = database.licenciasAsignaciones.filter(la => la.licenciaId !== licenciaId);

        const nuevas = [];
        checkboxes.forEach((checkbox, index) => {
            if (checkbox.checked) {
                const colaboradorId = database.colaboradores[index]._id;
                nuevas.push({
                    _id: 'LA' + Date.now() + '_' + index,
                    licenciaId: licenciaId,
                    colaboradorId: colaboradorId,
                    fechaAsignacion: new Date().toISOString()
                });
            }
        });

        for (const la of nuevas) {
            await upsertLicenciaAsignacion(la);
            database.licenciasAsignaciones.push(la);
        }

        renderLicencias();
        renderColaboradores();
        closeModal('modalAsignarUsuarios');
        showNotification('✅ Asignaciones guardadas correctamente');
    } catch(e) {
        console.error('Error guardando asignaciones de licencia:', e);
        showNotification('❌ Error al guardar asignaciones.', 'error');
    }
}

function seleccionarTodosUsuarios() {
    const items = document.querySelectorAll('.usuario-asignar-item');
    items.forEach(item => {
        // Solo seleccionar items visibles (no filtrados)
        if (item.style.display !== 'none') {
            const checkbox = item.querySelector('input[type="checkbox"]');
            checkbox.checked = true;
            item.style.borderColor = '#667eea';
            item.style.background = '#f0f4ff';
        }
    });
    showNotification('✓ Todos los usuarios seleccionados', 'success');
}

function deseleccionarTodosUsuarios() {
    const items = document.querySelectorAll('.usuario-asignar-item');
    items.forEach(item => {
        const checkbox = item.querySelector('input[type="checkbox"]');
        checkbox.checked = false;
        item.style.borderColor = '#e2e8f0';
        item.style.background = 'white';
    });
    showNotification('✗ Todos los usuarios deseleccionados', 'success');
}

function verDetalleLicencia(id) {
    const licencia = database.licencias.find(l => l._id === id);
    if (!licencia) return;

    const asignaciones = (database.licenciasAsignaciones || []).filter(la => la.licenciaId === id);
    const hoy = new Date();

    // ── Status helpers ────────────────────────────────────────────────────
    const estadoBadge = licencia.estado === 'Activa' ? 'badge-success'
        : licencia.estado === 'Vencida' ? 'badge-danger' : 'badge-info';

    // Days until expiry
    let vencimientoTag = '';
    if (licencia.fechaVencimiento) {
        const vence = new Date(licencia.fechaVencimiento);
        const dias  = Math.ceil((vence - hoy) / (1000 * 60 * 60 * 24));
        if (dias < 0) {
            vencimientoTag = `<span style="background:rgba(239,68,68,0.15);color:#f87171;border:1px solid rgba(239,68,68,0.3);font-size:0.78em;padding:4px 10px;border-radius:20px;font-weight:600;">Vencida hace ${Math.abs(dias)} días</span>`;
        } else if (dias <= 30) {
            vencimientoTag = `<span style="background:rgba(245,158,11,0.15);color:#fbbf24;border:1px solid rgba(245,158,11,0.3);font-size:0.78em;padding:4px 10px;border-radius:20px;font-weight:600;">Vence en ${dias} días</span>`;
        }
    }

    // ── Usuarios asignados ────────────────────────────────────────────────
    const usuariosHTML = asignaciones.length > 0
        ? asignaciones.map(asig => {
            const col = database.colaboradores.find(c => c._id === asig.colaboradorId);
            if (!col) return '';
            const avatarEl = col.foto
                ? `<img src="${escapeHTML(col.foto)}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;flex-shrink:0;">`
                : `<div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#667eea,#764ba2);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;color:white;flex-shrink:0;">${escapeHTML(col.nombre.charAt(0))}</div>`;
            return `<div class="detail-hist-item" style="display:flex;align-items:center;gap:12px;">
                ${avatarEl}
                <div style="flex:1;min-width:0;">
                    <div style="font-weight:700;color:var(--text-primary);font-size:13px;">${escapeHTML(col.nombre)}</div>
                    <div style="color:var(--text-muted);font-size:11px;">${escapeHTML(col.departamento || '')} &middot; ${escapeHTML(col.puesto || '')}</div>
                </div>
                <div style="text-align:right;flex-shrink:0;color:var(--text-muted);font-size:11px;">
                    ${new Date(asig.fechaAsignacion).toLocaleDateString('es-MX')}
                </div>
            </div>`;
        }).join('')
        : `<p style="color:var(--text-muted);text-align:center;padding:16px 0;font-size:13px;">No hay usuarios asignados a esta licencia</p>`;

    const content = `
        <div class="detail-hero" style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);">
            <div style="width:60px;height:60px;border-radius:var(--radius-lg);background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                <i data-lucide="key" style="width:28px;height:28px;color:white;"></i>
            </div>
            <div class="detail-hero-info">
                <div class="detail-hero-name">${escapeHTML(licencia.software)}</div>
                <div class="detail-hero-sub">${escapeHTML(licencia.tipo)}</div>
                <div class="detail-hero-badges">
                    <span class="badge ${estadoBadge}" style="font-size:0.78em;">${escapeHTML(licencia.estado)}</span>
                    ${vencimientoTag}
                    <span style="background:rgba(255,255,255,0.2);color:white;font-size:0.78em;padding:4px 10px;border-radius:20px;font-weight:600;">${asignaciones.length} usuario(s)</span>
                </div>
            </div>
        </div>

        <div class="detail-grid-2">
            <div class="detail-info-card">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;">
                    <i data-lucide="info" style="width:15px;height:15px;color:var(--accent-primary);"></i>
                    <span style="font-weight:700;color:var(--text-primary);font-size:13px;">Información de la Licencia</span>
                </div>
                <div class="detail-info-row"><span class="detail-info-label">Software</span><span class="detail-info-value">${escapeHTML(licencia.software)}</span></div>
                <div class="detail-info-row"><span class="detail-info-label">Tipo</span><span class="detail-info-value">${escapeHTML(licencia.tipo)}</span></div>
                ${licencia.clave ? `<div class="detail-info-row"><span class="detail-info-label">Clave</span><span class="detail-info-value"><code style="font-size:11px;word-break:break-all;">${escapeHTML(licencia.clave)}</code></span></div>` : ''}
            </div>
            <div class="detail-info-card">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;">
                    <i data-lucide="calendar" style="width:15px;height:15px;color:var(--accent-primary);"></i>
                    <span style="font-weight:700;color:var(--text-primary);font-size:13px;">Vigencia</span>
                </div>
                ${licencia.fechaCompra ? `<div class="detail-info-row"><span class="detail-info-label">Compra</span><span class="detail-info-value">${new Date(licencia.fechaCompra).toLocaleDateString('es-MX')}</span></div>` : ''}
                ${licencia.fechaVencimiento ? `<div class="detail-info-row"><span class="detail-info-label">Vencimiento</span><span class="detail-info-value">${new Date(licencia.fechaVencimiento).toLocaleDateString('es-MX')}</span></div>` : ''}
                <div class="detail-info-row"><span class="detail-info-label">Usuarios</span><span class="detail-info-value">${asignaciones.length} asignado(s)</span></div>
            </div>
        </div>

        ${licencia.notas ? `
        <div style="background:rgba(245,158,11,0.07);border:1px solid rgba(245,158,11,0.22);border-left:4px solid #f59e0b;border-radius:var(--radius-md);padding:14px 16px;margin-bottom:24px;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                <i data-lucide="message-square" style="width:14px;height:14px;color:#f59e0b;"></i>
                <span style="font-weight:700;color:var(--text-primary);font-size:13px;">Notas</span>
            </div>
            <p style="margin:0;color:var(--text-secondary);font-size:13px;">${escapeHTML(licencia.notas)}</p>
        </div>` : ''}

        <div class="detail-section-title">
            <i data-lucide="users"></i> Usuarios Asignados
            <span style="margin-left:auto;">
                <button class="btn btn-sm btn-primary" onclick='closeModal("modalDetalleLicencia"); abrirAsignarUsuarios("${id}")'>
                    <i data-lucide="plus"></i> Gestionar
                </button>
            </span>
        </div>
        <div style="display:grid;gap:8px;">${usuariosHTML}</div>
    `;

    document.getElementById('detalleLicenciaContent').innerHTML = content;
    refreshIcons();
    openModal('modalDetalleLicencia');
}

