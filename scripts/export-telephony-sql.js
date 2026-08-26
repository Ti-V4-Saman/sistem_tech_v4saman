import mysql from 'mysql2/promise';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env'), quiet: true });

function mysqlConfig() {
  if (process.env.DATABASE_URL) {
    return { uri: process.env.DATABASE_URL, multipleStatements: false };
  }
  return {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'techhub',
  };
}

async function exportSql() {
  const pool = mysql.createPool(mysqlConfig());
  const orgId = 1;

  try {
    const [rows] = await pool.execute('SELECT * FROM phone_numbers WHERE organization_id = ?', [orgId]);
    
    // Create schema file
    const schemaSql = `-- Telephony Schema Export
CREATE TABLE IF NOT EXISTS phone_numbers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  organization_id INT NOT NULL,
  normalized_number VARCHAR(50) NOT NULL,
  display_number VARCHAR(50) NOT NULL,
  category ENUM('fixo', 'celular', 'celular_voip') NOT NULL,
  routing VARCHAR(255) NULL,
  monthly_fee DECIMAL(10, 2) NULL,
  status ENUM('ativo', 'aguardando_ativacao', 'inativo') NOT NULL DEFAULT 'ativo',
  responsible_name VARCHAR(255) NULL,
  sector VARCHAR(255) NULL,
  team_name VARCHAR(100) NULL,
  notes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_org_number (organization_id, normalized_number),
  INDEX idx_org (organization_id),
  INDEX idx_category (category),
  INDEX idx_status (status),
  INDEX idx_team (team_name),
  INDEX idx_responsible (responsible_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;
    await fs.writeFile(path.resolve('database', 'telephony_schema.sql'), schemaSql);

    // Create data file
    let dataSql = '-- Telephony Data Export\n';
    if (rows.length > 0) {
      dataSql += 'INSERT IGNORE INTO phone_numbers (organization_id, normalized_number, display_number, category, routing, monthly_fee, status, responsible_name, sector, team_name, notes) VALUES\n';
      
      const values = rows.map(row => {
        const esc = (val) => val === null ? 'NULL' : pool.escape(val);
        return `(${esc(row.organization_id)}, ${esc(row.normalized_number)}, ${esc(row.display_number)}, ${esc(row.category)}, ${esc(row.routing)}, ${esc(row.monthly_fee)}, ${esc(row.status)}, ${esc(row.responsible_name)}, ${esc(row.sector)}, ${esc(row.team_name)}, ${esc(row.notes)})`;
      });
      
      dataSql += values.join(',\n') + ';\n';
    }
    await fs.writeFile(path.resolve('database', 'telephony_initial_data.sql'), dataSql);

    // Create complete install file
    const completeSql = schemaSql + '\n\n' + dataSql;
    await fs.writeFile(path.resolve('database', 'telephony_complete_install.sql'), completeSql);

    console.log('SQL export files created in database/ directory.');
  } catch (err) {
    console.error('Error exporting SQL:', err);
  } finally {
    await pool.end();
  }
}

exportSql();
