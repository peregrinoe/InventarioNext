// ================================
// FUNCIONES PARA COLABORADORES
// ================================

function saveColaborador(event) {
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
        foto: document.getElementById('colaboradorFoto').value || '',
        createdAt: id ? database.colaboradores.find(c => c._id === id).createdAt : new Date().toISOString()
    };
    
    if (id) {
        const index = database.colaboradores.findIndex(c => c._id === id);
        database.colaboradores[index] = colaborador;
        showNotification('✅ Colaborador actualizado');
    } else {
        database.colaboradores.push(colaborador);
        showNotification('✅ Colaborador creado');
    }
    
    saveData();
    renderColaboradores();
    updateDashboard();
    closeModal('modalColaborador');
}

function renderColaboradores() {
    const tbody = document.getElementById('colaboradoresTableBody');
    
    if (database.colaboradores.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-state">
                    <div class="empty-state-icon">👥</div>
                    <h3>No hay colaboradores registrados</h3>
                    <p>Haz clic en "Nuevo Colaborador" para comenzar</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = database.colaboradores.map(col => {
        const equiposAsignados = database.asignaciones.filter(a => 
            a.colaboradorId === col._id && a.estado === 'Activa'
        ).length;
        
        const licenciasAsignadas = database.licenciasAsignaciones.filter(la => 
            la.colaboradorId === col._id
        ).length;
        
        const fotoHTML = col.foto ? 
            `<img src="${col.foto}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover">` :
            `<div style="width: 40px; height: 40px; border-radius: 50%; background: #667eea; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold;">${col.nombre.charAt(0)}</div>`;
        
        return `
            <tr>
                <td>${fotoHTML}</td>
                <td><strong>${col.nombre}</strong></td>
                <td>${col.email}</td>
                <td>${col.departamento}</td>
                <td>${col.puesto}</td>
                <td><span class="badge badge-info">${equiposAsignados} equipo(s)</span></td>
                <td><span class="badge badge-success">${licenciasAsignadas} licencia(s)</span></td>
                <td class="action-buttons">
                    <button class="btn btn-sm btn-info" onclick='verDetalleColaborador("${col._id}")'>👁️ Ver</button>
                    <button class="btn btn-sm btn-primary" onclick='editColaborador("${col._id}")'>✏️ Editar</button>
                    <button class="btn btn-sm btn-danger" onclick='deleteColaborador("${col._id}")'>🗑️ Eliminar</button>
                </td>
            </tr>
        `;
    }).join('');
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
    
    if (colaborador.foto) {
        document.getElementById('colaboradorFoto').value = colaborador.foto;
        document.getElementById('colaboradorFotoPreview').innerHTML = 
            `<img src="${colaborador.foto}" style="max-width: 200px; max-height: 200px; border-radius: 8px; border: 2px solid #e2e8f0;">`;
    }
    
    document.getElementById('modalColaboradorTitle').textContent = 'Editar Colaborador';
    openModal('modalColaborador');
}

function deleteColaborador(id) {
    const asignaciones = database.asignaciones.filter(a => a.colaboradorId === id && a.estado === 'Activa');
    
    if (asignaciones.length > 0) {
        showNotification('❌ No se puede eliminar. El colaborador tiene equipos asignados.', 'error');
        return;
    }
    
    if (confirm('¿Estás seguro de eliminar este colaborador?')) {
        database.colaboradores = database.colaboradores.filter(c => c._id !== id);
        saveData();
        renderColaboradores();
        updateDashboard();
        showNotification('✅ Colaborador eliminado');
    }
}

function filterColaboradores() {
    const searchTerm = document.getElementById('searchColaborador').value.toLowerCase();
    const rows = document.querySelectorAll('#colaboradoresTableBody tr');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
}
function verDetalleColaborador(id) {
    const colaborador = database.colaboradores.find(c => c._id === id);
    if (!colaborador) return;
    
    // Obtener equipos asignados
    const asignacionesActivas = database.asignaciones.filter(a => 
        a.colaboradorId === id && a.estado === 'Activa'
    );
    
    // Historial completo de asignaciones
    const historialAsignaciones = database.asignaciones
        .filter(a => a.colaboradorId === id)
        .sort((a, b) => new Date(b.fechaAsignacion) - new Date(a.fechaAsignacion));
    
    // Obtener licencias asignadas usando la nueva tabla de asignaciones
    const licenciasAsignacionesCol = database.licenciasAsignaciones.filter(la => 
        la.colaboradorId === id
    );
    
    const equiposHTML = asignacionesActivas.map(asig => {
        const equipo = database.equipos.find(e => e._id === asig.equipoId);
        if (!equipo) return '';
        
        // Compatibilidad con versión anterior
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
                        ${fotos.length > 1 ? `<p style="margin: 8px 0 0 0; color: #667eea; font-size: 0.85em;">📸 ${fotos.length} fotos disponibles</p>` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    // Generar HTML del historial de asignaciones
    const historialHTML = historialAsignaciones.length > 0 ? historialAsignaciones.map(asig => {
        const equipo = database.equipos.find(e => e._id === asig.equipoId);
        if (!equipo) return '';
        
        const estadoBadgeAsig = asig.estado === 'Activa' ? 'badge-success' : 'badge-warning';
        
        // Obtener foto del equipo para el historial
        const fotos = equipo.fotos || (equipo.foto ? [equipo.foto] : []);
        const fotoEquipoHistorial = fotos.length > 0 ? 
            `<img src="${fotos[0]}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px; border: 2px solid #e2e8f0;">` :
            `<div style="width: 60px; height: 60px; background: #667eea; color: white; display: flex; align-items: center; justify-content: center; font-size: 1.5em; font-weight: bold; border-radius: 8px;">💻</div>`;
        
        return `
            <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; background: white;">
                <div style="display: flex; gap: 12px; align-items: start;">
                    ${fotoEquipoHistorial}
                    <div style="flex: 1;">
                        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px; flex-wrap: wrap; gap: 8px;">
                            <h4 style="margin: 0; color: #1e293b;">${equipo.marca} ${equipo.modelo}</h4>
                            <span class="badge ${estadoBadgeAsig}">${asig.estado}</span>
                        </div>
                        <p style="margin: 4px 0; color: #64748b; font-size: 0.9em;"><strong>Tipo:</strong> ${equipo.tipo}</p>
                        <p style="margin: 4px 0; color: #64748b; font-size: 0.9em;"><strong>Serie:</strong> ${equipo.numSerie}</p>
                        <p style="margin: 4px 0; color: #64748b; font-size: 0.9em;"><strong>Asignado:</strong> ${new Date(asig.fechaAsignacion).toLocaleDateString()}</p>
                        ${asig.fechaDevolucion ? `<p style="margin: 4px 0; color: #64748b; font-size: 0.9em;"><strong>Devuelto:</strong> ${new Date(asig.fechaDevolucion).toLocaleDateString()}</p>` : ''}
                        ${asig.observaciones ? `<p style="margin: 8px 0 0 0; color: #64748b; font-size: 0.9em; font-style: italic;">${asig.observaciones}</p>` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('') : '<p style="color: #94a3b8; text-align: center;">No hay historial de asignaciones</p>';
    
    const licenciasHTML = licenciasAsignacionesCol.length > 0 ? licenciasAsignacionesCol.map(licAsig => {
        const lic = database.licencias.find(l => l._id === licAsig.licenciaId);
        if (!lic) return '';
        
        const estadoBadge = lic.estado === 'Activa' ? 'badge-success' : 
                          lic.estado === 'Vencida' ? 'badge-danger' : 'badge-info';
        return `
            <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; background: white;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                    <h4 style="margin: 0; color: #1e293b;">${lic.software}</h4>
                    <span class="badge ${estadoBadge}">${lic.estado}</span>
                </div>
                <p style="margin: 4px 0; color: #64748b;"><strong>Tipo:</strong> ${lic.tipo}</p>
                ${lic.clave ? `<p style="margin: 4px 0; color: #64748b; font-family: monospace; font-size: 0.85em;"><strong>Clave:</strong> ${lic.clave}</p>` : ''}
                ${lic.fechaVencimiento ? `<p style="margin: 4px 0; color: #64748b;"><strong>Vencimiento:</strong> ${new Date(lic.fechaVencimiento).toLocaleDateString()}</p>` : ''}
                ${lic.notas ? `<p style="margin: 8px 0 0 0; color: #64748b; font-size: 0.9em; font-style: italic;">${lic.notas}</p>` : ''}
            </div>
        `;
    }).join('') : '<p style="color: #94a3b8; text-align: center; padding: 20px;">No tiene licencias asignadas</p>';
    
    const fotoColaborador = colaborador.foto ? 
        `<img src="${colaborador.foto}" style="width: 120px; height: 120px; border-radius: 50%; object-fit: cover; border: 4px solid #667eea;">` :
        `<div style="width: 120px; height: 120px; border-radius: 50%; background: #667eea; color: white; display: flex; align-items: center; justify-content: center; font-size: 3em; font-weight: bold; border: 4px solid #5568d3;">${colaborador.nombre.charAt(0)}</div>`;
    
    const content = `
        <div style="text-align: center; margin-bottom: 30px;">
            ${fotoColaborador}
            <h2 style="margin: 15px 0 5px 0; color: #1e293b;">${colaborador.nombre}</h2>
            <p style="color: #64748b; font-size: 1.1em;">${colaborador.puesto}</p>
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px;">
            <div style="background: #f8fafc; padding: 15px; border-radius: 8px;">
                <p style="margin: 8px 0; color: #475569;"><strong>📧 Email:</strong> ${colaborador.email}</p>
                ${colaborador.telefono ? `<p style="margin: 8px 0; color: #475569;"><strong>📱 Teléfono:</strong> ${colaborador.telefono}</p>` : ''}
                <p style="margin: 8px 0; color: #475569;"><strong>🏢 Departamento:</strong> ${colaborador.departamento}</p>
                ${colaborador.fechaIngreso ? `<p style="margin: 8px 0; color: #475569;"><strong>📅 Fecha Ingreso:</strong> ${new Date(colaborador.fechaIngreso).toLocaleDateString()}</p>` : ''}
            </div>
            
            <div style="background: #f8fafc; padding: 15px; border-radius: 8px;">
                <p style="margin: 8px 0; color: #475569;"><strong>👔 Jefe Inmediato:</strong> ${colaborador.jefeInmediato || 'No especificado'}</p>
                <p style="margin: 8px 0; color: #475569;"><strong>💼 Equipos Asignados:</strong> ${asignacionesActivas.length}</p>
                <p style="margin: 8px 0; color: #475569;"><strong>🔑 Licencias:</strong> ${licenciasAsignacionesCol.length}</p>
            </div>
        </div>
        
        <h3 style="margin: 25px 0 15px 0; color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">💻 Equipos Asignados Actualmente</h3>
        <div style="display: grid; gap: 15px;">
            ${equiposHTML || '<p style="color: #94a3b8; text-align: center;">No tiene equipos asignados actualmente</p>'}
        </div>
        
        <h3 style="margin: 25px 0 15px 0; color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">📜 Historial de Equipos</h3>
        <div style="display: grid; gap: 12px;">
            ${historialHTML}
        </div>
        
        <h3 style="margin: 25px 0 15px 0; color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">🔑 Licencias de Software</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 15px;">
            ${licenciasHTML}
        </div>
    `;
    
    document.getElementById('detalleColaboradorContent').innerHTML = content;
    openModal('modalDetalleColaborador');
}

