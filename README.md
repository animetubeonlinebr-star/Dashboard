# 📊 Global DevOps Status Board

Dashboard de monitoramento de infraestrutura em tempo real. A interface foi
construída para reproduzir o layout de referência em `tela principal.jpg`, e o
comportamento segue o backlog descrito em `fila_de_tarefas_board.md`.

O sistema é dividido em duas partes:

- **Frontend** — HTML, CSS e JavaScript puro (ES Modules), sem etapa de build e
  sem dependências de runtime. Os gráficos, o mapa e os medidores são desenhados
  em `<canvas>` por um motor próprio.
- **Backend** — Java 21 com Spring Boot. Expõe a API REST de telemetria e um
  WebSocket que envia atualizações incrementais a cada 2,5 s.

---

## 🖼️ Layout

A tela principal é um grid de três colunas, fiel à imagem de referência:

| Coluna | Painéis |
| --- | --- |
| Esquerda | Infrastructure Overview (grid de servidores) + Infrastructure Overview (nós compactos) |
| Centro | System Performance Metrics (CPU + Memória), Service Latency + Active Alerts Map, Docker Container Health |
| Direita | Recent Critical Alerts, Recent Log Entries, Network Traffic (IN/OUT) |

O cabeçalho traz a marca, a navegação (Infrastructure, Applications, Logs,
Settings), a busca global, o menu de usuário, o alternador de tema e o botão
**Live Data** que pausa/retoma o streaming.

### Paleta

Os tokens de cor ficam em `:root` (`frontend/css/styles.css`) e foram extraídos
da imagem de referência:

| Token | Escuro | Uso |
| --- | --- | --- |
| `--bg` | `#0b121c` | fundo da página |
| `--header` | `#121a26` | cabeçalho |
| `--panel` | `#151c28` | painéis |
| `--card` | `#1b2331` | cards internos |
| `--ok` / `--err` / `--warn` | `#3fbf7f` / `#e5484d` / `#dfa63c` | status |
| `--crit` / `--fatal` | `#f2683c` / `#d6336c` | severidade de alertas |
| `--accent` | `#4aa8e0` | destaques e links |

O tema claro é ativado por `[data-theme="light"]` no `<html>`; a preferência é
salva em `localStorage`.

---

## 🚀 Como executar

### Opção 1 — Backend Spring Boot (recomendado)

O backend serve o frontend na mesma origem, então não há configuração extra.

```bash
cd backend
mvn spring-boot:run
```

Acesse <http://localhost:8080>.

Para gerar o jar executável:

```bash
cd backend
mvn clean package
java -jar target/devops-status-board-1.0.0.jar
```

### Opção 2 — Frontend estático apenas

O frontend funciona sozinho: se a API não responder, ele entra em modo de
demonstração com dados gerados localmente.

```bash
cd frontend
python3 -m http.server 5500
```

Acesse <http://localhost:5500>. Para apontar para um backend em outra porta, use
o parâmetro `?api=`:

```
http://localhost:5500/?api=http://localhost:8080
```

---

## 🔌 API REST

| Método | Rota | Descrição |
| --- | --- | --- |
| `GET` | `/api/snapshot` | Estado completo (servidores, métricas, alertas, logs, incidentes) |
| `GET` | `/api/servers` | Lista de servidores |
| `GET` | `/api/nodes` | Nós no formato compacto |
| `GET` | `/api/containers` | Saúde dos containers Docker |
| `GET` | `/api/metrics?points=N` | Séries de CPU, memória, latência e rede |
| `GET` | `/api/alerts` | Alertas recentes |
| `GET` | `/api/logs?limit=N` | Últimas entradas de log |
| `GET` | `/api/stream` | Estado do streaming |
| `POST` | `/api/stream?enabled=true|false` | Liga/desliga o streaming |
| `POST` | `/api/alerts/{id}/acknowledge` | Reconhece um alerta |
| `GET` | `/api/health` | Verificação de saúde |

### WebSocket

Endpoint `ws://localhost:8080/ws/telemetry`. Ao conectar, o cliente recebe um
`snapshot` completo; em seguida, um `tick` incremental a cada 2,5 s.

```json
{ "type": "snapshot", "data": { "servers": [], "metrics": {} } }
{ "type": "tick", "metrics": {}, "alerts": [], "logs": [], "servers": [], "timestamp": 0 }
```

---

## 🧠 Arquitetura do frontend

```
frontend/
├── index.html               # estrutura da tela
├── css/styles.css           # tokens de tema, layout e componentes
└── js/
    ├── app.js               # orquestração: estado, render, eventos
    ├── theme.js             # provedor de tema (dark/light + localStorage)
    ├── dnd.js               # reordenação de painéis (drag and drop)
    ├── components/
    │   ├── charts.js        # motor de gráficos em canvas + tooltips
    │   ├── map.js           # mapa mundial com pontos de incidentes
    │   └── widgets.js       # cards de servidor, docker, alertas e logs
    ├── services/
    │   ├── api.js           # cliente REST
    │   ├── stream.js        # WebSocket com fallback para polling/mock
    │   └── mock.js          # gerador de dados simulados
    └── utils/
        ├── dom.js           # helpers de DOM e eventos
        └── format.js        # formatação de números, tempo e bytes
```

### Decisões de projeto

- **Zero dependências no frontend.** Em vez de React, Recharts e dnd-kit, a
  entrega usa módulos ES nativos, um motor de gráficos próprio em canvas e a API
  nativa de drag and drop. Isso elimina `node_modules`, build e atualizações de
  dependências, mantendo o pacote leve.
- **Fallback em cascata no streaming.** O canal tenta WebSocket, depois polling
  REST e, por último, dados simulados. O dashboard nunca fica vazio.
- **Cores lidas dos tokens CSS.** O canvas resolve as variáveis de tema em tempo
  de execução, então alternar o tema repinta os gráficos sem recarregar.
- **Simulador isolado no backend.** `TelemetryService` concentra a geração de
  dados. Trocar por coletores reais (Prometheus, Docker API) exige apenas
  substituir essa classe.

---

## ✅ Funcionalidades

- Streaming em tempo real via WebSocket, com indicador de estado da conexão.
- Gráficos de linha e área para CPU, memória, latência e rede, com crosshair e
  tooltip detalhado no hover.
- Mapa mundial de incidentes com pontos pulsantes por severidade.
- Grid de servidores com CPU, memória, disco, status e sparkline da última hora.
- Busca em tempo real e filtros por status (pills) para servidores e logs.
- Painel de alertas críticos com ações *Ack* e *View Logs*.
- Console de logs com auto-scroll e filtro por nível (ERROR, INFO, DEBUG).
- Painéis reordenáveis por drag and drop, com ordem persistida em `localStorage`.
- Tema claro e escuro, com preferência persistida.
- Layout responsivo (três colunas → duas → uma).

---

## 🧪 Testes

```bash
cd backend
mvn test
```

Cobrem o simulador de telemetria (janela deslizante, ticks, reconhecimento de
alertas, pausa do stream) e os endpoints REST (snapshot, métricas, stream,
acknowledge e health).

---

## 🛠️ Tecnologias

- Java 21, Spring Boot 3.3 (Web, WebSocket, Validation)
- HTML5, CSS3 (Grid, Flexbox, custom properties)
- JavaScript ES2022 (ES Modules, Canvas API, WebSocket, ResizeObserver)
- Maven, JUnit 5, AssertJ

---

## 📄 Referências

- `tela principal.jpg` — layout visual de referência.
- `fila_de_tarefas_board.md` — backlog funcional do projeto.
