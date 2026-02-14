
// Base de datos NoSQL simulada
let database = {
    colaboradores: [],
    equipos: [],
    asignaciones: [],
    licencias: [],
    licenciasAsignaciones: [] // Nueva tabla para asignaciones de licencias a usuarios
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
            }
        };
        reader.readAsDataURL(file);
    }
}

// Preview de múltiples imágenes para equipos
function previewMultipleImages(event) {
    const files = event.target.files;
    const preview = document.getElementById('equipoFotosPreview');
    const fotosArray = [];
    
    if (files.length > 0) {
        preview.innerHTML = '';
        let loadedCount = 0;
        
        Array.from(files).forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = function(e) {
                fotosArray.push(e.target.result);
                
                const fotoDiv = document.createElement('div');
                fotoDiv.style.position = 'relative';
                fotoDiv.innerHTML = `
                    <img src="${e.target.result}" style="width: 100%; height: 150px; object-fit: cover; border-radius: 8px; border: 2px solid #e2e8f0;">
                    <button type="button" onclick="borrarFotoIndividual(${index})" style="position: absolute; top: 5px; right: 5px; background: #f56565; color: white; border: none; border-radius: 50%; width: 25px; height: 25px; cursor: pointer; font-size: 16px; line-height: 1; display: flex; align-items: center; justify-content: center;">×</button>
                    <p style="margin-top: 5px; font-size: 0.75em; color: #64748b; text-align: center;">Foto ${index + 1}</p>
                `;
                preview.appendChild(fotoDiv);
                
                loadedCount++;
                if (loadedCount === files.length) {
                    document.getElementById('equipoFotos').value = JSON.stringify(fotosArray);
                }
            };
            reader.readAsDataURL(file);
        });
    }
}

// Borrar foto individual del equipo
function borrarFotoIndividual(index) {
    const fotosHidden = document.getElementById('equipoFotos').value;
    if (fotosHidden) {
        let fotosArray = JSON.parse(fotosHidden);
        fotosArray.splice(index, 1);
        document.getElementById('equipoFotos').value = JSON.stringify(fotosArray);
        
        // Re-renderizar las fotos
        const preview = document.getElementById('equipoFotosPreview');
        preview.innerHTML = '';
        
        fotosArray.forEach((foto, idx) => {
            const fotoDiv = document.createElement('div');
            fotoDiv.style.position = 'relative';
            fotoDiv.innerHTML = `
                <img src="${foto}" style="width: 100%; height: 150px; object-fit: cover; border-radius: 8px; border: 2px solid #e2e8f0;">
                <button type="button" onclick="borrarFotoIndividual(${idx})" style="position: absolute; top: 5px; right: 5px; background: #f56565; color: white; border: none; border-radius: 50%; width: 25px; height: 25px; cursor: pointer; font-size: 16px; line-height: 1; display: flex; align-items: center; justify-content: center;">×</button>
                <p style="margin-top: 5px; font-size: 0.75em; color: #64748b; text-align: center;">Foto ${idx + 1}</p>
            `;
            preview.appendChild(fotoDiv);
        });
        
        showNotification('🗑️ Foto eliminada', 'success');
    }
}

// Borrar todas las fotos del equipo
function borrarTodasFotos() {
    document.getElementById('equipoFotos').value = '';
    document.getElementById('equipoFotosPreview').innerHTML = '';
    document.getElementById('equipoFotosInput').value = '';
    showNotification('🗑️ Todas las fotos eliminadas', 'success');
}

