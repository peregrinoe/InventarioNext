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
                if (typeof renderColaboradores === 'function') renderColaboradores();
            } catch (e) {
                console.error('Error al renderizar colaboradores:', e);
            }
            
            try {
                if (typeof renderEquipos === 'function') renderEquipos();
            } catch (e) {
                console.error('Error al renderizar equipos:', e);
            }
            
            try {
                if (typeof renderCelulares === 'function') renderCelulares();
            } catch (e) {
                console.error('Error al renderizar celulares:', e);
            }
            
            try {
                if (typeof renderAsignaciones === 'function') renderAsignaciones();
            } catch (e) {
                console.error('Error al renderizar asignaciones:', e);
            }
            
            try {
                if (typeof renderLicencias === 'function') renderLicencias();
            } catch (e) {
                console.error('Error al renderizar licencias:', e);
            }
            
            try {
                if (typeof updateDashboard === 'function') updateDashboard();
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
        try {
            database = JSON.parse(savedData);
            console.log('✅ Datos cargados:', database);
        } catch (e) {
            console.error('Error al parsear datos:', e);
            database = {
                colaboradores: [],
                equipos: [],
                celulares: [],
                asignaciones: [],
                asignacionesCelulares: [],
                licencias: [],
                licenciasAsignaciones: []
            };
        }
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
    
    // Llamar a las funciones de renderizado solo si existen
    // Esto evita errores si los scripts aún no se han cargado
    try {
        if (typeof updateDashboard === 'function') {
            updateDashboard();
        }
    } catch (e) {
        console.error('Error en updateDashboard:', e);
    }
    
    try {
        if (typeof renderColaboradores === 'function') {
            renderColaboradores();
        }
    } catch (e) {
        console.error('Error en renderColaboradores:', e);
    }
    
    try {
        if (typeof renderEquipos === 'function') {
            renderEquipos();
        }
    } catch (e) {
        console.error('Error en renderEquipos:', e);
    }
    
    try {
        if (typeof renderCelulares === 'function') {
            renderCelulares();
        }
    } catch (e) {
        console.error('Error en renderCelulares:', e);
    }
    
    try {
        if (typeof renderAsignaciones === 'function') {
            renderAsignaciones();
        }
    } catch (e) {
        console.error('Error en renderAsignaciones:', e);
    }
    
    try {
        if (typeof renderLicencias === 'function') {
            renderLicencias();
        }
    } catch (e) {
        console.error('Error en renderLicencias:', e);
    }
}

// Guardar datos en localStorage
function saveData() {
    try {
        localStorage.setItem('inventarioDB', JSON.stringify(database));
        console.log('✅ Datos guardados');
    } catch (e) {
        console.error('Error al guardar datos:', e);
        showNotification('❌ Error al guardar datos', 'error');
    }
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
        if (typeof updateDashboard === 'function') updateDashboard();
        if (typeof updateDashboardTable === 'function') updateDashboardTable();
    } else if (sectionId === 'reportes') {
        if (typeof updateReportesStats === 'function') updateReportesStats();
    }
}

function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
    
    // Limpiar formularios al abrir modal de crear nuevo
    if (modalId === 'modalColaborador' && !document.getElementById('colaboradorId').value) {
        document.getElementById('formColaborador').reset();
        const preview = document.getElementById('colaboradorFotoPreview');
        if (preview) preview.innerHTML = '';
        document.getElementById('modalColaboradorTitle').textContent = 'Nuevo Colaborador';
    }
    if (modalId === 'modalEquipo' && !document.getElementById('equipoId').value) {
        document.getElementById('formEquipo').reset();
        const preview = document.getElementById('equipoFotosPreview');
        if (preview) preview.innerHTML = '';
        document.getElementById('modalEquipoTitle').textContent = 'Nuevo Equipo';
    }
    if (modalId === 'modalCelular' && !document.getElementById('celularId').value) {
        document.getElementById('formCelular').reset();
        const preview = document.getElementById('celularFotosPreview');
        if (preview) preview.innerHTML = '';
        document.getElementById('modalCelularTitle').textContent = 'Nuevo Celular';
    }
    if (modalId === 'modalAsignacion') {
        document.getElementById('formAsignacion').reset();
        if (typeof loadColaboradoresSelect === 'function') loadColaboradoresSelect();
        if (typeof loadEquiposSelect === 'function') loadEquiposSelect();
        const fechaInput = document.getElementById('asignacionFecha');
        if (fechaInput) fechaInput.valueAsDate = new Date();
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

// Cargar datos al iniciar - usar DOMContentLoaded para asegurar que todo esté cargado
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadData);
} else {
    // Si el documento ya está cargado, ejecutar inmediatamente
    loadData();
}
