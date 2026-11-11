package com.devops.board.config;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import com.devops.board.domain.TelemetryModels.Snapshot;
import com.devops.board.domain.TelemetryModels.Tick;
import com.devops.board.service.TelemetryService;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Handler do WebSocket de telemetria.
 *
 * <p>Responsabilidades:</p>
 * <ul>
 *   <li>Enviar um {@code snapshot} completo ao conectar;</li>
 *   <li>Difundir um {@code tick} incremental a cada intervalo agendado;</li>
 *   <li>Manter o registro das sessões ativas.</li>
 * </ul>
 */
@Component
public class TelemetryWebSocketHandler extends TextWebSocketHandler {

    private static final Logger log = LoggerFactory.getLogger(TelemetryWebSocketHandler.class);

    private final TelemetryService telemetry;
    private final ObjectMapper mapper;
    private final Map<String, WebSocketSession> sessions = new ConcurrentHashMap<>();

    public TelemetryWebSocketHandler(TelemetryService telemetry, ObjectMapper mapper) {
        this.telemetry = telemetry;
        this.mapper = mapper;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        sessions.put(session.getId(), session);
        send(session, Map.of("type", "snapshot", "data", telemetry.snapshot()));
        log.info("Cliente conectado: {} (total {})", session.getId(), sessions.size());
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        sessions.remove(session.getId());
        log.info("Cliente desconectado: {} (total {})", session.getId(), sessions.size());
    }

    /** Emite um tick para todos os clientes no intervalo configurado. */
    @Scheduled(fixedRateString = "${board.stream.interval-ms:2500}")
    public void broadcast() {
        if (sessions.isEmpty() || !telemetry.isStreamEnabled()) {
            return;
        }
        Tick tick = telemetry.advance();
        String payload;
        try {
            payload = mapper.writeValueAsString(tick);
        } catch (IOException e) {
            log.warn("Falha ao serializar tick", e);
            return;
        }
        TextMessage message = new TextMessage(payload);
        sessions.values().forEach(s -> {
            try {
                if (s.isOpen()) {
                    synchronized (s) {
                        s.sendMessage(message);
                    }
                }
            } catch (IOException e) {
                log.debug("Falha ao enviar para {}: {}", s.getId(), e.getMessage());
            }
        });
    }

    private void send(WebSocketSession session, Object payload) {
        try {
            String json = mapper.writeValueAsString(payload);
            synchronized (session) {
                session.sendMessage(new TextMessage(json));
            }
        } catch (IOException e) {
            log.warn("Falha ao enviar snapshot: {}", e.getMessage());
        }
    }

    public Snapshot currentSnapshot() {
        return telemetry.snapshot();
    }
}
