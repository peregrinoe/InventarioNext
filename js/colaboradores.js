// ================================
// FUNCIONES PARA COLABORADORES
// ================================

// Variable global para tracking de ordenamiento
let ordenColaboradores = {
    campo: 'nombre',
    direccion: 'asc'
};

async function saveColaborador(event) {
    event.preventDefault();
    
    const id = document.getElementById('colaboradorId').value;
    const colaborador = {
        _id: id || 'COL' + Date.now(),
        nombre: document.getElementById('colaboradorNombre').value,
        email: document.getElementById('colaboradorEmail').value,
        telefono: document.getElementById('colaboradorTelefono').value,
        departamento: document.getElementById('colaboradorDepartamento').value,
        puesto: document.getElementById('colaboradorPuesto').value,
        fechaIngreso: document.getElementById('colaboradorFechaIngreso').value,
        jefeInmediato: document.getElementById('colaboradorJefeInmediato').value,
        esExterno: document.getElementById('colaboradorEsExterno')?.checked || false, // NUEVO CAMPO
        foto: document.getElementById('colaboradorFoto').value || '',
        createdAt: id ? (database.colaboradores.find(c => c._id === id) || {}).createdAt || new Date().toISOString() : new Date().toISOString()
    };
    
    try {
        await upsertColaborador(colaborador);
        if (id) {
            const index = database.colaboradores.findIndex(c => c._id === id);
            if (index !== -1) database.colaboradores[index] = colaborador;
            showNotification('✅ Colaborador actualizado');
        } else {
            database.colaboradores.push(colaborador);
            showNotification('✅ Colaborador creado');
        }
        renderColaboradores();
        updateDashboard();
        closeModal('modalColaborador');
    } catch(e) {
        console.error('Error guardando colaborador:', e);
        showNotification('❌ Error al guardar. Revisa la consola.', 'error');
    }
}

// NUEVA FUNCIÓN: Ordenar colaboradores
function ordenarColaboradores(campo) {
    // Si es el mismo campo, invertir dirección
    if (ordenColaboradores.campo === campo) {
        ordenColaboradores.direccion = ordenColaboradores.direccion === 'asc' ? 'desc' : 'asc';
    } else {
        // Si es campo nuevo, ordenar ascendente
        ordenColaboradores.campo = campo;
        ordenColaboradores.direccion = 'asc';
    }
    
    renderColaboradores();
}

