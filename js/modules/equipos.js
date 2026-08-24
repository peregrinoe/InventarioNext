// Helper para leer campos del DOM de forma segura
function getVal(id) {
    const el = document.getElementById(id);
    return el ? el.value : '';
}

async function saveEquipo(event) {
    event.preventDefault();

    if (!database.citasMantenimiento) database.citasMantenimiento = [];

    const id = getVal('equipoId');
    let fotos = [];
    try { fotos = getVal('equipoFotos') ? JSON.parse(getVal('equipoFotos')) : []; } catch(e) {}

    const equipo = {
        _id: id || 'EQ' + Date.now(),
        tipo:                    getVal('equipoTipo'),
        marca:                   getVal('equipoMarca'),
        modelo:                  getVal('equipoModelo'),
        numSerie:                getVal('equipoNumSerie'),
        nombreEquipo:            getVal('equipoNombre'),
        idInterno:               getVal('IdequipoInterno'),
        categoria:               getVal('equipoCategoria'),
        propiedad:               getVal('equipoPropiedad'),
        procesador:              getVal('equipoProcesador'),
        ram:                     getVal('equipoRam'),
        almacenamiento:          getVal('equipoAlmacenamiento'),
        so:                      getVal('equipoSO'),
        fechaCompra:             getVal('equipoFechaCompra'),
        proveedor:               getVal('equipoProveedor'),
        precio:                  getVal('equipoPrecio'),
        factura:                 getVal('equipoFactura'),
        garantiaMeses:           getVal('equipoGarantia'),
        ultimoMantenimiento:     getVal('equipoUltimoMantenimiento'),
        frecuenciaMantenimiento: getVal('equipoFrecuenciaMantenimiento'),
        condicion:               getVal('equipoCondicion'),
        ubicacion:               getVal('equipoUbicacion'),
        estado:                  getVal('equipoEstado'),
        observaciones:           getVal('equipoObservaciones'),
        owner:                   getVal('equipoOwner'),
        esquema:                 getVal('equipoEsquema'),
        cifradoDisco:            getVal('equipoCifradoDisco'),
        antivirusEdr:            getVal('equipoAntivirusEdr'),
        nivelAcceso:             getVal('equipoNivelAcceso'),
        fotos: fotos,
        createdAt: id
            ? (database.equipos.find(e => e._id === id) || {}).createdAt || new Date().toISOString()
            : new Date().toISOString()
    };

    try {
        validateFields(
            { 'Tipo': equipo.tipo, 'Marca': equipo.marca, 'Modelo': equipo.modelo, 'Número de serie': equipo.numSerie },
            {
                'Tipo':            { required: true, maxLen: 100 },
                'Marca':           { required: true, maxLen: 100 },
                'Modelo':          { required: true, maxLen: 150 },
                'Número de serie': { required: true, maxLen: 100 }
            }
        );
    } catch (validationError) {
        showNotification('❌ ' + validationError.message, 'error');
        return;
    }

    try {
        await upsertEquipo(equipo);
        if (id) {
            const index = database.equipos.findIndex(e => e._id === id);
            database.equipos[index] = equipo;
            showNotification('✅ Equipo actualizado');
        } else {
            database.equipos.push(equipo);
            showNotification('✅ Equipo creado');
        }
        renderEquipos();
        if (typeof updateDashboard === 'function') updateDashboard();
        if (typeof updateReportesStats === 'function') updateReportesStats();
        closeModal('modalEquipo');
    } catch(e) {
        console.error('Error guardando equipo:', e);
        showNotification('❌ Error al guardar equipo. Revisa la consola.', 'error');
    }
}

function filterEquipos() {
    renderEquipos();
}

