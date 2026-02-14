// EQUIPOS
function saveEquipo(event) {
    event.preventDefault();
    
    const id = document.getElementById('equipoId').value;
    const fotosValue = document.getElementById('equipoFotos').value;
    const fotos = fotosValue ? JSON.parse(fotosValue) : [];
    
    const equipo = {
        _id: id || 'EQ' + Date.now(),
        tipo: document.getElementById('equipoTipo').value,
        marca: document.getElementById('equipoMarca').value,
        modelo: document.getElementById('equipoModelo').value,
        numSerie: document.getElementById('equipoNumSerie').value,
        nombreEquipo: document.getElementById('equipoNombre').value,
        idInterno: document.getElementById('IdequipoInterno').value,
        categoria: document.getElementById('equipoCategoria').value,
        propiedad: document.getElementById('equipoPropiedad').value,
        procesador: document.getElementById('equipoProcesador').value,
        ram: document.getElementById('equipoRam').value,
        almacenamiento: document.getElementById('equipoAlmacenamiento').value,
        so: document.getElementById('equipoSO').value,
        fechaCompra: document.getElementById('equipoFechaCompra').value,
        proveedor: document.getElementById('equipoProveedor').value || '',
        precio: document.getElementById('equipoPrecio').value || '',
        factura: document.getElementById('equipoFactura').value || '',
        garantiaMeses: document.getElementById('equipoGarantia').value || '',
        ultimoMantenimiento: document.getElementById('equipoUltimoMantenimiento').value || '',
        frecuenciaMantenimiento: document.getElementById('equipoFrecuenciaMantenimiento').value || '',
        estado: document.getElementById('equipoEstado').value,
        observaciones: document.getElementById('equipoObservaciones').value,
        fotos: fotos,
        createdAt: id ? database.equipos.find(e => e._id === id).createdAt : new Date().toISOString()
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
    updateDashboard();
    updateReportesStats();
    closeModal('modalEquipo');
}

function renderEquipos() {
    const tbody = document.getElementById('equiposTableBody');
    
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
        
        // Mostrar la primera foto si existe, o el ícono por defecto
        const fotos = eq.fotos || (eq.foto ? [eq.foto] : []); // Compatibilidad con versión anterior
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
                <td>${colaborador ? colaborador.nombre : '-'}</td>
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
    // Si no hay datos de mantenimiento, mostrar mensaje informativo
    if (!equipo.ultimoMantenimiento && !equipo.frecuenciaMantenimiento) {
        return `
            <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin-bottom: 30px; border: 2px dashed #cbd5e0;">
                <h3 style="margin: 0 0 10px 0; color: #64748b; display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 1.5em;">🔧</span>
                    Información de Mantenimiento
                </h3>
                <p style="margin: 0; color: #94a3b8; font-style: italic;">
                    No se ha registrado información de mantenimiento para este equipo.
                </p>
            </div>
        `;
    }
    
    const diasRestantes = diasHastaMantenimiento(equipo.ultimoMantenimiento, equipo.frecuenciaMantenimiento);
    const vencido = mantenimientoVencido(equipo.ultimoMantenimiento, equipo.frecuenciaMantenimiento);
    const proximoMtto = calcularProximoMantenimiento(equipo.ultimoMantenimiento, equipo.frecuenciaMantenimiento);
    
    let statusColor = '#10b981'; // Verde
    let statusIcon = '✅';
    let statusTexto = 'Al corriente';
    let bgColor = '#f0fdf4'; // Fondo verde claro
    
    if (vencido) {
        statusColor = '#ef4444'; // Rojo
        statusIcon = '⚠️';
        statusTexto = 'VENCIDO';
        bgColor = '#fee2e2'; // Fondo rojo claro
    } else if (diasRestantes !== null && diasRestantes <= 30) {
        statusColor = '#f59e0b'; // Amarillo
        statusIcon = '⏰';
        statusTexto = 'Próximo';
        bgColor = '#fef3c7'; // Fondo amarillo claro
    }
    
    const frecuenciaTexto = {
        '3': 'Cada 3 meses',
        '6': 'Cada 6 meses',
        '12': 'Cada 12 meses'
    };
    
    return `
        <div style="background: ${bgColor}; padding: 25px; border-radius: 12px; margin-bottom: 30px; border-left: 6px solid ${statusColor}; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="margin: 0; color: #1e293b; display: flex; align-items: center; gap: 10px; font-size: 1.3em;">
                    <span style="font-size: 1.4em;">🔧</span>
                    Información de Mantenimiento
                </h3>
                <span style="background: ${statusColor}; color: white; padding: 8px 16px; border-radius: 20px; font-size: 0.9em; font-weight: 600; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                    ${statusIcon} ${statusTexto}
                </span>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; margin-bottom: ${vencido ? '20px' : '0'};">
                <div style="background: white; padding: 15px; border-radius: 10px; border: 1px solid #e2e8f0;">
                    <p style="margin: 0 0 8px 0; color: #64748b; font-size: 0.85em; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">📅 Último Mantenimiento</p>
                    <p style="margin: 0; color: #1e293b; font-weight: 700; font-size: 1.3em;">
                        ${equipo.ultimoMantenimiento ? new Date(equipo.ultimoMantenimiento).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' }) : 'No registrado'}
                    </p>
                </div>
                
                <div style="background: white; padding: 15px; border-radius: 10px; border: 1px solid #e2e8f0;">
                    <p style="margin: 0 0 8px 0; color: #64748b; font-size: 0.85em; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">⏱️ Frecuencia</p>
                    <p style="margin: 0; color: #1e293b; font-weight: 700; font-size: 1.3em;">
                        ${equipo.frecuenciaMantenimiento ? frecuenciaTexto[equipo.frecuenciaMantenimiento] : 'No definida'}
                    </p>
                </div>
                
                ${proximoMtto ? `
                    <div style="background: white; padding: 15px; border-radius: 10px; border: 2px solid ${statusColor};">
                        <p style="margin: 0 0 8px 0; color: #64748b; font-size: 0.85em; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">🔜 Próximo Mantenimiento</p>
                        <p style="margin: 0; color: ${statusColor}; font-weight: 700; font-size: 1.3em;">
                            ${proximoMtto.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                    </div>
                    
                    <div style="background: white; padding: 15px; border-radius: 10px; border: 2px solid ${statusColor};">
                        <p style="margin: 0 0 8px 0; color: #64748b; font-size: 0.85em; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">⏳ Días Restantes</p>
                        <p style="margin: 0; color: ${statusColor}; font-weight: 700; font-size: 1.8em;">
                            ${vencido ? Math.abs(diasRestantes) : diasRestantes}
                        </p>
                        <p style="margin: 4px 0 0 0; color: #64748b; font-size: 0.8em;">
                            ${vencido ? 'días de retraso' : 'días restantes'}
                        </p>
                    </div>
                ` : `
                    <div style="background: white; padding: 15px; border-radius: 10px; border: 1px solid #e2e8f0;">
                        <p style="margin: 0 0 8px 0; color: #64748b; font-size: 0.85em; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">🔜 Próximo Mantenimiento</p>
                        <p style="margin: 0; color: #94a3b8; font-style: italic; font-size: 1.1em;">
                            No se puede calcular
                        </p>
                        <p style="margin: 4px 0 0 0; color: #94a3b8; font-size: 0.8em;">
                            Requiere último mantenimiento y frecuencia
                        </p>
                    </div>
                `}
            </div>
            
            ${vencido ? `
                <div style="margin-top: 0; padding: 15px; background: white; border-radius: 10px; border: 2px solid #ef4444;">
                    <p style="margin: 0; color: #991b1b; font-weight: 700; font-size: 1.05em; display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 1.5em;">⚠️</span>
                        <span>¡ATENCIÓN! Este equipo requiere mantenimiento urgente.</span>
                    </p>
                    <p style="margin: 8px 0 0 0; color: #7f1d1d; font-size: 0.95em;">
                        Han pasado <strong>${Math.abs(diasRestantes)} días</strong> desde la fecha programada para mantenimiento.
                    </p>
                </div>
            ` : diasRestantes !== null && diasRestantes <= 30 ? `
                <div style="margin-top: 0; padding: 15px; background: white; border-radius: 10px; border: 2px solid #f59e0b;">
                    <p style="margin: 0; color: #92400e; font-weight: 600; font-size: 1em; display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 1.3em;">⏰</span>
                        <span>El mantenimiento está próximo. Considera programarlo pronto.</span>
                    </p>
                </div>
            ` : ''}
        </div>
    `;
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

