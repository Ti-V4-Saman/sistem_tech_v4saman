import fs from 'fs/promises';
import path from 'path';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// Carrega as variáveis de ambiente declaradas no arquivo .env
dotenv.config({ quiet: true });

/**
 * Retorna as configurações de conexão do MySQL com base nas variáveis do arquivo .env.
 * Caso DATABASE_URL esteja definida (muito comum em ambientes PaaS como Heroku/Render), ela é priorizada.
 * Caso contrário, utiliza as variáveis individuais de conexão.
 */
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
    multipleStatements: false, // Desabilita statements múltiplos por comando execute por segurança contra SQL Injection
  };
}

/**
 * Divide um arquivo SQL contendo múltiplos comandos separados por ponto e vírgula (;).
 * Remove linhas de comentários que começam com '--'.
 * Retorna uma lista de statements limpos e prontos para execução.
 */
function splitSql(sql) {
  // Remove comentários de linha simples no estilo SQL (-- comentário)
  const withoutLineComments = sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n');

  // Divide pelas quebras de linha com ponto e vírgula no final
  return withoutLineComments
    .split(/;\s*(?:\n|$)/g)
    .map((statement) => statement.trim())
    .filter(Boolean); // Remove statements vazios
}

// Inicializa o Pool de conexões com o MySQL
const pool = mysql.createPool(mysqlConfig());
const migrationsDir = path.resolve('migrations');

// Garante a criação da tabela de controle de migrações (schema_migrations)
// Esta tabela registra quais scripts SQL já foram aplicados para evitar re-execução
await pool.execute(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    id VARCHAR(255) PRIMARY KEY,
    executed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`);

// Consulta quais migrações já foram rodadas anteriormente no banco
const [executedRows] = await pool.execute('SELECT id FROM schema_migrations');
const executed = new Set(executedRows.map((row) => row.id));

// Lê todos os arquivos da pasta 'migrations' que terminam com '.sql' e os ordena alfabeticamente
let files = [];
try {
  files = (await fs.readdir(migrationsDir)).filter((file) => file.endsWith('.sql')).sort();
} catch (error) {
  if (error.code === 'ENOENT') {
    console.warn(`Nenhuma pasta de migrations encontrada em ${migrationsDir}.`);
  } else {
    throw error;
  }
}

// Percorre cada arquivo de migração na ordem correta
for (const file of files) {
  // Se a migração já foi aplicada antes, pula para a próxima
  if (executed.has(file)) {
    console.log(`Skipping ${file} (Já aplicada anteriormente)`);
    continue;
  }

  // Lê o conteúdo do script SQL correspondente
  const sql = await fs.readFile(path.join(migrationsDir, file), 'utf8');
  const connection = await pool.getConnection(); // Obtém uma conexão dedicada do pool

  try {
    // Executa comando por comando individualmente dentro do arquivo SQL
    for (const statement of splitSql(sql)) {
      await connection.query(statement);
    }
    // Registra o arquivo na tabela schema_migrations para marcar como aplicado com sucesso
    await connection.execute('INSERT INTO schema_migrations (id) VALUES (?)', [file]);
    console.log(`✅ Applied ${file} com sucesso!`);
  } catch (error) {
    console.error(`❌ Failed ${file}:`, error.message);
    process.exitCode = 1; // Define código de saída com erro
    break; // Interrompe o processo para evitar migrações parciais inconsistentes
  } finally {
    connection.release(); // Libera a conexão de volta para o pool
  }
}

// Fecha o pool de conexões do banco de dados
await pool.end();
