# 📋 Fila de Tarefas (Backlog) - DevOps Status Board

Documento de planejamento e divisão de tarefas para o desenvolvimento do **Dashboard de Monitoramento de Infraestrutura em Tempo Real**.

> **Status da implementação.** O escopo foi entregue com HTML, CSS e JavaScript
> puro no frontend (sem React) e Java + Spring Boot no backend. A decisão de
> trocar React/Vite/Tailwind por módulos ES nativos elimina `node_modules` e a
> etapa de build, mantendo o mesmo resultado visual e funcional. Os itens abaixo
> refletem o que está de fato implementado no repositório.

---

## 🛠️ Sprint 0: Setup do Projeto e Arquitetura Inicial

- [x] **0.1 Setup do Ambiente**
  - Frontend em HTML + CSS + JavaScript (ES Modules), sem etapa de build.
  - Design tokens centralizados em `frontend/css/styles.css` (`:root`).
  - Backend Java 21 + Spring Boot 3.3 gerenciado por Maven.
- [x] **0.2 Configuração do Tema (Dark/Light Mode)**
  - Tema aplicado via atributo `data-theme` no `<html>` (`frontend/js/theme.js`).
  - Preferência do usuário salva em `localStorage`.
- [x] **0.3 Mock/Simulador de Dados (WebSocket / Polling)**
  - Simulador no backend (`TelemetryService`) gera CPU, memória, rede e logs.
  - Streaming por WebSocket com fallback para polling REST e dados locais.
  - Controle de *start/stop* do streaming pelo botão **Live Data**.

---

## 🎨 Sprint 1: Layout Base & Componentes Globais

- [x] **1.1 Layout Principal (Shell)**
  - Cabeçalho com marca, navegação (Infrastructure, Applications, Logs,
    Settings), busca global e perfil de usuário.
  - Alternador de tema (*Dark/Light Mode Toggle*) no cabeçalho.
- [x] **1.2 Grid de Widgets (Base para Drag and Drop)**
  - Container principal estruturado com CSS Grid em três colunas.
  - Arrastar e soltar nativo (`frontend/js/dnd.js`), restrito a cada coluna.
  - Ordem personalizada dos cards mantida em `localStorage`.

---

## 📈 Sprint 2: Visualização de Métricas & Gráficos Interativos

- [x] **2.1 Integração da Biblioteca de Gráficos**
  - Motor de gráficos próprio em canvas (`frontend/js/components/charts.js`),
    sem dependências externas.
- [x] **2.2 Componente de Gráficos em Tempo Real**
  - Gráfico de linha para **Uso de CPU** por cluster.
  - Gráfico de área para **Alocação de Memória**.
  - Gráfico para **Tráfego de Rede (In/Out)**.
  - *Tooltips* interativos com valores exatos ao passar o mouse.
  - Crosshair vertical acompanhando o cursor na análise da série.

---

## 💻 Sprint 3: Lista de Servidores, Filtros e Busca

- [x] **3.1 Grid de Status de Servidores**
  - Cards com nome, CPU%, Memória%, Disco% e status (*Online*, *Offline*,
    *Error*, *Warning*), além de sparkline da última hora.
- [x] **3.2 Sistema de Busca e Filtragem**
  - Barra de pesquisa em tempo real filtrando por nome ou tag.
  - Filtros por botões de alternância (*pills*) para o status do servidor.
  - Filtragem aplicada sobre o estado em memória a cada render.

---

## 🚨 Sprint 4: Alertas, Notificações e Logs

- [x] **4.1 Painel de Alertas Críticos (*Recent Critical Alerts*)**
  - Lista de alertas classificados por severidade (*Fatal*, *Critical*,
    *Warning*).
  - Botão de confirmação (*Ack*) e atalho para os logs relacionados.
- [x] **4.2 Feed de Logs em Tempo Real (*Log Entries*)**
  - Console com rolagem automática exibindo os últimos logs (ERROR, INFO,
    DEBUG).
  - Filtro rápido por tipo de log e busca por palavra-chave.

---

## 🧪 Sprint 5: Testes & Qualidade de Código

- [x] **5.1 Testes Unitários e de Componentes**
  - Testes do simulador: janela deslizante, geração de ticks, reconhecimento
    de alertas e pausa do stream.
  - Testes dos endpoints REST (snapshot, métricas, stream, acknowledge, health).
- [x] **5.2 Otimizações de Performance**
  - Renderizações reaproveitam nós existentes e usam *debounce* na busca.
  - `ResizeObserver` evita redesenho desnecessário dos canvas.
  - Contraste de cores e foco visível em controles (suporte a teclado).

---

## 🚀 Checklist Final para Envio/Portfólio

- [x] `README.md` completo com:
  - Descrição do layout e da paleta extraída da referência.
  - Instruções para rodar o projeto localmente (`mvn spring-boot:run`).
  - Documentação da API REST e do WebSocket.
  - Explicação da arquitetura e das decisões de código tomadas.
