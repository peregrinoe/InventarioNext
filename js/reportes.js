function actualizarDashboard() {
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
        const proximoMtto = calcularProximoMantenimiento ? calcularProximoMantenimiento(eq.ultimoMantenimiento, eq.frecuenciaMantenimiento) : null;
        const enGarantia = garantiaVigente ? garantiaVigente(eq.fechaCompra, eq.garantiaMeses) : false;
        
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
    showNotification('✅ Reporte de equipos descargado', 'success');
}

// ============================================
// REPORTE DE COLABORADORES — VERSIÓN DETALLADA
// Hojas: Resumen | Internos | Externos |
//        Equipos por Colaborador | Celulares por Colaborador |
//        Licencias por Colaborador | Historial de Asignaciones |
//        Sin Activos Asignados
// ============================================
function generarReporteColaboradores() {
    const wb = crearLibroExcel();
    const hoy = new Date();
    const fmt  = d => d ? new Date(d).toLocaleDateString('es-MX') : '';
    const fmtTs = d => d ? new Date(d).toLocaleString('es-MX') : '';

    // ─── helpers ────────────────────────────────────────────────────────────

    /** Devuelve los días transcurridos desde una fecha (o '' si no hay fecha). */
    function diasDesde(fechaStr) {
        if (!fechaStr) return '';
        const d = new Date(fechaStr);
        return isNaN(d) ? '' : Math.floor((hoy - d) / 86400000);
    }

    /** Construye el perfil completo de un colaborador. */
    function buildFilaColaborador(col) {
        const asigEquiposActivos  = database.asignaciones.filter(a => a.colaboradorId === col._id && a.estado === 'Activa');
        const asigCelularesActivos = (database.asignacionesCelulares || []).filter(a => a.colaboradorId === col._id && a.estado === 'Activa');
        const licenciasAsig       = (database.licenciasAsignaciones  || []).filter(la => la.colaboradorId === col._id);

        // Nombres de equipos activos (join con "|" para una sola celda)
        const nombresEquipos = asigEquiposActivos.map(a => {
            const eq = database.equipos.find(e => e._id === a.equipoId);
            return eq ? `${eq.marca} ${eq.modelo} [${eq.numSerie || 'S/N'}]` : '';
        }).filter(Boolean).join(' | ');

        // Tipos de equipos
        const tiposEquipos = asigEquiposActivos.map(a => {
            const eq = database.equipos.find(e => e._id === a.equipoId);
            return eq ? eq.tipo : '';
        }).filter(Boolean).join(' | ');

        // Categorías de equipos
        const categoriasEquipos = asigEquiposActivos.map(a => {
            const eq = database.equipos.find(e => e._id === a.equipoId);
            return eq && eq.categoria ? `Cat.${eq.categoria}` : '';
        }).filter(Boolean).join(' | ');

        // Celulares activos
        const nombresCelulares = asigCelularesActivos.map(a => {
            const cel = database.celulares.find(c => c._id === a.celularId);
            return cel ? `${cel.marca} ${cel.modelo} [IMEI:${cel.imei || 'S/IMEI'}]` : '';
        }).filter(Boolean).join(' | ');

        // Planes y compañías de celulares
        const planesCelulares = asigCelularesActivos.map(a => {
            const cel = database.celulares.find(c => c._id === a.celularId);
            return cel ? `${cel.companiaMovil || ''} ${cel.plan ? '- ' + cel.plan : ''}`.trim() : '';
        }).filter(Boolean).join(' | ');

        // Licencias
        const nombresLicencias = licenciasAsig.map(la => {
            const lic = database.licencias.find(l => l._id === la.licenciaId);
            return lic ? lic.software : '';
        }).filter(Boolean).join(' | ');

        // Estado global de activos
        const tieneActivos = asigEquiposActivos.length > 0 || asigCelularesActivos.length > 0;
        const cartaLabel = col.cartaEstado === 'completa' ? 'Completa' : tieneActivos ? 'Pendiente de firma' : 'N/A';

        // Antigüedad en años
        let antiguedad = '';
        if (col.fechaIngreso) {
            const meses = Math.floor((hoy - new Date(col.fechaIngreso)) / (30.44 * 86400000));
            antiguedad = meses >= 12
                ? `${Math.floor(meses / 12)} año(s) ${meses % 12} mes(es)`
                : `${meses} mes(es)`;
        }

        return {
            // Datos personales
            'Nombre Completo':          col.nombre,
            'Tipo':                     col.esExterno ? 'Externo' : 'Interno',
            'Estado':                   col.esActivo !== false ? 'Activo' : 'Inactivo',
            'Email':                    col.email,
            'Teléfono':                 col.telefono || '',
            'Departamento':             col.departamento || '',
            'Puesto':                   col.puesto || '',
            'Jefe Inmediato':           col.jefeInmediato || '',
            'Fecha de Ingreso':         fmt(col.fechaIngreso),
            'Antigüedad':               antiguedad,

            // Activos — Equipos
            'No. Equipos Asignados':    asigEquiposActivos.length,
            'Equipos Asignados':        nombresEquipos || 'Sin equipos',
            'Tipos de Equipo':          tiposEquipos   || '',
            'Categorías':               categoriasEquipos || '',

            // Activos — Celulares
            'No. Celulares Asignados':  asigCelularesActivos.length,
            'Celulares Asignados':      nombresCelulares || 'Sin celulares',
            'Plan/Compañía':            planesCelulares  || '',

            // Activos — Licencias
            'No. Licencias Asignadas':  licenciasAsig.length,
            'Licencias de Software':    nombresLicencias || 'Sin licencias',

            // Carta responsiva
            'Carta Responsiva':         cartaLabel,
        };
    }

    // ─── Hoja 1: Resumen ejecutivo ───────────────────────────────────────────
    const todos          = database.colaboradores;
    const activos        = todos.filter(c => c.esActivo !== false);
    const internos       = todos.filter(c => !c.esExterno);
    const externos       = todos.filter(c => c.esExterno);
    const activosInt     = internos.filter(c => c.esActivo !== false);
    const activosExt     = externos.filter(c => c.esActivo !== false);
    const conEquipo      = activos.filter(c => database.asignaciones.some(a => a.colaboradorId === c._id && a.estado === 'Activa'));
    const conCelular     = activos.filter(c => (database.asignacionesCelulares || []).some(a => a.colaboradorId === c._id && a.estado === 'Activa'));
    const conLicencia    = activos.filter(c => (database.licenciasAsignaciones || []).some(la => la.colaboradorId === c._id));
    const sinNada        = activos.filter(c =>
        !database.asignaciones.some(a => a.colaboradorId === c._id && a.estado === 'Activa') &&
        !(database.asignacionesCelulares || []).some(a => a.colaboradorId === c._id && a.estado === 'Activa')
    );
    const cartaCompleta  = activos.filter(c => c.cartaEstado === 'completa' && database.asignaciones.some(a => a.colaboradorId === c._id && a.estado === 'Activa'));
    const cartaPendiente = activos.filter(c => c.cartaEstado !== 'completa' && database.asignaciones.some(a => a.colaboradorId === c._id && a.estado === 'Activa'));

    const resumenData = [
        { 'Indicador': 'Total colaboradores',                'Internos': internos.length,    'Externos': externos.length,    'Total': todos.length },
        { 'Indicador': 'Colaboradores activos',              'Internos': activosInt.length,  'Externos': activosExt.length,  'Total': activos.length },
        { 'Indicador': 'Colaboradores inactivos (dados de baja)', 'Internos': internos.length - activosInt.length, 'Externos': externos.length - activosExt.length, 'Total': todos.length - activos.length },
        { 'Indicador': '─────────────────────────────', 'Internos': '', 'Externos': '', 'Total': '' },
        { 'Indicador': 'Con equipo asignado',                'Internos': conEquipo.filter(c => !c.esExterno).length,   'Externos': conEquipo.filter(c => c.esExterno).length,   'Total': conEquipo.length },
        { 'Indicador': 'Con celular asignado',               'Internos': conCelular.filter(c => !c.esExterno).length,  'Externos': conCelular.filter(c => c.esExterno).length,  'Total': conCelular.length },
        { 'Indicador': 'Con licencias asignadas',            'Internos': conLicencia.filter(c => !c.esExterno).length, 'Externos': conLicencia.filter(c => c.esExterno).length, 'Total': conLicencia.length },
        { 'Indicador': 'Sin ningún activo asignado',         'Internos': sinNada.filter(c => !c.esExterno).length,     'Externos': sinNada.filter(c => c.esExterno).length,     'Total': sinNada.length },
        { 'Indicador': '─────────────────────────────', 'Internos': '', 'Externos': '', 'Total': '' },
        { 'Indicador': 'Carta responsiva completa',          'Internos': cartaCompleta.filter(c => !c.esExterno).length,  'Externos': cartaCompleta.filter(c => c.esExterno).length,  'Total': cartaCompleta.length },
        { 'Indicador': 'Carta responsiva pendiente',         'Internos': cartaPendiente.filter(c => !c.esExterno).length, 'Externos': cartaPendiente.filter(c => c.esExterno).length, 'Total': cartaPendiente.length },
        { 'Indicador': '─────────────────────────────', 'Internos': '', 'Externos': '', 'Total': '' },
        { 'Indicador': `Reporte generado el ${hoy.toLocaleString('es-MX')}`, 'Internos': '', 'Externos': '', 'Total': '' },
    ];
    agregarHoja(wb, '📊 Resumen', resumenData);

    // ─── Hoja 2: Colaboradores Internos ─────────────────────────────────────
    const filasInternos = internos
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
        .map(buildFilaColaborador);
    agregarHoja(wb, '🏢 Internos', filasInternos);

    // ─── Hoja 3: Colaboradores Externos ─────────────────────────────────────
    const filasExternos = externos
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
        .map(buildFilaColaborador);
    if (filasExternos.length > 0) {
        agregarHoja(wb, '🌐 Externos', filasExternos);
    }

    // ─── Hoja 4: Detalle de Equipos por Colaborador ──────────────────────────
    // Una fila por cada asignación activa de equipo
    const detalleEquipos = [];
    database.asignaciones
        .filter(a => a.estado === 'Activa')
        .forEach(asig => {
            const col = database.colaboradores.find(c => c._id === asig.colaboradorId);
            const eq  = database.equipos.find(e => e._id === asig.equipoId);
            if (!col || !eq) return;
            const enGarantia = garantiaVigente ? garantiaVigente(eq.fechaCompra, eq.garantiaMeses) : false;
            const proximoMtto = calcularProximoMantenimiento
                ? calcularProximoMantenimiento(eq.ultimoMantenimiento, eq.frecuenciaMantenimiento)
                : null;
            detalleEquipos.push({
                'Colaborador':          col.nombre,
                'Tipo Colaborador':     col.esExterno ? 'Externo' : 'Interno',
                'Departamento':         col.departamento || '',
                'Puesto':               col.puesto || '',
                'Jefe Inmediato':       col.jefeInmediato || '',
                'Email':                col.email || '',

                'Tipo Equipo':          eq.tipo || '',
                'Marca':                eq.marca || '',
                'Modelo':               eq.modelo || '',
                'Número de Serie':      eq.numSerie || '',
                'ID Interno Equipo':    eq.idInterno || '',
                'Nombre Equipo':        eq.nombreEquipo || '',
                'Categoría':            eq.categoria ? `Categoría ${eq.categoria}` : '',
                'Procesador':           eq.procesador || '',
                'RAM (GB)':             eq.ram || '',
                'Almacenamiento':       eq.almacenamiento || '',
                'Sistema Operativo':    eq.so || '',
                'Propiedad':            eq.propiedad || '',

                'Tipo de Asignación':   asig.esTemporal ? 'Temporal' : 'Permanente',
                'Fecha Asignación':     fmt(asig.fechaAsignacion),
                'Días en Uso':          diasDesde(asig.fechaAsignacion),
                'Notas Asignación':     asig.notas || asig.observaciones || '',

                'En Garantía':          enGarantia ? 'Sí' : 'No',
                'Venc. Garantía':       (() => {
                    if (!eq.fechaCompra || !eq.garantiaMeses) return '';
                    const v = new Date(eq.fechaCompra);
                    v.setMonth(v.getMonth() + parseInt(eq.garantiaMeses));
                    return v.toLocaleDateString('es-MX');
                })(),
                'Proveedor':            eq.proveedor || '',
                'Factura':              eq.factura || '',
                'Próximo Mantenimiento': proximoMtto ? proximoMtto.toLocaleDateString('es-MX') : '',

                'Carta Responsiva':     col.cartaEstado === 'completa' ? 'Completa' : 'Pendiente',
            });
        });
    detalleEquipos.sort((a, b) => a['Colaborador'].localeCompare(b['Colaborador'], 'es'));
    if (detalleEquipos.length > 0) {
        agregarHoja(wb, '💻 Equipos por Colaborador', detalleEquipos);
    }

    // ─── Hoja 5: Detalle de Celulares por Colaborador ────────────────────────
    const detalleCelulares = [];
    (database.asignacionesCelulares || [])
        .filter(a => a.estado === 'Activa')
        .forEach(asig => {
            const col = database.colaboradores.find(c => c._id === asig.colaboradorId);
            const cel = database.celulares.find(c => c._id === asig.celularId);
            if (!col || !cel) return;
            detalleCelulares.push({
                'Colaborador':          col.nombre,
                'Tipo Colaborador':     col.esExterno ? 'Externo' : 'Interno',
                'Departamento':         col.departamento || '',
                'Puesto':               col.puesto || '',
                'Jefe Inmediato':       col.jefeInmediato || '',
                'Email':                col.email || '',

                'Marca Celular':        cel.marca || '',
                'Modelo Celular':       cel.modelo || '',
                'IMEI':                 cel.imei || '',
                'Número Telefónico':    cel.numero || cel.numeroCelular || '',
                'Compañía Móvil':       cel.companiaMovil || '',
                'Plan':                 cel.plan || '',
                'Color':                cel.color || '',
                'Almacenamiento':       cel.almacenamiento || '',
                'Estado Equipo':        cel.estado || '',
                'Propiedad':            cel.propiedad || '',
                'Número de Serie':      cel.numSerie || '',

                'Tipo de Asignación':   asig.esTemporal ? 'Temporal' : 'Permanente',
                'Fecha Asignación':     fmt(asig.fechaAsignacion),
                'Días en Uso':          diasDesde(asig.fechaAsignacion),
                'Notas Asignación':     asig.notas || asig.observaciones || '',
            });
        });
    detalleCelulares.sort((a, b) => a['Colaborador'].localeCompare(b['Colaborador'], 'es'));
    if (detalleCelulares.length > 0) {
        agregarHoja(wb, '📱 Celulares por Colaborador', detalleCelulares);
    }

    // ─── Hoja 6: Licencias por Colaborador ───────────────────────────────────
    const detalleLicencias = [];
    (database.licenciasAsignaciones || []).forEach(la => {
        const col = database.colaboradores.find(c => c._id === la.colaboradorId);
        const lic = database.licencias.find(l => l._id === la.licenciaId);
        if (!col || !lic) return;
        const vencida    = lic.fechaVencimiento && new Date(lic.fechaVencimiento) < hoy;
        const diasParaVencer = lic.fechaVencimiento
            ? Math.ceil((new Date(lic.fechaVencimiento) - hoy) / 86400000)
            : null;
        detalleLicencias.push({
            'Colaborador':          col.nombre,
            'Tipo Colaborador':     col.esExterno ? 'Externo' : 'Interno',
            'Departamento':         col.departamento || '',
            'Puesto':               col.puesto || '',
            'Email':                col.email || '',

            'Software / Licencia':  lic.software || lic.nombre || '',
            'Tipo Licencia':        lic.tipo || '',
            'Clave / Código':       lic.clave || '',
            'Estado Licencia':      lic.estado || '',
            'Fecha Compra':         fmt(lic.fechaCompra),
            'Fecha Vencimiento':    fmt(lic.fechaVencimiento),
            'Días para Vencer':     diasParaVencer !== null ? diasParaVencer : '',
            'Vencida':              vencida ? 'Sí' : 'No',
            'Notas':                lic.notas || '',
        });
    });
    detalleLicencias.sort((a, b) => a['Colaborador'].localeCompare(b['Colaborador'], 'es'));
    if (detalleLicencias.length > 0) {
        agregarHoja(wb, '🔑 Licencias por Colaborador', detalleLicencias);
    }

    // ─── Hoja 7: Historial completo de asignaciones (activas + devueltas) ────
    const historialAsig = [];
    database.asignaciones.forEach(asig => {
        const col = database.colaboradores.find(c => c._id === asig.colaboradorId);
        const eq  = database.equipos.find(e => e._id === asig.equipoId);
        historialAsig.push({
            'Colaborador':       col ? col.nombre : '(eliminado)',
            'Tipo Colaborador':  col ? (col.esExterno ? 'Externo' : 'Interno') : '',
            'Departamento':      col ? col.departamento || '' : '',
            'Equipo':            eq  ? `${eq.marca} ${eq.modelo}` : '(eliminado)',
            'Tipo Equipo':       eq  ? eq.tipo || '' : '',
            'Número de Serie':   eq  ? eq.numSerie || '' : '',
            'Categoría':         eq  ? (eq.categoria ? `Cat.${eq.categoria}` : '') : '',
            'Fecha Asignación':  fmt(asig.fechaAsignacion),
            'Fecha Devolución':  fmt(asig.fechaDevolucion),
            'Estado':            asig.estado,
            'Tipo Asignación':   asig.esTemporal ? 'Temporal' : 'Permanente',
            'Días de Uso':       asig.fechaDevolucion
                                    ? Math.floor((new Date(asig.fechaDevolucion) - new Date(asig.fechaAsignacion)) / 86400000)
                                    : diasDesde(asig.fechaAsignacion),
            'Notas':             asig.notas || asig.observaciones || '',
        });
    });
    // Agregar historial de celulares
    (database.asignacionesCelulares || []).forEach(asig => {
        const col = database.colaboradores.find(c => c._id === asig.colaboradorId);
        const cel = database.celulares.find(c => c._id === asig.celularId);
        historialAsig.push({
            'Colaborador':       col ? col.nombre : '(eliminado)',
            'Tipo Colaborador':  col ? (col.esExterno ? 'Externo' : 'Interno') : '',
            'Departamento':      col ? col.departamento || '' : '',
            'Equipo':            cel ? `${cel.marca} ${cel.modelo} (Celular)` : '(eliminado)',
            'Tipo Equipo':       'Celular',
            'Número de Serie':   cel ? cel.imei || '' : '',
            'Categoría':         '',
            'Fecha Asignación':  fmt(asig.fechaAsignacion),
            'Fecha Devolución':  fmt(asig.fechaDevolucion),
            'Estado':            asig.estado,
            'Tipo Asignación':   asig.esTemporal ? 'Temporal' : 'Permanente',
            'Días de Uso':       asig.fechaDevolucion
                                    ? Math.floor((new Date(asig.fechaDevolucion) - new Date(asig.fechaAsignacion)) / 86400000)
                                    : diasDesde(asig.fechaAsignacion),
            'Notas':             asig.notas || asig.observaciones || '',
        });
    });
    historialAsig.sort((a, b) => {
        const fa = a['Fecha Asignación'] || '';
        const fb = b['Fecha Asignación'] || '';
        return fb.localeCompare(fa);   // más reciente primero
    });
    if (historialAsig.length > 0) {
        agregarHoja(wb, '📋 Historial Asignaciones', historialAsig);
    }

    // ─── Hoja 8: Colaboradores sin activos asignados ─────────────────────────
    const sinActivos = activos
        .filter(c =>
            !database.asignaciones.some(a => a.colaboradorId === c._id && a.estado === 'Activa') &&
            !(database.asignacionesCelulares || []).some(a => a.colaboradorId === c._id && a.estado === 'Activa')
        )
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
        .map(col => ({
            'Nombre':           col.nombre,
            'Tipo':             col.esExterno ? 'Externo' : 'Interno',
            'Email':            col.email || '',
            'Departamento':     col.departamento || '',
            'Puesto':           col.puesto || '',
            'Jefe Inmediato':   col.jefeInmediato || '',
            'Fecha de Ingreso': fmt(col.fechaIngreso),
            'Tiene Licencias':  (database.licenciasAsignaciones || []).some(la => la.colaboradorId === col._id) ? 'Sí' : 'No',
        }));
    if (sinActivos.length > 0) {
        agregarHoja(wb, '⚠️ Sin Activos Asignados', sinActivos);
    }

    // ─── Hoja 9: Bajas registradas ───────────────────────────────────────────
    const historialBajas = database.historialBajas || [];
    if (historialBajas.length > 0) {
        const bajasData = historialBajas
            .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
            .map(b => ({
                'Colaborador':         b.colaboradorNombre || '',
                'Departamento':        b.departamento || '',
                'Puesto':              b.puesto || '',
                'Motivo de Baja':      b.motivo || '',
                'Activos Reasignados a': b.receptorNombre || 'Sin activos / Almacén',
                'Procesado por':       b.procesadoPor || '',
                'Fecha de Baja':       fmtTs(b.fecha),
                'Vía solicitud':       b.solicitudId ? 'Sí' : 'No (baja directa)',
            }));
        agregarHoja(wb, '🚪 Historial Bajas', bajasData);
    }

    const fecha = new Date().toISOString().split('T')[0];
    descargarExcel(wb, `Reporte_Colaboradores_${fecha}.xlsx`);
    showNotification('✅ Reporte de colaboradores descargado (8 hojas)', 'success');
}

