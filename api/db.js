const { Pool } = require('pg');

// En Cloud Run se conecta a Cloud SQL a través de Unix socket (sin proxy adicional).
// En desarrollo usa TCP (localhost o DB_HOST).
const isProduction = process.env.NODE_ENV === 'production';

const poolConfig = isProduction
    ? {
          user:     process.env.DB_USER,
          password: process.env.DB_PASSWORD,
          database: process.env.DB_NAME,
          // Cloud Run inyecta el socket en /cloudsql/<INSTANCE_CONNECTION_NAME>
          host: `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`,
      }
    : {
          user:     process.env.DB_USER     || 'postgres',
          password: process.env.DB_PASSWORD || 'postgres',
          database: process.env.DB_NAME     || 'inventario',
          host:     process.env.DB_HOST     || 'localhost',
          port:     parseInt(process.env.DB_PORT || '5432'),
      };

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
    console.error('Error inesperado en el pool de PostgreSQL:', err.message);
});

module.exports = pool;
