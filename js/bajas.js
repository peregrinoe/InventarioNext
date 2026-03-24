// ================================
// MÓDULO DE BAJAS DE COLABORADORES
// ================================

// Devuelve "YYYY-MM-DD" en hora local (evita desfase UTC)
function _fechaLocalHoy() {
    const d = new Date();
    const yy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
}

// Devuelve timestamp ISO en hora local (para campos de auditoría)
function _ahoraLocal() {
    const d = new Date();
    const offset = -d.getTimezoneOffset();
    const sign   = offset >= 0 ? '+' : '-';
    const hh     = String(Math.floor(Math.abs(offset) / 60)).padStart(2, '0');
    const mi     = String(Math.abs(offset) % 60).padStart(2, '0');
    const pad    = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T` +
           `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}${sign}${hh}:${mi}`;
}
// Roles:
//   operador   → puede SOLICITAR una baja (queda en estado 'pendiente')
//   superadmin → puede APROBAR/RECHAZAR solicitudes y dar baja directa
//
// Flujo:
//   1. Operador: botón "Solicitar Baja" en la vista del colaborador
//      → se crea registro en database.solicitudesBaja con estado 'pendiente'
//      → aparece badge de notificación en el nav para el admin
//   2. Admin: sección "Bajas" muestra solicitudes pendientes
//      → al aprobar: validación de activos asignados (equipos / celulares)
//      → se selecciona receptor de activos (si los hay)
//      → colaborador pasa a esActivo=false + se registra la baja en historial
// ================================

// ── Asegurar que la estructura exista en memoria ──────────────────────────
if (!database.solicitudesBaja) database.solicitudesBaja = [];
if (!database.historialBajas)  database.historialBajas  = [];

// ================================
// SOLICITUD DE BAJA (Operador / Admin)
// ================================

function abrirModalSolicitudBaja(colaboradorId) {
    const col = database.colaboradores.find(c => c._id === colaboradorId);
    if (!col) return;

    if (!col.esActivo) {
        showNotification('⚠️ Este colaborador ya está inactivo.', 'error');
        return;
    }

    // Rellenar datos del modal
    document.getElementById('bajaSolColaboradorId').value  = col._id;
    document.getElementById('bajaSolNombre').textContent   = col.nombre;
    document.getElementById('bajaSolPuesto').textContent   = col.puesto || '—';
    document.getElementById('bajaSolDepto').textContent    = col.departamento || '—';
    document.getElementById('bajaSolMotivo').value         = '';
    document.getElementById('bajaSolFecha').value          = _fechaLocalHoy();

    // Activos asignados
    const equipos   = database.asignaciones.filter(a => a.colaboradorId === col._id && a.estado === 'Activa');
    const celulares = database.asignacionesCelulares.filter(a => a.colaboradorId === col._id && a.estado === 'Activa');

    const resumenEl = document.getElementById('bajaSolResumenActivos');
    if (equipos.length === 0 && celulares.length === 0) {
        resumenEl.innerHTML = '<span style="color:#64748b;font-size:0.9em;">Sin activos asignados actualmente.</span>';
    } else {
        const listaEquipos   = equipos.map(a => {
            const eq = database.equipos.find(e => e._id === a.equipoId);
            return eq ? `<li>💻 ${eq.marca} ${eq.modelo} (${eq.numSerie || 'S/N'})</li>` : '';
        }).join('');
        const listaCelulares = celulares.map(a => {
            const cel = database.celulares.find(c => c._id === a.celularId);
            return cel ? `<li>📱 ${cel.marca} ${cel.modelo} (${cel.imei || 'S/IMEI'})</li>` : '';
        }).join('');
        resumenEl.innerHTML = `
            <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:10px 14px;font-size:0.88em;color:#92400e;">
                <strong>⚠️ Activos asignados que deberán reasignarse al aprobarse la baja:</strong>
                <ul style="margin:6px 0 0 16px;">${listaEquipos}${listaCelulares}</ul>
            </div>`;
    }

    openModalDirecto('modalSolicitudBaja');
}

async function enviarSolicitudBaja() {
    const colaboradorId = document.getElementById('bajaSolColaboradorId').value;
    const motivo        = document.getElementById('bajaSolMotivo').value.trim();
    const fecha         = document.getElementById('bajaSolFecha').value;

    if (!motivo) {
        showNotification('⚠️ El motivo es obligatorio.', 'error');
        return;
    }

    const solicitud = {
        _id:           'SOL' + Date.now(),
        colaboradorId,
        motivo,
        fecha,
        estado:        'pendiente',   // pendiente | aprobada | rechazada
        solicitadoPor: currentUser ? currentUser.nombre : 'Sistema',
        rolSolicitante: currentUser ? currentUser.role : 'operador',
        fechaSolicitud: _ahoraLocal(),
        fechaResolucion: null,
        resueltoPor:   null,
        notasResolucion: null
    };

    try {
        // Persistir en Supabase si existe la tabla, si no, solo en memoria
        await upsertSolicitudBaja(solicitud);
        database.solicitudesBaja.push(solicitud);
        closeModalDirecto('modalSolicitudBaja');
        showNotification('📨 Solicitud de baja enviada. El administrador será notificado.', 'success');
        actualizarBadgeBajas();
        renderBajas();
    } catch(e) {
        console.error('Error guardando solicitud:', e);
        // Fallback: guardar solo en memoria
        database.solicitudesBaja.push(solicitud);
        closeModalDirecto('modalSolicitudBaja');
        showNotification('📨 Solicitud registrada localmente.', 'success');
        actualizarBadgeBajas();
        renderBajas();
    }
}

// ================================
// PANEL DE BAJAS (Admin)
// ================================

function renderBajas() {
    const contenedor = document.getElementById('bajasContenido');
    if (!contenedor) return;

    const pendientes = database.solicitudesBaja.filter(s => s.estado === 'pendiente');
    const resueltas  = database.solicitudesBaja.filter(s => s.estado !== 'pendiente');
    const historial  = database.historialBajas || [];

    const esSuperAdmin = isSuperAdmin();

    contenedor.innerHTML = `
        <!-- SOLICITUDES PENDIENTES -->
        <div style="margin-bottom:32px;">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
                <h3 style="color:#1e293b;font-size:1.2em;">📬 Solicitudes Pendientes</h3>
                ${pendientes.length > 0 ? `<span style="background:#ef4444;color:white;border-radius:20px;padding:2px 10px;font-size:0.8em;font-weight:700;">${pendientes.length}</span>` : ''}
            </div>
            ${pendientes.length === 0
                ? `<div style="background:#f8fafc;border-radius:10px;padding:24px;text-align:center;color:#94a3b8;">
                        <div style="font-size:2em;margin-bottom:8px;">📭</div>
                        <div style="font-weight:600;">Sin solicitudes pendientes</div>
                   </div>`
                : pendientes.map(s => renderTarjetaSolicitud(s, esSuperAdmin)).join('')
            }
        </div>

        ${esSuperAdmin ? `
        <!-- BAJA DIRECTA (admin) -->
        <div style="margin-bottom:32px;padding:20px;background:#f8fafc;border-radius:12px;border:1px dashed #cbd5e0;">
            <h3 style="color:#1e293b;font-size:1.1em;margin-bottom:12px;">⚡ Dar Baja Directa</h3>
            <p style="color:#64748b;font-size:0.9em;margin-bottom:14px;">Como administrador puedes procesar la baja de un colaborador sin necesidad de una solicitud previa.</p>
            <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;">
                <div style="flex:1;min-width:220px;">
                    <label style="font-size:0.85em;font-weight:600;color:#475569;display:block;margin-bottom:6px;">Colaborador</label>
                    <select id="bajaDirColaborador" style="width:100%;padding:10px 12px;border:2px solid #e2e8f0;border-radius:8px;font-size:14px;background:white;">
                        <option value="">— Seleccionar colaborador —</option>
                        ${database.colaboradores
                            .filter(c => c.esActivo !== false)
                            .sort((a,b) => a.nombre.localeCompare(b.nombre, 'es'))
                            .map(c => `<option value="${c._id}">${c.nombre} · ${c.departamento || ''}</option>`)
                            .join('')}
                    </select>
                </div>
                <button class="btn btn-danger" onclick="iniciarBajaDirecta()" style="white-space:nowrap;">🚪 Procesar Baja</button>
            </div>
        </div>` : ''}

        <!-- HISTORIAL -->
        <div>
            <h3 style="color:#1e293b;font-size:1.2em;margin-bottom:16px;">📋 Historial de Bajas</h3>
            ${historial.length === 0 && resueltas.length === 0
                ? `<div style="background:#f8fafc;border-radius:10px;padding:24px;text-align:center;color:#94a3b8;">
                        <div style="font-size:2em;margin-bottom:8px;">🗂️</div>
                        <div style="font-weight:600;">Sin bajas registradas</div>
                   </div>`
                : renderTablaHistorial(historial, resueltas)
            }
        </div>
    `;
}

function renderTarjetaSolicitud(s, esSuperAdmin) {
    const col = database.colaboradores.find(c => c._id === s.colaboradorId);
    const nombre = col ? col.nombre : 'Colaborador eliminado';
    const depto  = col ? (col.departamento || '—') : '—';
    const foto   = col && col.foto
        ? `<img src="${col.foto}" style="width:44px;height:44px;border-radius:50%;object-fit:cover;flex-shrink:0;">`
        : `<div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#667eea,#764ba2);color:white;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:1.1em;flex-shrink:0;">${nombre.charAt(0)}</div>`;

    const equipos   = col ? database.asignaciones.filter(a => a.colaboradorId === col._id && a.estado === 'Activa') : [];
    const celulares = col ? database.asignacionesCelulares.filter(a => a.colaboradorId === col._id && a.estado === 'Activa') : [];
    const totalActivos = equipos.length + celulares.length;

    const fecha = new Date(s.fechaSolicitud).toLocaleDateString('es-MX', { day:'2-digit', month:'short', year:'numeric' });

    return `
        <div style="background:white;border:1px solid #e2e8f0;border-left:4px solid #f59e0b;border-radius:10px;padding:18px;margin-bottom:12px;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
            <div style="display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap;">
                ${foto}
                <div style="flex:1;min-width:200px;">
                    <div style="font-weight:700;color:#1e293b;font-size:1em;">${nombre}</div>
                    <div style="color:#64748b;font-size:0.85em;">${depto}</div>
                    <div style="margin-top:8px;background:#fef3c7;border-radius:6px;padding:6px 10px;font-size:0.85em;color:#92400e;">
                        <strong>Motivo:</strong> ${s.motivo}
                    </div>
                    <div style="margin-top:6px;font-size:0.8em;color:#94a3b8;">
                        Solicitado por <strong>${s.solicitadoPor}</strong> · ${fecha}
                    </div>
                    ${totalActivos > 0 ? `
                    <div style="margin-top:8px;font-size:0.82em;color:#ef4444;font-weight:600;">
                        ⚠️ Tiene ${totalActivos} activo(s) asignado(s) — se solicitará reasignación al aprobar
                    </div>` : `
                    <div style="margin-top:8px;font-size:0.82em;color:#10b981;font-weight:600;">
                        ✅ Sin activos asignados
                    </div>`}
                </div>
                ${esSuperAdmin ? `
                <div style="display:flex;gap:8px;align-items:flex-start;flex-shrink:0;flex-wrap:wrap;">
                    <button class="btn btn-success btn-sm" onclick="iniciarAprobacionSolicitud('${s._id}')">✅ Aprobar</button>
                    <button class="btn btn-danger btn-sm" onclick="rechazarSolicitud('${s._id}')">❌ Rechazar</button>
                </div>` : `
                <span style="background:#fef3c7;color:#92400e;padding:4px 12px;border-radius:20px;font-size:0.8em;font-weight:700;align-self:flex-start;">⏳ Pendiente de revisión</span>`}
            </div>
        </div>
    `;
}

