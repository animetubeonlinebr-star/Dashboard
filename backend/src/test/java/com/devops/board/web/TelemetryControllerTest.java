package com.devops.board.web;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import com.devops.board.service.TelemetryService;

@WebMvcTest(controllers = TelemetryController.class)
@Import(TelemetryService.class)
class TelemetryControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void snapshotRetornaEstruturaCompleta() throws Exception {
        mockMvc.perform(get("/api/snapshot"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.servers").isArray())
                .andExpect(jsonPath("$.metrics.cpu").isArray())
                .andExpect(jsonPath("$.incidents").isArray());
    }

    @Test
    void metricsRespeitaParametroDePontos() throws Exception {
        mockMvc.perform(get("/api/metrics").param("points", "12"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cpu").isArray());
    }

    @Test
    void streamPodeSerAlternado() throws Exception {
        mockMvc.perform(post("/api/stream").param("enabled", "false"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.enabled").value(false));

        mockMvc.perform(post("/api/stream").param("enabled", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.enabled").value(true));
    }

    @Test
    void acknowledgeDeAlertaInexistenteRetorna404() throws Exception {
        mockMvc.perform(post("/api/alerts/nao-existe/acknowledge"))
                .andExpect(status().isNotFound());
    }

    @Test
    void healthReportaStatusUp() throws Exception {
        mockMvc.perform(get("/api/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"));
    }
}
