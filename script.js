
// Base de datos NoSQL simulada
let database = {
    colaboradores: [],
    equipos: [],
    asignaciones: [],
    licencias: []
};

// Mostrar notificación
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    const notificationText = document.getElementById('notificationText');
    
    notification.className = `notification ${type} show`;
    notificationText.textContent = message;
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Convertir imagen a Base64
function previewImage(event, previewId) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById(previewId);
            preview.innerHTML = `<img src="${e.target.result}" style="max-width: 200px; max-height: 200px; border-radius: 8px; border: 2px solid #e2e8f0;">`;
            
            // Guardar en el campo hidden correspondiente
            if (previewId === 'colaboradorFotoPreview') {
                document.getElementById('colaboradorFoto').value = e.target.result;
            } else if (previewId === 'equipoFotoPreview') {
                document.getElementById('equipoFoto').value = e.target.result;
            }
        };
        reader.readAsDataURL(file);
    }
}

// Exportar datos a JSON
function exportarDatos() {
    const dataStr = JSON.stringify(database, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `inventario_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    showNotification('✅ Datos exportados correctamente', 'success');
}

// Importar datos desde JSON
function importarDatos(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            
            // Validar estructura
            if (importedData.colaboradores && importedData.equipos && importedData.asignaciones) {
                database = importedData;
                saveData();
                
                renderColaboradores();
                renderEquipos();
                renderAsignaciones();
                renderLicencias();
                updateDashboard();
                
                showNotification('✅ Datos importados correctamente', 'success');
            } else {
                showNotification('❌ Archivo JSON inválido', 'error');
            }
        } catch (error) {
            showNotification('❌ Error al leer el archivo', 'error');
        }
    };
    reader.readAsText(file);
    
    // Limpiar el input
    event.target.value = '';
}

// Cargar datos del localStorage
function loadData() {
    const savedData = localStorage.getItem('inventarioDB');
    if (savedData) {
        database = JSON.parse(savedData);
    }
    // Asegurar que exista el array de licencias
    if (!database.licencias) {
        database.licencias = [];
    }
    updateDashboard();
    renderColaboradores();
    renderEquipos();
    renderAsignaciones();
    renderLicencias();
}

// Guardar datos en localStorage
function saveData() {
    localStorage.setItem('inventarioDB', JSON.stringify(database));
}

// Navegación
function showSection(sectionName) {
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.getElementById(sectionName).classList.add('active');
    event.target.classList.add('active');
    
    if (sectionName === 'asignaciones') {
        updateAsignacionSelects();
    } else if (sectionName === 'licencias') {
        renderLicencias();
    }
}

// Modales
function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
    
    if (modalId === 'modalAsignacion') {
        updateAsignacionSelects();
        document.getElementById('asignacionFecha').valueAsDate = new Date();
    }
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
    if (modalId === 'modalColaborador') {
        document.getElementById('formColaborador').reset();
        document.getElementById('colaboradorId').value = '';
        document.getElementById('modalColaboradorTitle').textContent = 'Nuevo Colaborador';
        document.getElementById('colaboradorFotoPreview').innerHTML = '';
        document.getElementById('colaboradorFoto').value = '';
    } else if (modalId === 'modalEquipo') {
        document.getElementById('formEquipo').reset();
        document.getElementById('equipoId').value = '';
        document.getElementById('modalEquipoTitle').textContent = 'Nuevo Equipo';
        document.getElementById('equipoFotoPreview').innerHTML = '';
        document.getElementById('equipoFoto').value = '';
    } else if (modalId === 'modalAsignacion') {
        document.getElementById('formAsignacion').reset();
    } else if (modalId === 'modalLicencia') {
        document.getElementById('formLicencia').reset();
        document.getElementById('licenciaId').value = '';
        document.getElementById('modalLicenciaTitle').textContent = 'Nueva Licencia';
    }
}

// COLABORADORES
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
        
        const licenciasAsignadas = database.licencias.filter(l => 
            l.colaboradorId === col._id
        ).length;
        
        const fotoHTML = col.foto ? 
            `<img src="${col.foto}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">` :
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

function verDetalleColaborador(id) {
    const colaborador = database.colaboradores.find(c => c._id === id);
    if (!colaborador) return;
    
    // Obtener equipos asignados
    const asignacionesActivas = database.asignaciones.filter(a => 
        a.colaboradorId === id && a.estado === 'Activa'
    );
    
    // Obtener licencias asignadas
    const licenciasAsignadas = database.licencias.filter(l => 
        l.colaboradorId === id
    );
    
    const equiposHTML = asignacionesActivas.map(asig => {
        const equipo = database.equipos.find(e => e._id === asig.equipoId);
        if (!equipo) return '';
        
        const fotoEquipo = equipo.foto ? 
            `<img src="${equipo.foto}" style="width: 80px; height: 80px; border-radius: 8px; object-fit: cover;">` :
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
    
    const licenciasHTML = licenciasAsignadas.length > 0 ? licenciasAsignadas.map(lic => {
        const estadoBadge = lic.estado === 'Activa' || lic.estado === 'En uso' ? 'badge-success' : 
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
                <div style="margin-top: 10px; display: flex; gap: 8px;">
                    <button class="btn btn-sm btn-primary" onclick='editLicenciaFromDetail("${lic._id}")'>✏️ Editar</button>
                    <button class="btn btn-sm btn-danger" onclick='deleteLicenciaFromDetail("${lic._id}", "${id}")'>🗑️ Eliminar</button>
                </div>
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
                <p style="margin: 8px 0; color: #475569;"><strong>🔑 Licencias:</strong> ${licenciasAsignadas.length}</p>
            </div>
        </div>
        
        <h3 style="margin: 25px 0 15px 0; color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">💻 Equipos Asignados</h3>
        <div style="display: grid; gap: 15px;">
            ${equiposHTML || '<p style="color: #94a3b8; text-align: center;">No tiene equipos asignados actualmente</p>'}
        </div>
        
        <div style="display: flex; justify-content: space-between; align-items: center; margin: 25px 0 15px 0; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">
            <h3 style="margin: 0; color: #1e293b;">🔑 Licencias de Software</h3>
            <button class="btn btn-sm btn-primary" onclick='agregarLicenciaColaborador("${id}")'>➕ Agregar Licencia</button>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 15px;">
            ${licenciasHTML}
        </div>
    `;
    
    document.getElementById('detalleColaboradorContent').innerHTML = content;
    openModal('modalDetalleColaborador');
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

// EQUIPOS
function saveEquipo(event) {
    event.preventDefault();
    
    const id = document.getElementById('equipoId').value;
    const equipo = {
        _id: id || 'EQ' + Date.now(),
        tipo: document.getElementById('equipoTipo').value,
        marca: document.getElementById('equipoMarca').value,
        modelo: document.getElementById('equipoModelo').value,
        numSerie: document.getElementById('equipoNumSerie').value,
        nombreEquipo: document.getElementById('equipoNombre').value,
        procesador: document.getElementById('equipoProcesador').value,
        ram: document.getElementById('equipoRam').value,
        almacenamiento: document.getElementById('equipoAlmacenamiento').value,
        so: document.getElementById('equipoSO').value,
        fechaCompra: document.getElementById('equipoFechaCompra').value,
        estado: document.getElementById('equipoEstado').value,
        observaciones: document.getElementById('equipoObservaciones').value,
        foto: document.getElementById('equipoFoto').value || '',
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
    closeModal('modalEquipo');
}

function renderEquipos() {
    const tbody = document.getElementById('equiposTableBody');
    
    if (database.equipos.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="empty-state">
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
                          eq.estado === 'Mantenimiento' ? 'badge-warning' : 'badge-danger';
        
        const fotoHTML = eq.foto ? 
            `<img src="${eq.foto}" style="width: 40px; height: 40px; border-radius: 8px; object-fit: cover;">` :
            `<div style="width: 40px; height: 40px; border-radius: 8px; background: #f1f5f9; display: flex; align-items: center; justify-content: center;">💻</div>`;
        
        return `
            <tr>
                <td>${fotoHTML}</td>
                <td>${eq.marca}</td>
                <td>${eq.modelo}</td>
                <td>${eq.tipo}</td>
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
    
    const fotoEquipo = equipo.foto ? 
        `<img src="${equipo.foto}" style="width: 200px; height: 200px; border-radius: 12px; object-fit: cover; border: 4px solid #667eea;">` :
        `<div style="width: 200px; height: 200px; border-radius: 12px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; font-size: 5em; color: white;">💻</div>`;
    
    const estadoBadge = equipo.estado === 'Disponible' ? 'badge-success' : 
                       equipo.estado === 'Asignado' ? 'badge-info' : 
                       equipo.estado === 'Mantenimiento' ? 'badge-warning' : 'badge-danger';
    
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
            ${fotoEquipo}
            <h2 style="margin: 15px 0 5px 0; color: #1e293b;">${equipo.marca} ${equipo.modelo}</h2>
            <p style="color: #64748b; font-size: 1.1em;">${equipo.tipo}</p>
            <span class="badge ${estadoBadge}" style="font-size: 1em; padding: 8px 16px;">${equipo.estado}</span>
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px;">
            <div style="background: #f8fafc; padding: 15px; border-radius: 8px;">
                <h3 style="margin: 0 0 12px 0; color: #1e293b; font-size: 1.1em;">Información General</h3>
                <p style="margin: 6px 0; color: #475569;"><strong>Número de Serie:</strong> ${equipo.numSerie}</p>
                ${equipo.nombreEquipo ? `<p style="margin: 6px 0; color: #475569;"><strong>Nombre:</strong> ${equipo.nombreEquipo}</p>` : ''}
                ${equipo.fechaCompra ? `<p style="margin: 6px 0; color: #475569;"><strong>Fecha Compra:</strong> ${new Date(equipo.fechaCompra).toLocaleDateString()}</p>` : ''}
            </div>
            
            <div style="background: #f8fafc; padding: 15px; border-radius: 8px;">
                <h3 style="margin: 0 0 12px 0; color: #1e293b; font-size: 1.1em;">Especificaciones</h3>
                ${equipo.procesador ? `<p style="margin: 6px 0; color: #475569;"><strong>Procesador:</strong> ${equipo.procesador}</p>` : ''}
                ${equipo.ram ? `<p style="margin: 6px 0; color: #475569;"><strong>RAM:</strong> ${equipo.ram} GB</p>` : ''}
                ${equipo.almacenamiento ? `<p style="margin: 6px 0; color: #475569;"><strong>Almacenamiento:</strong> ${equipo.almacenamiento}</p>` : ''}
                ${equipo.so ? `<p style="margin: 6px 0; color: #475569;"><strong>Sistema Operativo:</strong> ${equipo.so}</p>` : ''}
            </div>
        </div>
        
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

function editEquipo(id) {
    const equipo = database.equipos.find(e => e._id === id);
    
    document.getElementById('equipoId').value = equipo._id;
    document.getElementById('equipoTipo').value = equipo.tipo;
    document.getElementById('equipoMarca').value = equipo.marca;
    document.getElementById('equipoModelo').value = equipo.modelo;
    document.getElementById('equipoNumSerie').value = equipo.numSerie;
    document.getElementById('equipoNombre').value = equipo.nombreEquipo || '';
    document.getElementById('equipoProcesador').value = equipo.procesador || '';
    document.getElementById('equipoRam').value = equipo.ram || '';
    document.getElementById('equipoAlmacenamiento').value = equipo.almacenamiento || '';
    document.getElementById('equipoSO').value = equipo.so || '';
    document.getElementById('equipoFechaCompra').value = equipo.fechaCompra || '';
    document.getElementById('equipoEstado').value = equipo.estado;
    document.getElementById('equipoObservaciones').value = equipo.observaciones || '';
    
    if (equipo.foto) {
        document.getElementById('equipoFoto').value = equipo.foto;
        document.getElementById('equipoFotoPreview').innerHTML = 
            `<img src="${equipo.foto}" style="max-width: 200px; max-height: 200px; border-radius: 8px; border: 2px solid #e2e8f0;">`;
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
    const rows = document.querySelectorAll('#equiposTableBody tr');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
}

// ASIGNACIONES
function updateAsignacionSelects() {
    const selectColaborador = document.getElementById('asignacionColaborador');
    const selectEquipo = document.getElementById('asignacionEquipo');
    
    selectColaborador.innerHTML = '<option value="">Seleccionar colaborador...</option>' +
        database.colaboradores.map(col => 
            `<option value="${col._id}">${col.nombre} - ${col.departamento}</option>`
        ).join('');
    
    const equiposDisponibles = database.equipos.filter(eq => eq.estado === 'Disponible');
    selectEquipo.innerHTML = '<option value="">Seleccionar equipo...</option>' +
        equiposDisponibles.map(eq => 
            `<option value="${eq._id}">${eq.marca} ${eq.modelo} (${eq.tipo}) - ${eq.numSerie}</option>`
        ).join('');
}

function saveAsignacion(event) {
    event.preventDefault();
    
    const colaboradorId = document.getElementById('asignacionColaborador').value;
    const equipoId = document.getElementById('asignacionEquipo').value;
    
    const asignacion = {
        _id: 'ASG' + Date.now(),
        colaboradorId: colaboradorId,
        equipoId: equipoId,
        fechaAsignacion: document.getElementById('asignacionFecha').value,
        fechaDevolucion: null,
        estado: document.getElementById('asignacionEstado').value,
        observaciones: document.getElementById('asignacionObservaciones').value,
        createdAt: new Date().toISOString()
    };
    
    database.asignaciones.push(asignacion);
    
    const equipo = database.equipos.find(e => e._id === equipoId);
    equipo.estado = 'Asignado';
    
    saveData();
    renderAsignaciones();
    renderEquipos();
    updateDashboard();
    closeModal('modalAsignacion');
    showNotification('✅ Equipo asignado correctamente');
}

function renderAsignaciones() {
    const tbody = document.getElementById('asignacionesTableBody');
    
    if (database.asignaciones.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">
                    <div class="empty-state-icon">🔗</div>
                    <h3>No hay asignaciones registradas</h3>
                    <p>Haz clic en "Nueva Asignación" para comenzar</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = database.asignaciones.map(asig => {
        const colaborador = database.colaboradores.find(c => c._id === asig.colaboradorId);
        const equipo = database.equipos.find(e => e._id === asig.equipoId);
        
        const estadoBadge = asig.estado === 'Activa' ? 
            '<span class="badge badge-success">Activa</span>' : 
            '<span class="badge badge-warning">Devuelto</span>';
        
        return `
            <tr>
                <td><strong>${colaborador ? colaborador.nombre : 'N/A'}</strong></td>
                <td>${equipo ? `${equipo.marca} ${equipo.modelo}` : 'N/A'}</td>
                <td>${new Date(asig.fechaAsignacion).toLocaleDateString()}</td>
                <td>${asig.fechaDevolucion ? new Date(asig.fechaDevolucion).toLocaleDateString() : '-'}</td>
                <td>${estadoBadge}</td>
                <td>${asig.observaciones || '-'}</td>
                <td class="action-buttons">
                    ${asig.estado === 'Activa' ? 
                        `<button class="btn btn-sm btn-warning" onclick='devolverEquipo("${asig._id}")'>↩️ Devolver</button>` : 
                        ''
                    }
                    <button class="btn btn-sm btn-danger" onclick='deleteAsignacion("${asig._id}")'>🗑️</button>
                </td>
            </tr>
        `;
    }).join('');
    
    updateDashboardTable();
}

function devolverEquipo(asignacionId) {
    if (confirm('¿Confirmar devolución del equipo?')) {
        const asignacion = database.asignaciones.find(a => a._id === asignacionId);
        asignacion.estado = 'Devuelto';
        asignacion.fechaDevolucion = new Date().toISOString().split('T')[0];
        
        const equipo = database.equipos.find(e => e._id === asignacion.equipoId);
        equipo.estado = 'Disponible';
        
        saveData();
        renderAsignaciones();
        renderEquipos();
        updateDashboard();
        showNotification('✅ Equipo devuelto correctamente');
    }
}

function deleteAsignacion(id) {
    if (confirm('¿Estás seguro de eliminar esta asignación?')) {
        const asignacion = database.asignaciones.find(a => a._id === id);
        
        if (asignacion.estado === 'Activa') {
            const equipo = database.equipos.find(e => e._id === asignacion.equipoId);
            equipo.estado = 'Disponible';
        }
        
        database.asignaciones = database.asignaciones.filter(a => a._id !== id);
        saveData();
        renderAsignaciones();
        renderEquipos();
        updateDashboard();
        showNotification('✅ Asignación eliminada');
    }
}

// LICENCIAS
function agregarLicenciaColaborador(colaboradorId) {
    // Limpiar el formulario
    document.getElementById('formLicencia').reset();
    document.getElementById('licenciaId').value = '';
    document.getElementById('licenciaColaboradorId').value = colaboradorId;
    document.getElementById('modalLicenciaTitle').textContent = 'Nueva Licencia';
    
    // Cerrar el modal de detalle y abrir el modal de licencia
    closeModal('modalDetalleColaborador');
    openModal('modalLicencia');
}

function saveLicencia(event) {
    event.preventDefault();
    
    const id = document.getElementById('licenciaId').value;
    const colaboradorId = document.getElementById('licenciaColaboradorId').value;
    
    const licencia = {
        _id: id || 'LIC' + Date.now(),
        colaboradorId: colaboradorId,
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
    
    saveData();
    renderLicencias();
    renderColaboradores();
    closeModal('modalLicencia');
    
    // Volver a abrir el detalle del colaborador si estábamos ahí
    if (colaboradorId) {
        verDetalleColaborador(colaboradorId);
    }
}

function renderLicencias() {
    const container = document.getElementById('licenciasColaboradoresContainer');
    
    if (database.colaboradores.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">👥</div>
                <h3>No hay colaboradores registrados</h3>
                <p>Primero debes crear colaboradores</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    
    database.colaboradores.forEach(colaborador => {
        const licencias = database.licencias.filter(l => l.colaboradorId === colaborador._id);
        
        const fotoHTML = colaborador.foto ? 
            `<img src="${colaborador.foto}" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover;">` :
            `<div style="width: 50px; height: 50px; border-radius: 50%; background: #667eea; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1.2em;">${colaborador.nombre.charAt(0)}</div>`;
        
        html += `
            <div style="background: white; border: 2px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #e2e8f0;">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        ${fotoHTML}
                        <div>
                            <h3 style="margin: 0; color: #1e293b;">${colaborador.nombre}</h3>
                            <p style="margin: 4px 0 0 0; color: #64748b;">${colaborador.departamento} - ${colaborador.puesto}</p>
                        </div>
                    </div>
                    <button class="btn btn-sm btn-primary" onclick='agregarLicenciaColaborador("${colaborador._id}")'>➕ Agregar Licencia</button>
                </div>
                
                ${licencias.length > 0 ? `
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 15px;">
                        ${licencias.map(lic => {
                            const estadoBadge = lic.estado === 'Activa' || lic.estado === 'En uso' ? 'badge-success' : 
                                              lic.estado === 'Vencida' ? 'badge-danger' : 'badge-info';
                            return `
                                <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; background: #f8fafc;">
                                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
                                        <h4 style="margin: 0; color: #1e293b;">${lic.software}</h4>
                                        <span class="badge ${estadoBadge}">${lic.estado}</span>
                                    </div>
                                    <p style="margin: 6px 0; color: #64748b; font-size: 0.9em;"><strong>Tipo:</strong> ${lic.tipo}</p>
                                    ${lic.clave ? `<p style="margin: 6px 0; color: #64748b; font-size: 0.85em; font-family: monospace;"><strong>Clave:</strong> ${lic.clave}</p>` : ''}
                                    ${lic.fechaCompra ? `<p style="margin: 6px 0; color: #64748b; font-size: 0.9em;"><strong>Compra:</strong> ${new Date(lic.fechaCompra).toLocaleDateString()}</p>` : ''}
                                    ${lic.fechaVencimiento ? `<p style="margin: 6px 0; color: #64748b; font-size: 0.9em;"><strong>Vencimiento:</strong> ${new Date(lic.fechaVencimiento).toLocaleDateString()}</p>` : ''}
                                    ${lic.notas ? `<p style="margin: 10px 0 0 0; color: #64748b; font-size: 0.85em; font-style: italic; padding-top: 10px; border-top: 1px solid #e2e8f0;">${lic.notas}</p>` : ''}
                                    <div style="margin-top: 12px; display: flex; gap: 8px;">
                                        <button class="btn btn-sm btn-primary" onclick='editLicencia("${lic._id}")'>✏️ Editar</button>
                                        <button class="btn btn-sm btn-danger" onclick='deleteLicencia("${lic._id}")'>🗑️ Eliminar</button>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                ` : `
                    <p style="color: #94a3b8; text-align: center; padding: 20px;">No tiene licencias asignadas</p>
                `}
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function editLicencia(id) {
    const licencia = database.licencias.find(l => l._id === id);
    
    document.getElementById('licenciaId').value = licencia._id;
    document.getElementById('licenciaColaboradorId').value = licencia.colaboradorId;
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

function editLicenciaFromDetail(id) {
    editLicencia(id);
    closeModal('modalDetalleColaborador');
}

function deleteLicencia(id) {
    if (confirm('¿Estás seguro de eliminar esta licencia?')) {
        database.licencias = database.licencias.filter(l => l._id !== id);
        saveData();
        renderLicencias();
        renderColaboradores();
        showNotification('✅ Licencia eliminada');
    }
}

function deleteLicenciaFromDetail(id, colaboradorId) {
    if (confirm('¿Estás seguro de eliminar esta licencia?')) {
        database.licencias = database.licencias.filter(l => l._id !== id);
        saveData();
        renderLicencias();
        renderColaboradores();
        showNotification('✅ Licencia eliminada');
        // Reabrir el detalle del colaborador actualizado
        verDetalleColaborador(colaboradorId);
    }
}

// DASHBOARD
function updateDashboard() {
    document.getElementById('totalColaboradores').textContent = database.colaboradores.length;
    document.getElementById('totalEquipos').textContent = database.equipos.length;
    
    const asignados = database.asignaciones.filter(a => a.estado === 'Activa').length;
    document.getElementById('equiposAsignados').textContent = asignados;
    document.getElementById('equiposDisponibles').textContent = 
        database.equipos.filter(e => e.estado === 'Disponible').length;
}

function updateDashboardTable() {
    const tbody = document.getElementById('dashboardTableBody');
    const asignacionesActivas = database.asignaciones
        .filter(a => a.estado === 'Activa')
        .slice(-5)
        .reverse();
    
    if (asignacionesActivas.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    <div class="empty-state-icon">📋</div>
                    <h3>No hay asignaciones aún</h3>
                    <p>Comienza creando colaboradores y equipos</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = asignacionesActivas.map(asig => {
        const colaborador = database.colaboradores.find(c => c._id === asig.colaboradorId);
        const equipo = database.equipos.find(e => e._id === asig.equipoId);
        
        return `
            <tr>
                <td><strong>${colaborador ? colaborador.nombre : 'N/A'}</strong></td>
                <td>${equipo ? `${equipo.marca} ${equipo.modelo}` : 'N/A'}</td>
                <td>${equipo ? equipo.tipo : 'N/A'}</td>
                <td>${new Date(asig.fechaAsignacion).toLocaleDateString()}</td>
                <td><span class="badge badge-success">Activa</span></td>
            </tr>
        `;
    }).join('');
}

// Cerrar modales al hacer clic fuera
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('active');
    }
}

// Cargar datos al iniciar
window.onload = loadData;
