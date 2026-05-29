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

async function run() {
  try {
    await client.connect();
    
    console.log("==== WORKSPACES ====");
    const resWorkspace = await client.query('SELECT id, name FROM "Workspace" LIMIT 5');
    console.log(resWorkspace.rows);
    
    console.log("\n==== TYPEBOTS ====");
    const resTypebot = await client.query('SELECT id, name, "workspaceId", "isArchived", "isClosed" FROM "Typebot" LIMIT 10');
    console.log(resTypebot.rows);
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await client.end();
  }
}

run();
