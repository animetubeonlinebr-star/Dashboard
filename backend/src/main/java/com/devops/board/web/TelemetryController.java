package com.devops.board.web;

import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.devops.board.domain.TelemetryModels.Alert;
import com.devops.board.domain.TelemetryModels.Container;
import com.devops.board.domain.TelemetryModels.LogEntry;
import com.devops.board.domain.TelemetryModels.Metrics;
import com.devops.board.domain.TelemetryModels.Node;
import com.devops.board.domain.TelemetryModels.Server;
import com.devops.board.domain.TelemetryModels.Snapshot;
import com.devops.board.domain.TelemetryModels.StreamState;
import com.devops.board.service.TelemetryService;

/**
 * API REST de telemetria consumida pelo dashboard.
 * Todas as respostas são JSON e refletem o estado atual em memória.
 */
@RestController
@RequestMapping("/api")
public class TelemetryController {

    private final TelemetryService telemetry;

    public TelemetryController(TelemetryService telemetry) {
        this.telemetry = telemetry;
    }

    /** Estado completo: servidores, métricas, alertas, logs e incidentes. */
    @GetMapping("/snapshot")
    public Snapshot snapshot() {
        return telemetry.snapshot();
    }

    @GetMapping("/servers")
    public List<Server> servers() {
        return telemetry.servers();
    }

    @GetMapping("/nodes")
    public List<Node> nodes() {
        return telemetry.nodes();
    }

    @GetMapping("/containers")
    public List<Container> containers() {
        return telemetry.containers();
    }

    @GetMapping("/metrics")
    public Metrics metrics(@RequestParam(defaultValue = "60") int points) {
        // A janela é fixa em memória; o parâmetro existe para compatibilidade
        // com consumidores que pedem um número específico de amostras.
        return telemetry.metrics();
    }

    @GetMapping("/alerts")
    public List<Alert> alerts() {
        return telemetry.alerts();
    }

    @GetMapping("/logs")
    public List<LogEntry> logs(@RequestParam(defaultValue = "60") int limit) {
        return telemetry.logs(limit);
    }

    @GetMapping("/stream")
    public StreamState streamState() {
        return new StreamState(telemetry.isStreamEnabled(), 2500L);
    }

    @PostMapping("/stream")
    public StreamState setStream(@RequestParam boolean enabled) {
        telemetry.setStreamEnabled(enabled);
        return new StreamState(enabled, 2500L);
    }

    @PostMapping("/alerts/{id}/acknowledge")
    public ResponseEntity<Map<String, Object>> acknowledge(@PathVariable String id) {
        boolean ok = telemetry.acknowledge(id);
        if (!ok) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(Map.of("id", id, "acknowledged", true));
    }

    @GetMapping("/health")
    public Map<String, Object> health() {
        return Map.of(
                "status", "UP",
                "summary", telemetry.summary(),
                "ticks", telemetry.uptimeTick(),
                "generatedAt", telemetry.generatedAt());
    }
}
