const { getPool } = require('./db');

// Membros do Time BRIU / Tecnologia (Atuais + Histórico TI)
const BRIU_EXECUTORS = [
  'Gabriel Guerra',
  'Giovani Maia | TI | 12',
  'fernando.lucio@v4company.com',
  'Kelvin Clenderson',
  'Luiz fernandes | DV | 12',
  'Lucas Passabão| TI | 12',
  'Fabio Junio',
  'Paulo Souza | TI | 12',
];

async function normalizeTicketDataInDb() {
  const pool = getPool();

  // 1. Preenche squad nos tickets que vieram sem squad usando o cadastro de workspaces
  await pool.query(`
    UPDATE tickets t
    INNER JOIN workspaces w ON w.id = t.workspace_id
    SET
      t.squad_id = COALESCE(NULLIF(t.squad_id, 0), w.squad_id),
      t.squad = CASE
        WHEN (t.squad IS NULL OR TRIM(t.squad) = '') AND w.squad_name IS NOT NULL AND TRIM(w.squad_name) <> ''
        THEN w.squad_name
        ELSE t.squad
      END
    WHERE (t.squad IS NULL OR TRIM(t.squad) = '')
      AND w.squad_name IS NOT NULL AND TRIM(w.squad_name) <> ''
  `);

  // 2. Recalcula SLA considerando o fim do dia previsto (DATE(expect_due_date) 23:59:59)
  await pool.query(`
    UPDATE tickets
    SET
      is_overdue = CASE
        WHEN expect_due_date IS NULL THEN 0
        WHEN status = 3 AND concluded_in IS NOT NULL AND DATE(concluded_in) > DATE(expect_due_date) THEN 1
        WHEN status IN (1, 2) AND CURDATE() > DATE(expect_due_date) THEN 1
        ELSE 0
      END,
      overdue_status = CASE
        WHEN expect_due_date IS NULL THEN 'SEM_PRAZO'
        WHEN status = 3 AND concluded_in IS NOT NULL AND DATE(concluded_in) > DATE(expect_due_date) THEN 'ENTREGUE_COM_ATRASO'
        WHEN status IN (1, 2) AND CURDATE() > DATE(expect_due_date) THEN 'ATRASADO_ABERTO'
        ELSE 'NO_PRAZO'
      END,
      delay_minutes = CASE
        WHEN expect_due_date IS NULL THEN NULL
        WHEN status = 3 AND concluded_in IS NOT NULL THEN TIMESTAMPDIFF(MINUTE, TIMESTAMP(DATE(expect_due_date), '23:59:59'), concluded_in)
        WHEN status IN (1, 2) THEN TIMESTAMPDIFF(MINUTE, TIMESTAMP(DATE(expect_due_date), '23:59:59'), UTC_TIMESTAMP())
        ELSE NULL
      END,
      lead_time_minutes = CASE
        WHEN created_in IS NULL THEN NULL
        WHEN concluded_in IS NOT NULL THEN TIMESTAMPDIFF(MINUTE, created_in, concluded_in)
        WHEN status IN (1, 2) THEN TIMESTAMPDIFF(MINUTE, created_in, UTC_TIMESTAMP())
        ELSE NULL
      END
  `);

  // 3. Auditoria de Prazo Alterado (detecta se alguém postergou a data de entrega)
  await pool.query(`
    UPDATE tickets
    SET initial_expect_due_date = expect_due_date
    WHERE initial_expect_due_date IS NULL AND expect_due_date IS NOT NULL
  `);

  await pool.query(`
    UPDATE tickets t
    INNER JOIN (
      SELECT 
        ticket_id, 
        COUNT(*) AS changes_count,
        MIN(old_value) AS original_due,
        MAX(changed_at) AS last_change
      FROM ticket_field_changes
      WHERE field_name = 'expect_due_date'
      GROUP BY ticket_id
    ) tfc ON tfc.ticket_id = t.id
    SET 
      t.due_date_changes_count = tfc.changes_count,
      t.initial_expect_due_date = COALESCE(NULLIF(tfc.original_due, ''), t.initial_expect_due_date),
      t.is_due_date_altered = 1,
      t.last_due_date_change_at = tfc.last_change
  `);
}

