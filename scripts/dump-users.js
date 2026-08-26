import { query } from '../backend/src/db/pool.js';

async function main() {
  const users = await query('SELECT * FROM users');
  console.log('--- USERS ---');
  for (const u of users.rows) {
    console.log(`ID: ${u.id}, Name: ${u.name}, Email: ${u.email}, Status: ${u.status}`);
  }

  const userRoles = await query(`
    SELECT ur.user_id, r.slug as role_slug, r.name as role_name
      FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
  `);
  console.log('--- USER ROLES ---');
  for (const ur of userRoles.rows) {
    console.log(`User ID: ${ur.user_id}, Role: ${ur.role_slug} (${ur.role_name})`);
  }

  const rolePermissions = await query(`
    SELECT r.slug as role_slug, p.slug as perm_slug
      FROM roles r
      JOIN role_permissions rp ON rp.role_id = r.id
      JOIN permissions p ON p.id = rp.permission_id
  `);
  console.log('--- ROLE PERMISSIONS COUNT ---');
  const counts = {};
  for (const rp of rolePermissions.rows) {
    counts[rp.role_slug] = (counts[rp.role_slug] || 0) + 1;
  }
  console.log(counts);

  process.exit(0);
}

main().catch(console.error);
