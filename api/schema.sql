-- ═══════════════════════════════════════════════════════════════════════════
-- SCHEMA — InventarioNext — Cloud SQL (PostgreSQL 15+)
-- Ejecuta este archivo UNA SOLA VEZ después de crear la instancia de Cloud SQL
-- ═══════════════════════════════════════════════════════════════════════════

-- Extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Tabla de usuarios del sistema ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    username      TEXT NOT NULL UNIQUE,
    email         TEXT,
    nombre        TEXT NOT NULL,
    role          TEXT NOT NULL CHECK (role IN ('superadmin', 'operador')),
    password_hash TEXT NOT NULL,
    is_active     BOOLEAN NOT NULL DEFAULT true,
    created_at    TIMESTAMPTZ DEFAULT now()
);

-- ── Colaboradores ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS colaboradores (
    id              TEXT PRIMARY KEY,
    nombre          TEXT NOT NULL,
    email           TEXT,
    telefono        TEXT,
    departamento    TEXT,
    puesto          TEXT,
    fecha_ingreso   DATE,
    jefe_inmediato  TEXT,
    es_externo      BOOLEAN DEFAULT false,
    es_activo       BOOLEAN DEFAULT true,
    foto            TEXT,             -- Base64 o URL
    carta_estado    TEXT DEFAULT 'pendiente',
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- ── Equipos de cómputo ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS equipos (
    id                       TEXT PRIMARY KEY,
    tipo                     TEXT,
    marca                    TEXT NOT NULL,
    modelo                   TEXT NOT NULL,
    num_serie                TEXT,
    nombre_equipo            TEXT,
    id_interno               TEXT,
    categoria                TEXT,
    propiedad                TEXT,
    procesador               TEXT,
    ram                      TEXT,
    almacenamiento           TEXT,
    so                       TEXT,
    fecha_compra             DATE,
    proveedor                TEXT,
    precio                   NUMERIC(12,2),
    factura                  TEXT,
    garantia                 INTEGER,          -- meses
    ultimo_mantenimiento     DATE,
    frecuencia_mantenimiento INTEGER,          -- meses
    condicion                TEXT,
    ubicacion                TEXT,
    estado                   TEXT DEFAULT 'Disponible',
    observaciones            TEXT,
    fotos                    TEXT,             -- JSON array de Base64
    owner                    TEXT,             -- Área o responsable del equipo
    esquema                  TEXT,             -- Oficina | Home Office | Híbrido
    cifrado_disco            TEXT,             -- BitLocker: Sí | No
    antivirus_edr            TEXT,             -- Kaspersky: Sí | No
    nivel_acceso             TEXT,             -- Datos sensibles | Uso general
    created_at               TIMESTAMPTZ DEFAULT now()
);

-- Migración para instancias existentes (agrega columnas si faltan)
ALTER TABLE equipos ADD COLUMN IF NOT EXISTS owner         TEXT;
ALTER TABLE equipos ADD COLUMN IF NOT EXISTS esquema       TEXT;
ALTER TABLE equipos ADD COLUMN IF NOT EXISTS cifrado_disco TEXT;
ALTER TABLE equipos ADD COLUMN IF NOT EXISTS antivirus_edr TEXT;
ALTER TABLE equipos ADD COLUMN IF NOT EXISTS nivel_acceso  TEXT;

-- ── Celulares ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS celulares (
    id               TEXT PRIMARY KEY,
    marca            TEXT NOT NULL,
    modelo           TEXT NOT NULL,
    imei             TEXT,
    numero           TEXT,
    compania         TEXT,
    num_serie        TEXT,
    propiedad        TEXT DEFAULT 'Empresa',
    almacenamiento   TEXT,
    color            TEXT,
    so               TEXT,
    plan             TEXT,
    costo_plan       NUMERIC(10,2),
    renovacion_plan  DATE,
    estado           TEXT DEFAULT 'Disponible',
    condicion        TEXT,
    precio           NUMERIC(12,2),
    fecha_compra     DATE,
    proveedor        TEXT,
    factura          TEXT,
    garantia_meses   INTEGER,
    fotos            TEXT,             -- JSON array de Base64
    observaciones    TEXT,
    created_at       TIMESTAMPTZ DEFAULT now()
);

-- ── Asignaciones de equipos ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS asignaciones (
    id                  TEXT PRIMARY KEY,
    colaborador_id      TEXT REFERENCES colaboradores(id) ON DELETE CASCADE,
    equipo_id           TEXT REFERENCES equipos(id) ON DELETE CASCADE,
    fecha_asignacion    DATE NOT NULL,
    fecha_devolucion    DATE,
    estado              TEXT DEFAULT 'Activa',
    notas               TEXT,
    es_temporal         BOOLEAN DEFAULT false,
    fecha_fin_temporal  DATE
);

-- ── Accesorios ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS accesorios (
    id            TEXT PRIMARY KEY,
    tipo          TEXT NOT NULL,
    marca         TEXT NOT NULL,
    modelo        TEXT,
    num_serie     TEXT,
    id_interno    TEXT,
    propiedad     TEXT DEFAULT 'Empresa',
    condicion     TEXT,
    estado        TEXT DEFAULT 'Disponible',
    observaciones TEXT,
    created_at    TIMESTAMPTZ DEFAULT now()
);

-- ── Asignaciones de accesorios ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS asignaciones_accesorios (
    id               TEXT PRIMARY KEY,
    colaborador_id   TEXT REFERENCES colaboradores(id) ON DELETE CASCADE,
    accesorio_id     TEXT REFERENCES accesorios(id) ON DELETE CASCADE,
    fecha_asignacion DATE NOT NULL,
    fecha_devolucion DATE,
    estado           TEXT DEFAULT 'Activa',
    notas            TEXT
);

CREATE TABLE IF NOT EXISTS asignaciones_celulares (
    id                  TEXT PRIMARY KEY,
    colaborador_id      TEXT REFERENCES colaboradores(id) ON DELETE CASCADE,
    celular_id          TEXT REFERENCES celulares(id) ON DELETE CASCADE,
    fecha_asignacion    DATE NOT NULL,
    fecha_devolucion    DATE,
    estado              TEXT DEFAULT 'Activa',
    notas               TEXT,
    es_temporal         BOOLEAN DEFAULT false,
    fecha_fin_temporal  DATE
);

-- ── Licencias de software ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS licencias (
    id                TEXT PRIMARY KEY,
    software          TEXT NOT NULL,
    tipo              TEXT,
    clave             TEXT,
    fecha_compra      DATE,
    fecha_vencimiento DATE,
    estado            TEXT DEFAULT 'Activa',
    notas             TEXT,
    created_at        TIMESTAMPTZ DEFAULT now()
);

-- ── Licencias asignadas a colaboradores ───────────────────────────────────
CREATE TABLE IF NOT EXISTS licencias_asignaciones (
    id                TEXT PRIMARY KEY,
    licencia_id       TEXT REFERENCES licencias(id) ON DELETE CASCADE,
    colaborador_id    TEXT REFERENCES colaboradores(id) ON DELETE CASCADE,
    fecha_asignacion  DATE NOT NULL
);

-- ── Solicitudes de baja ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS solicitudes_baja (
    id               TEXT PRIMARY KEY,
    colaborador_id   TEXT REFERENCES colaboradores(id) ON DELETE CASCADE,
    motivo           TEXT,
    fecha            DATE,
    estado           TEXT DEFAULT 'pendiente',   -- pendiente | aprobada | rechazada
    solicitado_por   TEXT,
    rol_solicitante  TEXT,
    fecha_solicitud  TIMESTAMPTZ DEFAULT now(),
    fecha_resolucion TIMESTAMPTZ,
    resuelto_por     TEXT,
    notas_resolucion TEXT
);

-- ── Historial de bajas aprobadas ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS historial_bajas (
    id                  TEXT PRIMARY KEY,
    colaborador_id      TEXT,                    -- puede haber sido eliminado
    fecha_baja          DATE,
    motivo              TEXT,
    receptor_id         TEXT,                    -- colaborador que recibió activos
    procesado_por       TEXT,
    activos_reasignados INTEGER DEFAULT 0,
    created_at          TIMESTAMPTZ DEFAULT now()
);

-- ── Índices para consultas frecuentes ─────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_asignaciones_colaborador  ON asignaciones(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_asignaciones_equipo       ON asignaciones(equipo_id);
CREATE INDEX IF NOT EXISTS idx_asig_cel_colaborador      ON asignaciones_celulares(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_lic_asig_licencia         ON licencias_asignaciones(licencia_id);
CREATE INDEX IF NOT EXISTS idx_lic_asig_colaborador      ON licencias_asignaciones(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_solicitudes_estado        ON solicitudes_baja(estado);

-- ═══════════════════════════════════════════════════════════════════════════
-- USUARIO INICIAL — Superadmin
-- Genera el hash con: node -e "require('bcrypt').hash('TU_PASSWORD',12).then(console.log)"
-- Reemplaza el hash antes de ejecutar este INSERT
-- ═══════════════════════════════════════════════════════════════════════════
-- INSERT INTO users (username, nombre, email, role, password_hash)
-- VALUES ('admin', 'Administrador', 'admin@empresa.com', 'superadmin',
--         '$2b$12$HASH_GENERADO_AQUI');
