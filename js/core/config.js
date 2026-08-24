// ================================
// CONFIGURACIÓN DE API
// ================================
// Después de desplegar el servicio API en Cloud Run,
// reemplaza la URL de producción con la que te asigne GCP.
//
// Formato: https://inventario-api-XXXXXXXX-XX.a.run.app

(function () {
    const hostname = window.location.hostname;
    const isDev = hostname === 'localhost' || hostname === '127.0.0.1';

    window.API_URL = isDev
        ? 'http://localhost:3000'                                // Desarrollo local
        : 'https://TU-API-CLOUD-RUN-URL.a.run.app';            // ← Reemplaza tras el deploy

    console.log(`[Config] API_URL: ${window.API_URL}`);
})();
