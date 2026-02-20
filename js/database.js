// ================================
// BASE DE DATOS - SUPABASE
// ================================
// 
// 🔧 CONFIGURACIÓN REQUERIDA:
// Reemplaza estos dos valores con los de tu proyecto en Supabase
// Los encuentras en: supabase.com → Tu proyecto → Settings → API
//
const SUPABASE_URL = 'https://chxfhirgehvvykordrnd.supabase.co';  // ← Cambia esto
const SUPABASE_KEY = 'sb_publishable_Vd4i7BPDyhXpe4W191xQdQ_icot6e-V';  // ← Cambia esto (usa la "anon public")
// ================================

// Cliente Supabase (usa la librería cargada en index.html)
let supabaseClient;

// Base de datos en memoria (igual que antes, se sincroniza con Supabase)
let database = {
    colaboradores: [],
    equipos: [],
    celulares: [],
    asignaciones: [],
    asignacionesCelulares: [],
    licencias: [],
    licenciasAsignaciones: []
};

// ================================
// INICIALIZACIÓN
// ================================

function initSupabase() {
    // La librería puede exponerse como window.supabase o window.supabase.createClient
    // dependiendo del bundle (UMD vs ESM)
    let createClient;

    if (typeof window.supabase !== 'undefined') {
        if (typeof window.supabase.createClient === 'function') {
            // UMD bundle: window.supabase.createClient(...)
            createClient = window.supabase.createClient.bind(window.supabase);
        } else if (typeof window.supabase === 'function') {
            // Alternativa: window.supabase(...)
            createClient = window.supabase;
        }
    }

    if (!createClient) {
        console.error('❌ Librería Supabase no cargada correctamente');
        console.error('window.supabase =', window.supabase);
        showNotification('❌ Error de conexión con la base de datos', 'error');
        return false;
    }

    supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log('✅ Supabase inicializado correctamente');
    return true;
}

// ================================
// CARGA DE DATOS DESDE SUPABASE
// ================================

async function loadData() {
    if (!initSupabase()) return;

    showLoadingIndicator(true);

    try {
        // Cargar todas las tablas en paralelo
        const [
            colaboradoresRes,
            equiposRes,
            celularesRes,
            asignacionesRes,
            asignacionesCelularesRes,
            licenciasRes,
            licenciasAsignacionesRes
        ] = await Promise.all([
            supabaseClient.from('colaboradores').select('*').order('nombre'),
            supabaseClient.from('equipos').select('*'),
            supabaseClient.from('celulares').select('*'),
            supabaseClient.from('asignaciones').select('*'),
            supabaseClient.from('asignaciones_celulares').select('*'),
            supabaseClient.from('licencias').select('*'),
            supabaseClient.from('licencias_asignaciones').select('*')
        ]);

        // Verificar errores
        const errores = [
            colaboradoresRes, equiposRes, celularesRes,
            asignacionesRes, asignacionesCelularesRes,
            licenciasRes, licenciasAsignacionesRes
        ].filter(r => r.error);

        if (errores.length > 0) {
            console.error('Errores al cargar:', errores.map(e => e.error));
            showNotification('⚠️ Error al cargar algunos datos. Verifica la configuración.', 'error');
        }

        // Guardar en memoria local - mapeando id → _id y snake_case → camelCase
        database.colaboradores         = (colaboradoresRes.data || []).map(mapColaborador);
        database.equipos               = (equiposRes.data || []).map(mapEquipo);
        database.celulares             = (celularesRes.data || []).map(mapCelular);
        database.asignaciones          = (asignacionesRes.data || []).map(mapAsignacion);
        database.asignacionesCelulares = (asignacionesCelularesRes.data || []).map(mapAsignacionCelular);
        database.licencias             = (licenciasRes.data || []).map(mapLicencia);
        database.licenciasAsignaciones = (licenciasAsignacionesRes.data || []).map(mapLicenciaAsignacion);

        console.log('✅ Datos cargados desde Supabase:', {
            colaboradores: database.colaboradores.length,
            equipos: database.equipos.length,
            celulares: database.celulares.length,
            licencias: database.licencias.length
        });

        renderAll();

    } catch (error) {
        console.error('Error fatal al cargar datos:', error);
        showNotification('❌ No se pudo conectar con la base de datos', 'error');
    } finally {
        showLoadingIndicator(false);
    }
}

