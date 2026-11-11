/**
 * Ponto de entrada do dashboard.
 * Orquestra: tema, streaming de dados, gráficos, filtros, busca,
 * alertas, logs, mapa e drag-and-drop dos painéis.
 */

import { $, $$, delegate, debounce, scrollToEnd } from './utils/dom.js';
import { rate, clockTime } from './utils/format.js';
import { createTheme } from './theme.js';
import { api, API_BASE } from './services/api.js';
import { createStream } from './services/stream.js';
import { createChart, renderLegend } from './components/charts.js';
import { createWorldMap } from './components/map.js';
import { serverCard, dockerCard, alertItem, logLine } from './components/widgets.js';
import { createDnd } from './dnd.js';

/* ============================================================
   Estado
   ============================================================ */
const state = {
  servers: [],
  nodes: [],
  containers: [],
  alerts: [],
  logs: [],
  metrics: null,
  incidents: [],
  serverSearch: '',
  globalSearch: '',
  // Conjunto vazio = sem filtro (exibe todos). As pills alternam a seleção.
  statusFilters: new Set(),
  logLevels: new Set(['ERROR', 'INFO', 'DEBUG']),
  logSearch: '',
};

const SERIES_COLORS = ['var(--s1)', 'var(--s2)', 'var(--s3)'];

/* ============================================================
   Tema
   ============================================================ */
const theme = createTheme({
  onChange: (t) => {
    const btn = $('#themeToggle');
    if (btn) {
      btn.querySelector('.theme-ico').textContent = t === 'dark' ? '☾' : '☀';
      btn.title = t === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro';
    }
    // Repinta gráficos e mapa com as novas cores dos tokens CSS.
    Object.values(charts).forEach((c) => c?.render());
  },
});

/* ============================================================
   Gráficos
   ============================================================ */
const charts = {};
let map = null;

function resolveColor(token) {
  const v = token.startsWith('var(')
    ? getComputedStyle(document.documentElement).getPropertyValue(token.slice(4, -1)).trim()
    : token;
  return v || '#4a8fe0';
}

function initCharts() {
  const seriesDef = (labels) => labels.map((l, i) => ({ key: l.key, label: l.label, color: resolveColor(SERIES_COLORS[i % 3]) }));

  const cpuSeries = seriesDef([
    { key: 'us-east', label: 'US-East' },
    { key: 'eu-west', label: 'EU-West' },
    { key: 'asia-pac', label: 'Asia-Pac' },
  ]);
  const memSeries = seriesDef([
    { key: 'us-east', label: 'US-East' },
    { key: 'eu-west', label: 'EU-West' },
    { key: 'asia-pac', label: 'Asia-Pac' },
  ]);
  const latSeries = [
    { key: 'p99', label: 'P99', color: resolveColor('var(--err)') },
    { key: 'p95', label: 'P95', color: resolveColor('var(--warn)') },
    { key: 'avg', label: 'Avg', color: resolveColor('var(--s2)') },
  ];
  const netSeries = [
    { key: 'inbound', label: 'IN', color: resolveColor('var(--s1)'), fill: true },
    { key: 'outbound', label: 'OUT', color: resolveColor('var(--s3)'), fill: true },
  ];

  renderLegend($('#cpuLegend'), cpuSeries);
  renderLegend($('#memLegend'), memSeries);
  renderLegend($('#latencyLegend'), latSeries);
  renderLegend($('#netLegend'), netSeries);

  charts.cpu = createChart($('#cpuChart'), {
    type: 'line', format: 'pct', series: cpuSeries,
    tooltip: (i, d) => `${d.fullLabels?.[i] ?? ''} — CPU by cluster`,
  });
  charts.mem = createChart($('#memChart'), {
    type: 'area', format: 'pct', series: memSeries,
    tooltip: (i, d) => `${d.fullLabels?.[i] ?? ''} — Memory allocation`,
  });
  charts.latency = createChart($('#latencyChart'), {
    type: 'line', format: 'number', yMin: 0, series: latSeries,
    tooltip: (i, d) => `${d.fullLabels?.[i] ?? ''} — Latency (ms)`,
  });
  charts.net = createChart($('#netChart'), {
    type: 'area', format: 'rate', yMin: 0, series: netSeries,
    tooltip: (i, d) => `${d.fullLabels?.[i] ?? ''} — Network traffic`,
  });

  map = createWorldMap($('#alertMap'));
  map.start();
}