// Reporte de Equipos por Estado
function generarReporteEquiposPorEstado() {
    const wb = crearLibroExcel();
    
    const estados = ['Disponible', 'Asignado', 'En Reparación', 'De Baja'];
    
    estados.forEach(estado => {
        const equiposEstado = database.equipos.filter(eq => eq.estado === estado);
        
        if (equiposEstado.length > 0) {
            const data = equiposEstado.map(eq => {
                const asignacion = database.asignaciones.find(a => a.equipoId === eq._id && a.estado === 'Activa');
                const colaborador = asignacion ? database.colaboradores.find(c => c._id === asignacion.colaboradorId) : null;
                
                return {
                    'Tipo': eq.tipo,
                    'Marca': eq.marca,
                    'Modelo': eq.modelo,
                    'Serie': eq.numSerie,
                    'Categoría': eq.categoria ? `Cat. ${eq.categoria}` : '',
                    'Asignado a': colaborador ? colaborador.nombre : '',
                    'Departamento': colaborador ? colaborador.departamento : '',
                    'Observaciones': eq.observaciones || ''
                };
            });
            
            agregarHoja(wb, estado, data);
        }
    });
    
    const fecha = new Date().toISOString().split('T')[0];
    descargarExcel(wb, `Equipos_Por_Estado_${fecha}.xlsx`);
    showNotification('✅ Reporte de equipos por estado descargado', 'success');
}

