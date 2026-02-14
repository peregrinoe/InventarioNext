    
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
        const proximoMtto = calcularProximoMantenimiento(eq.ultimoMantenimiento, eq.frecuenciaMantenimiento);
        const enGarantia = garantiaVigente(eq.fechaCompra, eq.garantiaMeses);
        
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
    showNotification('✅ Inventario de equipos descargado', 'success');
}

// Reporte de Colaboradores
function generarReporteColaboradores() {
    const wb = crearLibroExcel();
    
    const colaboradoresData = database.colaboradores.map(col => {
        const equiposAsignados = database.asignaciones.filter(a => a.colaboradorId === col._id && a.estado === 'Activa');
        const licenciasAsignadas = database.licenciasAsignaciones.filter(la => la.colaboradorId === col._id);
        
        const equiposDetalle = equiposAsignados.map(asig => {
            const equipo = database.equipos.find(e => e._id === asig.equipoId);
            return equipo ? `${equipo.marca} ${equipo.modelo}` : '';
        }).join(', ');
        
        return {
            'Nombre Completo': col.nombre,
            'Email': col.email,
            'Teléfono': col.telefono || '',
            'Departamento': col.departamento,
            'Puesto': col.puesto,
            'Fecha de Ingreso': col.fechaIngreso ? new Date(col.fechaIngreso).toLocaleDateString() : '',
            'Jefe Inmediato': col.jefeInmediato || '',
            'Cantidad Equipos': equiposAsignados.length,
            'Equipos Asignados': equiposDetalle,
            'Cantidad Licencias': licenciasAsignadas.length
        };
    });
    
    agregarHoja(wb, 'Directorio', colaboradoresData);
    
    const fecha = new Date().toISOString().split('T')[0];
    descargarExcel(wb, `Directorio_Colaboradores_${fecha}.xlsx`);
    showNotification('✅ Directorio de colaboradores descargado', 'success');
}

// Reporte de Licencias
function generarReporteLicencias() {
    const wb = crearLibroExcel();
    
    const licenciasData = database.licencias.map(lic => {
        const asignaciones = database.licenciasAsignaciones.filter(la => la.licenciaId === lic._id);
        const usuarios = asignaciones.map(asig => {
            const col = database.colaboradores.find(c => c._id === asig.colaboradorId);
            return col ? col.nombre : '';
        }).join(', ');
        
        return {
            'Software': lic.software,
            'Tipo de Licencia': lic.tipo,
            'Clave/Serial': lic.clave || '',
            'Estado': lic.estado,
            'Cantidad Usuarios': asignaciones.length,
            'Usuarios Asignados': usuarios,
            'Fecha de Compra': lic.fechaCompra ? new Date(lic.fechaCompra).toLocaleDateString() : '',
            'Fecha de Vencimiento': lic.fechaVencimiento ? new Date(lic.fechaVencimiento).toLocaleDateString() : '',
            'Notas': lic.notas || ''
        };
    });
    
    agregarHoja(wb, 'Licencias', licenciasData);
    
    const fecha = new Date().toISOString().split('T')[0];
    descargarExcel(wb, `Licencias_${fecha}.xlsx`);
    showNotification('✅ Reporte de licencias descargado', 'success');
}

// Reporte de Mantenimientos
function generarReporteMantenimiento() {
    const wb = crearLibroExcel();
    
    const mantenimientosData = database.equipos
        .filter(eq => eq.ultimoMantenimiento && eq.frecuenciaMantenimiento)
        .map(eq => {
            const proximoMtto = calcularProximoMantenimiento(eq.ultimoMantenimiento, eq.frecuenciaMantenimiento);
            const dias = diasHastaMantenimiento(eq.ultimoMantenimiento, eq.frecuenciaMantenimiento);
            const vencido = mantenimientoVencido(eq.ultimoMantenimiento, eq.frecuenciaMantenimiento);
            const asignacion = database.asignaciones.find(a => a.equipoId === eq._id && a.estado === 'Activa');
            const colaborador = asignacion ? database.colaboradores.find(c => c._id === asignacion.colaboradorId) : null;
            
            return {
                'Equipo': `${eq.marca} ${eq.modelo}`,
                'Serie': eq.numSerie,
                'ID Interno': eq.idInterno || '',
                'Asignado a': colaborador ? colaborador.nombre : 'Disponible',
                'Departamento': colaborador ? colaborador.departamento : '',
                'Último Mantenimiento': new Date(eq.ultimoMantenimiento).toLocaleDateString(),
                'Frecuencia (meses)': eq.frecuenciaMantenimiento,
                'Próximo Mantenimiento': proximoMtto ? proximoMtto.toLocaleDateString() : '',
                'Días Restantes': dias !== null ? dias : '',
                'Estado': vencido ? 'VENCIDO' : (dias <= 30 ? 'PRÓXIMO' : 'Al corriente')
            };
        })
        .sort((a, b) => (a['Días Restantes'] || 999) - (b['Días Restantes'] || 999));
    
    agregarHoja(wb, 'Calendario Mttos', mantenimientosData);
    
    const fecha = new Date().toISOString().split('T')[0];
    descargarExcel(wb, `Calendario_Mantenimientos_${fecha}.xlsx`);
    showNotification('✅ Calendario de mantenimientos descargado', 'success');
}

