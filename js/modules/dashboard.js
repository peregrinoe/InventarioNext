// ================================
// DASHBOARD — Estadísticas + Gráficas + Alertas
// ================================

let _chartInventario = null;
let _chartCategorias = null;

function updateDashboard() {
    const hoy = new Date();
    const en30 = new Date(); en30.setDate(en30.getDate() + 30);

    // ── Colaboradores ──────────────────────────────────────────────────────
    const totalCol = database.colaboradores.filter(c => c.esActivo !== false).length;
    document.getElementById('totalColaboradores').textContent = totalCol;
    document.getElementById('colaboradoresInternos').textContent =
        database.colaboradores.filter(c => !c.esExterno && c.esActivo !== false).length;
    document.getElementById('colaboradoresExternos').textContent =
        database.colaboradores.filter(c => c.esExterno && c.esActivo !== false).length;

    // ── Equipos ────────────────────────────────────────────────────────────
    const totalEq = database.equipos.length;
    document.getElementById('totalEquipos').textContent = totalEq;
    document.getElementById('equiposEnMantenimiento').textContent =
        database.equipos.filter(e => e.estado === 'En Mantenimiento').length;

    const asignados = database.asignaciones.filter(a => a.estado === 'Activa').length;
    const pct       = totalEq > 0 ? Math.round((asignados / totalEq) * 100) : 0;
    document.getElementById('equiposAsignados').textContent  = asignados;
    document.getElementById('equiposDisponibles').textContent =
        database.equipos.filter(e => e.estado === 'Disponible').length;
    document.getElementById('pctEquiposAsignados').textContent = pct;
    const barUtil = document.getElementById('barUtilizacion');
    if (barUtil) barUtil.style.width = pct + '%';

    // ── Celulares ──────────────────────────────────────────────────────────
    const celArr  = database.celulares || [];
    const asigCel = database.asignacionesCelulares || [];
    document.getElementById('totalCelulares').textContent    = celArr.length;
    document.getElementById('celularesAsignados').textContent =
        asigCel.filter(a => a.estado === 'Activa').length;
    document.getElementById('celularesDisponibles').textContent =
        celArr.filter(c => c.estado === 'Disponible').length;

    // ── Licencias ──────────────────────────────────────────────────────────
    document.getElementById('totalLicencias').textContent = database.licencias.length;
    document.getElementById('licenciasVencidas').textContent =
        database.licencias.filter(l => l.fechaVencimiento && new Date(l.fechaVencimiento) < hoy).length;
    document.getElementById('licenciasPorVencer').textContent =
        database.licencias.filter(l => l.fechaVencimiento &&
            new Date(l.fechaVencimiento) >= hoy && new Date(l.fechaVencimiento) <= en30).length;

    // ── Cartas Responsivas ─────────────────────────────────────────────────
    const conEquipos = database.colaboradores.filter(c =>
        database.asignaciones.some(a => a.colaboradorId === c._id && a.estado === 'Activa')
    );
    const cartasCompletas  = conEquipos.filter(c => c.cartaEstado === 'completa').length;
    const cartasPendientes = conEquipos.length - cartasCompletas;
    const cartasPct        = conEquipos.length > 0 ? Math.round((cartasCompletas / conEquipos.length) * 100) : 0;
    document.getElementById('cartasCompletas').textContent     = cartasCompletas;
    document.getElementById('cartasPendientes').textContent    = cartasPendientes;
    document.getElementById('totalCartasConEquipo').textContent = conEquipos.length;
    const barCartas = document.getElementById('barCartas');
    if (barCartas) barCartas.style.width = cartasPct + '%';

    // ── Valor del inventario ───────────────────────────────────────────────
    let valorTotal = 0; let conPrecio = 0;
    [...database.equipos, ...(database.celulares || [])].forEach(item => {
        if (item.precio) { valorTotal += parseFloat(item.precio) || 0; conPrecio++; }
    });
    const elValor = document.getElementById('valorInventario');
    if (elValor) {
        elValor.textContent = conPrecio > 0
            ? '$' + valorTotal.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
            : '—';
    }

    // ── Departamento con más activos ───────────────────────────────────────
    const deptMap = {};
    database.asignaciones.filter(a => a.estado === 'Activa').forEach(a => {
        const col = database.colaboradores.find(c => c._id === a.colaboradorId);
        if (col && col.departamento) {
            deptMap[col.departamento] = (deptMap[col.departamento] || 0) + 1;
        }
    });
    const topDeptEntry = Object.entries(deptMap).sort((a, b) => b[1] - a[1])[0];
    const elTopDept  = document.getElementById('topDepartamento');
    const elTopCount = document.getElementById('topDepartamentoCount');
    if (elTopDept) elTopDept.textContent  = topDeptEntry ? topDeptEntry[0] : '—';
    if (elTopCount) elTopCount.textContent = topDeptEntry ? `${topDeptEntry[1]} equipo(s) asignado(s)` : 'Sin datos aún';

    // ── Última actualización ───────────────────────────────────────────────
    const elUpdated = document.getElementById('dashLastUpdated');
    if (elUpdated) {
        elUpdated.textContent = 'Actualizado ' + new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    }

    // ── Gráficas + Alertas + Tabla ─────────────────────────────────────────
    updateChartInventario();
    updateChartCategorias();
    updateAlertas();
    updateDashboardTable();
}

