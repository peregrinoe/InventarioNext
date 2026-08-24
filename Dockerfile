# ── Frontend: nginx sirviendo archivos estáticos ──────────────────────────
# Cloud Run requiere escuchar en el puerto 8080

FROM nginx:1.27-alpine3.21

# Actualizar todos los paquetes del sistema para parchear vulnerabilidades
RUN apk upgrade --no-cache

# Copiar archivos del proyecto al directorio raíz de nginx
COPY . /usr/share/nginx/html

# Copiar configuración personalizada de nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080
