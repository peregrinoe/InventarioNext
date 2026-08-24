// ================================
// ACCESORIOS
// ================================

// Helper: parsear fecha local evitando el desfase de zona horaria UTC
function parseFechaLocalAcc(fechaStr) {
    if (!fechaStr) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(fechaStr)) {
        return new Date(fechaStr + 'T00:00:00');
    }
    return new Date(fechaStr);
}

// ── ALTA / EDICIÓN DE ACCESORIO ─────────────────────────────────────────────

function openNuevoAccesorio() {
    const form = document.getElementById('formAccesorio');
    if (form) form.reset();
    document.getElementById('accesorioId').value = '';
    const title = document.getElementById('modalAccesorioTitle');
    if (title) title.textContent = 'Nuevo Accesorio';
    openModal('modalAccesorio');
}

async function saveAccesorio(event) {
    event.preventDefault();

    const id = getVal('accesorioId');
    const accesorio = {
        _id:           id || 'AC' + Date.now(),
        tipo:          getVal('accesorioTipo'),
        marca:         getVal('accesorioMarca'),
        modelo:        getVal('accesorioModelo'),
        numSerie:      getVal('accesorioNumSerie'),
        idInterno:     getVal('accesorioIdInterno'),
        propiedad:     getVal('accesorioPropiedad'),
        condicion:     getVal('accesorioCondicion'),
        estado:        getVal('accesorioEstado'),
        observaciones: getVal('accesorioObservaciones'),
        createdAt: id
            ? (database.accesorios.find(a => a._id === id) || {}).createdAt || new Date().toISOString()
            : new Date().toISOString()
    };

    try {
        validateFields(
            { 'Tipo': accesorio.tipo, 'Marca': accesorio.marca },
            {
                'Tipo':  { required: true, maxLen: 100 },
                'Marca': { required: true, maxLen: 100 }
            }
        );
    } catch (validationError) {
        showNotification('❌ ' + validationError.message, 'error');
        return;
    }

    try {
        await upsertAccesorio(accesorio);
        if (id) {
            const index = database.accesorios.findIndex(a => a._id === id);
            database.accesorios[index] = accesorio;
            showNotification('✅ Accesorio actualizado');
        } else {
            database.accesorios.push(accesorio);
            showNotification('✅ Accesorio creado');
        }
        renderAccesorios();
        if (typeof updateDashboard === 'function') updateDashboard();
        closeModal('modalAccesorio');
    } catch (e) {
        console.error('Error guardando accesorio:', e);
        showNotification('❌ Error al guardar accesorio. Revisa la consola.', 'error');
    }
}

function editAccesorio(id) {
    const acc = database.accesorios.find(a => a._id === id);
    if (!acc) {
        showNotification('❌ Accesorio no encontrado', 'error');
        return;
    }
    document.getElementById('accesorioId').value            = acc._id;
    document.getElementById('accesorioTipo').value          = acc.tipo || '';
    document.getElementById('accesorioMarca').value         = acc.marca || '';
    document.getElementById('accesorioModelo').value        = acc.modelo || '';
    document.getElementById('accesorioNumSerie').value      = acc.numSerie || '';
    document.getElementById('accesorioIdInterno').value     = acc.idInterno || '';
    document.getElementById('accesorioPropiedad').value     = acc.propiedad || 'Empresa';
    document.getElementById('accesorioCondicion').value     = acc.condicion || '';
    document.getElementById('accesorioEstado').value        = acc.estado || 'Disponible';
    document.getElementById('accesorioObservaciones').value = acc.observaciones || '';

    const title = document.getElementById('modalAccesorioTitle');
    if (title) title.textContent = 'Editar Accesorio';
    openModal('modalAccesorio');
}

async function deleteAccesorio(id) {
    const acc = database.accesorios.find(a => a._id === id);
    if (!acc) return;

    const asignacionActiva = database.asignacionesAccesorios.find(
        a => a.accesorioId === id && a.estado === 'Activa'
    );
    if (asignacionActiva) {
        showNotification('❌ No se puede eliminar: el accesorio tiene una asignación activa. Devuélvelo primero.', 'error');
        return;
    }

    if (!confirm(`¿Eliminar el accesorio "${acc.tipo} ${acc.marca} ${acc.modelo || ''}"?`)) return;

    try {
        await deleteAccesorioDB(id);
        database.accesorios = database.accesorios.filter(a => a._id !== id);
        showNotification('✅ Accesorio eliminado');
        renderAccesorios();
        if (typeof updateDashboard === 'function') updateDashboard();
    } catch (e) {
        console.error('Error eliminando accesorio:', e);
        showNotification('❌ Error al eliminar accesorio.', 'error');
    }
}