// ── Gráfica de dona: estado de equipos ────────────────────────────────────
function updateChartInventario() {
    const disponibles   = database.equipos.filter(e => e.estado === 'Disponible').length;
    const asignados     = database.asignaciones.filter(a => a.estado === 'Activa').length;
    const mantenimiento = database.equipos.filter(e => e.estado === 'En Mantenimiento').length;
    const reparacion    = database.equipos.filter(e => e.estado === 'En Reparación').length;
    const baja          = database.equipos.filter(e => e.estado === 'Dado de Baja').length;

    const data   = [disponibles, asignados, mantenimiento, reparacion, baja].filter((v, i) => {
        return [disponibles, asignados, mantenimiento, reparacion, baja][i] > 0;
    });
    // rebuild filtered arrays
    const raw    = [disponibles, asignados, mantenimiento, reparacion, baja];
    const labels = ['Disponibles', 'Asignados', 'Mantenimiento', 'En Reparación', 'Baja'];
    const colors = ['#43e97b', '#4facfe', '#f59e0b', '#f97316', '#ef4444'];

    const filteredLabels = labels.filter((_, i) => raw[i] > 0);
    const filteredColors = colors.filter((_, i) => raw[i] > 0);
    const filteredData   = raw.filter(v => v > 0);

    const canvas = document.getElementById('chartInventario');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (_chartInventario) {
        _chartInventario.data.labels = filteredLabels;
        _chartInventario.data.datasets[0].data = filteredData;
        _chartInventario.data.datasets[0].backgroundColor = filteredColors;
        _chartInventario.update();
    } else {
        _chartInventario = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: filteredLabels,
                datasets: [{
                    data: filteredData,
                    backgroundColor: filteredColors,
                    borderColor: 'transparent',
                    borderWidth: 2,
                    hoverOffset: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '65%',
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: c => ` ${c.label}: ${c.raw} (${Math.round(c.raw / c.dataset.data.reduce((a,b)=>a+b,0)*100)}%)`
                        }
                    }
                }
            }
        });
    }

    const leyenda = document.getElementById('chartLeyenda');
    if (leyenda) {
        leyenda.innerHTML = filteredLabels.map((l, i) => `
            <span style="display:flex;align-items:center;gap:4px;white-space:nowrap;">
                <span style="width:10px;height:10px;border-radius:50%;background:${filteredColors[i]};flex-shrink:0;"></span>
                <span style="color:var(--text-secondary);">${l}:</span>
                <strong style="color:var(--text-primary);">${filteredData[i]}</strong>
            </span>`).join('');
    }
}