/** Extrai rótulos de hora (HH) e rótulos completos a partir de uma série. */
function labelsFrom(points) {
  const labels = points.map((p) => String(new Date(p.t).getHours()));
  const fullLabels = points.map((p) => clockTime(p.t));
  return { labels, fullLabels };
}

/** Chaves de série dos clusters, na ordem enviada pelo backend. */
const ZONE_KEYS = ['us-east', 'eu-west', 'asia-pac'];

/** Converte as séries por cluster em um mapa {chave: valores}. */
function zoneSeries(series) {
  const byKey = {};
  series.forEach((s, i) => {
    byKey[ZONE_KEYS[i] || s.zone.toLowerCase()] = s.points.map((p) => p.v);
  });
  return byKey;
}

/** Converte a estrutura de métricas (mock ou backend) em dados de gráfico. */
function applyMetrics(metrics) {
  if (!metrics) return;

  if (metrics.cpu?.length) {
    const { labels, fullLabels } = labelsFrom(metrics.cpu[0].points);
    charts.cpu?.setData({ labels, fullLabels, series: zoneSeries(metrics.cpu) });
  }

  if (metrics.memory?.length) {
    const { labels, fullLabels } = labelsFrom(metrics.memory[0].points);
    charts.mem?.setData({ labels, fullLabels, series: zoneSeries(metrics.memory) });
  }

  if (metrics.latency) {
    const base = metrics.latency.p99 || metrics.latency.avg || [];
    const { labels, fullLabels } = labelsFrom(base);
    charts.latency?.setData({
      labels, fullLabels,
      series: {
        p99: (metrics.latency.p99 || []).map((p) => p.v),
        p95: (metrics.latency.p95 || []).map((p) => p.v),
        avg: (metrics.latency.avg || []).map((p) => p.v),
      },
    });
  }

  if (metrics.network) {
    const base = metrics.network.inbound || [];
    const { labels, fullLabels } = labelsFrom(base);
    const inbound = (metrics.network.inbound || []).map((p) => p.v);
    const outbound = (metrics.network.outbound || []).map((p) => p.v);
    charts.net?.setData({ labels, fullLabels, series: { inbound, outbound } });
    $('#netInTotal').textContent = rate(inbound.reduce((a, b) => a + b, 0) / (inbound.length || 1));
    $('#netOutTotal').textContent = rate(outbound.reduce((a, b) => a + b, 0) / (outbound.length || 1));
  }
}

/** Atualiza os gráficos a partir do pacote de métricas de um tick. */
function pushMetrics(metrics) {
  applyMetrics(metrics);
}

/* ============================================================
   Renderização de listas
   ============================================================ */
function matchesSearch(text, query) {
  if (!query) return true;
  return String(text).toLowerCase().includes(query.toLowerCase());
}

function renderServers() {
  const grid = $('#serverGrid');
  const compact = $('#serverGridCompact');
  if (!grid) return;

  const filters = state.statusFilters;
  const q = state.serverSearch || state.globalSearch;

  const visible = state.servers.filter((s) => {
    const statusOk = filters.size === 0
      || (filters.has('online') && s.status === 'ONLINE')
      || (filters.has('error') && (s.status === 'ERROR' || s.status === 'WARNING'))
      || (filters.has('offline') && s.status === 'OFFLINE');
    const searchOk = matchesSearch(`${s.name} ${s.zone} ${s.id}`, q);
    return statusOk && searchOk;
  });

  grid.innerHTML = visible.length
    ? visible.map((s) => serverCard(s)).join('')
    : '<div class="empty-state">Nenhum servidor corresponde aos filtros aplicados.</div>';

  if (compact) {
    const nodes = state.nodes
      .filter((n) => matchesSearch(`${n.name} ${n.id}`, q))
      .slice(0, 8);
    compact.innerHTML = nodes.length
      ? nodes.map((n) => serverCard({ ...n, zone: '', history: n.history || [] }, { compact: true })).join('')
      : '<div class="empty-state">Sem nós.</div>';
  }
}