// Reporte de Calendario de Mantenimientos
function generarCalendarioMantenimientos() {
    const wb = crearLibroExcel();
    
    const mantenimientosData = database.equipos
        .filter(eq => eq.ultimoMantenimiento && eq.frecuenciaMantenimiento)
        .map(eq => {
            const proximoMtto = calcularProximoMantenimiento ? calcularProximoMantenimiento(eq.ultimoMantenimiento, eq.frecuenciaMantenimiento) : null;
            const diasRestantes = proximoMtto ? Math.ceil((proximoMtto - new Date()) / (1000 * 60 * 60 * 24)) : null;
            
            return {
                'Equipo': `${eq.marca} ${eq.modelo}`,
                'Serie': eq.numSerie,
                'Último Mantenimiento': new Date(eq.ultimoMantenimiento).toLocaleDateString(),
                'Frecuencia (días)': eq.frecuenciaMantenimiento,
                'Próximo Mantenimiento': proximoMtto ? proximoMtto.toLocaleDateString() : '',
                'Días Restantes': diasRestantes !== null ? diasRestantes : '',
                'Estado': diasRestantes < 0 ? 'VENCIDO' : diasRestantes < 7 ? 'URGENTE' : 'PROGRAMADO'
            };
        })
        .sort((a, b) => (a['Días Restantes'] || 999) - (b['Días Restantes'] || 999));
    
    agregarHoja(wb, 'Calendario Mantenimientos', mantenimientosData);
    
    const fecha = new Date().toISOString().split('T')[0];
    descargarExcel(wb, `Calendario_Mantenimientos_${fecha}.xlsx`);
    showNotification('✅ Calendario de mantenimientos descargado', 'success');
}