function buildWhereClause(query = {}, alias = 't') {
  const pfx = alias ? `${alias}.` : '';
  // Sempre focado exclusivamente no Time BRIU
  const conditions = [`(${pfx}executor IN (?) OR ${pfx}squad = 'Briu')`];
  const params = [BRIU_EXECUTORS];

  const dateFieldMap = {
    created_in: `${pfx}created_in`,
    concluded_in: `${pfx}concluded_in`,
    expect_due_date: `${pfx}expect_due_date`,
  };
  const dateCol = dateFieldMap[query.dateField] || `${pfx}created_in`;

  if (query.startDate) {
    conditions.push(`${dateCol} >= ?`);
    params.push(`${query.startDate} 00:00:00`);
  }
  if (query.endDate) {
    conditions.push(`${dateCol} <= ?`);
    params.push(`${query.endDate} 23:59:59`);
  }

  if (query.status && query.status !== 'all') {
    if (query.status === 'active' || query.status === 'open') {
      conditions.push(`${pfx}status IN (1, 2)`);
    } else if (query.status === 'concluded' || query.status === 'resolved') {
      conditions.push(`${pfx}status = 3`);
    } else if (query.status === 'canceled') {
      conditions.push(`${pfx}status = 9`);
    } else {
      const statuses = String(query.status)
        .split(',')
        .map((s) => Number(s.trim()))
        .filter((n) => !isNaN(n));
      if (statuses.length > 0) {
        conditions.push(`${pfx}status IN (?)`);
        params.push(statuses);
      }
    }
  }

  if (query.phase && query.phase !== 'all') {
    const phases = String(query.phase)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (phases.length > 0) {
      conditions.push(`${pfx}phase IN (?)`);
      params.push(phases);
    }
  }

  if (query.executor && query.executor !== 'all') {
    const execs = String(query.executor)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (execs.length > 0) {
      conditions.push(`${pfx}executor IN (?)`);
      params.push(execs);
    }
  }

  if (query.requester && query.requester !== 'all') {
    const reqs = String(query.requester)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (reqs.length > 0) {
      conditions.push(`${pfx}requester_by IN (?)`);
      params.push(reqs);
    }
  }

  if (query.squad && query.squad !== 'all') {
    if (query.squad === '__NONE__') {
      conditions.push(`(${pfx}squad IS NULL OR TRIM(${pfx}squad) = '')`);
    } else {
      const squads = String(query.squad)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (squads.length > 0) {
        conditions.push(`${pfx}squad IN (?)`);
        params.push(squads);
      }
    }
  }

  if (query.workspace && query.workspace !== 'all') {
    const wsList = String(query.workspace)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (wsList.length > 0) {
      conditions.push(`${pfx}workspace IN (?)`);
      params.push(wsList);
    }
  }

  if (query.priority && query.priority !== 'all') {
    const prios = String(query.priority)
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => !isNaN(n));
    if (prios.length > 0) {
      conditions.push(`${pfx}priority IN (?)`);
      params.push(prios);
    }
  }

  if (query.overdueStatus && query.overdueStatus !== 'all') {
    if (query.overdueStatus === 'ALL_OVERDUE') {
      conditions.push(`${pfx}is_overdue = 1`);
    } else if (query.overdueStatus === 'ALTERED_DUE_DATE') {
      conditions.push(`${pfx}is_due_date_altered = 1`);
    } else {
      const ovs = String(query.overdueStatus)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (ovs.length > 0) {
        conditions.push(`${pfx}overdue_status IN (?)`);
        params.push(ovs);
      }
    }
  }

  if (query.search && String(query.search).trim()) {
    const q = `%${String(query.search).trim()}%`;
    conditions.push(
      `(CAST(${pfx}id AS CHAR) LIKE ? OR ${pfx}subject LIKE ? OR ${pfx}workspace LIKE ? OR ${pfx}executor LIKE ? OR ${pfx}requester_by LIKE ?)`
    );
    params.push(q, q, q, q, q);
  }

  const whereSql = `WHERE ${conditions.join(' AND ')}`;
  return { whereSql, params };
}

