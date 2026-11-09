require('dotenv').config();
const crypto = require('crypto');
const { getPool } = require('./db');
const { initSchema } = require('./schema');

const BASE_URL = (process.env.EKYTE_BASE_URL || 'https://api.ekyte.com').replace(/\/+$/, '');

const STATUS_LABELS = {
  1: 'Em atendimento',
  2: 'Aguardando solicitante',
  3: 'Resolvido',
  9: 'Cancelado',
};

const PRIORITY_LABELS = {
  10: 'Não priorizada',
  100: 'Baixa',
  200: 'Média',
  300: 'Alta',
  400: 'Urgente',
};

const SOURCE_LABELS = {
  1: 'Interno',
  2: 'Externo',
};

const TYPE_LABELS = {
  1: 'Solicitação',
  2: 'Dúvida',
  3: 'Correção',
  4: 'Orçamento',
  5: 'Melhoria',
};

const TIME_STATUS_LABELS = {
  10: 'Pendente (Timer iniciado)',
  20: 'Concluído',
  30: 'Cancelado',
};

const TASK_SITUATION_LABELS = {
  10: 'Ativas',
  20: 'Pausadas',
  30: 'Concluídas',
  40: 'Canceladas',
};

function toMySqlDateTime(val) {
  if (!val) return null;
  const d = new Date(val);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

function toMySqlDate(val) {
  if (!val) return null;
  const dt = toMySqlDateTime(val);
  return dt ? dt.slice(0, 10) : null;
}

function sha256(obj) {
  const str = typeof obj === 'string' ? obj : JSON.stringify(obj);
  return crypto.createHash('sha256').update(str).digest('hex');
}

function diffMinutes(startStr, endStr) {
  if (!startStr || !endStr) return null;
  const s = new Date(startStr);
  const e = new Date(endStr);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return null;
  return Math.round((e.getTime() - s.getTime()) / 60000);
}

async function fetchPage(endpointPath, params = {}, retries = 3) {
  const apiKey = process.env.EKYTE_API_KEY;
  if (!apiKey) {
    throw new Error('EKYTE_API_KEY não configurada no arquivo .env');
  }

  const url = new URL(`${BASE_URL}${endpointPath}`);
  url.searchParams.set('apiKey', apiKey);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') {
      url.searchParams.set(k, String(v));
    }
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });

      const text = await response.text();
      let json;
      try {
        json = JSON.parse(text);
      } catch (e) {
        throw new Error(`Resposta não-JSON (${response.status}) em ${endpointPath}: ${text.slice(0, 300)}`);
      }

      if (json && json.error) {
        throw new Error(
          `Erro API eKyte em ${endpointPath}: [${json.error.code || json.error.id}] ${json.error.message} ${json.error.details || ''}`
        );
      }

      return json;
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
  }
}

async function fetchAllPages(endpointPath, baseParams = {}, onPage = null) {
  let page = 1;
  let totalPages = 1;
  let totalItems = 0;

  while (page <= totalPages) {
    const json = await fetchPage(endpointPath, { ...baseParams, page });
    const items = Array.isArray(json?.data) ? json.data : [];

    if (json?.paging?.totalPages) {
      totalPages = Number(json.paging.totalPages);
    } else if (items.length === 0) {
      break;
    }

    if (onPage && items.length > 0) {
      await onPage(items, page, totalPages);
    }

    totalItems += items.length;
    if (!json?.paging || items.length === 0) {
      break;
    }
    page++;
  }

  return totalItems;
}

function computeTicketMetrics(t, nowIso) {
  const createdIn = toMySqlDateTime(t.createdIn);
  const expectDueDate = toMySqlDateTime(t.expectDueDate);
  const concludedIn = toMySqlDateTime(t.concludedIn);
  const status = Number(t.status || 0);

  let isOverdue = 0;
  let overdueStatus = 'SEM_PRAZO';
  let delayMinutes = null;

  // No eKyte, expectDueDate é uma data (dia previsto de entrega, vindo como 03:00:00 ou 06:00:00 UTC).
  // Consideramos o prazo como até o fim do dia previsto (23:59:59 da data de entrega).
  const dueEndOfDay = expectDueDate ? `${expectDueDate.slice(0, 10)} 23:59:59` : null;

  if (dueEndOfDay) {
    if (status === 3 && concludedIn) {
      if (concludedIn.slice(0, 10) > expectDueDate.slice(0, 10)) {
        isOverdue = 1;
        overdueStatus = 'ENTREGUE_COM_ATRASO';
        delayMinutes = diffMinutes(dueEndOfDay, concludedIn);
      } else {
        isOverdue = 0;
        overdueStatus = 'NO_PRAZO';
        delayMinutes = diffMinutes(dueEndOfDay, concludedIn);
      }
    } else if (status === 1 || status === 2) {
      if (nowIso.slice(0, 10) > expectDueDate.slice(0, 10)) {
        isOverdue = 1;
        overdueStatus = 'ATRASADO_ABERTO';
        delayMinutes = diffMinutes(dueEndOfDay, nowIso);
      } else {
        isOverdue = 0;
        overdueStatus = 'NO_PRAZO';
        delayMinutes = diffMinutes(dueEndOfDay, nowIso);
      }
    } else {
      overdueStatus = 'NO_PRAZO';
    }
  }

  const endRef = concludedIn || (status === 1 || status === 2 ? nowIso : null);
  const leadTimeMinutes = createdIn && endRef ? diffMinutes(createdIn, endRef) : null;

  return {
    createdIn,
    expectDueDate,
    concludedIn,
    isOverdue,
    overdueStatus,
    delayMinutes,
    leadTimeMinutes,
  };
}

