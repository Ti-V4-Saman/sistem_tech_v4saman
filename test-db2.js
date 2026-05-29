import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const query = `
  SELECT 
    w.id as workflow_id,
    w.name as workflow_name,
    (
      SELECT json_agg(json_build_object('id', e.id, 'status', e.status))
      FROM (
        SELECT id, status 
        FROM execution_entity 
        WHERE "workflowId" = w.id 
        ORDER BY id DESC LIMIT 5
      ) e
    ) as executions
  FROM workflow_entity w
  LIMIT 2;
`;

pool.query(query)
  .then(res => {
    console.log(JSON.stringify(res.rows, null, 2));
  })
  .catch(err => console.error(err))
  .finally(() => pool.end());
