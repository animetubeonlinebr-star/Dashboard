/**
 * Componentes de UI que não usam canvas complexo:
 * cards de servidor (com sparkline), containers Docker, alertas e logs.
 * Cada função recebe dados e devolve HTML; a ligação de eventos é feita
 * por delegação em app.js.
 */

import { pct, level, escapeHtml, logStamp } from '../utils/format.js';

const STATUS_LABEL = { ONLINE: 'Online', OFFLINE: 'Offline', ERROR: 'Error', WARNING: 'Warning' };

/** Mini gráfico de linha em SVG inline (últimos pontos de CPU). */
function sparkline(values) {
  const pts = (values || []).slice(-24);
  if (pts.length < 2) return '<svg class="sparkline" viewBox="0 0 100 16" preserveAspectRatio="none"></svg>';
  const max = Math.max(...pts, 1);
  const min = Math.min(...pts, 0);
  const span = max - min || 1;
  const step = 100 / (pts.length - 1);
  const d = pts.map((v, i) => `${(i * step).toFixed(1)},${(15 - ((v - min) / span) * 13).toFixed(1)}`);
  const last = pts[pts.length - 1];
  const lastY = 15 - ((last - min) / span) * 13;
  const color = last >= 85 ? 'var(--err)' : last >= 70 ? 'var(--warn)' : 'var(--ok)';
  return `<svg class="sparkline" viewBox="0 0 100 16" preserveAspectRatio="none" aria-hidden="true">
    <polyline points="${d.join(' ')}" fill="none" stroke="${color}" stroke-width="1.4" stroke-linejoin="round"/>
    <circle cx="100" cy="${lastY.toFixed(1)}" r="1.8" fill="${color}"/>
  </svg>`;
}

function metricRow(label, value) {
  const lv = level(value);
  return `<div class="metric-row">
      <span class="metric-label">${label}</span>
      <span class="metric-bar"><i data-level="${lv}" style="width:${Math.min(100, value)}%"></i></span>
      <span class="metric-value">${pct(value)}</span>
    </div>`;
}

/** Card completo de servidor (com sparkline e linhas de status). */
export function serverCard(s, { compact = false } = {}) {
  if (compact) {
    return `<article class="server-card is-compact" data-server-id="${escapeHtml(s.id)}">
      <div class="server-card-head">
        <span class="status-dot ${s.status.toLowerCase()}"></span>
        <span class="server-name">${escapeHtml(s.name)}</span>
      </div>
      ${metricRow('CPU%', s.cpu)}
      ${metricRow('Memory%', s.memory)}
      <div class="server-foot"><span class="foot-label">Last hour</span>${sparkline(s.history)}</div>
    </article>`;
  }
  return `<article class="server-card" data-server-id="${escapeHtml(s.id)}">
    <div class="server-card-head">
      <span class="status-dot ${s.status.toLowerCase()}"></span>
      <span class="server-name">${escapeHtml(s.name)}</span>
      <span class="server-zone">${escapeHtml(s.zone || '')}</span>
    </div>
    ${metricRow('CPU%', s.cpu)}
    ${metricRow('Memory%', s.memory)}
    ${metricRow('Disk%', s.disk)}
    <div class="server-foot">
      <span class="foot-label">Last hour</span>${sparkline(s.history)}
    </div>
    <span class="server-status-line" data-status="${s.status}">${STATUS_LABEL[s.status] || s.status}</span>
  </article>`;
}

/** Card de container Docker. */
export function dockerCard(c) {
  const stateLabel = { RUNNING: 'Running', PAUSED: 'Paused', ERROR: 'Error', WARNING: 'Warning' };
  const dot = { RUNNING: 'online', PAUSED: 'warning', ERROR: 'error', WARNING: 'warning' };
  return `<article class="docker-card" data-container-id="${escapeHtml(c.id)}">
    <div class="docker-name">
      <span class="status-dot ${dot[c.state] || 'offline'}"></span>
      <span>${escapeHtml(c.name)}</span>
      <span class="docker-state">${stateLabel[c.state] || c.state}</span>
    </div>
    ${metricRow('CPU%', c.cpu)}
    ${metricRow('Memory%', c.memory)}
    ${metricRow('Disk%', c.disk)}
  </article>`;
}

/** Item da lista de alertas críticos. */
export function alertItem(a) {
  const sev = a.severity || 'WARNING';
  const label = sev.charAt(0) + sev.slice(1).toLowerCase();
  const time = new Date(a.createdAt).toLocaleTimeString('pt-BR', { hour12: false });
  return `<li class="alert-item${a.acknowledged ? ' is-acked' : ''}" data-severity="${sev}" data-alert-id="${escapeHtml(a.id)}">
    <span class="alert-sev" data-severity="${sev}"><span class="status-dot ${sev.toLowerCase()}"></span>${label}</span>
    <div class="alert-body">
      <div class="alert-target">${escapeHtml(a.target)}</div>
      <div class="alert-msg">${escapeHtml(a.message)}</div>
      <div class="alert-time">${time}</div>
    </div>
    <div class="alert-actions">
      <button class="mini-btn primary" data-action="ack" type="button"${a.acknowledged ? ' disabled' : ''}>Ack</button>
      <button class="mini-btn" data-action="view-logs" type="button">View Logs</button>
    </div>
  </li>`;
}

/** Linha do console de logs. */
export function logLine(l) {
  return `<div class="log-line" data-level="${l.level}" data-log-id="${escapeHtml(l.id)}">
    <span class="ts">${logStamp(l.timestamp)}</span>
    <span class="lvl">${l.level}</span>
    <span class="msg">${escapeHtml(l.message)}</span>
  </div>`;
}
