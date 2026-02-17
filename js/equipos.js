// Helper para leer campos del DOM de forma segura
function getVal(id) {
    const el = document.getElementById(id);
    return el ? el.value : '';
}

function saveEquipo(event) {
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
        estado:                  getVal('equipoEstado'),
        observaciones:           getVal('equipoObservaciones'),
        fotos: fotos,
        createdAt: id
            ? (database.equipos.find(e => e._id === id) || {}).createdAt || new Date().toISOString()
            : new Date().toISOString()
    };

    if (id) {
        const index = database.equipos.findIndex(e => e._id === id);
        database.equipos[index] = equipo;
        showNotification('✅ Equipo actualizado');
    } else {
        database.equipos.push(equipo);
        showNotification('✅ Equipo creado');
    }

    saveData();
    renderEquipos();
    if (typeof updateDashboard === 'function') updateDashboard();
    if (typeof updateReportesStats === 'function') updateReportesStats();
    closeModal('modalEquipo');
}

function renderEquipos() {
    const tbody = document.getElementById('equiposTableBody');
    
    if (database.equipos.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="13" class="empty-state">
                    <div class="empty-state-icon">💻</div>
                    <h3>No hay equipos registrados</h3>
                    <p>Haz clic en "Nuevo Equipo" para comenzar</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = database.equipos.map(eq => {
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
            '1': '<span class="badge badge-cat-1">⭐ Cat. 1 - Básico</span>',
            '2': '<span class="badge badge-cat-2">⭐⭐ Cat. 2 - Intermedio</span>',
            '3': '<span class="badge badge-cat-3">⭐⭐⭐ Cat. 3 - Alto Rendimiento</span>'
        };
        
        // Propiedad del equipo
        const propiedad = eq.propiedad || 'Empresa';
        const propiedadBadge = propiedad === 'Empresa' ? 
            '<span class="badge badge-empresa">🏢 Empresa</span>' :
            '<span class="badge badge-propio">👤 Propio</span>';

        // Condición del equipo
        const condicionMap = {
            'Buenas condiciones': { cls: 'badge-success', icon: '✅' },
            'Aceptable':          { cls: 'badge-warning', icon: '🟡' },
            'Malas condiciones':  { cls: 'badge-danger',  icon: '🔴' },
            'Baja definitiva':    { cls: 'badge-danger',  icon: '⛔' }
        };
        const condCfg = condicionMap[eq.condicion];
        const condicionBadge = condCfg
            ? `<span class="badge ${condCfg.cls}">${condCfg.icon} ${eq.condicion}</span>`
            : `<span style="color:#94a3b8;">—</span>`;
        
        // Mostrar la primera foto si existe, o el ícono por defecto
        const fotos = eq.fotos || (eq.foto ? [eq.foto] : []);
        const fotoHTML = fotos.length > 0 ? 
            `<img src="${fotos[0]}" style="width: 40px; height: 40px; border-radius: 8px; object-fit: cover;">` :
            `<div style="width: 40px; height: 40px; border-radius: 8px; background: #f1f5f9; display: flex; align-items: center; justify-content: center;">💻</div>`;
        
        return `
            <tr>
                <td>${fotoHTML}</td>
                <td>${eq.marca}</td>
                <td>${eq.modelo}</td>
                <td>${eq.tipo}</td>
                <td>${categoriaBadges[categoria]}</td>
                <td>${propiedadBadge}</td>
                <td>${eq.numSerie}</td>
                <td>${eq.nombreEquipo || '-'}</td>
                <td><span class="badge ${estadoBadge}">${eq.estado}</span></td>
                <td>${condicionBadge}</td>
                <td>${colaborador ? colaborador.nombre : '-'}</td>
                <td>${eq.observaciones || '-'}</td>
                <td class="action-buttons">
                    <button class="btn btn-sm btn-info" onclick='verDetalleEquipo("${eq._id}")'>👁️ Ver</button>
                    <button class="btn btn-sm btn-primary" onclick='editEquipo("${eq._id}")'>✏️</button>
                    <button class="btn btn-sm btn-danger" onclick='deleteEquipo("${eq._id}")'>🗑️</button>
                </td>
            </tr>
        `;
    }).join('');
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
    saveData();
    closeModal('modalAgendarMantenimiento');
    showNotification('✅ Cita de mantenimiento agendada');
    verDetalleEquipo(equipoId);
}

function marcarCitaCompletada(citaId, equipoId) {
    if (!confirm('¿Confirmar que el mantenimiento fue realizado? Se actualizará la fecha del último mantenimiento.')) return;
    if (!database.citasMantenimiento) database.citasMantenimiento = [];
    const cita = database.citasMantenimiento.find(c => c._id === citaId);
    if (cita) { cita.estado = 'Completada'; cita.completadaAt = new Date().toISOString(); }
    const equipo = database.equipos.find(e => e._id === equipoId);
    if (equipo && cita) equipo.ultimoMantenimiento = cita.fecha;
    saveData();
    showNotification('✅ Mantenimiento marcado como completado');
    verDetalleEquipo(equipoId);
}

