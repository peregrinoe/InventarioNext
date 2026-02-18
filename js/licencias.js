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
                <td><strong>${lic.software}</strong></td>
                <td>${lic.tipo}</td>
                <td style="font-family: monospace; font-size: 0.9em;">${lic.clave || '-'}</td>
                <td><span class="badge badge-info">${cantidadAsignada} usuario(s)</span></td>
                <td>${lic.fechaVencimiento ? new Date(lic.fechaVencimiento).toLocaleDateString() : '-'}</td>
                <td><span class="badge ${estadoBadge}">${lic.estado}</span></td>
                <td class="action-buttons">
                    <button class="btn btn-sm btn-success" onclick='abrirAsignarUsuarios("${lic._id}")'>👥 Asignar</button>
                    <button class="btn btn-sm btn-info" onclick='verDetalleLicencia("${lic._id}")'>👁️ Ver</button>
                    <button class="btn btn-sm btn-primary" onclick='editLicencia("${lic._id}")'>✏️</button>
                    <button class="btn btn-sm btn-danger" onclick='deleteLicencia("${lic._id}")'>🗑️</button>
                </td>
            </tr>
        `;
    }).join('');
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
    
    const asignaciones = database.licenciasAsignaciones.filter(la => la.licenciaId === id);
    
    const usuariosHTML = asignaciones.length > 0 ? asignaciones.map(asig => {
        const colaborador = database.colaboradores.find(c => c._id === asig.colaboradorId);
        if (!colaborador) return '';
        
        const fotoHTML = colaborador.foto ? 
            `<img src="${colaborador.foto}" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover;">` :
            `<div style="width: 50px; height: 50px; border-radius: 50%; background: #667eea; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1.2em;">${colaborador.nombre.charAt(0)}</div>`;
        
        return `
            <div style="display: flex; align-items: center; gap: 15px; padding: 15px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc;">
                ${fotoHTML}
                <div style="flex: 1;">
                    <strong style="color: #1e293b;">${colaborador.nombre}</strong>
                    <p style="margin: 4px 0 0 0; color: #64748b; font-size: 0.9em;">${colaborador.departamento} - ${colaborador.puesto}</p>
                    <p style="margin: 4px 0 0 0; color: #94a3b8; font-size: 0.85em;">Asignada el: ${new Date(asig.fechaAsignacion).toLocaleDateString()}</p>
                </div>
            </div>
        `;
    }).join('') : '<p style="color: #94a3b8; text-align: center; padding: 20px;">No hay usuarios asignados a esta licencia</p>';
    
    const estadoBadge = licencia.estado === 'Activa' ? 'badge-success' : 
                       licencia.estado === 'Vencida' ? 'badge-danger' : 'badge-info';
    
    const content = `
        <div style="text-align: center; margin-bottom: 30px;">
            <div style="display: inline-block; padding: 20px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; color: white;">
                <div style="font-size: 4em; margin-bottom: 10px;">🔑</div>
                <h2 style="margin: 0 0 5px 0;">${licencia.software}</h2>
                <p style="margin: 0; font-size: 1.1em; opacity: 0.9;">${licencia.tipo}</p>
            </div>
            <div style="margin-top: 15px;">
                <span class="badge ${estadoBadge}" style="font-size: 1em; padding: 8px 16px;">${licencia.estado}</span>
            </div>
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px;">
            <div style="background: #f8fafc; padding: 15px; border-radius: 8px;">
                <h3 style="margin: 0 0 12px 0; color: #1e293b; font-size: 1.1em;">Información de la Licencia</h3>
                ${licencia.clave ? `<p style="margin: 6px 0; color: #475569; font-family: monospace; font-size: 0.9em;"><strong>Clave:</strong> ${licencia.clave}</p>` : ''}
                ${licencia.fechaCompra ? `<p style="margin: 6px 0; color: #475569;"><strong>Fecha Compra:</strong> ${new Date(licencia.fechaCompra).toLocaleDateString()}</p>` : ''}
                ${licencia.fechaVencimiento ? `<p style="margin: 6px 0; color: #475569;"><strong>Vencimiento:</strong> ${new Date(licencia.fechaVencimiento).toLocaleDateString()}</p>` : ''}
            </div>
            
            <div style="background: #f8fafc; padding: 15px; border-radius: 8px;">
                <h3 style="margin: 0 0 12px 0; color: #1e293b; font-size: 1.1em;">Estadísticas</h3>
                <p style="margin: 6px 0; color: #475569;"><strong>Usuarios Asignados:</strong> ${asignaciones.length}</p>
                <p style="margin: 6px 0; color: #475569;"><strong>Tipo:</strong> ${licencia.tipo}</p>
            </div>
        </div>
        
        ${licencia.notas ? `
            <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin-bottom: 30px; border-left: 4px solid #f59e0b;">
                <h3 style="margin: 0 0 8px 0; color: #92400e; font-size: 1.1em;">📝 Notas</h3>
                <p style="margin: 0; color: #78350f;">${licencia.notas}</p>
            </div>
        ` : ''}
        
        <div style="display: flex; justify-content: space-between; align-items: center; margin: 25px 0 15px 0; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">
            <h3 style="margin: 0; color: #1e293b;">👥 Usuarios Asignados</h3>
            <button class="btn btn-sm btn-primary" onclick='closeModal("modalDetalleLicencia"); abrirAsignarUsuarios("${id}")'>➕ Gestionar</button>
        </div>
        <div style="display: grid; gap: 12px;">
            ${usuariosHTML}
        </div>
    `;
    
    document.getElementById('detalleLicenciaContent').innerHTML = content;
    openModal('modalDetalleLicencia');
}

