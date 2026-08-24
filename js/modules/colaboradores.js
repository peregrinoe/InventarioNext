// ── Helper: evita el desfase de zona horaria al parsear fechas YYYY-MM-DD ──
function parseFechaLocal(fechaStr) {
    if (!fechaStr) return null;
    // Agrega T00:00:00 para forzar interpretación local en lugar de UTC
    const d = new Date(fechaStr.includes('T') ? fechaStr : fechaStr + 'T00:00:00');
    return isNaN(d) ? null : d;
}

function formatFechaLocal(fechaStr, opciones) {
    const d = parseFechaLocal(fechaStr);
    if (!d) return '';
    return d.toLocaleDateString('es-MX', opciones || {});
}

// ================================
// FUNCIONES PARA COLABORADORES
// ================================

// Variable global para tracking de ordenamiento
let ordenColaboradores = {
    campo: 'nombre',
    direccion: 'asc'
};

async function saveColaborador(event) {
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
        esExterno: document.getElementById('colaboradorEsExterno')?.checked || false,
        esActivo: document.getElementById('colaboradorEsActivo') ? document.getElementById('colaboradorEsActivo').checked : true,
        foto: document.getElementById('colaboradorFoto').value || '',
        createdAt: id ? (database.colaboradores.find(c => c._id === id) || {}).createdAt || new Date().toISOString() : new Date().toISOString()
    };

    try {
        validateFields(
            { 'Nombre': colaborador.nombre, 'Correo': colaborador.email, 'Teléfono': colaborador.telefono, 'Departamento': colaborador.departamento, 'Puesto': colaborador.puesto },
            {
                'Nombre':       { required: true, maxLen: 150 },
                'Correo':       { required: true, email: true, maxLen: 150 },
                'Teléfono':     { phone: true, maxLen: 20 },
                'Departamento': { required: true, maxLen: 100 },
                'Puesto':       { required: true, maxLen: 100 }
            }
        );
    } catch (validationError) {
        showNotification('❌ ' + validationError.message, 'error');
        return;
    }
    
    try {
        await upsertColaborador(colaborador);
        if (id) {
            const index = database.colaboradores.findIndex(c => c._id === id);
            if (index !== -1) database.colaboradores[index] = colaborador;
            showNotification('✅ Colaborador actualizado');
        } else {
            database.colaboradores.push(colaborador);
            showNotification('✅ Colaborador creado');
        }
        renderColaboradores();
        updateDashboard();
        closeModal('modalColaborador');
    } catch(e) {
        console.error('Error guardando colaborador:', e);
        showNotification('❌ Error al guardar. Revisa la consola.', 'error');
    }
}

// NUEVA FUNCIÓN: Ordenar colaboradores
function ordenarColaboradores(campo) {
    // Si es el mismo campo, invertir dirección
    if (ordenColaboradores.campo === campo) {
        ordenColaboradores.direccion = ordenColaboradores.direccion === 'asc' ? 'desc' : 'asc';
    } else {
        // Si es campo nuevo, ordenar ascendente
        ordenColaboradores.campo = campo;
        ordenColaboradores.direccion = 'asc';
    }
    
    renderColaboradores();
}

