// ================================
// BACKUP DE SUPABASE → JSON
// ================================
// Uso: node backup_supabase.js
// Requiere: Node.js 18+ (fetch nativo, sin dependencias)
// Resultado: backup_YYYYMMDD.json en la raíz del proyecto
// ================================

const SUPABASE_URL = 'https://chxfhirgehvvykordrnd.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Vd4i7BPDyhXpe4W191xQdQ_icot6e-V';

const TABLAS = [
    'colaboradores',
    'equipos',
    'celulares',
    'asignaciones',
    'asignaciones_celulares',
    'licencias',
    'licencias_asignaciones',
    'solicitudes_baja',
    'historial_bajas',
    'profiles',
];

async function fetchTabla(tabla) {
    // Supabase REST API: GET /rest/v1/{tabla}?select=*
    // Agrega ?limit=10000 para evitar paginación en tablas grandes
    const url = `${SUPABASE_URL}/rest/v1/${tabla}?select=*&limit=10000`;
    const res = await fetch(url, {
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
        }
    });

    if (!res.ok) {
        const txt = await res.text();
        console.warn(`  ⚠️  ${tabla}: HTTP ${res.status} — ${txt.slice(0, 120)}`);
        return [];
    }

    return res.json();
}

async function main() {
    console.log('🔄 Descargando datos desde Supabase...\n');

    const backup = {
        _meta: {
            fechaBackup: new Date().toISOString(),
            supabaseUrl: SUPABASE_URL,
            tablas: {}
        }
    };

    for (const tabla of TABLAS) {
        process.stdout.write(`  → ${tabla.padEnd(30)}`);
        try {
            const rows = await fetchTabla(tabla);
            backup[tabla] = rows;
            backup._meta.tablas[tabla] = rows.length;
            console.log(`${rows.length} registros`);
        } catch (err) {
            console.log(`ERROR: ${err.message}`);
            backup[tabla] = [];
        }
    }

    const fecha = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const archivo = `backup_supabase_${fecha}.json`;

    const fs = require('fs');
    fs.writeFileSync(archivo, JSON.stringify(backup, null, 2), 'utf8');

    console.log(`\n✅ Backup guardado en: ${archivo}`);
    console.log(`   Tamaño: ${(fs.statSync(archivo).size / 1024).toFixed(1)} KB`);
}

main().catch(err => {
    console.error('❌ Error fatal:', err.message);
    process.exit(1);
});