const KNOWN_TICKET_KEYS = new Set([
  'id', 'subject', 'link', 'workspaceId', 'workspace', 'squadId', 'squad', 'tags',
  'status', 'createdIn', 'expectDueDate', 'concludedIn', 'priority', 'priorityGroup',
  'source', 'type', 'reopenCount', 'reOpenCount', 'createdById', 'createdBy',
  'requesterById', 'requesterBy', 'requestById', 'requestBy', 'executorId', 'executor',
  'executorEmail', 'phaseId', 'phase', 'actualTime', 'timeFirstResponse',
  'iterations', 'ticketIteration', 'comments'
]);

function buildPhaseStaysFromIterations(ticketId, createdIn, concludedIn, currentPhase, status, ticketIterations, nowIso) {
  const phaseIters = ticketIterations
    .filter((it) => {
      const f = String(it.field || '').toLowerCase();
      const a = String(it.action || '').toLowerCase();
      return (f.includes('etapa') || f.includes('phase') || a.includes('etapa')) && it.when;
    })
    .map((it) => ({
      from: it.from || null,
      to: it.to || null,
      whenAt: toMySqlDateTime(it.when),
      id: Number(it.id || 0),
    }))
    .filter((it) => it.whenAt)
    .sort((a, b) => (a.whenAt === b.whenAt ? a.id - b.id : a.whenAt.localeCompare(b.whenAt)));

  const stays = [];
  if (phaseIters.length > 0) {
    const first = phaseIters[0];
    if (first.from && createdIn) {
      stays.push({
        phaseName: String(first.from),
        enteredAt: createdIn,
        exitedAt: first.whenAt,
      });
    }
    for (let i = 0; i < phaseIters.length; i++) {
      const cur = phaseIters[i];
      const next = phaseIters[i + 1];
      const phaseName = String(cur.to || cur.from || currentPhase || 'Não informada');
      const enteredAt = cur.whenAt || createdIn || nowIso;
      const exitedAt = next
        ? next.whenAt
        : status === 3 || status === 9
        ? concludedIn || nowIso
        : null;
      stays.push({ phaseName, enteredAt, exitedAt });
    }
  } else if (currentPhase) {
    stays.push({
      phaseName: String(currentPhase),
      enteredAt: createdIn || nowIso,
      exitedAt: status === 3 || status === 9 ? concludedIn || nowIso : null,
    });
  }

  return stays.map((s, idx) => {
    const isCurrent = idx === stays.length - 1 && !s.exitedAt ? 1 : 0;
    const endRef = s.exitedAt || nowIso;
    const duration = Math.max(0, diffMinutes(s.enteredAt, endRef) || 0);
    return [
      ticketId,
      idx + 1,
      s.phaseName,
      s.enteredAt,
      s.exitedAt,
      duration,
      isCurrent,
      'ITERATION',
      nowIso,
    ];
  });
}

