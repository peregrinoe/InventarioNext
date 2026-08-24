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
            try { validateImageFile(file); } catch (e) {
                showNotification('❌ ' + e.message + ' (' + file.name + ')', 'error');
                loadedCount++;
                return;
            }
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
        validateFields(
            { 'Marca': celular.marca, 'Modelo': celular.modelo, 'Número': celular.numero, 'Compañía': celular.compania, 'IMEI': celular.imei },
            {
                'Marca':     { required: true, maxLen: 100 },
                'Modelo':    { required: true, maxLen: 150 },
                'Número':    { required: true, phone: true, maxLen: 20 },
                'Compañía':  { required: true, maxLen: 100 },
                'IMEI':      { maxLen: 20 }
            }
        );
    } catch (validationError) {
        showNotification('❌ ' + validationError.message, 'error');
        return;
    }

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
            `<img src="${escapeHTML(fotos[0])}" style="width: 50px; height: 50px; border-radius: 8px; object-fit: cover; cursor: pointer;" onclick="verDetalleCelular('${cel._id}')">` :
            `<div style="width: 50px; height: 50px; border-radius: 8px; background: #f1f5f9; display: flex; align-items: center; justify-content: center;"><i data-lucide="smartphone" style="width:22px;height:22px;color:#94a3b8;"></i></div>`;
        
        const propiedadBadge = cel.propiedad === 'Empresa' ? 
            '<span class="badge badge-empresa">Empresa</span>' :
            '<span class="badge badge-propio">Propio</span>';
        
        return `
            <tr>
                <td>${fotoDisplay}</td>
                <td><strong>${escapeHTML(cel.marca)}</strong></td>
                <td>${escapeHTML(cel.modelo)}</td>
                <td>${escapeHTML(cel.numero)}</td>
                <td>${escapeHTML(cel.compania)}</td>
                <td style="font-family: monospace; font-size: 0.85em;">${escapeHTML(cel.imei)}</td>
                <td>${propiedadBadge}</td>
                <td><span class="badge ${estadoBadge}">${escapeHTML(cel.estado)}</span></td>
                <td>${colaborador ? escapeHTML(colaborador.nombre) : '-'}</td>
                <td>
                    <div class="action-buttons">
                        ${cel.estado === 'Disponible' ?
                            `<button class="btn btn-sm btn-success" onclick="abrirAsignarCelular('${cel._id}')"><i data-lucide="user-plus"></i> Asignar</button>` :
                            cel.estado === 'Asignado' ?
                            `<button class="btn btn-sm btn-warning" onclick="devolverCelular('${cel._id}')"><i data-lucide="rotate-ccw"></i> Devolver</button>` :
                            ''
                        }
                        <button class="btn btn-sm btn-info" onclick="verDetalleCelular('${cel._id}')"><i data-lucide="eye"></i> Ver</button>
                        <button class="btn btn-sm btn-primary" onclick="editCelular('${cel._id}')"><i data-lucide="pencil"></i></button>
                        <button class="btn btn-sm btn-danger" onclick="deleteCelular('${cel._id}')"><i data-lucide="trash-2"></i></button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    refreshIcons();
}

function verDetalleCelular(id) {
    const celular = database.celulares.find(c => c._id === id);
    if (!celular) return;

    const asignacionActual = (database.asignacionesCelulares || []).find(a => a.celularId === id && a.estado === 'Activa');
    const colaboradorActual = asignacionActual
        ? database.colaboradores.find(c => c._id === asignacionActual.colaboradorId) : null;
    const historialAsignaciones = (database.asignacionesCelulares || [])
        .filter(a => a.celularId === id)
        .sort((a, b) => new Date(b.fechaAsignacion) - new Date(a.fechaAsignacion));
    const fotos = celular.fotos || [];
    const propiedad = celular.propiedad || 'Empresa';

    // ── Photo gallery ─────────────────────────────────────────────────────
    const galeriaFotos = fotos.length > 0 ? `
        <div style="margin-bottom:24px;">
            <div class="detail-section-title"><i data-lucide="image"></i> Fotos del Estado Actual</div>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px;">
                ${fotos.map((foto, i) => `
                    <div style="position:relative;cursor:pointer;" onclick='ampliarFoto("${escapeHTML(foto)}")'>
                        <img src="${escapeHTML(foto)}" style="width:100%;height:140px;object-fit:cover;border-radius:var(--radius-md);border:1px solid var(--border-subtle);">
                        <div style="position:absolute;bottom:6px;right:6px;background:rgba(0,0,0,0.55);color:white;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;">${i + 1}</div>
                    </div>`).join('')}
            </div>
        </div>` : `
        <div style="text-align:center;padding:18px;background:var(--bg-elevated);border:1px solid var(--border-subtle);border-radius:var(--radius-lg);margin-bottom:24px;">
            <div style="display:flex;justify-content:center;margin-bottom:6px;opacity:0.3;"><i data-lucide="camera-off" style="width:28px;height:28px;"></i></div>
            <p style="color:var(--text-muted);font-size:13px;margin:0;">Sin fotos del celular</p>
        </div>`;

    // ── Status badges ──────────────────────────────────────────────────────
    const estadoBadge = celular.estado === 'Disponible' ? 'badge-success'
        : celular.estado === 'Asignado' ? 'badge-info'
        : celular.estado === 'En Reparación' ? 'badge-warning' : 'badge-danger';

    const propiedadColor = propiedad === 'Empresa' ? '#3b82f6' : '#8b5cf6';

    // ── Historial ─────────────────────────────────────────────────────────
    const historialHTML = historialAsignaciones.length > 0
        ? historialAsignaciones.map(asig => {
            const colab = database.colaboradores.find(c => c._id === asig.colaboradorId);
            const badgeCls = asig.estado === 'Activa' ? 'badge-success' : 'badge-warning';
            return `<div class="detail-hist-item">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:5px;">
                    <span style="font-weight:700;color:var(--text-primary);font-size:13px;">${escapeHTML(colab ? colab.nombre : 'N/A')}</span>
                    <span class="badge ${badgeCls}" style="font-size:0.72em;flex-shrink:0;">${escapeHTML(asig.estado)}</span>
                </div>
                <div style="color:var(--text-secondary);font-size:12px;">
                    Asignado: ${new Date(asig.fechaAsignacion).toLocaleDateString('es-MX')}
                    ${asig.fechaDevolucion ? ` &middot; Devuelto: ${new Date(asig.fechaDevolucion).toLocaleDateString('es-MX')}` : ''}
                </div>
                ${asig.observaciones ? `<div style="color:var(--text-muted);font-size:11px;margin-top:4px;font-style:italic;">${escapeHTML(asig.observaciones)}</div>` : ''}
            </div>`;
        }).join('')
        : `<p style="color:var(--text-muted);text-align:center;padding:16px 0;font-size:13px;">Sin historial de asignaciones</p>`;

    // ── Compra & garantía ─────────────────────────────────────────────────
    const seccionCompra = (celular.fechaCompra || celular.proveedor || celular.precio || celular.factura || celular.garantiaMeses) ? `
        <div class="detail-info-card" style="margin-bottom:24px;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;">
                <i data-lucide="shopping-cart" style="width:15px;height:15px;color:var(--accent-primary);"></i>
                <span style="font-weight:700;color:var(--text-primary);font-size:13px;">Compra y Garantía</span>
            </div>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px;">
                ${celular.fechaCompra ? `<div class="detail-spec-block" style="background:var(--bg-overlay);color:var(--text-primary);"><div style="font-size:10px;font-weight:600;opacity:0.7;margin-bottom:4px;text-transform:uppercase;">Fecha Compra</div><div style="font-weight:700;font-size:13px;">${new Date(celular.fechaCompra).toLocaleDateString('es-MX',{day:'2-digit',month:'short',year:'numeric'})}</div></div>` : ''}
                ${celular.proveedor ? `<div class="detail-spec-block" style="background:var(--bg-overlay);color:var(--text-primary);"><div style="font-size:10px;font-weight:600;opacity:0.7;margin-bottom:4px;text-transform:uppercase;">Proveedor</div><div style="font-weight:700;font-size:13px;">${escapeHTML(celular.proveedor)}</div></div>` : ''}
                ${celular.precio ? `<div class="detail-spec-block" style="background:linear-gradient(135deg,#10b981,#34d399);"><div style="font-size:10px;font-weight:600;opacity:0.85;margin-bottom:4px;text-transform:uppercase;">Precio</div><div style="font-weight:800;font-size:14px;">$${parseFloat(celular.precio).toLocaleString('es-MX',{minimumFractionDigits:0})} MXN</div></div>` : ''}
                ${celular.factura ? `<div class="detail-spec-block" style="background:var(--bg-overlay);color:var(--text-primary);"><div style="font-size:10px;font-weight:600;opacity:0.7;margin-bottom:4px;text-transform:uppercase;">Factura</div><div style="font-weight:700;font-size:13px;font-family:monospace;">${escapeHTML(celular.factura)}</div></div>` : ''}
                ${celular.garantiaMeses ? `<div class="detail-spec-block" style="background:linear-gradient(135deg,#3b82f6,#60a5fa);"><div style="font-size:10px;font-weight:600;opacity:0.85;margin-bottom:4px;text-transform:uppercase;">Garantía</div><div style="font-weight:800;font-size:14px;">${escapeHTML(String(celular.garantiaMeses))} meses</div></div>` : ''}
            </div>
        </div>` : '';

    // ── Plan ──────────────────────────────────────────────────────────────
    const seccionPlan = (celular.plan || celular.costoPlan || celular.renovacionPlan) ? `
        <div class="detail-info-card" style="margin-bottom:24px;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;">
                <i data-lucide="wifi" style="width:15px;height:15px;color:var(--accent-primary);"></i>
                <span style="font-weight:700;color:var(--text-primary);font-size:13px;">Plan Telefónico</span>
            </div>
            <div style="display:grid;gap:6px;">
                ${celular.plan ? `<div class="detail-info-row"><span class="detail-info-label">Plan</span><span class="detail-info-value">${escapeHTML(celular.plan)}</span></div>` : ''}
                ${celular.costoPlan ? `<div class="detail-info-row"><span class="detail-info-label">Costo</span><span class="detail-info-value">$${parseFloat(celular.costoPlan).toLocaleString('es-MX',{minimumFractionDigits:2})} MXN/mes</span></div>` : ''}
                ${celular.renovacionPlan ? `<div class="detail-info-row"><span class="detail-info-label">Renovación</span><span class="detail-info-value">${new Date(celular.renovacionPlan).toLocaleDateString('es-MX',{day:'2-digit',month:'short',year:'numeric'})}</span></div>` : ''}
            </div>
        </div>` : '';

    const content = `
        <div class="detail-hero" style="background:linear-gradient(135deg,#fa709a 0%,#fee140 100%);">
            <div style="width:60px;height:60px;border-radius:var(--radius-lg);background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                <i data-lucide="smartphone" style="width:28px;height:28px;color:white;"></i>
            </div>
            <div class="detail-hero-info">
                <div class="detail-hero-name">${escapeHTML(celular.marca)} ${escapeHTML(celular.modelo)}</div>
                <div class="detail-hero-sub">${escapeHTML(celular.compania || '—')}${celular.numero ? ` &middot; ${escapeHTML(celular.numero)}` : ''}</div>
                <div class="detail-hero-badges">
                    <span class="badge ${estadoBadge}" style="font-size:0.78em;">${escapeHTML(celular.estado)}</span>
                    <span style="background:${propiedadColor}33;color:${propiedadColor};border:1px solid ${propiedadColor}55;font-size:0.78em;padding:4px 10px;border-radius:20px;font-weight:600;">${escapeHTML(propiedad)}</span>
                    ${celular.compania ? `<span style="background:rgba(255,255,255,0.2);color:white;font-size:0.78em;padding:4px 10px;border-radius:20px;font-weight:600;">${escapeHTML(celular.compania)}</span>` : ''}
                </div>
            </div>
        </div>

        ${galeriaFotos}

        <div class="detail-grid-2">
            <div class="detail-info-card">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;">
                    <i data-lucide="info" style="width:15px;height:15px;color:var(--accent-primary);"></i>
                    <span style="font-weight:700;color:var(--text-primary);font-size:13px;">Identificación</span>
                </div>
                ${celular.imei ? `<div class="detail-info-row"><span class="detail-info-label">IMEI</span><span class="detail-info-value"><code style="font-size:11px;">${escapeHTML(celular.imei)}</code></span></div>` : ''}
                ${celular.numSerie ? `<div class="detail-info-row"><span class="detail-info-label">N° Serie</span><span class="detail-info-value"><code style="font-size:11px;">${escapeHTML(celular.numSerie)}</code></span></div>` : ''}
                ${celular.color ? `<div class="detail-info-row"><span class="detail-info-label">Color</span><span class="detail-info-value">${escapeHTML(celular.color)}</span></div>` : ''}
                <div class="detail-info-row"><span class="detail-info-label">Propiedad</span><span class="detail-info-value">${escapeHTML(propiedad)}</span></div>
            </div>
            <div class="detail-info-card">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;">
                    <i data-lucide="cpu" style="width:15px;height:15px;color:var(--accent-primary);"></i>
                    <span style="font-weight:700;color:var(--text-primary);font-size:13px;">Especificaciones</span>
                </div>
                ${celular.almacenamiento ? `<div class="detail-info-row"><span class="detail-info-label">Almacén.</span><span class="detail-info-value">${escapeHTML(celular.almacenamiento)}</span></div>` : ''}
                ${celular.so ? `<div class="detail-info-row"><span class="detail-info-label">S.O.</span><span class="detail-info-value">${escapeHTML(celular.so)}</span></div>` : ''}
                ${celular.compania ? `<div class="detail-info-row"><span class="detail-info-label">Compañía</span><span class="detail-info-value">${escapeHTML(celular.compania)}</span></div>` : ''}
                ${celular.numero ? `<div class="detail-info-row"><span class="detail-info-label">Número</span><span class="detail-info-value">${escapeHTML(celular.numero)}</span></div>` : ''}
            </div>
        </div>

        ${seccionCompra}
        ${seccionPlan}

        ${colaboradorActual ? `
        <div style="background:linear-gradient(135deg,#fa709a 0%,#fee140 100%);border-radius:var(--radius-lg);padding:18px 20px;margin-bottom:24px;color:white;display:flex;align-items:center;gap:16px;">
            <div style="width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                <i data-lucide="user" style="width:20px;height:20px;color:white;"></i>
            </div>
            <div>
                <div style="font-size:11px;opacity:0.75;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;">Asignado actualmente a</div>
                <div style="font-weight:800;font-size:15px;">${escapeHTML(colaboradorActual.nombre)}</div>
                <div style="opacity:0.85;font-size:13px;">${escapeHTML(colaboradorActual.departamento || '')} &middot; ${escapeHTML(colaboradorActual.puesto || '')}</div>
                <div style="opacity:0.7;font-size:11px;margin-top:2px;">Desde: ${new Date(asignacionActual.fechaAsignacion).toLocaleDateString('es-MX')}</div>
            </div>
        </div>` : ''}

        ${celular.observaciones ? `
        <div style="background:rgba(245,158,11,0.07);border:1px solid rgba(245,158,11,0.22);border-left:4px solid #f59e0b;border-radius:var(--radius-md);padding:14px 16px;margin-bottom:24px;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                <i data-lucide="message-square" style="width:14px;height:14px;color:#f59e0b;"></i>
                <span style="font-weight:700;color:var(--text-primary);font-size:13px;">Observaciones</span>
            </div>
            <p style="margin:0;color:var(--text-secondary);font-size:13px;">${escapeHTML(celular.observaciones)}</p>
        </div>` : ''}

        <div class="detail-section-title"><i data-lucide="history"></i> Historial de Asignaciones</div>
        <div style="display:grid;gap:8px;">${historialHTML}</div>
    `;

    document.getElementById('detalleCelularContent').innerHTML = content;
    refreshIcons();
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

async function saveAsignacionCelular(event) {
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

    try {
        await upsertAsignacionCelular(asignacion);
        database.asignacionesCelulares.push(asignacion);

        const celular = database.celulares.find(c => c._id === celularId);
        if (celular) {
            celular.estado = 'Asignado';
            await upsertCelular(celular);
        }

        renderCelulares();
        if (typeof updateDashboard === 'function') updateDashboard();
        closeModal('modalAsignacionCelular');
        showNotification('✅ Celular asignado correctamente');
    } catch(e) {
        console.error('Error guardando asignación de celular:', e);
        showNotification('❌ Error al guardar la asignación. Revisa la consola.', 'error');
    }
}

async function devolverCelular(celularId) {
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

    try {
        await upsertAsignacionCelular(asignacion);
        if (celular) await upsertCelular(celular);

        renderCelulares();
        if (typeof updateDashboard === 'function') updateDashboard();
        showNotification('✅ Celular devuelto correctamente');
    } catch(e) {
        console.error('Error registrando devolución:', e);
        showNotification('❌ Error al registrar la devolución. Revisa la consola.', 'error');
    }
}