// ── ASIGNACIÓN / DEVOLUCIÓN ─────────────────────────────────────────────────

function abrirAsignarAccesorio(accesorioId) {
    const acc = database.accesorios.find(a => a._id === accesorioId);
    if (!acc) return;

    if (acc.estado !== 'Disponible') {
        showNotification('❌ El accesorio no está disponible para asignar.', 'error');
        return;
    }

    const form = document.getElementById('formAsignarAccesorio');
    if (form) form.reset();

    document.getElementById('asignarAccesorioId').value = accesorioId;
    document.getElementById('asignarAccesorioAsignacionId').value = '';

    const selCol = document.getElementById('asignarAccesorioColaborador');
    selCol.innerHTML = '<option value="">Seleccionar colaborador...</option>' +
        database.colaboradores
            .filter(c => c.esActivo !== false)
            .map(c => `<option value="${c._id}">${escapeHTML(c.nombre)} - ${escapeHTML(c.departamento || '')}</option>`)
            .join('');

    document.getElementById('asignarAccesorioFecha').value = new Date().toISOString().split('T')[0];

    const title = document.getElementById('modalAsignarAccesorioTitle');
    if (title) title.textContent = `Asignar: ${acc.tipo} ${acc.marca} ${acc.modelo || ''}`.trim();

    openModal('modalAsignarAccesorio');
}

async function saveAsignacionAccesorio(event) {
    event.preventDefault();

    const accesorioId   = getVal('asignarAccesorioId');
    const colaboradorId = getVal('asignarAccesorioColaborador');
    const fecha         = getVal('asignarAccesorioFecha');
    const notas         = getVal('asignarAccesorioNotas');

    if (!colaboradorId || !fecha) {
        showNotification('❌ Selecciona colaborador y fecha.', 'error');
        return;
    }

    const acc = database.accesorios.find(a => a._id === accesorioId);
    if (!acc) return;

    const asignacion = {
        _id: 'ASAC' + Date.now(),
        colaboradorId,
        accesorioId,
        fechaAsignacion: fecha,
        fechaDevolucion: null,
        estado: 'Activa',
        notas
    };

    try {
        await upsertAsignacionAccesorio(asignacion);
        acc.estado = 'Asignado';
        await upsertAccesorio(acc);

        database.asignacionesAccesorios.push(asignacion);
        const idx = database.accesorios.findIndex(a => a._id === accesorioId);
        if (idx !== -1) database.accesorios[idx] = acc;

        showNotification('✅ Accesorio asignado');
        renderAccesorios();
        if (typeof updateDashboard === 'function') updateDashboard();
        closeModal('modalAsignarAccesorio');
    } catch (e) {
        console.error('Error asignando accesorio:', e);
        showNotification('❌ Error al asignar accesorio.', 'error');
    }
}

async function devolverAccesorio(accesorioId) {
    const asignacion = database.asignacionesAccesorios.find(
        a => a.accesorioId === accesorioId && a.estado === 'Activa'
    );
    if (!asignacion) {
        showNotification('❌ No hay asignación activa para este accesorio.', 'error');
        return;
    }

    if (!confirm('¿Registrar la devolución de este accesorio?')) return;

    const acc = database.accesorios.find(a => a._id === accesorioId);

    try {
        asignacion.estado = 'Devuelto';
        asignacion.fechaDevolucion = new Date().toISOString().split('T')[0];
        await upsertAsignacionAccesorio(asignacion);

        if (acc) {
            acc.estado = 'Disponible';
            await upsertAccesorio(acc);
        }

        showNotification('✅ Accesorio devuelto');
        renderAccesorios();
        if (typeof updateDashboard === 'function') updateDashboard();
    } catch (e) {
        console.error('Error devolviendo accesorio:', e);
        showNotification('❌ Error al registrar la devolución.', 'error');
    }
}

// ── FILTRO Y RENDER ─────────────────────────────────────────────────────────

function filterAccesorios() {
    renderAccesorios();
}

