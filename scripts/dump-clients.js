import { query } from '../backend/src/db/pool.js';

async function main() {
  const users = await query('SELECT id, name, email, organization_id FROM users');
  console.log('--- USERS ---');
  for (const u of users.rows) {
    console.log(`ID: ${u.id}, Name: ${u.name}, Email: ${u.email}, Org ID: ${u.organization_id}`);
  }

  const clients = await query('SELECT id, name, organization_id, status FROM clients');
  console.log('--- CLIENTS ---');
  console.log(`Total: ${clients.rows.length}`);
  for (const c of clients.rows.slice(0, 10)) {
    console.log(`ID: ${c.id}, Name: ${c.name}, Org ID: ${c.organization_id}, Status: ${c.status}`);
  }

  const orgs = await query('SELECT * FROM organizations');
  console.log('--- ORGANIZATIONS ---');
  for (const o of orgs.rows) {
    console.log(`ID: ${o.id}, Name: ${o.name}, Slug: ${o.slug}`);
  }

  process.exit(0);
}

main().catch(console.error);
