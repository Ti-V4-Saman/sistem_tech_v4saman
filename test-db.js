import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pg;

const client = new Client({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function testConnection() {
  console.log("Tentando conectar no banco de dados...");
  console.log(`Host: ${process.env.DB_HOST} | User: ${process.env.DB_USER} | DB: ${process.env.DB_NAME}`);
  
  try {
    await client.connect();
    console.log("✅ Conexão realizada com sucesso!");
    
    // Tenta listar algumas tabelas para provar que conectou e tem acesso
    const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' LIMIT 10");
    console.log(`Foram encontradas ${res.rows.length} tabelas no schema public (limitado a 10).`);
    console.log("Tabelas:", res.rows.map(r => r.table_name).join(', '));
    
  } catch (err) {
    console.error("❌ Erro ao conectar no banco de dados:", err.message);
  } finally {
    await client.end();
    console.log("Conexão encerrada.");
  }
}

testConnection();
