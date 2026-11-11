/**
 * Canal de dados em tempo real.
 *
 * Estratégia: tenta WebSocket nativo do backend Spring
 * (ws://host/ws/telemetry). Se a conexão falhar ou cair, faz fallback
 * automático para polling REST e, em último caso, para o gerador local.
 *
 * Eventos emitidos (via callback onEvent):
 *   {type:'status', state:'connecting'|'open'|'closed'|'mock'}
 *   {type:'snapshot', data}
 *   {type:'tick', data}
 */

import { API_BASE, WS_BASE, api } from './api.js';
import { mockSnapshot, mockTick } from './mock.js';

const WS_PATH = '/ws/telemetry';
const POLL_INTERVAL = 2500;
const RECONNECT_MAX = 8000;

export function createStream({ onEvent }) {
  let ws = null;
  let pollTimer = null;
  let reconnectTimer = null;
  let reconnectDelay = 800;
  let mode = null;          // null | ws | poll | mock
  let enabled = true;
  let stopped = false;

  const emit = (payload) => onEvent?.(payload);

  function setMode(next) {
    if (mode === next) return;
    mode = next;
    emit({ type: 'status', state: next });
  }

  /* ---------------------- WebSocket ---------------------- */
  function connectWs() {
    if (stopped || !enabled) return;
    try {
      ws = new WebSocket(`${WS_BASE}${WS_PATH}`);
    } catch {
      return startPolling();
    }

    ws.addEventListener('open', () => {
      reconnectDelay = 800;
      setMode('ws');
    });

    ws.addEventListener('message', (ev) => {
      let msg;
      try { msg = JSON.parse(ev.data); } catch { return; }
      if (msg.type === 'snapshot') emit({ type: 'snapshot', data: msg.data ?? msg.payload });
      else emit({ type: 'tick', data: msg });
    });

    ws.addEventListener('close', () => {
      ws = null;
      if (stopped || !enabled) return;
      scheduleReconnect();
    });

    ws.addEventListener('error', () => {
      try { ws?.close(); } catch { /* já fechado */ }
    });
  }

  function scheduleReconnect() {
    clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(() => {
      reconnectDelay = Math.min(reconnectDelay * 1.7, RECONNECT_MAX);
      // Após algumas tentativas frustradas, cai para polling REST.
      if (reconnectDelay >= RECONNECT_MAX) startPolling();
      else connectWs();
    }, reconnectDelay);
  }

  /* ------------------------ Polling ---------------------- */
  async function startPolling() {
    if (stopped || !enabled) return;
    try {
      const snap = await api.snapshot();
      setMode('poll');
      emit({ type: 'snapshot', data: snap });
    } catch {
      startMock();
      return;
    }
    clearInterval(pollTimer);
    pollTimer = setInterval(async () => {
      if (stopped || !enabled) return;
      try {
        const snap = await api.snapshot();
        emit({ type: 'tick', data: snap });
      } catch {
        startMock();
      }
    }, POLL_INTERVAL);
  }

  /* ------------------------ Mock local ------------------- */
  function startMock() {
    if (stopped) return;
    setMode('mock');
    emit({ type: 'snapshot', data: mockSnapshot() });
    clearInterval(pollTimer);
    pollTimer = setInterval(() => {
      if (stopped || !enabled) return;
      emit({ type: 'tick', data: mockTick() });
    }, POLL_INTERVAL);
  }

  /* ------------------------ API pública ------------------ */
  function start() {
    stopped = false;
    enabled = true;
    if (API_BASE || window.location.protocol.startsWith('http')) {
      mode = null;
      emit({ type: 'status', state: 'connecting' });
      connectWs();
    } else {
      startMock();
    }
  }

  function stop() {
    stopped = true;
    clearInterval(pollTimer);
    clearTimeout(reconnectTimer);
    try { ws?.close(); } catch { /* ignora */ }
    ws = null;
  }

  /** Pausa/retoma o consumo de dados (usado pelo botão Live Data). */
  function setEnabled(next) {
    enabled = next;
    if (!enabled) {
      clearInterval(pollTimer);
      clearTimeout(reconnectTimer);
      try { ws?.close(); } catch { /* ignora */ }
      ws = null;
    } else if (!stopped) {
      emit({ type: 'status', state: 'connecting' });
      connectWs();
    }
  }

  return { start, stop, setEnabled, get mode() { return mode; }, get enabled() { return enabled; } };
}
