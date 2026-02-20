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
        esExterno: document.getElementById('colaboradorEsExterno')?.checked || false, // NUEVO CAMPO
        foto: document.getElementById('colaboradorFoto').value || '',
        createdAt: id ? (database.colaboradores.find(c => c._id === id) || {}).createdAt || new Date().toISOString() : new Date().toISOString()
    };
    
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
                <td colspan="9" class="empty-state">
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
        let valorA, valorB;
        
        switch(ordenColaboradores.campo) {
            case 'nombre':
                valorA = a.nombre.toLowerCase();
                valorB = b.nombre.toLowerCase();
                break;
            case 'email':
                valorA = a.email.toLowerCase();
                valorB = b.email.toLowerCase();
                break;
            case 'departamento':
                valorA = a.departamento.toLowerCase();
                valorB = b.departamento.toLowerCase();
                break;
            case 'puesto':
                valorA = a.puesto.toLowerCase();
                valorB = b.puesto.toLowerCase();
                break;
            case 'tipo':
                valorA = a.esExterno ? 'z_externo' : 'a_interno'; // Para que externos vayan al final
                valorB = b.esExterno ? 'z_externo' : 'a_interno';
                break;
            case 'equipos':
                valorA = database.asignaciones.filter(asig => asig.colaboradorId === a._id && asig.estado === 'Activa').length;
                valorB = database.asignaciones.filter(asig => asig.colaboradorId === b._id && asig.estado === 'Activa').length;
                break;
            default:
                valorA = a.nombre.toLowerCase();
                valorB = b.nombre.toLowerCase();
        }
        
        if (ordenColaboradores.direccion === 'asc') {
            return valorA > valorB ? 1 : valorA < valorB ? -1 : 0;
        } else {
            return valorA < valorB ? 1 : valorA > valorB ? -1 : 0;
        }
    });
    
    // Actualizar íconos de ordenamiento en los headers
    actualizarIconosOrdenamiento();
    
    tbody.innerHTML = colaboradoresOrdenados.map(col => {
        const equiposAsignados = database.asignaciones.filter(a => 
            a.colaboradorId === col._id && a.estado === 'Activa'
        ).length;
        
        const licenciasAsignadas = database.licenciasAsignaciones.filter(la => 
            la.colaboradorId === col._id
        ).length;
        
        const fotoHTML = col.foto ? 
            `<img src="${col.foto}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover">` :
            `<div style="width: 40px; height: 40px; border-radius: 50%; background: #667eea; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold;">${col.nombre.charAt(0)}</div>`;
        
        // Badge para tipo de colaborador
        const tipoBadge = col.esExterno ? 
            '<span class="badge badge-warning">Externo</span>' : 
            '<span class="badge badge-info">Interno</span>';
        
        return `
            <tr>
                <td>${fotoHTML}</td>
                <td><strong>${col.nombre}</strong></td>
                <td>${col.email}</td>
                <td>${col.departamento}</td>
                <td>${col.puesto}</td>
                <td>${tipoBadge}</td>
                <td><span class="badge badge-info">${equiposAsignados} equipo(s)</span></td>
                <td><span class="badge badge-success">${licenciasAsignadas} licencia(s)</span></td>
                <td class="action-buttons">
                    ${equiposAsignados > 0 ? `<button class="btn btn-sm btn-warning carta-responsiva" onclick='descargarCartaResponsiva("${col._id}")' title="Descargar carta responsiva">📄 Carta</button>` : ''}
                    <button class="btn btn-sm btn-info" onclick='verDetalleColaborador("${col._id}")'>👁️ Ver</button>
                    <button class="btn btn-sm btn-primary" onclick='editColaborador("${col._id}")'>✏️</button>
                    <button class="btn btn-sm btn-danger" onclick='deleteColaborador("${col._id}")'>🗑️</button>
                </td>
            </tr>
        `;
    }).join('');
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

