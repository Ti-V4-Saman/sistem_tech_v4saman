import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

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

const numbers = [
  // Sem time: 13 numbers (11 active, 2 aguardando), R$ 209.80
  // Categories left to distribute: 23 fixo, 6 celular_voip, 4 celular
  { n: '11990001001', d: '(11) 99000-1001', c: 'celular', s: 'ativo', t: null, fee: 20.00, resp: 'Admin' },
  { n: '11990001002', d: '(11) 99000-1002', c: 'celular', s: 'ativo', t: null, fee: 20.00, resp: 'Admin' },
  { n: '11990001003', d: '(11) 99000-1003', c: 'celular', s: 'ativo', t: null, fee: 20.00, resp: 'Admin' },
  { n: '11990001004', d: '(11) 99000-1004', c: 'celular', s: 'ativo', t: null, fee: 20.00, resp: 'Admin' },
  { n: '1140001005', d: '(11) 4000-1005', c: 'fixo', s: 'ativo', t: null, fee: 15.00, resp: 'Recepção' },
  { n: '1140001006', d: '(11) 4000-1006', c: 'fixo', s: 'ativo', t: null, fee: 15.00, resp: 'Recepção' },
  { n: '1140001007', d: '(11) 4000-1007', c: 'fixo', s: 'ativo', t: null, fee: 15.00, resp: 'Comercial' },
  { n: '1140001008', d: '(11) 4000-1008', c: 'fixo', s: 'ativo', t: null, fee: 15.00, resp: 'Comercial' },
  { n: '1140001009', d: '(11) 4000-1009', c: 'fixo', s: 'ativo', t: null, fee: 15.00, resp: 'Vendas' },
  { n: '1140001010', d: '(11) 4000-1010', c: 'fixo', s: 'ativo', t: null, fee: 15.00, resp: 'Vendas' },
  { n: '1140001011', d: '(11) 4000-1011', c: 'fixo', s: 'ativo', t: null, fee: 15.00, resp: 'Vendas' },
  { n: '1140001012', d: '(11) 4000-1012', c: 'fixo', s: 'aguardando_ativacao', t: null, fee: 12.40, resp: 'Novo Setor' },
  { n: '1140001013', d: '(11) 4000-1013', c: 'fixo', s: 'aguardando_ativacao', t: null, fee: 12.40, resp: 'Novo Setor' },
  // 4 celular, 9 fixo. Total cost: 80 + 105 + 24.80 = 209.80. Correct.

  // BALBOA: 5 ativos, R$ 76.00 (all fixo for now)
  { n: '1140002001', d: '(11) 4000-2001', c: 'fixo', s: 'ativo', t: 'BALBOA', fee: 15.20, resp: 'Atendente 1' },
  { n: '1140002002', d: '(11) 4000-2002', c: 'fixo', s: 'ativo', t: 'BALBOA', fee: 15.20, resp: 'Atendente 2' },
  { n: '1140002003', d: '(11) 4000-2003', c: 'fixo', s: 'ativo', t: 'BALBOA', fee: 15.20, resp: 'Atendente 3' },
  { n: '1140002004', d: '(11) 4000-2004', c: 'fixo', s: 'ativo', t: 'BALBOA', fee: 15.20, resp: 'Atendente 4' },
  { n: '1140002005', d: '(11) 4000-2005', c: 'fixo', s: 'ativo', t: 'BALBOA', fee: 15.20, resp: 'Atendente 5' },
  // 5 fixo. Total cost 76.00. Correct.

  // ATLAS: 4 numbers (2 ativos, 2 aguardando), R$ 79.80
  { n: '1140003001', d: '(11) 4000-3001', c: 'fixo', s: 'ativo', t: 'ATLAS', fee: 19.95, resp: 'Atlas 1' },
  { n: '1140003002', d: '(11) 4000-3002', c: 'fixo', s: 'ativo', t: 'ATLAS', fee: 19.95, resp: 'Atlas 2' },
  { n: '1140003003', d: '(11) 4000-3003', c: 'fixo', s: 'aguardando_ativacao', t: 'ATLAS', fee: 19.95, resp: 'Atlas 3' },
  { n: '1140003004', d: '(11) 4000-3004', c: 'fixo', s: 'aguardando_ativacao', t: 'ATLAS', fee: 19.95, resp: 'Atlas 4' },
  // 4 fixo. Total cost 79.80. Correct.

  // SNIPERS: 4 ativos, R$ 70.00
  { n: '1140004001', d: '(11) 4000-4001', c: 'fixo', s: 'ativo', t: 'SNIPERS', fee: 17.50, resp: 'Sniper 1' },
  { n: '1140004002', d: '(11) 4000-4002', c: 'fixo', s: 'ativo', t: 'SNIPERS', fee: 17.50, resp: 'Sniper 2' },
  { n: '1140004003', d: '(11) 4000-4003', c: 'fixo', s: 'ativo', t: 'SNIPERS', fee: 17.50, resp: 'Sniper 3' },
  { n: '1140004004', d: '(11) 4000-4004', c: 'fixo', s: 'ativo', t: 'SNIPERS', fee: 17.50, resp: 'Sniper 4' },
  // 4 fixo. Total cost 70.00. Correct.

  // SEALS: 3 ativos, R$ 30.95. Let's make one of them fixo, others celular_voip to reach exact categories.
  // We need 6 celular_voip total.
  // We used 9+5+4+4 = 22 fixo. We need 1 more fixo.
  // So SEALS gets 1 fixo, 2 celular_voip.
  { n: '1140005001', d: '(11) 4000-5001', c: 'fixo', s: 'ativo', t: 'SEALS', fee: 10.95, resp: 'Seal 1' },
  { n: '11980005002', d: '(11) 98000-5002', c: 'celular_voip', s: 'ativo', t: 'SEALS', fee: 10.00, resp: 'Seal 2' },
  { n: '11980005003', d: '(11) 98000-5003', c: 'celular_voip', s: 'ativo', t: 'SEALS', fee: 10.00, resp: 'Seal 3' },
  // Total cost: 30.95. Correct. Fixo: 23 total.

  // BRIU: 3 ativos, R$ 30.00. (all celular_voip to reach 6 total celular_voip)
  { n: '11980006001', d: '(11) 98000-6001', c: 'celular_voip', s: 'ativo', t: 'BRIU', fee: 10.00, resp: 'Briu 1' },
  { n: '11980006002', d: '(11) 98000-6002', c: 'celular_voip', s: 'ativo', t: 'BRIU', fee: 10.00, resp: 'Briu 2' },
  { n: '11980006003', d: '(11) 98000-6003', c: 'celular_voip', s: 'ativo', t: 'BRIU', fee: 10.00, resp: 'Briu 3' },
  // Total cost: 30.00. Correct.

  // GENIUS: 1 ativo, R$ 10.00. (last celular_voip)
  { n: '11980007001', d: '(11) 98000-7001', c: 'celular_voip', s: 'ativo', t: 'GENIUS', fee: 10.00, resp: 'Genius 1' }
  // Total cost: 10.00. Correct.

  // Check categories: 
  // celular: 4
  // fixo: 9 + 5 + 4 + 4 + 1 = 23
  // celular_voip: 2 + 3 + 1 = 6
  // Total = 33 numbers. Correct.
  
  // Total active = 11 + 5 + 2 + 4 + 3 + 3 + 1 = 29
  // Total aguardando = 2 + 0 + 2 + 0 + 0 + 0 + 0 = 4
  // Total = 33. Correct.
];