async function syncTickets(pool, syncRunId, nowIso) {
  let upserted = 0;
  let iterationsUpserted = 0;
  let commentsUpserted = 0;
  let changesLogged = 0;

  // Carrega mapa de estado atual de todos os tickets já no banco em 1 única query rápida
  const [existingRows] = await pool.query(`
    SELECT t.id, t.status, t.phase_id, t.phase, t.executor_id, t.executor, t.priority,
           t.expect_due_date, t.concluded_in, t.actual_time, t.reopen_count,
           t.iterations_count, t.payload_hash,
           COALESCE(h.max_ver, 0) AS max_ver
    FROM tickets t
    LEFT JOIN (
      SELECT ticket_id, MAX(version_number) AS max_ver
      FROM ticket_state_history
      GROUP BY ticket_id
    ) h ON h.ticket_id = t.id
  `);
  const existingMap = new Map(existingRows.map((r) => [Number(r.id), r]));

  const discoveredUsers = new Map();

  await fetchAllPages(
    '/v1.1/tickets',
    {
      status: 0, // 0 = Todos (Em atendimento, Aguardando, Resolvido, Cancelado)
      iterations: true,
      includeComments: 1,
    },
    async (items, page, totalPages) => {
      console.log(`[Tickets] Processando página ${page}/${totalPages} (${items.length} tickets)...`);

      const ticketValues = [];
      const iterationValues = [];
      const commentValues = [];
      const phaseStayValues = [];
      const pageTicketIds = [];
      const changedTicketIdsForHistoryClose = [];
      const historyInsertValues = [];
      const fieldChangeValues = [];

      for (const t of items) {
        const ticketId = Number(t.id);
        if (!ticketId) continue;
        pageTicketIds.push(ticketId);

        const metrics = computeTicketMetrics(t, nowIso);
        const comments = Array.isArray(t.comments) ? t.comments : [];
        const ticketIterations = Array.isArray(t.ticketIteration) ? t.ticketIteration : [];

        // Coleta usuários vistos nos tickets
        if (t.executorId) {
          discoveredUsers.set(String(t.executorId), {
            id: String(t.executorId),
            name: t.executor || null,
            email: t.executorEmail || null,
          });
        }
        if (t.createdById) {
          discoveredUsers.set(String(t.createdById), {
            id: String(t.createdById),
            name: t.createdBy || null,
            email: discoveredUsers.get(String(t.createdById))?.email || null,
          });
        }

        let lastCommentAt = null;
        let lastCommentBy = null;
        let lastCommentSource = null;
        for (const c of comments) {
          const cDate = toMySqlDateTime(c.date);
          if (cDate && (!lastCommentAt || cDate > lastCommentAt)) {
            lastCommentAt = cDate;
            lastCommentBy = c.user || null;
            lastCommentSource = c.source || null;
          }
          if (c.userId) {
            discoveredUsers.set(String(c.userId), {
              id: String(c.userId),
              name: c.user || null,
              email: c.userEmail || null,
            });
          }
        }

        const extraFields = {};
        for (const [k, v] of Object.entries(t)) {
          if (!KNOWN_TICKET_KEYS.has(k)) {
            extraFields[k] = v;
          }
        }

        const responsibleId = t.responsibleId || t.ownerId || t.attendantId || null;
        const responsible = t.responsible || t.owner || t.attendant || null;
        const tagsStr = Array.isArray(t.tags) ? t.tags.join(', ') : t.tags ?? null;

        const coreState = {
          subject: t.subject ?? null,
          workspaceId: t.workspaceId ?? null,
          workspace: t.workspace ?? null,
          squadId: t.squadId ?? null,
          squad: t.squad ?? null,
          tags: tagsStr,
          status: t.status ?? null,
          expectDueDate: metrics.expectDueDate,
          concludedIn: metrics.concludedIn,
          priority: t.priority ?? null,
          priorityGroup: t.priorityGroup ?? null,
          source: t.source ?? null,
          type: t.type ?? null,
          reopenCount: Number(t.reopenCount ?? t.reOpenCount ?? 0),
          requesterById: t.requesterById ?? t.requestById ?? null,
          requesterBy: t.requesterBy ?? t.requestBy ?? null,
          executorId: t.executorId ?? null,
          executor: t.executor ?? null,
          phaseId: t.phaseId ?? null,
          phase: t.phase ?? null,
          actualTime: Number(t.actualTime ?? 0),
          timeFirstResponse: t.timeFirstResponse ?? null,
          iterationsCount: Number(t.iterations ?? 0),
          commentsCount: comments.length,
        };

        const payloadHash = sha256(coreState);
        const rawJsonStr = JSON.stringify(t);

        ticketValues.push([
          ticketId,
          t.subject ?? null,
          t.link ?? null,
          t.workspaceId ?? null,
          t.workspace ?? null,
          t.squadId ?? null,
          t.squad ?? null,
          tagsStr,
          t.status ?? null,
          STATUS_LABELS[t.status] || null,
          metrics.createdIn,
          metrics.expectDueDate,
          metrics.concludedIn,
          t.priority ?? null,
          PRIORITY_LABELS[t.priority] || null,
          t.priorityGroup ?? null,
          t.source ?? null,
          SOURCE_LABELS[t.source] || null,
          t.type ?? null,
          TYPE_LABELS[t.type] || null,
          coreState.reopenCount,
          t.createdById !== undefined && t.createdById !== null ? String(t.createdById) : null,
          t.createdBy ?? null,
          coreState.requesterById !== null ? String(coreState.requesterById) : null,
          coreState.requesterBy,
          coreState.executorId !== null ? String(coreState.executorId) : null,
          coreState.executor,
          t.executorEmail ?? null,
          responsibleId !== null ? String(responsibleId) : null,
          responsible,
          coreState.phaseId,
          coreState.phase,
          coreState.actualTime,
          coreState.timeFirstResponse,
          coreState.iterationsCount,
          coreState.commentsCount,
          lastCommentAt,
          lastCommentBy,
          lastCommentSource,
          metrics.isOverdue,
          metrics.overdueStatus,
          metrics.delayMinutes,
          metrics.leadTimeMinutes,
          JSON.stringify(extraFields),
          rawJsonStr,
          payloadHash,
          nowIso,
          nowIso,
          nowIso,
        ]);

        // Verifica mudanças para SCD Type 2 + Auditoria
        const existing = existingMap.get(ticketId);
        if (!existing || existing.payload_hash !== payloadHash) {
          let nextVer = 1;
          if (existing) {
            nextVer = Number(existing.max_ver || 1) + 1;
            changedTicketIdsForHistoryClose.push(ticketId);

            const trackedDiffs = [
              ['status', existing.status, coreState.status],
              ['phase', existing.phase, coreState.phase],
              ['executor', existing.executor, coreState.executor],
              ['priority', existing.priority, coreState.priority],
              ['expect_due_date', toMySqlDateTime(existing.expect_due_date), metrics.expectDueDate],
              ['concluded_in', toMySqlDateTime(existing.concluded_in), metrics.concludedIn],
              ['actual_time', existing.actual_time, coreState.actualTime],
              ['reopen_count', existing.reopen_count, coreState.reopenCount],
              ['iterations_count', existing.iterations_count, coreState.iterationsCount],
            ];

            for (const [fieldName, oldVal, newVal] of trackedDiffs) {
              const sOld = oldVal === null || oldVal === undefined ? null : String(oldVal);
              const sNew = newVal === null || newVal === undefined ? null : String(newVal);
              if (sOld !== sNew) {
                fieldChangeValues.push([ticketId, syncRunId, nowIso, fieldName, sOld, sNew]);
              }
            }
          }

          historyInsertValues.push([
            ticketId,
            nextVer,
            syncRunId,
            t.status ?? null,
            STATUS_LABELS[t.status] || null,
            coreState.phaseId,
            coreState.phase,
            coreState.executorId !== null ? String(coreState.executorId) : null,
            coreState.executor,
            coreState.priority,
            metrics.expectDueDate,
            metrics.concludedIn,
            coreState.actualTime,
            coreState.reopenCount,
            coreState.iterationsCount,
            metrics.isOverdue,
            metrics.overdueStatus,
            payloadHash,
            rawJsonStr,
            existing ? nowIso : metrics.createdIn || nowIso,
            null,
            1,
          ]);
        }

        // Iterações do ticket
        for (const it of ticketIterations) {
          const whenAt = toMySqlDateTime(it.when);
          const itHash = sha256({
            id: it.id ?? '',
            ticketId,
            field: it.field ?? '',
            from: it.from ?? '',
            to: it.to ?? '',
            when: whenAt ?? it.when ?? '',
            action: it.action ?? '',
          });

          iterationValues.push([
            it.id ? Number(it.id) : null,
            itHash,
            ticketId,
            it.field ?? null,
            it.from !== undefined && it.from !== null ? String(it.from) : null,
            it.to !== undefined && it.to !== null ? String(it.to) : null,
            whenAt,
            it.action ?? null,
            JSON.stringify(it),
            nowIso,
          ]);
        }

        // Tempo em cada etapa (Phase Stays)
        const stays = buildPhaseStaysFromIterations(
          ticketId,
          metrics.createdIn,
          metrics.concludedIn,
          coreState.phase,
          t.status,
          ticketIterations,
          nowIso
        );
        for (const st of stays) {
          phaseStayValues.push(st);
        }

        // Comentários
        for (let idx = 0; idx < comments.length; idx++) {
          const c = comments[idx];
          const commentId = c.id
            ? Number(c.id)
            : Number(BigInt('0x' + sha256(`${ticketId}-${c.date}-${c.userId}-${idx}`).slice(0, 14)));

          commentValues.push([
            commentId,
            ticketId,
            c.userId !== undefined && c.userId !== null ? String(c.userId) : null,
            c.user ?? null,
            c.userEmail ?? null,
            toMySqlDateTime(c.date),
            c.description ?? null,
            c.source ?? null,
            JSON.stringify(c),
            nowIso,
            nowIso,
          ]);
        }
      }

      // 1. Bulk Upsert Tickets
      if (ticketValues.length > 0) {
        await pool.query(
          `INSERT INTO tickets (
            id, subject, link, workspace_id, workspace, squad_id, squad, tags,
            status, status_label, created_in, expect_due_date, concluded_in,
            priority, priority_label, priority_group, source, source_label,
            type, type_label, reopen_count, created_by_id, created_by,
            requester_by_id, requester_by, executor_id, executor, executor_email,
            responsible_id, responsible, phase_id, phase, actual_time,
            time_first_response, iterations_count, comments_count,
            last_comment_at, last_comment_by, last_comment_source,
            is_overdue, overdue_status, delay_minutes, lead_time_minutes,
            extra_fields, raw_json, payload_hash, first_seen_at, last_seen_at, updated_at
          ) VALUES ?
          ON DUPLICATE KEY UPDATE
            subject = VALUES(subject),
            link = VALUES(link),
            workspace_id = VALUES(workspace_id),
            workspace = VALUES(workspace),
            squad_id = VALUES(squad_id),
            squad = VALUES(squad),
            tags = VALUES(tags),
            status = VALUES(status),
            status_label = VALUES(status_label),
            created_in = VALUES(created_in),
            initial_expect_due_date = COALESCE(initial_expect_due_date, VALUES(expect_due_date)),
            is_due_date_altered = IF(
              initial_expect_due_date IS NOT NULL 
              AND VALUES(expect_due_date) IS NOT NULL 
              AND DATE(initial_expect_due_date) <> DATE(VALUES(expect_due_date)),
              1,
              is_due_date_altered
            ),
            due_date_changes_count = IF(
              expect_due_date IS NOT NULL 
              AND VALUES(expect_due_date) IS NOT NULL 
              AND DATE(expect_due_date) <> DATE(VALUES(expect_due_date)),
              due_date_changes_count + 1,
              due_date_changes_count
            ),
            last_due_date_change_at = IF(
              expect_due_date IS NOT NULL 
              AND VALUES(expect_due_date) IS NOT NULL 
              AND DATE(expect_due_date) <> DATE(VALUES(expect_due_date)),
              VALUES(updated_at),
              last_due_date_change_at
            ),
            expect_due_date = VALUES(expect_due_date),
            concluded_in = VALUES(concluded_in),
            priority = VALUES(priority),
            priority_label = VALUES(priority_label),
            priority_group = VALUES(priority_group),
            source = VALUES(source),
            source_label = VALUES(source_label),
            type = VALUES(type),
            type_label = VALUES(type_label),
            reopen_count = VALUES(reopen_count),
            created_by_id = VALUES(created_by_id),
            created_by = VALUES(created_by),
            requester_by_id = VALUES(requester_by_id),
            requester_by = VALUES(requester_by),
            executor_id = VALUES(executor_id),
            executor = VALUES(executor),
            executor_email = VALUES(executor_email),
            responsible_id = VALUES(responsible_id),
            responsible = VALUES(responsible),
            phase_id = VALUES(phase_id),
            phase = VALUES(phase),
            actual_time = VALUES(actual_time),
            time_first_response = VALUES(time_first_response),
            iterations_count = VALUES(iterations_count),
            comments_count = VALUES(comments_count),
            last_comment_at = VALUES(last_comment_at),
            last_comment_by = VALUES(last_comment_by),
            last_comment_source = VALUES(last_comment_source),
            is_overdue = VALUES(is_overdue),
            overdue_status = VALUES(overdue_status),
            delay_minutes = VALUES(delay_minutes),
            lead_time_minutes = VALUES(lead_time_minutes),
            extra_fields = VALUES(extra_fields),
            raw_json = VALUES(raw_json),
            payload_hash = VALUES(payload_hash),
            last_seen_at = VALUES(last_seen_at),
            updated_at = IF(payload_hash <> VALUES(payload_hash), VALUES(updated_at), updated_at)`,
          [ticketValues]
        );
        upserted += ticketValues.length;
      }

      // 2. Bulk Insert Field Changes & SCD2 History
      if (fieldChangeValues.length > 0) {
        await pool.query(
          `INSERT INTO ticket_field_changes (ticket_id, sync_run_id, changed_at, field_name, old_value, new_value) VALUES ?`,
          [fieldChangeValues]
        );
        changesLogged += fieldChangeValues.length;
      }

      if (changedTicketIdsForHistoryClose.length > 0) {
        await pool.query(
          `UPDATE ticket_state_history SET valid_to = ?, is_current = 0
           WHERE ticket_id IN (?) AND is_current = 1`,
          [nowIso, changedTicketIdsForHistoryClose]
        );
      }

      if (historyInsertValues.length > 0) {
        await pool.query(
          `INSERT INTO ticket_state_history (
            ticket_id, version_number, sync_run_id, status, status_label,
            phase_id, phase, executor_id, executor, priority,
            expect_due_date, concluded_in, actual_time, reopen_count,
            iterations_count, is_overdue, overdue_status, payload_hash,
            raw_json, valid_from, valid_to, is_current
          ) VALUES ?`,
          [historyInsertValues]
        );
      }

      // 3. Bulk Insert Iterations
      if (iterationValues.length > 0) {
        await pool.query(
          `INSERT IGNORE INTO ticket_iterations (
            iteration_id, iteration_hash, ticket_id, field_name, from_value, to_value,
            when_at, action_name, raw_json, captured_at
          ) VALUES ?`,
          [iterationValues]
        );
        iterationsUpserted += iterationValues.length;
      }

      // 4. Bulk Replace Phase Stays para os tickets da página
      if (pageTicketIds.length > 0) {
        await pool.query(`DELETE FROM ticket_phase_stays WHERE ticket_id IN (?)`, [pageTicketIds]);
      }
      if (phaseStayValues.length > 0) {
        await pool.query(
          `INSERT INTO ticket_phase_stays (
            ticket_id, sequence_order, phase_name, entered_at, exited_at,
            duration_minutes, is_current_phase, source_type, updated_at
          ) VALUES ?`,
          [phaseStayValues]
        );
      }

      // 5. Bulk Upsert Comments
      if (commentValues.length > 0) {
        await pool.query(
          `INSERT INTO ticket_comments (
            id, ticket_id, user_id, user_name, user_email,
            comment_date, description, source, raw_json, captured_at, updated_at
          ) VALUES ?
          ON DUPLICATE KEY UPDATE
            description = VALUES(description),
            source = VALUES(source),
            raw_json = VALUES(raw_json),
            updated_at = VALUES(updated_at)`,
          [commentValues]
        );
        commentsUpserted += commentValues.length;
      }
    }
  );

  // Salva usuários descobertos nos tickets/comentários
  if (discoveredUsers.size > 0) {
    const userVals = Array.from(discoveredUsers.values()).map((u) => [
      u.id,
      u.email,
      u.name,
      null,
      null,
      null,
      null,
      null,
      null,
      JSON.stringify(u),
      nowIso,
    ]);
    await pool.query(
      `INSERT INTO users (id, email, name, username, profile_company, position_id, position, invited_in, hourly_rate, raw_json, updated_at)
       VALUES ?
       ON DUPLICATE KEY UPDATE
         email = COALESCE(VALUES(email), email),
         name = COALESCE(VALUES(name), name),
         updated_at = VALUES(updated_at)`,
      [userVals]
    );
  }

  return { upserted, iterationsUpserted, commentsUpserted, changesLogged };
}