// Mappers: convierten nombres de columnas DB → nombres que usa el resto del código

function mapColaborador(row) {
    return {
        _id: row.id,
        nombre: row.nombre,
        email: row.email,
        telefono: row.telefono,
        departamento: row.departamento,
        puesto: row.puesto,
        fechaIngreso: row.fecha_ingreso,
        jefeInmediato: row.jefe_inmediato,
        esExterno: row.es_externo,
        foto: row.foto,
        cartaEstado: row.carta_estado || 'pendiente',
        createdAt: row.created_at
    };
}

function mapEquipo(row) {
    let fotos = [];
    try { fotos = row.fotos ? JSON.parse(row.fotos) : []; } catch(e) {}
    return {
        _id: row.id,
        tipo: row.tipo,
        marca: row.marca,
        modelo: row.modelo,
        numSerie: row.num_serie,
        nombreEquipo: row.nombre_equipo,
        idInterno: row.id_interno,
        categoria: row.categoria,
        propiedad: row.propiedad,
        procesador: row.procesador,
        ram: row.ram,
        almacenamiento: row.almacenamiento,
        so: row.so,
        fechaCompra: row.fecha_compra,
        proveedor: row.proveedor,
        precio: row.precio,
        factura: row.factura,
        garantiaMeses: row.garantia,
        ultimoMantenimiento: row.ultimo_mantenimiento,
        frecuenciaMantenimiento: row.frecuencia_mantenimiento,
        condicion: row.condicion,
        ubicacion: row.ubicacion || '',
        estado: row.estado,
        observaciones: row.observaciones,
        fotos: fotos,
        createdAt: row.created_at
    };
}

function mapCelular(row) {
    let fotos = [];
    try { fotos = row.fotos ? JSON.parse(row.fotos) : []; } catch(e) {}
    return {
        _id: row.id,
        marca: row.marca,
        modelo: row.modelo,
        imei: row.imei || '',
        numero: row.numero || '',
        compania: row.compania || '',
        numSerie: row.num_serie || '',
        propiedad: row.propiedad || 'Empresa',
        almacenamiento: row.almacenamiento || '',
        color: row.color || '',
        so: row.so || '',
        plan: row.plan || '',
        costoPlan: row.costo_plan || '',
        renovacionPlan: row.renovacion_plan || '',
        estado: row.estado,
        condicion: row.condicion || '',
        precio: row.precio || '',
        fechaCompra: row.fecha_compra || '',
        proveedor: row.proveedor || '',
        factura: row.factura || '',
        garantiaMeses: row.garantia_meses || '',
        fotos: fotos,
        observaciones: row.observaciones || '',
        createdAt: row.created_at
    };
}

function mapLicencia(row) {
    return {
        _id: row.id,
        software: row.software,
        tipo: row.tipo,
        clave: row.clave,
        fechaCompra: row.fecha_compra,
        fechaVencimiento: row.fecha_vencimiento,
        estado: row.estado,
        notas: row.notas,
        createdAt: row.created_at
    };
}


function mapAsignacion(row) {
    return {
        _id: row.id,
        colaboradorId: row.colaborador_id,
        equipoId: row.equipo_id,
        fechaAsignacion: row.fecha_asignacion,
        fechaDevolucion: row.fecha_devolucion,
        estado: row.estado,
        notas: row.notas
    };
}

function mapAsignacionCelular(row) {
    return {
        _id: row.id,
        colaboradorId: row.colaborador_id,
        celularId: row.celular_id,
        fechaAsignacion: row.fecha_asignacion,
        fechaDevolucion: row.fecha_devolucion,
        estado: row.estado,
        notas: row.notas
    };
}

function mapLicenciaAsignacion(row) {
    return {
        _id: row.id,
        licenciaId: row.licencia_id,
        colaboradorId: row.colaborador_id,
        fechaAsignacion: row.fecha_asignacion
    };
}

