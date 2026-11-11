package com.devops.board.service;

import static com.devops.board.domain.TelemetryModels.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.ThreadLocalRandom;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicLong;

import org.springframework.stereotype.Service;

/**
 * Fonte de telemetria em memória.
 *
 * <p>Simula a coleta de métricas de um parque de servidores: mantém séries
 * temporais com janela deslizante, estado dos nós, containers, alertas e
 * logs. Em um cenário real, esta classe seria substituída por coletores
 * (Prometheus, Docker API, etc.) mantendo a mesma interface pública.</p>
 */
@Service
public class TelemetryService {

    public static final int WINDOW = 24;
    private static final long POINT_INTERVAL_MS = 60_000L;
    private static final List<String> ZONES = List.of("US-East", "EU-West", "Asia-Pac");
    private static final List<String> NODE_NAMES = List.of(
            "API-WEST-01", "API-WEST-02", "API-WEST-03", "API-WEST-04",
            "API-EST-01", "API-EST-02", "API-EST-03", "API-EST-04",
            "API-PAC-01", "API-PAC-02", "API-PAC-03", "API-PAC-04");
    private static final List<ServerStatus> STATUS_CYCLE = List.of(
            ServerStatus.ONLINE, ServerStatus.ONLINE, ServerStatus.ONLINE,
            ServerStatus.OFFLINE, ServerStatus.ERROR, ServerStatus.WARNING);
    private static final List<String> ALERT_TARGETS = List.of(
            "DB-MASTER-REPLICA", "DB-MASTER", "API-GATEWAY", "CACHE-REDIS", "QUEUE-KAFKA");
    private static final List<Severity> SEVERITY_CYCLE = List.of(
            Severity.FATAL, Severity.CRITICAL, Severity.CRITICAL, Severity.WARNING);
    private static final List<String> CONTAINER_NAMES = List.of(
            "api-gateway-7f9c", "auth-service-2b4d", "payments-9a1e",
            "redis-cache-4c8f", "postgres-main-1d3a", "worker-queue-6e2b");
    private static final List<ContainerState> CONTAINER_CYCLE = List.of(
            ContainerState.RUNNING, ContainerState.RUNNING, ContainerState.PAUSED,
            ContainerState.ERROR, ContainerState.RUNNING, ContainerState.WARNING);
    private static final List<String> LOG_MESSAGES = List.of(
            "GET /v1/health 200 12ms",
            "cache miss key=user:profile:88213",
            "connection pool resized to 32",
            "POST /v1/orders 201 148ms",
            "retrying upstream call attempt=2",
            "token refreshed for tenant=acme",
            "scheduled job cleanup.expired-sessions ok",
            "slow query detected duration=812ms",
            "TLS handshake failed for peer 10.4.9.12",
            "graceful shutdown signal received");
    private static final List<String> LOG_SOURCES = List.of(
            "api-service", "auth-service", "payments-service", "worker-service");

    /** Séries por cluster; a chave é o nome da zona. */
    private final Map<String, List<Double>> cpuByZone = new ConcurrentHashMap<>();
    private final Map<String, List<Double>> memByZone = new ConcurrentHashMap<>();
    private final Map<String, List<Double>> netIn = new ConcurrentHashMap<>();
    private final Map<String, List<Double>> netOut = new ConcurrentHashMap<>();
    private final Map<String, List<Double>> latency = new ConcurrentHashMap<>();

    private final List<Server> servers = new CopyOnWriteArrayList<>();
    private final List<Alert> alerts = new CopyOnWriteArrayList<>();
    private final List<LogEntry> logs = new CopyOnWriteArrayList<>();

    private final AtomicBoolean streamEnabled = new AtomicBoolean(true);
    private final AtomicLong tickCounter = new AtomicLong();
    private final List<Point> cpuTimeline = new CopyOnWriteArrayList<>();

    public TelemetryService() {
        seed();
    }

    /* ------------------------------------------------------------------
       Semente inicial
       ------------------------------------------------------------------ */
    private void seed() {
        long base = System.currentTimeMillis() - (long) WINDOW * POINT_INTERVAL_MS;
        for (int z = 0; z < ZONES.size(); z++) {
            String zone = ZONES.get(z);
            cpuByZone.put(zone, randomSeries(WINDOW, 34 + z * 13.0, 7.0, base));
            memByZone.put(zone, randomSeries(WINDOW, 52 + z * 9.0, 6.0, base));
        }
        netIn.put("all", randomSeries(WINDOW, 7_400_000, 900_000, base));
        netOut.put("all", randomSeries(WINDOW, 4_100_000, 700_000, base));
        latency.put("p99", randomSeries(WINDOW, 92, 9, base));
        latency.put("p95", randomSeries(WINDOW, 61, 7, base));
        latency.put("avg", randomSeries(WINDOW, 34, 5, base));

        for (int i = 0; i < NODE_NAMES.size(); i++) {
            servers.add(newServer(i, base));
        }
        for (int i = 0; i < 6; i++) {
            alerts.add(newAlert(i));
        }
        for (int i = 0; i < 40; i++) {
            logs.add(newLog(System.currentTimeMillis() - i * 45_000L));
        }
    }