async function seed() {
  const pool = mysql.createPool(mysqlConfig());
  const orgId = 1;

  try {
    console.log('Iniciando seed de telefonia...');
    
    // Idempotent operation
    for (const num of numbers) {
      const [rows] = await pool.execute(
        'SELECT id FROM phone_numbers WHERE organization_id = ? AND normalized_number = ?',
        [orgId, num.n]
      );

      if (rows.length === 0) {
        await pool.execute(
          `INSERT INTO phone_numbers 
          (organization_id, normalized_number, display_number, category, routing, monthly_fee, status, responsible_name, sector, team_name, notes) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [orgId, num.n, num.d, num.c, null, num.fee, num.s, num.resp, null, num.t, null]
        );
      } else {
        // Update values to ensure consistency just in case
        await pool.execute(
          `UPDATE phone_numbers SET 
          display_number = ?, category = ?, monthly_fee = ?, status = ?, responsible_name = ?, team_name = ?
          WHERE organization_id = ? AND normalized_number = ?`,
          [num.d, num.c, num.fee, num.s, num.resp, num.t, orgId, num.n]
        );
      }
    }
    console.log('Seed de telefonia concluído com sucesso!');
  } catch (err) {
    console.error('Erro no seed:', err);
  } finally {
    await pool.end();
  }
}

seed();