function cancelarCita(citaId, equipoId) {
    if (!confirm('¿Cancelar esta cita?')) return;
    if (!database.citasMantenimiento) database.citasMantenimiento = [];
    const cita = database.citasMantenimiento.find(c => c._id === citaId);
    if (cita) cita.estado = 'Cancelada';
    saveData();
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
    
    // Obtener asignación actual
    const asignacionActual = database.asignaciones.find(a => 
        a.equipoId === id && a.estado === 'Activa'
    );
    const colaboradorActual = asignacionActual ? 
        database.colaboradores.find(c => c._id === asignacionActual.colaboradorId) : null;
    
    // Historial de asignaciones
    const historialAsignaciones = database.asignaciones
        .filter(a => a.equipoId === id)
        .sort((a, b) => new Date(b.fechaAsignacion) - new Date(a.fechaAsignacion));
    
    // Fotos del equipo (compatibilidad con versión anterior)
    const fotos = equipo.fotos || (equipo.foto ? [equipo.foto] : []);
    
    const galeriaFotos = fotos.length > 0 ? `
        <div style="margin-bottom: 30px;">
            <h3 style="margin: 0 0 15px 0; color: #1e293b;">📸 Fotos del Estado Actual</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                ${fotos.map((foto, index) => `
                    <div style="position: relative; cursor: pointer;" onclick='ampliarFoto("${foto}")'>
                        <img src="${foto}" style="width: 100%; height: 200px; object-fit: cover; border-radius: 12px; border: 2px solid #e2e8f0;">
                        <div style="position: absolute; bottom: 8px; right: 8px; background: rgba(0,0,0,0.7); color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.75em;">Foto ${index + 1}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    ` : `
        <div style="text-align: center; padding: 30px; background: #f8fafc; border-radius: 12px; margin-bottom: 30px;">
            <div style="font-size: 3em; margin-bottom: 10px;">📷</div>
            <p style="color: #94a3b8;">No hay fotos del estado actual del equipo</p>
        </div>
    `;
    
    const estadoBadge = equipo.estado === 'Disponible' ? 'badge-success' : 
                       equipo.estado === 'Asignado' ? 'badge-info' : 
                       equipo.estado === 'Mantenimiento' ? 'badge-warning' : 'badge-danger';
    
    // Categoría y propiedad
    const categoria = equipo.categoria || '2';
    const categoriaColors = {
        '1': 'background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);',
        '2': 'background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%);',
        '3': 'background: linear-gradient(135deg, #10b981 0%, #059669 100%);'
    };
    const categoriaTexto = {
        '1': '⭐ Categoría 1 - Básico',
        '2': '⭐⭐ Categoría 2 - Intermedio',
        '3': '⭐⭐⭐ Categoría 3 - Alto Rendimiento'
    };
    const categoriaDescripcion = {
        '1': 'Equipo básico para tareas administrativas (Celeron, Pentium, i3, Ryzen 3, 4-8GB RAM)',
        '2': 'Equipo intermedio para multitarea (i5 gen 6-10, Ryzen 5 gen 1-4, 8-16GB RAM)',
        '3': 'Equipo alto rendimiento para desarrollo y diseño (i5 gen 11+, i7, Ryzen 5/7 gen 5+, 16GB+ RAM)'
    };
    
    const propiedad = equipo.propiedad || 'Empresa';
    const propiedadBadge = propiedad === 'Empresa' ? 
        '<span class="badge badge-empresa" style="font-size: 1em; padding: 8px 16px;">🏢 De la empresa</span>' :
        '<span class="badge badge-propio" style="font-size: 1em; padding: 8px 16px;">👤 Equipo propio</span>';
    
    const historialHTML = historialAsignaciones.length > 0 ? historialAsignaciones.map(asig => {
        const colab = database.colaboradores.find(c => c._id === asig.colaboradorId);
        const estadoBadgeAsig = asig.estado === 'Activa' ? 'badge-success' : 'badge-warning';
        
        return `
            <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; background: white;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                    <h4 style="margin: 0; color: #1e293b;">${colab ? colab.nombre : 'N/A'}</h4>
                    <span class="badge ${estadoBadgeAsig}">${asig.estado}</span>
                </div>
                <p style="margin: 4px 0; color: #64748b; font-size: 0.9em;"><strong>Asignado:</strong> ${new Date(asig.fechaAsignacion).toLocaleDateString()}</p>
                ${asig.fechaDevolucion ? `<p style="margin: 4px 0; color: #64748b; font-size: 0.9em;"><strong>Devuelto:</strong> ${new Date(asig.fechaDevolucion).toLocaleDateString()}</p>` : ''}
                ${asig.observaciones ? `<p style="margin: 8px 0 0 0; color: #64748b; font-size: 0.9em; font-style: italic;">${asig.observaciones}</p>` : ''}
            </div>
        `;
    }).join('') : '<p style="color: #94a3b8; text-align: center;">No hay historial de asignaciones</p>';
    
    const content = `
        <div style="text-align: center; margin-bottom: 30px;">
            <div style="display: inline-block; padding: 20px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; color: white;">
                <div style="font-size: 4em; margin-bottom: 10px;">💻</div>
                <h2 style="margin: 0 0 5px 0;">${equipo.marca} ${equipo.modelo}</h2>
                <p style="margin: 0; font-size: 1.1em; opacity: 0.9;">${equipo.tipo}</p>
            </div>
            <div style="margin-top: 15px; display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                <span class="badge ${estadoBadge}" style="font-size: 1em; padding: 8px 16px;">${equipo.estado}</span>
                <span class="badge" style="${categoriaColors[categoria]} color: white; font-size: 1em; padding: 8px 16px;">${categoriaTexto[categoria]}</span>
                ${propiedadBadge}
                ${(() => {
                    const condColors = { 'Buenas condiciones':'#10b981','Aceptable':'#f59e0b','Malas condiciones':'#ef4444','Baja definitiva':'#991b1b' };
                    const condIcons  = { 'Buenas condiciones':'✅','Aceptable':'🟡','Malas condiciones':'🔴','Baja definitiva':'⛔' };
                    if (!equipo.condicion) return '';
                    const c = condColors[equipo.condicion] || '#64748b';
                    return `<span style="background:${c};color:white;font-size:1em;padding:8px 16px;border-radius:20px;font-weight:600;">${condIcons[equipo.condicion]||'❔'} ${equipo.condicion}</span>`;
                })()}
            </div>
        </div>
        
        ${galeriaFotos}
        
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px;">
            <div style="background: #f8fafc; padding: 15px; border-radius: 8px;">
                <h3 style="margin: 0 0 12px 0; color: #1e293b; font-size: 1.1em;">Información General</h3>
                <p style="margin: 6px 0; color: #475569;"><strong>Número de Serie:</strong> ${equipo.numSerie}</p>
                ${equipo.idInterno ? `<p style="margin: 6px 0; color: #475569;"><strong>ID Interno:</strong> ${equipo.idInterno}</p>` : ''}
                ${equipo.nombreEquipo ? `<p style="margin: 6px 0; color: #475569;"><strong>Nombre:</strong> ${equipo.nombreEquipo}</p>` : ''}
                ${equipo.fechaCompra ? `<p style="margin: 6px 0; color: #475569;"><strong>Fecha Compra:</strong> ${new Date(equipo.fechaCompra).toLocaleDateString()}</p>` : ''}
                <p style="margin: 6px 0; color: #475569;"><strong>Propiedad:</strong> ${propiedad === 'Empresa' ? '🏢 De la empresa' : '👤 Equipo propio del colaborador'}</p>
                ${equipo.condicion ? (() => {
                    const condColors2 = { 'Buenas condiciones':'#10b981','Aceptable':'#f59e0b','Malas condiciones':'#ef4444','Baja definitiva':'#991b1b' };
                    const condIcons2  = { 'Buenas condiciones':'✅','Aceptable':'🟡','Malas condiciones':'🔴','Baja definitiva':'⛔' };
                    const c2 = condColors2[equipo.condicion] || '#64748b';
                    return `<p style="margin: 8px 0 0 0; color: #475569;"><strong>Condición:</strong>
                        <span style="display:inline-block;margin-left:6px;background:${c2}22;color:${c2};border:1px solid ${c2}66;border-radius:20px;padding:2px 12px;font-size:0.85em;font-weight:700;">${condIcons2[equipo.condicion]||'❔'} ${equipo.condicion}</span>
                    </p>`;
                })() : ''}
            </div>
            
            <div style="background: #f8fafc; padding: 15px; border-radius: 8px;">
                <h3 style="margin: 0 0 12px 0; color: #1e293b; font-size: 1.1em;">Especificaciones</h3>
                ${equipo.procesador ? `<p style="margin: 6px 0; color: #475569;"><strong>Procesador:</strong> ${equipo.procesador}</p>` : ''}
                ${equipo.ram ? `<p style="margin: 6px 0; color: #475569;"><strong>RAM:</strong> ${equipo.ram} GB</p>` : ''}
                ${equipo.almacenamiento ? `<p style="margin: 6px 0; color: #475569;"><strong>Almacenamiento:</strong> ${equipo.almacenamiento}</p>` : ''}
                ${equipo.so ? `<p style="margin: 6px 0; color: #475569;"><strong>Sistema Operativo:</strong> ${equipo.so}</p>` : ''}
                <div style="margin: 12px 0 0 0; padding: 10px; ${categoriaColors[categoria]} color: white; border-radius: 8px;">
                    <p style="margin: 0; text-align: center; font-weight: 600; font-size: 1.05em;">${categoriaTexto[categoria]}</p>
                    <p style="margin: 6px 0 0 0; text-align: center; font-size: 0.85em; opacity: 0.95;">${categoriaDescripcion[categoria]}</p>
                </div>
            </div>
        </div>
        
        ${generarSeccionMantenimiento(equipo)}
        
        ${generarSeccionCompra(equipo)}
        
        ${colaboradorActual ? `
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 12px; margin-bottom: 30px; color: white;">
                <h3 style="margin: 0 0 12px 0; font-size: 1.2em;">👤 Asignado Actualmente a:</h3>
                <p style="margin: 6px 0; font-size: 1.1em;"><strong>${colaboradorActual.nombre}</strong></p>
                <p style="margin: 6px 0; opacity: 0.9;">${colaboradorActual.departamento} - ${colaboradorActual.puesto}</p>
                <p style="margin: 6px 0; opacity: 0.9;">Desde: ${new Date(asignacionActual.fechaAsignacion).toLocaleDateString()}</p>
            </div>
        ` : ''}
        
        ${equipo.observaciones ? `
            <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin-bottom: 30px; border-left: 4px solid #f59e0b;">
                <h3 style="margin: 0 0 8px 0; color: #92400e; font-size: 1.1em;">📝 Observaciones</h3>
                <p style="margin: 0; color: #78350f;">${equipo.observaciones}</p>
            </div>
        ` : ''}
        
        <h3 style="margin: 25px 0 15px 0; color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">📜 Historial de Asignaciones</h3>
        <div style="display: grid; gap: 12px;">
            ${historialHTML}
        </div>
    `;
    
    document.getElementById('detalleEquipoContent').innerHTML = content;
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
    document.getElementById('equipoEstado').value = equipo.estado;
    document.getElementById('equipoObservaciones').value = equipo.observaciones || '';
    
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

function deleteEquipo(id) {
    const asignaciones = database.asignaciones.filter(a => a.equipoId === id && a.estado === 'Activa');
    
    if (asignaciones.length > 0) {
        showNotification('❌ No se puede eliminar. El equipo está asignado.', 'error');
        return;
    }
    
    if (confirm('¿Estás seguro de eliminar este equipo?')) {
        database.equipos = database.equipos.filter(e => e._id !== id);
        saveData();
        renderEquipos();
        updateDashboard();
        showNotification('✅ Equipo eliminado');
    }
}

function filterEquipos() {
    const searchTerm = document.getElementById('searchEquipo').value.toLowerCase();
    const filterEstado = document.getElementById('filterEstado').value;
    const filterCategoria = document.getElementById('filterCategoria').value;
    const filterPropiedad = document.getElementById('filterPropiedad').value;
    const rows = document.querySelectorAll('#equiposTableBody tr');
    
    rows.forEach(row => {
        // Si es la fila de "empty state", no filtrar
        if (row.querySelector('.empty-state')) {
            return;
        }
        
        const text = row.textContent.toLowerCase();
        const cells = row.querySelectorAll('td');
        
        // Obtener valores de las celdas
        const estado = cells[8]?.textContent || '';
        const categoriaCell = cells[4]?.textContent || '';
        const propiedadCell = cells[5]?.textContent || '';
        
        // Extraer número de categoría del texto
        let categoriaNum = '';
        if (categoriaCell.includes('Cat. 1')) categoriaNum = '1';
        else if (categoriaCell.includes('Cat. 2')) categoriaNum = '2';
        else if (categoriaCell.includes('Cat. 3')) categoriaNum = '3';
        
        // Determinar propiedad
        let propiedadValue = '';
        if (propiedadCell.includes('Empresa')) propiedadValue = 'Empresa';
        else if (propiedadCell.includes('Propio')) propiedadValue = 'Propio';
        
        // Aplicar filtros
        const matchesSearch = text.includes(searchTerm);
        const matchesEstado = !filterEstado || estado.includes(filterEstado);
        const matchesCategoria = !filterCategoria || categoriaNum === filterCategoria;
        const matchesPropiedad = !filterPropiedad || propiedadValue === filterPropiedad;
        
        row.style.display = (matchesSearch && matchesEstado && matchesCategoria && matchesPropiedad) ? '' : 'none';
    });
}

