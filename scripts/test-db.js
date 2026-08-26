import { query, n8nPool, typebotPool } from '../backend/src/db/pool.js';

async function test() {
  console.log('Testing MySQL connections...');
  try {
    const clients = await query('SELECT count(*) as count FROM clients');
    console.log('MySQL clients count:', clients.rows[0].count);
    const users = await query('SELECT count(*) as count FROM users');
    console.log('MySQL users count:', users.rows[0].count);
  } catch (e) {
    console.error('MySQL error:', e.message);
  }

  if (n8nPool) {
    console.log('Testing n8n PostgreSQL connection...');
    try {
      // Set a client connection timeout
      const client = await n8nPool.connect();
      console.log('Connected to n8n PostgreSQL.');
      const res = await client.query('SELECT count(*) as count FROM workflow_entity');
      console.log('n8n workflow count:', res.rows[0].count);
      client.release();
    } catch (e) {
      console.error('n8n error:', e.message);
    }
  } else {
    console.log('n8n database not configured.');
  }

  if (typebotPool) {
    console.log('Testing Typebot PostgreSQL connection...');
    try {
      const client = await typebotPool.connect();
      console.log('Connected to Typebot PostgreSQL.');
      const res = await client.query('SELECT count(*) as count FROM "Typebot"');
      console.log('Typebot count:', res.rows[0].count);
      client.release();
    } catch (e) {
      console.error('Typebot error:', e.message);
    }
  } else {
    console.log('Typebot database not configured.');
  }

  process.exit(0);
}

test().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