function getBucketExpression(granularity, colExpr) {
  switch (granularity) {
    case 'day':
      return `DATE_FORMAT(${colExpr}, '%Y-%m-%d')`;
    case 'week':
      return `DATE_FORMAT(DATE_SUB(DATE(${colExpr}), INTERVAL WEEKDAY(${colExpr}) DAY), '%Y-%m-%d')`;
    case 'year':
      return `DATE_FORMAT(${colExpr}, '%Y')`;
    case 'month':
    default:
      return `DATE_FORMAT(${colExpr}, '%Y-%m')`;
  }
}

async function getFilterMetadata() {
  const pool = getPool();
  const baseWhere = `WHERE (executor IN (?) OR squad = 'Briu')`;

  const [
    [executors],
    [squads],
    [workspaces],
    [phases],
    [priorities],
    [[dateRange]],
    [lastSyncRows],
  ] = await Promise.all([
    pool.query(
      `SELECT executor AS label, executor AS value, COUNT(*) AS count
       FROM tickets
       ${baseWhere}
       GROUP BY executor
       ORDER BY count DESC`,
      [BRIU_EXECUTORS]
    ),
    pool.query(
      `SELECT COALESCE(NULLIF(TRIM(squad), ''), 'Interno / Sem Squad') AS label,
              CASE WHEN squad IS NULL OR TRIM(squad) = '' THEN '__NONE__' ELSE squad END AS value,
              COUNT(*) AS count
       FROM tickets
       ${baseWhere}
       GROUP BY value, label
       ORDER BY count DESC`,
      [BRIU_EXECUTORS]
    ),
    pool.query(
      `SELECT workspace AS value, workspace AS label, COUNT(*) AS count
       FROM tickets
       ${baseWhere} AND workspace IS NOT NULL AND TRIM(workspace) <> ''
       GROUP BY workspace
       ORDER BY count DESC`,
      [BRIU_EXECUTORS]
    ),
    pool.query(
      `SELECT phase AS value, phase AS label, phase_id, COUNT(*) AS count
       FROM tickets
       ${baseWhere} AND phase IS NOT NULL AND TRIM(phase) <> ''
       GROUP BY phase, phase_id
       ORDER BY phase_id ASC, count DESC`,
      [BRIU_EXECUTORS]
    ),
    pool.query(
      `SELECT priority AS value, COALESCE(priority_label, CAST(priority AS CHAR)) AS label, COUNT(*) AS count
       FROM tickets
       ${baseWhere} AND priority IS NOT NULL
       GROUP BY priority, priority_label
       ORDER BY priority DESC`,
      [BRIU_EXECUTORS]
    ),
    pool.query(
      `SELECT DATE_FORMAT(MIN(created_in), '%Y-%m-%d') AS minDate,
              DATE_FORMAT(MAX(created_in), '%Y-%m-%d') AS maxDate,
              COUNT(*) AS totalAllTime
       FROM tickets
       ${baseWhere}`,
      [BRIU_EXECUTORS]
    ),
    pool.query(
      `SELECT id, run_type, started_at, finished_at, status, total_records_upserted
       FROM sync_runs
       ORDER BY id DESC
       LIMIT 3`
    ),
  ]);

  return {
    executors,
    squads,
    workspaces,
    phases,
    priorities,
    dateRange,
    syncRuns: lastSyncRows,
  };
}

