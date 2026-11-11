/**
 * Motor de gráficos em canvas (sem dependências externas).
 * Suporta múltiplas séries (linha e área), eixo X por hora, eixo Y
 * percentual/absoluto, grade, legenda externa, tooltip no hover e
 * crosshair vertical. Redimensiona via ResizeObserver.
 */

import { pct, rate, clockTime } from '../utils/format.js';

const CSS_VAR = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

const PAD = { top: 12, right: 14, bottom: 20, left: 34 };

function readPalette() {
  return {
    grid: CSS_VAR('--border'),
    axis: CSS_VAR('--text-mute'),
    text: CSS_VAR('--text-mute'),
    s1: CSS_VAR('--s1') || '#4a8fe0',
    s2: CSS_VAR('--s2') || '#34c98a',
    s3: CSS_VAR('--s3') || '#e0a83c',
  };
}

function niceTicks(min, max, count = 5) {
  const span = max - min || 1;
  const step = 10 ** Math.floor(Math.log10(span / count));
  const err = (span / count) / step;
  const mult = err >= 7.5 ? 10 : err >= 3.5 ? 5 : err >= 1.5 ? 2 : 1;
  const s = step * mult;
  const start = Math.ceil(min / s) * s;
  const out = [];
  for (let v = start; v <= max + 1e-9; v += s) out.push(v);
  return out;
}

/**
 * Cria um gráfico dentro de um <canvas>.
 * @param {HTMLCanvasElement} canvas
 * @param {object} opts
 */
