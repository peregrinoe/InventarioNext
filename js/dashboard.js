// ================================
// DASHBOARD — Estadísticas + Gráfica + Alertas
// ================================

let _chartInventario = null;

function updateDashboard() {
    // ── Colaboradores ──────────────────────────────────────────────────────
    const totalCol = database.colaboradores.length;
    document.getElementById('totalColaboradores').textContent = totalCol;
    document.getElementById('colaboradoresInternos').textContent =
        database.colaboradores.filter(c => !c.esExterno).length;
    document.getElementById('colaboradoresExternos').textContent =
        database.colaboradores.filter(c => c.esExterno).length;

    // ── Equipos ────────────────────────────────────────────────────────────
    const totalEq = database.equipos.length;
    document.getElementById('totalEquipos').textContent = totalEq;
    document.getElementById('equiposEnMantenimiento').textContent =
        database.equipos.filter(e => e.estado === 'En Mantenimiento').length;

    const asignados = database.asignaciones.filter(a => a.estado === 'Activa').length;
    document.getElementById('equiposAsignados').textContent = asignados;
    document.getElementById('pctEquiposAsignados').textContent =
        totalEq > 0 ? Math.round((asignados / totalEq) * 100) : 0;

    document.getElementById('equiposDisponibles').textContent =
        database.equipos.filter(e => e.estado === 'Disponible').length;

    // ── Celulares ──────────────────────────────────────────────────────────
    const celularesArray = database.celulares || [];
    const asignacionesCelularesArray = database.asignacionesCelulares || [];
    document.getElementById('totalCelulares').textContent = celularesArray.length;
    document.getElementById('celularesAsignados').textContent =
        asignacionesCelularesArray.filter(a => a.estado === 'Activa').length;
    document.getElementById('celularesDisponibles').textContent =
        celularesArray.filter(c => c.estado === 'Disponible').length;

    // ── Licencias ──────────────────────────────────────────────────────────
    document.getElementById('totalLicencias').textContent = database.licencias.length;
    const hoy = new Date();
    document.getElementById('licenciasVencidas').textContent =
        database.licencias.filter(l => l.fechaVencimiento && new Date(l.fechaVencimiento) < hoy).length;

    // ── Cartas Responsivas ─────────────────────────────────────────────────
    const conEquipos = database.colaboradores.filter(c =>
        database.asignaciones.some(a => a.colaboradorId === c._id && a.estado === 'Activa')
    );
    const cartasCompletas = conEquipos.filter(c => c.cartaEstado === 'completa').length;
    const cartasPendientes = conEquipos.filter(c => c.cartaEstado !== 'completa').length;
    document.getElementById('cartasCompletas').textContent  = cartasCompletas;
    document.getElementById('cartasPendientes').textContent = cartasPendientes;

    // ── Gráfica y Alertas ──────────────────────────────────────────────────
    updateChartInventario();
    updateAlertas();
}

// ── Gráfica de dona ────────────────────────────────────────────────────────
function updateChartInventario() {
    const disponibles    = database.equipos.filter(e => e.estado === 'Disponible').length;
    const asignados      = database.asignaciones.filter(a => a.estado === 'Activa').length;
    const mantenimiento  = database.equipos.filter(e => e.estado === 'En Mantenimiento').length;
    const celulares      = database.celulares.length;
    const licencias      = database.licencias.length;

    const data   = [disponibles, asignados, mantenimiento, celulares, licencias];
    const labels = ['Equipos Disponibles', 'Equipos Asignados', 'En Mantenimiento', 'Celulares', 'Licencias'];
    const colors = ['#43e97b', '#4facfe', '#fa709a', '#f093fb', '#ff9a9e'];

    const canvas = document.getElementById('chartInventario');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (_chartInventario) {
        _chartInventario.data.datasets[0].data = data;
        _chartInventario.update();
    } else {
        _chartInventario = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: colors,
                    borderColor: '#fff',
                    borderWidth: 3,
                    hoverOffset: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '62%',
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: ctx => ` ${ctx.label}: ${ctx.raw}`
                        }
                    }
                }
            }
        });
    }

    // Leyenda manual
    const leyenda = document.getElementById('chartLeyenda');
    if (leyenda) {
        leyenda.innerHTML = labels.map((l, i) => `
            <span style="display:flex;align-items:center;gap:5px;">
                <span style="width:12px;height:12px;border-radius:50%;background:${colors[i]};flex-shrink:0;"></span>
                ${l}: <strong>${data[i]}</strong>
            </span>
        `).join('');
    }
}

