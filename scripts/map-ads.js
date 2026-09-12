import { query as appQuery } from '../backend/src/db/pool.js';
import { queryAds } from '../backend/src/db/ads-pool.js';
import crypto from 'crypto';

async function mapDatabases() {
  try {
    const clientsResult = await appQuery(`SELECT id, name FROM clients WHERE status = 'active'`);
    const clients = clientsResult.rows;

    const adsSchemasResult = await queryAds(`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name NOT IN ('information_schema', 'mysql', 'performance_schema', 'sys')
    `);
    const schemas = adsSchemasResult.rows.map(r => r.SCHEMA_NAME);

    console.log('Clients:', clients.length);
    console.log('Ads Schemas:', schemas.length);

    let mappedCount = 0;

    for (const client of clients) {
      const normalizedClientName = client.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      const match = schemas.find(s => {
        const normalizedSchema = s.toLowerCase().replace(/[^a-z0-9]/g, '');
        return normalizedSchema.includes(normalizedClientName) || normalizedClientName.includes(normalizedSchema);
      });

      if (match) {
        // check tables in schema
        const metaTables = await queryAds(`SELECT table_name FROM information_schema.tables WHERE table_schema = ? AND table_name LIKE '%meta%'`, [match]);
        const googleTables = await queryAds(`SELECT table_name FROM information_schema.tables WHERE table_schema = ? AND table_name LIKE '%google%'`, [match]);

        const hasMeta = metaTables.rows.length > 0 ? 1 : 0;
        const hasGoogle = googleTables.rows.length > 0 ? 1 : 0;

        if (hasMeta || hasGoogle) {
          const id = crypto.randomUUID();
          await appQuery(`
            INSERT IGNORE INTO client_ads_sources (id, client_id, schema_name, meta_enabled, google_enabled)
            VALUES (?, ?, ?, ?, ?)
          `, [id, client.id, match, hasMeta, hasGoogle]);
          console.log(`Mapped ${client.name} -> ${match} (Meta: ${hasMeta}, Google: ${hasGoogle})`);
          mappedCount++;
        }
      }
    }
    console.log('Total mapped:', mappedCount);
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}

mapDatabases();
