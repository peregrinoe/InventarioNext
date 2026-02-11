
// Base de datos NoSQL simulada
let database = {
    colaboradores: [],
    equipos: [],
    asignaciones: []
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
    updateDashboard();
    renderColaboradores();
    renderEquipos();
    renderAsignaciones();
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
    } else if (modalId === 'modalEquipo') {
        document.getElementById('formEquipo').reset();
        document.getElementById('equipoId').value = '';
        document.getElementById('modalEquipoTitle').textContent = 'Nuevo Equipo';
    } else if (modalId === 'modalAsignacion') {
        document.getElementById('formAsignacion').reset();
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
                <td colspan="6" class="empty-state">
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
        
        return `
            <tr>
                <td><strong>${col.nombre}</strong></td>
                <td>${col.email}</td>
                <td>${col.departamento}</td>
                <td>${col.puesto}</td>
                <td><span class="badge badge-info">${equiposAsignados} equipo(s)</span></td>
                <td class="action-buttons">
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
        especificaciones: {
            procesador: document.getElementById('equipoProcesador').value,
            ram: document.getElementById('equipoRam').value,
            almacenamiento: document.getElementById('equipoAlmacenamiento').value,
            sistemaOperativo: document.getElementById('equipoSO').value
        },
        fechaCompra: document.getElementById('equipoFechaCompra').value,
        estado: document.getElementById('equipoEstado').value,
        observaciones: document.getElementById('equipoObservaciones').value,
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
                <td colspan="8" class="empty-state">
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
        
        let estadoBadge = '';
        switch(eq.estado) {
            case 'Disponible':
                estadoBadge = '<span class="badge badge-success">Disponible</span>';
                break;
            case 'Asignado':
                estadoBadge = '<span class="badge badge-info">Asignado</span>';
                break;
            case 'Mantenimiento':
                estadoBadge = '<span class="badge badge-warning">Mantenimiento</span>';
                break;
            case 'Baja':
                estadoBadge = '<span class="badge badge-danger">Baja</span>';
                break;
        }
        
        return `
            <tr>
                <td><strong>${eq.marca}</strong></td>
                <td>${eq.modelo}</td>
                <td>${eq.tipo}</td>
                <td>${eq.numSerie}</td>
                <td>${estadoBadge}</td>
                <td>${colaborador ? colaborador.nombre : '-'}</td>
                <td class="action-buttons">
                    <button class="btn btn-sm btn-primary" onclick='editEquipo("${eq._id}")'>✏️ Editar</button>
                    <button class="btn btn-sm btn-danger" onclick='deleteEquipo("${eq._id}")'>🗑️ Eliminar</button>
                </td>
            </tr>
        `;
    }).join('');
}

function editEquipo(id) {
    const equipo = database.equipos.find(e => e._id === id);
    
    document.getElementById('equipoId').value = equipo._id;
    document.getElementById('equipoTipo').value = equipo.tipo;
    document.getElementById('equipoMarca').value = equipo.marca;
    document.getElementById('equipoModelo').value = equipo.modelo;
    document.getElementById('equipoNumSerie').value = equipo.numSerie;
    document.getElementById('equipoProcesador').value = equipo.especificaciones.procesador || '';
    document.getElementById('equipoRam').value = equipo.especificaciones.ram || '';
    document.getElementById('equipoAlmacenamiento').value = equipo.especificaciones.almacenamiento || '';
    document.getElementById('equipoSO').value = equipo.especificaciones.sistemaOperativo || '';
    document.getElementById('equipoFechaCompra').value = equipo.fechaCompra || '';
    document.getElementById('equipoEstado').value = equipo.estado;
    document.getElementById('equipoObservaciones').value = equipo.observaciones || '';
    
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