function renderEquipos() {
    const tbody = document.getElementById('equiposTableBody');

    // ── Leer filtros activos ────────────────────────────────────────────────
    const searchTerm     = (document.getElementById('searchEquipo')?.value   || '').toLowerCase().trim();
    const filterEstado   =  document.getElementById('filterEstado')?.value   || '';
    const filterCategoria=  document.getElementById('filterCategoria')?.value|| '';
    const filterPropiedad=  document.getElementById('filterPropiedad')?.value|| '';

    // ── Filtrar sobre los datos ─────────────────────────────────────────────
    let equiposFiltrados = database.equipos.filter(eq => {
        const asignacionActiva = database.asignaciones.find(a =>
            a.equipoId === eq._id && a.estado === 'Activa'
        );
        const colaboradorAsignado = asignacionActiva
            ? database.colaboradores.find(c => c._id === asignacionActiva.colaboradorId)
            : null;
        const nombreAsignado = (colaboradorAsignado?.nombre || '').toLowerCase();

        // Búsqueda de texto: modelo, marca, num serie, nombre, id interno, observaciones
        // Para la columna "Asignado a": si tiene asignación activa busca por nombre del colaborador,
        // si no, busca por ubicación manual (igual que lo que se muestra en la tabla).
        const campoAsignadoVisible = colaboradorAsignado ? colaboradorAsignado.nombre : eq.ubicacion;
        const hayBusqueda = !searchTerm || [
            eq.modelo, eq.marca, eq.numSerie, eq.nombreEquipo,
            eq.idInterno, eq.observaciones, eq.procesador,
            campoAsignadoVisible
        ].some(v => (v || '').toLowerCase().includes(searchTerm));

        // Estado
        const hayEstado = !filterEstado || eq.estado === filterEstado;

        // Categoría
        const hayCategoria = !filterCategoria || eq.categoria === filterCategoria;

        // Propiedad
        const hayPropiedad = !filterPropiedad || eq.propiedad === filterPropiedad;

        return hayBusqueda && hayEstado && hayCategoria && hayPropiedad;
    });

    // ── Ordenar alfabéticamente por nombre del equipo ───────────────────────
    equiposFiltrados.sort((a, b) => {
        const nombreA = (a.nombreEquipo || `${a.marca} ${a.modelo}` || '').toLowerCase();
        const nombreB = (b.nombreEquipo || `${b.marca} ${b.modelo}` || '').toLowerCase();
        return nombreA.localeCompare(nombreB, 'es');
    });

    if (database.equipos.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="11" class="empty-state">
                    <div class="empty-state-icon">💻</div>
                    <h3>No hay equipos registrados</h3>
                    <p>Haz clic en "Nuevo Equipo" para comenzar</p>
                </td>
            </tr>
        `;
        return;
    }

    if (equiposFiltrados.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="11" class="empty-state">
                    <div class="empty-state-icon">🔍</div>
                    <h3>Sin resultados</h3>
                    <p>No se encontraron equipos con los filtros aplicados</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = equiposFiltrados.map(eq => {
        const asignacion = database.asignaciones.find(a => 
            a.equipoId === eq._id && a.estado === 'Activa'
        );
        const colaborador = asignacion ? 
            database.colaboradores.find(c => c._id === asignacion.colaboradorId) : null;
        
        
        const estadoBadge = eq.estado === 'Disponible' ? 'badge-success' : 
                          eq.estado === 'Asignado' ? 'badge-info' : 
                          eq.estado === 'En Reparación' ? 'badge-warning' : 'badge-danger';
        
        // Categoría con valores por defecto
        const categoria = eq.categoria || '2';
        const categoriaBadges = {
            '1': '<span class="badge badge-cat-1">Cat. 1 - Básico</span>',
            '2': '<span class="badge badge-cat-2">Cat. 2 - Intermedio</span>',
            '3': '<span class="badge badge-cat-3">Cat. 3 - Alto Rendimiento</span>'
        };
        
        // Propiedad del equipo
        const propiedad = eq.propiedad || 'Empresa';
        const propiedadBadge = propiedad === 'Empresa' ?
            '<span class="badge badge-empresa">Empresa</span>' :
            '<span class="badge badge-propio">Propio</span>';

        // Condición del equipo
        const condicionMap = {
            'Buenas condiciones': { cls: 'badge-success', icon: '' },
            'Aceptable':          { cls: 'badge-warning', icon: '' },
            'Malas condiciones':  { cls: 'badge-danger',  icon: '' },
            'Baja definitiva':    { cls: 'badge-danger',  icon: '' }
        };
        const condCfg = condicionMap[eq.condicion];
        const condicionBadge = condCfg
            ? `<span class="badge ${condCfg.cls}">${condCfg.icon} ${eq.condicion}</span>`
            : `<span style="color:#94a3b8;">—</span>`;
        
        // Mostrar la primera foto si existe, o el ícono por defecto
        const fotos = eq.fotos || (eq.foto ? [eq.foto] : []);
        const fotoHTML = fotos.length > 0 ? 
            `<img src="${escapeHTML(fotos[0])}" style="width: 40px; height: 40px; border-radius: 8px; object-fit: cover;">` :
            `<div style="width: 40px; height: 40px; border-radius: 8px; background: #f1f5f9; display: flex; align-items: center; justify-content: center;"><i data-lucide="monitor" style="width:20px;height:20px;color:#94a3b8;"></i></div>`;
        
        // Ubicación: si está asignado muestra "Lo tiene: nombre", si no, la ubicación manual o "Desconocida"
        const ubicacionTexto = asignacion && colaborador
            ? `<span style="display:inline-flex;align-items:center;gap:5px;background:#dbeafe;color:#1e40af;padding:4px 10px;border-radius:20px;font-size:0.82em;font-weight:600;"><i data-lucide="user" style="width:12px;height:12px;"></i> Lo tiene: ${escapeHTML(colaborador.nombre)}</span>`
            : eq.ubicacion
                ? `<span style="display:inline-flex;align-items:center;gap:5px;background:#f1f5f9;color:#475569;padding:4px 10px;border-radius:20px;font-size:0.82em;"><i data-lucide="map-pin" style="width:12px;height:12px;"></i> ${escapeHTML(eq.ubicacion)}</span>`
                : `<span style="display:inline-flex;align-items:center;gap:5px;background:#fef3c7;color:#92400e;padding:4px 10px;border-radius:20px;font-size:0.82em;"><i data-lucide="help-circle" style="width:12px;height:12px;"></i> Ubicación desconocida</span>`;

        return `
            <tr>
                <td>${escapeHTML(eq.modelo)}</td>
                <td>${escapeHTML(eq.tipo)}</td>
                <td>${categoriaBadges[categoria]}</td>
                <td>${propiedadBadge}</td>
                <td>${escapeHTML(eq.numSerie)}</td>
                <td>${escapeHTML(eq.nombreEquipo) || '-'}</td>
                <td><span class="badge ${estadoBadge}">${escapeHTML(eq.estado)}</span></td>
                <td>${condicionBadge}</td>
                <td>${ubicacionTexto}</td>
                <td>${escapeHTML(eq.observaciones) || '-'}</td>
                <td class="action-buttons">
                    <button class="btn btn-sm btn-info" onclick='verDetalleEquipo("${eq._id}")'><i data-lucide="eye"></i> Ver</button>
                    <button class="btn btn-sm btn-primary" onclick='editEquipo("${eq._id}")'><i data-lucide="pencil"></i></button>
                    <button class="btn btn-sm btn-danger" onclick='deleteEquipo("${eq._id}")'><i data-lucide="trash-2"></i></button>
                </td>
            </tr>
        `;
    }).join('');
    refreshIcons();
}

// Función auxiliar para calcular próximo mantenimiento
function calcularProximoMantenimiento(ultimoMtto, frecuencia) {
    if (!ultimoMtto || !frecuencia) return null;
    
    const fecha = new Date(ultimoMtto);
    fecha.setMonth(fecha.getMonth() + parseInt(frecuencia));
    return fecha;
}

// Función auxiliar para determinar si el mantenimiento está vencido
function mantenimientoVencido(ultimoMtto, frecuencia) {
    const proximo = calcularProximoMantenimiento(ultimoMtto, frecuencia);
    if (!proximo) return false;
    return new Date() > proximo;
}

// Función auxiliar para calcular días hasta el próximo mantenimiento
function diasHastaMantenimiento(ultimoMtto, frecuencia) {
    const proximo = calcularProximoMantenimiento(ultimoMtto, frecuencia);
    if (!proximo) return null;
    
    const hoy = new Date();
    const diff = proximo - hoy;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// Función auxiliar para verificar si la garantía está vigente
function garantiaVigente(fechaCompra, mesesGarantia) {
    if (!fechaCompra || !mesesGarantia) return false;
    
    const fecha = new Date(fechaCompra);
    fecha.setMonth(fecha.getMonth() + parseInt(mesesGarantia));
    return new Date() <= fecha;
}

// Función auxiliar para calcular fecha de vencimiento de garantía
function calcularVencimientoGarantia(fechaCompra, mesesGarantia) {
    if (!fechaCompra || !mesesGarantia) return null;
    
    const fecha = new Date(fechaCompra);
    fecha.setMonth(fecha.getMonth() + parseInt(mesesGarantia));
    return fecha;
}

// Generar sección de mantenimiento para detalle de equipo
function generarSeccionMantenimiento(equipo) {
    if (!database.citasMantenimiento) database.citasMantenimiento = [];

    const citasEquipo = database.citasMantenimiento
        .filter(c => c.equipoId === equipo._id)
        .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
    const citaProxima = citasEquipo.find(c => c.estado === 'Pendiente' && new Date(c.fecha) >= new Date());

    if (!equipo.ultimoMantenimiento && !equipo.frecuenciaMantenimiento) {
        return `
            <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin-bottom: 30px; border: 2px dashed #cbd5e0;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <h3 style="margin: 0; color: #64748b; display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 1.5em;">🔧</span> Información de Mantenimiento
                    </h3>
                    <button class="btn btn-primary btn-sm" onclick='agendarMantenimiento("${equipo._id}")'>📅 Agendar Cita</button>
                </div>
                <p style="margin: 0; color: #94a3b8; font-style: italic;">No se ha registrado información de mantenimiento para este equipo.</p>
                ${citasEquipo.length > 0 ? generarListaCitas(citasEquipo, equipo._id) : ''}
            </div>`;
    }

    const diasRestantes = diasHastaMantenimiento(equipo.ultimoMantenimiento, equipo.frecuenciaMantenimiento);
    const vencido       = mantenimientoVencido(equipo.ultimoMantenimiento, equipo.frecuenciaMantenimiento);
    const proximoMtto   = calcularProximoMantenimiento(equipo.ultimoMantenimiento, equipo.frecuenciaMantenimiento);

    let statusColor = '#10b981', statusIcon = '✅', statusTexto = 'Al corriente', bgColor = '#f0fdf4';
    if (vencido) {
        statusColor = '#ef4444'; statusIcon = '⚠️'; statusTexto = 'VENCIDO'; bgColor = '#fee2e2';
    } else if (diasRestantes !== null && diasRestantes <= 30) {
        statusColor = '#f59e0b'; statusIcon = '⏰'; statusTexto = 'Próximo'; bgColor = '#fef3c7';
    }

    const frecuenciaTexto = { '3':'Cada 3 meses', '6':'Cada 6 meses', '12':'Cada 12 meses' };

    return `
        <div style="background:${bgColor};padding:25px;border-radius:12px;margin-bottom:30px;border-left:6px solid ${statusColor};box-shadow:0 2px 8px rgba(0,0,0,0.1);">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:10px;">
                <h3 style="margin:0;color:#1e293b;display:flex;align-items:center;gap:10px;font-size:1.3em;">
                    <span style="font-size:1.4em;">🔧</span> Información de Mantenimiento
                </h3>
                <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
                    <span style="background:${statusColor};color:white;padding:8px 16px;border-radius:20px;font-size:0.9em;font-weight:600;">
                        ${statusIcon} ${statusTexto}
                    </span>
                    <button class="btn btn-primary btn-sm" onclick='agendarMantenimiento("${equipo._id}")'>📅 Agendar Cita</button>
                </div>
            </div>

            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:15px;margin-bottom:20px;">
                <div style="background:white;padding:15px;border-radius:10px;border:1px solid #e2e8f0;">
                    <p style="margin:0 0 6px 0;color:#64748b;font-size:0.82em;text-transform:uppercase;font-weight:600;">📅 Último Mantenimiento</p>
                    <p style="margin:0;color:#1e293b;font-weight:700;font-size:1.1em;">
                        ${equipo.ultimoMantenimiento ? new Date(equipo.ultimoMantenimiento).toLocaleDateString('es-MX',{year:'numeric',month:'long',day:'numeric'}) : 'No registrado'}
                    </p>
                </div>
                <div style="background:white;padding:15px;border-radius:10px;border:1px solid #e2e8f0;">
                    <p style="margin:0 0 6px 0;color:#64748b;font-size:0.82em;text-transform:uppercase;font-weight:600;">⏱️ Frecuencia</p>
                    <p style="margin:0;color:#1e293b;font-weight:700;font-size:1.1em;">
                        ${equipo.frecuenciaMantenimiento ? (frecuenciaTexto[equipo.frecuenciaMantenimiento] || `Cada ${equipo.frecuenciaMantenimiento} meses`) : 'No definida'}
                    </p>
                </div>
                ${proximoMtto ? `
                    <div style="background:white;padding:15px;border-radius:10px;border:2px solid ${statusColor};">
                        <p style="margin:0 0 6px 0;color:#64748b;font-size:0.82em;text-transform:uppercase;font-weight:600;">🔜 Próximo Mantenimiento</p>
                        <p style="margin:0;color:${statusColor};font-weight:700;font-size:1.05em;">
                            ${proximoMtto.toLocaleDateString('es-MX',{year:'numeric',month:'long',day:'numeric'})}
                        </p>
                    </div>
                    <div style="background:white;padding:15px;border-radius:10px;border:2px solid ${statusColor};text-align:center;">
                        <p style="margin:0 0 6px 0;color:#64748b;font-size:0.82em;text-transform:uppercase;font-weight:600;">⏳ ${vencido ? 'Días de Retraso' : 'Días Restantes'}</p>
                        <p style="margin:0;color:${statusColor};font-weight:800;font-size:2.2em;line-height:1;">${Math.abs(diasRestantes)}</p>
                        <p style="margin:4px 0 0 0;color:#64748b;font-size:0.8em;">días</p>
                    </div>
                ` : `
                    <div style="background:white;padding:15px;border-radius:10px;border:1px solid #e2e8f0;">
                        <p style="margin:0 0 6px 0;color:#64748b;font-size:0.82em;text-transform:uppercase;font-weight:600;">🔜 Próximo Mantenimiento</p>
                        <p style="margin:0;color:#94a3b8;font-style:italic;">No se puede calcular</p>
                    </div>
                `}
                ${citaProxima ? `
                    <div style="background:white;padding:15px;border-radius:10px;border:2px solid #667eea;">
                        <p style="margin:0 0 6px 0;color:#64748b;font-size:0.82em;text-transform:uppercase;font-weight:600;">📋 Cita Agendada</p>
                        <p style="margin:0;color:#667eea;font-weight:700;font-size:1.05em;">
                            ${new Date(citaProxima.fecha).toLocaleDateString('es-MX',{year:'numeric',month:'long',day:'numeric'})}
                        </p>
                        ${citaProxima.hora ? `<p style="margin:3px 0 0;color:#667eea;font-size:0.85em;">🕐 ${citaProxima.hora}</p>` : ''}
                        ${citaProxima.tecnico ? `<p style="margin:3px 0 0;color:#64748b;font-size:0.8em;">👨‍🔧 ${citaProxima.tecnico}</p>` : ''}
                    </div>
                ` : ''}
            </div>

            ${vencido ? `
                <div style="padding:15px;background:white;border-radius:10px;border:2px solid #ef4444;margin-bottom:15px;">
                    <p style="margin:0;color:#991b1b;font-weight:700;font-size:1.05em;display:flex;align-items:center;gap:8px;">
                        <span style="font-size:1.4em;">⚠️</span> ¡ATENCIÓN! Este equipo requiere mantenimiento urgente.
                    </p>
                    <p style="margin:8px 0 0;color:#7f1d1d;font-size:0.95em;">Han pasado <strong>${Math.abs(diasRestantes)} días</strong> desde la fecha programada.</p>
                </div>
            ` : diasRestantes !== null && diasRestantes <= 30 ? `
                <div style="padding:15px;background:white;border-radius:10px;border:2px solid #f59e0b;margin-bottom:15px;">
                    <p style="margin:0;color:#92400e;font-weight:600;display:flex;align-items:center;gap:8px;">
                        <span style="font-size:1.3em;">⏰</span> El mantenimiento está próximo. Considera agendarlo pronto.
                    </p>
                </div>
            ` : ''}

            ${citasEquipo.length > 0 ? generarListaCitas(citasEquipo, equipo._id) : ''}
        </div>`;
}

function generarListaCitas(citas, equipoId) {
    const cfg = {
        'Pendiente':  { color:'#667eea', bg:'#f0f4ff', icon:'📋' },
        'Completada': { color:'#10b981', bg:'#f0fdf4', icon:'✅' },
        'Cancelada':  { color:'#94a3b8', bg:'#f8fafc', icon:'❌' }
    };
    return `
        <div style="margin-top:15px;background:white;border-radius:10px;padding:15px;border:1px solid #e2e8f0;">
            <h4 style="margin:0 0 12px;color:#1e293b;font-size:1em;">📅 Historial de Citas (${citas.length})</h4>
            <div style="display:grid;gap:8px;">
                ${citas.map(cita => {
                    const c = cfg[cita.estado] || cfg['Pendiente'];
                    const pasada = new Date(cita.fecha) < new Date() && cita.estado === 'Pendiente';
                    return `
                        <div style="display:flex;align-items:center;gap:12px;padding:10px 12px;background:${pasada ? '#fff7ed' : c.bg};border-radius:8px;border:1px solid ${pasada ? '#fed7aa' : '#e2e8f0'};flex-wrap:wrap;">
                            <span style="font-size:1.2em;">${c.icon}</span>
                            <div style="flex:1;min-width:150px;">
                                <p style="margin:0;font-weight:600;color:#1e293b;font-size:0.9em;">
                                    ${new Date(cita.fecha).toLocaleDateString('es-MX',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}
                                    ${cita.hora ? ` · ${cita.hora}` : ''}
                                    ${cita.tipo ? ` · ${cita.tipo}` : ''}
                                </p>
                                ${cita.tecnico ? `<p style="margin:2px 0 0;color:#64748b;font-size:0.8em;">👨‍🔧 ${cita.tecnico}</p>` : ''}
                                ${cita.notas   ? `<p style="margin:2px 0 0;color:#64748b;font-size:0.8em;font-style:italic;">${cita.notas}</p>` : ''}
                                ${pasada ? `<p style="margin:2px 0 0;color:#ea580c;font-size:0.78em;font-weight:600;">⚠️ Fecha pasada sin confirmar</p>` : ''}
                            </div>
                            <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
                                <span style="background:${c.color};color:white;padding:3px 10px;border-radius:12px;font-size:0.75em;font-weight:600;">${cita.estado}</span>
                                ${cita.estado === 'Pendiente' ? `
                                    <button class="btn btn-sm btn-success" style="padding:3px 8px;font-size:0.75em;" onclick='marcarCitaCompletada("${cita._id}","${equipoId}")' title="Marcar como completada">✅</button>
                                    <button class="btn btn-sm btn-danger"  style="padding:3px 8px;font-size:0.75em;" onclick='cancelarCita("${cita._id}","${equipoId}")' title="Cancelar cita">❌</button>
                                ` : ''}
                            </div>
                        </div>`;
                }).join('')}
            </div>
        </div>`;
}

function agendarMantenimiento(equipoId) {
    const equipo = database.equipos.find(e => e._id === equipoId);
    if (!equipo) return;

    const proximoMtto = calcularProximoMantenimiento(equipo.ultimoMantenimiento, equipo.frecuenciaMantenimiento);
    const fechaDef = proximoMtto && proximoMtto > new Date()
        ? proximoMtto.toISOString().split('T')[0]
        : new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

    document.getElementById('citaEquipoId').value    = equipoId;
    document.getElementById('citaEquipoNombre').textContent = `${equipo.marca} ${equipo.modelo} · ${equipo.numSerie}`;
    document.getElementById('citaFecha').value       = fechaDef;
    document.getElementById('citaHora').value        = '09:00';
    document.getElementById('citaTecnico').value     = '';
    document.getElementById('citaNotas').value       = '';
    document.getElementById('citaTipo').value        = 'Preventivo';

    const diasRestantes = diasHastaMantenimiento(equipo.ultimoMantenimiento, equipo.frecuenciaMantenimiento);
    const vencido       = mantenimientoVencido(equipo.ultimoMantenimiento, equipo.frecuenciaMantenimiento);
    let estatusHTML = '';
    if (equipo.ultimoMantenimiento || equipo.frecuenciaMantenimiento) {
        let color = '#10b981', ico = '✅', txt = 'Al corriente';
        if (vencido)                                          { color='#ef4444'; ico='⚠️'; txt=`VENCIDO (${Math.abs(diasRestantes)} días de retraso)`; }
        else if (diasRestantes !== null && diasRestantes<=30) { color='#f59e0b'; ico='⏰'; txt=`Próximo en ${diasRestantes} días`; }
        else if (diasRestantes !== null)                      { txt=`Faltan ${diasRestantes} días`; }
        estatusHTML = `
            <div style="background:#f8fafc;border-radius:8px;padding:12px 15px;margin-bottom:15px;border-left:4px solid ${color};">
                <p style="margin:0;font-size:0.9em;color:#475569;">
                    <strong>Estado actual:</strong>
                    <span style="color:${color};font-weight:700;margin-left:6px;">${ico} ${txt}</span>
                </p>
                ${proximoMtto ? `<p style="margin:4px 0 0;font-size:0.85em;color:#64748b;">Programado para: <strong>${proximoMtto.toLocaleDateString('es-MX',{year:'numeric',month:'long',day:'numeric'})}</strong></p>` : ''}
            </div>`;
    }
    document.getElementById('citaEstatusEquipo').innerHTML = estatusHTML;
    openModal('modalAgendarMantenimiento');
}

function guardarCitaMantenimiento(event) {
    event.preventDefault();
    if (!database.citasMantenimiento) database.citasMantenimiento = [];
    const equipoId = document.getElementById('citaEquipoId').value;
    database.citasMantenimiento.push({
        _id:       'CIT' + Date.now(),
        equipoId:  equipoId,
        fecha:     document.getElementById('citaFecha').value,
        hora:      document.getElementById('citaHora').value,
        tecnico:   document.getElementById('citaTecnico').value,
        tipo:      document.getElementById('citaTipo').value,
        notas:     document.getElementById('citaNotas').value,
        estado:    'Pendiente',
        createdAt: new Date().toISOString()
    });
    // saveData() - now handled by Supabase
    closeModal('modalAgendarMantenimiento');
    showNotification('✅ Cita de mantenimiento agendada');
    verDetalleEquipo(equipoId);
}

function marcarCitaCompletada(citaId, equipoId) {
    if (!database.citasMantenimiento) database.citasMantenimiento = [];
    const cita   = database.citasMantenimiento.find(c => c._id === citaId);
    const equipo = database.equipos.find(e => e._id === equipoId);
    if (!cita || !equipo) return;

    // Llenar el modal con datos actuales del equipo
    document.getElementById('completarCitaId').value      = citaId;
    document.getElementById('completarEquipoId').value    = equipoId;
    document.getElementById('completarEquipoNombre').textContent = `${equipo.marca} ${equipo.modelo} · ${equipo.numSerie}`;
    document.getElementById('completarCitaInfo').textContent =
        `Cita: ${new Date(cita.fecha).toLocaleDateString('es-MX',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}` +
        (cita.hora ? ` a las ${cita.hora}` : '') +
        (cita.tipo ? ` · ${cita.tipo}` : '') +
        (cita.tecnico ? ` · 👨‍🔧 ${cita.tecnico}` : '');

    // Pre-llenar con valores actuales del equipo
    document.getElementById('completarFechaReal').value        = cita.fecha;
    document.getElementById('completarEstadoEquipo').value     = equipo.estado || 'Disponible';
    document.getElementById('completarCondicionEquipo').value  = equipo.condicion || '';
    document.getElementById('completarObservaciones').value    = '';

    closeModal('modalDetalleEquipo'); // cerrar detalle para que no tape
    openModal('modalCompletarMantenimiento');
}

function confirmarMantenimientoCompletado(event) {
    event.preventDefault();
    if (!database.citasMantenimiento) database.citasMantenimiento = [];

    const citaId          = document.getElementById('completarCitaId').value;
    const equipoId        = document.getElementById('completarEquipoId').value;
    const fechaReal       = document.getElementById('completarFechaReal').value;
    const nuevoEstado     = document.getElementById('completarEstadoEquipo').value;
    const nuevaCondicion  = document.getElementById('completarCondicionEquipo').value;
    const observaciones   = document.getElementById('completarObservaciones').value;

    // Actualizar la cita
    const cita = database.citasMantenimiento.find(c => c._id === citaId);
    if (cita) {
        cita.estado       = 'Completada';
        cita.completadaAt = new Date().toISOString();
        cita.fechaReal    = fechaReal;
        if (observaciones) cita.notasCompletado = observaciones;
    }

    // Actualizar el equipo
    const equipo = database.equipos.find(e => e._id === equipoId);
    if (equipo) {
        equipo.ultimoMantenimiento = fechaReal;
        equipo.estado              = nuevoEstado;
        equipo.condicion           = nuevaCondicion;
        // Agregar observaciones al historial existente
        if (observaciones) {
            const fecha = new Date().toLocaleDateString('es-MX');
            const prefijo = `[Mtto. ${fecha}] `;
            equipo.observaciones = equipo.observaciones
                ? `${prefijo}${observaciones}\n—\n${equipo.observaciones}`
                : `${prefijo}${observaciones}`;
        }
    }

    // saveData() - now handled by Supabase
    renderEquipos();
    closeModal('modalCompletarMantenimiento');
    showNotification('✅ Mantenimiento completado. Estado y condición actualizados.');
    verDetalleEquipo(equipoId);
}

function cancelarCita(citaId, equipoId) {
    if (!confirm('¿Cancelar esta cita?')) return;
    if (!database.citasMantenimiento) database.citasMantenimiento = [];
    const cita = database.citasMantenimiento.find(c => c._id === citaId);
    if (cita) cita.estado = 'Cancelada';
    // saveData() - now handled by Supabase
    showNotification('✅ Cita cancelada');
    verDetalleEquipo(equipoId);
}

// Generar sección de información de compra para detalle de equipo
function generarSeccionCompra(equipo) {
    // Si no hay datos de compra, mostrar mensaje informativo
    if (!equipo.fechaCompra && !equipo.proveedor && !equipo.precio && !equipo.factura && !equipo.garantiaMeses) {
        return `
            <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin-bottom: 30px; border: 2px dashed #cbd5e0;">
                <h3 style="margin: 0 0 10px 0; color: #64748b; display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 1.5em;">💰</span>
                    Información de Compra y Garantía
                </h3>
                <p style="margin: 0; color: #94a3b8; font-style: italic;">
                    No se ha registrado información de compra para este equipo.
                </p>
            </div>
        `;
    }
    
    const enGarantia = garantiaVigente(equipo.fechaCompra, equipo.garantiaMeses);
    const fechaVencimiento = calcularVencimientoGarantia(equipo.fechaCompra, equipo.garantiaMeses);
    
    let garantiaColor = enGarantia ? '#10b981' : '#94a3b8';
    let garantiaBg = enGarantia ? '#f0fdf4' : '#f8fafc';
    let garantiaIcon = enGarantia ? '🛡️' : '⏰';
    let garantiaTexto = enGarantia ? 'EN GARANTÍA' : 'Garantía Vencida';
    
    return `
        <div style="background: ${garantiaBg}; padding: 25px; border-radius: 12px; margin-bottom: 30px; border-left: 6px solid ${garantiaColor}; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 10px;">
                <h3 style="margin: 0; color: #1e293b; display: flex; align-items: center; gap: 10px; font-size: 1.3em;">
                    <span style="font-size: 1.4em;">💰</span>
                    Información de Compra y Garantía
                </h3>
                ${equipo.garantiaMeses ? `
                    <span style="background: ${garantiaColor}; color: white; padding: 8px 16px; border-radius: 20px; font-size: 0.9em; font-weight: 600; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                        ${garantiaIcon} ${garantiaTexto}
                    </span>
                ` : ''}
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px;">
                ${equipo.fechaCompra ? `
                    <div style="background: white; padding: 15px; border-radius: 10px; border: 1px solid #e2e8f0;">
                        <p style="margin: 0 0 8px 0; color: #64748b; font-size: 0.85em; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">📅 Fecha de Compra</p>
                        <p style="margin: 0; color: #1e293b; font-weight: 700; font-size: 1.2em;">
                            ${new Date(equipo.fechaCompra).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                    </div>
                ` : ''}
                
                ${equipo.proveedor ? `
                    <div style="background: white; padding: 15px; border-radius: 10px; border: 1px solid #e2e8f0;">
                        <p style="margin: 0 0 8px 0; color: #64748b; font-size: 0.85em; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">🏪 Proveedor</p>
                        <p style="margin: 0; color: #1e293b; font-weight: 700; font-size: 1.2em;">
                            ${equipo.proveedor}
                        </p>
                    </div>
                ` : ''}
                
                ${equipo.precio ? `
                    <div style="background: white; padding: 15px; border-radius: 10px; border: 1px solid #e2e8f0;">
                        <p style="margin: 0 0 8px 0; color: #64748b; font-size: 0.85em; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">💵 Precio de Compra</p>
                        <p style="margin: 0; color: #10b981; font-weight: 700; font-size: 1.4em;">
                            $${parseFloat(equipo.precio).toLocaleString('es-MX', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                        </p>
                        <p style="margin: 4px 0 0 0; color: #64748b; font-size: 0.8em;">MXN</p>
                    </div>
                ` : ''}
                
                ${equipo.factura ? `
                    <div style="background: white; padding: 15px; border-radius: 10px; border: 1px solid #e2e8f0;">
                        <p style="margin: 0 0 8px 0; color: #64748b; font-size: 0.85em; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">📄 Número de Factura</p>
                        <p style="margin: 0; color: #1e293b; font-weight: 700; font-size: 1.2em; font-family: monospace;">
                            ${equipo.factura}
                        </p>
                    </div>
                ` : ''}
                
                ${equipo.garantiaMeses ? `
                    <div style="background: white; padding: 15px; border-radius: 10px; border: 2px solid ${garantiaColor};">
                        <p style="margin: 0 0 8px 0; color: #64748b; font-size: 0.85em; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">🛡️ Garantía</p>
                        <p style="margin: 0; color: ${garantiaColor}; font-weight: 700; font-size: 1.4em;">
                            ${equipo.garantiaMeses} meses
                        </p>
                    </div>
                ` : ''}
                
                ${fechaVencimiento ? `
                    <div style="background: white; padding: 15px; border-radius: 10px; border: 2px solid ${garantiaColor};">
                        <p style="margin: 0 0 8px 0; color: #64748b; font-size: 0.85em; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">⏰ Vencimiento Garantía</p>
                        <p style="margin: 0; color: ${garantiaColor}; font-weight: 700; font-size: 1.2em;">
                            ${fechaVencimiento.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                        <p style="margin: 4px 0 0 0; color: #64748b; font-size: 0.8em;">
                            ${enGarantia ? 'Vigente' : 'Vencida'}
                        </p>
                    </div>
                ` : ''}
            </div>
            
            ${!enGarantia && equipo.garantiaMeses ? `
                <div style="margin-top: 20px; padding: 15px; background: white; border-radius: 10px; border: 2px solid #94a3b8;">
                    <p style="margin: 0; color: #475569; font-weight: 600; display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 1.3em;">ℹ️</span>
                        <span>La garantía de este equipo ya ha vencido.</span>
                    </p>
                </div>
            ` : ''}
        </div>
    `;
}

function verDetalleEquipo(id) {
    const equipo = database.equipos.find(e => e._id === id);
    if (!equipo) return;

    const asignacionActual = database.asignaciones.find(a => a.equipoId === id && a.estado === 'Activa');
    const colaboradorActual = asignacionActual ? database.colaboradores.find(c => c._id === asignacionActual.colaboradorId) : null;
    const historialAsignaciones = database.asignaciones.filter(a => a.equipoId === id).sort((a, b) => new Date(b.fechaAsignacion) - new Date(a.fechaAsignacion));
    const fotos = equipo.fotos || (equipo.foto ? [equipo.foto] : []);

    // ── Photo gallery ─────────────────────────────────────────────────────────
    const galeriaFotos = fotos.length > 0 ? `
        <div style="margin-bottom:24px;">
            <div class="detail-section-title"><i data-lucide="image"></i> Fotos del Estado Actual</div>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:12px;">
                ${fotos.map((foto, index) => `
                    <div style="position:relative;cursor:pointer;" onclick='ampliarFoto("${escapeHTML(foto)}")'>
                        <img src="${escapeHTML(foto)}" style="width:100%;height:150px;object-fit:cover;border-radius:var(--radius-md);border:1px solid var(--border-subtle);">
                        <div style="position:absolute;bottom:6px;right:6px;background:rgba(0,0,0,0.55);color:white;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;">Foto ${index + 1}</div>
                    </div>
                `).join('')}
            </div>
        </div>` : `
        <div style="text-align:center;padding:20px;background:var(--bg-elevated);border:1px solid var(--border-subtle);border-radius:var(--radius-lg);margin-bottom:24px;">
            <div style="display:flex;justify-content:center;margin-bottom:6px;opacity:0.3;"><i data-lucide="camera-off" style="width:32px;height:32px;"></i></div>
            <p style="color:var(--text-muted);font-size:13px;margin:0;">Sin fotos del equipo</p>
        </div>`;

    // ── Helpers ───────────────────────────────────────────────────────────────
    const estadoBadge = equipo.estado === 'Disponible' ? 'badge-success' : equipo.estado === 'Asignado' ? 'badge-info' : equipo.estado === 'En Reparación' ? 'badge-warning' : 'badge-danger';
    const categoria = equipo.categoria || '2';
    const categoriaColors = { '1': '#f59e0b', '2': '#3b82f6', '3': '#10b981' };
    const categoriaTexto  = { '1': 'Cat. 1 — Básico', '2': 'Cat. 2 — Intermedio', '3': 'Cat. 3 — Alto Rendimiento' };
    const categoriaDescr  = { '1': 'Celeron, Pentium, i3, Ryzen 3 · 4-8 GB RAM', '2': 'i5 gen 6-10, Ryzen 5 gen 1-4 · 8-16 GB RAM', '3': 'i5 gen 11+, i7, Ryzen 5/7 gen 5+ · 16+ GB RAM' };
    const condColors = { 'Buenas condiciones':'#22c55e','Aceptable':'#f59e0b','Malas condiciones':'#ef4444','Baja definitiva':'#991b1b' };
    const condIcons  = { 'Buenas condiciones':'check-circle','Aceptable':'alert-circle','Malas condiciones':'x-circle','Baja definitiva':'ban' };
    const propiedad  = equipo.propiedad || 'Empresa';

    const asigBadgeHTML = (() => {
        if (asignacionActual && colaboradorActual)
            return `<span style="background:rgba(59,130,246,0.15);color:#60a5fa;border:1px solid rgba(59,130,246,0.3);font-size:12px;padding:5px 12px;border-radius:20px;font-weight:600;display:inline-flex;align-items:center;gap:5px;"><i data-lucide="user" style="width:12px;height:12px;"></i>${escapeHTML(colaboradorActual.nombre)}</span>`;
        if (equipo.ubicacion)
            return `<span style="background:rgba(100,116,139,0.15);color:var(--text-secondary);border:1px solid var(--border-subtle);font-size:12px;padding:5px 12px;border-radius:20px;font-weight:600;display:inline-flex;align-items:center;gap:5px;"><i data-lucide="map-pin" style="width:12px;height:12px;"></i>${escapeHTML(equipo.ubicacion)}</span>`;
        return `<span style="background:rgba(245,158,11,0.12);color:#f59e0b;border:1px solid rgba(245,158,11,0.3);font-size:12px;padding:5px 12px;border-radius:20px;font-weight:600;">Ubicación desconocida</span>`;
    })();

    const condBadgeHTML = equipo.condicion ? (() => {
        const c = condColors[equipo.condicion] || '#64748b';
        const ic = condIcons[equipo.condicion] || 'minus';
        return `<span style="background:${c}22;color:${c};border:1px solid ${c}55;font-size:12px;padding:5px 12px;border-radius:20px;font-weight:600;display:inline-flex;align-items:center;gap:5px;"><i data-lucide="${ic}" style="width:12px;height:12px;"></i>${escapeHTML(equipo.condicion)}</span>`;
    })() : '';

    // ── Historial ────────────────────────────────────────────────────────────
    const historialHTML = historialAsignaciones.length > 0
        ? historialAsignaciones.map(asig => {
            const colab = database.colaboradores.find(c => c._id === asig.colaboradorId);
            const esBadge = asig.estado === 'Activa' ? 'badge-success' : 'badge-warning';
            return `<div class="detail-hist-item">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:5px;">
                    <span style="font-weight:700;color:var(--text-primary);font-size:13px;">${colab ? escapeHTML(colab.nombre) : 'N/A'}</span>
                    <span class="badge ${esBadge}" style="font-size:0.72em;flex-shrink:0;">${escapeHTML(asig.estado)}</span>
                </div>
                <div style="color:var(--text-secondary);font-size:12px;">
                    Asignado: ${new Date(asig.fechaAsignacion).toLocaleDateString('es-MX')}
                    ${asig.fechaDevolucion ? ` &middot; Devuelto: ${new Date(asig.fechaDevolucion).toLocaleDateString('es-MX')}` : ''}
                </div>
                ${asig.observaciones ? `<div style="color:var(--text-muted);font-size:11px;margin-top:4px;font-style:italic;">${escapeHTML(asig.observaciones)}</div>` : ''}
            </div>`;
        }).join('')
        : `<p style="color:var(--text-muted);text-align:center;padding:16px 0;font-size:13px;">Sin historial de asignaciones</p>`;

    const content = `
        <div class="detail-hero">
            <div style="width:60px;height:60px;border-radius:var(--radius-lg);background:rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                <i data-lucide="monitor" style="width:28px;height:28px;color:white;"></i>
            </div>
            <div class="detail-hero-info">
                <div class="detail-hero-name">${escapeHTML(equipo.marca)} ${escapeHTML(equipo.modelo)}</div>
                <div class="detail-hero-sub">${escapeHTML(equipo.tipo)}${equipo.numSerie ? ` &middot; ${escapeHTML(equipo.numSerie)}` : ''}</div>
                <div class="detail-hero-badges">
                    <span class="badge ${estadoBadge}" style="font-size:0.78em;">${escapeHTML(equipo.estado)}</span>
                    <span style="background:${categoriaColors[categoria]}22;color:${categoriaColors[categoria]};border:1px solid ${categoriaColors[categoria]}55;font-size:0.78em;padding:4px 10px;border-radius:20px;font-weight:700;">${categoriaTexto[categoria]}</span>
                    <span style="background:rgba(255,255,255,0.15);color:white;font-size:0.78em;padding:4px 10px;border-radius:20px;font-weight:600;">${escapeHTML(propiedad)}</span>
                    ${asigBadgeHTML}
                    ${condBadgeHTML}
                </div>
            </div>
        </div>

        ${galeriaFotos}

        <div class="detail-grid-2">
            <div class="detail-info-card">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;">
                    <i data-lucide="info" style="width:15px;height:15px;color:var(--accent-primary);"></i>
                    <span style="font-weight:700;color:var(--text-primary);font-size:13px;">Información General</span>
                </div>
                ${equipo.idInterno ? `<div class="detail-info-row"><span class="detail-info-label">ID Interno</span><span class="detail-info-value">${escapeHTML(equipo.idInterno)}</span></div>` : ''}
                ${equipo.nombreEquipo ? `<div class="detail-info-row"><span class="detail-info-label">Nombre</span><span class="detail-info-value">${escapeHTML(equipo.nombreEquipo)}</span></div>` : ''}
                <div class="detail-info-row"><span class="detail-info-label">N° Serie</span><span class="detail-info-value"><code style="font-size:12px;">${escapeHTML(equipo.numSerie)}</code></span></div>
                <div class="detail-info-row"><span class="detail-info-label">Propiedad</span><span class="detail-info-value">${escapeHTML(propiedad)}</span></div>
                ${equipo.fechaCompra ? `<div class="detail-info-row"><span class="detail-info-label">Compra</span><span class="detail-info-value">${new Date(equipo.fechaCompra).toLocaleDateString('es-MX')}</span></div>` : ''}
                ${equipo.proveedor ? `<div class="detail-info-row"><span class="detail-info-label">Proveedor</span><span class="detail-info-value">${escapeHTML(equipo.proveedor)}</span></div>` : ''}
                ${equipo.precio ? `<div class="detail-info-row"><span class="detail-info-label">Precio</span><span class="detail-info-value">$${parseFloat(equipo.precio).toLocaleString('es-MX',{minimumFractionDigits:2})} MXN</span></div>` : ''}
                ${equipo.factura ? `<div class="detail-info-row"><span class="detail-info-label">Factura</span><span class="detail-info-value">${escapeHTML(equipo.factura)}</span></div>` : ''}
            </div>
            <div class="detail-info-card">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;">
                    <i data-lucide="cpu" style="width:15px;height:15px;color:var(--accent-primary);"></i>
                    <span style="font-weight:700;color:var(--text-primary);font-size:13px;">Especificaciones</span>
                </div>
                ${equipo.procesador ? `<div class="detail-info-row"><span class="detail-info-label">CPU</span><span class="detail-info-value">${escapeHTML(equipo.procesador)}</span></div>` : ''}
                ${equipo.ram ? `<div class="detail-info-row"><span class="detail-info-label">RAM</span><span class="detail-info-value">${escapeHTML(equipo.ram)} GB</span></div>` : ''}
                ${equipo.almacenamiento ? `<div class="detail-info-row"><span class="detail-info-label">Almacen.</span><span class="detail-info-value">${escapeHTML(equipo.almacenamiento)}</span></div>` : ''}
                ${equipo.so ? `<div class="detail-info-row"><span class="detail-info-label">S.O.</span><span class="detail-info-value">${escapeHTML(equipo.so)}</span></div>` : ''}
                ${equipo.garantiaMeses ? `<div class="detail-info-row"><span class="detail-info-label">Garantía</span><span class="detail-info-value">${escapeHTML(String(equipo.garantiaMeses))} meses</span></div>` : ''}
                <div class="detail-spec-block" style="background:${categoriaColors[categoria]};margin-top:auto;">
                    <div style="font-weight:700;font-size:13px;margin-bottom:3px;">${categoriaTexto[categoria]}</div>
                    <div style="font-size:11px;opacity:0.9;">${categoriaDescr[categoria]}</div>
                </div>
            </div>
        </div>

        ${(equipo.owner || equipo.esquema || equipo.cifradoDisco || equipo.antivirusEdr || equipo.nivelAcceso) ? `
        <div class="detail-info-card" style="margin-bottom:24px;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;">
                <i data-lucide="shield" style="width:15px;height:15px;color:var(--accent-primary);"></i>
                <span style="font-weight:700;color:var(--text-primary);font-size:13px;">Seguridad y Configuración</span>
            </div>
            ${equipo.owner ? `<div class="detail-info-row"><span class="detail-info-label">Área/Responsable</span><span class="detail-info-value">${escapeHTML(equipo.owner)}</span></div>` : ''}
            ${equipo.esquema ? `<div class="detail-info-row"><span class="detail-info-label">Ubicación/Esquema</span><span class="detail-info-value">${escapeHTML(equipo.esquema)}</span></div>` : ''}
            ${equipo.cifradoDisco ? `<div class="detail-info-row"><span class="detail-info-label">Cifrado (BitLocker)</span><span class="detail-info-value">${escapeHTML(equipo.cifradoDisco)}</span></div>` : ''}
            ${equipo.antivirusEdr ? `<div class="detail-info-row"><span class="detail-info-label">Antivirus/EDR (Kaspersky)</span><span class="detail-info-value">${escapeHTML(equipo.antivirusEdr)}</span></div>` : ''}
            ${equipo.nivelAcceso ? `<div class="detail-info-row"><span class="detail-info-label">Nivel de acceso</span><span class="detail-info-value">${escapeHTML(equipo.nivelAcceso)}</span></div>` : ''}
        </div>` : ''}

        ${generarSeccionMantenimiento(equipo)}
        ${generarSeccionCompra(equipo)}

        ${colaboradorActual ? `
        <div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);border-radius:var(--radius-lg);padding:20px;margin-bottom:24px;color:white;display:flex;align-items:center;gap:16px;">
            <div style="width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,0.18);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                <i data-lucide="user" style="width:20px;height:20px;color:white;"></i>
            </div>
            <div>
                <div style="font-size:11px;opacity:0.75;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;">Asignado actualmente a</div>
                <div style="font-weight:800;font-size:15px;">${escapeHTML(colaboradorActual.nombre)}</div>
                <div style="opacity:0.85;font-size:13px;">${escapeHTML(colaboradorActual.departamento)} &middot; ${escapeHTML(colaboradorActual.puesto)}</div>
                <div style="opacity:0.7;font-size:11px;margin-top:2px;">Desde: ${new Date(asignacionActual.fechaAsignacion).toLocaleDateString('es-MX')}</div>
            </div>
        </div>` : ''}

        ${equipo.observaciones ? `
        <div style="background:rgba(245,158,11,0.07);border:1px solid rgba(245,158,11,0.22);border-left:4px solid #f59e0b;border-radius:var(--radius-md);padding:14px 16px;margin-bottom:24px;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                <i data-lucide="message-square" style="width:14px;height:14px;color:#f59e0b;"></i>
                <span style="font-weight:700;color:var(--text-primary);font-size:13px;">Observaciones</span>
            </div>
            <p style="margin:0;color:var(--text-secondary);font-size:13px;">${escapeHTML(equipo.observaciones)}</p>
        </div>` : ''}

        <div class="detail-section-title"><i data-lucide="history"></i> Historial de Asignaciones</div>
        <div style="display:grid;gap:8px;">${historialHTML}</div>
    `;

    document.getElementById('detalleEquipoContent').innerHTML = content;
    refreshIcons();
    openModal('modalDetalleEquipo');
}

// Función para ampliar foto (opcional - modal simple)
function ampliarFoto(fotoSrc) {
    const modalAmpliada = document.createElement('div');
    modalAmpliada.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 3000; display: flex; align-items: center; justify-content: center; cursor: pointer;';
    modalAmpliada.innerHTML = `<img src="${fotoSrc}" style="max-width: 90%; max-height: 90%; border-radius: 12px;">`;
    modalAmpliada.onclick = function() {
        document.body.removeChild(modalAmpliada);
    };
    document.body.appendChild(modalAmpliada);
}

function editEquipo(id) {
    const equipo = database.equipos.find(e => e._id === id);
    
    document.getElementById('equipoId').value = equipo._id;
    document.getElementById('equipoTipo').value = equipo.tipo;
    document.getElementById('equipoMarca').value = equipo.marca;
    document.getElementById('equipoModelo').value = equipo.modelo;
    document.getElementById('equipoNumSerie').value = equipo.numSerie;
    document.getElementById('equipoNombre').value = equipo.nombreEquipo || '';
    document.getElementById('IdequipoInterno').value = equipo.idInterno || '';
    document.getElementById('equipoProcesador').value = equipo.procesador || '';
    document.getElementById('equipoRam').value = equipo.ram || '';
    document.getElementById('equipoAlmacenamiento').value = equipo.almacenamiento || '';
    document.getElementById('equipoSO').value = equipo.so || '';
    document.getElementById('equipoFechaCompra').value = equipo.fechaCompra || '';
    document.getElementById('equipoProveedor').value = equipo.proveedor || '';
    document.getElementById('equipoPrecio').value = equipo.precio || '';
    document.getElementById('equipoFactura').value = equipo.factura || '';
    document.getElementById('equipoGarantia').value = equipo.garantiaMeses || '';
    document.getElementById('equipoUltimoMantenimiento').value = equipo.ultimoMantenimiento || '';
    document.getElementById('equipoFrecuenciaMantenimiento').value = equipo.frecuenciaMantenimiento || '';
    const condEl = document.getElementById('equipoCondicion');
    if (condEl) condEl.value = equipo.condicion || '';
    const ubicEl = document.getElementById('equipoUbicacion');
    if (ubicEl) ubicEl.value = equipo.ubicacion || '';
    document.getElementById('equipoEstado').value = equipo.estado;
    document.getElementById('equipoObservaciones').value = equipo.observaciones || '';
    const ownerEl = document.getElementById('equipoOwner');
    if (ownerEl) ownerEl.value = equipo.owner || '';
    const esquemaEl = document.getElementById('equipoEsquema');
    if (esquemaEl) esquemaEl.value = equipo.esquema || '';
    const cifradoEl = document.getElementById('equipoCifradoDisco');
    if (cifradoEl) cifradoEl.value = equipo.cifradoDisco || '';
    const antivirusEl = document.getElementById('equipoAntivirusEdr');
    if (antivirusEl) antivirusEl.value = equipo.antivirusEdr || '';
    const nivelEl = document.getElementById('equipoNivelAcceso');
    if (nivelEl) nivelEl.value = equipo.nivelAcceso || '';
    
    // Manejar categoría y propiedad
    document.getElementById('equipoCategoria').value = equipo.categoria || '2';
    document.getElementById('equipoPropiedad').value = equipo.propiedad || 'Empresa';
    updateCategoriaHelp();
    
    // Cargar fotos existentes (compatibilidad con versión anterior)
    const fotos = equipo.fotos || (equipo.foto ? [equipo.foto] : []);
    
    if (fotos.length > 0) {
        document.getElementById('equipoFotos').value = JSON.stringify(fotos);
        const preview = document.getElementById('equipoFotosPreview');
        preview.innerHTML = '';
        
        fotos.forEach((foto, index) => {
            const fotoDiv = document.createElement('div');
            fotoDiv.style.position = 'relative';
            fotoDiv.innerHTML = `
                <img src="${foto}" style="width: 100%; height: 150px; object-fit: cover; border-radius: 8px; border: 2px solid #e2e8f0;">
                <button type="button" onclick="borrarFotoIndividual(${index})" style="position: absolute; top: 5px; right: 5px; background: #f56565; color: white; border: none; border-radius: 50%; width: 25px; height: 25px; cursor: pointer; font-size: 16px; line-height: 1; display: flex; align-items: center; justify-content: center;">×</button>
                <p style="margin-top: 5px; font-size: 0.75em; color: #64748b; text-align: center;">Foto ${index + 1}</p>
            `;
            preview.appendChild(fotoDiv);
        });
    }
    
    document.getElementById('modalEquipoTitle').textContent = 'Editar Equipo';
    openModal('modalEquipo');
}

async function deleteEquipo(id) {
    const asignaciones = database.asignaciones.filter(a => a.equipoId === id && a.estado === 'Activa');
    
    if (asignaciones.length > 0) {
        showNotification('❌ No se puede eliminar. El equipo está asignado.', 'error');
        return;
    }
    
    if (confirm('¿Estás seguro de eliminar este equipo?')) {
        try {
            await deleteEquipoDB(id);
            database.equipos = database.equipos.filter(e => e._id !== id);
            renderEquipos();
            updateDashboard();
            showNotification('✅ Equipo eliminado');
        } catch(err) {
            console.error('Error eliminando equipo:', err);
            showNotification('❌ Error al eliminar. Revisa la consola.', 'error');
        }
    }
}