// Reporte de Mantenimientos Vencidos
function generarReporteMantenimientoVencido() {
    const wb = crearLibroExcel();
    
    const vencidosData = database.equipos
        .filter(eq => mantenimientoVencido(eq.ultimoMantenimiento, eq.frecuenciaMantenimiento))
        .map(eq => {
            const proximoMtto = calcularProximoMantenimiento(eq.ultimoMantenimiento, eq.frecuenciaMantenimiento);
            const dias = diasHastaMantenimiento(eq.ultimoMantenimiento, eq.frecuenciaMantenimiento);
            const asignacion = database.asignaciones.find(a => a.equipoId === eq._id && a.estado === 'Activa');
            const colaborador = asignacion ? database.colaboradores.find(c => c._id === asignacion.colaboradorId) : null;
            
            return {
                'Equipo': `${eq.marca} ${eq.modelo}`,
                'Serie': eq.numSerie,
                'Asignado a': colaborador ? colaborador.nombre : 'Disponible',
                'Departamento': colaborador ? colaborador.departamento : '',
                'Email': colaborador ? colaborador.email : '',
                'Último Mantenimiento': new Date(eq.ultimoMantenimiento).toLocaleDateString(),
                'Debió realizarse el': proximoMtto ? proximoMtto.toLocaleDateString() : '',
                'Días de Retraso': Math.abs(dias)
            };
        })
        .sort((a, b) => b['Días de Retraso'] - a['Días de Retraso']);
    
    agregarHoja(wb, 'Mttos Vencidos', vencidosData);
    
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
            const enGarantia = garantiaVigente(eq.fechaCompra, eq.garantiaMeses);
            const fechaVencimiento = calcularVencimientoGarantia(eq.fechaCompra, eq.garantiaMeses);
            
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

// ================================
// FUNCIONES PARA CELULARES
// ================================

// Preview de múltiples imágenes para celulares
function previewMultipleCelularImages(event) {
    const files = event.target.files;
    const preview = document.getElementById('celularFotosPreview');
    const fotosArray = [];
    
    if (files.length > 0) {
        preview.innerHTML = '';
        let loadedCount = 0;
        
        Array.from(files).forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = function(e) {
                fotosArray.push(e.target.result);
                
                const fotoDiv = document.createElement('div');
                fotoDiv.style.position = 'relative';
                fotoDiv.innerHTML = `
                    <img src="${e.target.result}" style="width: 100%; height: 150px; object-fit: cover; border-radius: 8px; border: 2px solid #e2e8f0;">
                    <button type="button" onclick="borrarFotoCelularIndividual(${index})" style="position: absolute; top: 5px; right: 5px; background: #f56565; color: white; border: none; border-radius: 50%; width: 25px; height: 25px; cursor: pointer; font-size: 16px; line-height: 1; display: flex; align-items: center; justify-content: center;">×</button>
                    <p style="margin-top: 5px; font-size: 0.75em; color: #64748b; text-align: center;">Foto ${index + 1}</p>
                `;
                preview.appendChild(fotoDiv);
                
                loadedCount++;
                if (loadedCount === files.length) {
                    document.getElementById('celularFotos').value = JSON.stringify(fotosArray);
                }
            };
            reader.readAsDataURL(file);
        });
    }
}

// Borrar foto individual del celular
function borrarFotoCelularIndividual(index) {
    const fotosHidden = document.getElementById('celularFotos').value;
    if (fotosHidden) {
        let fotosArray = JSON.parse(fotosHidden);
        fotosArray.splice(index, 1);
        document.getElementById('celularFotos').value = JSON.stringify(fotosArray);
        
        // Re-renderizar las fotos
