/** Utilitários de formatação numérica, de tempo e de bytes. */

const pctFmt = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });

export function pct(value) {
  if (value == null || Number.isNaN(value)) return '—';
  return `${pctFmt.format(Math.round(value))}%`;
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/** Classifica uma porcentagem em nível visual: ok | warn | crit. */
export function level(value, warnAt = 70, critAt = 85) {
  if (value >= critAt) return 'crit';
  if (value >= warnAt) return 'warn';
  return 'ok';
}

/** Formata bytes/s para unidade legível (KB/s, MB/s, GB/s). */
export function rate(bytesPerSec) {
  const n = Math.max(0, bytesPerSec || 0);
  const units = ['B/s', 'KB/s', 'MB/s', 'GB/s', 'TB/s'];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i += 1; }
  return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

/** Horário curto HH:MM:SS a partir de epoch ms ou Date. */
export function clockTime(ts) {
  const d = ts instanceof Date ? ts : new Date(ts);
  return d.toLocaleTimeString('pt-BR', { hour12: false });
}

/** Data ISO curta AAAA-MM-DD. */
export function isoDate(ts) {
  const d = ts instanceof Date ? ts : new Date(ts);
  return d.toISOString().slice(0, 10);
}

/** Carimbo completo usado no console de logs: 2026-07-19 10:07:10. */
export function logStamp(ts) {
  return `${isoDate(ts)} ${clockTime(ts)}`;
}

export function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}
