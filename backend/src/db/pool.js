import mysql from 'mysql2/promise';
import pg from 'pg';
import { env } from '../config/env.js';

const { Pool: PgPool } = pg;

function createMysqlPool() {
  if (env.databaseUrl) {
    return mysql.createPool({ uri: env.databaseUrl, waitForConnections: true, connectionLimit: 10 });
  }

  return mysql.createPool({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    database: env.db.database,
    waitForConnections: true,
    connectionLimit: 10,
    namedPlaceholders: false,
  });
}

export const appPool = createMysqlPool();

// Valida a conexão com o MySQL na inicialização para falhar rápido
appPool.getConnection()
  .then((conn) => {
    console.log('[db] Conexão MySQL estabelecida com sucesso.');
    conn.release();
  })
  .catch((err) => {
    console.error('[db] ERRO: Não foi possível conectar ao MySQL:', err.message);
    console.error('[db] Verifique DB_HOST, DB_PORT, DB_USER, DB_PASSWORD e DB_NAME no .env');
  });

// n8n e Typebot normalmente usam PostgreSQL. Mantemos estes pools opcionais
// somente para sincronizações futuras, separados do banco próprio MySQL do TechHub.
export const n8nPool = env.n8n.host
  ? new PgPool({
      host: env.n8n.host,
      port: env.n8n.port,
      user: env.n8n.user,
      password: env.n8n.password,
      database: env.n8n.database,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 20000,
      query_timeout: 20000,
      statement_timeout: 20000,
    })
  : null;

export const typebotPool = env.typebot.host
  ? new PgPool({
      host: env.typebot.host,
      port: env.typebot.port,
      user: env.typebot.user,
      password: env.typebot.password,
      database: env.typebot.database,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 20000,
      query_timeout: 20000,
      statement_timeout: 20000,
    })
  : null;

for (const [name, pool] of Object.entries({ n8nPool, typebotPool })) {
  pool?.on('error', (error) => {
    console.error(`[${name}] unexpected PostgreSQL error`, error.message);
  });
}

export async function query(sql, params = []) {
  const [rows] = await appPool.execute(sql, params);
  return {
    rows: Array.isArray(rows) ? rows : [],
    result: rows,
    rowCount: Array.isArray(rows) ? rows.length : rows?.affectedRows || 0,
    insertId: rows?.insertId,
  };
}

export async function getConnection() {
  return appPool.getConnection();
}
