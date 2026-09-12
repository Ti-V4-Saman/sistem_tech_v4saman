import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config();

const adsDbConfig = {
  host: process.env.ADS_DB_HOST,
  port: Number(process.env.ADS_DB_PORT || 3306),
  user: process.env.ADS_DB_USER,
  password: process.env.ADS_DB_PASSWORD,
};

const META_COLUMNS = {
  id: 'BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT',
  data: 'DATE NOT NULL',
  id_conta: 'VARCHAR(64)',
  conta: 'VARCHAR(255)',
  id_campanha: 'VARCHAR(64)',
  campanha: 'VARCHAR(255)',
  objetivo: 'VARCHAR(100)',
  status_campanha: 'VARCHAR(50)',
  id_conjunto: 'VARCHAR(64)',
  conjunto: 'VARCHAR(255)',
  status_conjunto: 'VARCHAR(50)',
  id_anuncio: 'VARCHAR(64)',
  anuncio: 'VARCHAR(255)',
  status_anuncio: 'VARCHAR(50)',
  id_criativo: 'VARCHAR(64)',
  tipo_criativo: 'VARCHAR(50)',
  url_criativo: 'TEXT',
  thumbnail_url: 'TEXT',
  valor_gasto: 'DECIMAL(18,6) DEFAULT 0',
  impressoes: 'BIGINT UNSIGNED DEFAULT 0',
  alcance: 'BIGINT UNSIGNED DEFAULT 0',
  clicks_no_link: 'BIGINT UNSIGNED DEFAULT 0',
  clicks_saida: 'BIGINT UNSIGNED DEFAULT 0',
  visualizacoes_pagina_destino: 'BIGINT UNSIGNED DEFAULT 0',
  mensagens_enviadas: 'DECIMAL(18,4) DEFAULT 0',
  leads: 'DECIMAL(18,4) DEFAULT 0',
  compras: 'DECIMAL(18,4) DEFAULT 0',
  valor_compras: 'DECIMAL(18,6) DEFAULT 0',
  adicoes_carrinho: 'DECIMAL(18,4) DEFAULT 0',
  inicios_checkout: 'DECIMAL(18,4) DEFAULT 0',
  visualizacoes_video: 'BIGINT UNSIGNED DEFAULT 0',
  thruplays: 'BIGINT UNSIGNED DEFAULT 0',
  moeda: 'VARCHAR(10)',
  synced_at: 'DATETIME NULL',
  created_at: 'DATETIME',
  updated_at: 'DATETIME'
};

const GOOGLE_COLUMNS = {
  id: 'BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT',
  data: 'DATE NOT NULL',
  id_conta: 'VARCHAR(64)',
  conta: 'VARCHAR(255)',
  id_campanha: 'VARCHAR(64)',
  campanha: 'VARCHAR(255)',
  tipo_campanha: 'VARCHAR(50)',
  subtipo_campanha: 'VARCHAR(80)',
  status_campanha: 'VARCHAR(50)',
  valor_gasto: 'DECIMAL(18,6) DEFAULT 0',
  impressoes: 'BIGINT UNSIGNED DEFAULT 0',
  clicks_no_link: 'BIGINT UNSIGNED DEFAULT 0',
  conversoes: 'DECIMAL(18,4) DEFAULT 0',
  valor_da_conversao: 'DECIMAL(18,6) DEFAULT 0',
  todas_conversoes: 'DECIMAL(18,4) DEFAULT 0',
  valor_todas_conversoes: 'DECIMAL(18,6) DEFAULT 0',
  compras: 'DECIMAL(18,4) DEFAULT 0',
  receita_ecommerce: 'DECIMAL(18,6) DEFAULT 0',
  search_impression_share: 'DECIMAL(12,8)',
  search_top_impression_share: 'DECIMAL(12,8)',
  search_absolute_top_impression_share: 'DECIMAL(12,8)',
  video_views: 'BIGINT UNSIGNED DEFAULT 0',
  moeda: 'VARCHAR(10)',
  synced_at: 'DATETIME NULL',
  created_at: 'DATETIME',
  updated_at: 'DATETIME'
};

async function checkAndAlterTable(conn, schema, tableName, expectedCols, isDryRun) {
  const [tables] = await conn.query(`SHOW TABLES FROM \`${schema}\` LIKE '${tableName}'`);
  if (tables.length === 0) {
    console.log(`[${tableName}] não existe.`);
    return;
  }

  const [cols] = await conn.query(`SHOW COLUMNS FROM \`${schema}\`.\`${tableName}\``);
  const existingCols = cols.map(c => c.Field);
  
  const missingCols = [];
  for (const [colName, colType] of Object.entries(expectedCols)) {
    if (!existingCols.includes(colName)) {
      missingCols.push({ name: colName, type: colType });
    }
  }

  if (missingCols.length === 0) {
    console.log(`[${tableName}] OK.`);
    return;
  }

  console.log(`[${tableName}] Faltam colunas:`);
  missingCols.forEach(m => console.log(`  - ${m.name}`));

  if (isDryRun) {
    console.log(`Ações planejadas:`);
    missingCols.forEach(m => console.log(`  ADD COLUMN ${m.name} ${m.type}`));
  } else {
    for (const m of missingCols) {
      const sql = `ALTER TABLE \`${schema}\`.\`${tableName}\` ADD COLUMN ${m.name} ${m.type}`;
      try {
        await conn.query(sql);
        console.log(`+ Coluna ${m.name} adicionada.`);
      } catch (err) {
        console.log(`Erro ao adicionar ${m.name}: ${err.message}`);
      }
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const isApply = args.includes('--apply');

  if (!isDryRun && !isApply) {
    console.log('Use --dry-run ou --apply');
    process.exit(1);
  }

  if (!adsDbConfig.host) {
    console.log('ERRO: Credenciais de Ads DB ausentes.');
    return;
  }

  let conn;
  try {
    conn = await mysql.createConnection(adsDbConfig);
    console.log(isDryRun ? '--- DRY RUN ---' : '--- APPLY ---');
    
    const [dbs] = await conn.query('SHOW DATABASES');
    const ignoreList = ['information_schema', 'mysql', 'performance_schema', 'sys'];
    const schemas = dbs.map(row => row.Database).filter(db => !ignoreList.includes(db));
    
    for (const schema of schemas) {
      console.log(`\nCliente: ${schema}`);
      await checkAndAlterTable(conn, schema, 'bd_meta_ads', META_COLUMNS, isDryRun);
      await checkAndAlterTable(conn, schema, 'bd_google_ads', GOOGLE_COLUMNS, isDryRun);
    }
    
  } catch (err) {
    console.log('Erro de banco:', err.message);
  } finally {
    if (conn) await conn.end();
  }
}

main();