// ================================
// GUARDAR DATOS EN SUPABASE
// ================================

// saveData() ahora es un no-op porque cada módulo llama directamente
// a las funciones específicas (upsertColaborador, upsertEquipo, etc.)
// Se mantiene por compatibilidad con código existente.
function saveData() {
    console.log('ℹ️ saveData() llamado - los datos ya se guardan directamente en Supabase');
}

// --- COLABORADORES ---
async function upsertColaborador(colaborador) {
    const row = {
        id: colaborador._id,
        nombre: colaborador.nombre,
        email: colaborador.email,
        telefono: colaborador.telefono || null,
        departamento: colaborador.departamento,
        puesto: colaborador.puesto,
        fecha_ingreso: colaborador.fechaIngreso || null,
        jefe_inmediato: colaborador.jefeInmediato || null,
        es_externo: colaborador.esExterno || false,
        foto: colaborador.foto || null,
        created_at: colaborador.createdAt
    };

    const { error } = await supabaseClient.from('colaboradores').upsert(row, { onConflict: 'id' });
    if (error) throw error;
}

async function deleteColaboradorDB(id) {
    const { error } = await supabaseClient.from('colaboradores').delete().eq('id', id);
    if (error) throw error;
}

// --- EQUIPOS ---
async function upsertEquipo(equipo) {
    const row = {
        id: equipo._id,
        marca: equipo.marca,
        modelo: equipo.modelo,
        tipo: equipo.tipo || null,
        num_serie: equipo.numSerie || null,
        nombre_equipo: equipo.nombreEquipo || null,
        id_interno: equipo.idInterno || null,
        procesador: equipo.procesador || null,
        ram: equipo.ram || null,
        almacenamiento: equipo.almacenamiento || null,
        so: equipo.so || null,
        estado: equipo.estado || 'Disponible',
        condicion: equipo.condicion || null,
        ubicacion: equipo.ubicacion || null,
        categoria: equipo.categoria || null,
        propiedad: equipo.propiedad || null,
        precio: equipo.precio || null,
        fecha_compra: equipo.fechaCompra || null,
        proveedor: equipo.proveedor || null,
        factura: equipo.factura || null,
        garantia: equipo.garantiaMeses || null,
        ultimo_mantenimiento: equipo.ultimoMantenimiento || null,
        frecuencia_mantenimiento: equipo.frecuenciaMantenimiento || null,
        fotos: equipo.fotos ? JSON.stringify(equipo.fotos) : null,
        observaciones: equipo.observaciones || null,
        created_at: equipo.createdAt || new Date().toISOString()
    };

    const { error } = await supabaseClient.from('equipos').upsert(row, { onConflict: 'id' });
    if (error) throw error;
}

async function deleteEquipoDB(id) {
    const { error } = await supabaseClient.from('equipos').delete().eq('id', id);
    if (error) throw error;
}

// --- CELULARES ---
async function upsertCelular(celular) {
    const row = {
        id: celular._id,
        marca: celular.marca,
        modelo: celular.modelo,
        imei: celular.imei || null,
        numero: celular.numero || null,
        compania: celular.compania || null,
        num_serie: celular.numSerie || null,
        propiedad: celular.propiedad || null,
        almacenamiento: celular.almacenamiento || null,
        color: celular.color || null,
        so: celular.so || null,
        plan: celular.plan || null,
        costo_plan: celular.costoPlan || null,
        renovacion_plan: celular.renovacionPlan || null,
        estado: celular.estado,
        condicion: celular.condicion || null,
        precio: celular.precio || null,
        fecha_compra: celular.fechaCompra || null,
        proveedor: celular.proveedor || null,
        factura: celular.factura || null,
        garantia_meses: celular.garantiaMeses || null,
        fotos: celular.fotos ? JSON.stringify(celular.fotos) : null,
        observaciones: celular.observaciones || null,
        created_at: celular.createdAt
    };

    const { error } = await supabaseClient.from('celulares').upsert(row, { onConflict: 'id' });
    if (error) throw error;
}