// Reporte de Mantenimientos Vencidos
function generarReporteMantenimientoVencido() {
    const wb = crearLibroExcel();
    
    const vencidosData = database.equipos
        .filter(eq => eq.ultimoMantenimiento && eq.frecuenciaMantenimiento)
        .filter(eq => {
            if (typeof mantenimientoVencido === 'function') {
                return mantenimientoVencido(eq.ultimoMantenimiento, eq.frecuenciaMantenimiento);
            }
            return false;
        })
        .map(eq => {
            const asignacion = database.asignaciones.find(a => a.equipoId === eq._id && a.estado === 'Activa');
            const colaborador = asignacion ? database.colaboradores.find(c => c._id === asignacion.colaboradorId) : null;
            const proximoMtto = calcularProximoMantenimiento ? calcularProximoMantenimiento(eq.ultimoMantenimiento, eq.frecuenciaMantenimiento) : null;
            const diasVencido = proximoMtto ? Math.ceil((new Date() - proximoMtto) / (1000 * 60 * 60 * 24)) : null;
            
            return {
                'Equipo': `${eq.marca} ${eq.modelo}`,
                'Serie': eq.numSerie,
                'Asignado a': colaborador ? colaborador.nombre : 'Sin asignar',
                'Departamento': colaborador ? colaborador.departamento : '',
                'Último Mantenimiento': new Date(eq.ultimoMantenimiento).toLocaleDateString(),
                'Debió Realizarse': proximoMtto ? proximoMtto.toLocaleDateString() : '',
                'Días Vencido': diasVencido !== null ? diasVencido : '',
                'Prioridad': diasVencido > 30 ? 'ALTA' : 'MEDIA'
            };
        })
        .sort((a, b) => (b['Días Vencido'] || 0) - (a['Días Vencido'] || 0));
    
    agregarHoja(wb, 'Mantenimientos Vencidos', vencidosData);
    
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
            const enGarantia = garantiaVigente ? garantiaVigente(eq.fechaCompra, eq.garantiaMeses) : false;
            const fechaVencimiento = calcularVencimientoGarantia ? calcularVencimientoGarantia(eq.fechaCompra, eq.garantiaMeses) : null;
            
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
