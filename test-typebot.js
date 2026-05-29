import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pg;

const client = new Client({
  host: process.env.TYPEBOT_DB_HOST,
  port: process.env.TYPEBOT_DB_PORT,
  user: process.env.TYPEBOT_DB_USER,
  password: process.env.TYPEBOT_DB_PASSWORD,
  database: process.env.TYPEBOT_DB_NAME,
});

async function testConnection() {
  try {
    console.log(`Tentando conectar no banco de dados do Typebot...`);
    console.log(`Host: ${process.env.TYPEBOT_DB_HOST} | User: ${process.env.TYPEBOT_DB_USER} | DB: ${process.env.TYPEBOT_DB_NAME}`);
    
    await client.connect();
    console.log('✅ Conexão realizada com sucesso!');
    
    // Lista as tabelas do schema public
    const query = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;
    
    const res = await client.query(query);
    const tabelas = res.rows.map(row => row.table_name);
    
    console.log(`Foram encontradas ${tabelas.length} tabelas no schema public.`);
    console.log(`Tabelas principais: ${tabelas.slice(0, 20).join(', ')}...`);
    
  } catch (error) {
    console.error('❌ Erro ao conectar no banco do Typebot:', error.message);
  } finally {
    await client.end();
    console.log('Conexão encerrada.');
  }
}

testConnection();