function renderTablaHistorial(historial, solicitudesResueltas) {
    const todasLasBajas = [...historial].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    if (todasLasBajas.length === 0) {
        return `<div style="text-align:center;color:#94a3b8;padding:20px;">Sin registros</div>`;
    }

    return `
        <div style="overflow-x:auto;">
            <table style="width:100%;border-collapse:collapse;">
                <thead>
                    <tr style="background:#f8fafc;">
                        <th style="padding:12px;text-align:left;font-size:13px;color:#475569;border-bottom:2px solid #e2e8f0;">Colaborador</th>
                        <th style="padding:12px;text-align:left;font-size:13px;color:#475569;border-bottom:2px solid #e2e8f0;">Motivo</th>
                        <th style="padding:12px;text-align:left;font-size:13px;color:#475569;border-bottom:2px solid #e2e8f0;">Activos reasignados a</th>
                        <th style="padding:12px;text-align:left;font-size:13px;color:#475569;border-bottom:2px solid #e2e8f0;">Procesado por</th>
                        <th style="padding:12px;text-align:left;font-size:13px;color:#475569;border-bottom:2px solid #e2e8f0;">Fecha</th>
                    </tr>
                </thead>
                <tbody>
                    ${todasLasBajas.map(b => {
                        const receptor = b.receptorId ? (database.colaboradores.find(c => c._id === b.receptorId) || { nombre: b.receptorNombre || 'N/A' }) : null;
                        return `
                            <tr style="border-bottom:1px solid #f1f5f9;">
                                <td style="padding:12px;"><strong>${b.colaboradorNombre}</strong><br><span style="font-size:0.82em;color:#94a3b8;">${b.departamento || ''}</span></td>
                                <td style="padding:12px;font-size:0.88em;color:#475569;max-width:200px;">${b.motivo || '—'}</td>
                                <td style="padding:12px;font-size:0.88em;">
                                    ${receptor
                                        ? `<span style="background:#dbeafe;color:#1e40af;padding:2px 8px;border-radius:10px;font-size:0.85em;">${receptor.nombre}</span>`
                                        : '<span style="color:#94a3b8;">Sin activos / No aplica</span>'}
                                </td>
                                <td style="padding:12px;font-size:0.88em;color:#475569;">${b.procesadoPor || '—'}</td>
                                <td style="padding:12px;font-size:0.88em;color:#475569;">${new Date(b.fecha).toLocaleDateString('es-MX', { day:'2-digit', month:'short', year:'numeric' })}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// ================================
// APROBACIÓN DE SOLICITUD (Admin)
// ================================

function iniciarAprobacionSolicitud(solicitudId) {
    const sol = database.solicitudesBaja.find(s => s._id === solicitudId);
    if (!sol) return;
    // Reutiliza el mismo modal de confirmación de baja pero con referencia a la solicitud
    _abrirModalConfirmacionBaja(sol.colaboradorId, solicitudId);
}

function iniciarBajaDirecta() {
    const select = document.getElementById('bajaDirColaborador');
    const colaboradorId = select ? select.value : '';
    if (!colaboradorId) {
        showNotification('⚠️ Selecciona un colaborador.', 'error');
        return;
    }
    _abrirModalConfirmacionBaja(colaboradorId, null);
}

function _abrirModalConfirmacionBaja(colaboradorId, solicitudId) {
    const col = database.colaboradores.find(c => c._id === colaboradorId);
    if (!col) return;

    // Guardar referencias globales temporales
    window._bajaColaboradorId = colaboradorId;
    window._bajaSolicitudId   = solicitudId;

    // Equipos activos
    const asigEquipos = database.asignaciones.filter(a => a.colaboradorId === colaboradorId && a.estado === 'Activa');
    const asigCelulares = database.asignacionesCelulares.filter(a => a.colaboradorId === colaboradorId && a.estado === 'Activa');
    const totalActivos = asigEquipos.length + asigCelulares.length;

    document.getElementById('bajaConfNombre').textContent = col.nombre;
    document.getElementById('bajaConfPuesto').textContent = col.puesto || '—';
    document.getElementById('bajaConfDepto').textContent  = col.departamento || '—';
    document.getElementById('bajaConfMotivo').value       = solicitudId
        ? (database.solicitudesBaja.find(s => s._id === solicitudId) || {}).motivo || ''
        : '';

    const seccionReasignacion = document.getElementById('bajaConfReasignacion');

    if (totalActivos > 0) {
        // Listar activos con serie, nombre y estado
        const listaEquipos = asigEquipos.map(a => {
            const eq = database.equipos.find(e => e._id === a.equipoId);
            if (!eq) return '';
            const tipoLabel  = eq.tipo ? `<span style="background:#dbeafe;color:#1e40af;border-radius:4px;padding:1px 6px;font-size:0.78em;font-weight:600;">${eq.tipo}</span>` : '';
            const esTempBadge = a.esTemporal ? `<span style="background:#fef3c7;color:#92400e;border-radius:4px;padding:1px 6px;font-size:0.78em;font-weight:600;">⏳ Temporal</span>` : '';
            const estadoColor = eq.estado === 'Disponible' ? '#065f46' : eq.estado === 'En Mantenimiento' ? '#92400e' : '#1e40af';
            const estadoBg    = eq.estado === 'Disponible' ? '#d1fae5' : eq.estado === 'En Mantenimiento' ? '#fef3c7' : '#dbeafe';
            return `
                <li style="margin-bottom:8px;list-style:none;background:white;border:1px solid #fecaca;border-radius:6px;padding:8px 10px;">
                    <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:3px;">
                        <span style="font-size:1em;">💻</span>
                        <strong style="color:#1e293b;">${eq.marca} ${eq.modelo}</strong>
                        ${tipoLabel}${esTempBadge}
                    </div>
                    <div style="display:flex;gap:12px;flex-wrap:wrap;font-size:0.82em;color:#64748b;margin-left:22px;">
                        <span>🔢 <strong>Serie:</strong> ${eq.numSerie || '—'}</span>
                        ${eq.nombreEquipo ? `<span>🖥️ <strong>Nombre:</strong> ${eq.nombreEquipo}</span>` : ''}
                        <span style="background:${estadoBg};color:${estadoColor};padding:1px 7px;border-radius:4px;font-weight:600;">${eq.estado || '—'}</span>
                    </div>
                </li>`;
        }).join('');
        const listaCelulares = asigCelulares.map(a => {
            const cel = database.celulares.find(c => c._id === a.celularId);
            if (!cel) return '';
            const estadoColor = cel.estado === 'Disponible' ? '#065f46' : '#1e40af';
            const estadoBg    = cel.estado === 'Disponible' ? '#d1fae5' : '#dbeafe';
            return `
                <li style="margin-bottom:8px;list-style:none;background:white;border:1px solid #fecaca;border-radius:6px;padding:8px 10px;">
                    <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:3px;">
                        <span style="font-size:1em;">📱</span>
                        <strong style="color:#1e293b;">${cel.marca} ${cel.modelo}</strong>
                    </div>
                    <div style="display:flex;gap:12px;flex-wrap:wrap;font-size:0.82em;color:#64748b;margin-left:22px;">
                        <span>🔢 <strong>IMEI:</strong> ${cel.imei || '—'}</span>
                        ${cel.numero ? `<span>📞 <strong>Número:</strong> ${cel.numero}</span>` : ''}
                        <span style="background:${estadoBg};color:${estadoColor};padding:1px 7px;border-radius:4px;font-weight:600;">${cel.estado || '—'}</span>
                    </div>
                </li>`;
        }).join('');

        // Select de receptor
        const otrosColaboradores = database.colaboradores
            .filter(c => c._id !== colaboradorId && c.esActivo !== false)
            .sort((a,b) => a.nombre.localeCompare(b.nombre, 'es'));

        seccionReasignacion.innerHTML = `
            <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:14px;margin-bottom:14px;">
                <div style="font-weight:700;color:#991b1b;margin-bottom:10px;">⚠️ Activos asignados (${totalActivos})</div>
                <ul style="margin:0;padding:0;">${listaEquipos}${listaCelulares}</ul>
            </div>
            <div>
                <label style="font-size:0.88em;font-weight:600;color:#374151;display:block;margin-bottom:6px;">
                    ¿A quién se reasignan los activos? <span style="color:#ef4444;">*</span>
                </label>
                <select id="bajaReceptorSelect" style="width:100%;padding:10px 12px;border:2px solid #fca5a5;border-radius:8px;font-size:14px;background:white;" required>
                    <option value="">— Seleccionar receptor —</option>
                    ${otrosColaboradores.map(c => `<option value="${c._id}">${c.nombre} · ${c.departamento || ''}</option>`).join('')}
                    <option value="__almacen__">🏭 Regresar al almacén (sin asignar)</option>
                </select>
                <p style="font-size:0.8em;color:#94a3b8;margin-top:4px;">Este registro quedará guardado en el historial de bajas. La reasignación será de carácter temporal.</p>
            </div>
        `;
    } else {
        seccionReasignacion.innerHTML = `
            <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:12px;font-size:0.88em;color:#14532d;">
                ✅ El colaborador no tiene activos asignados. La baja puede procesarse sin reasignación.
            </div>
        `;
    }

    window._bajaTotalActivos = totalActivos;
    openModalDirecto('modalConfirmacionBaja');
}

async function confirmarBaja() {
    const colaboradorId = window._bajaColaboradorId;
    const solicitudId   = window._bajaSolicitudId;
    const totalActivos  = window._bajaTotalActivos || 0;
    const motivo        = document.getElementById('bajaConfMotivo').value.trim();

    if (!motivo) {
        showNotification('⚠️ El motivo es requerido.', 'error');
        return;
    }

    let receptorId   = null;
    let receptorNombre = null;

    if (totalActivos > 0) {
        const select = document.getElementById('bajaReceptorSelect');
        receptorId = select ? select.value : '';
        if (!receptorId) {
            showNotification('⚠️ Debes seleccionar a quién se reasignan los activos.', 'error');
            return;
        }
        if (receptorId === '__almacen__') {
            receptorNombre = 'Almacén';
            receptorId = null; // no hay un colaborador destino, se liberan los activos
        } else {
            const receptor = database.colaboradores.find(c => c._id === receptorId);
            receptorNombre = receptor ? receptor.nombre : receptorId;
        }
    }

    const col = database.colaboradores.find(c => c._id === colaboradorId);
    if (!col) return;

    try {
        // 1. Marcar colaborador como inactivo
        col.esActivo = false;
        await upsertColaborador(col);

        // 2. Reasignar activos si aplica
        if (totalActivos > 0) {
            const asigEquipos   = database.asignaciones.filter(a => a.colaboradorId === colaboradorId && a.estado === 'Activa');
            const asigCelulares = database.asignacionesCelulares.filter(a => a.colaboradorId === colaboradorId && a.estado === 'Activa');

            for (const asig of asigEquipos) {
                // Devolver el equipo actual
                asig.estado         = 'Devuelto';
                asig.fechaDevolucion = _fechaLocalHoy();
                await upsertAsignacion(asig);

                // Cambiar estado del equipo a Disponible primero
                const eq = database.equipos.find(e => e._id === asig.equipoId);
                if (eq) {
                    eq.estado = 'Disponible';
                    await upsertEquipo(eq);
                }

                // Si hay receptor (colaborador), crear nueva asignación
                if (receptorId) {
                    const nuevaAsig = {
                        _id:             'ASIG' + Date.now() + Math.random().toString(36).substr(2,4),
                        colaboradorId:   receptorId,
                        equipoId:        asig.equipoId,
                        fechaAsignacion: _fechaLocalHoy(),
                        fechaDevolucion: null,
                        estado:          'Activa',
                        notas:           `Reasignado desde baja de ${col.nombre}`,
                        esTemporal:      false,
                        fechaFinTemporal: null
                    };
                    await upsertAsignacion(nuevaAsig);
                    database.asignaciones.push(nuevaAsig);
                    if (eq) {
                        eq.estado = 'Asignado';
                        await upsertEquipo(eq);
                    }
                }
            }

            for (const asig of asigCelulares) {
                asig.estado          = 'Devuelto';
                asig.fechaDevolucion = _fechaLocalHoy();
                await upsertAsignacionCelular(asig);

                const cel = database.celulares.find(c => c._id === asig.celularId);
                if (cel) {
                    cel.estado = 'Disponible';
                    await upsertCelular(cel);
                }

                if (receptorId && cel) {
                    const nuevaAsig = {
                        _id:             'ASIGCEL' + Date.now() + Math.random().toString(36).substr(2,4),
                        colaboradorId:   receptorId,
                        celularId:       asig.celularId,
                        fechaAsignacion: _fechaLocalHoy(),
                        fechaDevolucion: null,
                        estado:          'Activa',
                        notas:           `Reasignado desde baja de ${col.nombre}`
                    };
                    await upsertAsignacionCelular(nuevaAsig);
                    database.asignacionesCelulares.push(nuevaAsig);
                    if (cel) {
                        cel.estado = 'Asignado';
                        await upsertCelular(cel);
                    }
                }
            }
        }

        // 3. Resolver la solicitud si venía de una
        if (solicitudId) {
            const sol = database.solicitudesBaja.find(s => s._id === solicitudId);
            if (sol) {
                sol.estado          = 'aprobada';
                sol.fechaResolucion = _ahoraLocal();
                sol.resueltoPor     = currentUser ? currentUser.nombre : 'Admin';
                await upsertSolicitudBaja(sol);
            }
        }

        // 4. Registrar en historial de bajas
        const entrada = {
            _id:               'BAJA' + Date.now(),
            colaboradorId:     col._id,
            colaboradorNombre: col.nombre,
            departamento:      col.departamento || '',
            puesto:            col.puesto || '',
            motivo,
            receptorId:        receptorId || null,
            receptorNombre:    receptorNombre || null,
            procesadoPor:      currentUser ? currentUser.nombre : 'Admin',
            fecha:             _ahoraLocal(),
            solicitudId:       solicitudId || null
        };
        database.historialBajas.push(entrada);
        await upsertHistorialBaja(entrada);

        closeModalDirecto('modalConfirmacionBaja');
        showNotification(`✅ Baja de ${col.nombre} procesada correctamente.`, 'success');
        actualizarBadgeBajas();
        renderAll();
        renderBajas();

    } catch(e) {
        console.error('Error procesando baja:', e);
        showNotification('❌ Error al procesar la baja. Revisa la consola.', 'error');
    }
}

// ================================
// RECHAZAR SOLICITUD (Admin)
// ================================

async function rechazarSolicitud(solicitudId) {
    const motivo = prompt('Motivo del rechazo (opcional):') ?? '';
    const sol = database.solicitudesBaja.find(s => s._id === solicitudId);
    if (!sol) return;

    sol.estado           = 'rechazada';
    sol.fechaResolucion  = _ahoraLocal();
    sol.resueltoPor      = currentUser ? currentUser.nombre : 'Admin';
    sol.notasResolucion  = motivo;

    try {
        await upsertSolicitudBaja(sol);
    } catch(e) { console.warn('No se pudo persistir rechazo:', e); }

    showNotification('🚫 Solicitud rechazada.', 'success');
    actualizarBadgeBajas();
    renderBajas();
}

// ================================
// BADGE DE NOTIFICACIÓN EN NAV
// ================================

function actualizarBadgeBajas() {
    if (!isSuperAdmin()) return;
    const pendientes = (database.solicitudesBaja || []).filter(s => s.estado === 'pendiente').length;
    const badge = document.getElementById('badgeBajasPendientes');
    if (!badge) return;
    badge.textContent = pendientes;
    badge.style.display = pendientes > 0 ? 'inline-flex' : 'none';
}

// ================================
// PERSISTENCIA EN SUPABASE
// (tablas: solicitudes_baja, historial_bajas)
// Graceful fallback si las tablas no existen todavía
// ================================

async function upsertSolicitudBaja(sol) {
    if (!supabaseClient) return;
    const row = {
        id:              sol._id,
        colaborador_id:  sol.colaboradorId,
        motivo:          sol.motivo,
        fecha:           sol.fecha,
        estado:          sol.estado,
        solicitado_por:  sol.solicitadoPor,
        rol_solicitante: sol.rolSolicitante,
        fecha_solicitud: sol.fechaSolicitud,
        fecha_resolucion: sol.fechaResolucion || null,
        resuelto_por:    sol.resueltoPor || null,
        notas_resolucion: sol.notasResolucion || null
    };
    try {
        const { error } = await supabaseClient.from('solicitudes_baja').upsert(row, { onConflict: 'id' });
        if (error) console.warn('solicitudes_baja upsert:', error.message);
    } catch(e) { console.warn('Tabla solicitudes_baja no disponible:', e.message); }
}

async function upsertHistorialBaja(entrada) {
    if (!supabaseClient) return;
    const row = {
        id:                 entrada._id,
        colaborador_id:     entrada.colaboradorId,
        colaborador_nombre: entrada.colaboradorNombre,
        departamento:       entrada.departamento,
        puesto:             entrada.puesto,
        motivo:             entrada.motivo,
        receptor_id:        entrada.receptorId || null,
        receptor_nombre:    entrada.receptorNombre || null,
        procesado_por:      entrada.procesadoPor,
        fecha:              entrada.fecha,
        solicitud_id:       entrada.solicitudId || null
    };
    try {
        const { error } = await supabaseClient.from('historial_bajas').upsert(row, { onConflict: 'id' });
        if (error) console.warn('historial_bajas upsert:', error.message);
    } catch(e) { console.warn('Tabla historial_bajas no disponible:', e.message); }
}

async function loadSolicitudesBaja() {
    if (!supabaseClient) return;
    try {
        const { data: solData, error: solError } = await supabaseClient
            .from('solicitudes_baja').select('*').order('fecha_solicitud', { ascending: false });
        if (!solError && solData) {
            database.solicitudesBaja = solData.map(r => ({
                _id:             r.id,
                colaboradorId:   r.colaborador_id,
                motivo:          r.motivo,
                fecha:           r.fecha,
                estado:          r.estado,
                solicitadoPor:   r.solicitado_por,
                rolSolicitante:  r.rol_solicitante,
                fechaSolicitud:  r.fecha_solicitud,
                fechaResolucion: r.fecha_resolucion,
                resueltoPor:     r.resuelto_por,
                notasResolucion: r.notas_resolucion
            }));
        }
    } catch(e) { console.warn('No se cargaron solicitudes_baja:', e.message); }

    try {
        const { data: histData, error: histError } = await supabaseClient
            .from('historial_bajas').select('*').order('fecha', { ascending: false });
        if (!histError && histData) {
            database.historialBajas = histData.map(r => ({
                _id:               r.id,
                colaboradorId:     r.colaborador_id,
                colaboradorNombre: r.colaborador_nombre,
                departamento:      r.departamento,
                puesto:            r.puesto,
                motivo:            r.motivo,
                receptorId:        r.receptor_id,
                receptorNombre:    r.receptor_nombre,
                procesadoPor:      r.procesado_por,
                fecha:             r.fecha,
                solicitudId:       r.solicitud_id
            }));
        }
    } catch(e) { console.warn('No se cargó historial_bajas:', e.message); }

    actualizarBadgeBajas();
}

// ================================
// HELPERS DE MODAL (sin depender
// del openModal original para
// no afectar parches de operador)
// ================================

function openModalDirecto(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.add('active');
}

function closeModalDirecto(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.remove('active');
}

// ================================
// PARCHE: agregar botón en
// renderColaboradores (inyección)
// ================================
// Este parche sobrescribe la función renderColaboradores para inyectar
// el botón "Solicitar Baja" sin modificar colaboradores.js

(function() {
    const _original = window.renderColaboradores;
    if (typeof _original !== 'function') return; // esperar a que cargue

    window.renderColaboradores = function() {
        _original();
        // El botón ya está en el HTML de colaboradores.js gracias a la modificación
        // (ver snippet al final del archivo). Aquí solo actualizamos el badge.
        actualizarBadgeBajas();
    };
})();

// Llamar a loadSolicitudesBaja después de que loadData haya terminado
// Se llama desde showApp → loadData → (al final) loadSolicitudesBaja
const _originalRenderAll = window.renderAll;
window.renderAll = function() {
    if (typeof _originalRenderAll === 'function') _originalRenderAll();
    loadSolicitudesBaja().then(() => {
        actualizarBadgeBajas();
        // Si la sección bajas está activa, re-renderizar
        const secBajas = document.getElementById('bajas');
        if (secBajas && secBajas.classList.contains('active')) renderBajas();
    });
};
