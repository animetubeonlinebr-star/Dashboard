/**
 * Gerador de dados simulados.
 * Usado como fallback quando o backend Java não está acessível, garantindo
 * que o dashboard continue operacional (útil para demonstração estática).
 * A semente é determinística por índice para manter o gráfico coerente
 * enquanto os valores evoluem suavemente a cada tick.
 */

const ZONES = ['US-East', 'EU-West', 'Asia-Pac'];
const NODE_NAMES = [
  'API-WEST-01', 'API-WEST-02', 'API-WEST-03', 'API-WEST-04',
  'API-EST-01', 'API-EST-02', 'API-EST-03', 'API-EST-04',
  'API-PAC-01', 'API-PAC-02', 'API-PAC-03', 'API-PAC-04',
];
const STATUSES = ['ONLINE', 'ONLINE', 'ONLINE', 'OFFLINE', 'ERROR', 'WARNING'];
const ALERT_TARGETS = ['DB-MASTER-REPLICA', 'DB-MASTER', 'API-GATEWAY', 'CACHE-REDIS', 'QUEUE-KAFKA'];
const SEVERITIES = ['FATAL', 'CRITICAL', 'CRITICAL', 'WARNING'];
const CONTAINER_NAMES = [
  'api-gateway-7f9c', 'auth-service-2b4d', 'payments-9a1e',
  'redis-cache-4c8f', 'postgres-main-1d3a', 'worker-queue-6e2b',
];
const CONTAINER_STATES = ['RUNNING', 'RUNNING', 'PAUSED', 'ERROR', 'RUNNING', 'WARNING'];
const LOG_MESSAGES = [
  'GET /v1/health 200 12ms',
  'cache miss key=user:profile:88213',
  'connection pool resized to 32',
  'POST /v1/orders 201 148ms',
  'retrying upstream call attempt=2',
  'token refreshed for tenant=acme',
  'scheduled job cleanup.expired-sessions ok',
  'slow query detected duration=812ms',
  'TLS handshake failed for peer 10.4.9.12',
  'graceful shutdown signal received',
];

let rnd = 1234567;
/** PRNG determinístico (mulberry32) — mesma sequência a cada carregamento. */
function rand() {
  rnd |= 0; rnd = (rnd + 0x6D2B79F5) | 0;
  let t = Math.imul(rnd ^ (rnd >>> 15), 1 | rnd);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const between = (a, b) => a + rand() * (b - a);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

/** Série temporal suave em torno de um centro, com ruído e tendência. */
function series(n, center, spread, base = 0) {
  const out = [];
  let v = center;
  for (let i = 0; i < n; i += 1) {
    v += between(-spread, spread) - (v - center) * 0.08;
    out.push({ t: base + i * 60_000, v: Math.max(0, v) });
  }
  return out;
}

function makeServer(i) {
  const name = NODE_NAMES[i % NODE_NAMES.length];
  const status = STATUSES[i % STATUSES.length];
  const cpu = status === 'OFFLINE' ? 0 : between(8, 82);
  const mem = status === 'OFFLINE' ? 0 : between(20, 88);
  const disk = between(18, 92);
  return {
    id: name,
    name,
    zone: ZONES[i % ZONES.length],
    status,
    cpu: +cpu.toFixed(1),
    memory: +mem.toFixed(1),
    disk: +disk.toFixed(1),
    uptimePct: +between(96, 99.99).toFixed(2),
    latencyMs: Math.round(between(12, 240)),
    history: series(24, cpu || 20, 6).map((p) => +p.v.toFixed(1)),
    updatedAt: Date.now(),
  };
}

function makeAlert(i) {
  const sev = SEVERITIES[i % SEVERITIES.length];
  return {
    id: `alert-${i + 1}`,
    severity: sev,
    target: ALERT_TARGETS[i % ALERT_TARGETS.length],
    message: 'Error message from upstream dependency',
    createdAt: Date.now() - i * 3_600_000,
    acknowledged: false,
  };
}

export function mockSnapshot() {
  return {
    servers: NODE_NAMES.map((_, i) => makeServer(i)),
    nodes: NODE_NAMES.map((_, i) => ({
      id: NODE_NAMES[i],
      name: NODE_NAMES[i],
      status: STATUSES[(i + 1) % STATUSES.length],
      cpu: +between(8, 60).toFixed(1),
      memory: +between(20, 80).toFixed(1),
      updatedAt: Date.now(),
    })),
    containers: CONTAINER_NAMES.map((name, i) => ({
      id: name,
      name,
      state: CONTAINER_STATES[i % CONTAINER_STATES.length],
      cpu: +between(0.5, 12).toFixed(2),
      memory: +between(10, 60).toFixed(1),
      disk: +between(0.5, 12).toFixed(2),
    })),
    alerts: Array.from({ length: 6 }, (_, i) => makeAlert(i)),
    logs: Array.from({ length: 40 }, (_, i) => ({
      id: `log-${i}`,
      level: pick(['ERROR', 'INFO', 'INFO', 'DEBUG', 'DEBUG']),
      message: LOG_MESSAGES[i % LOG_MESSAGES.length],
      source: `${pick(['api', 'auth', 'payments', 'worker'])}-service`,
      timestamp: Date.now() - i * 45_000,
    })),
    metrics: {
      cpu: ZONES.map((zone, z) => ({
        zone,
        points: series(24, 40 + z * 12, 7).map((p, i) => ({ t: p.t, v: +p.v.toFixed(1) })),
      })),
      memory: ZONES.map((zone, z) => ({
        zone,
        points: series(24, 55 + z * 10, 6).map((p) => ({ t: p.t, v: +p.v.toFixed(1) })),
      })),
      latency: {
        p99: series(24, 92, 9).map((p) => ({ t: p.t, v: +p.v.toFixed(1) })),
        p95: series(24, 61, 7).map((p) => ({ t: p.t, v: +p.v.toFixed(1) })),
        avg: series(24, 34, 5).map((p) => ({ t: p.t, v: +p.v.toFixed(1) })),
      },
      network: {
        inbound: series(24, 7.4e6, 9e5).map((p) => ({ t: p.t, v: Math.round(p.v) })),
        outbound: series(24, 4.1e6, 7e5).map((p) => ({ t: p.t, v: Math.round(p.v) })),
      },
    },
    incidents: Array.from({ length: 14 }, () => ({
      lat: between(-58, 66),
      lng: between(-160, 170),
      severity: pick(['FATAL', 'CRITICAL', 'WARNING', 'OK']),
      target: pick(ALERT_TARGETS),
    })),
    streamEnabled: true,
    generatedAt: Date.now(),
  };
}

/** Um novo tick de métricas + possíveis alertas/logs novos. */
export function mockTick() {
  return {
    metrics: mockSnapshot().metrics,
    alerts: rand() > 0.72 ? [makeAlert(Math.floor(rand() * 6))] : [],
    logs: Array.from({ length: 1 + Math.floor(rand() * 2) }, (_, i) => ({
      id: `log-${Date.now()}-${i}`,
      level: pick(['ERROR', 'INFO', 'INFO', 'DEBUG']),
      message: pick(LOG_MESSAGES),
      source: `${pick(['api', 'auth', 'payments', 'worker'])}-service`,
      timestamp: Date.now(),
    })),
    timestamp: Date.now(),
  };
}