function renderContainers() {
  const grid = $('#dockerGrid');
  if (!grid) return;
  const q = state.globalSearch;
  const list = state.containers.filter((c) => matchesSearch(`${c.name} ${c.id} ${c.state}`, q));
  grid.innerHTML = list.length
    ? list.map(dockerCard).join('')
    : '<div class="empty-state">Sem containers.</div>';
}

function renderAlerts() {
  const list = $('#alertList');
  if (!list) return;
  const q = state.globalSearch;
  const items = state.alerts.filter((a) => matchesSearch(`${a.target} ${a.message} ${a.severity}`, q));
  list.innerHTML = items.length
    ? items.slice(0, 12).map(alertItem).join('')
    : '<li class="empty-state">Nenhum alerta.</li>';
}

function renderLogs() {
  const consoleEl = $('#logConsole');
  if (!consoleEl) return;
  const q = state.logSearch;
  const rows = state.logs
    .filter((l) => state.logLevels.has(l.level) && matchesSearch(`${l.message} ${l.source}`, q))
    .slice(-200);
  const atBottom = consoleEl.scrollHeight - consoleEl.scrollTop - consoleEl.clientHeight < 40;
  consoleEl.innerHTML = rows.length
    ? rows.map(logLine).join('')
    : '<div class="empty-state">Nenhum log corresponde ao filtro.</div>';
  if (atBottom) scrollToEnd(consoleEl);
}

function renderMap() {
  if (!map) return;
  map.setPoints(state.incidents);
  const incidents = state.incidents.filter((p) => p.severity !== 'OK').length;
  $('#incidentCount').textContent = String(incidents);
}

function renderAll() {
  renderServers();
  renderContainers();
  renderAlerts();
  renderLogs();
  renderMap();
}

/* ============================================================
   Ingestão de dados
   ============================================================ */
function ingestSnapshot(snap) {
  if (!snap) return;
  if (snap.servers) state.servers = snap.servers;
  if (snap.nodes) state.nodes = snap.nodes;
  if (snap.containers) state.containers = snap.containers;
  if (snap.alerts) state.alerts = snap.alerts;
  if (snap.logs) state.logs = snap.logs;
  if (snap.incidents) state.incidents = snap.incidents;
  if (snap.metrics) applyMetrics(snap.metrics);
  if (snap.servers) {
    // Histórico local dos cards (sparkline) quando o backend não envia.
    state.servers.forEach((s) => {
      if (!s.history) s.history = [];
      s.history = [...s.history.slice(-23), s.cpu];
    });
  }
  renderAll();
}

function ingestTick(tick) {
  if (!tick) return;
  if (tick.metrics) pushMetrics(tick.metrics);
  if (tick.alerts?.length) {
    state.alerts = [...tick.alerts, ...state.alerts].slice(0, 40);
    renderAlerts();
    tick.alerts.forEach((a) => toast(`${a.severity}: ${a.target}`, 'error'));
  }
  if (tick.logs?.length) {
    state.logs = [...state.logs, ...tick.logs].slice(-400);
    renderLogs();
  }
  if (tick.servers) {
    state.servers = tick.servers;
    state.servers.forEach((s) => {
      if (!s.history) s.history = [];
      s.history = [...s.history.slice(-23), s.cpu];
    });
    renderServers();
  }
}

/* ============================================================
   Toasts
   ============================================================ */
function toast(message, kind = 'info') {
  const stack = $('#toastStack');
  if (!stack) return;
  const el = document.createElement('div');
  el.className = 'toast';
  el.dataset.kind = kind;
  el.textContent = message;
  stack.appendChild(el);
  setTimeout(() => {
    el.classList.add('is-leaving');
    setTimeout(() => el.remove(), 260);
  }, 3600);
}

/* ============================================================
   Streaming
   ============================================================ */