// ── Gráfica de barras: equipos por categoría ──────────────────────────────
function updateChartCategorias() {
    const cat1 = database.equipos.filter(e => e.categoria === '1' || e.categoria === 1);
    const cat2 = database.equipos.filter(e => e.categoria === '2' || e.categoria === 2 || !e.categoria);
    const cat3 = database.equipos.filter(e => e.categoria === '3' || e.categoria === 3);

    const asigIds = new Set(
        database.asignaciones.filter(a => a.estado === 'Activa').map(a => a.equipoId)
    );

    const makeData = arr => ({
        asignados:    arr.filter(e => asigIds.has(e._id)).length,
        disponibles:  arr.filter(e => e.estado === 'Disponible').length,
        otros:        arr.filter(e => !asigIds.has(e._id) && e.estado !== 'Disponible').length
    });

    const d1 = makeData(cat1);
    const d2 = makeData(cat2);
    const d3 = makeData(cat3);

    const canvas = document.getElementById('chartCategorias');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const labelColor = getComputedStyle(document.documentElement)
        .getPropertyValue('--text-secondary').trim() || '#8b949e';

    const chartData = {
        labels: ['Cat. 1 — Básico', 'Cat. 2 — Intermedio', 'Cat. 3 — Alto Rend.'],
        datasets: [
            { label: 'Asignados',   data: [d1.asignados,   d2.asignados,   d3.asignados],   backgroundColor: '#4facfe', borderRadius: 4 },
            { label: 'Disponibles', data: [d1.disponibles, d2.disponibles, d3.disponibles], backgroundColor: '#43e97b', borderRadius: 4 },
            { label: 'Otros',       data: [d1.otros,       d2.otros,       d3.otros],       backgroundColor: '#f59e0b', borderRadius: 4 }
        ]
    };

    if (_chartCategorias) {
        _chartCategorias.data.datasets[0].data = [d1.asignados,   d2.asignados,   d3.asignados];
        _chartCategorias.data.datasets[1].data = [d1.disponibles, d2.disponibles, d3.disponibles];
        _chartCategorias.data.datasets[2].data = [d1.otros,       d2.otros,       d3.otros];
        _chartCategorias.update();
    } else {
        _chartCategorias = new Chart(ctx, {
            type: 'bar',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                scales: {
                    x: {
                        stacked: true,
                        ticks: { color: labelColor, precision: 0 },
                        grid: { color: 'rgba(255,255,255,0.05)' }
                    },
                    y: {
                        stacked: true,
                        ticks: { color: labelColor }
                    }
                },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: labelColor, boxWidth: 12, padding: 14 }
                    },
                    tooltip: {
                        callbacks: {
                            label: c => ` ${c.dataset.label}: ${c.raw}`
                        }
                    }
                }
            }
        });
    }
}

