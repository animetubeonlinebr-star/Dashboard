package com.devops.board.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

/**
 * Registra o endpoint de telemetria em tempo real.
 * O endpoint é exposto em /ws/telemetry e aceita conexões de qualquer
 * origem (ambiente de demonstração).
 */
@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private final TelemetryWebSocketHandler handler;

    public WebSocketConfig(TelemetryWebSocketHandler handler) {
        this.handler = handler;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(handler, "/ws/telemetry").setAllowedOriginPatterns("*");
    }
}
