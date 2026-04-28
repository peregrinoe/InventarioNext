# 📁 Sistema de Inventario - Estructura Modular

## 🎯 Descripción
El JavaScript ha sido dividido en módulos especializados para mejor organización, mantenibilidad y rendimiento.

## 📂 Estructura de Archivos

```
/
├── index.html              # Página principal HTML
├── main.css               # Estilos CSS
├── script.js              # Archivo monolítico original (LEGACY - mantener como backup)
└── js/                    # Módulos JavaScript (NUEVA ESTRUCTURA)
    ├── database.js        # Base de datos y funciones core (5.7 KB)
    ├── images.js          # Manejo de imágenes y previews (8.6 KB)
    ├── colaboradores.js   # Gestión de colaboradores (16 KB)
    ├── equipos.js         # Gestión de equipos de cómputo (38 KB)
    ├── celulares.js       # Gestión de celulares (27 KB)
    ├── asignaciones.js    # Sistema de asignaciones (20 KB)
    ├── licencias.js       # Gestión de licencias (15 KB)
    ├── dashboard.js       # Dashboard y estadísticas (5.7 KB)
    └── reportes.js        # Generación de reportes Excel (22 KB)
```

## 📋 Descripción de Módulos

### 🗄️ **database.js** (Core)
- Base de datos simulada en localStorage
- Funciones de carga/guardado de datos
- Importar/Exportar JSON
- Navegación entre secciones
- Gestión de modales
- Sistema de notificaciones

**Funciones principales:**
- `loadData()` - Carga datos del localStorage
- `saveData()` - Guarda datos en localStorage
- `exportarDatos()` - Exporta JSON
- `importarDatos()` - Importa JSON
- `showSection()` - Navegación
- `openModal()` / `closeModal()` - Gestión de modales
- `showNotification()` - Notificaciones

---

### 🖼️ **images.js**
- Preview de imágenes (single y multiple)
- Conversión a Base64
- Gestión de galerías de fotos
- Eliminación de fotos individuales
- Función de ampliar fotos

**Funciones principales:**
- `previewImage()` - Preview colaboradores
- `previewMultipleImages()` - Preview equipos (múltiples)
- `previewMultipleCelularImages()` - Preview celulares (múltiples)
- `borrarFotoIndividual()` - Eliminar foto equipo
- `borrarFotoCelularIndividual()` - Eliminar foto celular
- `ampliarFoto()` - Modal de ampliación

---

### 👥 **colaboradores.js**
- CRUD completo de colaboradores
- Vista de detalle con historial
- Búsqueda y filtros
- Gestión de foto de perfil

**Funciones principales:**
- `saveColaborador()` - Crear/Actualizar
- `renderColaboradores()` - Mostrar tabla
- `verDetalleColaborador()` - Vista detallada
- `editColaborador()` - Editar
- `deleteColaborador()` - Eliminar
- `filterColaboradores()` - Búsqueda

---

### 💻 **equipos.js**
- CRUD completo de equipos de cómputo
- Sistema de categorías (1, 2, 3)
- Sugerencia automática de categoría
- Gestión de garantías y mantenimiento
- Historial de asignaciones por equipo
- Vista detallada con galería

**Funciones principales:**
- `saveEquipo()` - Crear/Actualizar
- `renderEquipos()` - Mostrar tabla
- `verDetalleEquipo()` - Vista detallada
- `editEquipo()` - Editar
- `deleteEquipo()` - Eliminar
- `filterEquipos()` - Filtros avanzados
- `sugerirCategoria()` - Sugerencia de categoría
- `updateCategoriaHelp()` - Ayuda de categorías

---

### 📱 **celulares.js**
- CRUD completo de celulares
- Gestión de planes y compañías
- Información de IMEI y número
- Historial de asignaciones
- Vista detallada con galería

**Funciones principales:**
- `saveCelular()` - Crear/Actualizar
- `renderCelulares()` - Mostrar tabla
- `verDetalleCelular()` - Vista detallada
- `editCelular()` - Editar
- `deleteCelular()` - Eliminar
- `filterCelulares()` - Filtros avanzados

---

### 🔗 **asignaciones.js**
- Asignación de equipos a colaboradores
- Control de devoluciones
- Historial de asignaciones
- Estados (Activa/Devuelto)