// ── Alertas del sistema ────────────────────────────────────────────────────
function updateAlertas() {
    const contenedor = document.getElementById('dashboardAlertas');
    if (!contenedor) return;

    const alertas = [];
    const hoy      = new Date();
    const en30dias = new Date(); en30dias.setDate(en30dias.getDate() + 30);

    // Colaboradores activos sin ninguna asignación (equipo ni celular)
    const colaboradoresActivos = database.colaboradores.filter(c => c.esActivo !== false);
    const sinAsignacion = colaboradoresActivos.filter(c =>
        !database.asignaciones.some(a => a.colaboradorId === c._id && a.estado === 'Activa')
    );
    if (sinAsignacion.length > 0) {
        alertas.push({ tipo: 'info', icon: '<i data-lucide="users" style="width:16px;height:16px;"></i>', msg: `<strong>${sinAsignacion.length}</strong> colaborador(es) activo(s) sin equipos asignados` });
    }

    // Licencias vencidas
    database.licencias.forEach(l => {
        if (l.fechaVencimiento && new Date(l.fechaVencimiento) < hoy) {
            alertas.push({ tipo: 'danger', icon: '<i data-lucide="key" style="width:16px;height:16px;"></i>', msg: `Licencia vencida: <strong>${l.nombre}</strong>` });
        } else if (l.fechaVencimiento && new Date(l.fechaVencimiento) <= en30dias) {
            alertas.push({ tipo: 'warning', icon: '<i data-lucide="alert-triangle" style="width:16px;height:16px;"></i>', msg: `Licencia por vencer: <strong>${l.nombre}</strong> (${new Date(l.fechaVencimiento).toLocaleDateString('es-MX')})` });
        }
    });

    // Equipos en mantenimiento
    const enMant = database.equipos.filter(e => e.estado === 'En Mantenimiento');
    if (enMant.length > 0) {
        alertas.push({ tipo: 'warning', icon: '<i data-lucide="wrench" style="width:16px;height:16px;"></i>', msg: `<strong>${enMant.length}</strong> equipo(s) en mantenimiento` });
    }

    // Cartas responsivas pendientes (colaboradores con equipos)
    const pendientes = database.colaboradores.filter(c =>
        c.cartaEstado !== 'completa' &&
        database.asignaciones.some(a => a.colaboradorId === c._id && a.estado === 'Activa')
    );
    if (pendientes.length > 0) {
        alertas.push({ tipo: 'warning', icon: '<i data-lucide="clipboard-list" style="width:16px;height:16px;"></i>', msg: `<strong>${pendientes.length}</strong> carta(s) responsiva(s) pendiente(s) de firma` });
    }

    // Garantías por vencer en 30 días
    database.equipos.forEach(eq => {
        if (eq.fechaCompra && eq.garantiaMeses) {
            const vence = new Date(eq.fechaCompra);
            vence.setMonth(vence.getMonth() + parseInt(eq.garantiaMeses));
            if (vence > hoy && vence <= en30dias) {
                alertas.push({ tipo: 'info', icon: '<i data-lucide="shield" style="width:16px;height:16px;"></i>', msg: `Garantía por vencer: <strong>${eq.marca} ${eq.modelo}</strong> (${vence.toLocaleDateString('es-MX')})` });
            }
        }
    });

    // Badge de total
    const badge = document.getElementById('alertasBadge');
    if (badge) badge.textContent = alertas.length;

    // Sin alertas
    if (alertas.length === 0) {
        contenedor.innerHTML = `
            <div style="text-align:center;padding:28px 0;">
                <div style="display:flex;justify-content:center;margin-bottom:8px;">
                    <i data-lucide="check-circle" style="width:36px;height:36px;color:#22c55e;"></i>
                </div>
                <div style="font-weight:700;color:var(--text-primary);font-size:13px;">Todo en orden</div>
                <div style="font-size:12px;color:var(--text-muted);margin-top:3px;">No hay alertas pendientes</div>
            </div>`;
        refreshIcons();
        return;
    }

    contenedor.innerHTML = alertas.map(a => `
        <div class="dash-alert-item ${a.tipo}">
            <span style="flex-shrink:0;">${a.icon}</span>
            <span style="color:inherit;">${a.msg}</span>
        </div>`).join('');
    refreshIcons();
}

