require('dotenv').config();
const mysql = require('mysql2/promise');

const defaultDbConfig = {
  host: process.env.EKYTE_DB_HOST || process.env.DB_HOST || '143.244.156.195',
  port: Number(process.env.EKYTE_DB_PORT || process.env.DB_PORT || 3306),
  user: process.env.EKYTE_DB_USER || process.env.DB_USER || 'root',
  password: process.env.EKYTE_DB_PASS || process.env.DB_PASSWORD || process.env.DB_PASS || 'V4SA@2210!',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: 'Z',
};

let activeDbConfig = { ...defaultDbConfig };
let DB_NAME = process.env.EKYTE_DB_NAME || 'ekyte_bi';
let pool = null;

function configureDb(options = {}) {
  if (options.pool) {
    pool = options.pool;
    return;
  }
  if (options.dbConfig) {
    activeDbConfig = { ...defaultDbConfig, ...options.dbConfig };
  }
  if (options.database || options.dbName) {
    DB_NAME = options.database || options.dbName;
  }
  if (pool) {
    pool.end().catch(() => {});
    pool = null;
  }
}

async function ensureDatabase() {
  const connection = await mysql.createConnection({
    host: activeDbConfig.host,
    port: activeDbConfig.port,
    user: activeDbConfig.user,
    password: activeDbConfig.password,
  });
  await connection.query(
    `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
  );
  await connection.end();
}

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      ...activeDbConfig,
      database: DB_NAME,
      multipleStatements: true,
    });
  }
  return pool;
}

module.exports = {
  configureDb,
  ensureDatabase,
  getPool,
  get DB_NAME() {
    return DB_NAME;
  },
};


