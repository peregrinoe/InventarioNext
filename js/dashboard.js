// DASHBOARD
function updateDashboard() {
    document.getElementById('totalColaboradores').textContent = database.colaboradores.length;
    document.getElementById('totalEquipos').textContent = database.equipos.length;
    
    const asignados = database.asignaciones.filter(a => a.estado === 'Activa').length;
    document.getElementById('equiposAsignados').textContent = asignados;
    document.getElementById('equiposDisponibles').textContent = 
        database.equipos.filter(e => e.estado === 'Disponible').length;
    
    // Estadísticas de celulares
    const celularesArray = database.celulares || [];
    const asignacionesCelularesArray = database.asignacionesCelulares || [];
    
    document.getElementById('totalCelulares').textContent = celularesArray.length;
    const celularesAsignados = asignacionesCelularesArray.filter(a => a.estado === 'Activa').length;
    document.getElementById('celularesAsignados').textContent = celularesAsignados;
    document.getElementById('celularesDisponibles').textContent = 
        celularesArray.filter(c => c.estado === 'Disponible').length;
    document.getElementById('totalLicencias').textContent = database.licencias.length;
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
