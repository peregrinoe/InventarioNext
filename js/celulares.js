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
        const preview = document.getElementById('celularFotosPreview');
        preview.innerHTML = '';
        
        fotosArray.forEach((foto, idx) => {
            const fotoDiv = document.createElement('div');
            fotoDiv.style.position = 'relative';
            fotoDiv.innerHTML = `
                <img src="${foto}" style="width: 100%; height: 150px; object-fit: cover; border-radius: 8px; border: 2px solid #e2e8f0;">
                <button type="button" onclick="borrarFotoCelularIndividual(${idx})" style="position: absolute; top: 5px; right: 5px; background: #f56565; color: white; border: none; border-radius: 50%; width: 25px; height: 25px; cursor: pointer; font-size: 16px; line-height: 1; display: flex; align-items: center; justify-content: center;">×</button>
                <p style="margin-top: 5px; font-size: 0.75em; color: #64748b; text-align: center;">Foto ${idx + 1}</p>
            `;
            preview.appendChild(fotoDiv);
        });
        
        showNotification('🗑️ Foto eliminada', 'success');
    }
}

// Borrar todas las fotos del celular
function borrarTodasFotosCelular() {
    document.getElementById('celularFotos').value = '';
    document.getElementById('celularFotosPreview').innerHTML = '';
    document.getElementById('celularFotosInput').value = '';
    showNotification('🗑️ Todas las fotos eliminadas', 'success');
}

