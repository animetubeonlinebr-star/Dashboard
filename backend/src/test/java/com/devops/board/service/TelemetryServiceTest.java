package com.devops.board.service;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

import com.devops.board.domain.TelemetryModels.Snapshot;
import com.devops.board.domain.TelemetryModels.Tick;

class TelemetryServiceTest {

    private final TelemetryService service = new TelemetryService();

    @Test
    void snapshotContemTodasAsSecoes() {
        Snapshot snap = service.snapshot();
        assertThat(snap.servers()).hasSize(12);
        assertThat(snap.nodes()).hasSize(12);
        assertThat(snap.containers()).hasSize(6);
        assertThat(snap.alerts()).isNotEmpty();
        assertThat(snap.logs()).isNotEmpty();
        assertThat(snap.incidents()).hasSize(14);
        assertThat(snap.metrics().cpu()).hasSize(3);
        assertThat(snap.metrics().memory()).hasSize(3);
        assertThat(snap.metrics().network().inbound()).hasSize(TelemetryService.WINDOW);
    }

    @Test
    void advanceMantemJanelaDeslizante() {
        int before = service.metrics().cpu().get(0).points().size();
        for (int i = 0; i < 5; i++) {
            service.advance();
        }
        int after = service.metrics().cpu().get(0).points().size();
        assertThat(after).isEqualTo(before).isEqualTo(TelemetryService.WINDOW);
    }

    @Test
    void advanceProduzTickComTipoCorreto() {
        Tick tick = service.advance();
        assertThat(tick.type()).isEqualTo("tick");
        assertThat(tick.metrics()).isNotNull();
        assertThat(tick.servers()).hasSize(12);
        assertThat(tick.timestamp()).isPositive();
    }

    @Test
    void reconhecimentoDeAlertaAlteraEstado() {
        String id = service.alerts().get(0).id();
        assertThat(service.acknowledge(id)).isTrue();
        assertThat(service.alerts()).anyMatch(a -> a.id().equals(id) && a.acknowledged());
        assertThat(service.acknowledge("inexistente")).isFalse();
    }

    @Test
    void streamPodeSerPausadoERetomado() {
        assertThat(service.isStreamEnabled()).isTrue();
        service.setStreamEnabled(false);
        assertThat(service.isStreamEnabled()).isFalse();
        service.setStreamEnabled(true);
        assertThat(service.isStreamEnabled()).isTrue();
    }
}