    private List<Double> randomSeries(int n, double center, double spread, long base) {
        List<Double> out = new ArrayList<>(n);
        double v = center;
        for (int i = 0; i < n; i++) {
            v += ThreadLocalRandom.current().nextDouble(-spread, spread) - (v - center) * 0.08;
            out.add(round(Math.max(0, v)));
        }
        return out;
    }

    private Server newServer(int i, long base) {
        String name = NODE_NAMES.get(i % NODE_NAMES.size());
        ServerStatus status = STATUS_CYCLE.get(i % STATUS_CYCLE.size());
        double cpu = status == ServerStatus.OFFLINE ? 0 : round(rnd(8, 82));
        double mem = status == ServerStatus.OFFLINE ? 0 : round(rnd(20, 88));
        List<Double> history = new ArrayList<>(randomSeries(WINDOW, Math.max(cpu, 12), 6, base));
        return new Server(name, name, ZONES.get(i % ZONES.size()), status, cpu, mem,
                round(rnd(18, 92)), round(rnd(96, 99.99)), (int) rnd(12, 240),
                history, System.currentTimeMillis());
    }

    private Alert newAlert(int i) {
        Severity sev = SEVERITY_CYCLE.get(i % SEVERITY_CYCLE.size());
        return new Alert("alert-" + UUID.randomUUID(), sev,
                ALERT_TARGETS.get(i % ALERT_TARGETS.size()),
                "Error message from upstream dependency",
                System.currentTimeMillis() - i * 3_600_000L, false);
    }

    private LogEntry newLog(long ts) {
        LogLevel level = pick(List.of(LogLevel.ERROR, LogLevel.INFO, LogLevel.INFO, LogLevel.DEBUG, LogLevel.DEBUG));
        return new LogEntry("log-" + UUID.randomUUID(), level,
                pick(LOG_MESSAGES), pick(LOG_SOURCES), ts);
    }

    /* ------------------------------------------------------------------
       Avanço do tempo (chamado pelo scheduler e sob demanda)
       ------------------------------------------------------------------ */
    /** Avança todas as séries em um ponto e devolve o pacote incremental. */
    public synchronized Tick advance() {
        long now = System.currentTimeMillis();
        for (String zone : ZONES) {
            shift(cpuByZone.get(zone), 20 + ZONES.indexOf(zone) * 13.0, 7.0);
            shift(memByZone.get(zone), 50 + ZONES.indexOf(zone) * 9.0, 6.0);
        }
        shift(netIn.get("all"), 7_400_000, 900_000);
        shift(netOut.get("all"), 4_100_000, 700_000);
        shift(latency.get("p99"), 92, 9);
        shift(latency.get("p95"), 61, 7);
        shift(latency.get("avg"), 34, 5);

        servers.replaceAll(s -> {
            if (s.status() == ServerStatus.OFFLINE) {
                return new Server(s.id(), s.name(), s.zone(), s.status(), 0, 0, s.disk(),
                        s.uptimePct(), s.latencyMs(), shiftHistory(s.history(), 0), now);
            }
            double cpu = clamp(s.cpu() + rnd(-4, 4), 3, 97);
            double mem = clamp(s.memory() + rnd(-3, 3), 8, 97);
            return new Server(s.id(), s.name(), s.zone(), s.status(), round(cpu), round(mem), s.disk(),
                    s.uptimePct(), s.latencyMs(), shiftHistory(s.history(), cpu), now);
        });

        List<Alert> freshAlerts = new ArrayList<>();
        if (ThreadLocalRandom.current().nextDouble() > 0.72) {
            Alert a = newAlert(ThreadLocalRandom.current().nextInt(ALERT_TARGETS.size()));
            alerts.add(0, a);
            trim(alerts, 40);
            freshAlerts.add(a);
        }

        List<LogEntry> freshLogs = new ArrayList<>();
        int n = 1 + ThreadLocalRandom.current().nextInt(2);
        for (int i = 0; i < n; i++) {
            LogEntry l = newLog(now);
            logs.add(l);
            freshLogs.add(l);
        }
        trim(logs, 400);

        tickCounter.incrementAndGet();
        return new Tick("tick", metrics(), freshAlerts, freshLogs, List.copyOf(servers), now);
    }

    private void shift(List<Double> series, double center, double spread) {
        if (series == null) return;
        double last = series.get(series.size() - 1);
        double next = last + ThreadLocalRandom.current().nextDouble(-spread, spread) - (last - center) * 0.08;
        series.add(round(Math.max(0, next)));
        if (series.size() > WINDOW) series.remove(0);
    }