function renderColaboradores() {
    const tbody = document.getElementById('colaboradoresTableBody');
    
    if (database.colaboradores.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="empty-state">
                    <div class="empty-state-icon">👥</div>
                    <h3>No hay colaboradores registrados</h3>
                    <p>Haz clic en "Nuevo Colaborador" para comenzar</p>
                </td>
            </tr>
        `;
        return;
    }
    
    // Clonar array para no mutar el original
    let colaboradoresOrdenados = [...database.colaboradores];
    
    // Aplicar ordenamiento
    colaboradoresOrdenados.sort((a, b) => {
        let valorA, valorB;
        
        switch(ordenColaboradores.campo) {
            case 'nombre':
                valorA = a.nombre.toLowerCase();
                valorB = b.nombre.toLowerCase();
                break;
            case 'email':
                valorA = a.email.toLowerCase();
                valorB = b.email.toLowerCase();
                break;
            case 'departamento':
                valorA = a.departamento.toLowerCase();
                valorB = b.departamento.toLowerCase();
                break;
            case 'puesto':
                valorA = a.puesto.toLowerCase();
                valorB = b.puesto.toLowerCase();
                break;
            case 'tipo':
                valorA = a.esExterno ? 'z_externo' : 'a_interno'; // Para que externos vayan al final
                valorB = b.esExterno ? 'z_externo' : 'a_interno';
                break;
            case 'equipos':
                valorA = database.asignaciones.filter(asig => asig.colaboradorId === a._id && asig.estado === 'Activa').length;
                valorB = database.asignaciones.filter(asig => asig.colaboradorId === b._id && asig.estado === 'Activa').length;
                break;
            default:
                valorA = a.nombre.toLowerCase();
                valorB = b.nombre.toLowerCase();
        }
        
        if (ordenColaboradores.direccion === 'asc') {
            return valorA > valorB ? 1 : valorA < valorB ? -1 : 0;
        } else {
            return valorA < valorB ? 1 : valorA > valorB ? -1 : 0;
        }
    });
    
    // Actualizar íconos de ordenamiento en los headers
    actualizarIconosOrdenamiento();
    
    tbody.innerHTML = colaboradoresOrdenados.map(col => {
        const equiposAsignados = database.asignaciones.filter(a => 
            a.colaboradorId === col._id && a.estado === 'Activa'
        ).length;
        
        const licenciasAsignadas = database.licenciasAsignaciones.filter(la => 
            la.colaboradorId === col._id
        ).length;
        
        const fotoHTML = col.foto ? 
            `<img src="${col.foto}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover">` :
            `<div style="width: 40px; height: 40px; border-radius: 50%; background: #667eea; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold;">${col.nombre.charAt(0)}</div>`;
        
        // Badge para tipo de colaborador
        const tipoBadge = col.esExterno ? 
            '<span class="badge badge-warning">Externo</span>' : 
            '<span class="badge badge-info">Interno</span>';
        
        return `
            <tr>
                <td>${fotoHTML}</td>
                <td><strong>${col.nombre}</strong></td>
                <td>${col.email}</td>
                <td>${col.departamento}</td>
                <td>${col.puesto}</td>
                <td>${tipoBadge}</td>
                <td><span class="badge badge-info">${equiposAsignados} equipo(s)</span></td>
                <td><span class="badge badge-success">${licenciasAsignadas} licencia(s)</span></td>
                <td class="action-buttons">
                    ${equiposAsignados > 0 ? `<button class="btn btn-sm btn-warning" onclick='descargarCartaResponsiva("${col._id}")' title="Descargar carta responsiva">📄 Carta</button>` : ''}
                    <button class="btn btn-sm btn-info" onclick='verDetalleColaborador("${col._id}")'>👁️ Ver</button>
                    <button class="btn btn-sm btn-primary" onclick='editColaborador("${col._id}")'>✏️</button>
                    <button class="btn btn-sm btn-danger" onclick='deleteColaborador("${col._id}")'>🗑️</button>
                </td>
            </tr>
        `;
    }).join('');
}

// Actualizar íconos de ordenamiento en headers
function actualizarIconosOrdenamiento() {
    // Remover todos los íconos existentes
    document.querySelectorAll('.sort-icon').forEach(icon => icon.remove());
    
    // Agregar ícono al header activo
    const headers = {
        'nombre': document.querySelector('th[data-sort="nombre"]'),
        'email': document.querySelector('th[data-sort="email"]'),
        'departamento': document.querySelector('th[data-sort="departamento"]'),
        'puesto': document.querySelector('th[data-sort="puesto"]'),
        'tipo': document.querySelector('th[data-sort="tipo"]'),
        'equipos': document.querySelector('th[data-sort="equipos"]')
    };
    
    const headerActivo = headers[ordenColaboradores.campo];
    if (headerActivo) {
        const icono = document.createElement('span');
        icono.className = 'sort-icon';
        icono.textContent = ordenColaboradores.direccion === 'asc' ? ' ▲' : ' ▼';
        icono.style.fontSize = '0.8em';
        headerActivo.appendChild(icono);
    }
}

function editColaborador(id) {
    const colaborador = database.colaboradores.find(c => c._id === id);
    
    document.getElementById('colaboradorId').value = colaborador._id;
    document.getElementById('colaboradorNombre').value = colaborador.nombre;
    document.getElementById('colaboradorEmail').value = colaborador.email;
    document.getElementById('colaboradorTelefono').value = colaborador.telefono || '';
    document.getElementById('colaboradorDepartamento').value = colaborador.departamento;
    document.getElementById('colaboradorPuesto').value = colaborador.puesto;
    document.getElementById('colaboradorFechaIngreso').value = colaborador.fechaIngreso || '';
    document.getElementById('colaboradorJefeInmediato').value = colaborador.jefeInmediato || '';
    
    // NUEVO: Establecer checkbox de externo
    const checkboxExterno = document.getElementById('colaboradorEsExterno');
    if (checkboxExterno) {
        checkboxExterno.checked = colaborador.esExterno || false;
    }
    
    if (colaborador.foto) {
        document.getElementById('colaboradorFoto').value = colaborador.foto;
        document.getElementById('colaboradorFotoPreview').innerHTML = 
            `<img src="${colaborador.foto}" style="max-width: 200px; max-height: 200px; border-radius: 8px; border: 2px solid #e2e8f0;">`;
    }
    
    document.getElementById('modalColaboradorTitle').textContent = 'Editar Colaborador';
    openModal('modalColaborador');
}

async function deleteColaborador(id) {
    const asignaciones = database.asignaciones.filter(a => a.colaboradorId === id && a.estado === 'Activa');
    
    if (asignaciones.length > 0) {
        showNotification('❌ No se puede eliminar. El colaborador tiene equipos asignados.', 'error');
        return;
    }
    
    if (confirm('¿Estás seguro de eliminar este colaborador?')) {
        try {
            await deleteColaboradorDB(id);
            database.colaboradores = database.colaboradores.filter(c => c._id !== id);
            database.asignaciones = database.asignaciones.filter(a => a.colaboradorId !== id);
            database.licenciasAsignaciones = database.licenciasAsignaciones.filter(la => la.colaboradorId !== id);
            renderColaboradores();
            updateDashboard();
            showNotification('✅ Colaborador eliminado');
        } catch(e) {
            console.error('Error eliminando colaborador:', e);
            showNotification('❌ Error al eliminar. Revisa la consola.', 'error');
        }
    }
}

function filterColaboradores() {
    const searchTerm = document.getElementById('searchColaborador').value.toLowerCase();
    const tipoFiltro = document.getElementById('filterTipoColaborador')?.value || 'todos';
    const rows = document.querySelectorAll('#colaboradoresTableBody tr');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        const matchesSearch = text.includes(searchTerm);
        
        // Filtro por tipo (interno/externo)
        let matchesTipo = true;
        if (tipoFiltro !== 'todos') {
            const badges = row.querySelectorAll('.badge');
            const hasExternoBadge = Array.from(badges).some(badge => badge.textContent.includes('Externo'));
            const hasInternoBadge = Array.from(badges).some(badge => badge.textContent.includes('Interno'));
            
            if (tipoFiltro === 'externo') {
                matchesTipo = hasExternoBadge;
            } else if (tipoFiltro === 'interno') {
                matchesTipo = hasInternoBadge;
            }
        }
        
        row.style.display = (matchesSearch && matchesTipo) ? '' : 'none';
    });
}

// NUEVA FUNCIÓN: Descargar carta responsiva
function descargarCartaResponsiva(colaboradorId) {
    const colaborador = database.colaboradores.find(c => c._id === colaboradorId);
    if (!colaborador) {
        showNotification('❌ Colaborador no encontrado', 'error');
        return;
    }
    
    // Obtener equipos asignados activamente
    const asignacionesActivas = database.asignaciones.filter(a => 
        a.colaboradorId === colaboradorId && a.estado === 'Activa'
    );
    
    if (asignacionesActivas.length === 0) {
        showNotification('❌ El colaborador no tiene equipos asignados actualmente', 'error');
        return;
    }
    
    // Generar HTML de la carta responsiva
    let equiposHTML = '';
    asignacionesActivas.forEach((asig, index) => {
        const equipo = database.equipos.find(e => e._id === asig.equipoId);
        if (equipo) {
            equiposHTML += `
                <tr>
                    <td style="border: 1px solid #ddd; padding: 8px;">${index + 1}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">${equipo.tipo}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">${equipo.marca} ${equipo.modelo}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">${equipo.numSerie}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">${new Date(asig.fechaAsignacion).toLocaleDateString()}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">${equipo.procesador || 'N/A'}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">${equipo.ram ? equipo.ram + ' GB' : 'N/A'}</td>
                </tr>
            `;
        }
    });
    
    const tipoColaborador = colaborador.esExterno ? 'EXTERNO' : 'INTERNO';
    const fechaActual = new Date().toLocaleDateString('es-MX', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    const cartaHTML = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Carta Responsiva - ${colaborador.nombre}</title>
    <style>
        @media print {
            body { margin: 0; }
            .no-print { display: none; }
        }
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 20px auto;
            padding: 20px;
            line-height: 1.6;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 3px solid #667eea;
            padding-bottom: 20px;
        }
        .header h1 {
            color: #667eea;
            margin: 0;
            font-size: 24px;
        }
        .header p {
            margin: 5px 0;
            color: #666;
        }
        .tipo-badge {
            display: inline-block;
            padding: 5px 15px;
            border-radius: 20px;
            font-weight: bold;
            font-size: 12px;
            margin-top: 10px;
        }
        .tipo-interno {
            background: #dbeafe;
            color: #1e40af;
        }
        .tipo-externo {
            background: #fef3c7;
            color: #92400e;
        }
        .info-section {
            margin: 20px 0;
            padding: 15px;
            background: #f8fafc;
            border-radius: 8px;
        }
        .info-section h3 {
            margin-top: 0;
            color: #1e293b;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 10px;
        }
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin: 15px 0;
        }
        .info-item {
            padding: 8px;
        }
        .info-item strong {
            color: #475569;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        th {
            background: #667eea;
            color: white;
            padding: 12px;
            text-align: left;
            font-weight: 600;
        }
        td {
            border: 1px solid #ddd;
            padding: 8px;
        }
        tr:nth-child(even) {
            background: #f8fafc;
        }
        .responsabilidades {
            margin: 20px 0;
            padding: 15px;
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            border-radius: 4px;
        }
        .responsabilidades h3 {
            color: #92400e;
            margin-top: 0;
        }
        .responsabilidades ol {
            margin: 10px 0;
            padding-left: 20px;
        }
        .responsabilidades li {
            margin: 8px 0;
            color: #78350f;
        }
        .firmas {
            margin-top: 60px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
        }
        .firma {
            text-align: center;
        }
        .firma-linea {
            border-top: 2px solid #000;
            margin: 60px 20px 10px 20px;
        }
        .firma p {
            margin: 5px 0;
            font-size: 14px;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #e2e8f0;
            text-align: center;
            color: #94a3b8;
            font-size: 12px;
        }
        .btn-imprimir {
            background: #667eea;
            color: white;
            padding: 12px 30px;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            cursor: pointer;
            margin: 20px 0;
            display: block;
            margin-left: auto;
            margin-right: auto;
        }
        .btn-imprimir:hover {
            background: #5568d3;
        }
    </style>
</head>
<body>
    <button onclick="window.print()" class="btn-imprimir no-print">🖨️ Imprimir / Guardar PDF</button>
    
    <div class="header">
        <h1>CARTA RESPONSIVA DE EQUIPOS DE CÓMPUTO</h1>
        <p style="font-weight: bold; margin-top: 15px;">Fecha: ${fechaActual}</p>
        <span class="tipo-badge ${colaborador.esExterno ? 'tipo-externo' : 'tipo-interno'}">
            COLABORADOR ${tipoColaborador}
        </span>
    </div>

    <div class="info-section">
        <h3>📋 Información del Colaborador</h3>
        <div class="info-grid">
            <div class="info-item">
                <strong>Nombre:</strong> ${colaborador.nombre}
            </div>
            <div class="info-item">
                <strong>Email:</strong> ${colaborador.email}
            </div>
            <div class="info-item">
                <strong>Departamento:</strong> ${colaborador.departamento}
            </div>
            <div class="info-item">
                <strong>Puesto:</strong> ${colaborador.puesto}
            </div>
            ${colaborador.telefono ? `
            <div class="info-item">
                <strong>Teléfono:</strong> ${colaborador.telefono}
            </div>
            ` : ''}
            ${colaborador.jefeInmediato ? `
            <div class="info-item">
                <strong>Jefe Inmediato:</strong> ${colaborador.jefeInmediato}
            </div>
            ` : ''}
        </div>
    </div>

    <div class="info-section">
        <h3>💻 Equipos Asignados</h3>
        <table>
            <thead>
                <tr>
                    <th>#</th>
                    <th>Tipo</th>
                    <th>Marca y Modelo</th>
                    <th>Número de Serie</th>
                    <th>Fecha Asignación</th>
                    <th>Procesador</th>
                    <th>RAM</th>
                </tr>
            </thead>
            <tbody>
                ${equiposHTML}
            </tbody>
        </table>
    </div>

    <div class="responsabilidades">
        <h3>⚠️ Responsabilidades del Colaborador</h3>
        <ol>
            <li>Hacer uso adecuado y responsable del equipo asignado.</li>
            <li>Mantener el equipo en buen estado y reportar cualquier falla o daño inmediatamente.</li>
            <li>No realizar modificaciones al hardware o software sin autorización previa.</li>
            <li>Proteger el equipo contra pérdida, robo o daño.</li>
            <li>Devolver el equipo en las mismas condiciones en que fue recibido (desgaste normal por uso esperado).</li>
            <li>En caso de terminación de la relación laboral, devolver el equipo en un máximo de 2 días hábiles.</li>
            <li>Cumplir con las políticas de seguridad informática de la empresa.</li>
            <li>No instalar software no autorizado o de procedencia dudosa.</li>
        </ol>
    </div>

    <p style="margin: 30px 0; text-align: justify; color: #475569;">
        Por medio de la presente, yo <strong>${colaborador.nombre}</strong>, 
        colaborador ${tipoColaborador.toLowerCase()} con puesto de <strong>${colaborador.puesto}</strong> 
        en el departamento de <strong>${colaborador.departamento}</strong>, manifiesto que he recibido 
        el(los) equipo(s) de cómputo descrito(s) en la tabla anterior en buenas condiciones de funcionamiento 
        y me comprometo a hacer uso responsable del mismo, así como a cumplir con todas las responsabilidades 
        anteriormente descritas.
    </p>

    <div class="firmas">
        <div class="firma">
            <div class="firma-linea"></div>
            <p><strong>${colaborador.nombre}</strong></p>
            <p>Colaborador ${tipoColaborador}</p>
            <p>${colaborador.puesto}</p>
        </div>
        <div class="firma">
            <div class="firma-linea"></div>
            <p><strong>Responsable de TI</strong></p>
            <p>Departamento de Tecnología</p>
            <p>Firma y Sello</p>
        </div>
    </div>

    <div class="footer">
        <p>Este documento es generado automáticamente por el Sistema de Inventario</p>
        <p>Fecha de generación: ${new Date().toLocaleString('es-MX')}</p>
        <p>Total de equipos asignados: ${asignacionesActivas.length}</p>
    </div>
</body>
</html>
    `;
    
    // Crear ventana nueva con la carta
    const ventana = window.open('', '_blank');
    ventana.document.write(cartaHTML);
    ventana.document.close();
    
    showNotification('✅ Carta responsiva generada. Puedes imprimirla o guardarla como PDF.', 'success');
}

function verDetalleColaborador(id) {
    const colaborador = database.colaboradores.find(c => c._id === id);
    if (!colaborador) return;
    
    const asignacionesActivas = database.asignaciones.filter(a => 
        a.colaboradorId === id && a.estado === 'Activa'
    );
    
    const historialAsignaciones = database.asignaciones
        .filter(a => a.colaboradorId === id)
        .sort((a, b) => new Date(b.fechaAsignacion) - new Date(a.fechaAsignacion));
    
    const licenciasAsignacionesCol = database.licenciasAsignaciones.filter(la => 
        la.colaboradorId === id
    );
    
    const equiposHTML = asignacionesActivas.map(asig => {
        const equipo = database.equipos.find(e => e._id === asig.equipoId);
        if (!equipo) return '';
        
        const fotos = equipo.fotos || (equipo.foto ? [equipo.foto] : []);
        const fotoEquipo = fotos.length > 0 ? 
            `<img src="${fotos[0]}" style="width: 80px; height: 80px; border-radius: 8px; object-fit: cover;">` :
            `<div style="width: 80px; height: 80px; border-radius: 8px; background: #f1f5f9; display: flex; align-items: center; justify-content: center; font-size: 2em;">💻</div>`;
        
        return `
            <div style="border: 2px solid #e2e8f0; border-radius: 12px; padding: 15px; background: #f8fafc;">
                <div style="display: flex; gap: 15px; align-items: start;">
                    ${fotoEquipo}
                    <div style="flex: 1;">
                        <h4 style="margin: 0 0 8px 0; color: #1e293b;">${equipo.marca} ${equipo.modelo}</h4>
                        <p style="margin: 4px 0; color: #64748b;"><strong>Tipo:</strong> ${equipo.tipo}</p>
                        <p style="margin: 4px 0; color: #64748b;"><strong>Serie:</strong> ${equipo.numSerie}</p>
                        <p style="margin: 4px 0; color: #64748b;"><strong>Asignado:</strong> ${new Date(asig.fechaAsignacion).toLocaleDateString()}</p>
                        ${equipo.procesador ? `<p style="margin: 4px 0; color: #64748b;"><strong>Procesador:</strong> ${equipo.procesador}</p>` : ''}
                        ${equipo.ram ? `<p style="margin: 4px 0; color: #64748b;"><strong>RAM:</strong> ${equipo.ram} GB</p>` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    const historialHTML = historialAsignaciones.length > 0 ? historialAsignaciones.map(asig => {
        const equipo = database.equipos.find(e => e._id === asig.equipoId);
        if (!equipo) return '';
        
        const estadoBadgeAsig = asig.estado === 'Activa' ? 'badge-success' : 'badge-warning';
        
        return `
            <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; background: white; margin-bottom: 10px;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                    <h4 style="margin: 0; color: #1e293b;">Marca: ${equipo.marca} Modelo: ${equipo.modelo}</h4>
                    <span class="badge ${estadoBadgeAsig}">${asig.estado}</span>
                </div>
                <h5 style="margin: 0; color: #64748b;">Número de serie: ${equipo.numSerie}</h5>
                <p style="margin: 4px 0; color: #64748b; font-size: 0.9em;">
                    <strong>Asignado:</strong> ${new Date(asig.fechaAsignacion).toLocaleDateString()}
                    ${asig.fechaDevolucion ? ` | <strong>Devuelto:</strong> ${new Date(asig.fechaDevolucion).toLocaleDateString()}` : ''}
                </p>
            </div>
        `;
    }).join('') : '<p style="color: #94a3b8; text-align: center; padding: 20px;">Sin historial de asignaciones</p>';
    
    const licenciasHTML = licenciasAsignacionesCol.length > 0 ? licenciasAsignacionesCol.map(la => {
        const licencia = database.licencias.find(l => l._id === la.licenciaId);
        if (!licencia) return '';
        
        const estadoBadgeLic = licencia.estado === 'Activa' ? 'badge-success' : 
                              licencia.estado === 'Vencida' ? 'badge-danger' : 'badge-info';
        
        return `
            <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; background: white; margin-bottom: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div>
                        <h4 style="margin: 0 0 4px 0; color: #1e293b;">${licencia.software}</h4>
                        <p style="margin: 0; color: #64748b; font-size: 0.9em;">${licencia.tipo}</p>
                    </div>
                    <span class="badge ${estadoBadgeLic}">${licencia.estado}</span>
                </div>
            </div>
        `;
    }).join('') : '<p style="color: #94a3b8; text-align: center; padding: 20px;">Sin licencias asignadas</p>';
    
    const fotoColaborador = colaborador.foto ? 
        `<img src="${colaborador.foto}" style="width: 120px; height: 120px; border-radius: 50%; object-fit: cover; border: 4px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">` :
        `<div style="width: 120px; height: 120px; border-radius: 50%; background: #667eea; color: white; display: flex; align-items: center; justify-content: center; font-size: 3em; font-weight: bold; border: 4px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">${colaborador.nombre.charAt(0)}</div>`;
    
    const tipoBadge = colaborador.esExterno ? 
        '<span class="badge badge-warning" style="font-size: 1em; padding: 8px 16px;">👤 Colaborador Externo</span>' :
        '<span class="badge badge-info" style="font-size: 1em; padding: 8px 16px;">👤 Colaborador Interno</span>';
    
    const content = `
        <div style="text-align: center; margin-bottom: 30px;">
            <div style="display: inline-block; padding: 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; position: relative;">
                ${fotoColaborador}
                <h2 style="margin: 15px 0 5px 0; color: white;">${colaborador.nombre}</h2>
                <p style="margin: 0; color: rgba(255,255,255,0.9); font-size: 1.1em;">${colaborador.puesto}</p>
                <p style="margin: 5px 0 0 0; color: rgba(255,255,255,0.8);">${colaborador.departamento}</p>
            </div>
            <div style="margin-top: 15px;">
                ${tipoBadge}
            </div>
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px;">
            <div style="background: #f8fafc; padding: 15px; border-radius: 8px;">
                <h3 style="margin: 0 0 12px 0; color: #1e293b; font-size: 1.1em;">📧 Contacto</h3>
                <p style="margin: 6px 0; color: #475569;"><strong>Email:</strong> ${colaborador.email}</p>
                ${colaborador.telefono ? `<p style="margin: 6px 0; color: #475569;"><strong>Teléfono:</strong> ${colaborador.telefono}</p>` : ''}
                ${colaborador.jefeInmediato ? `<p style="margin: 6px 0; color: #475569;"><strong>Jefe:</strong> ${colaborador.jefeInmediato}</p>` : ''}
            </div>
            
            <div style="background: #f8fafc; padding: 15px; border-radius: 8px;">
                <h3 style="margin: 0 0 12px 0; color: #1e293b; font-size: 1.1em;">📊 Estadísticas</h3>
                <p style="margin: 6px 0; color: #475569;"><strong>Equipos Asignados:</strong> ${asignacionesActivas.length}</p>
                <p style="margin: 6px 0; color: #475569;"><strong>Licencias:</strong> ${licenciasAsignacionesCol.length}</p>
                ${colaborador.fechaIngreso ? `<p style="margin: 6px 0; color: #475569;"><strong>Fecha Ingreso:</strong> ${new Date(colaborador.fechaIngreso).toLocaleDateString()}</p>` : ''}
            </div>
        </div>
        
        ${asignacionesActivas.length > 0 ? `
            <div style="margin-bottom: 20px; text-align: center;">
                <button class="btn btn-warning" onclick='descargarCartaResponsiva("${id}")' style="padding: 12px 30px; font-size: 16px;">
                    📄 Descargar Carta Responsiva
                </button>
            </div>
        ` : ''}
        
        <div style="display: flex; justify-content: space-between; align-items: center; margin: 25px 0 15px 0; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">
            <h3 style="margin: 0; color: #1e293b;">💻 Equipos Asignados Actualmente</h3>
        </div>
        <div style="display: grid; gap: 12px;">
            ${equiposHTML || '<p style="color: #94a3b8; text-align: center; padding: 20px;">Sin equipos asignados actualmente</p>'}
        </div>
        
        <div style="display: flex; justify-content: space-between; align-items: center; margin: 30px 0 15px 0; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">
            <h3 style="margin: 0; color: #1e293b;">📜 Historial de Asignaciones</h3>
        </div>
        <div style="max-height: 300px; overflow-y: auto;">
            ${historialHTML}
        </div>
        
        <div style="display: flex; justify-content: space-between; align-items: center; margin: 30px 0 15px 0; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">
            <h3 style="margin: 0; color: #1e293b;">🔑 Licencias Asignadas</h3>
        </div>
        <div style="max-height: 200px; overflow-y: auto;">
            ${licenciasHTML}
        </div>
    `;
    
    document.getElementById('detalleColaboradorContent').innerHTML = content;
    openModal('modalDetalleColaborador');
}