async function syncTimeTrackings(pool, nowIso) {
  let upserted = 0;

  await fetchAllPages(
    '/v1.0/time-trackings',
    { createdFrom: '2015-01-01' },
    async (items, page, totalPages) => {
      console.log(`[TimeTrackings] Processando página ${page}/${totalPages} (${items.length} apontamentos)...`);

      const values = [];
      for (const tt of items) {
        const id = Number(tt.id);
        if (!id) continue;

        const createdIn = toMySqlDateTime(tt.createdIn);
        const startDate = toMySqlDateTime(tt.startDate);
        const endDate = toMySqlDateTime(tt.endDate);
        const referenceDate = toMySqlDate(tt.startDate || tt.createdIn);

        values.push([
          id,
          Number(tt.effort || 0),
          tt.timer ? 1 : 0,
          tt.workspaceId ?? null,
          tt.workspace ?? null,
          tt.squadId ?? null,
          tt.squad ?? null,
          tt.status ?? null,
          TIME_STATUS_LABELS[tt.status] || null,
          createdIn,
          startDate,
          endDate,
          referenceDate,
          tt.comment ?? null,
          tt.ctcTaskId ?? null,
          tt.ctcTask ?? null,
          tt.ctcTaskQuantity ?? null,
          tt.ctcTaskTypeId ?? null,
          tt.ctcTaskType ?? null,
          tt.executorId !== undefined && tt.executorId !== null ? String(tt.executorId) : null,
          tt.executor ?? null,
          tt.accomplishedHourlyRate ?? null,
          tt.phaseId ?? null,
          tt.phase ?? null,
          tt.planningId ?? null,
          tt.planning ?? null,
          tt.adId ?? null,
          tt.ad ?? null,
          tt.adSetId ?? null,
          tt.adSet ?? null,
          tt.ticketId ?? null,
          tt.ticket ?? null,
          JSON.stringify(tt),
          nowIso,
          nowIso,
        ]);
      }

      if (values.length > 0) {
        await pool.query(
          `INSERT INTO time_trackings (
            id, effort, timer, workspace_id, workspace, squad_id, squad, status, status_label,
            created_in, start_date, end_date, reference_date, comment,
            ctc_task_id, ctc_task, ctc_task_quantity, ctc_task_type_id, ctc_task_type,
            executor_id, executor, accomplished_hourly_rate,
            phase_id, phase, planning_id, planning,
            ad_id, ad, ad_set_id, ad_set, ticket_id, ticket,
            raw_json, first_seen_at, updated_at
          ) VALUES ?
          ON DUPLICATE KEY UPDATE
            effort = VALUES(effort),
            timer = VALUES(timer),
            workspace_id = VALUES(workspace_id),
            workspace = VALUES(workspace),
            squad_id = VALUES(squad_id),
            squad = VALUES(squad),
            status = VALUES(status),
            status_label = VALUES(status_label),
            start_date = VALUES(start_date),
            end_date = VALUES(end_date),
            reference_date = VALUES(reference_date),
            comment = VALUES(comment),
            ctc_task_id = VALUES(ctc_task_id),
            ctc_task = VALUES(ctc_task),
            ctc_task_quantity = VALUES(ctc_task_quantity),
            ctc_task_type_id = VALUES(ctc_task_type_id),
            ctc_task_type = VALUES(ctc_task_type),
            executor_id = VALUES(executor_id),
            executor = VALUES(executor),
            accomplished_hourly_rate = VALUES(accomplished_hourly_rate),
            phase_id = VALUES(phase_id),
            phase = VALUES(phase),
            ticket_id = VALUES(ticket_id),
            ticket = VALUES(ticket),
            raw_json = VALUES(raw_json),
            updated_at = VALUES(updated_at)`,
          [values]
        );
        upserted += values.length;
      }
    }
  );

  // Atualiza a soma de minutos apontados diretamente nos tickets
  await pool.query(`
    UPDATE tickets t
    LEFT JOIN (
      SELECT ticket_id, SUM(effort) AS total_effort
      FROM time_trackings
      WHERE ticket_id IS NOT NULL AND (status IS NULL OR status <> 30)
      GROUP BY ticket_id
    ) tt ON tt.ticket_id = t.id
    SET t.time_tracked_sum = COALESCE(tt.total_effort, 0)
  `);

  return upserted;
}