**Funciones principales:**
- `saveAsignacion()` - Nueva asignación
- `renderAsignaciones()` - Mostrar tabla
- `loadColaboradoresSelect()` - Cargar select colaboradores
- `loadEquiposSelect()` - Cargar select equipos
- `devolverEquipo()` - Marcar como devuelto

---

### 🔑 **licencias.js**
- CRUD de licencias de software
- Asignación múltiple a usuarios
- Gestión de vencimientos
- Vista detallada con usuarios asignados

**Funciones principales:**
- `saveLicencia()` - Crear/Actualizar
- `renderLicencias()` - Mostrar tabla
- `verDetalleLicencia()` - Vista detallada
- `abrirAsignarUsuarios()` - Modal de asignación
- `guardarAsignacionesLicencia()` - Guardar asignaciones
- `filterLicencias()` - Búsqueda

---

### 📊 **dashboard.js**
- Estadísticas generales del sistema
- Contadores de recursos
- Tabla de asignaciones recientes
- Actualización automática

**Funciones principales:**
- `updateDashboard()` - Actualizar estadísticas
- `updateDashboardTable()` - Tabla de recientes

---

### 📈 **reportes.js**
- Generación de reportes en Excel
- Múltiples tipos de reportes
- Librería SheetJS (xlsx)
- Exportación de datos

**Reportes disponibles:**
- Inventario completo
- Colaboradores
- Equipos por estado
- Calendario de mantenimientos
- Mantenimientos vencidos
- Garantías
- Historial de compras
- Valor de activos
- Distribución por categoría

**Funciones principales:**
- `generarReporteInventarioCompleto()`
- `generarReporteColaboradores()`
- `generarReporteEquiposPorEstado()`
- `generarCalendarioMantenimientos()`
- `generarReporteMantenimientoVencido()`
- `generarReporteGarantias()`
- `generarReporteCompras()`
- `generarReporteValorActivos()`
- `generarReportePorCategoria()`

---

## 🔄 Orden de Carga

Los módulos deben cargarse en el siguiente orden (ya configurado en `index.html`):

1. **database.js** - Core y base de datos
2. **images.js** - Utilidades de imágenes
3. **colaboradores.js** - Gestión de colaboradores
4. **equipos.js** - Gestión de equipos
5. **celulares.js** - Gestión de celulares
6. **asignaciones.js** - Sistema de asignaciones
7. **licencias.js** - Gestión de licencias
8. **dashboard.js** - Dashboard y estadísticas
9. **reportes.js** - Generación de reportes

## 📦 Tamaño Total

- **Antes (script.js monolítico):** ~134 KB
- **Después (9 módulos):** ~158 KB total
  - database.js: 5.7 KB
  - images.js: 8.6 KB
  - colaboradores.js: 16 KB
  - equipos.js: 38 KB
  - celulares.js: 27 KB
  - asignaciones.js: 20 KB
  - licencias.js: 15 KB
  - dashboard.js: 5.7 KB
  - reportes.js: 22 KB

## ✅ Ventajas de la Estructura Modular

1. **📖 Mejor legibilidad:** Cada módulo tiene una responsabilidad específica
2. **🔧 Fácil mantenimiento:** Cambios localizados en archivos pequeños
3. **🚀 Desarrollo paralelo:** Varios desarrolladores pueden trabajar simultáneamente
4. **🐛 Debug más sencillo:** Errores fáciles de ubicar por módulo
5. **♻️ Reutilización:** Módulos pueden reutilizarse en otros proyectos
6. **📚 Documentación:** Cada módulo puede tener su propia documentación
7. **⚡ Carga selectiva:** Posibilidad de cargar módulos bajo demanda en el futuro

## 🔮 Futuras Mejoras

- Implementar ES6 modules (import/export)
- Agregar TypeScript para type safety
- Implementar lazy loading de módulos
- Crear módulo de validaciones
- Módulo de utilidades compartidas
- Sistema de plugins

## 📝 Notas

- El archivo `script.js` original se mantiene como **backup/legacy**
- Todos los módulos comparten el objeto global `database`
- Las funciones son globales para compatibilidad con onclick en HTML
- Sistema compatible con todos los navegadores modernos

---

**Última actualización:** Febrero 2026
**Versión:** 2.0 - Arquitectura Modular