const stream = createStream({
  onEvent: (ev) => {
    if (ev.type === 'status') {
      const conn = $('#connState');
      const labels = {
        ws: 'WebSocket conectado',
        connecting: 'Conectando…',
        closed: 'Reconectando…',
        poll: 'Polling REST',
        mock: 'Modo demonstração (dados locais)',
      };
      conn.textContent = labels[ev.state] || ev.state;
      conn.dataset.state = ev.state === 'ws' ? 'open' : ev.state === 'mock' ? 'closed' : 'connecting';
      if (ev.state === 'mock' && API_BASE) toast('Backend indisponível — usando dados simulados.', 'error');
      return;
    }
    if (ev.type === 'snapshot') ingestSnapshot(ev.data);
    if (ev.type === 'tick') ingestTick(ev.data);
  },
});

/* ============================================================
   Eventos de UI
   ============================================================ */
function bindEvents() {
  $('#themeToggle').addEventListener('click', () => theme.toggle());

  // Navegação superior
  delegate($('#mainNav'), 'click', '.nav-item', (ev, btn) => {
    $$('#mainNav .nav-item').forEach((b) => b.classList.toggle('is-active', b === btn));
    const view = btn.dataset.view;
    if (view !== 'infrastructure') {
      toast(`Seção "${btn.textContent.trim()}" é apenas navegação de exemplo neste protótipo.`);
    }
  });

  // Botão Live Data (pausa/retoma streaming)
  $('#livePill').addEventListener('click', async (ev) => {
    const btn = ev.currentTarget;
    const next = !stream.enabled;
    stream.setEnabled(next);
    btn.classList.toggle('is-paused', !next);
    btn.querySelector('.live-text').textContent = next ? 'Live Data' : 'Pausado';
    try { await api.setStream(next); } catch { /* backend opcional */ }
  });

  // Filtros de status dos servidores
  delegate($('#statusFilters'), 'click', '.pill', (ev, btn) => {
    const key = btn.dataset.filter;
    if (state.statusFilters.has(key)) state.statusFilters.delete(key);
    else state.statusFilters.add(key);
    btn.classList.toggle('is-active', state.statusFilters.has(key));
    renderServers();
  });

  // Filtros de nível de log
  delegate($('#logFilters'), 'click', '.pill', (ev, btn) => {
    const key = btn.dataset.level;
    if (state.logLevels.has(key)) state.logLevels.delete(key);
    else state.logLevels.add(key);
    btn.classList.toggle('is-active', state.logLevels.has(key));
    renderLogs();
  });

  // Buscas
  $('#serverSearch').addEventListener('input', debounce((ev) => {
    state.serverSearch = ev.target.value.trim();
    renderServers();
  }, 120));

  $('#logSearch').addEventListener('input', debounce((ev) => {
    state.logSearch = ev.target.value.trim();
    renderLogs();
  }, 120));

  $('#globalSearch').addEventListener('input', debounce((ev) => {
    state.globalSearch = ev.target.value.trim();
    renderAll();
  }, 140));

  // Ações dos alertas (Ack / View Logs)
  delegate($('#alertList'), 'click', 'button[data-action]', async (ev, btn) => {
    const item = btn.closest('.alert-item');
    const id = item?.dataset.alertId;
    const alert = state.alerts.find((a) => a.id === id);
    if (!alert) return;

    if (btn.dataset.action === 'ack') {
      alert.acknowledged = true;
      item.classList.add('is-acked');
      btn.disabled = true;
      try { await api.acknowledgeAlert(id); } catch { /* backend opcional */ }
      toast(`Alerta ${alert.target} reconhecido.`, 'ok');
    } else {
      state.logSearch = alert.target;
      $('#logSearch').value = alert.target;
      renderLogs();
      $('#logs').scrollIntoView({ behavior: 'smooth', block: 'center' });
      toast(`Exibindo logs relacionados a ${alert.target}.`);
    }
  });

  // Enter no console de logs rola para o fim
  $('#logConsole').addEventListener('keydown', (ev) => {
    if (ev.key === 'End') scrollToEnd(ev.currentTarget);
  });
}

/* ============================================================
   Bootstrap
   ============================================================ */
async function boot() {
  theme.apply(theme.current, { save: false });
  initCharts();
  bindEvents();
  createDnd().mount(document);
  renderAll();

  // Busca inicial opcional via REST (garante conteúdo imediato mesmo
  // antes do primeiro frame do WebSocket).
  try {
    const snap = await api.snapshot();
    ingestSnapshot(snap);
  } catch { /* o stream cuidará do fallback */ }

  stream.start();
}

boot();