async function getDashboardData(query = {}) {
  const pool = getPool();
  const granularity = ['day', 'week', 'month', 'year'].includes(query.granularity)
    ? query.granularity
    : 'month';

  const { whereSql, params } = buildWhereClause(query, 't');
  // Escopo de etapas sem filtrar por phase para que os contadores dos tabs reflitam todas as etapas no filtro atual
  const stageScope = buildWhereClause({ ...query, phase: 'all' }, 't');

  // A série temporal acompanha a "data base" escolhida no filtro (abertura, conclusão ou prazo)
  let bucketCol = 't.created_in';
  if (query.dateField === 'concluded_in') bucketCol = 't.concluded_in';
  else if (query.dateField === 'expect_due_date') bucketCol = 't.expect_due_date';
  const createdBucket = getBucketExpression(granularity, bucketCol);

  const [
    [[kpiRow]],
    [stageTabs],
    [createdSeries],
    [byExecutor],
    [byPriority],
    [bySquad],
    [byWorkspace],
    [phaseBottlenecks],
  ] = await Promise.all([
    // 1. KPIs Essenciais do Time BRIU
    pool.query(
      `SELECT
        COUNT(*) AS total_tickets,
        SUM(CASE WHEN t.status = 1 THEN 1 ELSE 0 END) AS status_em_atendimento,
        SUM(CASE WHEN t.status = 2 THEN 1 ELSE 0 END) AS status_aguardando,
        SUM(CASE WHEN t.status IN (1, 2) THEN 1 ELSE 0 END) AS total_abertos,
        SUM(CASE WHEN t.status = 3 THEN 1 ELSE 0 END) AS status_resolvido,
        SUM(CASE WHEN t.status = 9 THEN 1 ELSE 0 END) AS status_cancelado,
        SUM(CASE WHEN t.expect_due_date IS NOT NULL THEN 1 ELSE 0 END) AS com_prazo,
        SUM(CASE WHEN t.overdue_status = 'SEM_PRAZO' THEN 1 ELSE 0 END) AS sem_prazo,
        SUM(CASE WHEN t.overdue_status = 'NO_PRAZO' THEN 1 ELSE 0 END) AS no_prazo,
        SUM(CASE WHEN t.overdue_status = 'ENTREGUE_COM_ATRASO' THEN 1 ELSE 0 END) AS entregue_com_atraso,
        SUM(CASE WHEN t.overdue_status = 'ATRASADO_ABERTO' THEN 1 ELSE 0 END) AS atrasado_aberto,
        SUM(CASE WHEN t.is_overdue = 1 THEN 1 ELSE 0 END) AS total_atrasados,
        SUM(CASE WHEN t.status = 3 AND t.expect_due_date IS NOT NULL THEN 1 ELSE 0 END) AS resolvidos_com_prazo,
        SUM(CASE WHEN t.status = 3 AND t.overdue_status = 'NO_PRAZO' THEN 1 ELSE 0 END) AS resolvidos_no_prazo,
        SUM(CASE WHEN t.priority = 400 THEN 1 ELSE 0 END) AS total_urgentes,
        SUM(CASE WHEN t.priority = 300 THEN 1 ELSE 0 END) AS total_alta,
        ROUND(AVG(CASE WHEN t.status = 3 AND t.lead_time_minutes >= 0 THEN t.lead_time_minutes END), 1) AS avg_lead_time_min,
        ROUND(AVG(CASE WHEN t.time_first_response IS NOT NULL AND t.time_first_response >= 0 THEN t.time_first_response END), 1) AS avg_first_response_min,
        COALESCE(SUM(t.actual_time), 0) AS total_actual_time_min,
        COALESCE(SUM(t.time_tracked_sum), 0) AS total_tracked_time_min
      FROM tickets t
      ${whereSql}`,
      params
    ),

    // 2. Quadro de Etapas do Time BRIU (respeita todos os filtros exceto o clique da própria etapa)
    pool.query(
      `SELECT
        COALESCE(t.phase, 'Sem Etapa') AS phase,
        MIN(t.phase_id) AS phase_id,
        COUNT(*) AS total,
        SUM(CASE WHEN t.status = 1 THEN 1 ELSE 0 END) AS em_atendimento,
        SUM(CASE WHEN t.status = 2 THEN 1 ELSE 0 END) AS aguardando_solicitante,
        SUM(CASE WHEN t.status IN (1, 2) THEN 1 ELSE 0 END) AS total_ativos,
        SUM(CASE WHEN t.status IN (1, 2) AND t.is_overdue = 1 THEN 1 ELSE 0 END) AS ativos_atrasados,
        SUM(CASE WHEN t.status = 3 THEN 1 ELSE 0 END) AS total_concluidos
      FROM tickets t
      ${stageScope.whereSql}
      GROUP BY COALESCE(t.phase, 'Sem Etapa')
      ORDER BY MIN(t.phase_id) ASC`,
      stageScope.params
    ),

    // 4. Gráfico 1: Evolução Temporal (Dia, Semana, Mês, Ano)
    pool.query(
      `SELECT
        ${createdBucket} AS bucket,
        COUNT(*) AS abertos,
        SUM(CASE WHEN t.status = 3 THEN 1 ELSE 0 END) AS resolvidos,
        SUM(CASE WHEN t.overdue_status = 'NO_PRAZO' THEN 1 ELSE 0 END) AS no_prazo,
        SUM(CASE WHEN t.is_overdue = 1 THEN 1 ELSE 0 END) AS atrasados
      FROM tickets t
      ${whereSql} AND ${bucketCol} IS NOT NULL
      GROUP BY bucket
      ORDER BY bucket ASC`,
      params
    ),

    // 5. Gráfico 2 & Tabela Resumo: Executores do Time BRIU
    pool.query(
      `SELECT
        t.executor,
        COUNT(*) AS total_tickets,
        SUM(CASE WHEN t.status = 1 THEN 1 ELSE 0 END) AS em_atendimento,
        SUM(CASE WHEN t.status = 2 THEN 1 ELSE 0 END) AS aguardando,
        SUM(CASE WHEN t.status = 3 THEN 1 ELSE 0 END) AS resolvidos,
        SUM(CASE WHEN t.expect_due_date IS NOT NULL THEN 1 ELSE 0 END) AS com_prazo,
        SUM(CASE WHEN t.overdue_status = 'NO_PRAZO' THEN 1 ELSE 0 END) AS no_prazo,
        SUM(CASE WHEN t.is_overdue = 1 THEN 1 ELSE 0 END) AS total_atrasados,
        SUM(CASE WHEN t.overdue_status = 'SEM_PRAZO' THEN 1 ELSE 0 END) AS sem_prazo,
        SUM(CASE WHEN t.priority IN (300, 400) THEN 1 ELSE 0 END) AS urgentes_alta,
        ROUND(AVG(CASE WHEN t.status = 3 AND t.lead_time_minutes >= 0 THEN t.lead_time_minutes END) / 60, 1) AS avg_lead_time_hours,
        ROUND(AVG(CASE WHEN t.status = 3 AND t.lead_time_minutes >= 0 THEN t.lead_time_minutes END) / 1440, 1) AS avg_lead_time_days,
        ROUND(SUM(GREATEST(COALESCE(t.actual_time, 0), COALESCE(t.time_tracked_sum, 0))) / 60, 1) AS horas_apontadas
      FROM tickets t
      ${whereSql}
      GROUP BY t.executor
      ORDER BY total_tickets DESC`,
      params
    ),

    // 6. Por Urgência / Prioridade
    pool.query(
      `SELECT
        COALESCE(t.priority, 10) AS priority,
        COALESCE(t.priority_label, 'Não priorizada') AS priority_label,
        COUNT(*) AS total,
        SUM(CASE WHEN t.status IN (1, 2) THEN 1 ELSE 0 END) AS abertos,
        SUM(CASE WHEN t.status = 3 THEN 1 ELSE 0 END) AS resolvidos,
        SUM(CASE WHEN t.overdue_status = 'NO_PRAZO' THEN 1 ELSE 0 END) AS no_prazo,
        SUM(CASE WHEN t.is_overdue = 1 THEN 1 ELSE 0 END) AS atrasados,
        SUM(CASE WHEN t.overdue_status = 'SEM_PRAZO' THEN 1 ELSE 0 END) AS sem_prazo,
        ROUND(AVG(CASE WHEN t.status = 3 AND t.lead_time_minutes >= 0 THEN t.lead_time_minutes END) / 60, 1) AS avg_lead_time_hours,
        ROUND(AVG(CASE WHEN t.status = 3 AND t.lead_time_minutes >= 0 THEN t.lead_time_minutes END) / 1440, 1) AS avg_lead_time_days,
        ROUND(SUM(GREATEST(COALESCE(t.actual_time, 0), COALESCE(t.time_tracked_sum, 0))) / 60, 1) AS horas_apontadas
      FROM tickets t
      ${whereSql}
      GROUP BY COALESCE(t.priority, 10), COALESCE(t.priority_label, 'Não priorizada')
      ORDER BY COALESCE(t.priority, 10) DESC`,
      params
    ),

    // 7. Demanda por Squad Solicitante
    pool.query(
      `SELECT
        COALESCE(NULLIF(TRIM(t.squad), ''), 'Interno / Sem Squad') AS squad,
        COUNT(*) AS total,
        SUM(CASE WHEN t.status = 3 THEN 1 ELSE 0 END) AS resolvidos,
        SUM(CASE WHEN t.overdue_status = 'NO_PRAZO' THEN 1 ELSE 0 END) AS no_prazo,
        SUM(CASE WHEN t.is_overdue = 1 THEN 1 ELSE 0 END) AS atrasados,
        SUM(CASE WHEN t.priority = 400 THEN 1 ELSE 0 END) AS urgentes,
        SUM(CASE WHEN t.priority = 300 THEN 1 ELSE 0 END) AS alta,
        ROUND(SUM(GREATEST(COALESCE(t.actual_time, 0), COALESCE(t.time_tracked_sum, 0))) / 60, 1) AS horas_apontadas
      FROM tickets t
      ${whereSql}
      GROUP BY COALESCE(NULLIF(TRIM(t.squad), ''), 'Interno / Sem Squad')
      ORDER BY total DESC`,
      params
    ),

    // 8. Top Workspaces Completo
    pool.query(
      `SELECT
        COALESCE(NULLIF(TRIM(t.workspace), ''), 'Sem Workspace') AS workspace,
        COALESCE(NULLIF(TRIM(MAX(t.squad)), ''), 'Interno') AS squad,
        COUNT(*) AS total,
        SUM(CASE WHEN t.status IN (1, 2) THEN 1 ELSE 0 END) AS abertos,
        SUM(CASE WHEN t.status = 3 THEN 1 ELSE 0 END) AS resolvidos,
        SUM(CASE WHEN t.overdue_status = 'NO_PRAZO' THEN 1 ELSE 0 END) AS no_prazo,
        SUM(CASE WHEN t.is_overdue = 1 THEN 1 ELSE 0 END) AS atrasados,
        SUM(CASE WHEN t.overdue_status = 'SEM_PRAZO' THEN 1 ELSE 0 END) AS sem_prazo,
        ROUND(AVG(CASE WHEN t.status = 3 AND t.lead_time_minutes >= 0 THEN t.lead_time_minutes END) / 60, 1) AS avg_lead_time_hours,
        ROUND(AVG(CASE WHEN t.status = 3 AND t.lead_time_minutes >= 0 THEN t.lead_time_minutes END) / 1440, 1) AS avg_lead_time_days,
        ROUND(SUM(GREATEST(COALESCE(t.actual_time, 0), COALESCE(t.time_tracked_sum, 0))) / 60, 1) AS horas_apontadas
      FROM tickets t
      ${whereSql}
      GROUP BY COALESCE(NULLIF(TRIM(t.workspace), ''), 'Sem Workspace')
      ORDER BY total DESC
      LIMIT 200`,
      params
    ),

    // 9. Gráfico 4: Tempo Médio por Etapa (Triagem, Análise, Planejar, Produção, Entrega)
    pool.query(
      `SELECT
        tps.phase_name,
        COUNT(DISTINCT tps.ticket_id) AS tickets_na_etapa,
        ROUND(AVG(tps.duration_minutes) / 60, 1) AS avg_hours_in_phase,
        ROUND(AVG(tps.duration_minutes) / 1440, 1) AS avg_days_in_phase
      FROM ticket_phase_stays tps
      INNER JOIN tickets t ON t.id = tps.ticket_id
      ${whereSql}
      GROUP BY tps.phase_name
      ORDER BY FIELD(tps.phase_name, 'Triagem', 'Análise', 'Planejar', 'Produção', 'Entrega')`,
      params
    ),
  ]);

  const totalTickets = Number(kpiRow?.total_tickets || 0);
  const resolvedTickets = Number(kpiRow?.status_resolvido || 0);
  const resolvedWithDue = Number(kpiRow?.resolvidos_com_prazo || 0);
  const resolvedOnTime = Number(kpiRow?.resolvidos_no_prazo || 0);
  const comPrazo = Number(kpiRow?.com_prazo || 0);
  const noPrazoTotal = Number(kpiRow?.no_prazo || 0);

  const kpis = {
    totalTickets,
    inProgressTickets: Number(kpiRow?.status_em_atendimento || 0),
    waitingTickets: Number(kpiRow?.status_aguardando || 0),
    openTickets: Number(kpiRow?.total_abertos || 0),
    resolvedTickets,
    canceledTickets: Number(kpiRow?.status_cancelado || 0),
    resolutionRate: totalTickets > 0 ? Number(((resolvedTickets / totalTickets) * 100).toFixed(1)) : 0,
    withDueDateCount: comPrazo,
    withoutDueDateCount: Number(kpiRow?.sem_prazo || 0),
    onTimeCount: noPrazoTotal,
    deliveredLateCount: Number(kpiRow?.entregue_com_atraso || 0),
    openOverdueCount: Number(kpiRow?.atrasado_aberto || 0),
    totalOverdueCount: Number(kpiRow?.total_atrasados || 0),
    resolvedOnTimeCount: resolvedOnTime,
    resolvedWithDueCount: resolvedWithDue,
    slaComplianceRate:
      resolvedWithDue > 0 ? Number(((resolvedOnTime / resolvedWithDue) * 100).toFixed(1)) : 0,
    urgentTicketsCount: Number(kpiRow?.total_urgentes || 0),
    highPriorityCount: Number(kpiRow?.total_alta || 0),
    avgLeadTimeHours: Number(((Number(kpiRow?.avg_lead_time_min || 0)) / 60).toFixed(1)),
    avgLeadTimeDays: Number(((Number(kpiRow?.avg_lead_time_min || 0)) / 1440).toFixed(1)),
    avgFirstResponseMinutes: Number(kpiRow?.avg_first_response_min || 0),
    totalHours: Number(
      (
        Math.max(
          Number(kpiRow?.total_actual_time_min || 0),
          Number(kpiRow?.total_tracked_time_min || 0)
        ) / 60
      ).toFixed(1)
    ),
  };

  return {
    granularity,
    kpis,
    stageTabs: stageTabs || [],
    livePhasesGlobal: stageTabs || [],
    createdSeries,
    byExecutor,
    byPriority,
    bySquad,
    byWorkspace,
    phaseBottlenecks,
  };
}

