import { query } from '../backend/src/db/pool.js';

async function main() {
  try {
    const limit = 50;
    const offset = 0;
    console.log('Testing without search parameters...');
    const result = await query(
      `SELECT c.id,
              c.name,
              c.legal_name,
              c.cnpj,
              c.status,
              c.fee_amount,
              c.unit,
              c.health_score,
              c.started_at,
              c.last_review_at,
              c.created_at,
              c.updated_at,
              COUNT(DISTINCT a.id) AS total_automations,
              COUNT(DISTINCT CASE WHEN a.status = 'active' OR a.is_active = 1 THEN a.id END) AS active_automations,
              COUNT(DISTINCT b.id) AS total_bots,
              COUNT(DISTINCT CASE WHEN b.status = 'active' OR b.is_published = 1 THEN b.id END) AS published_bots
         FROM clients c
         LEFT JOIN automations a ON a.client_id = c.id
         LEFT JOIN bots b ON b.client_id = c.id
        GROUP BY c.id, c.name, c.legal_name, c.cnpj, c.status, c.fee_amount, c.unit, c.health_score, c.started_at, c.last_review_at, c.created_at, c.updated_at
        ORDER BY c.name ASC
        LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    console.log('Success! Client count:', result.rows.length);
  } catch (error) {
    console.error('SQL test failed:', error);
  }
  process.exit(0);
}

main();
