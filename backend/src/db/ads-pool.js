import mysql from 'mysql2/promise';
import { env } from '../config/env.js';

function createAdsPool() {
  if (!env.adsDb.host) {
    return null;
  }

  return mysql.createPool({
    host: env.adsDb.host,
    port: env.adsDb.port,
    user: env.adsDb.user,
    password: env.adsDb.password,
    waitForConnections: true,
    connectionLimit: env.adsDb.connectionLimit,
    namedPlaceholders: false,
    supportBigNumbers: true,
    bigNumberStrings: false,
  });
}

export const adsPool = createAdsPool();

if (adsPool) {
  adsPool.getConnection()
    .then((conn) => {
      console.log('[ads-db] Conexão MySQL (Mídia) estabelecida com sucesso.');
      conn.release();
    })
    .catch((err) => {
      console.error('[ads-db] ERRO: Não foi possível conectar ao MySQL (Mídia):', err.message);
    });
} else {
  console.log('[ads-db] Mídia desabilitada: ADS_DB_HOST não fornecido.');
}

export async function queryAds(sql, params = []) {
  if (!adsPool) {
    throw new Error('Banco de anúncios não está configurado.');
  }
  const [rows] = await adsPool.execute(sql, params);
  return {
    rows: Array.isArray(rows) ? rows : [],
    result: rows,
    rowCount: Array.isArray(rows) ? rows.length : rows?.affectedRows || 0,
    insertId: rows?.insertId,
  };
}

export async function getAdsConnection() {
  if (!adsPool) {
    throw new Error('Banco de anúncios não está configurado.');
  }
  return adsPool.getConnection();
}