async function saveCelular(event) {
    event.preventDefault();
    
    const id = document.getElementById('celularId').value;
    const fotosValue = document.getElementById('celularFotos').value;
    const fotos = fotosValue ? JSON.parse(fotosValue) : [];
    
    const celular = {
        _id: id || 'CEL' + Date.now(),
        marca: document.getElementById('celularMarca').value,
        modelo: document.getElementById('celularModelo').value,
        numero: document.getElementById('celularNumero').value,
        compania: document.getElementById('celularCompania').value,
        imei: document.getElementById('celularIMEI').value,
        numSerie: document.getElementById('celularNumSerie').value || '',
        propiedad: document.getElementById('celularPropiedad').value,
        almacenamiento: document.getElementById('celularAlmacenamiento').value || '',
        color: document.getElementById('celularColor').value || '',
        so: document.getElementById('celularSO').value || '',
        fechaCompra: document.getElementById('celularFechaCompra').value || '',
        proveedor: document.getElementById('celularProveedor').value || '',
        precio: document.getElementById('celularPrecio').value || '',
        factura: document.getElementById('celularFactura').value || '',
        garantiaMeses: document.getElementById('celularGarantia').value || '',
        plan: document.getElementById('celularPlan').value || '',
        costoPlan: document.getElementById('celularCostoPlan').value || '',
        renovacionPlan: document.getElementById('celularRenovacionPlan').value || '',
        estado: document.getElementById('celularEstado').value,
        observaciones: document.getElementById('celularObservaciones').value || '',
        fotos: fotos,
        createdAt: id ? database.celulares.find(c => c._id === id).createdAt : new Date().toISOString()
    };
    
    try {
        await upsertCelular(celular);
        if (id) {
            const index = database.celulares.findIndex(c => c._id === id);
            if (index !== -1) database.celulares[index] = celular;
            showNotification('✅ Celular actualizado');
        } else {
            database.celulares.push(celular);
            showNotification('✅ Celular creado');
        }
        renderCelulares();
        updateDashboard();
        closeModal('modalCelular');
    } catch(e) {
        console.error('Error guardando celular:', e);
        showNotification('❌ Error al guardar celular. Revisa la consola.', 'error');
    }

function renderCelulares() {
    const tbody = document.getElementById('celularesTableBody');
    
    if (database.celulares.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" class="empty-state">
                    <div class="empty-state-icon">📱</div>
                    <h3>No hay celulares registrados</h3>
                    <p>Haz clic en "Nuevo Celular" para comenzar</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = database.celulares.map(cel => {
        const asignacion = database.asignacionesCelulares.find(a => 
            a.celularId === cel._id && a.estado === 'Activa'
        );
        const colaborador = asignacion ? 
            database.colaboradores.find(c => c._id === asignacion.colaboradorId) : null;
        
        const estadoBadge = cel.estado === 'Disponible' ? 'badge-success' : 
                          cel.estado === 'Asignado' ? 'badge-info' : 
                          cel.estado === 'En Reparación' ? 'badge-warning' : 'badge-danger';
        
        const fotos = cel.fotos || [];
        const fotoDisplay = fotos.length > 0 ? 
            `<img src="${fotos[0]}" style="width: 50px; height: 50px; border-radius: 8px; object-fit: cover; cursor: pointer;" onclick="verDetalleCelular('${cel._id}')">` :
            `<div style="width: 50px; height: 50px; border-radius: 8px; background: #f1f5f9; display: flex; align-items: center; justify-content: center; font-size: 1.5em;">📱</div>`;
        
        const propiedadBadge = cel.propiedad === 'Empresa' ? 
            '<span class="badge" style="background: #dbeafe; color: #1e40af;">🏢 Empresa</span>' :
            '<span class="badge" style="background: #fef3c7; color: #92400e;">👤 Propio</span>';
        
        return `
            <tr>
                <td>${fotoDisplay}</td>
                <td><strong>${cel.marca}</strong></td>
                <td>${cel.modelo}</td>
                <td>${cel.numero}</td>
                <td>${cel.compania}</td>
                <td style="font-family: monospace; font-size: 0.85em;">${cel.imei}</td>
                <td>${propiedadBadge}</td>
                <td><span class="badge ${estadoBadge}">${cel.estado}</span></td>
                <td>${colaborador ? colaborador.nombre : '-'}</td>
                <td>
                    <div class="action-buttons">
                        ${cel.estado === 'Disponible' ?
                            `<button class="btn btn-sm btn-success" onclick="abrirAsignarCelular('${cel._id}')">👤 Asignar</button>` :
                            cel.estado === 'Asignado' ?
                            `<button class="btn btn-sm btn-warning" onclick="devolverCelular('${cel._id}')">↩️ Devolver</button>` :
                            ''
                        }
                        <button class="btn btn-sm btn-info" onclick="verDetalleCelular('${cel._id}')">👁️ Ver</button>
                        <button class="btn btn-sm btn-primary" onclick="editCelular('${cel._id}')">✏️</button>
                        <button class="btn btn-sm btn-danger" onclick="deleteCelular('${cel._id}')">🗑️</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function verDetalleCelular(id) {
    const celular = database.celulares.find(c => c._id === id);
    if (!celular) return;
    
    // Obtener asignación actual
    const asignacionActual = database.asignacionesCelulares.find(a => 
        a.celularId === id && a.estado === 'Activa'
    );
    const colaboradorActual = asignacionActual ? 
        database.colaboradores.find(c => c._id === asignacionActual.colaboradorId) : null;
    
    // Historial de asignaciones
    const historialAsignaciones = database.asignacionesCelulares
        .filter(a => a.celularId === id)
        .sort((a, b) => new Date(b.fechaAsignacion) - new Date(a.fechaAsignacion));
    
    // Fotos del celular
    const fotos = celular.fotos || [];
    
    const galeriaFotos = fotos.length > 0 ? `
        <div style="margin-bottom: 30px;">
            <h3 style="margin: 0 0 15px 0; color: #1e293b;">📸 Fotos del Estado Actual</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                ${fotos.map((foto, index) => `
                    <div style="position: relative; cursor: pointer;" onclick="ampliarFoto('${foto}')">
                        <img src="${foto}" style="width: 100%; height: 200px; object-fit: cover; border-radius: 12px; border: 2px solid #e2e8f0;">
                        <div style="position: absolute; bottom: 10px; right: 10px; background: rgba(0,0,0,0.7); color: white; padding: 4px 8px; border-radius: 6px; font-size: 0.8em;">
                            📷 ${index + 1}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    ` : '';
    
    const estadoBadge = celular.estado === 'Disponible' ? 'badge-success' : 
                      celular.estado === 'Asignado' ? 'badge-info' : 
                      celular.estado === 'En Reparación' ? 'badge-warning' : 'badge-danger';
    
    const propiedad = celular.propiedad || 'Empresa';
    const propiedadBadge = propiedad === 'Empresa' ? 
        '<span class="badge badge-empresa" style="font-size: 1em; padding: 8px 16px;">🏢 De la empresa</span>' :
        '<span class="badge badge-propio" style="font-size: 1em; padding: 8px 16px;">👤 Celular propio</span>';
    
    const historialHTML = historialAsignaciones.length > 0 ? historialAsignaciones.map(asig => {
        const colab = database.colaboradores.find(c => c._id === asig.colaboradorId);
        const estadoBadgeAsig = asig.estado === 'Activa' ? 'badge-success' : 'badge-warning';
        
        return `
            <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; background: white;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                    <h4 style="margin: 0; color: #1e293b;">${colab ? colab.nombre : 'N/A'}</h4>
                    <span class="badge ${estadoBadgeAsig}">${asig.estado}</span>
                </div>
                <p style="margin: 4px 0; color: #64748b; font-size: 0.9em;"><strong>Asignado:</strong> ${new Date(asig.fechaAsignacion).toLocaleDateString()}</p>
                ${asig.fechaDevolucion ? `<p style="margin: 4px 0; color: #64748b; font-size: 0.9em;"><strong>Devuelto:</strong> ${new Date(asig.fechaDevolucion).toLocaleDateString()}</p>` : ''}
                ${asig.observaciones ? `<p style="margin: 8px 0 0 0; color: #64748b; font-size: 0.9em; font-style: italic;">${asig.observaciones}</p>` : ''}
            </div>
        `;
    }).join('') : '<p style="color: #94a3b8; text-align: center;">No hay historial de asignaciones</p>';
    
    // Generar sección de garantía y compra
    const seccionCompra = celular.fechaCompra || celular.proveedor || celular.precio || celular.factura || celular.garantiaMeses ? `
        <div style="background: #f0fdf4; padding: 25px; border-radius: 12px; margin-bottom: 30px; border-left: 6px solid #10b981;">
            <h3 style="margin: 0 0 20px 0; color: #1e293b;">💰 Información de Compra y Garantía</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px;">
                ${celular.fechaCompra ? `
                    <div style="background: white; padding: 15px; border-radius: 10px;">
                        <p style="margin: 0 0 8px 0; color: #64748b; font-size: 0.85em; font-weight: 600;">📅 Fecha de Compra</p>
                        <p style="margin: 0; color: #1e293b; font-weight: 700; font-size: 1.2em;">
                            ${new Date(celular.fechaCompra).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                    </div>
                ` : ''}
                ${celular.proveedor ? `
                    <div style="background: white; padding: 15px; border-radius: 10px;">
                        <p style="margin: 0 0 8px 0; color: #64748b; font-size: 0.85em; font-weight: 600;">🏪 Proveedor</p>
                        <p style="margin: 0; color: #1e293b; font-weight: 700; font-size: 1.2em;">${celular.proveedor}</p>
                    </div>
                ` : ''}
                ${celular.precio ? `
                    <div style="background: white; padding: 15px; border-radius: 10px;">
                        <p style="margin: 0 0 8px 0; color: #64748b; font-size: 0.85em; font-weight: 600;">💵 Precio de Compra</p>
                        <p style="margin: 0; color: #10b981; font-weight: 700; font-size: 1.4em;">
                            $${parseFloat(celular.precio).toLocaleString('es-MX', {minimumFractionDigits: 2, maximumFractionDigits: 2})} MXN
                        </p>
                    </div>
                ` : ''}
                ${celular.factura ? `
                    <div style="background: white; padding: 15px; border-radius: 10px;">
                        <p style="margin: 0 0 8px 0; color: #64748b; font-size: 0.85em; font-weight: 600;">📄 Número de Factura</p>
                        <p style="margin: 0; color: #1e293b; font-weight: 700; font-size: 1.2em; font-family: monospace;">${celular.factura}</p>
                    </div>
                ` : ''}
                ${celular.garantiaMeses ? `
                    <div style="background: white; padding: 15px; border-radius: 10px;">
                        <p style="margin: 0 0 8px 0; color: #64748b; font-size: 0.85em; font-weight: 600;">🛡️ Garantía</p>
                        <p style="margin: 0; color: #10b981; font-weight: 700; font-size: 1.4em;">${celular.garantiaMeses} meses</p>
                    </div>
                ` : ''}
            </div>
        </div>
    ` : '';
    
    // Sección del plan
    const seccionPlan = celular.plan || celular.costoPlan || celular.renovacionPlan ? `
        <div style="background: #eff6ff; padding: 25px; border-radius: 12px; margin-bottom: 30px; border-left: 6px solid #3b82f6;">
            <h3 style="margin: 0 0 20px 0; color: #1e293b;">📡 Información del Plan</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px;">
                ${celular.plan ? `
                    <div style="background: white; padding: 15px; border-radius: 10px;">
                        <p style="margin: 0 0 8px 0; color: #64748b; font-size: 0.85em; font-weight: 600;">📋 Plan Contratado</p>
                        <p style="margin: 0; color: #1e293b; font-weight: 700; font-size: 1.1em;">${celular.plan}</p>
                    </div>
                ` : ''}
                ${celular.costoPlan ? `
                    <div style="background: white; padding: 15px; border-radius: 10px;">
                        <p style="margin: 0 0 8px 0; color: #64748b; font-size: 0.85em; font-weight: 600;">💵 Costo Mensual</p>
                        <p style="margin: 0; color: #3b82f6; font-weight: 700; font-size: 1.3em;">
                            $${parseFloat(celular.costoPlan).toLocaleString('es-MX', {minimumFractionDigits: 2, maximumFractionDigits: 2})} MXN
                        </p>
                    </div>
                ` : ''}
                ${celular.renovacionPlan ? `
                    <div style="background: white; padding: 15px; border-radius: 10px;">
                        <p style="margin: 0 0 8px 0; color: #64748b; font-size: 0.85em; font-weight: 600;">📅 Fecha de Renovación</p>
                        <p style="margin: 0; color: #1e293b; font-weight: 700; font-size: 1.1em;">
                            ${new Date(celular.renovacionPlan).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                    </div>
                ` : ''}
            </div>
        </div>
    ` : '';
    
    const content = `
        <div style="text-align: center; margin-bottom: 30px;">
            <div style="display: inline-block; padding: 20px 40px; background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); border-radius: 12px; color: white;">
                <div style="font-size: 4em; margin-bottom: 10px;">📱</div>
                <h2 style="margin: 0 0 5px 0;">${celular.marca} ${celular.modelo}</h2>
                <p style="margin: 0; font-size: 1.1em; opacity: 0.9;">${celular.numero}</p>
            </div>
            <div style="margin-top: 15px; display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                <span class="badge ${estadoBadge}" style="font-size: 1em; padding: 8px 16px;">${celular.estado}</span>
                ${propiedadBadge}
                <span class="badge" style="background: #c7d2fe; color: #3730a3; font-size: 1em; padding: 8px 16px;">📡 ${celular.compania}</span>
            </div>
        </div>
        
        ${galeriaFotos}
        
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px;">
            <div style="background: #f8fafc; padding: 15px; border-radius: 8px;">
                <h3 style="margin: 0 0 12px 0; color: #1e293b; font-size: 1.1em;">Información General</h3>
                <p style="margin: 6px 0; color: #475569;"><strong>IMEI:</strong> <span style="font-family: monospace;">${celular.imei}</span></p>
                ${celular.numSerie ? `<p style="margin: 6px 0; color: #475569;"><strong>Serie:</strong> ${celular.numSerie}</p>` : ''}
                ${celular.color ? `<p style="margin: 6px 0; color: #475569;"><strong>Color:</strong> ${celular.color}</p>` : ''}
                ${celular.almacenamiento ? `<p style="margin: 6px 0; color: #475569;"><strong>Almacenamiento:</strong> ${celular.almacenamiento}</p>` : ''}
                ${celular.so ? `<p style="margin: 6px 0; color: #475569;"><strong>Sistema Operativo:</strong> ${celular.so}</p>` : ''}
                <p style="margin: 6px 0; color: #475569;"><strong>Propiedad:</strong> ${propiedad === 'Empresa' ? '🏢 De la empresa' : '👤 Celular propio del colaborador'}</p>
            </div>
            
            <div style="background: #f8fafc; padding: 15px; border-radius: 8px;">
                <h3 style="margin: 0 0 12px 0; color: #1e293b; font-size: 1.1em;">Compañía y Plan</h3>
                <p style="margin: 6px 0; color: #475569;"><strong>Compañía:</strong> ${celular.compania}</p>
                <p style="margin: 6px 0; color: #475569;"><strong>Número:</strong> ${celular.numero}</p>
                ${celular.plan ? `<p style="margin: 6px 0; color: #475569;"><strong>Plan:</strong> ${celular.plan}</p>` : ''}
                ${celular.costoPlan ? `<p style="margin: 6px 0; color: #475569;"><strong>Costo Mensual:</strong> $${parseFloat(celular.costoPlan).toLocaleString('es-MX')} MXN</p>` : ''}
            </div>
        </div>
        
        ${seccionCompra}
        ${seccionPlan}
        
        ${colaboradorActual ? `
            <div style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); padding: 20px; border-radius: 12px; margin-bottom: 30px; color: white;">
                <h3 style="margin: 0 0 12px 0; font-size: 1.2em;">👤 Asignado Actualmente a:</h3>
                <p style="margin: 6px 0; font-size: 1.1em;"><strong>${colaboradorActual.nombre}</strong></p>
                <p style="margin: 6px 0; opacity: 0.9;">${colaboradorActual.departamento} - ${colaboradorActual.puesto}</p>
                <p style="margin: 6px 0; opacity: 0.9;">Desde: ${new Date(asignacionActual.fechaAsignacion).toLocaleDateString()}</p>
            </div>
        ` : ''}
        
        ${celular.observaciones ? `
            <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin-bottom: 30px; border-left: 4px solid #f59e0b;">
                <h3 style="margin: 0 0 8px 0; color: #92400e; font-size: 1.1em;">📝 Observaciones</h3>
                <p style="margin: 0; color: #78350f;">${celular.observaciones}</p>
            </div>
        ` : ''}
        
        <h3 style="margin: 25px 0 15px 0; color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">📜 Historial de Asignaciones</h3>
        <div style="display: grid; gap: 12px;">
            ${historialHTML}
        </div>
    `;
    
    document.getElementById('detalleCelularContent').innerHTML = content;
    openModal('modalDetalleCelular');
}

function editCelular(id) {
    const celular = database.celulares.find(c => c._id === id);
    
    document.getElementById('celularId').value = celular._id;
    document.getElementById('celularMarca').value = celular.marca;
    document.getElementById('celularModelo').value = celular.modelo;
    document.getElementById('celularNumero').value = celular.numero;
    document.getElementById('celularCompania').value = celular.compania;
    document.getElementById('celularIMEI').value = celular.imei;
    document.getElementById('celularNumSerie').value = celular.numSerie || '';
    document.getElementById('celularPropiedad').value = celular.propiedad;
    document.getElementById('celularAlmacenamiento').value = celular.almacenamiento || '';
    document.getElementById('celularColor').value = celular.color || '';
    document.getElementById('celularSO').value = celular.so || '';
    document.getElementById('celularFechaCompra').value = celular.fechaCompra || '';
    document.getElementById('celularProveedor').value = celular.proveedor || '';
    document.getElementById('celularPrecio').value = celular.precio || '';
    document.getElementById('celularFactura').value = celular.factura || '';
    document.getElementById('celularGarantia').value = celular.garantiaMeses || '';
    document.getElementById('celularPlan').value = celular.plan || '';
    document.getElementById('celularCostoPlan').value = celular.costoPlan || '';
    document.getElementById('celularRenovacionPlan').value = celular.renovacionPlan || '';
    document.getElementById('celularEstado').value = celular.estado;
    document.getElementById('celularObservaciones').value = celular.observaciones || '';
    
    // Cargar fotos existentes
    const fotos = celular.fotos || [];
    
    if (fotos.length > 0) {
        document.getElementById('celularFotos').value = JSON.stringify(fotos);
        const preview = document.getElementById('celularFotosPreview');
        preview.innerHTML = '';
        
        fotos.forEach((foto, index) => {
            const fotoDiv = document.createElement('div');
            fotoDiv.style.position = 'relative';
            fotoDiv.innerHTML = `
                <img src="${foto}" style="width: 100%; height: 150px; object-fit: cover; border-radius: 8px; border: 2px solid #e2e8f0;">
                <button type="button" onclick="borrarFotoCelularIndividual(${index})" style="position: absolute; top: 5px; right: 5px; background: #f56565; color: white; border: none; border-radius: 50%; width: 25px; height: 25px; cursor: pointer; font-size: 16px; line-height: 1; display: flex; align-items: center; justify-content: center;">×</button>
                <p style="margin-top: 5px; font-size: 0.75em; color: #64748b; text-align: center;">Foto ${index + 1}</p>
            `;
            preview.appendChild(fotoDiv);
        });
    }
    
    document.getElementById('modalCelularTitle').textContent = 'Editar Celular';
    openModal('modalCelular');
}

async function deleteCelular(id) {
    const asignaciones = database.asignacionesCelulares.filter(a => a.celularId === id && a.estado === 'Activa');
    
    if (asignaciones.length > 0) {
        showNotification('❌ No se puede eliminar. El celular está asignado.', 'error');
        return;
    }
    
    if (confirm('¿Estás seguro de eliminar este celular?')) {
        try {
            await deleteCelularDB(id);
            database.celulares = database.celulares.filter(c => c._id !== id);
            database.asignacionesCelulares = database.asignacionesCelulares.filter(a => a.celularId !== id);
            renderCelulares();
            updateDashboard();
            showNotification('✅ Celular eliminado');
        } catch(e) {
            console.error('Error eliminando celular:', e);
            showNotification('❌ Error al eliminar. Revisa la consola.', 'error');
        }
    }
}

function filterCelulares() {
    const searchTerm = document.getElementById('searchCelular').value.toLowerCase();
    const filterEstado = document.getElementById('filterEstadoCelular').value;
    const filterCompania = document.getElementById('filterCompania').value;
    const filterPropiedad = document.getElementById('filterPropiedadCelular').value;
    const rows = document.querySelectorAll('#celularesTableBody tr');
    
    rows.forEach(row => {
        // Si es la fila de "empty state", no filtrar
        if (row.querySelector('.empty-state')) {
            return;
        }
        
        const text = row.textContent.toLowerCase();
        const estado = row.querySelector('.badge-success, .badge-info, .badge-warning, .badge-danger') ?
            row.querySelector('.badge-success, .badge-info, .badge-warning, .badge-danger').textContent : '';
        
        const matchSearch = text.includes(searchTerm);
        const matchEstado = !filterEstado || estado.includes(filterEstado);
        const matchCompania = !filterCompania || text.includes(filterCompania.toLowerCase());
        const matchPropiedad = !filterPropiedad || text.includes(filterPropiedad.toLowerCase());
        
        row.style.display = (matchSearch && matchEstado && matchCompania && matchPropiedad) ? '' : 'none';
    });
}

// ================================
// ASIGNACIÓN DE CELULARES
// ================================

function abrirAsignarCelular(celularId) {
    const celular = database.celulares.find(c => c._id === celularId);
    if (!celular) return;

    document.getElementById('asignacionCelularId').value = celularId;
    document.getElementById('asignacionCelularNombre').textContent = `${celular.marca} ${celular.modelo} (${celular.numero})`;

    // Cargar colaboradores en el select
    const select = document.getElementById('asignacionCelularColaborador');
    select.innerHTML = '<option value="">Seleccionar colaborador...</option>' +
        database.colaboradores.map(col =>
            `<option value="${col._id}">${col.nombre} - ${col.departamento}</option>`
        ).join('');

    // Fecha de hoy
    document.getElementById('asignacionCelularFecha').value = new Date().toISOString().split('T')[0];
    document.getElementById('asignacionCelularObservaciones').value = '';

    openModal('modalAsignacionCelular');
}

function saveAsignacionCelular(event) {
    event.preventDefault();

    const celularId = document.getElementById('asignacionCelularId').value;
    const colaboradorId = document.getElementById('asignacionCelularColaborador').value;
    const fecha = document.getElementById('asignacionCelularFecha').value;
    const observaciones = document.getElementById('asignacionCelularObservaciones').value;

    if (!colaboradorId) {
        showNotification('❌ Debes seleccionar un colaborador', 'error');
        return;
    }

    // Verificar si ya tiene una asignación activa
    const asignacionActiva = database.asignacionesCelulares.find(a =>
        a.celularId === celularId && a.estado === 'Activa'
    );
    if (asignacionActiva) {
        showNotification('❌ Este celular ya está asignado. Primero devuélvelo.', 'error');
        return;
    }

    const asignacion = {
        _id: 'ASGCEL' + Date.now(),
        celularId: celularId,
        colaboradorId: colaboradorId,
        fechaAsignacion: fecha,
        fechaDevolucion: null,
        estado: 'Activa',
        observaciones: observaciones,
        createdAt: new Date().toISOString()
    };

    database.asignacionesCelulares.push(asignacion);

    // Actualizar estado del celular
    const celular = database.celulares.find(c => c._id === celularId);
    if (celular) {
        celular.estado = 'Asignado';
    }

    // saveData() - now handled by Supabase
    renderCelulares();
    if (typeof updateDashboard === 'function') updateDashboard();
    closeModal('modalAsignacionCelular');
    showNotification('✅ Celular asignado correctamente');
}

function devolverCelular(celularId) {
    if (!confirm('¿Confirmar devolución del celular?')) return;

    const asignacion = database.asignacionesCelulares.find(a =>
        a.celularId === celularId && a.estado === 'Activa'
    );
    if (!asignacion) {
        showNotification('❌ No se encontró asignación activa', 'error');
        return;
    }

    asignacion.estado = 'Devuelto';
    asignacion.fechaDevolucion = new Date().toISOString().split('T')[0];

    const celular = database.celulares.find(c => c._id === celularId);
    if (celular) {
        celular.estado = 'Disponible';
    }

    // saveData() - now handled by Supabase
    renderCelulares();
    if (typeof updateDashboard === 'function') updateDashboard();
    showNotification('✅ Celular devuelto correctamente');
}

}
