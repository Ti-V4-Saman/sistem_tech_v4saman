/**
 * BI Operacional — Time BRIU (Tecnologia)
 * Motor Frontend Unificado
 */

// Base URL da API (suporta execução sob sub-pastas como /ekyte ou standalone /)
const API_BASE = (function () {
  if (window.__EKYTE_BI_BASE_URL__) return window.__EKYTE_BI_BASE_URL__.replace(/\/$/, '');
  const path = window.location.pathname.replace(/\/index\.html$/, '').replace(/\/$/, '');
  return `${path}/api/bi`;
})();

// Suporte para Modo Incorporado (Iframe / Embed em outro sistema)
(function initEmbedMode() {
  const params = new URLSearchParams(window.location.search);
  const isEmbed = params.get('embed') === 'true' || window.self !== window.top;
  if (isEmbed) {
    document.documentElement.classList.add('is-embedded');
    document.body.classList.add('is-embedded');
  }
  if (params.get('noheader') === 'true') {
    document.body.classList.add('hide-header');
  }
})();

// Estado global de filtros
const state = {
  status: 'all', // 'all' (visão completa da semana), 'active' (em aberto), 'resolved' (concluídos), 'canceled' (cancelados)
  executor: 'all',
  workspace: 'all',
  requester: 'all',
  overdueStatus: 'all',
  priority: 'all',
  squad: 'all',
  phase: 'all',
  preset: 'thisWeek', // Padrão: Semana corrida atual (Seg a Dom)
  startDate: '',
  endDate: '',
  dateField: 'created_in',
  granularity: 'day', // Dia a dia para alinhamento semanal
  search: '',
  page: 1,
  pageSize: 25,
  sortBy: 'created_in',
  sortDir: 'DESC',
};

// Instâncias Chart.js
let chartTimelineInst = null;
let chartSlaInst = null;

// Helpers utilitários
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

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
  if (!minutes || isNaN(minutes) || minutes < 0) return '—';
  const m = Math.round(Number(minutes));
  const days = Math.floor(m / 1440);
  const hours = Math.floor((m % 1440) / 60);
  const mins = m % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function fmtHours(minutes) {
  if (!minutes || isNaN(minutes) || minutes <= 0) return '0h';
  const h = Number(minutes) / 60;
  if (h >= 10) return `${Math.round(h)}h`;
  return `${h.toFixed(1).replace('.', ',')}h`;
}

function cleanName(n) {
  if (!n) return '—';
  return n.split('|')[0].trim();
}

function getInitials(n) {
  const c = cleanName(n).replace(/[^a-zA-ZÀ-ÿ\s]/g, '').trim().split(/\s+/);
  if (c.length >= 2) return (c[0][0] + c[1][0]).toUpperCase();
  if (c.length === 1 && c[0]) return c[0].slice(0, 2).toUpperCase();
  return '??';
}