function renderColaboradores() {
    const tbody = document.getElementById('colaboradoresTableBody');
    
    if (database.colaboradores.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="11" class="empty-state">
                    <div class="empty-state-icon">👥</div>
                    <h3>No hay colaboradores registrados</h3>
                    <p>Haz clic en "Nuevo Colaborador" para comenzar</p>
                </td>
            </tr>
        `;
        return;
    }
    
    // Clonar array para no mutar el original
    let colaboradoresOrdenados = [...database.colaboradores];
    
    // Aplicar ordenamiento
    colaboradoresOrdenados.sort((a, b) => {
        const norm = str => normalizarTexto(str || '');

        switch(ordenColaboradores.campo) {
            case 'nombre':
            case 'email':
            case 'departamento':
            case 'puesto': {
                const campo = ordenColaboradores.campo;
                const cmp = norm(a[campo]).localeCompare(norm(b[campo]), 'es');
                return ordenColaboradores.direccion === 'asc' ? cmp : -cmp;
            }
            case 'tipo': {
                const vA = a.esExterno ? 1 : 0;
                const vB = b.esExterno ? 1 : 0;
                const cmp = vA - vB;
                return ordenColaboradores.direccion === 'asc' ? cmp : -cmp;
            }
            case 'equipos': {
                const vA = database.asignaciones.filter(asig => asig.colaboradorId === a._id && asig.estado === 'Activa').length;
                const vB = database.asignaciones.filter(asig => asig.colaboradorId === b._id && asig.estado === 'Activa').length;
                const cmp = vA - vB;
                return ordenColaboradores.direccion === 'asc' ? cmp : -cmp;
            }
            default: {
                const cmp = norm(a.nombre).localeCompare(norm(b.nombre), 'es');
                return ordenColaboradores.direccion === 'asc' ? cmp : -cmp;
            }
        }
    });
    
    // Actualizar íconos de ordenamiento en los headers
    actualizarIconosOrdenamiento();
    
    tbody.innerHTML = colaboradoresOrdenados.map(col => {
        // Separar asignaciones permanentes y temporales
        const asigPerm = database.asignaciones.filter(a =>
            a.colaboradorId === col._id && a.estado === 'Activa' && !a.esTemporal
        );
        const asigTemp = database.asignaciones.filter(a =>
            a.colaboradorId === col._id && a.estado === 'Activa' && a.esTemporal
        );
        const equiposAsignados = asigPerm.length + asigTemp.length;
        
        const licenciasAsignadas = database.licenciasAsignaciones.filter(la => 
            la.colaboradorId === col._id
        ).length;
        
        const fotoHTML = col.foto ? 
            `<img src="${escapeHTML(col.foto)}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover">` :
            `<div style="width: 40px; height: 40px; border-radius: 50%; background: #667eea; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold;">${escapeHTML(col.nombre.charAt(0))}</div>`;
        
        const tipoBadge = col.esExterno ? 
            '<span class="badge badge-warning">Externo</span>' : 
            '<span class="badge badge-info">Interno</span>';

        const esActivo = col.esActivo !== false;
        const estatusBadge = esActivo
            ? '<span class="badge badge-success">Activo</span>'
            : '<span class="badge badge-danger">Inactivo</span>';

        // Badge con desglose perm/temp
        let equiposBadge;
        if (asigPerm.length > 0 && asigTemp.length > 0) {
            equiposBadge = `<span class="badge badge-info">${asigPerm.length} perm.</span> <span class="badge badge-warning">${asigTemp.length} temp.</span>`;
        } else if (asigTemp.length > 0) {
            equiposBadge = `<span class="badge badge-warning">${asigTemp.length} temp.</span>`;
        } else {
            equiposBadge = `<span class="badge badge-info">${equiposAsignados} equipo(s)</span>`;
        }
        
        return `
            <tr style="${esActivo ? '' : 'opacity:0.6;background:#fafafa;'}">
                <td>${fotoHTML}</td>
                <td><strong>${escapeHTML(col.nombre)}</strong></td>
                <td>${escapeHTML(col.email)}</td>
                <td>${escapeHTML(col.departamento)}</td>
                <td>${escapeHTML(col.puesto)}</td>
                <td>${tipoBadge}</td>
                <td>${estatusBadge}</td>
                <td>${equiposBadge}</td>
                <td><span class="badge badge-success">${licenciasAsignadas} licencia(s)</span></td>
                <td>
                    ${equiposAsignados > 0
                        ? col.cartaEstado === 'completa'
                            ? '<span class="badge badge-success">Completa</span>'
                            : '<span class="badge badge-warning">Pendiente</span>'
                        : '<span style="color:#cbd5e0;">—</span>'
                    }
                </td>
                <td class="action-buttons">
                    ${asigPerm.length > 0 ? `<button class="btn btn-sm btn-warning carta-responsiva" onclick='descargarCartaResponsiva("${col._id}")' title="Descargar carta responsiva"><i data-lucide="file-text"></i> Carta</button>` : ''}
                    ${asigTemp.length > 0 ? `<button class="btn btn-sm btn-info carta-responsiva" onclick='descargarCartaTemporal("${col._id}")' title="Carta responsiva temporal"><i data-lucide="clock"></i> Carta Temp.</button>` : ''}
                    <button class="btn btn-sm btn-info" onclick='verDetalleColaborador("${col._id}")'><i data-lucide="eye"></i> Ver</button>
                    ${esActivo ? `<button class="btn btn-sm btn-warning allow-operador" onclick='abrirModalSolicitudBaja("${col._id}")' title="Solicitar baja"><i data-lucide="user-minus"></i> Baja</button>` : ''}
                    <button class="btn btn-sm btn-primary" onclick='editColaborador("${col._id}")'><i data-lucide="pencil"></i></button>
                    <button class="btn btn-sm btn-danger" onclick='deleteColaborador("${col._id}")'><i data-lucide="trash-2"></i></button>
                </td>
            </tr>
        `;
    }).join('');
    refreshIcons();
}

// Actualizar íconos de ordenamiento en headers
function actualizarIconosOrdenamiento() {
    // Remover todos los íconos existentes
    document.querySelectorAll('.sort-icon').forEach(icon => icon.remove());
    
    // Agregar ícono al header activo
    const headers = {
        'nombre': document.querySelector('th[data-sort="nombre"]'),
        'email': document.querySelector('th[data-sort="email"]'),
        'departamento': document.querySelector('th[data-sort="departamento"]'),
        'puesto': document.querySelector('th[data-sort="puesto"]'),
        'tipo': document.querySelector('th[data-sort="tipo"]'),
        'equipos': document.querySelector('th[data-sort="equipos"]')
    };
    
    const headerActivo = headers[ordenColaboradores.campo];
    if (headerActivo) {
        const icono = document.createElement('span');
        icono.className = 'sort-icon';
        icono.textContent = ordenColaboradores.direccion === 'asc' ? ' ▲' : ' ▼';
        icono.style.fontSize = '0.8em';
        headerActivo.appendChild(icono);
    }
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
    
    // NUEVO: Establecer checkbox de externo
    const checkboxExterno = document.getElementById('colaboradorEsExterno');
    if (checkboxExterno) {
        checkboxExterno.checked = colaborador.esExterno || false;
    }

    // NUEVO: Establecer checkbox de activo
    const checkboxActivo = document.getElementById('colaboradorEsActivo');
    if (checkboxActivo) {
        checkboxActivo.checked = colaborador.esActivo !== false; // true por defecto
    }
    
    if (colaborador.foto) {
        document.getElementById('colaboradorFoto').value = colaborador.foto;
        document.getElementById('colaboradorFotoPreview').innerHTML = 
            `<img src="${colaborador.foto}" style="max-width: 200px; max-height: 200px; border-radius: 8px; border: 2px solid #e2e8f0;">`;
    }
    
    document.getElementById('modalColaboradorTitle').textContent = 'Editar Colaborador';
    openModal('modalColaborador');
}

async function deleteColaborador(id) {
    const asignaciones = database.asignaciones.filter(a => a.colaboradorId === id && a.estado === 'Activa');
    
    if (asignaciones.length > 0) {
        showNotification('❌ No se puede eliminar. El colaborador tiene equipos asignados.', 'error');
        return;
    }
    
    if (confirm('¿Estás seguro de eliminar este colaborador?')) {
        try {
            await deleteColaboradorDB(id);
            database.colaboradores = database.colaboradores.filter(c => c._id !== id);
            database.asignaciones = database.asignaciones.filter(a => a.colaboradorId !== id);
            database.licenciasAsignaciones = database.licenciasAsignaciones.filter(la => la.colaboradorId !== id);
            renderColaboradores();
            updateDashboard();
            showNotification('✅ Colaborador eliminado');
        } catch(e) {
            console.error('Error eliminando colaborador:', e);
            showNotification('❌ Error al eliminar. Revisa la consola.', 'error');
        }
    }
}

// Helper: normaliza texto eliminando acentos para búsqueda
function normalizarTexto(str) {
    return (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function filterColaboradores() {
    const searchTerm    = normalizarTexto(document.getElementById('searchColaborador').value);
    const tipoFiltro    = document.getElementById('filterTipoColaborador')?.value    || 'todos';
    const estatusFiltro = document.getElementById('filterEstatusColaborador')?.value || 'todos';
    const cartaFiltro   = document.getElementById('filterCartaColaborador')?.value   || 'todos';
    const rows = document.querySelectorAll('#colaboradoresTableBody tr');

    rows.forEach(row => {
        // Búsqueda sin acentos
        const text = normalizarTexto(row.textContent);
        const matchesSearch = text.includes(searchTerm);

        // Filtro por tipo (interno/externo)
        let matchesTipo = true;
        if (tipoFiltro !== 'todos') {
            const badges = row.querySelectorAll('.badge');
            const hasExternoBadge = Array.from(badges).some(b => b.textContent.includes('Externo'));
            const hasInternoBadge = Array.from(badges).some(b => b.textContent.includes('Interno'));
            if (tipoFiltro === 'externo') matchesTipo = hasExternoBadge;
            if (tipoFiltro === 'interno') matchesTipo = hasInternoBadge;
        }

        // Filtro por estatus (activo/inactivo)
        let matchesEstatus = true;
        if (estatusFiltro !== 'todos') {
            const badges = row.querySelectorAll('.badge');
            const hasActivoBadge   = Array.from(badges).some(b => b.textContent.includes('Activo') && !b.textContent.includes('Inactivo'));
            const hasInactivoBadge = Array.from(badges).some(b => b.textContent.includes('Inactivo'));
            if (estatusFiltro === 'activo')   matchesEstatus = hasActivoBadge;
            if (estatusFiltro === 'inactivo') matchesEstatus = hasInactivoBadge;
        }

        // Filtro por carta responsiva
        let matchesCarta = true;
        if (cartaFiltro !== 'todos') {
            const badges = row.querySelectorAll('.badge');
            const hasCompleta  = Array.from(badges).some(b => b.textContent.includes('Completa'));
            const hasPendiente = Array.from(badges).some(b => b.textContent.includes('Pendiente'));
            const hasSinEquipo = !hasCompleta && !hasPendiente;
            if (cartaFiltro === 'completa')   matchesCarta = hasCompleta;
            if (cartaFiltro === 'pendiente')  matchesCarta = hasPendiente;
            if (cartaFiltro === 'sin_equipo') matchesCarta = hasSinEquipo;
        }

        row.style.display = (matchesSearch && matchesTipo && matchesEstatus && matchesCarta) ? '' : 'none';
    });
}

// ================================
// CARTA RESPONSIVA — genera PDF con jsPDF
// Estructura: tabla de equipos + texto legal + 4 bloques de firma
// ================================
// ── TOGGLE ESTADO CARTA RESPONSIVA ──────────────────────────────────────────
async function toggleCartaEstado(colaboradorId) {
    const colaborador = database.colaboradores.find(c => c._id === colaboradorId);
    if (!colaborador) return;

    const nuevoEstado = colaborador.cartaEstado === 'completa' ? 'pendiente' : 'completa';

    const { error } = await supabaseClient
        .from('colaboradores')
        .update({ carta_estado: nuevoEstado })
        .eq('id', colaboradorId);

    if (error) {
        console.error('Error actualizando carta_estado:', error);
        showNotification('❌ Error al actualizar el estado', 'error');
        return;
    }

    // Actualizar memoria local
    colaborador.cartaEstado = nuevoEstado;

    // Actualizar badge e botón en el panel sin cerrar el modal
    const badge = document.getElementById('cartaEstadoBadge_' + colaboradorId);
    const btn   = document.getElementById('cartaToggleBtn_'   + colaboradorId);

    if (badge) {
        badge.className = 'badge ' + (nuevoEstado === 'completa' ? 'badge-success' : 'badge-warning');
        badge.textContent = nuevoEstado === 'completa' ? 'Completa' : 'Pendiente';
    }
    if (btn) {
        btn.className = 'btn allow-operador ' + (nuevoEstado === 'completa' ? 'btn-warning' : 'btn-success');
        btn.innerHTML = nuevoEstado === 'completa'
            ? '<i data-lucide="rotate-ccw"></i> Marcar Pendiente'
            : '<i data-lucide="check"></i> Marcar Completa';
        refreshIcons();
    }

    showNotification(nuevoEstado === 'completa' ? 'Carta marcada como Completa' : 'Carta marcada como Pendiente', 'success');
    renderColaboradores(); // refrescar badge en la tabla
}

// Parsea una fecha ISO/timestamp de Supabase sin desfase de zona horaria.
// "2026-02-23" o "2026-02-23T00:00:00+00" → Date en medianoche local.
function _parseFechaSinDesfase(valor) {
    if (!valor) return null;
    // Tomar solo la parte YYYY-MM-DD y construir como fecha local
    const solo = String(valor).slice(0, 10); // "2026-02-23"
    const [y, m, d] = solo.split('-').map(Number);
    return new Date(y, m - 1, d);
}

async function descargarCartaResponsiva(colaboradorId) {
    const colaborador = database.colaboradores.find(c => c._id === colaboradorId);
    if (!colaborador) { showNotification('❌ Colaborador no encontrado', 'error'); return; }

    // ── Refrescar asignaciones desde Supabase para tener la fecha más reciente ──
    showNotification('⏳ Preparando carta...', 'success');
    try {
        const { data: rows, error } = await supabaseClient
            .from('asignaciones')
            .select('*')
            .eq('colaborador_id', colaboradorId)
            .eq('estado', 'Activa');

        if (!error && rows) {
            // Actualizar sólo las asignaciones de este colaborador en el array global
            database.asignaciones = database.asignaciones.filter(
                a => a.colaboradorId !== colaboradorId || a.estado !== 'Activa'
            );
            rows.forEach(row => database.asignaciones.push(mapAsignacion(row)));
        }

        // Refrescar también asignaciones de celulares
        const { data: rowsCel, error: errCel } = await supabaseClient
            .from('asignaciones_celulares')
            .select('*')
            .eq('colaborador_id', colaboradorId)
            .eq('estado', 'Activa');

        if (!errCel && rowsCel) {
            database.asignacionesCelulares = (database.asignacionesCelulares || []).filter(
                a => a.colaboradorId !== colaboradorId || a.estado !== 'Activa'
            );
            rowsCel.forEach(row => database.asignacionesCelulares.push(mapAsignacionCelular(row)));
        }
    } catch (e) {
        console.warn('No se pudo refrescar desde Supabase, usando caché local:', e);
    }

    const asignacionesActivas = database.asignaciones.filter(a =>
        a.colaboradorId === colaboradorId && a.estado === 'Activa' && !a.esTemporal
    );
    if (asignacionesActivas.length === 0) {
        showNotification('❌ El colaborador no tiene equipos asignados permanentes actualmente', 'error');
        return;
    }

    function _generarPDF() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });

        const PW  = 215.9;
        const PH  = 279.4;
        const ML  = 20;
        const MR  = 20;
        const CW  = PW - ML - MR;

        function setFont(style, size, color) {
            doc.setFont('helvetica', style || 'normal');
            doc.setFontSize(size || 10);
            doc.setTextColor(...(color || [0, 0, 0]));
        }

        function centeredText(text, y, size, style) {
            setFont(style || 'normal', size || 10);
            doc.text(text, PW / 2, y, { align: 'center' });
        }

        function wrappedText(text, x, y, maxW, lineH) {
            const lines = doc.splitTextToSize(text, maxW);
            doc.text(lines, x, y);
            return y + lines.length * lineH;
        }

        // ── Título ─────────────────────────────────────────────────────────
        let y = 18;
        centeredText('CARTA RESPONSIVA DE EQUIPO', y, 16, 'bold');
        y += 12;

        // ── Párrafo introductorio ──────────────────────────────────────────
        setFont('normal', 12);
        const _fechaAsigObj = asignacionesActivas[0] && asignacionesActivas[0].fechaAsignacion
            ? _parseFechaSinDesfase(asignacionesActivas[0].fechaAsignacion)
            : new Date();
        const fechaAsig = _fechaAsigObj.toLocaleDateString('es-MX', {year:'numeric', month:'long', day:'numeric'});
        y = wrappedText('Recibí del área de sistemas el equipo de cómputo que se menciona a continuación;', ML, y, CW, 5);
        y += 4;

        // ── Tabla de equipos ───────────────────────────────────────────────
        // Recopilar también celulares asignados activos
        const asignacionesCelActivas = (database.asignacionesCelulares || []).filter(a =>
            a.colaboradorId === colaboradorId && a.estado === 'Activa'
        );

        const cols = [
            { label: 'DISPOSITIVO',        w: CW * 0.18 },
            { label: 'MARCA',              w: CW * 0.16 },
            { label: 'MODELO',             w: CW * 0.22 },
            { label: 'NUMERO DE SERIE',    w: CW * 0.24 },
            { label: 'FECHA ASIGNACION',   w: CW * 0.20 },
        ];
        const rowH  = 9;
        const headH = 10;

        // ── Función auxiliar para dibujar una fila de tabla ──────────────
        function drawTableRow(yPos, valores, bgColor) {
            let cx2 = ML;
            // Primero dibujamos TODOS los rectángulos
            cols.forEach(col => {
                doc.setFillColor(...bgColor);
                doc.setDrawColor(0, 0, 0);
                doc.rect(cx2, yPos, col.w, rowH, 'FD');
                cx2 += col.w;
            });
            // Luego escribimos TODOS los textos (después de setear color de texto)
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            cx2 = ML;
            cols.forEach((col, ci) => {
                if (valores[ci]) {
                    const cell = doc.splitTextToSize(String(valores[ci]), col.w - 3);
                    doc.text(cell, cx2 + col.w / 2, yPos + 5.5, { align: 'center' });
                }
                cx2 += col.w;
            });
        }

        // ── Cabecera: dibujar rects primero, texto después ───────────────
        let cx = ML;
        doc.setFillColor(180, 198, 231);
        doc.setDrawColor(0, 0, 0);
        cols.forEach(col => {
            doc.rect(cx, y, col.w, headH, 'FD');
            cx += col.w;
        });
        // Texto de cabecera después de dibujar todos los rects
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        cx = ML;
        cols.forEach(col => {
            const lines = doc.splitTextToSize(col.label, col.w - 2);
            const textH = lines.length * 3.5;
            doc.text(lines, cx + col.w / 2, y + (headH - textH) / 2 + 3.5, { align: 'center' });
            cx += col.w;
        });
        y += headH;

        // ── Filas de equipos ─────────────────────────────────────────────
        let filaIdx = 0;
        asignacionesActivas.forEach(asig => {
            const eq = database.equipos.find(e => e._id === asig.equipoId);
            if (!eq) return;
            const bg = filaIdx % 2 === 0 ? [245,245,245] : [255,255,255];
            const fechaEq = asig.fechaAsignacion
                ? _parseFechaSinDesfase(asig.fechaAsignacion).toLocaleDateString('es-MX', {day:'2-digit', month:'2-digit', year:'numeric'})
                : '';
            drawTableRow(y, [eq.tipo || '', eq.marca || '', eq.modelo || '', eq.numSerie || '', fechaEq], bg);
            y += rowH;
            filaIdx++;
        });

        // ── Filas de celulares ───────────────────────────────────────────
        asignacionesCelActivas.forEach(asig => {
            const cel = database.celulares.find(c => c._id === asig.celularId);
            if (!cel) return;
            const bg = filaIdx % 2 === 0 ? [245,245,245] : [255,255,255];
            const tipo = 'Celular' + (cel.numero ? ' (' + cel.numero + ')' : '');
            const fechaCel = asig.fechaAsignacion
                ? _parseFechaSinDesfase(asig.fechaAsignacion).toLocaleDateString('es-MX', {day:'2-digit', month:'2-digit', year:'numeric'})
                : '';
            drawTableRow(y, [tipo, cel.marca || '', cel.modelo || '', cel.imei || cel.numSerie || '', fechaCel], bg);
            y += rowH;
            filaIdx++;
        });

        // ── Filas vacías para llegar a mínimo 3 ─────────────────────────
        const filasMin = 3;
        while (filaIdx < filasMin) {
            const bg = filaIdx % 2 === 0 ? [245,245,245] : [255,255,255];
            drawTableRow(y, ['','','','',''], bg);
            y += rowH;
            filaIdx++;
        }
        y += 9;

        // ── Texto legal ────────────────────────────────────────────────────
        setFont('normal', 12, [0, 0, 0]);
        y = wrappedText(
            'El cual pertenece a la empresa BYTETEK S.A. DE C.V. a partir del día ' + fechaAsig + '. Me comprometo a cuidar, mantener en buen estado y utilizarlos única y exclusivamente para asuntos relacionados con mi actividad laboral.',
            ML, y, CW, 5
        );
        y += 6;

        y = wrappedText(
            'Asimismo, no podré modificar la configuración del equipo ni instalar software sin ser previamente autorizado.',
            ML, y, CW, 5
        );
        y += 6;

        y = wrappedText(
            'En caso de su extravío, daño o uso inadecuado, me responsabilizo a pagar el costo de la reposición de equipo.',
            ML, y, CW, 5
        );
        y += 14;

        // ── Bloques de firma 2×2 ───────────────────────────────────────────

        // Sanitizar texto para helvetica (quita acentos y chars no-ASCII)
        function sanitizeText(str) {
            if (!str) return '';
            return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x00-\x7F]/g, '');
        }

        // CEO por departamento === 'CEO' (campo en Supabase)
        const ceoCandidato = database.colaboradores.find(c =>
            (c.departamento || '').trim().toUpperCase() === 'CEO'
        );
        const ceoNombre = sanitizeText(ceoCandidato ? ceoCandidato.nombre : '');

        // Jefe inmediato: buscar en BD primero para sanitizar bien
        const jefeTexto = colaborador.jefeInmediato || '';
        const jefeCandidato = database.colaboradores.find(c =>
            c.nombre && c.nombre.trim().toLowerCase() === jefeTexto.trim().toLowerCase()
        );
        const jefeNombre = sanitizeText(jefeCandidato ? jefeCandidato.nombre : jefeTexto);

        const firmas     = ['SISTEMAS', 'COLABORADOR', 'CEO', 'JEFE INMEDIATO'];
        const subNombres = ['', sanitizeText(colaborador.nombre), ceoNombre, jefeNombre];

        const bW  = CW / 2 - 5;
        const bH  = 50;          // más alto para que los textos respiren
        const gap = 10;

        [[0,1],[2,3]].forEach(([li, ri], rowIdx) => {
            const bY = y + rowIdx * (bH + 5);
            [li, ri].forEach((fi, ci) => {
                const bX = ML + ci * (bW + gap);
                doc.setDrawColor(0);
                doc.setFillColor(255,255,255);
                doc.rect(bX, bY, bW, bH);

                // Línea de firma centrada verticalmente
                const lineY = bY + bH - 18;
                doc.setDrawColor(80,80,80);
                doc.line(bX + 10, lineY, bX + bW - 10, lineY);

                // Etiqueta en negrita — tamaño 11
                setFont('bold', 10, [0,0,0]);
                doc.text(firmas[fi], bX + bW / 2, bY + bH - 10, { align: 'center' });

                // Nombre debajo — tamaño 9
                if (subNombres[fi]) {
                    setFont('normal', 8, [80,80,80]);
                    const lines = doc.splitTextToSize(subNombres[fi], bW - 8);
                    doc.text(lines, bX + bW / 2, bY + bH - 3, { align: 'center' });
                }
            });
        });

        // ── Pie de página ──────────────────────────────────────────────────
        setFont('normal', 7, [150,150,150]);
        doc.text(
            'Generado: ' + new Date().toLocaleString('es-MX') + ' · Sistema de Inventario BYTETEK',
            PW / 2, PH - 10, { align: 'center' }
        );

        const nombreArchivo = 'CartaResponsiva_' + colaborador.nombre.replace(/\s+/g, '_') + '_' + new Date().toISOString().split('T')[0] + '.pdf';
        doc.save(nombreArchivo);
        showNotification('✅ Carta responsiva descargada como PDF', 'success');
    }

    if (window.jspdf) {
        _generarPDF();
    } else {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        script.onload = _generarPDF;
        script.onerror = () => showNotification('❌ No se pudo cargar la librería de PDF', 'error');
        document.head.appendChild(script);
    }
}

// ================================
// CARTA DE DEVOLUCIÓN / ENTREGA DE EQUIPO Y ACCESORIOS — PDF con jsPDF
// ================================
async function descargarCartaDevolucion(colaboradorId) {
    const colaborador = database.colaboradores.find(c => c._id === colaboradorId);
    if (!colaborador) { showNotification('❌ Colaborador no encontrado', 'error'); return; }

    showNotification('⏳ Preparando carta de devolución...', 'success');

    // ── Refrescar asignaciones activas desde Supabase ──────────────────────────
    try {
        const [{ data: rowsEq }, { data: rowsCel }] = await Promise.all([
            supabaseClient.from('asignaciones').select('*')
                .eq('colaborador_id', colaboradorId).eq('estado', 'Activa'),
            supabaseClient.from('asignaciones_celulares').select('*')
                .eq('colaborador_id', colaboradorId).eq('estado', 'Activa')
        ]);
        if (rowsEq) {
            database.asignaciones = database.asignaciones.filter(
                a => a.colaboradorId !== colaboradorId || a.estado !== 'Activa'
            );
            rowsEq.forEach(row => database.asignaciones.push(mapAsignacion(row)));
        }
        if (rowsCel) {
            database.asignacionesCelulares = (database.asignacionesCelulares || []).filter(
                a => a.colaboradorId !== colaboradorId || a.estado !== 'Activa'
            );
            rowsCel.forEach(row => database.asignacionesCelulares.push(mapAsignacionCelular(row)));
        }
        // Accesorios (tabla opcional — puede no existir aún)
        try {
            const { data: rowsAcc } = await supabaseClient.from('asignaciones_accesorios')
                .select('*').eq('colaborador_id', colaboradorId).eq('estado', 'Activa');
            if (rowsAcc && typeof mapAsignacionAccesorio === 'function') {
                database.asignacionesAccesorios = (database.asignacionesAccesorios || []).filter(
                    a => a.colaboradorId !== colaboradorId || a.estado !== 'Activa'
                );
                rowsAcc.forEach(row => database.asignacionesAccesorios.push(mapAsignacionAccesorio(row)));
            }
        } catch (eAcc) { /* tabla accesorios no disponible, se ignora */ }
    } catch (e) {
        console.warn('No se pudo refrescar desde Supabase, usando caché local:', e);
    }

    // ── Recopilar bienes a devolver ────────────────────────────────────────────
    const bienes = [];  // { cantidad, descripcion }

    database.asignaciones
        .filter(a => a.colaboradorId === colaboradorId && a.estado === 'Activa')
        .forEach(a => {
            const eq = database.equipos.find(e => e._id === a.equipoId);
            if (!eq) return;
            const detalle = [eq.marca, eq.modelo].filter(Boolean).join(' ');
            const serie = eq.numSerie ? ` (S/N: ${eq.numSerie})` : '';
            bienes.push({ cantidad: 1, descripcion: `${eq.tipo || 'Equipo de cómputo'} ${detalle}${serie}`.trim() });
        });

    (database.asignacionesCelulares || [])
        .filter(a => a.colaboradorId === colaboradorId && a.estado === 'Activa')
        .forEach(a => {
            const cel = database.celulares.find(c => c._id === a.celularId);
            if (!cel) return;
            const detalle = [cel.marca, cel.modelo].filter(Boolean).join(' ');
            const extra = cel.imei ? ` (IMEI: ${cel.imei})` : (cel.numero ? ` (${cel.numero})` : '');
            bienes.push({ cantidad: 1, descripcion: `Celular ${detalle}${extra}`.trim() });
        });

    (database.asignacionesAccesorios || [])
        .filter(a => a.colaboradorId === colaboradorId && a.estado === 'Activa')
        .forEach(a => {
            const acc = database.accesorios.find(x => x._id === a.accesorioId);
            if (!acc) return;
            const detalle = [acc.marca, acc.modelo].filter(Boolean).join(' ');
            const serie = acc.numSerie ? ` (S/N: ${acc.numSerie})` : '';
            bienes.push({ cantidad: 1, descripcion: `${acc.tipo} ${detalle}${serie}`.trim() });
        });

    if (bienes.length === 0) {
        showNotification('❌ El colaborador no tiene bienes activos por devolver', 'error');
        return;
    }

    function sanitizeText(str) {
        if (!str) return '';
        return String(str).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x00-\x7F]/g, '');
    }

    function _generarPDFDevolucion() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });

        const PW = 215.9;
        const PH = 279.4;
        const ML = 20;
        const MR = 20;
        const CW = PW - ML - MR;

        function setFont(style, size, color) {
            doc.setFont('helvetica', style || 'normal');
            doc.setFontSize(size || 10);
            doc.setTextColor(...(color || [0, 0, 0]));
        }
        function wrappedText(text, x, y, maxW, lineH) {
            const lines = doc.splitTextToSize(sanitizeText(text), maxW);
            doc.text(lines, x, y);
            return y + lines.length * lineH;
        }

        // ── Título ─────────────────────────────────────────────────────────
        let y = 20;
        setFont('bold', 15);
        doc.text('CARTA DE ENTREGA DE EQUIPO Y ACCESORIOS', PW / 2, y, { align: 'center' });
        y += 14;

        // ── Datos del colaborador ──────────────────────────────────────────
        const hoy = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
        setFont('bold', 11);
        doc.text('Lugar y fecha:', ML, y);
        setFont('normal', 11);
        doc.text(sanitizeText(hoy), ML + 32, y);
        y += 8;

        setFont('bold', 11);
        doc.text('Nombre del colaborador:', ML, y);
        setFont('normal', 11);
        doc.text(sanitizeText(colaborador.nombre), ML + 50, y);
        y += 8;

        setFont('bold', 11);
        doc.text('Puesto:', ML, y);
        setFont('normal', 11);
        doc.text(sanitizeText(colaborador.puesto || '—'), ML + 18, y);
        y += 12;

        // ── Párrafo introductorio ──────────────────────────────────────────
        setFont('normal', 11);
        y = wrappedText(
            'Por medio de la presente hago constar que el día de hoy hago entrega a la empresa de los siguientes bienes y accesorios que me fueron asignados para el desempeño de mis funciones:',
            ML, y, CW, 5.5
        );
        y += 6;

        // ── Tabla: Cantidad | Descripción | Observaciones ──────────────────
        const cols = [
            { label: 'Cantidad',     w: CW * 0.16 },
            { label: 'Descripción',  w: CW * 0.54 },
            { label: 'Observaciones',w: CW * 0.30 },
        ];
        const headH = 9;
        const rowH  = 10;

        // Cabecera
        let cx = ML;
        doc.setFillColor(180, 198, 231);
        doc.setDrawColor(0, 0, 0);
        cols.forEach(col => { doc.rect(cx, y, col.w, headH, 'FD'); cx += col.w; });
        setFont('bold', 9, [0, 0, 0]);
        cx = ML;
        cols.forEach(col => {
            doc.text(col.label, cx + col.w / 2, y + 6, { align: 'center' });
            cx += col.w;
        });
        y += headH;

        // Filas de bienes
        let filaIdx = 0;
        bienes.forEach(b => {
            const bg = filaIdx % 2 === 0 ? [245, 245, 245] : [255, 255, 255];
            let cx2 = ML;
            cols.forEach(col => {
                doc.setFillColor(...bg);
                doc.setDrawColor(0, 0, 0);
                doc.rect(cx2, y, col.w, rowH, 'FD');
                cx2 += col.w;
            });
            setFont('normal', 9, [0, 0, 0]);
            // Cantidad
            doc.text(String(b.cantidad), ML + cols[0].w / 2, y + 6, { align: 'center' });
            // Descripción
            const desc = doc.splitTextToSize(sanitizeText(b.descripcion), cols[1].w - 4);
            doc.text(desc, ML + cols[0].w + 2, y + 6);
            y += rowH;
            filaIdx++;
        });

        // Filas vacías (mínimo 5 filas para "Otros")
        while (filaIdx < 5) {
            const bg = filaIdx % 2 === 0 ? [245, 245, 245] : [255, 255, 255];
            let cx2 = ML;
            cols.forEach(col => {
                doc.setFillColor(...bg);
                doc.setDrawColor(0, 0, 0);
                doc.rect(cx2, y, col.w, rowH, 'FD');
                cx2 += col.w;
            });
            y += rowH;
            filaIdx++;
        }
        y += 10;

        // ── Texto legal ────────────────────────────────────────────────────
        setFont('normal', 11);
        y = wrappedText(
            'Declaro que los bienes antes descritos son entregados en el estado en que se encuentran al momento de su devolución, para su revisión y validación por parte de la empresa.',
            ML, y, CW, 5.5
        );
        y += 6;
        y = wrappedText('Sin más por el momento, firmo la presente para los efectos correspondientes.', ML, y, CW, 5.5);
        y += 16;

        // ── Bloque ENTREGA ─────────────────────────────────────────────────
        setFont('bold', 12);
        doc.text('ENTREGA', ML, y);
        y += 10;
        setFont('bold', 11);
        doc.text('Nombre del colaborador:', ML, y);
        doc.setDrawColor(80, 80, 80);
        doc.line(ML + 52, y, ML + CW, y);
        setFont('normal', 10, [60, 60, 60]);
        doc.text(sanitizeText(colaborador.nombre), ML + 55, y - 1.5);
        y += 12;
        setFont('bold', 11, [0, 0, 0]);
        doc.text('Firma:', ML, y);
        doc.line(ML + 16, y, ML + CW, y);
        y += 18;

        // ── Bloque RECIBE ──────────────────────────────────────────────────
        doc.setDrawColor(180, 180, 180);
        doc.line(ML, y - 8, ML + CW, y - 8);
        setFont('bold', 12, [0, 0, 0]);
        doc.text('RECIBE', ML, y);
        y += 10;
        const camposRecibe = ['Nombre:', 'Puesto:', 'Firma:', 'Fecha de recepción:'];
        camposRecibe.forEach(campo => {
            setFont('bold', 11, [0, 0, 0]);
            doc.text(campo, ML, y);
            const off = doc.getTextWidth(campo) + 4;
            doc.setDrawColor(80, 80, 80);
            doc.line(ML + off, y, ML + CW, y);
            y += 12;
        });

        // ── Pie de página ──────────────────────────────────────────────────
        setFont('normal', 7, [150, 150, 150]);
        doc.text(
            'Generado: ' + new Date().toLocaleString('es-MX') + ' · Sistema de Inventario BYTETEK',
            PW / 2, PH - 10, { align: 'center' }
        );

        const nombreArchivo = 'CartaDevolucion_' + colaborador.nombre.replace(/\s+/g, '_') + '_' + new Date().toISOString().split('T')[0] + '.pdf';
        doc.save(nombreArchivo);
        showNotification('✅ Carta de devolución descargada como PDF', 'success');
    }

    if (window.jspdf) {
        _generarPDFDevolucion();
    } else {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        script.onload = _generarPDFDevolucion;
        script.onerror = () => showNotification('❌ No se pudo cargar la librería de PDF', 'error');
        document.head.appendChild(script);
    }
}

function verDetalleColaborador(id) {
    const colaborador = database.colaboradores.find(c => c._id === id);
    if (!colaborador) return;

    const asignacionesActivas = database.asignaciones.filter(a => a.colaboradorId === id && a.estado === 'Activa');
    const asigPermDetalle = asignacionesActivas.filter(a => !a.esTemporal);
    const asigTempDetalle = asignacionesActivas.filter(a => a.esTemporal);
    const historialAsignaciones = database.asignaciones.filter(a => a.colaboradorId === id).sort((a, b) => new Date(b.fechaAsignacion) - new Date(a.fechaAsignacion));
    const licenciasAsignacionesCol = database.licenciasAsignaciones.filter(la => la.colaboradorId === id);
    const asignacionesCelularesActivas = (database.asignacionesCelulares || []).filter(a => a.colaboradorId === id && a.estado === 'Activa');

    // ── Avatar ──────────────────────────────────────────────────────────────
    const avatarHTML = colaborador.foto
        ? `<img src="${escapeHTML(colaborador.foto)}" style="width:72px;height:72px;border-radius:50%;object-fit:cover;border:3px solid rgba(255,255,255,0.35);flex-shrink:0;">`
        : `<div style="width:72px;height:72px;border-radius:50%;background:rgba(255,255,255,0.18);display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:800;color:white;border:3px solid rgba(255,255,255,0.35);flex-shrink:0;">${escapeHTML(colaborador.nombre.charAt(0))}</div>`;

    const esActivo = colaborador.esActivo !== false;
    const estatusBadge = esActivo
        ? `<span class="badge badge-success" style="font-size:0.78em;">Activo</span>`
        : `<span class="badge badge-danger" style="font-size:0.78em;">Inactivo</span>`;
    const tipoBadge = colaborador.esExterno
        ? `<span class="badge badge-warning" style="font-size:0.78em;">Externo</span>`
        : `<span class="badge badge-info" style="font-size:0.78em;">Interno</span>`;

    // ── Equipos activos ──────────────────────────────────────────────────────
    const equiposHTML = asignacionesActivas.length > 0
        ? asignacionesActivas.map(asig => {
            const equipo = database.equipos.find(e => e._id === asig.equipoId);
            if (!equipo) return '';
            const fotos = equipo.fotos || (equipo.foto ? [equipo.foto] : []);
            const fotoEl = fotos.length > 0
                ? `<img src="${escapeHTML(fotos[0])}" style="width:56px;height:56px;border-radius:8px;object-fit:cover;flex-shrink:0;">`
                : `<div style="width:56px;height:56px;border-radius:8px;background:var(--bg-overlay);display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i data-lucide="monitor" style="width:22px;height:22px;color:var(--text-muted);"></i></div>`;
            const tempTag = asig.esTemporal ? `<span class="badge badge-warning" style="font-size:0.72em;margin-left:6px;vertical-align:middle;"><i data-lucide="clock" style="width:10px;height:10px;vertical-align:middle;"></i> Temporal</span>` : '';
            return `<div class="detail-equip-card">
                ${fotoEl}
                <div style="flex:1;min-width:0;">
                    <div style="font-weight:700;color:var(--text-primary);font-size:13px;margin-bottom:3px;">${escapeHTML(equipo.marca)} ${escapeHTML(equipo.modelo)}${tempTag}</div>
                    <div style="color:var(--text-secondary);font-size:12px;">${escapeHTML(equipo.tipo)} &middot; <code style="font-size:11px;">${escapeHTML(equipo.numSerie)}</code></div>
                    ${equipo.procesador ? `<div style="color:var(--text-muted);font-size:11px;margin-top:2px;">${escapeHTML(equipo.procesador)}${equipo.ram ? ` &middot; ${equipo.ram} GB RAM` : ''}</div>` : ''}
                    <div style="color:var(--text-muted);font-size:11px;margin-top:4px;">Asignado: ${formatFechaLocal(asig.fechaAsignacion)}</div>
                </div>
            </div>`;
        }).join('')
        : `<p style="color:var(--text-muted);text-align:center;padding:16px 0;font-size:13px;">Sin equipos asignados actualmente</p>`;

    // ── Celulares activos ────────────────────────────────────────────────────
    const celularesHTML = asignacionesCelularesActivas.length > 0
        ? asignacionesCelularesActivas.map(asig => {
            const cel = database.celulares.find(c => c._id === asig.celularId);
            if (!cel) return '';
            const fotos = cel.fotos || [];
            const fotoEl = fotos.length > 0
                ? `<img src="${escapeHTML(fotos[0])}" style="width:56px;height:56px;border-radius:8px;object-fit:cover;flex-shrink:0;">`
                : `<div style="width:56px;height:56px;border-radius:8px;background:var(--bg-overlay);display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i data-lucide="smartphone" style="width:22px;height:22px;color:var(--text-muted);"></i></div>`;
            return `<div class="detail-equip-card">
                ${fotoEl}
                <div style="flex:1;min-width:0;">
                    <div style="font-weight:700;color:var(--text-primary);font-size:13px;margin-bottom:3px;">${escapeHTML(cel.marca)} ${escapeHTML(cel.modelo)}</div>
                    <div style="color:var(--text-secondary);font-size:12px;">${cel.numero ? `Tel: ${escapeHTML(cel.numero)}` : ''}${cel.compania ? ` &middot; ${escapeHTML(cel.compania)}` : ''}</div>
                    ${cel.imei ? `<div style="color:var(--text-muted);font-size:11px;">IMEI: <code style="font-size:11px;">${escapeHTML(cel.imei)}</code></div>` : ''}
                    <div style="color:var(--text-muted);font-size:11px;margin-top:4px;">Asignado: ${formatFechaLocal(asig.fechaAsignacion)}</div>
                </div>
            </div>`;
        }).join('')
        : `<p style="color:var(--text-muted);text-align:center;padding:16px 0;font-size:13px;">Sin celulares asignados actualmente</p>`;

    // ── Historial ────────────────────────────────────────────────────────────
    const historialHTML = historialAsignaciones.length > 0
        ? historialAsignaciones.map(asig => {
            const equipo = database.equipos.find(e => e._id === asig.equipoId);
            if (!equipo) return '';
            const esBadge = asig.estado === 'Activa' ? 'badge-success' : 'badge-warning';
            const tempBadge = asig.esTemporal ? `<span class="badge badge-warning" style="font-size:0.72em;margin-left:6px;">Temporal</span>` : '';
            return `<div class="detail-hist-item" style="${asig.esTemporal ? 'border-color:rgba(245,158,11,0.35);' : ''}">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:5px;">
                    <div>
                        <span style="font-weight:700;color:var(--text-primary);font-size:13px;">${escapeHTML(equipo.marca)} ${escapeHTML(equipo.modelo)}</span>${tempBadge}
                        <div style="color:var(--text-muted);font-size:11px;margin-top:2px;">Serie: ${escapeHTML(equipo.numSerie)}</div>
                    </div>
                    <span class="badge ${esBadge}" style="font-size:0.72em;flex-shrink:0;">${escapeHTML(asig.estado)}</span>
                </div>
                <div style="color:var(--text-secondary);font-size:12px;">
                    <span>Asignado: ${formatFechaLocal(asig.fechaAsignacion)}</span>
                    ${asig.fechaDevolucion ? ` &middot; Devuelto: ${formatFechaLocal(asig.fechaDevolucion)}` : ''}
                    ${asig.esTemporal && asig.fechaFinTemporal ? ` &middot; Fin estimado: ${formatFechaLocal(asig.fechaFinTemporal)}` : ''}
                </div>
                ${asig.observaciones ? `<div style="color:var(--text-muted);font-size:11px;margin-top:4px;font-style:italic;">${escapeHTML(asig.observaciones)}</div>` : ''}
            </div>`;
        }).join('')
        : `<p style="color:var(--text-muted);text-align:center;padding:16px 0;font-size:13px;">Sin historial de asignaciones</p>`;

    // ── Licencias ────────────────────────────────────────────────────────────
    const licenciasHTML = licenciasAsignacionesCol.length > 0
        ? licenciasAsignacionesCol.map(la => {
            const licencia = database.licencias.find(l => l._id === la.licenciaId);
            if (!licencia) return '';
            const estadoBadgeLic = licencia.estado === 'Activa' ? 'badge-success' : licencia.estado === 'Vencida' ? 'badge-danger' : 'badge-info';
            return `<div class="detail-hist-item">
                <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
                    <div>
                        <div style="font-weight:700;color:var(--text-primary);font-size:13px;">${escapeHTML(licencia.software)}</div>
                        <div style="color:var(--text-muted);font-size:11px;">${escapeHTML(licencia.tipo)}</div>
                    </div>
                    <span class="badge ${estadoBadgeLic}" style="font-size:0.72em;flex-shrink:0;">${escapeHTML(licencia.estado)}</span>
                </div>
            </div>`;
        }).join('')
        : `<p style="color:var(--text-muted);text-align:center;padding:16px 0;font-size:13px;">Sin licencias asignadas</p>`;

    // ── Carta responsiva block ───────────────────────────────────────────────
    const cartaBlock = asignacionesActivas.length > 0 ? `
        <div style="background:var(--bg-elevated);border:1px solid var(--border-subtle);border-radius:var(--radius-lg);padding:18px 20px;margin-bottom:24px;">
            <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:14px;">
                <div style="display:flex;align-items:center;gap:12px;">
                    <div style="width:36px;height:36px;border-radius:50%;background:${colaborador.cartaEstado === 'completa' ? 'rgba(34,197,94,0.14)' : 'rgba(245,158,11,0.14)'};display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                        <i data-lucide="${colaborador.cartaEstado === 'completa' ? 'file-check' : 'file-clock'}" style="width:18px;height:18px;color:${colaborador.cartaEstado === 'completa' ? '#22c55e' : '#f59e0b'};"></i>
                    </div>
                    <div>
                        <div style="font-weight:700;color:var(--text-primary);font-size:13px;">Carta Responsiva</div>
                        <div style="color:var(--text-muted);font-size:11px;">${colaborador.cartaEstado === 'completa' ? 'Firmada y entregada' : 'Pendiente de firma física'}</div>
                    </div>
                    <span id="cartaEstadoBadge_${id}" class="badge ${colaborador.cartaEstado === 'completa' ? 'badge-success' : 'badge-warning'}" style="font-size:0.78em;">${colaborador.cartaEstado === 'completa' ? 'Completa' : 'Pendiente'}</span>
                </div>
                <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
                    ${asigPermDetalle.length > 0 ? `<button class="btn btn-warning btn-sm carta-responsiva" onclick='descargarCartaResponsiva("${id}")'><i data-lucide="file-text"></i> Carta</button>` : ''}
                    ${asigTempDetalle.length > 0 ? `<button class="btn btn-info btn-sm carta-responsiva" onclick='descargarCartaTemporal("${id}")'><i data-lucide="clock"></i> Temporal</button>` : ''}
                    <button class="btn btn-sm allow-operador ${colaborador.cartaEstado === 'completa' ? 'btn-secondary' : 'btn-success'}"
                        id="cartaToggleBtn_${id}" onclick='toggleCartaEstado("${id}")'>
                        <i data-lucide="${colaborador.cartaEstado === 'completa' ? 'rotate-ccw' : 'check'}"></i>
                        ${colaborador.cartaEstado === 'completa' ? 'Marcar Pendiente' : 'Marcar Completa'}
                    </button>
                </div>
            </div>
        </div>` : '';

    const content = `
        <div class="detail-hero">
            ${avatarHTML}
            <div class="detail-hero-info">
                <div class="detail-hero-name">${escapeHTML(colaborador.nombre)}</div>
                <div class="detail-hero-sub">${escapeHTML(colaborador.puesto)} &middot; ${escapeHTML(colaborador.departamento)}</div>
                <div class="detail-hero-badges">${tipoBadge}${estatusBadge}</div>
            </div>
        </div>

        <div class="detail-grid-2">
            <div class="detail-info-card">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;">
                    <i data-lucide="mail" style="width:15px;height:15px;color:var(--accent-primary);"></i>
                    <span style="font-weight:700;color:var(--text-primary);font-size:13px;">Contacto</span>
                </div>
                ${colaborador.email ? `<div class="detail-info-row"><span class="detail-info-label">Email</span><span class="detail-info-value">${escapeHTML(colaborador.email)}</span></div>` : ''}
                ${colaborador.telefono ? `<div class="detail-info-row"><span class="detail-info-label">Teléfono</span><span class="detail-info-value">${escapeHTML(colaborador.telefono)}</span></div>` : ''}
                ${colaborador.jefeInmediato ? `<div class="detail-info-row"><span class="detail-info-label">Jefe</span><span class="detail-info-value">${escapeHTML(colaborador.jefeInmediato)}</span></div>` : ''}
                ${colaborador.fechaIngreso ? `<div class="detail-info-row"><span class="detail-info-label">Ingreso</span><span class="detail-info-value">${formatFechaLocal(colaborador.fechaIngreso)}</span></div>` : ''}
            </div>
            <div class="detail-info-card">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;">
                    <i data-lucide="bar-chart-2" style="width:15px;height:15px;color:var(--accent-primary);"></i>
                    <span style="font-weight:700;color:var(--text-primary);font-size:13px;">Activos asignados</span>
                </div>
                <div class="detail-info-row"><span class="detail-info-label">Equipos</span><span class="detail-info-value">${
                    asigPermDetalle.length > 0 && asigTempDetalle.length > 0
                        ? `${asigPermDetalle.length} perm. &middot; ${asigTempDetalle.length} temp.`
                        : asigTempDetalle.length > 0
                            ? `${asigTempDetalle.length} temporal(es)`
                            : `${asignacionesActivas.length}`
                }</span></div>
                <div class="detail-info-row"><span class="detail-info-label">Celulares</span><span class="detail-info-value">${asignacionesCelularesActivas.length}</span></div>
                <div class="detail-info-row"><span class="detail-info-label">Licencias</span><span class="detail-info-value">${licenciasAsignacionesCol.length}</span></div>
            </div>
        </div>

        ${cartaBlock}

        <div class="detail-section-title"><i data-lucide="monitor"></i> Equipos Asignados</div>
        <div style="display:grid;gap:10px;margin-bottom:4px;">${equiposHTML}</div>

        <div class="detail-section-title"><i data-lucide="smartphone"></i> Celulares Asignados</div>
        <div style="display:grid;gap:10px;margin-bottom:4px;">${celularesHTML}</div>

        <div class="detail-section-title"><i data-lucide="history"></i> Historial de Asignaciones</div>
        <div style="display:grid;gap:8px;max-height:280px;overflow-y:auto;">${historialHTML}</div>

        <div class="detail-section-title"><i data-lucide="key"></i> Licencias Asignadas</div>
        <div style="display:grid;gap:8px;max-height:200px;overflow-y:auto;">${licenciasHTML}</div>
    `;

    document.getElementById('detalleColaboradorContent').innerHTML = content;
    refreshIcons();
    openModal('modalDetalleColaborador');
}