    private List<Double> shiftHistory(List<Double> history, double value) {
        List<Double> next = new ArrayList<>(history);
        next.add(round(value));
        if (next.size() > WINDOW) next.remove(0);
        return next;
    }

    private void trim(List<?> list, int max) {
        while (list.size() > max) list.remove(list.size() - 1);
    }

    /* ------------------------------------------------------------------
       Leituras
       ------------------------------------------------------------------ */
    public Metrics metrics() {
        long base = System.currentTimeMillis() - (long) (WINDOW - 1) * POINT_INTERVAL_MS;
        List<MetricSeries> cpu = new ArrayList<>();
        List<MetricSeries> mem = new ArrayList<>();
        for (String zone : ZONES) {
            cpu.add(new MetricSeries(zone, toPoints(cpuByZone.get(zone), base)));
            mem.add(new MetricSeries(zone, toPoints(memByZone.get(zone), base)));
        }
        LatencyMetrics lat = new LatencyMetrics(
                toPoints(latency.get("p99"), base),
                toPoints(latency.get("p95"), base),
                toPoints(latency.get("avg"), base));
        NetworkMetrics net = new NetworkMetrics(
                toPoints(netIn.get("all"), base),
                toPoints(netOut.get("all"), base));
        return new Metrics(cpu, mem, lat, net);
    }

    private List<Point> toPoints(List<Double> values, long base) {
        List<Point> out = new ArrayList<>(values.size());
        for (int i = 0; i < values.size(); i++) {
            out.add(new Point(base + (long) i * POINT_INTERVAL_MS, values.get(i)));
        }
        return out;
    }

    public List<Server> servers() {
        return List.copyOf(servers);
    }

    public List<Node> nodes() {
        return servers.stream()
                .map(s -> new Node(s.id(), s.name(), s.status(), s.cpu(), s.memory(), s.history(), s.updatedAt()))
                .toList();
    }

    public List<Container> containers() {
        return java.util.stream.IntStream.range(0, CONTAINER_NAMES.size())
                .mapToObj(i -> new Container(
                        CONTAINER_NAMES.get(i), CONTAINER_NAMES.get(i),
                        CONTAINER_CYCLE.get(i % CONTAINER_CYCLE.size()),
                        round(rnd(0.5, 12)), round(rnd(10, 60)), round(rnd(0.5, 12))))
                .toList();
    }

    public List<Alert> alerts() {
        return List.copyOf(alerts);
    }

    public List<LogEntry> logs(int limit) {
        List<LogEntry> copy = List.copyOf(logs);
        return copy.size() <= limit ? copy : copy.subList(0, limit);
    }

    public List<Incident> incidents() {
        List<Incident> out = new ArrayList<>();
        for (int i = 0; i < 14; i++) {
            Severity sev = pick(List.of(Severity.FATAL, Severity.CRITICAL, Severity.WARNING, Severity.OK));
            out.add(new Incident(round(rnd(-58, 66)), round(rnd(-160, 170)), sev, pick(ALERT_TARGETS)));
        }
        return out;
    }

    public Snapshot snapshot() {
        return new Snapshot(servers(), nodes(), containers(), alerts(), logs(60),
                metrics(), incidents(), streamEnabled.get(), System.currentTimeMillis());
    }

    public boolean acknowledge(String id) {
        for (int i = 0; i < alerts.size(); i++) {
            Alert a = alerts.get(i);
            if (a.id().equals(id)) {
                alerts.set(i, new Alert(a.id(), a.severity(), a.target(), a.message(),
                        a.createdAt(), true));
                return true;
            }
        }
        return false;
    }

    public boolean isStreamEnabled() {
        return streamEnabled.get();
    }

    public void setStreamEnabled(boolean enabled) {
        streamEnabled.set(enabled);
    }

    /* ------------------------------------------------------------------
       Auxiliares
       ------------------------------------------------------------------ */
    private static double rnd(double min, double max) {
        return ThreadLocalRandom.current().nextDouble(min, max);
    }

    private static double clamp(double v, double min, double max) {
        return Math.max(min, Math.min(max, v));
    }

    private static double round(double v) {
        return Math.round(v * 100.0) / 100.0;
    }

    private static <T> T pick(List<T> list) {
        return list.get(ThreadLocalRandom.current().nextInt(list.size()));
    }

    public String summary() {
        return String.format(Locale.ROOT, "servers=%d alerts=%d logs=%d ticks=%d",
                servers.size(), alerts.size(), logs.size(), tickCounter.get());
    }

    public long uptimeTick() {
        return tickCounter.get();
    }

    public long generatedAt() {
        return Instant.now().toEpochMilli();
    }
}