export function createChart(canvas, opts = {}) {
  const cfg = {
    type: 'line',           // line | area
    format: 'pct',          // pct | rate | number
    yMax: null,
    yMin: 0,
    series: [],             // [{key,label,color,fill}]
    xLabelEvery: 3,
    tooltip: null,          // (index, seriesValues) => html
    onHover: null,
    ...opts,
  };

  const ctx = canvas.getContext('2d');
  const tooltipEl = document.getElementById('tooltip');
  let data = { labels: [], series: {} };
  let hoverIndex = -1;
  let geom = null;

  function cssSize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(60, Math.floor(rect.width));
    const h = Math.max(40, Math.floor(rect.height));
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { w, h };
  }

  function fmtVal(v) {
    if (cfg.format === 'rate') return rate(v);
    if (cfg.format === 'number') return Intl.NumberFormat('pt-BR').format(Math.round(v));
    return pct(v);
  }

  function computeGeom(w, h) {
    const plotW = w - PAD.left - PAD.right;
    const plotH = h - PAD.top - PAD.bottom;
    let max = cfg.yMax;
    if (max == null) {
      let m = 0;
      for (const s of cfg.series) {
        for (const v of data.series[s.key] || []) m = Math.max(m, v);
      }
      max = m || 100;
      max = cfg.format === 'pct' ? Math.ceil(max / 10) * 10 : max * 1.12;
    }
    const min = cfg.yMin ?? 0;
    const n = data.labels.length;
    const stepX = n > 1 ? plotW / (n - 1) : plotW;
    return { w, h, plotW, plotH, max, min, stepX, n };
  }

  const xAt = (i) => PAD.left + (geom.n > 1 ? i * geom.stepX : 0);
  const yAt = (v) => PAD.top + geom.plotH - ((v - geom.min) / (geom.max - geom.min || 1)) * geom.plotH;

  function drawGrid() {
    const p = readPalette();
    ctx.font = '9px ' + (CSS_VAR('--sans') || 'sans-serif');
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    const ticks = niceTicks(geom.min, geom.max, 4);
    ctx.strokeStyle = p.grid;
    ctx.lineWidth = 1;
    for (const t of ticks) {
      const y = yAt(t);
      if (y < PAD.top - 1 || y > PAD.top + geom.plotH + 1) continue;
      ctx.beginPath();
      ctx.globalAlpha = 0.5;
      ctx.moveTo(PAD.left, y);
      ctx.lineTo(PAD.left + geom.plotW, y);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = p.text;
      ctx.fillText(fmtVal(t), PAD.left - 5, y);
    }
    // eixo X
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = p.text;
    data.labels.forEach((lab, i) => {
      if (i % cfg.xLabelEvery !== 0 && i !== data.labels.length - 1) return;
      ctx.fillText(lab, xAt(i), PAD.top + geom.plotH + 5);
    });
  }

  function drawSeries(seriesCfg) {
    const values = data.series[seriesCfg.key] || [];
    if (!values.length) return;
    const color = seriesCfg.color || readPalette().s1;
    ctx.beginPath();
    values.forEach((v, i) => {
      const x = xAt(i);
      const y = yAt(v);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    if (seriesCfg.fill) {
      const grad = ctx.createLinearGradient(0, PAD.top, 0, PAD.top + geom.plotH);
      grad.addColorStop(0, `${color}66`);
      grad.addColorStop(1, `${color}05`);
      ctx.save();
      ctx.lineTo(xAt(values.length - 1), PAD.top + geom.plotH);
      ctx.lineTo(xAt(0), PAD.top + geom.plotH);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.restore();
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.8;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // marcador do último ponto
    const lastX = xAt(values.length - 1);
    const lastY = yAt(values[values.length - 1]);
    ctx.beginPath();
    ctx.arc(lastX, lastY, 2.4, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }

  function drawCrosshair() {
    if (hoverIndex < 0 || !geom) return;
    const p = readPalette();
    const x = xAt(hoverIndex);
    ctx.save();
    ctx.strokeStyle = p.axis;
    ctx.globalAlpha = 0.55;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(x, PAD.top);
    ctx.lineTo(x, PAD.top + geom.plotH);
    ctx.stroke();
    ctx.restore();
    for (const s of cfg.series) {
      const v = (data.series[s.key] || [])[hoverIndex];
      if (v == null) continue;
      ctx.beginPath();
      ctx.arc(x, yAt(v), 3, 0, Math.PI * 2);
      ctx.fillStyle = s.color || p.s1;
      ctx.fill();
      ctx.strokeStyle = CSS_VAR('--panel');
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }
  }

  function render() {
    const { w, h } = cssSize();
    geom = computeGeom(w, h);
    ctx.clearRect(0, 0, w, h);
    drawGrid();
    for (const s of cfg.series) drawSeries(s);
    drawCrosshair();
  }

  function showTooltip(i, clientX, clientY) {
    if (!tooltipEl) return;
    const rows = cfg.series.map((s) => {
      const v = (data.series[s.key] || [])[i];
      const color = s.color || readPalette().s1;
      return `<div class="tt-row"><span><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${color};margin-right:5px"></span>${s.label}</span><b>${v == null ? '—' : fmtVal(v)}</b></div>`;
    }).join('');
    const title = cfg.tooltip ? cfg.tooltip(i, data) : (data.fullLabels?.[i] ?? data.labels[i]);
    tooltipEl.innerHTML = `<div class="tt-title">${title}</div>${rows}`;
    tooltipEl.classList.add('is-visible');
    tooltipEl.setAttribute('aria-hidden', 'false');
    const rect = tooltipEl.getBoundingClientRect();
    let left = clientX + 14;
    let top = clientY - rect.height - 10;
    if (left + rect.width > window.innerWidth - 8) left = clientX - rect.width - 14;
    if (top < 8) top = clientY + 16;
    tooltipEl.style.left = `${left}px`;
    tooltipEl.style.top = `${top}px`;
  }

  function hideTooltip() {
    tooltipEl?.classList.remove('is-visible');
    tooltipEl?.setAttribute('aria-hidden', 'true');
  }

  canvas.addEventListener('mousemove', (ev) => {
    if (!geom || geom.n === 0) return;
    const rect = canvas.getBoundingClientRect();
    const x = ev.clientX - rect.left;
    let idx = Math.round((x - PAD.left) / (geom.stepX || 1));
    idx = Math.max(0, Math.min(geom.n - 1, idx));
    if (idx !== hoverIndex) {
      hoverIndex = idx;
      render();
    }
    showTooltip(idx, ev.clientX, ev.clientY);
  });

  canvas.addEventListener('mouseleave', () => {
    hoverIndex = -1;
    hideTooltip();
    render();
  });

  const ro = new ResizeObserver(() => render());
  ro.observe(canvas.parentElement);

  return {
    /** @param {{labels:string[], fullLabels?:string[], series:Record<string, number[]>}} next */
    setData(next) {
      data = { ...next };
      render();
    },
    update(next) {
      data = { ...data, ...next };
      render();
    },
    render,
    get data() { return data; },
    destroy() { ro.disconnect(); },
  };
}

/** Monta a legenda (HTML) de um gráfico a partir das séries. */
export function renderLegend(el, series) {
  if (!el) return;
  el.innerHTML = series.map((s) => (
    `<span class="legend-item"><span class="legend-swatch" style="background:${s.color}"></span>${s.label}</span>`
  )).join('');
}
