const { ensureDatabase, getPool, DB_NAME } = require('./db');

const DDL_STATEMENTS = [
  // 1. Controle de execuções do sincronizador (1 em 1 hora)
  `CREATE TABLE IF NOT EXISTS sync_runs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    run_type VARCHAR(50) NOT NULL DEFAULT 'HOURLY',
    started_at DATETIME NOT NULL,
    finished_at DATETIME NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'RUNNING',
    endpoints_summary JSON NULL,
    total_records_upserted INT NOT NULL DEFAULT 0,
    total_changes_logged INT NOT NULL DEFAULT 0,
    error_message TEXT NULL,
    INDEX idx_sync_started (started_at),
    INDEX idx_sync_status (status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 2. Tabela Principal de Tickets (Estado Atual + Métricas de BI Calculadas)
  `CREATE TABLE IF NOT EXISTS tickets (
    id BIGINT PRIMARY KEY,
    subject TEXT NULL,
    link VARCHAR(1000) NULL,
    workspace_id BIGINT NULL,
    workspace VARCHAR(255) NULL,
    squad_id BIGINT NULL,
    squad VARCHAR(255) NULL,
    tags TEXT NULL,
    status INT NULL,
    status_label VARCHAR(100) NULL,
    created_in DATETIME NULL,
    expect_due_date DATETIME NULL,
    initial_expect_due_date DATETIME NULL,
    due_date_changes_count INT NOT NULL DEFAULT 0,
    is_due_date_altered TINYINT(1) NOT NULL DEFAULT 0,
    last_due_date_change_at DATETIME NULL,
    concluded_in DATETIME NULL,
    priority INT NULL,
    priority_label VARCHAR(100) NULL,
    priority_group INT NULL,
    source INT NULL,
    source_label VARCHAR(100) NULL,
    type INT NULL,
    type_label VARCHAR(100) NULL,
    reopen_count INT NOT NULL DEFAULT 0,
    created_by_id VARCHAR(100) NULL,
    created_by VARCHAR(255) NULL,
    requester_by_id VARCHAR(100) NULL,
    requester_by VARCHAR(255) NULL,
    executor_id VARCHAR(100) NULL,
    executor VARCHAR(255) NULL,
    executor_email VARCHAR(255) NULL,
    responsible_id VARCHAR(100) NULL,
    responsible VARCHAR(255) NULL,
    phase_id INT NULL,
    phase VARCHAR(255) NULL,
    actual_time INT NOT NULL DEFAULT 0 COMMENT 'Tempo apontado acumulado no ticket (minutos)',
    time_tracked_sum INT NOT NULL DEFAULT 0 COMMENT 'Soma de minutos via endpoint time-trackings',
    time_first_response INT NULL COMMENT 'Minutos entre abertura e primeiro retorno ao cliente',
    iterations_count INT NOT NULL DEFAULT 0 COMMENT 'Total de interacoes externas com cliente',
    comments_count INT NOT NULL DEFAULT 0,
    last_comment_at DATETIME NULL,
    last_comment_by VARCHAR(255) NULL,
    last_comment_source VARCHAR(100) NULL,
    is_overdue TINYINT(1) NOT NULL DEFAULT 0,
    overdue_status VARCHAR(50) NULL COMMENT 'NO_PRAZO, ATRASADO_ABERTO, ENTREGUE_COM_ATRASO, SEM_PRAZO',
    delay_minutes INT NULL COMMENT 'Minutos de atraso (positivo = atrasado, negativo = adiantado)',
    lead_time_minutes INT NULL COMMENT 'Minutos entre criacao e conclusao (ou agora se aberto)',
    extra_fields JSON NULL COMMENT 'Quaisquer campos extras nao documentados vindos no JSON',
    raw_json JSON NOT NULL COMMENT 'Payload original completo do ticket na API',
    payload_hash CHAR(64) NOT NULL,
    first_seen_at DATETIME NOT NULL,
    last_seen_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    INDEX idx_tickets_workspace (workspace_id, workspace),
    INDEX idx_tickets_squad (squad_id, squad),
    INDEX idx_tickets_status (status, status_label),
    INDEX idx_tickets_executor (executor_id, executor),
    INDEX idx_tickets_phase (phase_id, phase),
    INDEX idx_tickets_created (created_in),
    INDEX idx_tickets_concluded (concluded_in),
    INDEX idx_tickets_due (expect_due_date),
    INDEX idx_tickets_overdue (is_overdue, overdue_status),
    INDEX idx_tickets_type (type, type_label),
    INDEX idx_tickets_priority (priority)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 3. Histórico Nativo de Iterações do Ticket (endpoint /v1.1/tickets?iterations=true -> ticketIteration)
  `CREATE TABLE IF NOT EXISTS ticket_iterations (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    iteration_id BIGINT NULL,
    iteration_hash CHAR(64) NOT NULL,
    ticket_id BIGINT NOT NULL,
    field_name VARCHAR(255) NULL,
    from_value TEXT NULL,
    to_value TEXT NULL,
    when_at DATETIME NULL,
    action_name VARCHAR(255) NULL,
    raw_json JSON NOT NULL,
    captured_at DATETIME NOT NULL,
    UNIQUE KEY uq_ticket_iteration_hash (iteration_hash),
    INDEX idx_ti_iteration_id (iteration_id),
    INDEX idx_ti_ticket_id (ticket_id),
    INDEX idx_ti_when (when_at),
    INDEX idx_ti_field (field_name),
    INDEX idx_ti_action (action_name)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 4. Comentários dos Tickets (endpoint /v1.1/tickets?includeComments=1 -> comments)
  `CREATE TABLE IF NOT EXISTS ticket_comments (
    id BIGINT PRIMARY KEY,
    ticket_id BIGINT NOT NULL,
    user_id VARCHAR(100) NULL,
    user_name VARCHAR(255) NULL,
    user_email VARCHAR(255) NULL,
    comment_date DATETIME NULL,
    description LONGTEXT NULL,
    source VARCHAR(100) NULL COMMENT 'Cliente, Atendimento ou Automatico',
    raw_json JSON NOT NULL,
    captured_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    INDEX idx_tc_ticket_id (ticket_id),
    INDEX idx_tc_date (comment_date),
    INDEX idx_tc_user (user_id, user_name),
    INDEX idx_tc_source (source)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 5. Histórico Versionado de Estado do Ticket (SCD Type 2 - Fotografia completa a cada mudança detectada)
  `CREATE TABLE IF NOT EXISTS ticket_state_history (
    history_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    ticket_id BIGINT NOT NULL,
    version_number INT NOT NULL DEFAULT 1,
    sync_run_id BIGINT NULL,
    status INT NULL,
    status_label VARCHAR(100) NULL,
    phase_id INT NULL,
    phase VARCHAR(255) NULL,
    executor_id VARCHAR(100) NULL,
    executor VARCHAR(255) NULL,
    priority INT NULL,
    expect_due_date DATETIME NULL,
    concluded_in DATETIME NULL,
    actual_time INT NULL,
    reopen_count INT NULL,
    iterations_count INT NULL,
    is_overdue TINYINT(1) NULL,
    overdue_status VARCHAR(50) NULL,
    payload_hash CHAR(64) NOT NULL,
    raw_json JSON NOT NULL,
    valid_from DATETIME NOT NULL,
    valid_to DATETIME NULL,
    is_current TINYINT(1) NOT NULL DEFAULT 1,
    INDEX idx_tsh_ticket_current (ticket_id, is_current),
    INDEX idx_tsh_valid_range (valid_from, valid_to),
    INDEX idx_tsh_phase (phase_id, phase),
    INDEX idx_tsh_executor (executor_id, executor)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 6. Log Granular de Mudanças Campo a Campo (Auditoria das coletas de 1 em 1 hora)
  `CREATE TABLE IF NOT EXISTS ticket_field_changes (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    ticket_id BIGINT NOT NULL,
    sync_run_id BIGINT NULL,
    changed_at DATETIME NOT NULL,
    field_name VARCHAR(100) NOT NULL,
    old_value TEXT NULL,
    new_value TEXT NULL,
    INDEX idx_tfc_ticket (ticket_id, changed_at),
    INDEX idx_tfc_field (field_name, changed_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 7. Tempo Calculado em Cada Etapa por Ticket (Para BI de Gargalos: Triagem, Análise, Planejar, Produção, Entrega)
  `CREATE TABLE IF NOT EXISTS ticket_phase_stays (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    ticket_id BIGINT NOT NULL,
    sequence_order INT NOT NULL,
    phase_name VARCHAR(255) NOT NULL,
    entered_at DATETIME NOT NULL,
    exited_at DATETIME NULL,
    duration_minutes INT NOT NULL DEFAULT 0,
    is_current_phase TINYINT(1) NOT NULL DEFAULT 0,
    source_type VARCHAR(50) NOT NULL DEFAULT 'ITERATION' COMMENT 'ITERATION ou SNAPSHOT',
    updated_at DATETIME NOT NULL,
    INDEX idx_tps_ticket (ticket_id, sequence_order),
    INDEX idx_tps_phase (phase_name),
    INDEX idx_tps_entered (entered_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 8. Apontamentos de Horas (endpoint /v1.0/time-trackings)
  `CREATE TABLE IF NOT EXISTS time_trackings (
    id BIGINT PRIMARY KEY,
    effort INT NOT NULL DEFAULT 0 COMMENT 'Tempo total do apontamento em minutos',
    timer TINYINT(1) NULL,
    workspace_id BIGINT NULL,
    workspace VARCHAR(255) NULL,
    squad_id BIGINT NULL,
    squad VARCHAR(255) NULL,
    status INT NULL COMMENT '10 Pendente (timer ativo), 20 Concluido, 30 Cancelado',
    status_label VARCHAR(100) NULL,
    created_in DATETIME NULL,
    start_date DATETIME NULL,
    end_date DATETIME NULL,
    reference_date DATE NULL COMMENT 'Data base do apontamento para agregacao diaria no BI',
    comment TEXT NULL,
    ctc_task_id BIGINT NULL,
    ctc_task TEXT NULL,
    ctc_task_quantity INT NULL,
    ctc_task_type_id BIGINT NULL,
    ctc_task_type VARCHAR(255) NULL,
    executor_id VARCHAR(100) NULL,
    executor VARCHAR(255) NULL,
    accomplished_hourly_rate DECIMAL(15,4) NULL,
    phase_id INT NULL,
    phase VARCHAR(255) NULL,
    planning_id BIGINT NULL,
    planning VARCHAR(255) NULL,
    ad_id BIGINT NULL,
    ad VARCHAR(255) NULL,
    ad_set_id BIGINT NULL,
    ad_set VARCHAR(255) NULL,
    ticket_id BIGINT NULL,
    ticket TEXT NULL,
    raw_json JSON NOT NULL,
    first_seen_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    INDEX idx_tt_ticket (ticket_id),
    INDEX idx_tt_task (ctc_task_id),
    INDEX idx_tt_executor (executor_id, executor),
    INDEX idx_tt_workspace (workspace_id, workspace),
    INDEX idx_tt_squad (squad_id, squad),
    INDEX idx_tt_dates (reference_date, start_date, created_in),
    INDEX idx_tt_phase (phase_id, phase),
    INDEX idx_tt_status (status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 9. Workspaces (endpoint /v1.0/workspaces)
  `CREATE TABLE IF NOT EXISTS workspaces (
    id BIGINT PRIMARY KEY,
    name VARCHAR(255) NULL,
    squad_id BIGINT NULL,
    squad_name VARCHAR(255) NULL,
    active INT NULL,
    description TEXT NULL,
    external_id VARCHAR(255) NULL,
    raw_json JSON NOT NULL,
    updated_at DATETIME NOT NULL,
    INDEX idx_ws_squad (squad_id, squad_name),
    INDEX idx_ws_active (active)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 10. Squads (endpoint /v1.0/squads)
  `CREATE TABLE IF NOT EXISTS squads (
    id BIGINT PRIMARY KEY,
    name VARCHAR(255) NULL,
    raw_json JSON NOT NULL,
    updated_at DATETIME NOT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 11. Usuários / Executores (endpoint /v1.0/users + extraídos de tickets e apontamentos)
  `CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(100) PRIMARY KEY,
    email VARCHAR(255) NULL,
    name VARCHAR(255) NULL,
    username VARCHAR(255) NULL,
    profile_company VARCHAR(100) NULL,
    position_id INT NULL,
    position VARCHAR(255) NULL,
    invited_in DATETIME NULL,
    hourly_rate DECIMAL(15,4) NULL,
    raw_json JSON NOT NULL,
    updated_at DATETIME NOT NULL,
    INDEX idx_users_email (email),
    INDEX idx_users_name (name)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 12. Tarefas (endpoint /v1.1/tasks)
  `CREATE TABLE IF NOT EXISTS tasks (
    id BIGINT PRIMARY KEY,
    title TEXT NULL,
    description LONGTEXT NULL,
    allocation_type INT NULL,
    workspace_id BIGINT NULL,
    workspace VARCHAR(255) NULL,
    situation INT NULL COMMENT '10 Ativas, 20 Pausadas, 30 Concluidas, 40 Canceladas',
    situation_label VARCHAR(100) NULL,
    priority INT NULL,
    priority_group INT NULL,
    estimated_time INT NULL,
    actual_time INT NULL,
    phase_id INT NULL,
    phase VARCHAR(255) NULL,
    co_phase_id INT NULL,
    co_phase VARCHAR(255) NULL,
    creation_date DATETIME NULL,
    original_due_date DATETIME NULL,
    current_due_date DATETIME NULL,
    phase_start_date DATETIME NULL,
    phase_due_date DATETIME NULL,
    resolved_date DATETIME NULL,
    created_by_id VARCHAR(100) NULL,
    created_by VARCHAR(255) NULL,
    executor_id VARCHAR(100) NULL,
    executor VARCHAR(255) NULL,
    co_executor_id VARCHAR(100) NULL,
    co_executor VARCHAR(255) NULL,
    project_id BIGINT NULL,
    project VARCHAR(255) NULL,
    project_alias VARCHAR(100) NULL,
    ctc_task_type_id BIGINT NULL,
    ctc_task_type VARCHAR(255) NULL,
    ctc_task_predecessor_id BIGINT NULL,
    ctc_task_predecessor VARCHAR(255) NULL,
    channel_id BIGINT NULL,
    channel VARCHAR(255) NULL,
    media_id BIGINT NULL,
    media VARCHAR(255) NULL,
    quantity INT NULL,
    raw_json JSON NOT NULL,
    updated_at DATETIME NOT NULL,
    INDEX idx_tasks_workspace (workspace_id),
    INDEX idx_tasks_situation (situation),
    INDEX idx_tasks_executor (executor_id, executor),
    INDEX idx_tasks_project (project_id),
    INDEX idx_tasks_dates (creation_date, current_due_date, resolved_date)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 13. Etapas de Tarefas
  `CREATE TABLE IF NOT EXISTS task_phases (
    id BIGINT PRIMARY KEY,
    ctc_task_id BIGINT NOT NULL,
    effort INT NULL,
    actual_time INT NULL,
    sequential INT NULL,
    phase_id INT NULL,
    phase VARCHAR(255) NULL,
    cophase_id INT NULL,
    phase_start_date DATETIME NULL,
    phase_due_date DATETIME NULL,
    executor_id VARCHAR(100) NULL,
    executor VARCHAR(255) NULL,
    raw_json JSON NOT NULL,
    updated_at DATETIME NOT NULL,
    INDEX idx_tp_task (ctc_task_id),
    INDEX idx_tp_executor (executor_id, executor)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 14. Performance de Conclusão de Etapas
  `CREATE TABLE IF NOT EXISTS activities_performance (
    id BIGINT PRIMARY KEY,
    task_id BIGINT NULL,
    task_title TEXT NULL,
    workspace_id BIGINT NULL,
    workspace VARCHAR(255) NULL,
    executor VARCHAR(255) NULL,
    executor_email VARCHAR(255) NULL,
    phase VARCHAR(255) NULL,
    workflow VARCHAR(255) NULL,
    expected_phase_start_date DATETIME NULL,
    expected_phase_due_date DATETIME NULL,
    real_phase_start_date DATETIME NULL,
    real_phase_due_date DATETIME NULL,
    overdue TINYINT(1) NULL,
    raw_json JSON NOT NULL,
    updated_at DATETIME NOT NULL,
    INDEX idx_ap_task (task_id),
    INDEX idx_ap_workspace (workspace_id),
    INDEX idx_ap_executor (executor),
    INDEX idx_ap_real_due (real_phase_due_date)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 15. Projetos (endpoint /v1.1/projects)
  `CREATE TABLE IF NOT EXISTS projects (
    id BIGINT PRIMARY KEY,
    name VARCHAR(255) NULL,
    alias VARCHAR(100) NULL,
    link VARCHAR(1000) NULL,
    workspace_id BIGINT NULL,
    workspace VARCHAR(255) NULL,
    squad_id BIGINT NULL,
    squad VARCHAR(255) NULL,
    start_date DATE NULL,
    end_date DATE NULL,
    planned_tasks_count INT NULL,
    accomplished_tasks_count INT NULL,
    planned_tasks_time INT NULL,
    accomplished_tasks_time INT NULL,
    expected_effort INT NULL,
    situation INT NULL,
    created_by_id VARCHAR(100) NULL,
    created_by VARCHAR(255) NULL,
    tags TEXT NULL,
    created_in DATETIME NULL,
    planned INT NULL,
    raw_json JSON NOT NULL,
    updated_at DATETIME NOT NULL,
    INDEX idx_proj_workspace (workspace_id),
    INDEX idx_proj_squad (squad_id),
    INDEX idx_proj_situation (situation)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 16. Tags e Tipos de Tarefa
  `CREATE TABLE IF NOT EXISTS tags (
    id BIGINT PRIMARY KEY,
    name VARCHAR(255) NULL,
    type INT NULL,
    raw_json JSON NOT NULL,
    updated_at DATETIME NOT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  `CREATE TABLE IF NOT EXISTS task_types (
    id BIGINT PRIMARY KEY,
    name VARCHAR(255) NULL,
    description TEXT NULL,
    workflow_id BIGINT NULL,
    workflow_name VARCHAR(255) NULL,
    group_id BIGINT NULL,
    group_name VARCHAR(255) NULL,
    raw_json JSON NOT NULL,
    updated_at DATETIME NOT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`
];

const ALTER_MIGRATIONS = [
  `ALTER TABLE tickets ADD COLUMN squad_id BIGINT NULL AFTER workspace;`,
  `ALTER TABLE tickets ADD COLUMN squad VARCHAR(255) NULL AFTER squad_id;`,
  `ALTER TABLE tickets ADD COLUMN tags TEXT NULL AFTER squad;`,
  `ALTER TABLE ticket_iterations ADD COLUMN iteration_id BIGINT NULL AFTER id;`,
  `ALTER TABLE time_trackings ADD COLUMN timer TINYINT(1) NULL AFTER effort;`,
  `ALTER TABLE time_trackings ADD COLUMN squad_id BIGINT NULL AFTER workspace;`,
  `ALTER TABLE time_trackings ADD COLUMN squad VARCHAR(255) NULL AFTER squad_id;`,
  `ALTER TABLE time_trackings ADD COLUMN ctc_task_quantity INT NULL AFTER ctc_task;`,
  `ALTER TABLE projects ADD COLUMN squad_id BIGINT NULL AFTER workspace;`,
  `ALTER TABLE projects ADD COLUMN squad VARCHAR(255) NULL AFTER squad_id;`
];

async function initSchema() {
  await ensureDatabase();
  const pool = getPool();
  for (const ddl of DDL_STATEMENTS) {
    await pool.query(ddl);
  }
  for (const alt of ALTER_MIGRATIONS) {
    try {
      await pool.query(alt);
    } catch (_) {
      // ignora se versao do MySQL nao suportar IF NOT EXISTS em ALTER e coluna ja existir
    }
  }
  const [tables] = await pool.query('SHOW TABLES;');
  return {
    database: DB_NAME,
    tables: tables.map((row) => Object.values(row)[0]),
  };
}

if (require.main === module) {
  initSchema()
    .then((res) => {
      console.log('Banco e tabelas verificados com sucesso:', res);
      process.exit(0);
    })
    .catch((err) => {
      console.error('Erro ao inicializar schema:', err);
      process.exit(1);
    });
}

module.exports = { initSchema };