// ================================
// CARTA RESPONSIVA TEMPORAL
// ================================
async function descargarCartaTemporal(colaboradorId, asignacionIdFiltro) {
    const colaborador = database.colaboradores.find(c => c._id === colaboradorId);
    if (!colaborador) { showNotification('❌ Colaborador no encontrado', 'error'); return; }

    showNotification('⏳ Preparando carta temporal...', 'success');

    // Refrescar asignaciones temporales desde Supabase
    try {
        const { data: rows, error } = await supabaseClient
            .from('asignaciones')
            .select('*')
            .eq('colaborador_id', colaboradorId)
            .eq('estado', 'Activa')
            .eq('es_temporal', true);

        if (!error && rows) {
            database.asignaciones = database.asignaciones.filter(
                a => !(a.colaboradorId === colaboradorId && a.estado === 'Activa' && a.esTemporal)
            );
            rows.forEach(row => database.asignaciones.push(mapAsignacion(row)));
        }
    } catch (e) {
        console.warn('No se pudo refrescar desde Supabase, usando caché local:', e);
    }

    // Solo asignaciones temporales activas
    let asignacionesTemp = database.asignaciones.filter(a =>
        a.colaboradorId === colaboradorId && a.estado === 'Activa' && a.esTemporal
    );
    if (asignacionIdFiltro) {
        asignacionesTemp = asignacionesTemp.filter(a => a._id === asignacionIdFiltro);
    }

    if (asignacionesTemp.length === 0) {
        showNotification('❌ No hay asignaciones temporales activas para este colaborador', 'error');
        return;
    }

    function _generarPDFTemporal() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });

        const PW  = 215.9;
        const PH  = 279.4;
        const ML  = 20;
        const MR  = 20;
        const CW  = PW - ML - MR;

        function setFont(style, size, color) {
            doc.setFont('helvetica', style || 'normal');
            doc.setFontSize(size || 10);
            doc.setTextColor(...(color || [0, 0, 0]));
        }

        function centeredText(text, y, size, style) {
            setFont(style || 'normal', size || 10);
            doc.text(text, PW / 2, y, { align: 'center' });
        }

        function wrappedText(text, x, y, maxW, lineH) {
            const lines = doc.splitTextToSize(text, maxW);
            doc.text(lines, x, y);
            return y + lines.length * lineH;
        }

        function sanitizeText(str) {
            if (!str) return '';
            return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x00-\x7F]/g, '');
        }

        // ── Título ─────────────────────────────────────────────────────────
        let y = 18;
        centeredText('CARTA RESPONSIVA DE EQUIPO TEMPORAL', y, 15, 'bold');
        y += 12;

        // ── Párrafo introductorio ──────────────────────────────────────────
        setFont('normal', 11);
        const _fechaAsigObj = asignacionesTemp[0] && asignacionesTemp[0].fechaAsignacion
            ? _parseFechaSinDesfase(asignacionesTemp[0].fechaAsignacion)
            : new Date();
        const fechaAsig = _fechaAsigObj.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });

        y = wrappedText('Recibi del area de sistemas el equipo de computo que se menciona a continuacion;', ML, y, CW, 5);
        y += 4;

        // ── Tabla — solo equipos temporales ───────────────────────────────
        const cols = [
            { label: 'DISPOSITIVO',      w: CW * 0.18 },
            { label: 'MARCA',            w: CW * 0.16 },
            { label: 'MODELO',           w: CW * 0.22 },
            { label: 'NUMERO DE SERIE',  w: CW * 0.24 },
            { label: 'FECHA ASIGNACION', w: CW * 0.20 },
        ];
        const rowH  = 8;
        const headH = 9;

        function drawTableRow(yPos, valores, bgColor) {
            let cx2 = ML;
            cols.forEach(col => {
                doc.setFillColor(...bgColor);
                doc.setDrawColor(0, 0, 0);
                doc.rect(cx2, yPos, col.w, rowH, 'FD');
                cx2 += col.w;
            });
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(7);
            doc.setFont('helvetica', 'normal');
            cx2 = ML;
            cols.forEach((col, ci) => {
                if (valores[ci]) {
                    const cell = doc.splitTextToSize(String(valores[ci]), col.w - 3);
                    doc.text(cell, cx2 + col.w / 2, yPos + 5.5, { align: 'center' });
                }
                cx2 += col.w;
            });
        }

        // Cabecera azul — mismo estilo que carta normal
        let cx = ML;
        doc.setFillColor(180, 198, 231);
        doc.setDrawColor(0, 0, 0);
        cols.forEach(col => { doc.rect(cx, y, col.w, headH, 'FD'); cx += col.w; });
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        cx = ML;
        cols.forEach(col => {
            const lines = doc.splitTextToSize(col.label, col.w - 2);
            const textH = lines.length * 3.5;
            doc.text(lines, cx + col.w / 2, y + (headH - textH) / 2 + 3.5, { align: 'center' });
            cx += col.w;
        });
        y += headH;

        let filaIdx = 0;
        asignacionesTemp.forEach(asig => {
            const eq = database.equipos.find(e => e._id === asig.equipoId);
            if (!eq) return;
            const bg = filaIdx % 2 === 0 ? [245, 245, 245] : [255, 255, 255];
            const fechaEq = asig.fechaAsignacion
                ? _parseFechaSinDesfase(asig.fechaAsignacion).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })
                : '';
            drawTableRow(y, [eq.tipo || '', eq.marca || '', eq.modelo || '', eq.numSerie || '', fechaEq], bg);
            y += rowH;
            filaIdx++;
        });

        const filasMin = 3;
        while (filaIdx < filasMin) {
            const bg = filaIdx % 2 === 0 ? [245, 245, 245] : [255, 255, 255];
            drawTableRow(y, ['', '', '', '', ''], bg);
            y += rowH;
            filaIdx++;
        }
        y += 9;

        // ── Texto legal — machote completo con cláusula temporal ───────────
        setFont('normal', 11, [0, 0, 0]);
        y = wrappedText(
            'El cual pertenece a la empresa BYTETEK S.A. DE C.V. a partir del dia ' + fechaAsig + '. Me comprometo a cuidar, mantener en buen estado y utilizarlos unica y exclusivamente para asuntos relacionados con mi actividad laboral.',
            ML, y, CW, 3
        );
        y += 6;

        y = wrappedText(
            'Asimismo, no podre modificar la configuracion del equipo ni instalar software sin ser previamente autorizado.',
            ML, y, CW, 3
        );
        y += 6;

        y = wrappedText(
            'En caso de su extravio, dano o uso inadecuado, me responsabilizo a pagar el costo de la reposicion de equipo.',
            ML, y, CW, 3
        );
        y += 6;

        y = wrappedText(
            'El equipo proporcionado por la empresa sera de caracter temporal y estara sujeto a devolucion cuando asi se requiera.',
            ML, y, CW, 3
        );
        y += 14;

        // ── Bloques de firma 2×2 — idénticos a carta normal ───────────────
        const ceoCandidato = database.colaboradores.find(c =>
            (c.departamento || '').trim().toUpperCase() === 'CEO'
        );
        const ceoNombre = sanitizeText(ceoCandidato ? ceoCandidato.nombre : '');

        const jefeTexto = colaborador.jefeInmediato || '';
        const jefeCandidato = database.colaboradores.find(c =>
            c.nombre && c.nombre.trim().toLowerCase() === jefeTexto.trim().toLowerCase()
        );
        const jefeNombre = sanitizeText(jefeCandidato ? jefeCandidato.nombre : jefeTexto);

        const firmas     = ['SISTEMAS', 'COLABORADOR', 'CEO', 'JEFE INMEDIATO'];
        const subNombres = ['', sanitizeText(colaborador.nombre), ceoNombre, jefeNombre];

        const bW  = CW / 2 - 5;
        const bH  = 50;
        const gap = 10;

        if (y + bH * 2 + 15 > PH - 15) {
            doc.addPage();
            y = 20;
        }

        [[0, 1], [2, 3]].forEach(([li, ri], rowIdx) => {
            const bY = y + rowIdx * (bH + 5);
            [li, ri].forEach((fi, ci) => {
                const bX = ML + ci * (bW + gap);
                doc.setDrawColor(0);
                doc.setFillColor(255, 255, 255);
                doc.rect(bX, bY, bW, bH);

                const lineY = bY + bH - 18;
                doc.setDrawColor(70, 70, 70);
                doc.line(bX + 10, lineY, bX + bW - 10, lineY);

                setFont('bold', 9, [0, 0, 0]);
                doc.text(firmas[fi], bX + bW / 2, bY + bH - 10, { align: 'center' });

                if (subNombres[fi]) {
                    setFont('normal', 7, [70, 70, 70]);
                    const lines = doc.splitTextToSize(subNombres[fi], bW - 8);
                    doc.text(lines, bX + bW / 2, bY + bH - 3, { align: 'center' });
                }
            });
        });

        // ── Pie de página ──────────────────────────────────────────────────
        setFont('normal', 6, [150, 150, 150]);
        doc.text(
            'Generado: ' + new Date().toLocaleString('es-MX') + ' · Sistema de Inventario BYTETEK',
            PW / 2, PH - 10, { align: 'center' }
        );

        const nombreArchivo = 'CartaTemporal_' + colaborador.nombre.replace(/\s+/g, '_') +
            '_' + new Date().toISOString().split('T')[0] + '.pdf';
        doc.save(nombreArchivo);
        showNotification('✅ Carta temporal descargada como PDF', 'success');
    }

    // Mismo patrón de carga lazy que descargarCartaResponsiva
    if (window.jspdf) {
        _generarPDFTemporal();
    } else {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        script.onload = _generarPDFTemporal;
        script.onerror = () => showNotification('❌ No se pudo cargar la libreria de PDF', 'error');
        document.head.appendChild(script);
    }
}