async function syncAuxiliaryEndpoints(pool, nowIso) {
  const counts = {
    squads: 0,
    workspaces: 0,
    tags: 0,
    taskTypes: 0,
    projects: 0,
  };

  // Squads
  try {
    await fetchAllPages('/v1.0/squads', {}, async (items) => {
      const vals = items
        .filter((s) => Number(s.Id ?? s.id))
        .map((s) => [Number(s.Id ?? s.id), s.Name ?? s.name ?? null, JSON.stringify(s), nowIso]);
      if (vals.length > 0) {
        await pool.query(
          `INSERT INTO squads (id, name, raw_json, updated_at) VALUES ?
           ON DUPLICATE KEY UPDATE name = VALUES(name), raw_json = VALUES(raw_json), updated_at = VALUES(updated_at)`,
          [vals]
        );
        counts.squads += vals.length;
      }
    });
  } catch (e) {
    console.warn('[Squads] Aviso:', e.message);
  }

  // Workspaces
  try {
    await fetchAllPages('/v1.0/workspaces', {}, async (items) => {
      const vals = items
        .filter((w) => Number(w.Id ?? w.id))
        .map((w) => {
          const squadObj = typeof w.squad === 'object' && w.squad ? w.squad : {};
          const squadName = typeof w.squad === 'string' ? w.squad : squadObj.name ?? squadObj.Name ?? null;
          return [
            Number(w.Id ?? w.id),
            w.Name ?? w.name ?? null,
            w.squadId ?? w.SquadId ?? squadObj.id ?? squadObj.Id ?? null,
            squadName,
            w.Active ?? w.active ?? null,
            w.Description ?? w.description ?? null,
            w.ExternalId ?? w.externalId ?? null,
            JSON.stringify(w),
            nowIso,
          ];
        });
      if (vals.length > 0) {
        await pool.query(
          `INSERT INTO workspaces (id, name, squad_id, squad_name, active, description, external_id, raw_json, updated_at)
           VALUES ?
           ON DUPLICATE KEY UPDATE
             name = VALUES(name), squad_id = VALUES(squad_id), squad_name = VALUES(squad_name),
             active = VALUES(active), description = VALUES(description), external_id = VALUES(external_id),
             raw_json = VALUES(raw_json), updated_at = VALUES(updated_at)`,
          [vals]
        );
        counts.workspaces += vals.length;
      }
    });
  } catch (e) {
    console.warn('[Workspaces] Aviso:', e.message);
  }

  // Tags
  try {
    await fetchAllPages('/v1.0/tags', {}, async (items) => {
      const vals = items
        .filter((tg) => Number(tg.Id ?? tg.id))
        .map((tg) => [
          Number(tg.Id ?? tg.id),
          tg.Name ?? tg.name ?? null,
          tg.Type ?? tg.type ?? null,
          JSON.stringify(tg),
          nowIso,
        ]);
      if (vals.length > 0) {
        await pool.query(
          `INSERT INTO tags (id, name, type, raw_json, updated_at) VALUES ?
           ON DUPLICATE KEY UPDATE name = VALUES(name), type = VALUES(type), raw_json = VALUES(raw_json), updated_at = VALUES(updated_at)`,
          [vals]
        );
        counts.tags += vals.length;
      }
    });
  } catch (e) {
    console.warn('[Tags] Aviso:', e.message);
  }

  // Task Types
  try {
    await fetchAllPages('/v1.0/task-types', {}, async (items) => {
      const vals = items
        .filter((tt) => Number(tt.Id ?? tt.id))
        .map((tt) => {
          const wf = tt.Workflow || tt.workflow || {};
          const grp = tt.CtcTaskTypeGroup || tt.ctcTaskTypeGroup || {};
          return [
            Number(tt.Id ?? tt.id),
            tt.Name ?? tt.name ?? null,
            tt.Description ?? tt.description ?? null,
            tt.WorkflowId ?? tt.workflowId ?? wf.Id ?? wf.id ?? null,
            wf.Name ?? wf.name ?? null,
            tt.CtcTaskTypeGroupId ?? grp.Id ?? grp.id ?? null,
            grp.Name ?? grp.name ?? null,
            JSON.stringify(tt),
            nowIso,
          ];
        });
      if (vals.length > 0) {
        await pool.query(
          `INSERT INTO task_types (id, name, description, workflow_id, workflow_name, group_id, group_name, raw_json, updated_at)
           VALUES ?
           ON DUPLICATE KEY UPDATE
             name = VALUES(name), description = VALUES(description),
             workflow_id = VALUES(workflow_id), workflow_name = VALUES(workflow_name),
             group_id = VALUES(group_id), group_name = VALUES(group_name),
             raw_json = VALUES(raw_json), updated_at = VALUES(updated_at)`,
          [vals]
        );
        counts.taskTypes += vals.length;
      }
    });
  } catch (e) {
    console.warn('[TaskTypes] Aviso:', e.message);
  }

  // Projects
  try {
    await fetchAllPages('/v1.1/projects', { createdFrom: '2015-01-01' }, async (items, page, totalPages) => {
      console.log(`[Projects] Processando página ${page}/${totalPages} (${items.length} projetos)...`);
      const vals = items
        .filter((p) => Number(p.id ?? p.Id))
        .map((p) => [
          Number(p.id ?? p.Id),
          p.name ?? null,
          p.alias ?? null,
          p.link ?? null,
          p.workspaceId ?? null,
          p.workspace ?? null,
          p.squadId ?? null,
          p.squad ?? null,
          toMySqlDate(p.startDate),
          toMySqlDate(p.endDate),
          p.plannedTasksCount ?? null,
          p.accomplishedTasksCount ?? null,
          p.plannedTasksTime ?? null,
          p.accomplishedTasksTime ?? null,
          p.expectedEffort ?? null,
          p.situation ?? null,
          p.createdById !== undefined && p.createdById !== null ? String(p.createdById) : null,
          p.createdBy ?? null,
          Array.isArray(p.tags) ? p.tags.join(', ') : p.tags ?? null,
          toMySqlDateTime(p.createdIn),
          p.planned ?? null,
          JSON.stringify(p),
          nowIso,
        ]);
      if (vals.length > 0) {
        await pool.query(
          `INSERT INTO projects (
            id, name, alias, link, workspace_id, workspace, squad_id, squad, start_date, end_date,
            planned_tasks_count, accomplished_tasks_count, planned_tasks_time, accomplished_tasks_time,
            expected_effort, situation, created_by_id, created_by, tags, created_in, planned, raw_json, updated_at
          ) VALUES ?
          ON DUPLICATE KEY UPDATE
            name = VALUES(name), alias = VALUES(alias), workspace_id = VALUES(workspace_id),
            workspace = VALUES(workspace), squad_id = VALUES(squad_id), squad = VALUES(squad),
            start_date = VALUES(start_date), end_date = VALUES(end_date),
            planned_tasks_count = VALUES(planned_tasks_count), accomplished_tasks_count = VALUES(accomplished_tasks_count),
            planned_tasks_time = VALUES(planned_tasks_time), accomplished_tasks_time = VALUES(accomplished_tasks_time),
            expected_effort = VALUES(expected_effort), situation = VALUES(situation),
            tags = VALUES(tags), planned = VALUES(planned), raw_json = VALUES(raw_json), updated_at = VALUES(updated_at)`,
          [vals]
        );
        counts.projects += vals.length;
      }
    });
  } catch (e) {
    console.warn('[Projects] Aviso:', e.message);
  }

  return counts;
}