function renderAccesorios() {
    const tbody = document.getElementById('accesoriosTableBody');
    if (!tbody) return;

    if (database.accesorios.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="empty-state">
                    <div class="empty-state-icon">🎧</div>
                    <h3>No hay accesorios registrados</h3>
                    <p>Haz clic en "Nuevo Accesorio" para comenzar</p>
                </td>
            </tr>
        `;
        return;
    }

    const searchTerm   = (document.getElementById('searchAccesorio')?.value       || '').toLowerCase().trim();
    const filterTipo   =  document.getElementById('filterTipoAccesorio')?.value    || '';
    const filterEstado =  document.getElementById('filterEstadoAccesorio')?.value  || '';

    const accesoriosFiltrados = database.accesorios.filter(acc => {
        const asignacionActiva = database.asignacionesAccesorios.find(
            a => a.accesorioId === acc._id && a.estado === 'Activa'
        );
        const colaborador = asignacionActiva
            ? database.colaboradores.find(c => c._id === asignacionActiva.colaboradorId)
            : null;

        const hayBusqueda = !searchTerm || [
            acc.tipo, acc.marca, acc.modelo, acc.numSerie, acc.idInterno,
            acc.observaciones, colaborador?.nombre
        ].some(v => (v || '').toLowerCase().includes(searchTerm));

        const hayTipo   = !filterTipo   || acc.tipo === filterTipo;
        const hayEstado = !filterEstado || acc.estado === filterEstado;

        return hayBusqueda && hayTipo && hayEstado;
    });

    accesoriosFiltrados.sort((a, b) => {
        const ka = `${a.tipo} ${a.marca} ${a.modelo}`.toLowerCase();
        const kb = `${b.tipo} ${b.marca} ${b.modelo}`.toLowerCase();
        return ka.localeCompare(kb, 'es');
    });

    if (accesoriosFiltrados.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="empty-state">
                    <div class="empty-state-icon">🔍</div>
                    <h3>Sin resultados</h3>
                    <p>No se encontraron accesorios con los filtros aplicados</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = accesoriosFiltrados.map(acc => {
        const asignacionActiva = database.asignacionesAccesorios.find(
            a => a.accesorioId === acc._id && a.estado === 'Activa'
        );
        const colaborador = asignacionActiva
            ? database.colaboradores.find(c => c._id === asignacionActiva.colaboradorId)
            : null;

        const estadoClase = acc.estado === 'Disponible'    ? 'badge-success' :
                            acc.estado === 'Asignado'      ? 'badge-info'    :
                            acc.estado === 'En Reparación' ? 'badge-warning' : 'badge-danger';

        const condicionClase = acc.condicion === 'Nuevo'  ? 'badge-success' :
                               acc.condicion === 'Bueno'   ? 'badge-info'    :
                               acc.condicion === 'Regular' ? 'badge-warning' :
                               acc.condicion === 'Dañado'  ? 'badge-danger'  : '';

        const serieId = [acc.numSerie, acc.idInterno].filter(Boolean).join(' / ') || '-';

        const asignadoA = colaborador
            ? `<span class="badge badge-info">${escapeHTML(colaborador.nombre)}</span>`
            : '<span style="color:#94a3b8;">—</span>';

        return `
            <tr>
                <td><strong>${escapeHTML(acc.tipo)}</strong></td>
                <td>${escapeHTML(acc.marca)} ${escapeHTML(acc.modelo || '')}</td>
                <td><code style="font-size:12px;">${escapeHTML(serieId)}</code></td>
                <td>${escapeHTML(acc.propiedad || '-')}</td>
                <td><span class="badge ${estadoClase}">${escapeHTML(acc.estado)}</span></td>
                <td>${acc.condicion ? `<span class="badge ${condicionClase}">${escapeHTML(acc.condicion)}</span>` : '-'}</td>
                <td>${asignadoA}</td>
                <td>${escapeHTML(acc.observaciones || '-')}</td>
                <td class="action-buttons">
                    <div class="action-buttons-inner">
                        ${acc.estado === 'Disponible'
                            ? `<button class="btn btn-sm btn-success" onclick='abrirAsignarAccesorio("${acc._id}")' title="Asignar"><i data-lucide="user-plus"></i> Asignar</button>`
                            : ''}
                        ${acc.estado === 'Asignado'
                            ? `<button class="btn btn-sm btn-warning" onclick='devolverAccesorio("${acc._id}")' title="Devolver"><i data-lucide="rotate-ccw"></i> Devolver</button>`
                            : ''}
                        <button class="btn btn-sm btn-primary" onclick='editAccesorio("${acc._id}")' title="Editar"><i data-lucide="pencil"></i></button>
                        <button class="btn btn-sm btn-danger" onclick='deleteAccesorio("${acc._id}")' title="Eliminar"><i data-lucide="trash-2"></i></button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    refreshIcons();
}
