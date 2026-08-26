import { query, getConnection } from '../backend/src/db/pool.js';
import { assignAccessRole, upsertUserProfile, bootstrapAccessModel } from '../backend/src/modules/users/profile.service.js';

async function main() {
  const organization = await bootstrapAccessModel();
  const emails = ['gabriel.guerra@v4company.com', 'giovani.maia@v4company.com', 'ti.bh@v4company.com'];

  for (const email of emails) {
    const { rows } = await query('SELECT id, name, organization_id FROM users WHERE email = ?', [email]);
    if (rows[0]) {
      const user = rows[0];
      console.log(`Elevating user ${email} (ID: ${user.id})...`);
      
      // Assign 'super-admin' role
      await assignAccessRole(user.id, user.organization_id, 'super-admin');
      
      // Update team to 'briu'
      await upsertUserProfile(user.id, user.organization_id, {
        teamSlug: 'briu'
      });
      
      console.log(`User ${email} elevated successfully.`);
    } else {
      console.log(`User ${email} not found in database.`);
    }
  }
  process.exit(0);
}

main().catch(console.error);
