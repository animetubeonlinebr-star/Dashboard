/**
 * Cliente HTTP para a API REST do backend Spring Boot.
 * Quando servido pelo próprio backend (mesma origem), basta a URL relativa.
 * Em desenvolvimento com Live Server, use ?api=http://localhost:8080.
 */

const params = new URLSearchParams(window.location.search);
export const API_BASE = (params.get('api') || '').replace(/\/$/, '');
export const WS_BASE = API_BASE
  ? API_BASE.replace(/^http/, 'ws')
  : `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`;

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Accept: 'application/json', ...(options.headers || {}) },
    ...options,
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} em ${path}`);
  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json') ? res.json() : res.text();
}

export const api = {
  snapshot: () => request('/api/snapshot'),
  servers: () => request('/api/servers'),
  metrics: (points = 60) => request(`/api/metrics?points=${points}`),
  alerts: () => request('/api/alerts'),
  logs: (limit = 60) => request(`/api/logs?limit=${limit}`),
  containers: () => request('/api/containers'),
  nodes: () => request('/api/nodes'),
  streamConfig: () => request('/api/stream'),
  setStream: (enabled) => request(`/api/stream?enabled=${enabled ? 'true' : 'false'}`, { method: 'POST' }),
  acknowledgeAlert: (id) => request(`/api/alerts/${encodeURIComponent(id)}/acknowledge`, { method: 'POST' }),
  health: () => request('/api/health'),
};

export default api;