async function getPaginatedTickets(query = {}) {
  const pool = getPool();
  const { whereSql, params } = buildWhereClause(query, 't');

  const page = Math.max(1, Number(query.page || 1));
  const pageSize = Math.min(200, Math.max(10, Number(query.pageSize || 30)));
  const offset = (page - 1) * pageSize;

  const sortMap = {
    id: 't.id',
    created_in: 't.created_in',
    concluded_in: 't.concluded_in',
    expect_due_date: 't.expect_due_date',
    priority: 't.priority',
    status: 't.status',
    lead_time_minutes: 't.lead_time_minutes',
    actual_time: 't.actual_time',
  };
  const sortCol = sortMap[query.sortBy] || 't.created_in';
  const sortDir = String(query.sortDir || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  const [[[countRow]], [rows]] = await Promise.all([
    pool.query(`SELECT COUNT(*) AS total FROM tickets t ${whereSql}`, params),
    pool.query(
      `SELECT
        t.id, t.subject, t.link, t.workspace, t.squad,
        t.status, t.status_label, t.created_in, t.expect_due_date, t.concluded_in,
        t.initial_expect_due_date, t.due_date_changes_count, t.is_due_date_altered, t.last_due_date_change_at,
        t.priority, t.priority_label, t.type_label, t.reopen_count,
        t.requester_by, t.executor, t.phase, t.actual_time, t.time_tracked_sum,
        t.comments_count, t.is_overdue, t.overdue_status, t.delay_minutes, t.lead_time_minutes
      FROM tickets t
      ${whereSql}
      ORDER BY ${sortCol} ${sortDir}, t.id DESC
      LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    ),
  ]);

  return {
    page,
    pageSize,
    total: Number(countRow?.total || 0),
    totalPages: Math.ceil(Number(countRow?.total || 0) / pageSize),
    items: rows,
  };
}

async function getTicketDetail(ticketId) {
  const pool = getPool();
  const id = Number(ticketId);

  const [
    [ticketRows],
    [phaseStays],
    [iterations],
    [comments],
    [timeTrackings],
    [dueDateHistory],
  ] = await Promise.all([
    pool.query(`SELECT * FROM tickets WHERE id = ?`, [id]),
    pool.query(`SELECT * FROM ticket_phase_stays WHERE ticket_id = ? ORDER BY sequence_order ASC`, [id]),
    pool.query(`SELECT * FROM ticket_iterations WHERE ticket_id = ? ORDER BY when_at ASC, id ASC`, [id]),
    pool.query(`SELECT * FROM ticket_comments WHERE ticket_id = ? ORDER BY comment_date ASC, id ASC`, [id]),
    pool.query(`SELECT * FROM time_trackings WHERE ticket_id = ? ORDER BY start_date ASC, created_in ASC`, [id]),
    pool.query(`SELECT * FROM ticket_field_changes WHERE ticket_id = ? AND field_name = 'expect_due_date' ORDER BY changed_at ASC`, [id]),
  ]);

  if (!ticketRows[0]) return null;

  return {
    ticket: ticketRows[0],
    phaseStays,
    iterations,
    comments,
    timeTrackings,
    dueDateHistory: dueDateHistory || [],
  };
}

// Opções de filtro em cascata: cada lista é calculada aplicando TODOS os outros filtros ativos
// (exceto o próprio), então as contagens sempre batem com o que o dashboard mostra.
async function getCascadingFilterMetadata(query = {}) {
  const pool = getPool();

  const run = async (excludeKey, sql) => {
    const { whereSql, params } = buildWhereClause({ ...query, [excludeKey]: 'all' }, 't');
    const [rows] = await pool.query(sql.replace('{{WHERE}}', whereSql), params);
    return rows;
  };

  const [executors, requesters, statuses, slaStatuses, priorities, phases, squads, workspaces, [syncRuns]] =
    await Promise.all([
      run('executor', `SELECT t.executor AS value, t.executor AS label, COUNT(*) AS count
        FROM tickets t {{WHERE}} GROUP BY t.executor ORDER BY count DESC`),
      run('requester', `SELECT t.requester_by AS value, t.requester_by AS label, COUNT(*) AS count
        FROM tickets t {{WHERE}} AND t.requester_by IS NOT NULL AND TRIM(t.requester_by) <> ''
        GROUP BY t.requester_by ORDER BY count DESC LIMIT 80`),
      run('status', `SELECT t.status AS value, COUNT(*) AS count
        FROM tickets t {{WHERE}} GROUP BY t.status`),
      run('overdueStatus', `SELECT t.overdue_status AS value, COUNT(*) AS count
        FROM tickets t {{WHERE}} GROUP BY t.overdue_status`),
      run('priority', `SELECT t.priority AS value, COALESCE(MAX(t.priority_label), CAST(t.priority AS CHAR)) AS label, COUNT(*) AS count
        FROM tickets t {{WHERE}} AND t.priority IS NOT NULL GROUP BY t.priority ORDER BY t.priority DESC`),
      run('phase', `SELECT t.phase AS value, t.phase AS label, MIN(t.phase_id) AS phase_id, COUNT(*) AS count
        FROM tickets t {{WHERE}} AND t.phase IS NOT NULL AND TRIM(t.phase) <> '' GROUP BY t.phase ORDER BY phase_id ASC`),
      run('squad', `SELECT CASE WHEN t.squad IS NULL OR TRIM(t.squad) = '' THEN '__NONE__' ELSE t.squad END AS value,
          COALESCE(NULLIF(TRIM(t.squad), ''), 'Interno / Sem Squad') AS label, COUNT(*) AS count
        FROM tickets t {{WHERE}} GROUP BY value, label ORDER BY count DESC`),
      pool.query(
        `SELECT t.workspace AS value, t.workspace AS label, COUNT(*) AS count
         FROM tickets t
         WHERE (t.executor IN (?) OR t.squad = 'Briu')
           AND t.workspace IS NOT NULL AND TRIM(t.workspace) <> ''
         GROUP BY t.workspace
         ORDER BY t.workspace ASC`,
        [BRIU_EXECUTORS]
      ).then(([rows]) => rows),
      pool.query(`SELECT id, run_type, started_at, finished_at, status
        FROM sync_runs ORDER BY id DESC LIMIT 3`),
    ]);

  return { executors, requesters, statuses, slaStatuses, priorities, phases, squads, workspaces, syncRuns };
}

module.exports = {
  BRIU_EXECUTORS,
  normalizeTicketDataInDb,
  getFilterMetadata: getCascadingFilterMetadata,
  getDashboardData,
  getPaginatedTickets,
  getTicketDetail,
};
