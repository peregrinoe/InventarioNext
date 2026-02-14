// ================================
// BASE DE DATOS Y FUNCIONES CORE
// ================================

// Base de datos NoSQL simulada
let database = {
    colaboradores: [],
    equipos: [],
    celulares: [],
    asignaciones: [],
    asignacionesCelulares: [],
    licencias: [],
    licenciasAsignaciones: []
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
            
            // Validar estructura básica
            if (!importedData.colaboradores || !Array.isArray(importedData.colaboradores)) {
                showNotification('❌ Error: El archivo no contiene el campo "colaboradores" válido', 'error');
                return;
            }
            
            if (!importedData.equipos || !Array.isArray(importedData.equipos)) {
                showNotification('❌ Error: El archivo no contiene el campo "equipos" válido', 'error');
                return;
            }
            
            if (!importedData.asignaciones || !Array.isArray(importedData.asignaciones)) {
                showNotification('❌ Error: El archivo no contiene el campo "asignaciones" válido', 'error');
                return;
            }
            
            // Asegurar que existan todos los campos necesarios
            if (!importedData.celulares) {
                importedData.celulares = [];
            }
            if (!importedData.asignacionesCelulares) {
                importedData.asignacionesCelulares = [];
            }
            if (!importedData.licencias) {
                importedData.licencias = [];
            }
            if (!importedData.licenciasAsignaciones) {
                importedData.licenciasAsignaciones = [];
            }
            
            // Importar datos
            database = importedData;
            saveData();
            
            // Renderizar todas las secciones
            try {
                renderColaboradores();
            } catch (e) {
                console.error('Error al renderizar colaboradores:', e);
            }
            
            try {
                renderEquipos();
            } catch (e) {
                console.error('Error al renderizar equipos:', e);
            }
            
            try {
                renderCelulares();
            } catch (e) {
                console.error('Error al renderizar celulares:', e);
            }
            
            try {
                renderAsignaciones();
            } catch (e) {
                console.error('Error al renderizar asignaciones:', e);
            }
            
            try {
                renderLicencias();
            } catch (e) {
                console.error('Error al renderizar licencias:', e);
            }
            
            try {
                updateDashboard();
            } catch (e) {
                console.error('Error al actualizar dashboard:', e);
            }
            
            const msg = `✅ Importados: ${database.colaboradores.length} colaboradores, ${database.equipos.length} equipos, ${database.celulares.length} celulares, ${database.licencias.length} licencias`;
            showNotification(msg, 'success');
            
            // Recargar la página después de 1.5 segundos para asegurar que todo se renderice correctamente
            setTimeout(() => {
                location.reload();
            }, 1500);
            
        } catch (error) {
            console.error('Error al importar:', error);
            showNotification(`❌ Error al leer el archivo: ${error.message}`, 'error');
        }
    };
    
    reader.onerror = function() {
        showNotification('❌ Error al leer el archivo. Verifica que sea un archivo válido.', 'error');
    };
    
    reader.readAsText(file, 'UTF-8');
    
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
    if (!database.celulares) {
        database.celulares = [];
    }
    if (!database.asignacionesCelulares) {
        database.asignacionesCelulares = [];
    }
    updateDashboard();
    renderColaboradores();
    renderEquipos();
    renderCelulares();
    renderAsignaciones();
    renderLicencias();
}

// Guardar datos en localStorage
function saveData() {
    localStorage.setItem('inventarioDB', JSON.stringify(database));
}

// Funciones de navegación
function showSection(sectionId) {
    // Ocultar todas las secciones
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Mostrar la sección seleccionada
    document.getElementById(sectionId).classList.add('active');
    
    // Actualizar botones de navegación
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Actualizar tablas y estadísticas según la sección
    if (sectionId === 'dashboard') {
        updateDashboard();
        updateDashboardTable();
    } else if (sectionId === 'reportes') {
        updateReportesStats();
    }
}

function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
    
    // Limpiar formularios al abrir modal de crear nuevo
    if (modalId === 'modalColaborador' && !document.getElementById('colaboradorId').value) {
        document.getElementById('formColaborador').reset();
        document.getElementById('colaboradorFotoPreview').innerHTML = '';
        document.getElementById('modalColaboradorTitle').textContent = 'Nuevo Colaborador';
    }
    if (modalId === 'modalEquipo' && !document.getElementById('equipoId').value) {
        document.getElementById('formEquipo').reset();
        document.getElementById('equipoFotosPreview').innerHTML = '';
        document.getElementById('modalEquipoTitle').textContent = 'Nuevo Equipo';
    }
    if (modalId === 'modalCelular' && !document.getElementById('celularId').value) {
        document.getElementById('formCelular').reset();
        document.getElementById('celularFotosPreview').innerHTML = '';
        document.getElementById('modalCelularTitle').textContent = 'Nuevo Celular';
    }
    if (modalId === 'modalAsignacion') {
        document.getElementById('formAsignacion').reset();
        loadColaboradoresSelect();
        loadEquiposSelect();
        document.getElementById('asignacionFecha').valueAsDate = new Date();
    }
    if (modalId === 'modalLicencia' && !document.getElementById('licenciaId').value) {
        document.getElementById('formLicencia').reset();
        document.getElementById('modalLicenciaTitle').textContent = 'Nueva Licencia';
    }
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Cerrar modal al hacer clic fuera
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('active');
    }
}

// Cargar datos al iniciar
window.onload = loadData;
