import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import './briuDashboard.css';

export default function PageBriuDashboard() {
  const containerRef = useRef(null);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const API_BASE = '/api/bi';

    // Estado local da página do dashboard
    const state = {
      status: 'all',
      executor: 'all',
      workspace: 'all',
      requester: 'all',
      overdueStatus: 'all',
      priority: 'all',
      squad: 'all',
      phase: 'all',
      preset: 'thisWeek',
      startDate: '',
      endDate: '',
      dateField: 'created_in',
      granularity: 'day',
      search: '',
      page: 1,
      pageSize: 25,
      sortBy: 'created_in',
      sortDir: 'DESC',
    };

    let chartTimelineInst = null;
    let chartSlaInst = null;
    let refreshTimer = null;
    let currentWorkspacesList = [];
    let isDestroyed = false;

    // Helpers com escopo no container da página
    const $ = (sel) => root.querySelector(sel);
    const $$ = (sel) => Array.from(root.querySelectorAll(sel));

    function esc(str) {
      if (str === null || str === undefined) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    function fmtNum(n) {
      if (n === null || n === undefined || isNaN(n)) return '0';
      return Number(n).toLocaleString('pt-BR');
    }

    function fmtDec(n, d = 1) {
      if (n === null || n === undefined || isNaN(n)) return '0';
      return Number(n).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
    }

    function fmtDate(dt) {
      if (!dt) return '—';
      try {
        const d = new Date(dt);
        if (isNaN(d.getTime())) return '—';
        return d.toLocaleDateString('pt-BR');
      } catch {
        return '—';
      }
    }

    function fmtDateTime(dt) {
      if (!dt) return '—';
      try {
        const d = new Date(dt);
        if (isNaN(d.getTime())) return '—';
        return d.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      } catch {
        return '—';
      }
    }

    function fmtDuration(minutes) {
      const m = Math.round(Number(minutes) || 0);
      if (m <= 0) return '0 min';
      const days = Math.floor(m / (60 * 24));
      const hours = Math.floor((m % (60 * 24)) / 60);
      const mins = m % 60;
      const parts = [];
      if (days > 0) parts.push(`${days}d`);
      if (hours > 0) parts.push(`${hours}h`);
      if (days === 0 && mins > 0) parts.push(`${mins}m`);
      return parts.join(' ') || '< 1m';
    }

    function fmtHours(m) {
      const mins = Number(m) || 0;
      return `${(mins / 60).toFixed(1)}h`;
    }

    function cleanName(n) {
      return String(n || '')
        .replace(/@.*$/, '')
        .replace(/\s*\|\s*.*$/, '')
        .trim();
    }

    function getInitials(n) {
      const c = cleanName(n);
      const parts = c.split(/\s+/).filter(Boolean);
      if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
      if (parts.length === 1 && parts[0].length >= 2) return parts[0].slice(0, 2).toUpperCase();
      return '??';
    }

    function localIso(d) {
      const pad = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    }

    function getWeekRange(refDate, weekOffset = 0) {
      const d = new Date(refDate);
      const day = d.getDay();
      const diffToMon = day === 0 ? -6 : 1 - day;
      const mon = new Date(d);
      mon.setDate(d.getDate() + diffToMon + weekOffset * 7);
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);
      return { start: localIso(mon), end: localIso(sun) };
    }

    async function fetchJSON(url, opts) {
      const res = await fetch(url, opts);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Erro HTTP ${res.status}`);
      }
      return res.json();
    }

    function showToast(msg) {
      const t = $('#toastMessage');
      if (!t) return;
      t.textContent = msg;
      t.classList.add('show');
      setTimeout(() => {
        if (!isDestroyed) t.classList.remove('show');
      }, 3500);
    }

    function buildQueryString(extra = {}) {
      const q = { ...state, ...extra };
      const params = new URLSearchParams();

      if (q.status && q.status !== 'all') params.set('status', q.status);
      if (q.executor && q.executor !== 'all') params.set('executor', q.executor);
      if (q.workspace && q.workspace !== 'all') params.set('workspace', q.workspace);
      if (q.requester && q.requester !== 'all') params.set('requester', q.requester);
      if (q.overdueStatus && q.overdueStatus !== 'all') params.set('overdueStatus', q.overdueStatus);
      if (q.priority && q.priority !== 'all') params.set('priority', q.priority);
      if (q.squad && q.squad !== 'all') params.set('squad', q.squad);
      if (q.phase && q.phase !== 'all') params.set('phase', q.phase);

      if (q.startDate) params.set('startDate', q.startDate);
      if (q.endDate) params.set('endDate', q.endDate);
      if (q.dateField) params.set('dateField', q.dateField);
      if (q.granularity) params.set('granularity', q.granularity);
      if (q.search && q.search.trim()) params.set('search', q.search.trim());

      if (extra.page !== undefined) params.set('page', extra.page);
      else params.set('page', q.page);

      if (extra.pageSize !== undefined) params.set('pageSize', extra.pageSize);
      else params.set('pageSize', q.pageSize);

      if (q.sortBy) params.set('sortBy', q.sortBy);
      if (q.sortDir) params.set('sortDir', q.sortDir);

      return params.toString();
    }

    function scheduleRefresh() {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        if (isDestroyed) return;
        renderActiveChips();
        loadDashboardData();
        loadTicketsTable();
      }, 40);
    }

    function handlePeriodPresetChange(preset) {
      state.preset = preset;
      const customDates = $('#customDatesGroup');
      const startInp = $('#inputStartDate');
      const endInp = $('#inputEndDate');
      const granSel = $('#selectGranularity');

      if (preset === 'custom') {
        customDates.style.display = 'flex';
        state.granularity = 'day';
        granSel.value = 'day';
        scheduleRefresh();
        return;
      }

      customDates.style.display = 'none';
      const now = new Date();

      if (preset === 'thisWeek') {
        const w = getWeekRange(now, 0);
        state.startDate = w.start;
        state.endDate = w.end;
        state.granularity = 'day';
      } else if (preset === 'lastWeek') {
        const w = getWeekRange(now, -1);
        state.startDate = w.start;
        state.endDate = w.end;
        state.granularity = 'day';
      } else if (preset === 'today') {
        const iso = localIso(now);
        state.startDate = iso;
        state.endDate = iso;
        state.granularity = 'day';
      } else if (preset === 'yesterday') {
        const y = new Date(now);
        y.setDate(now.getDate() - 1);
        const iso = localIso(y);
        state.startDate = iso;
        state.endDate = iso;
        state.granularity = 'day';
      } else if (preset === '7d') {
        const past = new Date(now);
        past.setDate(now.getDate() - 6);
        state.startDate = localIso(past);
        state.endDate = localIso(now);
        state.granularity = 'day';
      } else if (preset === '14d') {
        const past = new Date(now);
        past.setDate(now.getDate() - 13);
        state.startDate = localIso(past);
        state.endDate = localIso(now);
        state.granularity = 'day';
      } else if (preset === '30d') {
        const past = new Date(now);
        past.setDate(now.getDate() - 29);
        state.startDate = localIso(past);
        state.endDate = localIso(now);
        state.granularity = 'day';
      } else if (preset === 'thisMonth') {
        const y = now.getFullYear();
        const m = now.getMonth();
        state.startDate = localIso(new Date(y, m, 1));
        state.endDate = localIso(new Date(y, m + 1, 0));
        state.granularity = 'day';
      } else if (preset === 'lastMonth') {
        const y = now.getFullYear();
        const m = now.getMonth() - 1;
        state.startDate = localIso(new Date(y, m, 1));
        state.endDate = localIso(new Date(y, m + 1, 0));
        state.granularity = 'day';
      } else if (preset === 'thisYear') {
        const y = now.getFullYear();
        state.startDate = `${y}-01-01`;
        state.endDate = `${y}-12-31`;
        state.granularity = 'month';
      } else if (preset === 'all') {
        state.startDate = '';
        state.endDate = '';
        state.granularity = 'month';
      }

      startInp.value = state.startDate;
      endInp.value = state.endDate;
      granSel.value = state.granularity;
      scheduleRefresh();
    }

    async function loadFilterMetadata() {
      try {
        const meta = await fetchJSON(`${API_BASE}/filters?${buildQueryString()}`);
        if (isDestroyed) return;
        updateSyncStatus(meta);

        // Popula Executores
        const execSel = $('#selectExecutor');
        const prevExec = state.executor;
        execSel.innerHTML = `<option value="all">Todos os Executores</option>` +
          meta.executors.map((e) => `<option value="${esc(e.value)}">${esc(cleanName(e.label))} (${e.count})</option>`).join('');
        execSel.value = prevExec;

        // Popula Urgência
        const prioSel = $('#selectPriority');
        const prevPrio = state.priority;
        prioSel.innerHTML = `<option value="all">Todas as Urgências</option>` +
          meta.priorities.map((p) => `<option value="${p.value}">${esc(p.label)} (${p.count})</option>`).join('');
        prioSel.value = prevPrio;

        // Workspaces
        currentWorkspacesList = meta.workspaces || [];
        renderWorkspaceOptions();
        updateWorkspaceTriggerUI();
      } catch (err) {
        console.error('[Ekyte BI] Erro ao carregar filtros:', err);
      }
    }

    function updateWorkspaceTriggerUI() {
      const triggerLabel = $('#workspaceTriggerLabel');
      const triggerClear = $('#workspaceTriggerClear');
      if (!triggerLabel) return;

      if (!state.workspace || state.workspace === 'all') {
        triggerLabel.textContent = 'Todos os Workspaces / Clientes';
        triggerClear.style.display = 'none';
      } else {
        const found = currentWorkspacesList.find((w) => w.value === state.workspace);
        triggerLabel.textContent = found ? found.label : state.workspace;
        triggerClear.style.display = 'inline-block';
      }
    }

    function renderWorkspaceOptions(searchTerm = '') {
      const listEl = $('#workspaceOptionsList');
      const metaEl = $('#workspaceOptionsMeta');
      if (!listEl) return;

      const term = searchTerm.trim().toLowerCase();
      const filtered = term
        ? currentWorkspacesList.filter((w) => (w.label || w.value).toLowerCase().includes(term))
        : currentWorkspacesList;

      metaEl.textContent = `${filtered.length} workspace(s) encontrado(s)`;

      const allSelected = !state.workspace || state.workspace === 'all';
      let html = `
        <div class="dropdown-option ${allSelected ? 'selected' : ''}" data-value="all">
          <span class="dropdown-option-name"><b>Todos os Workspaces</b></span>
          <span class="dropdown-option-count">${currentWorkspacesList.reduce((acc, w) => acc + (w.count || 0), 0)}</span>
        </div>`;

      if (filtered.length === 0) {
        html += `<div class="dropdown-no-results">Nenhum workspace com "${esc(searchTerm)}"</div>`;
      } else {
        html += filtered
          .map((w) => {
            const isSel = state.workspace === w.value;
            return `
            <div class="dropdown-option ${isSel ? 'selected' : ''}" data-value="${esc(w.value)}" title="${esc(w.label)}">
              <span class="dropdown-option-name">${esc(w.label)}</span>
              <span class="dropdown-option-count">${w.count || 0}</span>
            </div>`;
          })
          .join('');
      }

      listEl.innerHTML = html;

      listEl.querySelectorAll('.dropdown-option').forEach((opt) => {
        opt.addEventListener('click', () => {
          setWorkspaceFilter(opt.dataset.value);
          closeWorkspaceDropdown();
        });
      });
    }

    function setWorkspaceFilter(val) {
      state.workspace = val;
      state.page = 1;
      updateWorkspaceTriggerUI();
      scheduleRefresh();
    }

    function openWorkspaceDropdown() {
      const wrap = $('#workspaceSearchableSelect');
      const drop = $('#workspaceDropdown');
      const input = $('#inputWorkspaceSearch');
      wrap.classList.add('open');
      drop.style.display = 'flex';
      input.value = '';
      $('#btnWorkspaceSearchClear').style.display = 'none';
      renderWorkspaceOptions('');
      setTimeout(() => input.focus(), 50);
    }

    function closeWorkspaceDropdown() {
      const wrap = $('#workspaceSearchableSelect');
      const drop = $('#workspaceDropdown');
      if (!wrap || !drop) return;
      wrap.classList.remove('open');
      drop.style.display = 'none';
    }

    function initWorkspaceSearchableSelect() {
      const trigger = $('#workspaceSelectTrigger');
      const clearBtn = $('#workspaceTriggerClear');
      const inputSearch = $('#inputWorkspaceSearch');
      const inputClear = $('#btnWorkspaceSearchClear');

      trigger?.addEventListener('click', (e) => {
        if (e.target.closest('#workspaceTriggerClear')) return;
        const isOpen = $('#workspaceSearchableSelect').classList.contains('open');
        if (isOpen) closeWorkspaceDropdown();
        else openWorkspaceDropdown();
      });

      clearBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        setWorkspaceFilter('all');
      });

      let debounceTimer = null;
      inputSearch?.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        const val = e.target.value;
        inputClear.style.display = val ? 'block' : 'none';
        debounceTimer = setTimeout(() => renderWorkspaceOptions(val), 180);
      });

      inputClear?.addEventListener('click', () => {
        inputSearch.value = '';
        inputClear.style.display = 'none';
        renderWorkspaceOptions('');
        inputSearch.focus();
      });

      const onDocClick = (e) => {
        if (!root.contains(e.target)) return;
        const selectWrap = $('#workspaceSearchableSelect');
        if (selectWrap && !selectWrap.contains(e.target)) {
          closeWorkspaceDropdown();
        }
      };
      document.addEventListener('click', onDocClick);
    }

    function renderActiveChips() {
      const chips = [];
      const periodLabels = {
        thisWeek: 'Esta Semana',
        lastWeek: 'Semana Anterior',
        today: 'Hoje',
        yesterday: 'Ontem',
        '7d': 'Últimos 7 dias',
        '14d': 'Últimos 14 dias',
        '30d': 'Últimos 30 dias',
        thisMonth: 'Este Mês',
        lastMonth: 'Mês Anterior',
        thisYear: 'Este Ano',
        custom: `${fmtDate(state.startDate)} a ${fmtDate(state.endDate)}`,
      };

      if (state.preset && state.preset !== 'all') {
        chips.push(`<span class="filter-chip">Período: <b>${periodLabels[state.preset] || state.preset}</b><button type="button" data-clear="period">✕</button></span>`);
      }

      if (state.status && state.status !== 'all') {
        const stLabels = { active: 'Em Aberto', resolved: 'Concluídos', canceled: 'Cancelados' };
        chips.push(`<span class="filter-chip">Situação: <b>${stLabels[state.status] || state.status}</b><button type="button" data-clear="status">✕</button></span>`);
      }

      const labelsMap = {
        executor: 'Executor',
        workspace: 'Workspace',
        overdueStatus: 'Prazo',
        priority: 'Urgência',
        phase: 'Etapa',
      };

      Object.entries(labelsMap).forEach(([k, label]) => {
        if (state[k] && state[k] !== 'all') {
          let valLabel = state[k];
          if (k === 'executor') valLabel = cleanName(valLabel);
          if (k === 'workspace' && currentWorkspacesList.length > 0) {
            const found = currentWorkspacesList.find((w) => w.value === state.workspace);
            if (found) valLabel = found.label || found.value;
          }
          if (k === 'overdueStatus') {
            const slaTexts = {
              NO_PRAZO: 'No Prazo',
              ALL_OVERDUE: 'Em Atraso (Todos)',
              ATRASADO_ABERTO: 'Atrasado em Aberto',
              ENTREGUE_COM_ATRASO: 'Entregue com Atraso',
              SEM_PRAZO: 'Sem Prazo',
            };
            valLabel = slaTexts[valLabel] || valLabel;
          }
          chips.push(`<span class="filter-chip">${label}: <b>${esc(valLabel)}</b><button type="button" data-clear="${k}">✕</button></span>`);
        }
      });

      if (state.search && state.search.trim()) {
        chips.push(`<span class="filter-chip">Busca: <b>"${esc(state.search.trim())}"</b><button type="button" data-clear="search">✕</button></span>`);
      }

      const container = $('#activeChipsContainer');
      const strip = $('#chipsStrip');
      if (!container || !strip) return;

      if (chips.length > 0) {
        container.innerHTML = chips.join('');
        strip.style.display = 'flex';
      } else {
        container.innerHTML = '';
        strip.style.display = 'none';
      }
    }

    function clearFilter(k) {
      if (k === 'period') {
        state.preset = 'all';
        state.startDate = '';
        state.endDate = '';
        state.granularity = 'month';
        $('#selectPeriodPreset').value = 'all';
        $('#customDatesGroup').style.display = 'none';
        $('#inputStartDate').value = '';
        $('#inputEndDate').value = '';
        $('#selectGranularity').value = 'month';
      } else if (k === 'status') {
        state.status = 'all';
        $('#selectStatus').value = 'all';
      } else if (k === 'search') {
        state.search = '';
        $('#inputGlobalSearch').value = '';
      } else if (k === 'workspace') {
        setWorkspaceFilter('all');
        return;
      } else {
        state[k] = 'all';
        const sel = $(`[data-key="${k}"]`);
        if (sel) sel.value = 'all';
      }
      state.page = 1;
      scheduleRefresh();
    }

    function clearAllFilters() {
      state.status = 'all';
      state.executor = 'all';
      state.workspace = 'all';
      state.requester = 'all';
      state.overdueStatus = 'all';
      state.priority = 'all';
      state.squad = 'all';
      state.phase = 'all';
      state.preset = 'all';
      state.startDate = '';
      state.endDate = '';
      state.search = '';
      state.page = 1;

      $('#selectPeriodPreset').value = 'all';
      $('#customDatesGroup').style.display = 'none';
      $('#inputStartDate').value = '';
      $('#inputEndDate').value = '';
      $('#selectStatus').value = 'all';
      $('#inputGlobalSearch').value = '';
      $$('select[data-key]').forEach((s) => (s.value = 'all'));
      updateWorkspaceTriggerUI();

      scheduleRefresh();
    }

    function renderKpiCards(k) {
      const cards = [
        {
          title: 'Tickets no Filtro',
          value: fmtNum(k.totalTickets),
          sub: `<b>${fmtNum(k.resolvedTickets)}</b> concluídos · <b>${fmtNum(k.canceledTickets)}</b> cancelados`,
          color: 'var(--color-primary, #e92e30)',
        },
        {
          title: 'Em Aberto Agora',
          value: fmtNum(k.openTickets),
          sub: `<b>${fmtNum(k.inProgressTickets)}</b> em atendimento · <b>${fmtNum(k.waitingTickets)}</b> aguardando`,
          color: '#f59e0b',
        },
        {
          title: 'SLA (No Prazo)',
          value: `${fmtDec(k.slaComplianceRate, 1)}<small>%</small>`,
          sub: `<b>${fmtNum(k.resolvedOnTimeCount)}</b> de <b>${fmtNum(k.resolvedWithDueCount)}</b> com prazo`,
          color: '#22c55e',
        },
        {
          title: 'Em Atraso',
          value: fmtNum(k.totalOverdueCount),
          sub: `<b>${fmtNum(k.deliveredLateCount)}</b> entregues tarde · <b>${fmtNum(k.openOverdueCount)}</b> vencidos`,
          color: '#ef4444',
        },
        {
          title: 'Tempo Médio de Execução',
          value: `${fmtDec(k.avgLeadTimeDays, 1)}<small>dias</small>`,
          sub: `Lead time médio · <b>${fmtDec(k.avgLeadTimeHours, 0)} horas</b>`,
          color: '#8b5cf6',
        },
        {
          title: 'Horas Apontadas',
          value: `${fmtNum(Math.round(k.totalHours))}<small>h</small>`,
          sub: `<b>${fmtNum(k.urgentTicketsCount)}</b> urgentes · <b>${fmtNum(k.highPriorityCount)}</b> alta`,
          color: '#06b6d4',
        },
      ];

      const kpisSection = $('#kpisSection');
      if (kpisSection) {
        kpisSection.innerHTML = cards
          .map(
            (c) => `
            <div class="kpi-card" style="--kpi-color: ${c.color}">
              <div class="kpi-title"><i style="background:${c.color}"></i>${c.title}</div>
              <div class="kpi-value">${c.value}</div>
              <div class="kpi-sub">${c.sub}</div>
            </div>`
          )
          .join('');
      }

      const activeResult = $('#activeResultCount');
      if (activeResult) {
        activeResult.textContent = `Total: ${fmtNum(k.totalTickets)} chamados`;
      }
    }

    function renderTimelineChart(data) {
      const ctx = $('#chartTimeline');
      if (!ctx) return;

      const series = data.createdSeries || [];
      const labels = series.map((s) => {
        if (data.granularity === 'day' && s.bucket && s.bucket.length === 10) {
          const parts = s.bucket.split('-');
          const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
          const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
          return `${parts[2]}/${parts[1]} (${days[d.getDay()]})`;
        }
        if (data.granularity === 'month' && s.bucket && s.bucket.length === 7) {
          const parts = s.bucket.split('-');
          const d = new Date(Number(parts[0]), Number(parts[1]) - 1, 1);
          return d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', '');
        }
        return s.bucket;
      });
      const onTimeData = series.map((s) => Number(s.no_prazo || 0));
      const lateData = series.map((s) => Number(s.atrasados || 0));

      const granNames = { day: 'dia', week: 'semana', month: 'mês', year: 'ano' };
      const labelGran = $('#labelGranularity');
      if (labelGran) labelGran.textContent = granNames[data.granularity] || 'mês';

      if (chartTimelineInst) {
        chartTimelineInst.destroy();
      }

      const isLight = document.documentElement.dataset.theme === 'light';
      const textColor = isLight ? '#525252' : '#a3a3a3';
      const gridColor = isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)';

      chartTimelineInst = new Chart(ctx, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'No Prazo',
              data: onTimeData,
              backgroundColor: '#22c55e',
              borderRadius: 4,
              stack: 'main',
            },
            {
              label: 'Em Atraso',
              data: lateData,
              backgroundColor: '#e92e30',
              borderRadius: 4,
              stack: 'main',
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: isLight ? '#fff' : '#18181b',
              titleColor: isLight ? '#171717' : '#fff',
              bodyColor: isLight ? '#525252' : '#d4d4d8',
              borderColor: isLight ? '#e5e5e5' : '#27272a',
              borderWidth: 1,
              padding: 10,
            },
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { color: textColor, font: { family: 'Inter', size: 11 } },
            },
            y: {
              stacked: true,
              grid: { color: gridColor },
              ticks: { color: textColor, font: { family: 'Inter', size: 11 } },
            },
          },
          onClick: (e, elements) => {
            if (!elements.length) return;
            const idx = elements[0].index;
            const bucket = series[idx]?.bucket;
            if (bucket) drillToBucket(bucket);
          },
        },
      });
    }

    function drillToBucket(bucket) {
      let s = bucket;
      let e = bucket;
      let g = 'day';

      if (/^\d{4}$/.test(bucket)) {
        s = `${bucket}-01-01`;
        e = `${bucket}-12-31`;
        g = 'month';
      } else if (/^\d{4}-\d{2}$/.test(bucket)) {
        const [yy, mm] = bucket.split('-').map(Number);
        s = `${bucket}-01`;
        e = localIso(new Date(yy, mm, 0));
      }

      state.preset = 'custom';
      state.startDate = s;
      state.endDate = e;
      state.granularity = g;
      state.page = 1;

      $('#selectPeriodPreset').value = 'custom';
      $('#customDatesGroup').style.display = 'flex';
      $('#inputStartDate').value = s;
      $('#inputEndDate').value = e;
      $('#selectGranularity').value = g;

      scheduleRefresh();
    }

    function renderSlaChart(k) {
      const ctx = $('#chartSla');
      if (!ctx) return;

      const onTime = Number(k.onTimeCount || 0);
      const late = Number(k.totalOverdueCount || 0);
      const noDue = Number(k.withoutDueDateCount || 0);
      const total = onTime + late + noDue;

      const slaDisp = $('#slaPercentageDisplay');
      if (slaDisp) slaDisp.textContent = `${fmtDec(k.slaComplianceRate, 1)}%`;

      if (chartSlaInst) {
        chartSlaInst.destroy();
      }

      chartSlaInst = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['No Prazo', 'Em Atraso', 'Sem Prazo'],
          datasets: [
            {
              data: [onTime, late, noDue],
              backgroundColor: ['#22c55e', '#e92e30', '#737373'],
              borderWidth: 0,
              hoverOffset: 4,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '76%',
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (c) => ` ${c.label}: ${fmtNum(c.raw)} (${total > 0 ? ((c.raw / total) * 100).toFixed(1) : 0}%)`,
              },
            },
          },
          onClick: (e, elements) => {
            if (!elements.length) return;
            const idx = elements[0].index;
            const keys = ['NO_PRAZO', 'ALL_OVERDUE', 'SEM_PRAZO'];
            state.overdueStatus = keys[idx] || 'all';
            state.page = 1;
            $('#selectSla').value = state.overdueStatus;
            scheduleRefresh();
          },
        },
      });

      const slaLegend = $('#slaLegendList');
      if (slaLegend) {
        slaLegend.innerHTML = `
          <div class="legend-item-row" data-sla="NO_PRAZO">
            <div class="legend-item-label"><i style="background:#22c55e"></i>No Prazo</div>
            <div class="legend-item-value">${fmtNum(onTime)} <span style="font-size:11px;color:var(--text-dim)">(${total > 0 ? ((onTime / total) * 100).toFixed(0) : 0}%)</span></div>
          </div>
          <div class="legend-item-row" data-sla="ALL_OVERDUE">
            <div class="legend-item-label"><i style="background:#e92e30"></i>Em Atraso</div>
            <div class="legend-item-value">${fmtNum(late)} <span style="font-size:11px;color:var(--text-dim)">(${total > 0 ? ((late / total) * 100).toFixed(0) : 0}%)</span></div>
          </div>
          <div class="legend-item-row" data-sla="SEM_PRAZO">
            <div class="legend-item-label"><i style="background:#737373"></i>Sem Prazo Definido</div>
            <div class="legend-item-value">${fmtNum(noDue)} <span style="font-size:11px;color:var(--text-dim)">(${total > 0 ? ((noDue / total) * 100).toFixed(0) : 0}%)</span></div>
          </div>
        `;

        slaLegend.querySelectorAll('.legend-item-row').forEach((row) => {
          row.addEventListener('click', () => {
            const sla = row.dataset.sla;
            state.overdueStatus = state.overdueStatus === sla ? 'all' : sla;
            state.page = 1;
            $('#selectSla').value = state.overdueStatus;
            scheduleRefresh();
          });
        });
      }
    }

    function renderExecutorsRanking(list) {
      const container = $('#executorsRankingList');
      if (!container) return;
      if (!list.length) {
        container.innerHTML = `<div class="empty-state-notice">Nenhum ticket encontrado para os filtros atuais</div>`;
        return;
      }

      container.innerHTML = list
        .map((item) => {
          const isSelected = state.executor === item.executor;
          const total = Number(item.total_tickets || 0);
          const ok = Number(item.no_prazo || 0);
          const late = Number(item.total_atrasados || 0);
          const none = Math.max(0, total - ok - late);

          const okPct = total > 0 ? (ok / total) * 100 : 0;
          const latePct = total > 0 ? (late / total) * 100 : 0;
          const nonePct = total > 0 ? (none / total) * 100 : 0;

          return `
          <div class="rank-row-item ${isSelected ? 'selected' : ''}" data-executor="${esc(item.executor)}">
            <div class="rank-avatar">${getInitials(item.executor)}</div>
            <div class="rank-item-info">
              <div class="rank-item-header">
                <span class="rank-item-name" title="${esc(item.executor)}">${esc(cleanName(item.executor))}</span>
                <span class="rank-item-badge">${fmtNum(total)} tickets</span>
              </div>
              <div class="stacked-sla-bar">
                <div class="bar-segment ok" style="width: ${okPct}%" title="No Prazo: ${fmtNum(ok)}"></div>
                <div class="bar-segment late" style="width: ${latePct}%" title="Em Atraso: ${fmtNum(late)}"></div>
                <div class="bar-segment none" style="width: ${nonePct}%" title="Sem Prazo: ${fmtNum(none)}"></div>
              </div>
            </div>
            <div class="rank-item-stats">
              <div class="stat-cell">
                <b style="color: ${late > 0 ? 'var(--late)' : 'inherit'}">${fmtNum(late)}</b>
                <span>atraso</span>
              </div>
              <div class="stat-cell">
                <b>${fmtDec(item.avg_lead_time_days || 0, 1)}d</b>
                <span>médio</span>
              </div>
            </div>
          </div>`;
        })
        .join('');

      container.querySelectorAll('.rank-row-item').forEach((row) => {
        row.addEventListener('click', () => {
          const exec = row.dataset.executor;
          state.executor = state.executor === exec ? 'all' : exec;
          state.page = 1;
          $('#selectExecutor').value = state.executor;
          scheduleRefresh();
        });
      });
    }

    function renderPrioritiesRanking(list) {
      const container = $('#prioritiesRankingList');
      if (!container) return;
      if (!list.length) {
        container.innerHTML = `<div class="empty-state-notice">Nenhum ticket encontrado para os filtros atuais</div>`;
        return;
      }

      container.innerHTML = list
        .map((item) => {
          const isSelected = String(state.priority) === String(item.priority);
          const total = Number(item.total || 0);
          const ok = Number(item.no_prazo || 0);
          const late = Number(item.atrasados || 0);
          const none = Math.max(0, total - ok - late);

          const okPct = total > 0 ? (ok / total) * 100 : 0;
          const latePct = total > 0 ? (late / total) * 100 : 0;
          const nonePct = total > 0 ? (none / total) * 100 : 0;

          return `
          <div class="rank-row-item ${isSelected ? 'selected' : ''}" data-prio="${item.priority}">
            <div class="rank-item-info">
              <div class="rank-item-header">
                <span class="rank-item-name">${esc(item.priority_label || 'Normal')}</span>
                <span class="rank-item-badge">${fmtNum(total)} tickets</span>
              </div>
              <div class="stacked-sla-bar">
                <div class="bar-segment ok" style="width: ${okPct}%"></div>
                <div class="bar-segment late" style="width: ${latePct}%"></div>
                <div class="bar-segment none" style="width: ${nonePct}%"></div>
              </div>
            </div>
            <div class="rank-item-stats">
              <div class="stat-cell">
                <b style="color: ${late > 0 ? 'var(--late)' : 'inherit'}">${fmtNum(late)}</b>
                <span>atraso</span>
              </div>
              <div class="stat-cell">
                <b>${fmtDec(item.avg_lead_time_days || 0, 1)}d</b>
                <span>médio</span>
              </div>
            </div>
          </div>`;
        })
        .join('');

      container.querySelectorAll('.rank-row-item').forEach((row) => {
        row.addEventListener('click', () => {
          const prio = row.dataset.prio;
          state.priority = String(state.priority) === String(prio) ? 'all' : prio;
          state.page = 1;
          $('#selectPriority').value = state.priority;
          scheduleRefresh();
        });
      });
    }

    function renderStagesFunnel(bottlenecks, stageTabs) {
      const container = $('#stagesFunnelContainer');
      if (!container) return;
      const phases = ['Triagem', 'Análise', 'Planejar', 'Produção', 'Entrega'];
      const colors = ['#737373', 'var(--color-primary, #e92e30)', '#f59e0b', '#8b5cf6', '#22c55e'];

      const bMap = {};
      bottlenecks.forEach((b) => (bMap[b.phase_name] = b));

      const tMap = {};
      stageTabs.forEach((t) => (tMap[t.phase] = t));

      const maxCount = Math.max(
        ...phases.map((p) => Number(bMap[p]?.tickets_na_etapa || tMap[p]?.total || 0)),
        1
      );

      container.innerHTML = phases
        .map((p, idx) => {
          const b = bMap[p] || {};
          const t = tMap[p] || {};
          const n = Number(b.tickets_na_etapa || t.total || 0);
          const widthPct = Math.max(6, (n / maxCount) * 100);
          const avgDays = b.avg_days_in_phase !== undefined ? `${fmtDec(b.avg_days_in_phase, 1)}d` : '—';
          const openCount = Number(t.total_ativos || 0);
          const isSelected = state.phase === p;

          return `
          <div class="funnel-stage-row ${isSelected ? 'selected' : ''}" data-stage="${p}">
            <span class="funnel-stage-name">${p}</span>
            <div class="funnel-track">
              <div class="funnel-fill" style="width: ${widthPct}%; background: ${colors[idx]}">
                ${fmtNum(n)}
              </div>
            </div>
            <div class="funnel-meta-stats">
              <div class="stat-cell">
                <b>${avgDays}</b>
                <span>tempo médio</span>
              </div>
              <div class="stat-cell">
                <b style="color: ${openCount > 0 ? 'var(--warn)' : 'inherit'}">${fmtNum(openCount)}</b>
                <span>em aberto</span>
              </div>
            </div>
          </div>`;
        })
        .join('');

      container.querySelectorAll('.funnel-stage-row').forEach((row) => {
        row.addEventListener('click', () => {
          const st = row.dataset.stage;
          state.phase = state.phase === st ? 'all' : st;
          state.page = 1;
          scheduleRefresh();
        });
      });
    }

    function renderWorkspacesRanking(list) {
      const container = $('#workspacesRankingList');
      if (!container) return;
      if (!list.length) {
        container.innerHTML = `<div class="empty-state-notice">Nenhum workspace encontrado</div>`;
        return;
      }

      container.innerHTML = list
        .map((w) => {
          const isSelected = state.workspace === w.workspace;
          const total = Number(w.total || 0);
          const late = Number(w.atrasados || 0);
          const ok = Number(w.no_prazo || 0);
          const okPct = total > 0 ? (ok / total) * 100 : 0;
          const latePct = total > 0 ? (late / total) * 100 : 0;
          const nonePct = Math.max(0, 100 - okPct - latePct);

          return `
          <div class="rank-row-item ${isSelected ? 'selected' : ''}" data-ws="${esc(w.workspace)}">
            <div class="rank-item-info">
              <div class="rank-item-header">
                <span class="rank-item-name" title="${esc(w.workspace)}">${esc(w.workspace)}</span>
                <span class="rank-item-badge">${fmtNum(total)} tickets</span>
              </div>
              <div class="stacked-sla-bar">
                <div class="bar-segment ok" style="width: ${okPct}%"></div>
                <div class="bar-segment late" style="width: ${latePct}%"></div>
                <div class="bar-segment none" style="width: ${nonePct}%"></div>
              </div>
            </div>
            <div class="rank-item-stats">
              <div class="stat-cell">
                <b style="color: ${late > 0 ? 'var(--late)' : 'inherit'}">${fmtNum(late)}</b>
                <span>atraso</span>
              </div>
              <div class="stat-cell">
                <b>${fmtDec(w.avg_lead_time_days || 0, 1)}d</b>
                <span>médio</span>
              </div>
            </div>
          </div>`;
        })
        .join('');

      container.querySelectorAll('.rank-row-item').forEach((row) => {
        row.addEventListener('click', () => {
          const ws = row.dataset.ws;
          const newVal = state.workspace === ws ? 'all' : ws;
          setWorkspaceFilter(newVal);
        });
      });
    }

    function renderTicketsTable(data) {
      const tbody = $('#ticketsTableBody');
      if (!tbody) return;

      const badge = $('#tableTotalBadge');
      if (badge) badge.textContent = fmtNum(data.total);

      const pageInfo = $('#paginationInfoText');
      if (pageInfo) {
        pageInfo.textContent = data.total
          ? `Página ${data.page} de ${Math.max(1, data.totalPages)} (${fmtNum(data.total)} chamados)`
          : 'Nenhum chamado encontrado';
      }

      const prevBtn = $('#btnPagePrev');
      if (prevBtn) prevBtn.disabled = data.page <= 1;
      const nextBtn = $('#btnPageNext');
      if (nextBtn) nextBtn.disabled = data.page >= data.totalPages;

      root.querySelectorAll('#ticketsTable th[data-sort]').forEach((th) => {
        const isSorted = th.dataset.sort === state.sortBy;
        th.classList.toggle('sorted', isSorted);
        const arrow = isSorted ? (state.sortDir === 'ASC' ? ' ↑' : ' ↓') : '';
        th.textContent = th.textContent.replace(/ [↑↓]$/, '') + arrow;
      });

      const rows = data.items || [];
      if (!rows.length) {
        tbody.innerHTML = `<tr><td colspan="10"><div class="empty-state-notice">Nenhum chamado corresponde aos filtros selecionados</div></td></tr>`;
        return;
      }

      tbody.innerHTML = rows
        .map((t) => {
          const delay = Number(t.delay_minutes || 0);
          const isOpen = Number(t.status) === 1 || Number(t.status) === 2;

          let slaBadge = `<span class="pill-tag sla-none">Sem Prazo</span>`;
          if (t.expect_due_date) {
            if (t.is_overdue) {
              slaBadge = `<span class="pill-tag sla-late">⚠️ Atrasado (+${fmtDuration(delay)})</span>`;
            } else {
              slaBadge = `<span class="pill-tag sla-ok">✓ No Prazo</span>`;
            }
          }

          let prioClass = 'prio-low';
          if (t.priority === 400) prioClass = 'prio-urgent';
          else if (t.priority === 300) prioClass = 'prio-high';
          else if (t.priority === 200) prioClass = 'prio-medium';

          const prioBadge = `<span class="pill-tag ${prioClass}">${esc(t.priority_label || 'Normal')}</span>`;
          const stageBadge = `<span class="pill-tag stage">${esc(t.phase || 'Sem Etapa')}</span>`;

          let statusBadge = `<span class="pill-tag status-canceled">Cancelado</span>`;
          if (t.status === 1) statusBadge = `<span class="pill-tag status-open">● Em Atendimento</span>`;
          else if (t.status === 2) statusBadge = `<span class="pill-tag status-open">⏳ Aguardando</span>`;
          else if (t.status === 3) statusBadge = `<span class="pill-tag status-resolved">✓ Resolvido</span>`;

          return `
          <tr data-ticket-id="${t.id}">
            <td class="table-cell-id">#${t.id}</td>
            <td>
              <div class="table-cell-subject" title="${esc(t.subject)}">${esc(t.subject || '(Sem assunto)')}</div>
              <div class="table-cell-sub" title="${esc(t.workspace)}">${esc(t.workspace || '—')} ${t.squad ? `· <span style="color:var(--primary)">${esc(t.squad)}</span>` : ''}</div>
            </td>
            <td>
              <div class="table-executor-cell">
                <div class="table-executor-avatar">${getInitials(t.executor)}</div>
                <span title="${esc(t.executor)}">${esc(cleanName(t.executor))}</span>
              </div>
            </td>
            <td><span title="${esc(t.requester_by)}">${esc(cleanName(t.requester_by))}</span></td>
            <td>${stageBadge}</td>
            <td>${prioBadge}</td>
            <td>
              <div style="display:flex;flex-direction:column;gap:3px">
                ${statusBadge}
                ${slaBadge}
              </div>
            </td>
            <td>${fmtDate(t.created_in)}</td>
            <td>
              <div style="font-weight:600">${fmtDate(t.expect_due_date)}</div>
              ${t.is_due_date_altered ? `<div class="pill-tag prio-high" style="margin-top:3px;font-size:9.5px;padding:1px 5px" title="Prazo original marcado era ${fmtDate(t.initial_expect_due_date)}">⚠️ Alterado (era ${fmtDate(t.initial_expect_due_date)})</div>` : ''}
            </td>
            <td class="th-right">
              <div style="font-weight:700">${fmtDuration(t.lead_time_minutes)}</div>
              <div class="table-cell-sub">${isOpen ? 'em aberto' : fmtHours(t.time_tracked_sum || t.actual_time || 0) + ' apont.'}</div>
            </td>
          </tr>`;
        })
        .join('');

      tbody.querySelectorAll('tr[data-ticket-id]').forEach((row) => {
        row.addEventListener('click', () => {
          showTicketDrawer(row.dataset.ticketId);
        });
      });
    }

    function openDrawerUI() {
      $('#ticketDrawer')?.classList.add('open');
      $('#ticketDrawerBackdrop')?.classList.add('open');
      $('#ticketDrawer')?.setAttribute('aria-hidden', 'false');
    }

    function closeDrawerUI() {
      $('#ticketDrawer')?.classList.remove('open');
      $('#ticketDrawerBackdrop')?.classList.remove('open');
      $('#ticketDrawer')?.setAttribute('aria-hidden', 'true');
    }

    async function showTicketDrawer(id) {
      openDrawerUI();
      const body = $('#ticketDrawerBody');
      if (!body) return;

      body.innerHTML = `
        <div style="padding:40px;text-align:center;color:var(--text-dim)">
          <div class="sync-icon spin" style="font-size:24px;margin-bottom:10px">↻</div>
          Carregando detalhes do chamado #${id}...
        </div>`;

      try {
        const data = await fetchJSON(`${API_BASE}/tickets/${id}`);
        if (isDestroyed) return;
        const t = data.ticket;
        const stays = data.phaseStays || [];
        const tts = data.timeTrackings || [];
        const comments = data.comments || [];
        const iterations = data.iterations || [];

        const isOpen = Number(t.status) === 1 || Number(t.status) === 2;
        const delay = Number(t.delay_minutes || 0);

        let slaText = 'Sem Prazo';
        let slaColor = 'var(--text-dim)';
        if (t.expect_due_date) {
          if (t.is_overdue) {
            slaText = `Atrasado (+${fmtDuration(delay)})`;
            slaColor = 'var(--late)';
          } else {
            slaText = 'Cumprido no Prazo';
            slaColor = 'var(--ok)';
          }
        }

        const allPhases = ['Triagem', 'Análise', 'Planejar', 'Produção', 'Entrega'];
        const currentPhase = t.phase || '';
        const currentIdx = allPhases.indexOf(currentPhase);

        const stepperHtml = allPhases
          .map((p, idx) => {
            let nodeClass = '';
            if (p === currentPhase) nodeClass = 'current';
            else if (currentIdx !== -1 && idx < currentIdx) nodeClass = 'completed';

            const stayInfo = stays.find((s) => s.phase_name === p);
            const stayDuration = stayInfo ? ` · ${fmtDuration(stayInfo.duration_minutes)}` : '';

            return `
              <div class="step-node ${nodeClass}">
                <span>${p}</span>${stayDuration}
              </div>
              ${idx < allPhases.length - 1 ? `<span class="step-arrow">→</span>` : ''}
            `;
          })
          .join('');

        body.innerHTML = `
          <div class="drawer-top-bar">
            <div style="display:flex;align-items:center;gap:8px">
              <span class="drawer-ticket-id">#${t.id}</span>
              ${t.status === 3 ? '<span class="pill-tag status-resolved">✓ Concluído</span>' : '<span class="pill-tag status-open">● Em Aberto</span>'}
            </div>
            <div class="drawer-top-actions">
              ${t.link ? `<a href="${esc(t.link)}" target="_blank" rel="noopener" class="btn btn-sm btn-primary">Abrir no eKyte ↗</a>` : ''}
              <button type="button" class="drawer-close-btn" id="btnCloseDrawer">✕</button>
            </div>
          </div>

          <div>
            <h2 class="drawer-title">${esc(t.subject || '(Sem assunto)')}</h2>
            <div class="drawer-badges-row" style="margin-top:8px">
              <span class="pill-tag stage">Etapa: ${esc(t.phase || '—')}</span>
              <span class="pill-tag ${t.priority === 400 ? 'prio-urgent' : 'prio-high'}">${esc(t.priority_label || 'Normal')}</span>
              <span class="pill-tag ${t.is_overdue ? 'sla-late' : 'sla-ok'}">${esc(slaText)}</span>
              ${t.is_due_date_altered ? `<span class="pill-tag prio-high" title="Prazo original: ${fmtDate(t.initial_expect_due_date)}">⚠️ Prazo Alterado (${t.due_date_changes_count || 1}x)</span>` : ''}
            </div>
          </div>

          ${t.is_due_date_altered ? `
          <div style="background: color-mix(in srgb, var(--warn) 12%, transparent); border: 1px solid color-mix(in srgb, var(--warn) 35%, transparent); border-radius: 8px; padding: 12px 16px; margin: 14px 0 6px; display: flex; align-items: flex-start; gap: 12px;">
            <div style="font-size: 20px; line-height: 1;">⚠️</div>
            <div style="flex: 1;">
              <div style="font-weight: 700; color: var(--warn); font-size: 13px; margin-bottom: 3px;">
                Alerta de Auditoria: Prazo Alterado pelo Executor (${t.due_date_changes_count || 1}x)
              </div>
              <div style="font-size: 12.5px; color: var(--text);">
                Prazo original inicial: <b style="text-decoration: line-through; opacity: 0.85;">${fmtDate(t.initial_expect_due_date)}</b>
                ➔ Novo prazo atual: <b style="color: var(--primary); font-size: 13px;">${fmtDate(t.expect_due_date)}</b>
              </div>
              ${t.last_due_date_change_at ? `<div style="font-size: 11px; color: var(--text-dim); margin-top: 4px;">Detectado em: ${fmtDateTime(t.last_due_date_change_at)}</div>` : ''}
            </div>
          </div>` : ''}

          <!-- Métricas Resumo -->
          <div class="drawer-metrics-strip">
            <div class="drawer-metric-card">
              <span class="drawer-metric-label">Tempo de Execução</span>
              <strong class="drawer-metric-val">${fmtDuration(t.lead_time_minutes)}</strong>
              <span class="drawer-metric-sub">${isOpen ? 'Em andamento' : 'Lead time final'}</span>
            </div>
            <div class="drawer-metric-card">
              <span class="drawer-metric-label">Prazo Atual ${t.is_due_date_altered ? '<span style="color:var(--warn);font-size:10px">⚠️</span>' : ''}</span>
              <strong class="drawer-metric-val" style="color:${slaColor}">${fmtDate(t.expect_due_date)}</strong>
              <span class="drawer-metric-sub">${t.is_due_date_altered ? `Original: ${fmtDate(t.initial_expect_due_date)}` : (t.is_overdue ? `Atraso de ${fmtDuration(delay)}` : 'Dentro do prazo')}</span>
            </div>
            <div class="drawer-metric-card">
              <span class="drawer-metric-label">Horas Apontadas</span>
              <strong class="drawer-metric-val">${fmtHours(t.time_tracked_sum || t.actual_time || 0)}</strong>
              <span class="drawer-metric-sub">${tts.length} registro(s)</span>
            </div>
            <div class="drawer-metric-card">
              <span class="drawer-metric-label">Etapa Atual</span>
              <strong class="drawer-metric-val" style="color:var(--primary)">${esc(t.phase || '—')}</strong>
              <span class="drawer-metric-sub">Fluxo operacional</span>
            </div>
          </div>

          <!-- Stepper Visual -->
          <div class="stage-stepper-box">
            <span class="stage-stepper-title">Progresso nas Etapas</span>
            <div class="stepper-pipeline">
              ${stepperHtml}
            </div>
          </div>

          <!-- Navegação por Abas do Drawer -->
          <div class="drawer-tabs-nav">
            <button type="button" class="drawer-tab-btn active" data-tab="tabGeral">Visão Geral</button>
            <button type="button" class="drawer-tab-btn" data-tab="tabHoras">Apontamentos (${tts.length})</button>
            <button type="button" class="drawer-tab-btn" data-tab="tabEtapas">Jornada (${stays.length})</button>
            <button type="button" class="drawer-tab-btn" data-tab="tabHistorico">Comentários & Histórico (${comments.length + iterations.length + (data.dueDateHistory || []).length})</button>
          </div>

          <!-- Aba 1: Geral -->
          <div class="drawer-tab-panel active" id="tabGeral">
            <div class="drawer-info-grid">
              <div class="info-field-item">
                <span class="info-field-label">Executor Responsável</span>
                <span class="info-field-value">${esc(cleanName(t.executor))}</span>
              </div>
              <div class="info-field-item">
                <span class="info-field-label">Solicitante</span>
                <span class="info-field-value">${esc(cleanName(t.requester_by))}</span>
              </div>
              <div class="info-field-item">
                <span class="info-field-label">Workspace / Cliente</span>
                <span class="info-field-value">${esc(t.workspace || '—')}</span>
              </div>
              <div class="info-field-item">
                <span class="info-field-label">Squad</span>
                <span class="info-field-value">${esc(t.squad || 'Interno')}</span>
              </div>
              <div class="info-field-item">
                <span class="info-field-label">Data de Abertura</span>
                <span class="info-field-value">${fmtDateTime(t.created_in)}</span>
              </div>
              <div class="info-field-item">
                <span class="info-field-label">Data de Conclusão</span>
                <span class="info-field-value">${fmtDateTime(t.concluded_in)}</span>
              </div>
              <div class="info-field-item">
                <span class="info-field-label">Prazo Original</span>
                <span class="info-field-value">${fmtDate(t.initial_expect_due_date || t.expect_due_date)}</span>
              </div>
              <div class="info-field-item">
                <span class="info-field-label">Prazo Atual Vigente</span>
                <span class="info-field-value" style="${t.is_due_date_altered ? 'color:var(--warn);font-weight:700' : ''}">
                  ${fmtDate(t.expect_due_date)} ${t.is_due_date_altered ? '⚠️ (Alterado)' : ''}
                </span>
              </div>
              <div class="info-field-item">
                <span class="info-field-label">Reagendamentos de Prazo</span>
                <span class="info-field-value">${t.due_date_changes_count || 0} alteração(ões)</span>
              </div>
              <div class="info-field-item">
                <span class="info-field-label">Reaberturas</span>
                <span class="info-field-value">${t.reopen_count || 0}</span>
              </div>
            </div>
          </div>

          <!-- Aba 2: Apontamentos de Horas -->
          <div class="drawer-tab-panel" id="tabHoras">
            <div class="drawer-list-items">
              ${tts.length > 0 ? tts.map(x => `
                <div class="drawer-card-item">
                  <div class="item-top-row">
                    <span class="item-main-title">${esc(cleanName(x.executor))} ${x.phase ? `· <span style="color:var(--text-dim)">${esc(x.phase)}</span>` : ''}</span>
                    <span class="pill-tag status-resolved">${fmtHours(x.effort)}</span>
                  </div>
                  <div class="item-date-text">${fmtDateTime(x.start_date || x.created_in)}</div>
                  ${x.comment ? `<div class="item-description-text">${esc(x.comment)}</div>` : ''}
                </div>
              `).join('') : '<div class="empty-state-notice">Nenhum apontamento de horas vinculado a este chamado.</div>'}
            </div>
          </div>

          <!-- Aba 3: Histórico de Etapas -->
          <div class="drawer-tab-panel" id="tabEtapas">
            <div class="drawer-list-items">
              ${stays.length > 0 ? stays.map(s => `
                <div class="drawer-card-item">
                  <div class="item-top-row">
                    <span class="item-main-title">${esc(s.phase_name)} ${s.is_current_phase ? '<span class="pill-tag stage">Atual</span>' : ''}</span>
                    <span style="font-weight:700;color:var(--primary)">${fmtDuration(s.duration_minutes)}</span>
                  </div>
                  <div class="item-date-text">Entrada: ${fmtDateTime(s.entered_at)} → Saída: ${s.exited_at ? fmtDateTime(s.exited_at) : 'Em andamento'}</div>
                </div>
              `).join('') : '<div class="empty-state-notice">Nenhum histórico de transição de etapas registrado.</div>'}
            </div>
          </div>

          <!-- Aba 4: Comentários & Auditoria -->
          <div class="drawer-tab-panel" id="tabHistorico">
            <div class="drawer-list-items">
              ${(data.dueDateHistory || []).length > 0 ? `
                <div style="margin-bottom: 14px;">
                  <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--warn); margin-bottom: 8px;">
                    ⚠️ Auditoria de Alterações de Prazo (${data.dueDateHistory.length})
                  </div>
                  ${data.dueDateHistory.map(h => `
                    <div class="drawer-card-item" style="border-left: 3px solid var(--warn); background: color-mix(in srgb, var(--warn) 8%, transparent); margin-bottom: 6px;">
                      <div class="item-top-row">
                        <span style="font-size: 12px; font-weight: 700; color: var(--warn);">Prazo Previsto Modificado</span>
                        <span class="item-date-text">${fmtDateTime(h.changed_at)}</span>
                      </div>
                      <div class="item-description-text">
                        Era: <b style="text-decoration: line-through; opacity: 0.8;">${fmtDate(h.old_value)}</b> ➔ Mudou para: <b style="color: var(--primary);">${fmtDate(h.new_value)}</b>
                      </div>
                    </div>
                  `).join('')}
                </div>
              ` : ''}
              ${comments.map(c => `
                <div class="drawer-card-item">
                  <div class="item-top-row">
                    <span class="item-main-title">${esc(cleanName(c.user_name))}</span>
                    <span class="item-date-text">${fmtDateTime(c.comment_date)}</span>
                  </div>
                  <div class="item-description-text">${esc(c.description || '').replace(/<[^>]*>/g, '')}</div>
                </div>
              `).join('')}
              ${iterations.map(it => `
                <div class="drawer-card-item" style="border-left:3px solid var(--border)">
                  <div class="item-top-row">
                    <span style="font-size:12px;font-weight:600">${esc(it.field_name || it.action_name || 'Alteração')}</span>
                    <span class="item-date-text">${fmtDateTime(it.when_at)}</span>
                  </div>
                  <div class="item-description-text">${esc(it.from_value || '—')} → <b style="color:var(--text)">${esc(it.to_value || '—')}</b></div>
                </div>
              `).join('')}
              ${comments.length === 0 && iterations.length === 0 && (!data.dueDateHistory || data.dueDateHistory.length === 0) ? '<div class="empty-state-notice">Nenhum comentário ou alteração registrada.</div>' : ''}
            </div>
          </div>
        `;

        $('#btnCloseDrawer')?.addEventListener('click', closeDrawerUI);

        body.querySelectorAll('.drawer-tab-btn').forEach((btn) => {
          btn.addEventListener('click', () => {
            body.querySelectorAll('.drawer-tab-btn').forEach((b) => b.classList.remove('active'));
            body.querySelectorAll('.drawer-tab-panel').forEach((p) => p.classList.remove('active'));
            btn.classList.add('active');
            body.querySelector(`#${btn.dataset.tab}`)?.classList.add('active');
          });
        });
      } catch (err) {
        body.innerHTML = `
          <div style="padding:30px;color:var(--late)">
            Erro ao carregar detalhes do chamado: ${esc(err.message)}
          </div>`;
      }
    }

    function updateSyncStatus(meta) {
      const syncRuns = meta.syncRuns || [];
      const last = syncRuns[0];
      const el = $('#syncStatusText');
      if (!el) return;

      if (meta.isSyncRunning) {
        el.innerHTML = `<span style="color:var(--warn)">● Sincronização em andamento...</span>`;
        return;
      }

      if (last) {
        el.innerHTML = `Última sincronização: <b>${fmtDateTime(last.finished_at || last.started_at)}</b> (${last.run_type})`;
      } else {
        el.textContent = 'Sincronização configurada (a cada 1 hora)';
      }
    }

    async function triggerSyncNow() {
      const btn = $('#btnSyncNow');
      if (!btn) return;
      const icon = btn.querySelector('.sync-icon');
      icon?.classList.add('spin');
      btn.disabled = true;

      try {
        const res = await fetchJSON(`${API_BASE}/sync-now`, { method: 'POST' });
        showToast(res.message || 'Sincronização iniciada!');
        setTimeout(() => {
          if (!isDestroyed) {
            icon?.classList.remove('spin');
            btn.disabled = false;
            scheduleRefresh();
          }
        }, 4000);
      } catch (err) {
        icon?.classList.remove('spin');
        btn.disabled = false;
        showToast(`Erro na sincronização: ${err.message}`);
      }
    }

    function exportCsv() {
      const qs = buildQueryString({ pageSize: 10000, page: 1 });
      window.open(`${API_BASE}/tickets/export?${qs}`, '_blank');
    }

    async function loadDashboardData() {
      try {
        const data = await fetchJSON(`${API_BASE}/dashboard?${buildQueryString()}`);
        if (isDestroyed) return;
        renderKpiCards(data.kpis);
        renderTimelineChart(data);
        renderSlaChart(data.kpis);
        renderExecutorsRanking(data.rankings.executors || []);
        renderPrioritiesRanking(data.rankings.priorities || []);
        renderStagesFunnel(data.bottlenecks || [], data.stageTabs || []);
        renderWorkspacesRanking(data.rankings.workspaces || []);
      } catch (err) {
        console.error('[Ekyte BI] Erro ao carregar dados do dashboard:', err);
      }
    }

    async function loadTicketsTable() {
      try {
        const data = await fetchJSON(`${API_BASE}/tickets?${buildQueryString()}`);
        if (isDestroyed) return;
        renderTicketsTable(data);
      } catch (err) {
        console.error('[Ekyte BI] Erro ao carregar tickets:', err);
      }
    }

    // Bind de eventos da interface
    $('#selectPeriodPreset')?.addEventListener('change', (e) => handlePeriodPresetChange(e.target.value));

    $('#inputStartDate')?.addEventListener('change', (e) => {
      state.startDate = e.target.value;
      scheduleRefresh();
    });
    $('#inputEndDate')?.addEventListener('change', (e) => {
      state.endDate = e.target.value;
      scheduleRefresh();
    });

    $('#selectDateField')?.addEventListener('change', (e) => {
      state.dateField = e.target.value;
      scheduleRefresh();
    });
    $('#selectGranularity')?.addEventListener('change', (e) => {
      state.granularity = e.target.value;
      scheduleRefresh();
    });

    $('#selectStatus')?.addEventListener('change', (e) => {
      state.status = e.target.value;
      state.page = 1;
      scheduleRefresh();
    });

    ['executor', 'overdueStatus', 'priority'].forEach((key) => {
      const el = $(`[data-key="${key}"]`);
      el?.addEventListener('change', (e) => {
        state[key] = e.target.value;
        state.page = 1;
        scheduleRefresh();
      });
    });

    initWorkspaceSearchableSelect();

    let searchTimer = null;
    $('#inputGlobalSearch')?.addEventListener('input', (e) => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        if (!isDestroyed) {
          state.search = e.target.value;
          state.page = 1;
          scheduleRefresh();
        }
      }, 350);
    });

    $('#activeChipsContainer')?.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-clear]');
      if (btn) clearFilter(btn.dataset.clear);
    });
    $('#btnClearAllFilters')?.addEventListener('click', clearAllFilters);

    root.querySelectorAll('#ticketsTable th[data-sort]').forEach((th) => {
      th.addEventListener('click', () => {
        const col = th.dataset.sort;
        if (state.sortBy === col) {
          state.sortDir = state.sortDir === 'ASC' ? 'DESC' : 'ASC';
        } else {
          state.sortBy = col;
          state.sortDir = 'DESC';
        }
        scheduleRefresh();
      });
    });

    $('#btnPagePrev')?.addEventListener('click', () => {
      if (state.page > 1) {
        state.page--;
        scheduleRefresh();
      }
    });
    $('#btnPageNext')?.addEventListener('click', () => {
      state.page++;
      scheduleRefresh();
    });
    $('#btnRefreshTable')?.addEventListener('click', scheduleRefresh);

    $('#btnSyncNow')?.addEventListener('click', triggerSyncNow);
    $('#btnExportCsv')?.addEventListener('click', exportCsv);

    $('#ticketDrawerBackdrop')?.addEventListener('click', closeDrawerUI);
    const onKeydown = (e) => {
      if (e.key === 'Escape') closeDrawerUI();
    };
    window.addEventListener('keydown', onKeydown);

    // Inicialização da semana corrente
    const now = new Date();
    const w = getWeekRange(now, 0);
    state.preset = 'thisWeek';
    state.startDate = w.start;
    state.endDate = w.end;
    state.granularity = 'day';
    state.status = 'all';

    if ($('#selectPeriodPreset')) $('#selectPeriodPreset').value = 'thisWeek';
    if ($('#inputStartDate')) $('#inputStartDate').value = w.start;
    if ($('#inputEndDate')) $('#inputEndDate').value = w.end;
    if ($('#selectGranularity')) $('#selectGranularity').value = 'day';
    if ($('#selectStatus')) $('#selectStatus').value = 'all';

    loadFilterMetadata();
    scheduleRefresh();

    return () => {
      isDestroyed = true;
      clearTimeout(refreshTimer);
      clearTimeout(searchTimer);
      window.removeEventListener('keydown', onKeydown);
      if (chartTimelineInst) chartTimelineInst.destroy();
      if (chartSlaInst) chartSlaInst.destroy();
    };
  }, []);

  return (
    <div className="briu-dash-wrapper" ref={containerRef}>
      {/* CABEÇALHO */}
      <header className="app-header">
        <div className="header-brand">
          <div className="brand-avatar">BRIU</div>
          <div className="brand-info">
            <div className="brand-title">
              <h1>BI Operacional — Time BRIU</h1>
              <span className="badge-tech">Tecnologia</span>
            </div>
            <p className="brand-sub" id="syncStatusText">Sincronização: carregando status...</p>
          </div>
        </div>
        <div className="header-actions">
          <button type="button" className="btn btn-ghost" id="btnExportCsv" title="Exportar CSV com filtros atuais">
            ⬇ Exportar CSV
          </button>
          <button type="button" className="btn btn-primary" id="btnSyncNow" title="Atualizar dados do eKyte agora">
            <span className="sync-icon">↻</span> Sincronizar Agora
          </button>
        </div>
      </header>

      {/* BARRA DE FILTROS UNIFICADA */}
      <section className="filters-bar-container">
        <div className="filters-bar">
          {/* Período */}
          <div className="filter-group">
            <label htmlFor="selectPeriodPreset">Período</label>
            <select id="selectPeriodPreset" className="filter-select">
              <option value="thisWeek">Esta Semana (Seg a Dom)</option>
              <option value="lastWeek">Semana Anterior (Seg a Dom)</option>
              <option value="today">Hoje</option>
              <option value="yesterday">Ontem</option>
              <option value="7d">Últimos 7 dias</option>
              <option value="14d">Últimos 14 dias (Sprint)</option>
              <option value="30d">Últimos 30 dias</option>
              <option value="thisMonth">Este mês</option>
              <option value="lastMonth">Mês anterior</option>
              <option value="thisYear">Este ano</option>
              <option value="all">Todo o Histórico</option>
              <option value="custom">Personalizado...</option>
            </select>
          </div>

          {/* Datas customizadas */}
          <div className="filter-group custom-dates-group" id="customDatesGroup" style={{ display: 'none' }}>
            <label>Intervalo Específico</label>
            <div className="date-inputs-inline">
              <input type="date" id="inputStartDate" className="filter-input date-ctrl" title="Data inicial" />
              <span className="date-sep">até</span>
              <input type="date" id="inputEndDate" className="filter-input date-ctrl" title="Data final" />
            </div>
          </div>

          {/* Data base */}
          <div className="filter-group">
            <label htmlFor="selectDateField">Data Base</label>
            <select id="selectDateField" className="filter-select">
              <option value="created_in">Data de Abertura</option>
              <option value="concluded_in">Data de Conclusão</option>
              <option value="expect_due_date">Prazo Previsto (Entrega)</option>
            </select>
          </div>

          {/* Situação */}
          <div className="filter-group">
            <label htmlFor="selectStatus">Situação</label>
            <select id="selectStatus" className="filter-select">
              <option value="all">Todas as Situações</option>
              <option value="active">● Em Aberto (Ativos)</option>
              <option value="resolved">✓ Concluídos</option>
              <option value="canceled">✕ Cancelados</option>
            </select>
          </div>

          {/* Executor */}
          <div className="filter-group">
            <label htmlFor="selectExecutor">Executor</label>
            <select id="selectExecutor" className="filter-select" data-key="executor">
              <option value="all">Todos os Executores</option>
            </select>
          </div>

          {/* SLA / Prazo */}
          <div className="filter-group">
            <label htmlFor="selectSla">SLA / Prazo</label>
            <select id="selectSla" className="filter-select" data-key="overdueStatus">
              <option value="all">Todos os Prazos</option>
              <option value="NO_PRAZO">✓ No Prazo</option>
              <option value="ALL_OVERDUE">⚠️ Em Atraso (Todos)</option>
              <option value="ALTERED_DUE_DATE">🚨 Prazo Alterado / Adiado</option>
              <option value="ATRASADO_ABERTO">⚠️ Atrasado em Aberto</option>
              <option value="ENTREGUE_COM_ATRASO">⏰ Entregue com Atraso</option>
              <option value="SEM_PRAZO">⚪ Sem Prazo</option>
            </select>
          </div>

          {/* Workspace com Busca Interativa */}
          <div className="filter-group filter-workspace-group">
            <label>Workspace / Cliente</label>
            <div className="searchable-select" id="workspaceSearchableSelect">
              <button type="button" className="searchable-select-trigger" id="workspaceSelectTrigger">
                <span className="trigger-label" id="workspaceTriggerLabel">Todos os Workspaces / Clientes</span>
                <span className="trigger-actions">
                  <span className="trigger-clear" id="workspaceTriggerClear" title="Limpar workspace" style={{ display: 'none' }}>✕</span>
                  <span className="trigger-arrow">▾</span>
                </span>
              </button>
              <div className="searchable-dropdown" id="workspaceDropdown" style={{ display: 'none' }}>
                <div className="dropdown-search-wrap">
                  <span className="dropdown-search-icon">🔍</span>
                  <input type="text" className="dropdown-search-input" id="inputWorkspaceSearch" placeholder="Digite para filtrar..." autoComplete="off" />
                  <button type="button" className="dropdown-search-clear" id="btnWorkspaceSearchClear" style={{ display: 'none' }} title="Limpar busca">✕</button>
                </div>
                <div className="dropdown-options-meta" id="workspaceOptionsMeta">Carregando workspaces...</div>
                <div className="dropdown-options-list" id="workspaceOptionsList"></div>
              </div>
            </div>
          </div>

          {/* Urgência */}
          <div className="filter-group">
            <label htmlFor="selectPriority">Urgência</label>
            <select id="selectPriority" className="filter-select" data-key="priority">
              <option value="all">Todas as Urgências</option>
            </select>
          </div>

          {/* Agrupamento Gráfico */}
          <div className="filter-group">
            <label htmlFor="selectGranularity">Agrupar Por</label>
            <select id="selectGranularity" className="filter-select">
              <option value="month">Mês</option>
              <option value="week">Semana</option>
              <option value="day">Dia</option>
              <option value="year">Ano</option>
            </select>
          </div>

          {/* Busca Rápida */}
          <div className="filter-group filter-search-group">
            <label htmlFor="inputGlobalSearch">Busca Rápida</label>
            <div className="search-box-wrap">
              <span className="search-icon">🔍</span>
              <input type="search" id="inputGlobalSearch" className="filter-input search-input" placeholder="#ID, assunto, cliente..." />
            </div>
          </div>
        </div>

        {/* Barra de Chips de Filtros Ativos */}
        <div className="chips-strip" id="chipsStrip" style={{ display: 'none' }}>
          <div className="active-chips" id="activeChipsContainer"></div>
          <div className="chips-meta">
            <span className="result-counter" id="activeResultCount">—</span>
            <button type="button" className="btn-clear-link" id="btnClearAllFilters">Limpar todos os filtros</button>
          </div>
        </div>
      </section>

      {/* CONTEÚDO PRINCIPAL DO DASHBOARD */}
      <main className="dashboard-main">
        {/* CARDS DE KPIS */}
        <section className="kpis-grid" id="kpisSection"></section>

        {/* GRÁFICOS: EVOLUÇÃO TEMPORAL + SLA DONUT */}
        <section className="dash-grid grid-8-4">
          <article className="dash-card">
            <header className="dash-card-header">
              <div>
                <h2 className="dash-card-title">Evolução de Tickets</h2>
                <p className="dash-card-sub">Histórico por <span id="labelGranularity">mês</span> · clique em qualquer barra para filtrar o período</p>
              </div>
              <div className="chart-legend-pills">
                <span className="legend-pill ok"><i className="dot"></i>No Prazo</span>
                <span className="legend-pill late"><i className="dot"></i>Atrasados</span>
              </div>
            </header>
            <div className="chart-canvas-wrap h-320">
              <canvas id="chartTimeline"></canvas>
            </div>
          </article>

          <article className="dash-card">
            <header className="dash-card-header">
              <div>
                <h2 className="dash-card-title">Cumprimento de SLA</h2>
                <p className="dash-card-sub">Clique nas fatias para filtrar tickets no prazo vs atrasados</p>
              </div>
            </header>
            <div className="donut-container">
              <div className="chart-canvas-wrap h-200">
                <canvas id="chartSla"></canvas>
              </div>
              <div className="donut-metric-center">
                <strong id="slaPercentageDisplay">—</strong>
                <span>no prazo</span>
              </div>
            </div>
            <div className="custom-legend-list" id="slaLegendList"></div>
          </article>
        </section>

        {/* RANKINGS: EXECUTORES + URGÊNCIA */}
        <section className="dash-grid grid-6-6">
          <article className="dash-card">
            <header className="dash-card-header">
              <div>
                <h2 className="dash-card-title">Desempenho por Executor</h2>
                <p className="dash-card-sub">Volume, prazo e tempo médio de conclusão · clique para isolar executor</p>
              </div>
              <div className="chart-legend-pills">
                <span className="legend-pill ok"><i className="dot"></i>No Prazo</span>
                <span className="legend-pill late"><i className="dot"></i>Atraso</span>
                <span className="legend-pill none"><i className="dot"></i>Sem Prazo</span>
              </div>
            </header>
            <div className="rankings-list" id="executorsRankingList"></div>
          </article>

          <article className="dash-card">
            <header className="dash-card-header">
              <div>
                <h2 className="dash-card-title">Demanda por Urgência</h2>
                <p className="dash-card-sub">Distribuição de tickets e tempo médio por nível de prioridade · clique para filtrar</p>
              </div>
              <div className="chart-legend-pills">
                <span className="legend-pill ok"><i className="dot"></i>No Prazo</span>
                <span className="legend-pill late"><i className="dot"></i>Atraso</span>
                <span className="legend-pill none"><i className="dot"></i>Sem Prazo</span>
              </div>
            </header>
            <div className="rankings-list" id="prioritiesRankingList"></div>
          </article>
        </section>

        {/* FUNIL DE ETAPAS + TOP WORKSPACES */}
        <section className="dash-grid grid-6-6">
          <article className="dash-card">
            <header className="dash-card-header">
              <div>
                <h2 className="dash-card-title">Funil de Etapas & Gargalos</h2>
                <p className="dash-card-sub">Tempo médio de permanência em cada etapa operacional</p>
              </div>
            </header>
            <div className="stages-funnel" id="stagesFunnelContainer"></div>
          </article>

          <article className="dash-card">
            <header className="dash-card-header">
              <div>
                <h2 className="dash-card-title">Top Workspaces / Clientes</h2>
                <p className="dash-card-sub">Clientes com maior volume de tickets e chamados atrasados · clique para filtrar</p>
              </div>
            </header>
            <div className="rankings-list compact" id="workspacesRankingList"></div>
          </article>
        </section>

        {/* TABELA DE TICKETS OPERACIONAL */}
        <section className="dash-card table-section">
          <header className="dash-card-header table-header">
            <div className="table-title-group">
              <h2 className="dash-card-title">
                Chamados do Time BRIU
                <span className="count-badge" id="tableTotalBadge">0</span>
              </h2>
              <p className="dash-card-sub">Clique em qualquer linha para abrir a visualização detalhada com histórico e horas</p>
            </div>
            <div className="table-quick-actions">
              <button type="button" className="btn btn-sm btn-ghost" id="btnRefreshTable">↻ Atualizar</button>
            </div>
          </header>

          <div className="data-table-container">
            <table className="modern-table" id="ticketsTable">
              <thead>
                <tr>
                  <th data-sort="id" className="th-sortable" style={{ width: '85px' }}>ID</th>
                  <th style={{ minWidth: '260px' }}>Assunto / Workspace</th>
                  <th style={{ width: '170px' }}>Executor</th>
                  <th style={{ width: '140px' }}>Solicitante</th>
                  <th style={{ width: '120px' }}>Etapa</th>
                  <th data-sort="priority" className="th-sortable" style={{ width: '110px' }}>Urgência</th>
                  <th style={{ width: '160px' }}>Situação / SLA</th>
                  <th data-sort="created_in" className="th-sortable" style={{ width: '105px' }}>Abertura</th>
                  <th data-sort="expect_due_date" className="th-sortable" style={{ width: '115px' }}>Prazo</th>
                  <th data-sort="lead_time_minutes" className="th-sortable th-right" style={{ width: '120px' }}>Execução</th>
                </tr>
              </thead>
              <tbody id="ticketsTableBody"></tbody>
            </table>
          </div>

          {/* Paginação da Tabela */}
          <footer className="table-pagination">
            <button type="button" className="btn btn-ghost btn-sm" id="btnPagePrev">← Anterior</button>
            <span className="pagination-info" id="paginationInfoText">Página 1 de 1</span>
            <button type="button" className="btn btn-ghost btn-sm" id="btnPageNext">Próxima →</button>
          </footer>
        </section>
      </main>

      {/* DRAWER DESLIZANTE DE DETALHES DO TICKET */}
      <div className="drawer-backdrop" id="ticketDrawerBackdrop"></div>
      <aside className="ticket-drawer" id="ticketDrawer" aria-hidden="true">
        <div className="drawer-content" id="ticketDrawerBody"></div>
      </aside>

      {/* TOAST DE FEEDBACK */}
      <div className="toast-notification" id="toastMessage"></div>
    </div>
  );
}

