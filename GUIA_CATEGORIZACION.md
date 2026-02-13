# 📋 Guía de Categorización de Equipos

## Sistema de Categorías

El sistema utiliza 3 categorías basadas en las especificaciones técnicas del equipo, especialmente orientadas a la asignación de recursos según el tipo de trabajo a realizar.

---

## ⭐ Categoría 1 - Básico

### Uso Principal
- Tareas administrativas básicas
- Navegación web simple
- Correo electrónico
- Documentos de Office básicos
- Captura de datos

### Especificaciones Típicas
**Procesadores:**
- Intel Celeron (cualquier generación)
- Intel Pentium (cualquier generación)
- Intel Core i3 (cualquier generación)
- AMD Ryzen 3 (cualquier generación)
- AMD Athlon

**RAM:**
- 4GB - 8GB

**Casos de Uso:**
- Personal administrativo
- Recepción
- Captura de datos
- Lectura de correos y documentos

---

## ⭐⭐ Categoría 2 - Intermedio

### Uso Principal
- Multitarea moderada
- Navegación intensiva
- Hojas de cálculo complejas
- Videoconferencias
- Diseño gráfico ligero
- Análisis de datos básico

### Especificaciones Típicas
**Procesadores:**
- Intel Core i5 (Generaciones 6, 7, 8, 9, 10)
- AMD Ryzen 5 (Generaciones 1000, 2000, 3000, 4000)

**RAM:**
- 8GB - 16GB

**Casos de Uso:**
- Analistas
- Coordinadores
- Consultores
- Ventas
- Contabilidad

---

## ⭐⭐⭐ Categoría 3 - Alto Rendimiento

### Uso Principal
- **Desarrollo de software**
- Diseño gráfico profesional
- Edición de video
- Modelado 3D
- Ingeniería
- Virtualización
- Compilación de código
- IDEs pesados

### Especificaciones Típicas
**Procesadores:**
- Intel Core i5 (Generaciones 11, 12, 13, 14)
- Intel Core i7 (cualquier generación)
- AMD Ryzen 5 (Generaciones 5000, 6000, 7000)
- AMD Ryzen 7 (cualquier generación)

**RAM:**
- 16GB o más

**Casos de Uso:**
- **Desarrolladores** ⚡
- Diseñadores gráficos
- Editores de video
- Ingenieros de software
- Arquitectos de sistemas
- Data Scientists

---

## 💡 Sugerencia Automática de Categoría

El sistema incluye un botón **"💡 Sugerir Categoría según Specs"** que analiza automáticamente:

1. **Procesador ingresado** - Detecta el modelo y generación
2. **RAM ingresada** - Evalúa la cantidad de memoria
3. **Combinación** - Determina la categoría óptima

### Ejemplos de Análisis Automático

| Procesador | RAM | Categoría Sugerida |
|------------|-----|-------------------|
| Intel Core i3-10100 | 8GB | Categoría 1 - Básico |
| Intel Core i5-9400 | 8GB | Categoría 2 - Intermedio |
| Intel Core i5-12400 | 16GB | Categoría 3 - Alto Rendimiento |
| Intel Core i7-8700 | 16GB | Categoría 3 - Alto Rendimiento |
| AMD Ryzen 5 3600 | 8GB | Categoría 2 - Intermedio |
| AMD Ryzen 5 5600 | 16GB | Categoría 3 - Alto Rendimiento |
| AMD Ryzen 7 5800X | 32GB | Categoría 3 - Alto Rendimiento |

---

## 🎯 Criterios de Asignación

### Para Desarrolladores
Los desarrolladores **siempre** deben recibir equipos de **Categoría 3** debido a:
- Uso de IDEs pesados (Visual Studio, IntelliJ, Eclipse)
- Compilación de código
- Contenedores y virtualización (Docker, VMs)
- Múltiples herramientas ejecutándose simultáneamente
- Bases de datos locales
- Servidores de desarrollo

### Recomendación Mínima para Desarrollo
- **Procesador:** Intel i7 (cualquier gen) o Ryzen 5/7 (gen 5000+) o i5 gen 11+
- **RAM:** 16GB mínimo (recomendado 32GB)
- **Almacenamiento:** SSD de 512GB o más

---

## 🏢 Propiedad del Equipo

Además de la categoría, cada equipo tiene una bandera de propiedad:

- **🏢 Empresa** - Equipos propiedad de la empresa
- **👤 Propio** - Equipos personales del colaborador

Esta clasificación ayuda a:
- Identificar qué equipos son activos de la empresa
- Gestionar mantenimientos y reemplazos
- Control de inventario
- Políticas de uso y responsabilidades

---

## 📊 Filtros Disponibles

El sistema permite filtrar equipos por:
1. **Estado** (Disponible, Asignado, En Reparación, Dado de Baja)
2. **Categoría** (1, 2, 3)
3. **Propiedad** (Empresa, Propio)
4. **Búsqueda por texto** (marca, modelo, serie, etc.)

Todos los filtros funcionan de manera combinada para búsquedas precisas.

---

## 📝 Notas Importantes

- La categoría es **obligatoria** al registrar un equipo
- Se puede usar el botón de sugerencia automática después de ingresar procesador y RAM
- La categoría puede ajustarse manualmente si se considera necesario
- Para equipos existentes sin categoría, se asigna Categoría 2 por defecto
- La categorización ayuda a asignar el equipo correcto a cada colaborador según sus necesidades

---

**Versión:** 2.0  
**Fecha:** Febrero 2026
