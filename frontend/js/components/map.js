/**
 * Mapa mundial (projeção equirretangular) desenhado em canvas.
 * Os continentes usam polígonos simplificados e os incidentes são
 * plotados como pontos pulsantes coloridos por severidade.
 */

const CSS_VAR = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

// Contornos simplificados em pares [longitude, latitude].
const CONTINENTS = [
  // América do Norte
  [[-168,65],[-140,70],[-100,72],[-80,70],[-60,60],[-55,48],[-70,42],[-80,25],[-97,17],[-105,20],[-118,30],[-125,40],[-130,55],[-150,60]],
  // América Central / Sul
  [[-92,15],[-83,9],[-77,8],[-60,12],[-50,0],[-35,-5],[-40,-20],[-55,-35],[-70,-52],[-75,-45],[-72,-20],[-80,0],[-84,10]],
  // Europa
  [[-10,36],[-10,60],[0,70],[30,70],[40,60],[28,45],[20,38],[0,36]],
  // África
  [[-17,15],[0,35],[10,37],[35,32],[43,12],[52,12],[40,-5],[35,-20],[25,-34],[18,-34],[12,-18],[8,5]],
  // Ásia
  [[30,70],[60,72],[100,78],[140,72],[160,68],[140,55],[130,35],[120,22],[105,10],[95,20],[75,8],[60,25],[45,40],[40,60]],
  // Oceania
  [[114,-22],[130,-12],[145,-15],[153,-28],[146,-38],[135,-35],[120,-34]],
];

const SEV_COLOR = {
  FATAL: '--fatal',
  CRITICAL: '--crit',
  WARNING: '--warn',
  OK: '--ok',
};

export function createWorldMap(canvas) {
  const ctx = canvas.getContext('2d');
  let points = [];
  let raf = null;
  let geom = null;

  const project = (lng, lat) => ({
    x: ((lng + 180) / 360) * geom.w,
    y: ((90 - lat) / 180) * geom.h,
  });

  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(60, Math.floor(rect.width));
    const h = Math.max(40, Math.floor(rect.height));
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    geom = { w, h };
  }

  function drawLand() {
    ctx.beginPath();
    for (const poly of CONTINENTS) {
      poly.forEach(([lng, lat], i) => {
        const { x, y } = project(lng, lat);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.closePath();
    }
    ctx.fillStyle = CSS_VAR('--card') || '#1b2331';
    ctx.fill();
    ctx.strokeStyle = CSS_VAR('--border');
    ctx.lineWidth = 0.7;
    ctx.stroke();
  }

  function drawGrid() {
    ctx.strokeStyle = CSS_VAR('--border-soft');
    ctx.lineWidth = 0.6;
    ctx.globalAlpha = 0.5;
    for (let lng = -150; lng <= 150; lng += 30) {
      const { x } = project(lng, 0);
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, geom.h); ctx.stroke();
    }
    for (let lat = -60; lat <= 60; lat += 30) {
      const { y } = project(0, lat);
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(geom.w, y); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function drawPoints(time) {
    const pulse = (Math.sin(time / 620) + 1) / 2; // 0..1
    for (const p of points) {
      const { x, y } = project(p.lng, p.lat);
      const color = CSS_VAR(SEV_COLOR[p.severity] || '--info');
      const r = p.severity === 'FATAL' || p.severity === 'CRITICAL' ? 3 : 2.2;

      if (p.severity === 'FATAL' || p.severity === 'CRITICAL') {
        ctx.beginPath();
        ctx.arc(x, y, r + 2 + pulse * 4, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.16 * (1 - pulse);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = CSS_VAR('--panel');
      ctx.lineWidth = 0.9;
      ctx.stroke();
    }
  }

  function frame(time) {
    if (!geom) resize();
    ctx.clearRect(0, 0, geom.w, geom.h);
    drawGrid();
    drawLand();
    drawPoints(time || 0);
    raf = requestAnimationFrame(frame);
  }

  const ro = new ResizeObserver(() => { resize(); });
  ro.observe(canvas.parentElement);

  return {
    setPoints(next) { points = Array.isArray(next) ? next : []; },
    start() { if (!raf) raf = requestAnimationFrame(frame); },
    stop() { cancelAnimationFrame(raf); raf = null; },
    destroy() { this.stop(); ro.disconnect(); },
  };
}