function localIso(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Cálculo preciso de semanas (Segunda a Domingo)
function getWeekRange(refDate, weekOffset = 0) {
  const d = new Date(refDate);
  const day = d.getDay(); // 0: Dom, 1: Seg...
  const diffToMon = day === 0 ? -6 : 1 - day;
  const mon = new Date(d);
  mon.setDate(d.getDate() + diffToMon + (weekOffset * 7));
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return { start: localIso(mon), end: localIso(sun) };
}

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Erro HTTP ${res.status}`);
  }
  return res.json();
}

function showToast(msg) {
  const t = $('#toastMessage');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3500);
}

/* ---------------- QUERY STRING UNIVERSAL ---------------- */
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

/* ---------------- ATUALIZAÇÃO GERAL (REFRESH) ---------------- */
let refreshTimer = null;
function scheduleRefresh() {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => {
    refreshAll();
  }, 100);
}

async function refreshAll() {
  renderActiveChips();
  try {
    const qs = buildQueryString();
    const [filterMeta, dashData, tableData] = await Promise.all([
      fetchJSON(`${API_BASE}/filters?${qs}`),
      fetchJSON(`${API_BASE}/dashboard?${qs}`),
      fetchJSON(`${API_BASE}/tickets?${qs}`),
    ]);

    populateDropdownOptions(filterMeta);
    renderKpiCards(dashData.kpis || {});
    renderTimelineChart(dashData);
    renderSlaChart(dashData.kpis || {});
    renderExecutorsRanking(dashData.byExecutor || []);
    renderPrioritiesRanking(dashData.byPriority || []);
    renderStagesFunnel(dashData.phaseBottlenecks || [], dashData.stageTabs || []);
    renderWorkspacesRanking(dashData.byWorkspace || []);
    renderTicketsTable(tableData);
    updateSyncStatus(filterMeta);
  } catch (err) {
    console.error('Erro ao atualizar dashboard:', err);
    showToast(`Erro ao carregar dados: ${err.message}`);
  }
}

/* ---------------- WORKSPACE SEARCHABLE COMBOBOX ---------------- */
let currentWorkspacesList = [];
let highlightedWorkspaceIndex = -1;

function normalizeSearchText(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function updateWorkspaceTriggerUI() {
  const labelEl = $('#workspaceTriggerLabel');
  const clearEl = $('#workspaceTriggerClear');
  if (!labelEl) return;

  if (!state.workspace || state.workspace === 'all') {
    labelEl.textContent = 'Todos os Workspaces / Clientes';
    labelEl.title = 'Todos os Workspaces / Clientes';
    if (clearEl) clearEl.style.display = 'none';
  } else {
    const found = currentWorkspacesList.find((w) => w.value === state.workspace);
    const text = found ? (found.label || found.value) : state.workspace;
    labelEl.textContent = text;
    labelEl.title = text;
    if (clearEl) clearEl.style.display = 'inline-block';
  }

  const hiddenSelect = $('#selectWorkspace');
  if (hiddenSelect) hiddenSelect.value = state.workspace || 'all';
}

function setWorkspaceFilter(val) {
  state.workspace = val || 'all';
  state.page = 1;
  updateWorkspaceTriggerUI();
  closeWorkspaceDropdown();
  scheduleRefresh();
}

function openWorkspaceDropdown() {
  const dropdown = $('#workspaceDropdown');
  const wrapper = $('#workspaceSearchableSelect');
  if (!dropdown || !wrapper) return;

  wrapper.classList.add('open');
  dropdown.style.display = 'flex';
  const input = $('#inputWorkspaceSearch');
  if (input) {
    input.value = '';
    const clearBtn = $('#btnWorkspaceSearchClear');
    if (clearBtn) clearBtn.style.display = 'none';
    renderWorkspaceOptions('');
    setTimeout(() => input.focus(), 60);
  }
}

function closeWorkspaceDropdown() {
  const dropdown = $('#workspaceDropdown');
  const wrapper = $('#workspaceSearchableSelect');
  if (wrapper) wrapper.classList.remove('open');
  if (dropdown) dropdown.style.display = 'none';
  highlightedWorkspaceIndex = -1;
}

function renderWorkspaceOptions(searchTerm = '') {
  const container = $('#workspaceOptionsList');
  const metaEl = $('#workspaceOptionsMeta');
  if (!container) return;

  const rawTerm = (searchTerm || '').trim();
  const normTerm = normalizeSearchText(rawTerm);

  const filtered = currentWorkspacesList.filter((w) => {
    if (!normTerm) return true;
    const name = normalizeSearchText(w.label || w.value || '');
    return name.includes(normTerm);
  });

  if (metaEl) {
    metaEl.textContent = rawTerm
      ? `${filtered.length} de ${currentWorkspacesList.length} workspaces encontrados`
      : `${currentWorkspacesList.length} workspaces do Time BRIU`;
  }

  const items = [];

  // Exibe "Todos os Workspaces" no topo
  if (!normTerm || normalizeSearchText('todos os workspaces clientes').includes(normTerm)) {
    const isAllSelected = !state.workspace || state.workspace === 'all';
    items.push(`
      <div class="dropdown-option ${isAllSelected ? 'selected' : ''}" data-value="all">
        <span class="dropdown-option-name">Todos os Workspaces / Clientes</span>
        ${isAllSelected ? '<span class="dropdown-option-count">✓</span>' : ''}
      </div>
    `);
  }

  if (filtered.length === 0) {
    items.push(`
      <div class="dropdown-no-results">
        Nenhum workspace encontrado para "<b>${esc(rawTerm)}</b>"
      </div>
    `);
  } else {
    filtered.forEach((w) => {
      const isSelected = state.workspace === w.value;
      const count = w.count !== undefined ? fmtNum(w.count) : '';
      items.push(`
        <div class="dropdown-option ${isSelected ? 'selected' : ''}" data-value="${esc(w.value)}" title="${esc(w.label || w.value)}">
          <span class="dropdown-option-name">${esc(w.label || w.value)}</span>
          ${count ? `<span class="dropdown-option-count">${count}</span>` : ''}
        </div>
      `);
    });
  }

  container.innerHTML = items.join('');
  highlightedWorkspaceIndex = -1;

  container.querySelectorAll('.dropdown-option').forEach((opt) => {
    opt.addEventListener('click', () => {
      const val = opt.dataset.value;
      setWorkspaceFilter(val);
    });
  });
}

function updateHighlightedOption(options) {
  options.forEach((opt, idx) => {
    const isHigh = idx === highlightedWorkspaceIndex;
    opt.classList.toggle('highlighted', isHigh);
    if (isHigh) {
      opt.scrollIntoView({ block: 'nearest' });
    }
  });
}

function initWorkspaceSearchableSelect() {
  const trigger = $('#workspaceSelectTrigger');
  const inputSearch = $('#inputWorkspaceSearch');
  const inputClear = $('#btnWorkspaceSearchClear');

  if (trigger) {
    trigger.addEventListener('click', (e) => {
      if (e.target.closest('#workspaceTriggerClear')) {
        e.stopPropagation();
        setWorkspaceFilter('all');
        return;
      }
      const isOpen = $('#workspaceSearchableSelect')?.classList.contains('open');
      if (isOpen) closeWorkspaceDropdown();
      else openWorkspaceDropdown();
    });
  }

  if (inputSearch) {
    inputSearch.addEventListener('input', (e) => {
      const term = e.target.value;
      if (inputClear) inputClear.style.display = term ? 'inline-block' : 'none';
      renderWorkspaceOptions(term);
    });

    inputSearch.addEventListener('keydown', (e) => {
      const options = $$('#workspaceOptionsList .dropdown-option');
      if (!options.length) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        highlightedWorkspaceIndex = Math.min(highlightedWorkspaceIndex + 1, options.length - 1);
        updateHighlightedOption(options);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        highlightedWorkspaceIndex = Math.max(highlightedWorkspaceIndex - 1, 0);
        updateHighlightedOption(options);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (highlightedWorkspaceIndex >= 0 && options[highlightedWorkspaceIndex]) {
          options[highlightedWorkspaceIndex].click();
        } else if (options[0]) {
          options[0].click();
        }
      } else if (e.key === 'Escape') {
        closeWorkspaceDropdown();
      }
    });
  }

  if (inputClear) {
    inputClear.addEventListener('click', () => {
      inputSearch.value = '';
      inputClear.style.display = 'none';
      renderWorkspaceOptions('');
      inputSearch.focus();
    });
  }

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#workspaceSearchableSelect')) {
      closeWorkspaceDropdown();
    }
  });
}

/* ---------------- POPULAÇÃO DOS DROPDOWNS ---------------- */
function populateDropdownOptions(meta) {
  function fillSelect(el, list, allLabel, formatLabel) {
    if (!el) return;
    const currentVal = el.value || 'all';
    const opts = [`<option value="all">${esc(allLabel)}</option>`];

    list.forEach((item) => {
      const val = item.value;
      const cnt = item.count !== undefined ? ` (${fmtNum(item.count)})` : '';
      const label = formatLabel ? formatLabel(item) : `${item.label || item.value}${cnt}`;
      opts.push(`<option value="${esc(val)}">${esc(label)}</option>`);
    });

    el.innerHTML = opts.join('');
    if ([...el.options].some((o) => o.value === currentVal)) {
      el.value = currentVal;
    } else {
      el.value = 'all';
    }
  }

  fillSelect($('#selectExecutor'), meta.executors || [], 'Todos os Executores', (i) => `${cleanName(i.label)} (${fmtNum(i.count)})`);
  fillSelect($('#selectPriority'), meta.priorities || [], 'Todas as Urgências', (i) => `${i.label} (${fmtNum(i.count)})`);

  // Workspaces com busca instantânea
  currentWorkspacesList = meta.workspaces || [];
  fillSelect($('#selectWorkspace'), currentWorkspacesList, 'Todos os Workspaces / Clientes', (i) => `${i.label} (${fmtNum(i.count)})`);
  updateWorkspaceTriggerUI();

  if ($('#workspaceSearchableSelect')?.classList.contains('open')) {
    renderWorkspaceOptions($('#inputWorkspaceSearch')?.value || '');
  }

  // Mantém os selects fixos no estado atual
  $('#selectStatus').value = state.status;
  $('#selectPeriodPreset').value = state.preset;
  $('#selectSla').value = state.overdueStatus;
  $('#selectDateField').value = state.dateField;
  $('#selectGranularity').value = state.granularity;
}

/* ---------------- MANIPULAÇÃO DE PERÍODOS ---------------- */
function handlePeriodPresetChange(preset) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  let s = '';
  let e = '';
  let g = 'day';

  const customGroup = $('#customDatesGroup');

  if (preset === 'custom') {
    customGroup.style.display = 'flex';
    state.preset = 'custom';
    return;
  } else {
    customGroup.style.display = 'none';
  }

  if (preset === 'thisWeek') {
    const w = getWeekRange(now, 0);
    s = w.start;
    e = w.end;
    g = 'day';
  } else if (preset === 'lastWeek') {
    const w = getWeekRange(now, -1);
    s = w.start;
    e = w.end;
    g = 'day';
  } else if (preset === 'today') {
    s = e = localIso(now);
    g = 'day';
  } else if (preset === 'yesterday') {
    const yst = new Date(now);
    yst.setDate(yst.getDate() - 1);
    s = e = localIso(yst);
    g = 'day';
  } else if (preset === '7d') {
    const d = new Date(now);
    d.setDate(d.getDate() - 6);
    s = localIso(d);
    e = localIso(now);
    g = 'day';
  } else if (preset === '14d') {
    const d = new Date(now);
    d.setDate(d.getDate() - 13);
    s = localIso(d);
    e = localIso(now);
    g = 'day';
  } else if (preset === 'thisMonth') {
    s = localIso(new Date(y, m, 1));
    e = localIso(new Date(y, m + 1, 0));
    g = 'day';
  } else if (preset === 'lastMonth') {
    s = localIso(new Date(y, m - 1, 1));
    e = localIso(new Date(y, m, 0));
    g = 'day';
  } else if (preset === 'thisYear') {
    s = localIso(new Date(y, 0, 1));
    e = localIso(new Date(y, 11, 31));
    g = 'month';
  } else if (preset === 'all') {
    s = '';
    e = '';
    g = 'month';
  }

  state.preset = preset;
  state.startDate = s;
  state.endDate = e;
  state.granularity = g;
  state.page = 1;

  $('#inputStartDate').value = s;
  $('#inputEndDate').value = e;
  $('#selectGranularity').value = g;

  scheduleRefresh();
}

/* ---------------- RENDERIZAÇÃO DOS CHIPS ATIVOS ---------------- */
function renderActiveChips() {
  const chips = [];

  // Situação
  if (state.status === 'active') {
    chips.push(`<span class="filter-chip">Situação: <b>Em Aberto</b><button type="button" data-clear="status">✕</button></span>`);
  } else if (state.status === 'resolved') {
    chips.push(`<span class="filter-chip">Situação: <b>Concluídos</b><button type="button" data-clear="status">✕</button></span>`);
  } else if (state.status === 'canceled') {
    chips.push(`<span class="filter-chip">Situação: <b>Cancelados</b><button type="button" data-clear="status">✕</button></span>`);
  }

  // Período
  if (state.startDate || state.endDate) {
    const baseNames = {
      created_in: 'Abertura',
      concluded_in: 'Conclusão',
      expect_due_date: 'Prazo',
    };
    const baseLabel = baseNames[state.dateField] || 'Período';
    const presetNames = {
      thisWeek: 'Esta Semana',
      lastWeek: 'Semana Anterior',
      today: 'Hoje',
      yesterday: 'Ontem',
      '7d': 'Últimos 7 dias',
      '14d': 'Últimos 14 dias',
      '30d': 'Últimos 30 dias',
      thisMonth: 'Este mês',
      lastMonth: 'Mês anterior',
      thisYear: 'Este ano',
    };
    const pName = presetNames[state.preset] ? `${presetNames[state.preset]} ` : '';
    const periodStr = `${state.startDate ? fmtDate(state.startDate + 'T12:00') : 'Início'} até ${state.endDate ? fmtDate(state.endDate + 'T12:00') : 'Hoje'}`;
    chips.push(`<span class="filter-chip">${baseLabel}: <b>${pName}(${esc(periodStr)})</b><button type="button" data-clear="period">✕</button></span>`);
  }

  // Dropdowns
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

  // Busca
  if (state.search && state.search.trim()) {
    chips.push(`<span class="filter-chip">Busca: <b>"${esc(state.search.trim())}"</b><button type="button" data-clear="search">✕</button></span>`);
  }

  const container = $('#activeChipsContainer');
  const strip = $('#chipsStrip');

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

/* ---------------- KPIS ---------------- */
function renderKpiCards(k) {
  const cards = [
    {
      title: 'Tickets no Filtro',
      value: fmtNum(k.totalTickets),
      sub: `<b>${fmtNum(k.resolvedTickets)}</b> concluídos · <b>${fmtNum(k.canceledTickets)}</b> cancelados`,
      color: '#3b82f6',
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
      color: '#10b981',
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

  $('#kpisSection').innerHTML = cards
    .map(
      (c) => `
      <div class="kpi-card" style="--kpi-color: ${c.color}">
        <div class="kpi-title"><i style="background:${c.color}"></i>${c.title}</div>
        <div class="kpi-value">${c.value}</div>
        <div class="kpi-sub">${c.sub}</div>
      </div>`
    )
    .join('');

  $('#activeResultCount').textContent = `Total: ${fmtNum(k.totalTickets)} chamados`;
}

/* ---------------- GRÁFICO 1: EVOLUÇÃO TEMPORAL ---------------- */
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
  $('#labelGranularity').textContent = granNames[data.granularity] || 'mês';

  if (chartTimelineInst) {
    chartTimelineInst.destroy();
  }

  const isLight = document.documentElement.dataset.theme === 'light';
  const textColor = isLight ? '#475569' : '#94a3b8';
  const gridColor = isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)';

  chartTimelineInst = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'No Prazo',
          data: onTimeData,
          backgroundColor: '#10b981',
          borderRadius: 4,
          stack: 'main',
        },
        {
          label: 'Em Atraso',
          data: lateData,
          backgroundColor: '#ef4444',
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
          backgroundColor: isLight ? '#fff' : '#0f172a',
          titleColor: isLight ? '#0f172a' : '#fff',
          bodyColor: isLight ? '#475569' : '#cbd5e1',
          borderColor: isLight ? '#e2e8f0' : '#334155',
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

/* ---------------- GRÁFICO 2: DONUT SLA ---------------- */
function renderSlaChart(k) {
  const ctx = $('#chartSla');
  if (!ctx) return;

  const onTime = Number(k.onTimeCount || 0);
  const late = Number(k.totalOverdueCount || 0);
  const noDue = Number(k.withoutDueDateCount || 0);
  const total = onTime + late + noDue;

  $('#slaPercentageDisplay').textContent = `${fmtDec(k.slaComplianceRate, 1)}%`;

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
          backgroundColor: ['#10b981', '#ef4444', '#475569'],
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
            label: (ctx) => ` ${ctx.label}: ${fmtNum(ctx.raw)} (${total > 0 ? ((ctx.raw / total) * 100).toFixed(1) : 0}%)`,
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

  $('#slaLegendList').innerHTML = `
    <div class="legend-item-row" data-sla="NO_PRAZO">
      <div class="legend-item-label"><i style="background:#10b981"></i>No Prazo</div>
      <div class="legend-item-value">${fmtNum(onTime)} <span style="font-size:11px;color:var(--text-dim)">(${total > 0 ? ((onTime / total) * 100).toFixed(0) : 0}%)</span></div>
    </div>
    <div class="legend-item-row" data-sla="ALL_OVERDUE">
      <div class="legend-item-label"><i style="background:#ef4444"></i>Em Atraso</div>
      <div class="legend-item-value">${fmtNum(late)} <span style="font-size:11px;color:var(--text-dim)">(${total > 0 ? ((late / total) * 100).toFixed(0) : 0}%)</span></div>
    </div>
    <div class="legend-item-row" data-sla="SEM_PRAZO">
      <div class="legend-item-label"><i style="background:#475569"></i>Sem Prazo Definido</div>
      <div class="legend-item-value">${fmtNum(noDue)} <span style="font-size:11px;color:var(--text-dim)">(${total > 0 ? ((noDue / total) * 100).toFixed(0) : 0}%)</span></div>
    </div>
  `;

  $$('#slaLegendList .legend-item-row').forEach((row) => {
    row.addEventListener('click', () => {
      const sla = row.dataset.sla;
      state.overdueStatus = state.overdueStatus === sla ? 'all' : sla;
      state.page = 1;
      $('#selectSla').value = state.overdueStatus;
      scheduleRefresh();
    });
  });
}

/* ---------------- RANKING DE EXECUTORES ---------------- */
function renderExecutorsRanking(list) {
  const container = $('#executorsRankingList');
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

  $$('#executorsRankingList .rank-row-item').forEach((row) => {
    row.addEventListener('click', () => {
      const exec = row.dataset.executor;
      state.executor = state.executor === exec ? 'all' : exec;
      state.page = 1;
      $('#selectExecutor').value = state.executor;
      scheduleRefresh();
    });
  });
}

/* ---------------- RANKING DE URGÊNCIA ---------------- */
function renderPrioritiesRanking(list) {
  const container = $('#prioritiesRankingList');
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

  $$('#prioritiesRankingList .rank-row-item').forEach((row) => {
    row.addEventListener('click', () => {
      const prio = row.dataset.prio;
      state.priority = String(state.priority) === String(prio) ? 'all' : prio;
      state.page = 1;
      $('#selectPriority').value = state.priority;
      scheduleRefresh();
    });
  });
}

/* ---------------- FUNIL DE ETAPAS ---------------- */
function renderStagesFunnel(bottlenecks, stageTabs) {
  const container = $('#stagesFunnelContainer');
  const phases = ['Triagem', 'Análise', 'Planejar', 'Produção', 'Entrega'];
  const colors = ['#64748b', '#3b82f6', '#f59e0b', '#8b5cf6', '#10b981'];

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

  $$('#stagesFunnelContainer .funnel-stage-row').forEach((row) => {
    row.addEventListener('click', () => {
      const st = row.dataset.stage;
      state.phase = state.phase === st ? 'all' : st;
      state.page = 1;
      scheduleRefresh();
    });
  });
}

/* ---------------- WORKSPACES / CLIENTES ---------------- */
function renderWorkspacesRanking(list) {
  const container = $('#workspacesRankingList');
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

  $$('#workspacesRankingList .rank-row-item').forEach((row) => {
    row.addEventListener('click', () => {
      const ws = row.dataset.ws;
      const newVal = state.workspace === ws ? 'all' : ws;
      setWorkspaceFilter(newVal);
    });
  });
}

/* ---------------- TABELA DE TICKETS ---------------- */
function renderTicketsTable(data) {
  const tbody = $('#ticketsTableBody');
  $('#tableTotalBadge').textContent = fmtNum(data.total);

  $('#paginationInfoText').textContent = data.total
    ? `Página ${data.page} de ${Math.max(1, data.totalPages)} (${fmtNum(data.total)} chamados)`
    : 'Nenhum chamado encontrado';

  $('#btnPagePrev').disabled = data.page <= 1;
  $('#btnPageNext').disabled = data.page >= data.totalPages;

  $$('#ticketsTable th[data-sort]').forEach((th) => {
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

  $$('#ticketsTableBody tr[data-ticket-id]').forEach((row) => {
    row.addEventListener('click', () => {
      showTicketDrawer(row.dataset.ticketId);
    });
  });
}

/* ---------------- DRAWER DE DETALHES MODERNO ---------------- */
function openDrawerUI() {
  $('#ticketDrawer').classList.add('open');
  $('#ticketDrawerBackdrop').classList.add('open');
  $('#ticketDrawer').setAttribute('aria-hidden', 'false');
}

function closeDrawerUI() {
  $('#ticketDrawer').classList.remove('open');
  $('#ticketDrawerBackdrop').classList.remove('open');
  $('#ticketDrawer').setAttribute('aria-hidden', 'true');
}

async function showTicketDrawer(id) {
  openDrawerUI();
  const body = $('#ticketDrawerBody');
  body.innerHTML = `
    <div style="padding:40px;text-align:center;color:var(--text-dim)">
      <div class="sync-icon spin" style="font-size:24px;margin-bottom:10px">↻</div>
      Carregando detalhes do chamado #${id}...
    </div>`;

  try {
    const data = await fetchJSON(`${API_BASE}/tickets/${id}`);
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
      <div style="background: rgba(245, 158, 11, 0.12); border: 1px solid rgba(245, 158, 11, 0.35); border-radius: 8px; padding: 12px 16px; margin: 14px 0 6px; display: flex; align-items: flex-start; gap: 12px;">
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
                <div class="drawer-card-item" style="border-left: 3px solid var(--warn); background: rgba(245, 158, 11, 0.06); margin-bottom: 6px;">
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

    $$('.drawer-tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        $$('.drawer-tab-btn').forEach((b) => b.classList.remove('active'));
        $$('.drawer-tab-panel').forEach((p) => p.classList.remove('active'));
        btn.classList.add('active');
        $(`#${btn.dataset.tab}`)?.classList.add('active');
      });
    });
  } catch (err) {
    body.innerHTML = `
      <div style="padding:30px;color:var(--late)">
        Erro ao carregar detalhes do chamado: ${esc(err.message)}
      </div>`;
  }
}