// Borrar foto de colaborador
function borrarFoto(tipo) {
    if (tipo === 'colaborador') {
        document.getElementById('colaboradorFoto').value = '';
        document.getElementById('colaboradorFotoPreview').innerHTML = '';
        document.getElementById('colaboradorFotoInput').value = '';
        showNotification('🗑️ Foto eliminada', 'success');
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
    // Asegurar que existan los arrays necesarios
    if (!database.licencias) {
        database.licencias = [];
    }
    if (!database.licenciasAsignaciones) {
        database.licenciasAsignaciones = [];
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
        document.getElementById('equipoFotosPreview').innerHTML = '';
        document.getElementById('equipoFotos').value = '';
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
function saveLicencia(event) {
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
    
    saveData();
    renderLicencias();
    closeModal('modalLicencia');
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

function deleteLicencia(id) {
    const asignaciones = database.licenciasAsignaciones.filter(la => la.licenciaId === id);
    
    if (asignaciones.length > 0) {
        if (!confirm(`Esta licencia está asignada a ${asignaciones.length} usuario(s). ¿Deseas eliminarla de todas formas? Se eliminarán todas las asignaciones.`)) {
            return;
        }
        // Eliminar todas las asignaciones
        database.licenciasAsignaciones = database.licenciasAsignaciones.filter(la => la.licenciaId !== id);
    }
    
    if (confirm('¿Estás seguro de eliminar esta licencia?')) {
        database.licencias = database.licencias.filter(l => l._id !== id);
        saveData();
        renderLicencias();
        renderColaboradores();
        showNotification('✅ Licencia eliminada');
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

function guardarAsignacionesLicencia() {
    const licenciaId = document.getElementById('licenciaAsignarId').value;
    const checkboxes = document.querySelectorAll('#listaUsuariosAsignar input[type="checkbox"]');
    
    // Eliminar asignaciones antiguas de esta licencia
    database.licenciasAsignaciones = database.licenciasAsignaciones.filter(la => 
        la.licenciaId !== licenciaId
    );
    
    // Agregar nuevas asignaciones
    checkboxes.forEach((checkbox, index) => {
        if (checkbox.checked) {
            const item = checkbox.closest('.usuario-asignar-item');
            const colaboradorId = database.colaboradores[index]._id;
            
            database.licenciasAsignaciones.push({
                _id: 'LA' + Date.now() + '_' + index,
                licenciaId: licenciaId,
                colaboradorId: colaboradorId,
                fechaAsignacion: new Date().toISOString()
            });
        }
    });
    
    saveData();
    renderLicencias();
    renderColaboradores();
    closeModal('modalAsignarUsuarios');
    showNotification('✅ Asignaciones guardadas correctamente');
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

// Función para mostrar información de la categoría seleccionada
function updateCategoriaHelp() {
    const categoria = document.getElementById('equipoCategoria').value;
    const helpText = document.getElementById('categoriaHelp');
    
    const descriptions = {
        '1': 'Equipos básicos: Celeron, Pentium, i3 (cualquier gen), Ryzen 3, 4-8GB RAM. Para tareas administrativas y de oficina básicas.',
        '2': 'Equipos intermedios: i5 (gen 6-10), Ryzen 5 (gen 1-4), 8-16GB RAM. Para multitarea, navegación intensiva, hojas de cálculo complejas.',
        '3': 'Equipos alto rendimiento: i5 (gen 11+), i7 (cualquier gen), Ryzen 5 (gen 5+), Ryzen 7, 16GB+ RAM. Para desarrollo, diseño, edición, ingeniería.'
    };
    
    helpText.textContent = descriptions[categoria] || '';
}

// Función para sugerir categoría basada en especificaciones
function sugerirCategoria() {
    const procesador = document.getElementById('equipoProcesador').value.toLowerCase();
    const ram = parseInt(document.getElementById('equipoRam').value) || 0;
    let categoriaSugerida = '2'; // Por defecto intermedio
    
    // Categoría 1 - Básico
    if (procesador.includes('celeron') || 
        procesador.includes('pentium') || 
        (procesador.includes('i3') && !procesador.includes('i5') && !procesador.includes('i7')) ||
        procesador.includes('ryzen 3') ||
        procesador.includes('r3') ||
        ram <= 8) {
        categoriaSugerida = '1';
    }
    
    // Categoría 3 - Alto Rendimiento
    else if (procesador.includes('i7') || 
             procesador.includes('ryzen 7') || 
             procesador.includes('r7') ||
             (procesador.includes('i5') && (procesador.includes('11') || procesador.includes('12') || procesador.includes('13') || procesador.includes('14'))) ||
             (procesador.includes('ryzen 5') && (procesador.includes('5000') || procesador.includes('6000') || procesador.includes('7000'))) ||
             ram >= 16) {
        categoriaSugerida = '3';
    }
    
    // Categoría 2 - Intermedio (por defecto si no cumple las anteriores)
    // i5 gen 6-10, Ryzen 5 gen 1-4, 8-16GB RAM
    
    document.getElementById('equipoCategoria').value = categoriaSugerida;
    updateCategoriaHelp();
    
    // Mostrar notificación de sugerencia
    const categoriaNames = {
        '1': 'Categoría 1 - Básico',
        '2': 'Categoría 2 - Intermedio', 
        '3': 'Categoría 3 - Alto Rendimiento'
    };
    showNotification(`💡 Categoría sugerida: ${categoriaNames[categoriaSugerida]}`, 'success');
}

// Actualizar estadísticas de reportes
function updateReportesStats() {
    // Valor total del inventario
    const valorTotal = database.equipos.reduce((sum, eq) => {
        return sum + (parseFloat(eq.precio) || 0);
    }, 0);
    
    const valorElem = document.getElementById('valorTotalInventario');
    if (valorElem) {
        valorElem.textContent = '$' + valorTotal.toLocaleString('es-MX', {minimumFractionDigits: 0, maximumFractionDigits: 0});
    }
    
    // Equipos en garantía
    const equiposGarantia = database.equipos.filter(eq => 
        garantiaVigente(eq.fechaCompra, eq.garantiaMeses)
    ).length;
    
    const garantiaElem = document.getElementById('equiposEnGarantia');
    if (garantiaElem) {
        garantiaElem.textContent = equiposGarantia;
    }
    
    // Mantenimientos pendientes
    const mttosPendientes = database.equipos.filter(eq => 
        mantenimientoVencido(eq.ultimoMantenimiento, eq.frecuenciaMantenimiento)
    ).length;
    
    const mttosElem = document.getElementById('mantenimientosPendientes');
    if (mttosElem) {
        mttosElem.textContent = mttosPendientes;
    }
    
    // Licencias activas
    const licenciasActivas = database.licencias.filter(l => l.estado === 'Activa').length;
    const licenciasElem = document.getElementById('licenciasActivasTotal');
    if (licenciasElem) {
        licenciasElem.textContent = licenciasActivas;
    }
}

// ============================================
// FUNCIONES DE GENERACIÓN DE REPORTES EN EXCEL
// ============================================

// Función auxiliar para crear libro de Excel
function crearLibroExcel() {
    return { SheetNames: [], Sheets: {} };
}

// Función auxiliar para agregar hoja al libro
function agregarHoja(wb, nombre, datos) {
    const ws = XLSX.utils.json_to_sheet(datos);
    wb.SheetNames.push(nombre);
    wb.Sheets[nombre] = ws;
}

// Función auxiliar para descargar Excel
function descargarExcel(wb, nombreArchivo) {
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'binary' });
    
    function s2ab(s) {
        const buf = new ArrayBuffer(s.length);
        const view = new Uint8Array(buf);
        for (let i = 0; i < s.length; i++) view[i] = s.charCodeAt(i) & 0xFF;
        return buf;
    }
    
    const blob = new Blob([s2ab(wbout)], { type: 'application/octet-stream' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = nombreArchivo;
    link.click();
}

// Reporte General Completo
function generarReporteGeneral() {
    const wb = crearLibroExcel();
    
    // Hoja de Equipos
    const equiposData = database.equipos.map(eq => {
        const asignacion = database.asignaciones.find(a => a.equipoId === eq._id && a.estado === 'Activa');
        const colaborador = asignacion ? database.colaboradores.find(c => c._id === asignacion.colaboradorId) : null;
        const proximoMtto = calcularProximoMantenimiento(eq.ultimoMantenimiento, eq.frecuenciaMantenimiento);
        const enGarantia = garantiaVigente(eq.fechaCompra, eq.garantiaMeses);
        
        return {
            'ID Interno': eq.idInterno || '',
            'Tipo': eq.tipo,
            'Marca': eq.marca,
            'Modelo': eq.modelo,
            'Serie': eq.numSerie,
            'Categoría': eq.categoria ? `Cat. ${eq.categoria}` : '',
            'Propiedad': eq.propiedad || '',
            'Procesador': eq.procesador || '',
            'RAM (GB)': eq.ram || '',
            'Almacenamiento': eq.almacenamiento || '',
            'SO': eq.so || '',
            'Estado': eq.estado,
            'Asignado a': colaborador ? colaborador.nombre : '',
            'Fecha Compra': eq.fechaCompra ? new Date(eq.fechaCompra).toLocaleDateString() : '',
            'Precio': eq.precio || '',
            'Proveedor': eq.proveedor || '',
            'Garantía (meses)': eq.garantiaMeses || '',
            'En Garantía': enGarantia ? 'Sí' : 'No',
            'Último Mtto': eq.ultimoMantenimiento ? new Date(eq.ultimoMantenimiento).toLocaleDateString() : '',
            'Próximo Mtto': proximoMtto ? proximoMtto.toLocaleDateString() : ''
        };
    });
    agregarHoja(wb, 'Equipos', equiposData);
    
    // Hoja de Colaboradores
    const colaboradoresData = database.colaboradores.map(col => {
        const equiposAsignados = database.asignaciones.filter(a => a.colaboradorId === col._id && a.estado === 'Activa');
        const licenciasAsignadas = database.licenciasAsignaciones.filter(la => la.colaboradorId === col._id);
        
        return {
            'Nombre': col.nombre,
            'Email': col.email,
            'Teléfono': col.telefono || '',
            'Departamento': col.departamento,
            'Puesto': col.puesto,
            'Fecha Ingreso': col.fechaIngreso ? new Date(col.fechaIngreso).toLocaleDateString() : '',
            'Jefe Inmediato': col.jefeInmediato || '',
            'Equipos Asignados': equiposAsignados.length,
            'Licencias Asignadas': licenciasAsignadas.length
        };
    });
    agregarHoja(wb, 'Colaboradores', colaboradoresData);
    
    // Hoja de Asignaciones
    const asignacionesData = database.asignaciones.map(asig => {
        const colaborador = database.colaboradores.find(c => c._id === asig.colaboradorId);
        const equipo = database.equipos.find(e => e._id === asig.equipoId);
        
        return {
            'Colaborador': colaborador ? colaborador.nombre : '',
            'Departamento': colaborador ? colaborador.departamento : '',
            'Equipo': equipo ? `${equipo.marca} ${equipo.modelo}` : '',
            'Serie': equipo ? equipo.numSerie : '',
            'Tipo': equipo ? equipo.tipo : '',
            'Fecha Asignación': new Date(asig.fechaAsignacion).toLocaleDateString(),
            'Fecha Devolución': asig.fechaDevolucion ? new Date(asig.fechaDevolucion).toLocaleDateString() : '',
            'Estado': asig.estado,
            'Observaciones': asig.observaciones || ''
        };
    });
    agregarHoja(wb, 'Asignaciones', asignacionesData);
    
    // Hoja de Licencias
    const licenciasData = database.licencias.map(lic => {
        const asignaciones = database.licenciasAsignaciones.filter(la => la.licenciaId === lic._id);
        
        return {
            'Software': lic.software,
            'Tipo': lic.tipo,
            'Clave': lic.clave || '',
            'Estado': lic.estado,
            'Usuarios Asignados': asignaciones.length,
            'Fecha Compra': lic.fechaCompra ? new Date(lic.fechaCompra).toLocaleDateString() : '',
            'Fecha Vencimiento': lic.fechaVencimiento ? new Date(lic.fechaVencimiento).toLocaleDateString() : '',
            'Notas': lic.notas || ''
        };
    });
    agregarHoja(wb, 'Licencias', licenciasData);
    
    const fecha = new Date().toISOString().split('T')[0];
    descargarExcel(wb, `Reporte_General_${fecha}.xlsx`);
    showNotification('✅ Reporte general descargado', 'success');
}

// Reporte de Equipos
function generarReporteEquipos() {
    const wb = crearLibroExcel();
    
    const equiposData = database.equipos.map(eq => {
        const asignacion = database.asignaciones.find(a => a.equipoId === eq._id && a.estado === 'Activa');
        const colaborador = asignacion ? database.colaboradores.find(c => c._id === asignacion.colaboradorId) : null;
        
        return {
            'ID Interno': eq.idInterno || '',
            'Tipo': eq.tipo,
            'Marca': eq.marca,
            'Modelo': eq.modelo,
            'Número de Serie': eq.numSerie,
            'Nombre Equipo': eq.nombreEquipo || '',
            'Categoría': eq.categoria ? `Categoría ${eq.categoria}` : '',
            'Propiedad': eq.propiedad || '',
            'Procesador': eq.procesador || '',
            'RAM (GB)': eq.ram || '',
            'Almacenamiento': eq.almacenamiento || '',
            'Sistema Operativo': eq.so || '',
            'Estado': eq.estado,
            'Asignado a': colaborador ? colaborador.nombre : 'Sin asignar',
            'Departamento': colaborador ? colaborador.departamento : '',
            'Observaciones': eq.observaciones || ''
        };
    });
    
    agregarHoja(wb, 'Inventario Equipos', equiposData);
    
    const fecha = new Date().toISOString().split('T')[0];
    descargarExcel(wb, `Inventario_Equipos_${fecha}.xlsx`);
    showNotification('✅ Inventario de equipos descargado', 'success');
}

// Reporte de Colaboradores
function generarReporteColaboradores() {
    const wb = crearLibroExcel();
    
    const colaboradoresData = database.colaboradores.map(col => {
        const equiposAsignados = database.asignaciones.filter(a => a.colaboradorId === col._id && a.estado === 'Activa');
        const licenciasAsignadas = database.licenciasAsignaciones.filter(la => la.colaboradorId === col._id);
        
        const equiposDetalle = equiposAsignados.map(asig => {
            const equipo = database.equipos.find(e => e._id === asig.equipoId);
            return equipo ? `${equipo.marca} ${equipo.modelo}` : '';
        }).join(', ');
        
        return {
            'Nombre Completo': col.nombre,
            'Email': col.email,
            'Teléfono': col.telefono || '',
            'Departamento': col.departamento,
            'Puesto': col.puesto,
            'Fecha de Ingreso': col.fechaIngreso ? new Date(col.fechaIngreso).toLocaleDateString() : '',
            'Jefe Inmediato': col.jefeInmediato || '',
            'Cantidad Equipos': equiposAsignados.length,
            'Equipos Asignados': equiposDetalle,
            'Cantidad Licencias': licenciasAsignadas.length
        };
    });
    
    agregarHoja(wb, 'Directorio', colaboradoresData);
    
    const fecha = new Date().toISOString().split('T')[0];
    descargarExcel(wb, `Directorio_Colaboradores_${fecha}.xlsx`);
    showNotification('✅ Directorio de colaboradores descargado', 'success');
}

// Reporte de Licencias
function generarReporteLicencias() {
    const wb = crearLibroExcel();
    
    const licenciasData = database.licencias.map(lic => {
        const asignaciones = database.licenciasAsignaciones.filter(la => la.licenciaId === lic._id);
        const usuarios = asignaciones.map(asig => {
            const col = database.colaboradores.find(c => c._id === asig.colaboradorId);
            return col ? col.nombre : '';
        }).join(', ');
        
        return {
            'Software': lic.software,
            'Tipo de Licencia': lic.tipo,
            'Clave/Serial': lic.clave || '',
            'Estado': lic.estado,
            'Cantidad Usuarios': asignaciones.length,
            'Usuarios Asignados': usuarios,
            'Fecha de Compra': lic.fechaCompra ? new Date(lic.fechaCompra).toLocaleDateString() : '',
            'Fecha de Vencimiento': lic.fechaVencimiento ? new Date(lic.fechaVencimiento).toLocaleDateString() : '',
            'Notas': lic.notas || ''
        };
    });
    
    agregarHoja(wb, 'Licencias', licenciasData);
    
    const fecha = new Date().toISOString().split('T')[0];
    descargarExcel(wb, `Licencias_${fecha}.xlsx`);
    showNotification('✅ Reporte de licencias descargado', 'success');
}

// Reporte de Mantenimientos
function generarReporteMantenimiento() {
    const wb = crearLibroExcel();
    
    const mantenimientosData = database.equipos
        .filter(eq => eq.ultimoMantenimiento && eq.frecuenciaMantenimiento)
        .map(eq => {
            const proximoMtto = calcularProximoMantenimiento(eq.ultimoMantenimiento, eq.frecuenciaMantenimiento);
            const dias = diasHastaMantenimiento(eq.ultimoMantenimiento, eq.frecuenciaMantenimiento);
            const vencido = mantenimientoVencido(eq.ultimoMantenimiento, eq.frecuenciaMantenimiento);
            const asignacion = database.asignaciones.find(a => a.equipoId === eq._id && a.estado === 'Activa');
            const colaborador = asignacion ? database.colaboradores.find(c => c._id === asignacion.colaboradorId) : null;
            
            return {
                'Equipo': `${eq.marca} ${eq.modelo}`,
                'Serie': eq.numSerie,
                'ID Interno': eq.idInterno || '',
                'Asignado a': colaborador ? colaborador.nombre : 'Disponible',
                'Departamento': colaborador ? colaborador.departamento : '',
                'Último Mantenimiento': new Date(eq.ultimoMantenimiento).toLocaleDateString(),
                'Frecuencia (meses)': eq.frecuenciaMantenimiento,
                'Próximo Mantenimiento': proximoMtto ? proximoMtto.toLocaleDateString() : '',
                'Días Restantes': dias !== null ? dias : '',
                'Estado': vencido ? 'VENCIDO' : (dias <= 30 ? 'PRÓXIMO' : 'Al corriente')
            };
        })
        .sort((a, b) => (a['Días Restantes'] || 999) - (b['Días Restantes'] || 999));
    
    agregarHoja(wb, 'Calendario Mttos', mantenimientosData);
    
    const fecha = new Date().toISOString().split('T')[0];
    descargarExcel(wb, `Calendario_Mantenimientos_${fecha}.xlsx`);
    showNotification('✅ Calendario de mantenimientos descargado', 'success');
}

// Reporte de Mantenimientos Vencidos
function generarReporteMantenimientoVencido() {
    const wb = crearLibroExcel();
    
    const vencidosData = database.equipos
        .filter(eq => mantenimientoVencido(eq.ultimoMantenimiento, eq.frecuenciaMantenimiento))
        .map(eq => {
            const proximoMtto = calcularProximoMantenimiento(eq.ultimoMantenimiento, eq.frecuenciaMantenimiento);
            const dias = diasHastaMantenimiento(eq.ultimoMantenimiento, eq.frecuenciaMantenimiento);
            const asignacion = database.asignaciones.find(a => a.equipoId === eq._id && a.estado === 'Activa');
            const colaborador = asignacion ? database.colaboradores.find(c => c._id === asignacion.colaboradorId) : null;
            
            return {
                'Equipo': `${eq.marca} ${eq.modelo}`,
                'Serie': eq.numSerie,
                'Asignado a': colaborador ? colaborador.nombre : 'Disponible',
                'Departamento': colaborador ? colaborador.departamento : '',
                'Email': colaborador ? colaborador.email : '',
                'Último Mantenimiento': new Date(eq.ultimoMantenimiento).toLocaleDateString(),
                'Debió realizarse el': proximoMtto ? proximoMtto.toLocaleDateString() : '',
                'Días de Retraso': Math.abs(dias)
            };
        })
        .sort((a, b) => b['Días de Retraso'] - a['Días de Retraso']);
    
    agregarHoja(wb, 'Mttos Vencidos', vencidosData);
    
    const fecha = new Date().toISOString().split('T')[0];
    descargarExcel(wb, `Mantenimientos_Vencidos_${fecha}.xlsx`);
    showNotification('✅ Reporte de mantenimientos vencidos descargado', 'success');
}

// Reporte de Garantías
function generarReporteGarantias() {
    const wb = crearLibroExcel();
    
    const garantiasData = database.equipos
        .filter(eq => eq.fechaCompra && eq.garantiaMeses)
        .map(eq => {
            const enGarantia = garantiaVigente(eq.fechaCompra, eq.garantiaMeses);
            const fechaVencimiento = calcularVencimientoGarantia(eq.fechaCompra, eq.garantiaMeses);
            
            return {
                'Equipo': `${eq.marca} ${eq.modelo}`,
                'Serie': eq.numSerie,
                'Fecha de Compra': new Date(eq.fechaCompra).toLocaleDateString(),
                'Proveedor': eq.proveedor || '',
                'Garantía (meses)': eq.garantiaMeses,
                'Vencimiento': fechaVencimiento ? fechaVencimiento.toLocaleDateString() : '',
                'Estado': enGarantia ? 'VIGENTE' : 'VENCIDA',
                'Precio': eq.precio ? `$${parseFloat(eq.precio).toLocaleString('es-MX')}` : '',
                'Factura': eq.factura || ''
            };
        });
    
    agregarHoja(wb, 'Garantías', garantiasData);
    
    const fecha = new Date().toISOString().split('T')[0];
    descargarExcel(wb, `Estado_Garantias_${fecha}.xlsx`);
    showNotification('✅ Reporte de garantías descargado', 'success');
}

// Reporte de Compras
function generarReporteCompras() {
    const wb = crearLibroExcel();
    
    const comprasData = database.equipos
        .filter(eq => eq.fechaCompra)
        .map(eq => {
            return {
                'Fecha de Compra': new Date(eq.fechaCompra).toLocaleDateString(),
                'Equipo': `${eq.marca} ${eq.modelo}`,
                'Tipo': eq.tipo,
                'Serie': eq.numSerie,
                'Proveedor': eq.proveedor || '',
                'Precio': eq.precio || '',
                'Factura': eq.factura || '',
                'Garantía (meses)': eq.garantiaMeses || '',
                'Estado Actual': eq.estado
            };
        })
        .sort((a, b) => new Date(b['Fecha de Compra']) - new Date(a['Fecha de Compra']));
    
    agregarHoja(wb, 'Historial Compras', comprasData);
    
    const fecha = new Date().toISOString().split('T')[0];
    descargarExcel(wb, `Historial_Compras_${fecha}.xlsx`);
    showNotification('✅ Historial de compras descargado', 'success');
}

// Reporte de Valor de Activos
function generarReporteValorActivos() {
    const wb = crearLibroExcel();
    
    const activosData = database.equipos
        .filter(eq => eq.precio)
        .map(eq => {
            const asignacion = database.asignaciones.find(a => a.equipoId === eq._id && a.estado === 'Activa');
            const colaborador = asignacion ? database.colaboradores.find(c => c._id === asignacion.colaboradorId) : null;
            
            return {
                'Equipo': `${eq.marca} ${eq.modelo}`,
                'Serie': eq.numSerie,
                'Categoría': eq.categoria ? `Cat. ${eq.categoria}` : '',
                'Fecha de Compra': eq.fechaCompra ? new Date(eq.fechaCompra).toLocaleDateString() : '',
                'Precio': parseFloat(eq.precio),
                'Estado': eq.estado,
                'Asignado a': colaborador ? colaborador.nombre : 'Disponible',
                'Departamento': colaborador ? colaborador.departamento : ''
            };
        })
        .sort((a, b) => b.Precio - a.Precio);
    
    agregarHoja(wb, 'Valor Activos', activosData);
    
    const fecha = new Date().toISOString().split('T')[0];
    descargarExcel(wb, `Valor_Activos_${fecha}.xlsx`);
    showNotification('✅ Reporte de valor de activos descargado', 'success');
}

// Reporte por Categoría
function generarReportePorCategoria() {
    const wb = crearLibroExcel();
    
    // Resumen por categoría
    const resumenData = [
        {
            'Categoría': 'Categoría 1 - Básico',
            'Cantidad': database.equipos.filter(eq => eq.categoria === '1').length,
            'Valor Total': database.equipos.filter(eq => eq.categoria === '1').reduce((sum, eq) => sum + (parseFloat(eq.precio) || 0), 0)
        },
        {
            'Categoría': 'Categoría 2 - Intermedio',
            'Cantidad': database.equipos.filter(eq => eq.categoria === '2').length,
            'Valor Total': database.equipos.filter(eq => eq.categoria === '2').reduce((sum, eq) => sum + (parseFloat(eq.precio) || 0), 0)
        },
        {
            'Categoría': 'Categoría 3 - Alto Rendimiento',
            'Cantidad': database.equipos.filter(eq => eq.categoria === '3').length,
            'Valor Total': database.equipos.filter(eq => eq.categoria === '3').reduce((sum, eq) => sum + (parseFloat(eq.precio) || 0), 0)
        }
    ];
    
    agregarHoja(wb, 'Resumen por Categoría', resumenData);
    
    // Detalle por categoría
    const detalleData = database.equipos.map(eq => {
        const asignacion = database.asignaciones.find(a => a.equipoId === eq._id && a.estado === 'Activa');
        const colaborador = asignacion ? database.colaboradores.find(c => c._id === asignacion.colaboradorId) : null;
        
        return {
            'Categoría': eq.categoria ? `Categoría ${eq.categoria}` : 'Sin categoría',
            'Equipo': `${eq.marca} ${eq.modelo}`,
            'Procesador': eq.procesador || '',
            'RAM (GB)': eq.ram || '',
            'Estado': eq.estado,
            'Asignado a': colaborador ? colaborador.nombre : '',
            'Departamento': colaborador ? colaborador.departamento : '',
            'Precio': eq.precio || ''
        };
    }).sort((a, b) => (a.Categoría).localeCompare(b.Categoría));
    
    agregarHoja(wb, 'Detalle por Categoría', detalleData);
    
    const fecha = new Date().toISOString().split('T')[0];
    descargarExcel(wb, `Distribucion_Categorias_${fecha}.xlsx`);
    showNotification('✅ Reporte de distribución por categoría descargado', 'success');
}

// Cargar datos al iniciar
window.onload = loadData;