function filterColaboradores() {
    const searchTerm = document.getElementById('searchColaborador').value.toLowerCase();
    const tipoFiltro = document.getElementById('filterTipoColaborador')?.value || 'todos';
    const rows = document.querySelectorAll('#colaboradoresTableBody tr');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        const matchesSearch = text.includes(searchTerm);
        
        // Filtro por tipo (interno/externo)
        let matchesTipo = true;
        if (tipoFiltro !== 'todos') {
            const badges = row.querySelectorAll('.badge');
            const hasExternoBadge = Array.from(badges).some(badge => badge.textContent.includes('Externo'));
            const hasInternoBadge = Array.from(badges).some(badge => badge.textContent.includes('Interno'));
            
            if (tipoFiltro === 'externo') {
                matchesTipo = hasExternoBadge;
            } else if (tipoFiltro === 'interno') {
                matchesTipo = hasInternoBadge;
            }
        }
        
        row.style.display = (matchesSearch && matchesTipo) ? '' : 'none';
    });
}

// ================================
// CARTA RESPONSIVA — genera PDF con jsPDF
// Estructura: tabla de equipos + texto legal + 4 bloques de firma
// ================================
function descargarCartaResponsiva(colaboradorId) {
    const colaborador = database.colaboradores.find(c => c._id === colaboradorId);
    if (!colaborador) { showNotification('❌ Colaborador no encontrado', 'error'); return; }

    const asignacionesActivas = database.asignaciones.filter(a =>
        a.colaboradorId === colaboradorId && a.estado === 'Activa'
    );
    if (asignacionesActivas.length === 0) {
        showNotification('❌ El colaborador no tiene equipos asignados actualmente', 'error');
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
            doc.setFontSize(size || 12);
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
        const fechaAsig = asignacionesActivas[0] && asignacionesActivas[0].fechaAsignacion
            ? new Date(asignacionesActivas[0].fechaAsignacion).toLocaleDateString('es-MX', {year:'numeric', month:'long', day:'numeric'})
            : new Date().toLocaleDateString('es-MX', {year:'numeric', month:'long', day:'numeric'});
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
                ? new Date(asig.fechaAsignacion).toLocaleDateString('es-MX', {day:'2-digit', month:'2-digit', year:'numeric'})
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
                ? new Date(asig.fechaAsignacion).toLocaleDateString('es-MX', {day:'2-digit', month:'2-digit', year:'numeric'})
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
        const firmas    = ['SISTEMAS', 'COLABORADOR', 'CEO', 'JEFE INMEDIATO'];
        // Remover acentos para que helvetica de jsPDF renderice correctamente
        function sanitizeText(str) {
            if (!str) return '';
            return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x00-\x7F]/g, '');
        }

        // Buscar CEO por departamento === 'CEO' (campo especifico en Supabase)
        const ceoCandidato = database.colaboradores.find(c =>
            (c.departamento || '').trim().toUpperCase() === 'CEO'
        );
        const ceoNombre = sanitizeText(ceoCandidato ? ceoCandidato.nombre : '');

        // Buscar jefe inmediato como colaborador en BD
        const jefeTexto = colaborador.jefeInmediato || '';
        const jefeCandidato = database.colaboradores.find(c =>
            c.nombre && c.nombre.trim().toLowerCase() === jefeTexto.trim().toLowerCase()
        );
        const jefeNombre = sanitizeText(jefeCandidato ? jefeCandidato.nombre : jefeTexto);

        const subNombres = ['', sanitizeText(colaborador.nombre), ceoNombre, jefeNombre];
        const bW  = CW / 2 - 5;
        const bH  = 40;
        const gap = 10;

        [[0,1],[2,3]].forEach(([li, ri], rowIdx) => {
            const bY = y + rowIdx * (bH + 8);
            [li, ri].forEach((fi, ci) => {
                const bX = ML + ci * (bW + gap);
                doc.setDrawColor(0);
                doc.setFillColor(255,255,255);
                doc.rect(bX, bY, bW, bH);

                // Línea de firma
                const lineY = bY + bH - 14;
                doc.setDrawColor(80,80,80);
                doc.line(bX + 10, lineY, bX + bW - 10, lineY);

                // Etiqueta subrayada en negrita
                setFont('bold', 9, [0,0,0]);
                doc.text(firmas[fi], bX + bW / 2, bY + bH - 7, { align: 'center' });

                // Nombre del colaborador (si aplica)
                if (subNombres[fi]) {
                    setFont('normal', 7, [80,80,80]);
                    const lines = doc.splitTextToSize(subNombres[fi], bW - 6);
                    doc.text(lines, bX + bW / 2, bY + bH - 2, { align: 'center' });
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

function verDetalleColaborador(id) {
    const colaborador = database.colaboradores.find(c => c._id === id);
    if (!colaborador) return;
    
    const asignacionesActivas = database.asignaciones.filter(a => 
        a.colaboradorId === id && a.estado === 'Activa'
    );
    
    const historialAsignaciones = database.asignaciones
        .filter(a => a.colaboradorId === id)
        .sort((a, b) => new Date(b.fechaAsignacion) - new Date(a.fechaAsignacion));
    
    const licenciasAsignacionesCol = database.licenciasAsignaciones.filter(la => 
        la.colaboradorId === id
    );

    // ── Celulares asignados actualmente ────────────────────────────────────
    const asignacionesCelularesActivas = (database.asignacionesCelulares || []).filter(a =>
        a.colaboradorId === id && a.estado === 'Activa'
    );

    const historialCelulares = (database.asignacionesCelulares || [])
        .filter(a => a.colaboradorId === id)
        .sort((a, b) => new Date(b.fechaAsignacion) - new Date(a.fechaAsignacion));

    const equiposHTML = asignacionesActivas.map(asig => {
        const equipo = database.equipos.find(e => e._id === asig.equipoId);
        if (!equipo) return '';
        
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
                        <p style="margin: 4px 0; color: #64748b;"><strong>Asignado:</strong> ${formatFechaLocal(asig.fechaAsignacion)}</p>
                        ${equipo.procesador ? `<p style="margin: 4px 0; color: #64748b;"><strong>Procesador:</strong> ${equipo.procesador}</p>` : ''}
                        ${equipo.ram ? `<p style="margin: 4px 0; color: #64748b;"><strong>RAM:</strong> ${equipo.ram} GB</p>` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    const historialHTML = historialAsignaciones.length > 0 ? historialAsignaciones.map(asig => {
        const equipo = database.equipos.find(e => e._id === asig.equipoId);
        if (!equipo) return '';
        
        const estadoBadgeAsig = asig.estado === 'Activa' ? 'badge-success' : 'badge-warning';
        
        return `
            <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; background: white; margin-bottom: 10px;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                    <h4 style="margin: 0; color: #1e293b;">Marca: ${equipo.marca} Modelo: ${equipo.modelo}</h4>
                    <span class="badge ${estadoBadgeAsig}">${asig.estado}</span>
                </div>
                <h5 style="margin: 0; color: #64748b;">Número de serie: ${equipo.numSerie}</h5>
                <p style="margin: 4px 0; color: #64748b; font-size: 0.9em;">
                    <strong>Asignado:</strong> ${formatFechaLocal(asig.fechaAsignacion)}
                    ${asig.fechaDevolucion ? ` | <strong>Devuelto:</strong> ${formatFechaLocal(asig.fechaDevolucion)}` : ''}
                </p>
            </div>
        `;
    }).join('') : '<p style="color: #94a3b8; text-align: center; padding: 20px;">Sin historial de asignaciones</p>';
    
    const licenciasHTML = licenciasAsignacionesCol.length > 0 ? licenciasAsignacionesCol.map(la => {
        const licencia = database.licencias.find(l => l._id === la.licenciaId);
        if (!licencia) return '';
        
        const estadoBadgeLic = licencia.estado === 'Activa' ? 'badge-success' : 
                              licencia.estado === 'Vencida' ? 'badge-danger' : 'badge-info';
        
        return `
            <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; background: white; margin-bottom: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div>
                        <h4 style="margin: 0 0 4px 0; color: #1e293b;">${licencia.software}</h4>
                        <p style="margin: 0; color: #64748b; font-size: 0.9em;">${licencia.tipo}</p>
                    </div>
                    <span class="badge ${estadoBadgeLic}">${licencia.estado}</span>
                </div>
            </div>
        `;
    }).join('') : '<p style="color: #94a3b8; text-align: center; padding: 20px;">Sin licencias asignadas</p>';
    

    // ── Renderizar celulares activos ────────────────────────────────────────
    const celularesActivosHTML = asignacionesCelularesActivas.map(asig => {
        const celular = database.celulares.find(c => c._id === asig.celularId);
        if (!celular) return '';

        const fotos = celular.fotos || (celular.foto ? [celular.foto] : []);
        const fotoCelular = fotos.length > 0
            ? '<img src="' + fotos[0] + '" style="width: 80px; height: 80px; border-radius: 8px; object-fit: cover;">'
            : '<div style="width: 80px; height: 80px; border-radius: 8px; background: #f1f5f9; display: flex; align-items: center; justify-content: center; font-size: 2em;">📱</div>';

        const numHtml      = celular.numero   ? '<p style="margin: 4px 0; color: #64748b;"><strong>Número:</strong> '   + celular.numero   + '</p>' : '';
        const imeiHtml     = celular.imei      ? '<p style="margin: 4px 0; color: #64748b;"><strong>IMEI:</strong> '      + celular.imei      + '</p>' : '';
        const companiaHtml = celular.compania  ? '<p style="margin: 4px 0; color: #64748b;"><strong>Compañía:</strong> ' + celular.compania  + '</p>' : '';
        const planHtml     = celular.plan       ? '<p style="margin: 4px 0; color: #64748b;"><strong>Plan:</strong> '      + celular.plan       + '</p>' : '';

        return [
            '<div style="border: 2px solid #e2e8f0; border-radius: 12px; padding: 15px; background: #f8fafc;">',
            '  <div style="display: flex; gap: 15px; align-items: start;">',
            fotoCelular,
            '  <div style="flex: 1;">',
            '    <h4 style="margin: 0 0 8px 0; color: #1e293b;">' + celular.marca + ' ' + celular.modelo + '</h4>',
            numHtml, imeiHtml, companiaHtml, planHtml,
            '    <p style="margin: 4px 0; color: #64748b;"><strong>Asignado:</strong> ' + formatFechaLocal(asig.fechaAsignacion) + '</p>',
            '  </div></div></div>'
        ].join('');
    }).join('') || '<p style="color: #94a3b8; text-align: center; padding: 20px;">Sin celulares asignados actualmente</p>';

    const fotoColaborador = colaborador.foto ? 
        `<img src="${colaborador.foto}" style="width: 120px; height: 120px; border-radius: 50%; object-fit: cover; border: 4px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">` :
        `<div style="width: 120px; height: 120px; border-radius: 50%; background: #667eea; color: white; display: flex; align-items: center; justify-content: center; font-size: 3em; font-weight: bold; border: 4px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">${colaborador.nombre.charAt(0)}</div>`;
    
    const tipoBadge = colaborador.esExterno ? 
        '<span class="badge badge-warning" style="font-size: 1em; padding: 8px 16px;">👤 Colaborador Externo</span>' :
        '<span class="badge badge-info" style="font-size: 1em; padding: 8px 16px;">👤 Colaborador Interno</span>';
    
    const content = `
        <div style="text-align: center; margin-bottom: 30px;">
            <div style="display: inline-block; padding: 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; position: relative;">
                ${fotoColaborador}
                <h2 style="margin: 15px 0 5px 0; color: white;">${colaborador.nombre}</h2>
                <p style="margin: 0; color: rgba(255,255,255,0.9); font-size: 1.1em;">${colaborador.puesto}</p>
                <p style="margin: 5px 0 0 0; color: rgba(255,255,255,0.8);">${colaborador.departamento}</p>
            </div>
            <div style="margin-top: 15px;">
                ${tipoBadge}
            </div>
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px;">
            <div style="background: #f8fafc; padding: 15px; border-radius: 8px;">
                <h3 style="margin: 0 0 12px 0; color: #1e293b; font-size: 1.1em;">📧 Contacto</h3>
                <p style="margin: 6px 0; color: #475569;"><strong>Email:</strong> ${colaborador.email}</p>
                ${colaborador.telefono ? `<p style="margin: 6px 0; color: #475569;"><strong>Teléfono:</strong> ${colaborador.telefono}</p>` : ''}
                ${colaborador.jefeInmediato ? `<p style="margin: 6px 0; color: #475569;"><strong>Jefe:</strong> ${colaborador.jefeInmediato}</p>` : ''}
            </div>
            
            <div style="background: #f8fafc; padding: 15px; border-radius: 8px;">
                <h3 style="margin: 0 0 12px 0; color: #1e293b; font-size: 1.1em;">📊 Estadísticas</h3>
                <p style="margin: 6px 0; color: #475569;"><strong>Equipos Asignados:</strong> ${asignacionesActivas.length}</p>
                <p style="margin: 6px 0; color: #475569;"><strong>Licencias:</strong> ${licenciasAsignacionesCol.length}</p>
                <p style="margin: 6px 0; color: #475569;"><strong>Celulares Asignados:</strong> ${asignacionesCelularesActivas.length}</p>
                ${colaborador.fechaIngreso ? `<p style="margin: 6px 0; color: #475569;"><strong>Fecha Ingreso:</strong> ${formatFechaLocal(colaborador.fechaIngreso)}</p>` : ''}
            </div>
        </div>
        
        ${asignacionesActivas.length > 0 ? `
            <div style="margin-bottom: 20px; text-align: center;">
                <button class="btn btn-warning carta-responsiva" onclick='descargarCartaResponsiva("${id}")' style="padding: 12px 30px; font-size: 16px;">
                    📄 Descargar Carta Responsiva
                </button>
            </div>
        ` : ''}
        
        <div style="display: flex; justify-content: space-between; align-items: center; margin: 25px 0 15px 0; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">
            <h3 style="margin: 0; color: #1e293b;">💻 Equipos Asignados Actualmente</h3>
        </div>
        <div style="display: grid; gap: 12px;">
            ${equiposHTML || '<p style="color: #94a3b8; text-align: center; padding: 20px;">Sin equipos asignados actualmente</p>'}
        </div>
        
        
        <div style="display: flex; justify-content: space-between; align-items: center; margin: 30px 0 15px 0; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">
            <h3 style="margin: 0; color: #1e293b;">📱 Celulares Asignados Actualmente</h3>
        </div>
        <div style="display: grid; gap: 12px; margin-bottom: 10px;">
            ${celularesActivosHTML}
        </div>
        
        <div style="display: flex; justify-content: space-between; align-items: center; margin: 30px 0 15px 0; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">
            <h3 style="margin: 0; color: #1e293b;">📜 Historial de Asignaciones</h3>
        </div>
        <div style="max-height: 300px; overflow-y: auto;">
            ${historialHTML}
        </div>
        
        <div style="display: flex; justify-content: space-between; align-items: center; margin: 30px 0 15px 0; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">
            <h3 style="margin: 0; color: #1e293b;">🔑 Licencias Asignadas</h3>
        </div>
        <div style="max-height: 200px; overflow-y: auto;">
            ${licenciasHTML}
        </div>
    `;
    
    document.getElementById('detalleColaboradorContent').innerHTML = content;
    openModal('modalDetalleColaborador');
}

