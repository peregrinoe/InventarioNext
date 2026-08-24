'use strict';

const express  = require('express');
const cors     = require('cors');
const bcrypt   = require('bcrypt');
const jwt      = require('jsonwebtoken');
const pool     = require('./db');
const { requireAuth, requireAdmin } = require('./middleware/auth');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middlewares ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));  // fotos en base64 pueden ser grandes

// CORS: en producción solo permite el dominio del frontend
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:8080', 'http://localhost:5500'];

app.use(cors({
    origin: (origin, cb) => {
        // Permite requests sin origin (ej. curl, Postman) en dev
        if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
        cb(new Error(`CORS bloqueado para origin: ${origin}`));
    },
    credentials: true,
}));

// ── Helpers ─────────────────────────────────────────────────────────────────
const signToken = (user) =>
    jwt.sign(
        { id: user.id, username: user.username, nombre: user.nombre, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

// ══════════════════════════════════════════════════════════════════════════════
// AUTH
// ══════════════════════════════════════════════════════════════════════════════

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password)
        return res.status(400).json({ message: 'Usuario y contraseña son requeridos' });

    try {
        const { rows } = await pool.query(
            'SELECT * FROM users WHERE username = $1 AND is_active = true LIMIT 1',
            [username.trim()]
        );
        const user = rows[0];

        if (!user) return res.status(401).json({ message: 'Usuario o contraseña incorrectos' });

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) return res.status(401).json({ message: 'Usuario o contraseña incorrectos' });

        const token = signToken(user);
        res.json({
            token,
            user: { id: user.id, username: user.username, nombre: user.nombre, role: user.role }
        });
    } catch (err) {
        console.error('Login error:', err.message);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// GET /api/auth/me — verifica el token y devuelve el usuario
app.get('/api/auth/me', requireAuth, (req, res) => {
    res.json({ user: req.user });
});

// ══════════════════════════════════════════════════════════════════════════════
// CARGA COMPLETA DE DATOS (equivalente a loadData en el cliente)
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/data — devuelve todas las tablas en una sola petición
app.get('/api/data', requireAuth, async (req, res) => {
    try {
        const [
            colaboradores, equipos, celulares,
            asignaciones, asignacionesCelulares,
            licencias, licenciasAsignaciones,
            solicitudesBaja, historialBajas,
            accesorios, asignacionesAccesorios
        ] = await Promise.all([
            pool.query('SELECT * FROM colaboradores ORDER BY nombre'),
            pool.query('SELECT * FROM equipos'),
            pool.query('SELECT * FROM celulares'),
            pool.query('SELECT * FROM asignaciones'),
            pool.query('SELECT * FROM asignaciones_celulares'),
            pool.query('SELECT * FROM licencias'),
            pool.query('SELECT * FROM licencias_asignaciones'),
            pool.query('SELECT * FROM solicitudes_baja ORDER BY fecha_solicitud DESC'),
            pool.query('SELECT * FROM historial_bajas ORDER BY created_at DESC'),
            pool.query('SELECT * FROM accesorios ORDER BY tipo, marca'),
            pool.query('SELECT * FROM asignaciones_accesorios'),
        ]);

        res.json({
            colaboradores:         colaboradores.rows,
            equipos:               equipos.rows,
            celulares:             celulares.rows,
            asignaciones:          asignaciones.rows,
            asignacionesCelulares: asignacionesCelulares.rows,
            licencias:             licencias.rows,
            licenciasAsignaciones: licenciasAsignaciones.rows,
            solicitudesBaja:       solicitudesBaja.rows,
            historialBajas:        historialBajas.rows,
            accesorios:            accesorios.rows,
            asignacionesAccesorios: asignacionesAccesorios.rows,
        });
    } catch (err) {
        console.error('GET /api/data error:', err.message);
        res.status(500).json({ message: 'Error al cargar datos' });
    }
});

// ══════════════════════════════════════════════════════════════════════════════
// COLABORADORES
// ══════════════════════════════════════════════════════════════════════════════

app.post('/api/colaboradores', requireAuth, async (req, res) => {
    const c = req.body;
    try {
        await pool.query(`
            INSERT INTO colaboradores
                (id, nombre, email, telefono, departamento, puesto, fecha_ingreso,
                 jefe_inmediato, es_externo, es_activo, foto, carta_estado, created_at)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
            ON CONFLICT (id) DO UPDATE SET
                nombre=$2, email=$3, telefono=$4, departamento=$5, puesto=$6,
                fecha_ingreso=$7, jefe_inmediato=$8, es_externo=$9, es_activo=$10,
                foto=$11, carta_estado=$12
        `, [
            c.id, c.nombre, c.email || null, c.telefono || null,
            c.departamento || null, c.puesto || null, c.fecha_ingreso || null,
            c.jefe_inmediato || null, c.es_externo || false,
            c.es_activo !== false, c.foto || null,
            c.carta_estado || 'pendiente',
            c.created_at || new Date().toISOString()
        ]);
        res.json({ ok: true });
    } catch (err) {
        console.error('POST /api/colaboradores:', err.message);
        res.status(500).json({ message: err.message });
    }
});

app.delete('/api/colaboradores/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        await pool.query('DELETE FROM colaboradores WHERE id = $1', [req.params.id]);
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ══════════════════════════════════════════════════════════════════════════════
// EQUIPOS
// ══════════════════════════════════════════════════════════════════════════════

app.post('/api/equipos', requireAuth, async (req, res) => {
    const e = req.body;
    try {
        await pool.query(`
            INSERT INTO equipos
                (id, tipo, marca, modelo, num_serie, nombre_equipo, id_interno, categoria,
                 propiedad, procesador, ram, almacenamiento, so, fecha_compra, proveedor,
                 precio, factura, garantia, ultimo_mantenimiento, frecuencia_mantenimiento,
                 condicion, ubicacion, estado, observaciones, fotos, owner, esquema,
                 cifrado_disco, antivirus_edr, nivel_acceso, created_at)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31)
            ON CONFLICT (id) DO UPDATE SET
                tipo=$2, marca=$3, modelo=$4, num_serie=$5, nombre_equipo=$6, id_interno=$7,
                categoria=$8, propiedad=$9, procesador=$10, ram=$11, almacenamiento=$12,
                so=$13, fecha_compra=$14, proveedor=$15, precio=$16, factura=$17,
                garantia=$18, ultimo_mantenimiento=$19, frecuencia_mantenimiento=$20,
                condicion=$21, ubicacion=$22, estado=$23, observaciones=$24, fotos=$25,
                owner=$26, esquema=$27, cifrado_disco=$28, antivirus_edr=$29, nivel_acceso=$30
        `, [
            e.id, e.tipo || null, e.marca, e.modelo,
            e.num_serie || null, e.nombre_equipo || null, e.id_interno || null,
            e.categoria || null, e.propiedad || null, e.procesador || null,
            e.ram || null, e.almacenamiento || null, e.so || null,
            e.fecha_compra || null, e.proveedor || null, e.precio || null,
            e.factura || null, e.garantia || null, e.ultimo_mantenimiento || null,
            e.frecuencia_mantenimiento || null, e.condicion || null,
            e.ubicacion || null, e.estado || 'Disponible',
            e.observaciones || null, e.fotos || null,
            e.owner || null, e.esquema || null, e.cifrado_disco || null,
            e.antivirus_edr || null, e.nivel_acceso || null,
            e.created_at || new Date().toISOString()
        ]);
        res.json({ ok: true });
    } catch (err) {
        console.error('POST /api/equipos:', err.message);
        res.status(500).json({ message: err.message });
    }
});

app.delete('/api/equipos/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        await pool.query('DELETE FROM equipos WHERE id = $1', [req.params.id]);
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ══════════════════════════════════════════════════════════════════════════════
// CELULARES
// ══════════════════════════════════════════════════════════════════════════════

app.post('/api/celulares', requireAuth, async (req, res) => {
    const c = req.body;
    try {
        await pool.query(`
            INSERT INTO celulares
                (id, marca, modelo, imei, numero, compania, num_serie, propiedad,
                 almacenamiento, color, so, plan, costo_plan, renovacion_plan,
                 estado, condicion, precio, fecha_compra, proveedor, factura,
                 garantia_meses, fotos, observaciones, created_at)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
            ON CONFLICT (id) DO UPDATE SET
                marca=$2, modelo=$3, imei=$4, numero=$5, compania=$6, num_serie=$7,
                propiedad=$8, almacenamiento=$9, color=$10, so=$11, plan=$12,
                costo_plan=$13, renovacion_plan=$14, estado=$15, condicion=$16,
                precio=$17, fecha_compra=$18, proveedor=$19, factura=$20,
                garantia_meses=$21, fotos=$22, observaciones=$23
        `, [
            c.id, c.marca, c.modelo, c.imei || null, c.numero || null,
            c.compania || null, c.num_serie || null, c.propiedad || 'Empresa',
            c.almacenamiento || null, c.color || null, c.so || null,
            c.plan || null, c.costo_plan || null, c.renovacion_plan || null,
            c.estado, c.condicion || null, c.precio || null,
            c.fecha_compra || null, c.proveedor || null, c.factura || null,
            c.garantia_meses || null, c.fotos || null, c.observaciones || null,
            c.created_at || new Date().toISOString()
        ]);
        res.json({ ok: true });
    } catch (err) {
        console.error('POST /api/celulares:', err.message);
        res.status(500).json({ message: err.message });
    }
});

app.delete('/api/celulares/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        await pool.query('DELETE FROM celulares WHERE id = $1', [req.params.id]);
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ══════════════════════════════════════════════════════════════════════════════
// ASIGNACIONES (EQUIPOS)
// ══════════════════════════════════════════════════════════════════════════════

app.post('/api/asignaciones', requireAuth, async (req, res) => {
    const a = req.body;
    try {
        await pool.query(`
            INSERT INTO asignaciones
                (id, colaborador_id, equipo_id, fecha_asignacion, fecha_devolucion,
                 estado, notas, es_temporal, fecha_fin_temporal)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
            ON CONFLICT (id) DO UPDATE SET
                colaborador_id=$2, equipo_id=$3, fecha_asignacion=$4,
                fecha_devolucion=$5, estado=$6, notas=$7,
                es_temporal=$8, fecha_fin_temporal=$9
        `, [
            a.id, a.colaborador_id, a.equipo_id, a.fecha_asignacion,
            a.fecha_devolucion || null, a.estado, a.notas || null,
            a.es_temporal || false, a.fecha_fin_temporal || null
        ]);
        res.json({ ok: true });
    } catch (err) {
        console.error('POST /api/asignaciones:', err.message);
        res.status(500).json({ message: err.message });
    }
});

app.delete('/api/asignaciones/:id', requireAuth, async (req, res) => {
    try {
        await pool.query('DELETE FROM asignaciones WHERE id = $1', [req.params.id]);
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ══════════════════════════════════════════════════════════════════════════════
// ASIGNACIONES CELULARES
// ══════════════════════════════════════════════════════════════════════════════

app.post('/api/asignaciones-celulares', requireAuth, async (req, res) => {
    const a = req.body;
    try {
        await pool.query(`
            INSERT INTO asignaciones_celulares
                (id, colaborador_id, celular_id, fecha_asignacion, fecha_devolucion,
                 estado, notas, es_temporal, fecha_fin_temporal)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
            ON CONFLICT (id) DO UPDATE SET
                colaborador_id=$2, celular_id=$3, fecha_asignacion=$4,
                fecha_devolucion=$5, estado=$6, notas=$7,
                es_temporal=$8, fecha_fin_temporal=$9
        `, [
            a.id, a.colaborador_id, a.celular_id, a.fecha_asignacion,
            a.fecha_devolucion || null, a.estado, a.notas || null,
            a.es_temporal || false, a.fecha_fin_temporal || null
        ]);
        res.json({ ok: true });
    } catch (err) {
        console.error('POST /api/asignaciones-celulares:', err.message);
        res.status(500).json({ message: err.message });
    }
});

app.delete('/api/asignaciones-celulares/:id', requireAuth, async (req, res) => {
    try {
        await pool.query('DELETE FROM asignaciones_celulares WHERE id = $1', [req.params.id]);
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ══════════════════════════════════════════════════════════════════════════════
// LICENCIAS
// ══════════════════════════════════════════════════════════════════════════════

app.post('/api/licencias', requireAuth, async (req, res) => {
    const l = req.body;
    try {
        await pool.query(`
            INSERT INTO licencias
                (id, software, tipo, clave, fecha_compra, fecha_vencimiento, estado, notas, created_at)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
            ON CONFLICT (id) DO UPDATE SET
                software=$2, tipo=$3, clave=$4, fecha_compra=$5,
                fecha_vencimiento=$6, estado=$7, notas=$8
        `, [
            l.id, l.software, l.tipo, l.clave || null,
            l.fecha_compra || null, l.fecha_vencimiento || null,
            l.estado, l.notas || null,
            l.created_at || new Date().toISOString()
        ]);
        res.json({ ok: true });
    } catch (err) {
        console.error('POST /api/licencias:', err.message);
        res.status(500).json({ message: err.message });
    }
});

app.delete('/api/licencias/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        await pool.query('DELETE FROM licencias WHERE id = $1', [req.params.id]);
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ══════════════════════════════════════════════════════════════════════════════
// LICENCIAS ASIGNACIONES
// ══════════════════════════════════════════════════════════════════════════════

app.post('/api/licencias-asignaciones', requireAuth, async (req, res) => {
    const la = req.body;
    try {
        await pool.query(`
            INSERT INTO licencias_asignaciones
                (id, licencia_id, colaborador_id, fecha_asignacion)
            VALUES ($1,$2,$3,$4)
            ON CONFLICT (id) DO UPDATE SET
                licencia_id=$2, colaborador_id=$3, fecha_asignacion=$4
        `, [la.id, la.licencia_id, la.colaborador_id, la.fecha_asignacion]);
        res.json({ ok: true });
    } catch (err) {
        console.error('POST /api/licencias-asignaciones:', err.message);
        res.status(500).json({ message: err.message });
    }
});

app.delete('/api/licencias-asignaciones/by-licencia/:licenciaId', requireAuth, async (req, res) => {
    try {
        await pool.query(
            'DELETE FROM licencias_asignaciones WHERE licencia_id = $1',
            [req.params.licenciaId]
        );
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.delete('/api/licencias-asignaciones/:id', requireAuth, async (req, res) => {
    try {
        await pool.query('DELETE FROM licencias_asignaciones WHERE id = $1', [req.params.id]);
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ══════════════════════════════════════════════════════════════════════════════
// SOLICITUDES DE BAJA
// ══════════════════════════════════════════════════════════════════════════════

app.post('/api/solicitudes-baja', requireAuth, async (req, res) => {
    const s = req.body;
    try {
        await pool.query(`
            INSERT INTO solicitudes_baja
                (id, colaborador_id, motivo, fecha, estado, solicitado_por,
                 rol_solicitante, fecha_solicitud, fecha_resolucion,
                 resuelto_por, notas_resolucion)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
            ON CONFLICT (id) DO UPDATE SET
                colaborador_id=$2, motivo=$3, fecha=$4, estado=$5,
                solicitado_por=$6, rol_solicitante=$7, fecha_solicitud=$8,
                fecha_resolucion=$9, resuelto_por=$10, notas_resolucion=$11
        `, [
            s.id, s.colaborador_id, s.motivo, s.fecha || null,
            s.estado || 'pendiente', s.solicitado_por || null,
            s.rol_solicitante || null, s.fecha_solicitud || new Date().toISOString(),
            s.fecha_resolucion || null, s.resuelto_por || null,
            s.notas_resolucion || null
        ]);
        res.json({ ok: true });
    } catch (err) {
        console.error('POST /api/solicitudes-baja:', err.message);
        res.status(500).json({ message: err.message });
    }
});

// ══════════════════════════════════════════════════════════════════════════════
// HISTORIAL DE BAJAS
// ══════════════════════════════════════════════════════════════════════════════

app.post('/api/historial-bajas', requireAuth, requireAdmin, async (req, res) => {
    const h = req.body;
    try {
        await pool.query(`
            INSERT INTO historial_bajas
                (id, colaborador_id, fecha_baja, motivo, receptor_id,
                 procesado_por, activos_reasignados, created_at)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
            ON CONFLICT (id) DO NOTHING
        `, [
            h.id, h.colaborador_id, h.fecha_baja || null,
            h.motivo || null, h.receptor_id || null,
            h.procesado_por || null,
            h.activos_reasignados !== undefined ? h.activos_reasignados : 0,
            h.created_at || new Date().toISOString()
        ]);
        res.json({ ok: true });
    } catch (err) {
        console.error('POST /api/historial-bajas:', err.message);
        res.status(500).json({ message: err.message });
    }
});

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// ── Error handler global ─────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
    console.error('Unhandled error:', err.message);
    res.status(500).json({ message: 'Error interno del servidor' });
});

// ══════════════════════════════════════════════════════════════════════════════
// ACCESORIOS
// ══════════════════════════════════════════════════════════════════════════════

app.post('/api/accesorios', requireAuth, async (req, res) => {
    const a = req.body;
    try {
        await pool.query(`
            INSERT INTO accesorios
                (id, tipo, marca, modelo, num_serie, id_interno, propiedad, condicion, estado, observaciones, created_at)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
            ON CONFLICT (id) DO UPDATE SET
                tipo=$2, marca=$3, modelo=$4, num_serie=$5, id_interno=$6,
                propiedad=$7, condicion=$8, estado=$9, observaciones=$10
        `, [
            a.id, a.tipo, a.marca, a.modelo || null, a.num_serie || null,
            a.id_interno || null, a.propiedad || 'Empresa', a.condicion || null,
            a.estado || 'Disponible', a.observaciones || null,
            a.created_at || new Date().toISOString()
        ]);
        res.json({ ok: true });
    } catch (err) {
        console.error('POST /api/accesorios:', err.message);
        res.status(500).json({ message: err.message });
    }
});

app.delete('/api/accesorios/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        await pool.query('DELETE FROM accesorios WHERE id = $1', [req.params.id]);
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ══════════════════════════════════════════════════════════════════════════════
// ASIGNACIONES ACCESORIOS
// ══════════════════════════════════════════════════════════════════════════════

app.post('/api/asignaciones-accesorios', requireAuth, async (req, res) => {
    const a = req.body;
    try {
        await pool.query(`
            INSERT INTO asignaciones_accesorios
                (id, colaborador_id, accesorio_id, fecha_asignacion, fecha_devolucion, estado, notas)
            VALUES ($1,$2,$3,$4,$5,$6,$7)
            ON CONFLICT (id) DO UPDATE SET
                colaborador_id=$2, accesorio_id=$3, fecha_asignacion=$4,
                fecha_devolucion=$5, estado=$6, notas=$7
        `, [
            a.id, a.colaborador_id, a.accesorio_id, a.fecha_asignacion,
            a.fecha_devolucion || null, a.estado, a.notas || null
        ]);
        res.json({ ok: true });
    } catch (err) {
        console.error('POST /api/asignaciones-accesorios:', err.message);
        res.status(500).json({ message: err.message });
    }
});

app.delete('/api/asignaciones-accesorios/:id', requireAuth, async (req, res) => {
    try {
        await pool.query('DELETE FROM asignaciones_accesorios WHERE id = $1', [req.params.id]);
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`✅ API escuchando en puerto ${PORT} [${process.env.NODE_ENV || 'development'}]`);
});