// ── Tabla de asignaciones recientes ───────────────────────────────────────
function updateDashboardTable() {
    const tbody = document.getElementById('dashboardTableBody');
    if (!tbody) return;

    const asignacionesActivas = database.asignaciones
        .filter(a => a.estado === 'Activa')
        .sort((a, b) => new Date(b.fechaAsignacion) - new Date(a.fechaAsignacion))
        .slice(0, 8);

    if (asignacionesActivas.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    <div class="empty-state-icon"><i data-lucide="clipboard"></i></div>
                    <h3>No hay asignaciones aún</h3>
                    <p>Comienza creando colaboradores y equipos</p>
                </td>
            </tr>`;
        refreshIcons();
        return;
    }

    tbody.innerHTML = asignacionesActivas.map(asig => {
        const col   = database.colaboradores.find(c => c._id === asig.colaboradorId);
        const eq    = database.equipos.find(e => e._id === asig.equipoId);
        const tempTag = asig.esTemporal
            ? '<span class="badge badge-warning" style="font-size:0.7em;margin-left:4px;">Temporal</span>' : '';
        return `
            <tr>
                <td><strong>${escapeHTML(col ? col.nombre : 'N/A')}</strong></td>
                <td>${eq ? escapeHTML(eq.marca + ' ' + eq.modelo) : 'N/A'}${tempTag}</td>
                <td>${eq ? escapeHTML(eq.tipo) : '—'}</td>
                <td>${escapeHTML(col ? (col.departamento || '—') : '—')}</td>
                <td style="white-space:nowrap;">${new Date(asig.fechaAsignacion).toLocaleDateString('es-MX')}</td>
                <td><span class="badge badge-success">Activa</span></td>
            </tr>`;
    }).join('');
}

// ── Top colaboradores por activos ─────────────────────────────────────────
function updateTopColaboradores() {
    const contenedor = document.getElementById('topColaboradoresList');
    if (!contenedor) return;

    const asigIds = database.asignacionesCelulares || [];
    const colActivos = database.colaboradores.filter(c => c.esActivo !== false);

    const ranked = colActivos.map(col => {
        const equipos    = database.asignaciones.filter(a => a.colaboradorId === col._id && a.estado === 'Activa').length;
        const celulares  = asigIds.filter(a => a.colaboradorId === col._id && a.estado === 'Activa').length;
        const licencias  = (database.licenciasAsignaciones || []).filter(la => la.colaboradorId === col._id).length;
        return { col, total: equipos + celulares + licencias, equipos, celulares, licencias };
    }).filter(r => r.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    if (ranked.length === 0) {
        contenedor.innerHTML = `<p style="color:var(--text-muted);text-align:center;padding:20px 0;font-size:13px;">Sin asignaciones activas aún</p>`;
        return;
    }

    const gradients = [
        'linear-gradient(135deg,#667eea,#764ba2)',
        'linear-gradient(135deg,#4facfe,#00f2fe)',
        'linear-gradient(135deg,#43e97b,#38f9d7)',
        'linear-gradient(135deg,#fa709a,#fee140)',
        'linear-gradient(135deg,#f093fb,#f5576c)'
    ];

    contenedor.innerHTML = ranked.map((r, i) => {
        const initial = r.col.nombre.charAt(0).toUpperCase();
        const avatarEl = r.col.foto
            ? `<img src="${escapeHTML(r.col.foto)}" class="dash-top-avatar" alt="">`
            : `<div class="dash-top-initial" style="background:${gradients[i]};">${initial}</div>`;
        return `
            <div class="dash-top-item">
                ${avatarEl}
                <div style="flex:1;min-width:0;">
                    <div class="dash-top-name">${escapeHTML(r.col.nombre)}</div>
                    <div class="dash-top-sub">${escapeHTML(r.col.departamento || r.col.puesto || '')}</div>
                </div>
                <div style="text-align:right;flex-shrink:0;">
                    <div style="font-weight:800;font-size:15px;color:var(--text-primary);">${r.total}</div>
                    <div style="font-size:10px;color:var(--text-muted);">${r.equipos}eq ${r.celulares}cel ${r.licencias}lic</div>
                </div>
            </div>`;
    }).join('');
}

// ── Cerrar modales al hacer clic fuera ─────────────────────────────────────
window.onclick = function(event) {
    if (event.target.classList.contains('modal') && !MODALES_SIN_CIERRE_FONDO.includes(event.target.id)) {
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