// ── Alertas del sistema ────────────────────────────────────────────────────
function updateAlertas() {
    const contenedor = document.getElementById('dashboardAlertas');
    if (!contenedor) return;

    const alertas = [];
    const hoy      = new Date();
    const en30dias = new Date(); en30dias.setDate(en30dias.getDate() + 30);

    // Licencias vencidas
    database.licencias.forEach(l => {
        if (l.fechaVencimiento && new Date(l.fechaVencimiento) < hoy) {
            alertas.push({ tipo: 'danger', icon: '🔑', msg: `Licencia vencida: <strong>${l.nombre}</strong>` });
        } else if (l.fechaVencimiento && new Date(l.fechaVencimiento) <= en30dias) {
            alertas.push({ tipo: 'warning', icon: '⚠️', msg: `Licencia por vencer: <strong>${l.nombre}</strong> (${new Date(l.fechaVencimiento).toLocaleDateString('es-MX')})` });
        }
    });

    // Equipos en mantenimiento
    const enMant = database.equipos.filter(e => e.estado === 'En Mantenimiento');
    if (enMant.length > 0) {
        alertas.push({ tipo: 'warning', icon: '🔧', msg: `<strong>${enMant.length}</strong> equipo(s) en mantenimiento` });
    }

    // Cartas responsivas pendientes (colaboradores con equipos)
    const pendientes = database.colaboradores.filter(c =>
        c.cartaEstado !== 'completa' &&
        database.asignaciones.some(a => a.colaboradorId === c._id && a.estado === 'Activa')
    );
    if (pendientes.length > 0) {
        alertas.push({ tipo: 'warning', icon: '📋', msg: `<strong>${pendientes.length}</strong> carta(s) responsiva(s) pendiente(s) de firma` });
    }

    // Garantías por vencer en 30 días
    database.equipos.forEach(eq => {
        if (eq.fechaCompra && eq.garantiaMeses) {
            const vence = new Date(eq.fechaCompra);
            vence.setMonth(vence.getMonth() + parseInt(eq.garantiaMeses));
            if (vence > hoy && vence <= en30dias) {
                alertas.push({ tipo: 'info', icon: '🛡️', msg: `Garantía por vencer: <strong>${eq.marca} ${eq.modelo}</strong> (${vence.toLocaleDateString('es-MX')})` });
            }
        }
    });

    // Sin alertas
    if (alertas.length === 0) {
        contenedor.innerHTML = `
            <div style="text-align:center;padding:30px 0;color:#94a3b8;">
                <div style="font-size:2.5em;margin-bottom:8px;">✅</div>
                <div style="font-weight:600;">Todo en orden</div>
                <div style="font-size:0.85em;">No hay alertas pendientes</div>
            </div>`;
        return;
    }

    const colores = {
        danger:  { bg: '#fee2e2', border: '#fca5a5', color: '#991b1b' },
        warning: { bg: '#fef3c7', border: '#fcd34d', color: '#92400e' },
        info:    { bg: '#dbeafe', border: '#93c5fd', color: '#1e40af' }
    };

    contenedor.innerHTML = alertas.map(a => {
        const c = colores[a.tipo];
        return `
            <div style="background:${c.bg};border:1px solid ${c.border};border-radius:8px;padding:10px 14px;color:${c.color};font-size:0.88em;display:flex;gap:8px;align-items:center;">
                <span style="font-size:1.2em;">${a.icon}</span>
                <span>${a.msg}</span>
            </div>`;
    }).join('');
}

