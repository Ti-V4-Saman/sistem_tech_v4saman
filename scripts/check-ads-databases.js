import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config();

const adsDbConfig = {
  host: process.env.ADS_DB_HOST,
  port: Number(process.env.ADS_DB_PORT || 3306),
  user: process.env.ADS_DB_USER,
  password: process.env.ADS_DB_PASSWORD,
};

async function main() {
  console.log('--- Diagnóstico do Servidor de Mídia ---');
  console.log(`Host: ${adsDbConfig.host}:${adsDbConfig.port}`);
  
  if (!adsDbConfig.host || !adsDbConfig.user) {
    console.log('ERRO: Credenciais ausentes no .env');
    return;
  }

  let conn;
  try {
    conn = await mysql.createConnection(adsDbConfig);
    console.log('Servidor: OK\n');
    
    const [dbs] = await conn.query('SHOW DATABASES');
    
    const ignoreList = ['information_schema', 'mysql', 'performance_schema', 'sys'];
    const schemas = dbs
      .map(row => row.Database)
      .filter(db => !ignoreList.includes(db));
      
    console.log(`Schemas encontrados: ${schemas.length}\n`);
    
    for (const schema of schemas) {
      console.log(`Cliente/Database: ${schema}`);
      
      const [tables] = await conn.query(`SHOW TABLES FROM \`${schema}\``);
      const tableNames = tables.map(t => Object.values(t)[0]);
      
      const hasMeta = tableNames.includes('bd_meta_ads');
      const hasGoogle = tableNames.includes('bd_google_ads');
      
      console.log(`Meta: ${hasMeta ? 'OK' : 'ausente'}`);
      console.log(`Google: ${hasGoogle ? 'OK' : 'ausente'}`);
      
      if (hasMeta || hasGoogle) {
        // Quick check for missing required fields can be added here, 
        // but detailed check goes to standardize script
        const missing = [];
        if (hasMeta) {
          const [cols] = await conn.query(`SHOW COLUMNS FROM \`${schema}\`.bd_meta_ads`);
          const colNames = cols.map(c => c.Field);
          if (!colNames.includes('id_criativo')) missing.push('Meta: id_criativo');
          if (!colNames.includes('alcance')) missing.push('Meta: alcance');
        }
        if (missing.length > 0) {
          console.log(`Precisa padronização. Campos ausentes:`);
          missing.forEach(m => console.log(`- ${m}`));
        }
      }
      console.log('---------------------------');
    }
    
  } catch (err) {
    console.log('ERRO: Não foi possível conectar.', err.message);
  } finally {
    if (conn) await conn.end();
  }
}

main();