async function deleteCelularDB(id) {
    const { error } = await supabaseClient.from('celulares').delete().eq('id', id);
    if (error) throw error;
}

// --- ASIGNACIONES ---
async function upsertAsignacion(asig) {
    const row = {
        id: asig._id,
        colaborador_id: asig.colaboradorId,
        equipo_id: asig.equipoId,
        fecha_asignacion: asig.fechaAsignacion,
        fecha_devolucion: asig.fechaDevolucion || null,
        estado: asig.estado,
        notas: asig.notas || null
    };

    const { error } = await supabaseClient.from('asignaciones').upsert(row, { onConflict: 'id' });
    if (error) throw error;
}

async function upsertAsignacionCelular(asig) {
    const row = {
        id: asig._id,
        colaborador_id: asig.colaboradorId,
        celular_id: asig.celularId,
        fecha_asignacion: asig.fechaAsignacion,
        fecha_devolucion: asig.fechaDevolucion || null,
        estado: asig.estado,
        notas: asig.notas || null
    };

    const { error } = await supabaseClient.from('asignaciones_celulares').upsert(row, { onConflict: 'id' });
    if (error) throw error;
}

// --- LICENCIAS ---
async function upsertLicencia(lic) {
    const row = {
        id: lic._id,
        software: lic.software,
        tipo: lic.tipo,
        clave: lic.clave || null,
        fecha_compra: lic.fechaCompra || null,
        fecha_vencimiento: lic.fechaVencimiento || null,
        estado: lic.estado,
        notas: lic.notas || null,
        created_at: lic.createdAt
    };

    const { error } = await supabaseClient.from('licencias').upsert(row, { onConflict: 'id' });
    if (error) throw error;
}

async function deleteLicenciaDB(id) {
    const { error } = await supabaseClient.from('licencias').delete().eq('id', id);
    if (error) throw error;
}

async function upsertLicenciaAsignacion(la) {
    const row = {
        id: la._id,
        licencia_id: la.licenciaId,
        colaborador_id: la.colaboradorId,
        fecha_asignacion: la.fechaAsignacion
    };

    const { error } = await supabaseClient.from('licencias_asignaciones').upsert(row, { onConflict: 'id' });
    if (error) throw error;
}

async function deleteLicenciaAsignacionesPorLicencia(licenciaId) {
    const { error } = await supabaseClient
        .from('licencias_asignaciones')
        .delete()
        .eq('licencia_id', licenciaId);
    if (error) throw error;
}

// ================================
// EXPORTAR / IMPORTAR JSON
// ================================

function exportarDatos() {
    const dataStr = JSON.stringify(database, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `inventario_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();

    showNotification('✅ Datos exportados correctamente', 'success');
}

async function importarDatos(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const importedData = JSON.parse(e.target.result);

            if (!importedData.colaboradores || !Array.isArray(importedData.colaboradores)) {
                showNotification('❌ Archivo inválido: falta "colaboradores"', 'error'); return;
            }
            if (!importedData.equipos || !Array.isArray(importedData.equipos)) {
                showNotification('❌ Archivo inválido: falta "equipos"', 'error'); return;
            }
            if (!importedData.asignaciones || !Array.isArray(importedData.asignaciones)) {
                showNotification('❌ Archivo inválido: falta "asignaciones"', 'error'); return;
            }

            showNotification('⏳ Importando datos en Supabase...', 'success');

            // Subir todo a Supabase
            for (const col of (importedData.colaboradores || [])) {
                await upsertColaborador(col);
            }
            for (const eq of (importedData.equipos || [])) {
                await upsertEquipo(eq);
            }
            for (const cel of (importedData.celulares || [])) {
                await upsertCelular(cel);
            }
            for (const asig of (importedData.asignaciones || [])) {
                await upsertAsignacion(asig);
            }
            for (const asig of (importedData.asignacionesCelulares || [])) {
                await upsertAsignacionCelular(asig);
            }
            for (const lic of (importedData.licencias || [])) {
                await upsertLicencia(lic);
            }
            for (const la of (importedData.licenciasAsignaciones || [])) {
                await upsertLicenciaAsignacion(la);
            }

            showNotification('✅ Importación completa. Recargando...', 'success');
            setTimeout(() => location.reload(), 1500);

        } catch (error) {
            console.error('Error al importar:', error);
            showNotification(`❌ Error al importar: ${error.message}`, 'error');
        }
    };

    reader.readAsText(file, 'UTF-8');
    event.target.value = '';
}

// ================================
// UTILIDADES DE UI
// ================================

function showLoadingIndicator(show) {
    let loader = document.getElementById('globalLoader');
    if (!loader) {
        loader = document.createElement('div');
        loader.id = 'globalLoader';
        loader.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 4px;
            background: linear-gradient(90deg, #667eea, #764ba2, #667eea);
            background-size: 200% 100%;
            animation: loading 1.5s infinite;
            z-index: 9999; display: none;
        `;
        const style = document.createElement('style');
        style.textContent = '@keyframes loading { 0%{background-position:200% 0} 100%{background-position:-200% 0} }';
        document.head.appendChild(style);
        document.body.appendChild(loader);
    }
    loader.style.display = show ? 'block' : 'none';
}