/* ---------------- SINCRONIZAÇÃO E STATUS ---------------- */
function updateSyncStatus(meta) {
  const syncRuns = meta.syncRuns || [];
  const last = syncRuns[0];
  const el = $('#syncStatusText');

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
  const icon = btn.querySelector('.sync-icon');
  icon.classList.add('spin');
  btn.disabled = true;

  try {
    const res = await fetchJSON(`${API_BASE}/sync-now`, { method: 'POST' });
    showToast(res.message || 'Sincronização iniciada!');
    setTimeout(() => {
      icon.classList.remove('spin');
      btn.disabled = false;
      scheduleRefresh();
    }, 4000);
  } catch (err) {
    icon.classList.remove('spin');
    btn.disabled = false;
    showToast(`Erro na sincronização: ${err.message}`);
  }
}

function exportCsv() {
  const qs = buildQueryString({ pageSize: 10000, page: 1 });
  window.open(`${API_BASE}/tickets/export?${qs}`, '_blank');
}

/* ---------------- INICIALIZAÇÃO ---------------- */
function init() {
  // Preset de Período
  $('#selectPeriodPreset').addEventListener('change', (e) => {
    handlePeriodPresetChange(e.target.value);
  });

  // Datas customizadas
  $('#inputStartDate').addEventListener('change', (e) => {
    state.startDate = e.target.value;
    scheduleRefresh();
  });
  $('#inputEndDate').addEventListener('change', (e) => {
    state.endDate = e.target.value;
    scheduleRefresh();
  });

  // Data Base & Agrupamento
  $('#selectDateField').addEventListener('change', (e) => {
    state.dateField = e.target.value;
    scheduleRefresh();
  });
  $('#selectGranularity').addEventListener('change', (e) => {
    state.granularity = e.target.value;
    scheduleRefresh();
  });

  // Situação
  $('#selectStatus').addEventListener('change', (e) => {
    state.status = e.target.value;
    state.page = 1;
    scheduleRefresh();
  });

  // Dropdowns em cascata
  ['executor', 'overdueStatus', 'priority'].forEach((key) => {
    const el = $(`[data-key="${key}"]`);
    if (el) {
      el.addEventListener('change', (e) => {
        state[key] = e.target.value;
        state.page = 1;
        scheduleRefresh();
      });
    }
  });

  // Combobox com busca em tempo real para Workspace / Cliente
  initWorkspaceSearchableSelect();

  // Busca rápida com debounce
  let searchTimer = null;
  $('#inputGlobalSearch').addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      state.search = e.target.value;
      state.page = 1;
      scheduleRefresh();
    }, 350);
  });

  // Chips e Limpar filtros
  $('#activeChipsContainer').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-clear]');
    if (btn) clearFilter(btn.dataset.clear);
  });
  $('#btnClearAllFilters').addEventListener('click', clearAllFilters);

  // Ordenação da tabela
  $$('#ticketsTable th[data-sort]').forEach((th) => {
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

  // Paginação
  $('#btnPagePrev').addEventListener('click', () => {
    if (state.page > 1) {
      state.page--;
      scheduleRefresh();
    }
  });
  $('#btnPageNext').addEventListener('click', () => {
    state.page++;
    scheduleRefresh();
  });
  $('#btnRefreshTable').addEventListener('click', scheduleRefresh);

  // Botões de topo
  $('#btnSyncNow').addEventListener('click', triggerSyncNow);
  $('#btnExportCsv').addEventListener('click', exportCsv);

  // Tema Claro / Escuro
  $('#btnTheme').addEventListener('click', () => {
    const cur = document.documentElement.dataset.theme;
    const next = cur === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;
    $('#btnTheme').textContent = next === 'light' ? '🌙 Tema Escuro' : '☀️ Tema Claro';
    scheduleRefresh();
  });

  // Fechar drawer no backdrop ou ESC
  $('#ticketDrawerBackdrop').addEventListener('click', closeDrawerUI);
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDrawerUI();
  });

  // Inicialização padrão: Semana corrida atual (Seg a Dom)
  const now = new Date();
  const w = getWeekRange(now, 0);
  state.preset = 'thisWeek';
  state.startDate = w.start;
  state.endDate = w.end;
  state.granularity = 'day';
  state.status = 'all';

  $('#selectPeriodPreset').value = 'thisWeek';
  $('#inputStartDate').value = w.start;
  $('#inputEndDate').value = w.end;
  $('#selectGranularity').value = 'day';
  $('#selectStatus').value = 'all';

  // Carga inicial
  scheduleRefresh();
}

document.addEventListener('DOMContentLoaded', init);