// ── Tabla de asignaciones recientes ───────────────────────────────────────
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
            </tr>`;
        return;
    }

    tbody.innerHTML = asignacionesActivas.map(asig => {
        const colaborador = database.colaboradores.find(c => c._id === asig.colaboradorId);
        const equipo      = database.equipos.find(e => e._id === asig.equipoId);
        return `
            <tr>
                <td><strong>${colaborador ? colaborador.nombre : 'N/A'}</strong></td>
                <td>${equipo ? `${equipo.marca} ${equipo.modelo}` : 'N/A'}</td>
                <td>${equipo ? equipo.tipo : 'N/A'}</td>
                <td>${new Date(asig.fechaAsignacion).toLocaleDateString('es-MX')}</td>
                <td><span class="badge badge-success">Activa</span></td>
            </tr>`;
    }).join('');
}

// ── Cerrar modales al hacer clic fuera ─────────────────────────────────────
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('active');
    }
}

// ── Helpers para equipos.js (sin cambios) ─────────────────────────────────
function updateCategoriaHelp() {
    const categoria = document.getElementById('equipoCategoria').value;
    const helpText  = document.getElementById('categoriaHelp');
    const descriptions = {
        '1': 'Equipos básicos: Celeron, Pentium, i3 (cualquier gen), Ryzen 3, 4-8GB RAM. Para tareas administrativas y de oficina básicas.',
        '2': 'Equipos intermedios: i5 (gen 6-10), Ryzen 5 (gen 1-4), 8-16GB RAM. Para multitarea, navegación intensiva, hojas de cálculo complejas.',
        '3': 'Equipos alto rendimiento: i5 (gen 11+), i7 (cualquier gen), Ryzen 5 (gen 5+), Ryzen 7, 16GB+ RAM. Para desarrollo, diseño, edición, ingeniería.'
    };
    helpText.textContent = descriptions[categoria] || '';
}

function sugerirCategoria() {
    const procesador = document.getElementById('equipoProcesador').value.toLowerCase();
    const ram = parseInt(document.getElementById('equipoRam').value) || 0;
    let categoriaSugerida = '2';

    if (procesador.includes('celeron') || procesador.includes('pentium') ||
        (procesador.includes('i3') && !procesador.includes('i5') && !procesador.includes('i7')) ||
        procesador.includes('ryzen 3') || procesador.includes('r3') || ram <= 8) {
        categoriaSugerida = '1';
    } else if (procesador.includes('i7') || procesador.includes('ryzen 7') || procesador.includes('r7') ||
        (procesador.includes('i5') && (procesador.includes('11') || procesador.includes('12') || procesador.includes('13') || procesador.includes('14'))) ||
        (procesador.includes('ryzen 5') && (procesador.includes('5000') || procesador.includes('6000') || procesador.includes('7000'))) ||
        ram >= 16) {
        categoriaSugerida = '3';
    }

    document.getElementById('equipoCategoria').value = categoriaSugerida;
    updateCategoriaHelp();
    const categoriaNames = { '1': 'Categoría 1 - Básico', '2': 'Categoría 2 - Intermedio', '3': 'Categoría 3 - Alto Rendimiento' };
    showNotification(`💡 Categoría sugerida: ${categoriaNames[categoriaSugerida]}`, 'success');
}

function updateReportesStats() {
    const valorTotal = database.equipos.reduce((sum, eq) => sum + (parseFloat(eq.precio) || 0), 0);
    const valorElem = document.getElementById('valorTotalInventario');
    if (valorElem) {
        valorElem.textContent = '$' + valorTotal.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    }
}
