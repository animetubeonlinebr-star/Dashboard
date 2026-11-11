package com.devops.board.domain;

import java.util.List;

/**
 * Modelos de domínio do dashboard.
 * São imutáveis (records) e serializados diretamente como JSON pela API.
 */
public final class TelemetryModels {

    private TelemetryModels() {
    }

    public enum ServerStatus { ONLINE, OFFLINE, ERROR, WARNING }

    public enum Severity { FATAL, CRITICAL, WARNING, OK }

    public enum ContainerState { RUNNING, PAUSED, ERROR, WARNING }

    public enum LogLevel { ERROR, INFO, DEBUG }

    /** Amostra de uma métrica em um instante. */
    public record Point(long t, double v) {
    }

    /** Série temporal identificada por zona/cluster. */
    public record MetricSeries(String zone, List<Point> points) {
    }

    public record Server(
            String id,
            String name,
            String zone,
            ServerStatus status,
            double cpu,
            double memory,
            double disk,
            double uptimePct,
            int latencyMs,
            List<Double> history,
            long updatedAt) {
    }

    public record Node(
            String id,
            String name,
            ServerStatus status,
            double cpu,
            double memory,
            List<Double> history,
            long updatedAt) {
    }

    public record Container(
            String id,
            String name,
            ContainerState state,
            double cpu,
            double memory,
            double disk) {
    }

    public record Alert(
            String id,
            Severity severity,
            String target,
            String message,
            long createdAt,
            boolean acknowledged) {
    }

    public record LogEntry(
            String id,
            LogLevel level,
            String message,
            String source,
            long timestamp) {
    }

    public record Metrics(
            List<MetricSeries> cpu,
            List<MetricSeries> memory,
            LatencyMetrics latency,
            NetworkMetrics network) {
    }

    public record LatencyMetrics(List<Point> p99, List<Point> p95, List<Point> avg) {
    }

    public record NetworkMetrics(List<Point> inbound, List<Point> outbound) {
    }

    public record Incident(double lat, double lng, Severity severity, String target) {
    }

    /** Estado completo do board, entregue no snapshot inicial e no polling. */
    public record Snapshot(
            List<Server> servers,
            List<Node> nodes,
            List<Container> containers,
            List<Alert> alerts,
            List<LogEntry> logs,
            Metrics metrics,
            List<Incident> incidents,
            boolean streamEnabled,
            long generatedAt) {
    }

    /** Pacote incremental enviado a cada tick do stream. */
    public record Tick(
            String type,
            Metrics metrics,
            List<Alert> alerts,
            List<LogEntry> logs,
            List<Server> servers,
            long timestamp) {
    }

    public record StreamState(boolean enabled, long intervalMs) {
    }
}