async function runFullSync(runType = 'HOURLY') {
  await initSchema();
  const pool = getPool();
  const nowIso = toMySqlDateTime(new Date());

  const [runRes] = await pool.query(
    `INSERT INTO sync_runs (run_type, started_at, status) VALUES (?, ?, 'RUNNING')`,
    [runType, nowIso]
  );
  const syncRunId = runRes.insertId;

  try {
    console.log(`[Sync #${syncRunId}] Iniciando coleta completa (${runType}) em ${nowIso}...`);

    const auxCounts = await syncAuxiliaryEndpoints(pool, nowIso);
    const ticketStats = await syncTickets(pool, syncRunId, nowIso);
    const timeTrackingsCount = await syncTimeTrackings(pool, nowIso);

    const summary = {
      ...auxCounts,
      tickets: ticketStats.upserted,
      ticketIterations: ticketStats.iterationsUpserted,
      ticketComments: ticketStats.commentsUpserted,
      ticketChangesLogged: ticketStats.changesLogged,
      timeTrackings: timeTrackingsCount,
    };

    const totalUpserted =
      auxCounts.squads +
      auxCounts.workspaces +
      auxCounts.tags +
      auxCounts.taskTypes +
      auxCounts.projects +
      ticketStats.upserted +
      timeTrackingsCount;

    const finishedIso = toMySqlDateTime(new Date());
    await pool.query(
      `UPDATE sync_runs
       SET finished_at = ?, status = 'SUCCESS', endpoints_summary = ?,
           total_records_upserted = ?, total_changes_logged = ?
       WHERE id = ?`,
      [finishedIso, JSON.stringify(summary), totalUpserted, ticketStats.changesLogged, syncRunId]
    );

    console.log(`[Sync #${syncRunId}] Concluído com sucesso! Resumo:`, summary);
    return summary;
  } catch (err) {
    const finishedIso = toMySqlDateTime(new Date());
    await pool.query(
      `UPDATE sync_runs SET finished_at = ?, status = 'ERROR', error_message = ? WHERE id = ?`,
      [finishedIso, err.message, syncRunId]
    );
    console.error(`[Sync #${syncRunId}] Erro durante sincronização:`, err.message);
    throw err;
  }
}

if (require.main === module) {
  runFullSync('MANUAL')
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { runFullSync };