function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    const notificationText = document.getElementById('notificationText');

    notification.className = `notification ${type} show`;
    notificationText.textContent = message;

    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Renderiza todas las secciones
function renderAll() {
    try { if (typeof updateDashboard === 'function') updateDashboard(); } catch(e) {}
    try { if (typeof updateDashboardTable === 'function') updateDashboardTable(); } catch(e) {}
    try { if (typeof renderColaboradores === 'function') renderColaboradores(); } catch(e) {}
    try { if (typeof renderEquipos === 'function') renderEquipos(); } catch(e) {}
    try { if (typeof renderCelulares === 'function') renderCelulares(); } catch(e) {}
    try { if (typeof renderAsignaciones === 'function') renderAsignaciones(); } catch(e) {}
    try { if (typeof renderLicencias === 'function') renderLicencias(); } catch(e) {}
}

// ================================
// NAVEGACIÓN Y MODALES
// ================================

function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById(sectionId).classList.add('active');

    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    if (sectionId === 'dashboard') {
        if (typeof updateDashboard === 'function') updateDashboard();
        if (typeof updateDashboardTable === 'function') updateDashboardTable();
    } else if (sectionId === 'reportes') {
        if (typeof updateReportesStats === 'function') updateReportesStats();
    }
}

function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');

    if (modalId === 'modalColaborador' && !document.getElementById('colaboradorId').value) {
        document.getElementById('formColaborador').reset();
        const preview = document.getElementById('colaboradorFotoPreview');
        if (preview) preview.innerHTML = '';
        document.getElementById('modalColaboradorTitle').textContent = 'Nuevo Colaborador';
    }
    if (modalId === 'modalEquipo' && !document.getElementById('equipoId').value) {
        document.getElementById('formEquipo').reset();
        const preview = document.getElementById('equipoFotosPreview');
        if (preview) preview.innerHTML = '';
        document.getElementById('modalEquipoTitle').textContent = 'Nuevo Equipo';
    }
    if (modalId === 'modalCelular' && !document.getElementById('celularId').value) {
        document.getElementById('formCelular').reset();
        const preview = document.getElementById('celularFotosPreview');
        if (preview) preview.innerHTML = '';
        document.getElementById('modalCelularTitle').textContent = 'Nuevo Celular';
    }
    if (modalId === 'modalAsignacion') {
        document.getElementById('formAsignacion').reset();
        if (typeof loadColaboradoresSelect === 'function') loadColaboradoresSelect();
        if (typeof loadEquiposSelect === 'function') loadEquiposSelect();
        const fechaInput = document.getElementById('asignacionFecha');
        if (fechaInput) fechaInput.valueAsDate = new Date();
    }
    if (modalId === 'modalLicencia' && !document.getElementById('licenciaId').value) {
        document.getElementById('formLicencia').reset();
        document.getElementById('modalLicenciaTitle').textContent = 'Nueva Licencia';
    }
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('active');
    }
}

// ================================
// INICIO
// ================================
// loadData() es llamado por auth.js después del login exitoso
