# 📋 Fila de Tarefas (Backlog) - DevOps Status Board

Documento de planejamento e divisão de tarefas para o desenvolvimento do **Dashboard de Monitoramento de Infraestrutura em Tempo Real**.

---

## 🛠️ Sprint 0: Setup do Projeto e Arquitetura Inicial

- [ ] **0.1 Setup do Ambiente**
  - Inicializar projeto com React + TypeScript (Vite).
  - Configurar Tailwind CSS para estilização rápida e responsiva.
  - Configurar ESLint, Prettier e alias de caminhos (`@/components`, `@/hooks`, etc.).
- [ ] **0.2 Configuração do Tema (Dark/Light Mode)**
  - Configurar provedor de tema (`ThemeProvider`) utilizando Tailwind (classe `dark`).
  - Salvar a preferência de tema do usuário no `localStorage`.
- [ ] **0.3 Mock/Simulador de Dados (WebSocket / Polling)**
  - Criar um hook customizado (`useInfrastructureData`) ou um serviço local para gerar dados fictícios em tempo real (métricas de CPU, memória, rede e logs).
  - Adicionar controle de *start/stop* do streaming de dados mockados para facilitar os testes.

---

## 🎨 Sprint 1: Layout Base & Componentes Globais

- [ ] **1.1 Layout Principal (Shell)**
  - Construir a barra lateral (*Sidebar*) e o cabeçalho (*Header*) com navegação fictícia e perfil de usuário.
  - Adicionar o alternador de tema (*Dark/Light Mode Toggle*) no cabeçalho.
- [ ] **1.2 Grid de Widgets (Base para Drag and Drop)**
  - Estruturar o container principal do Dashboard usando CSS Grid.
  - Integrar a biblioteca de arrastar e soltar (ex: `@dnd-kit` ou `react-grid-layout`).
  - Garantir que a ordem personalizada das seções seja mantida ao reorganizar os cards.

---

## 📈 Sprint 2: Visualização de Métricas & Gráficos Interativos

- [ ] **2.1 Integração da Biblioteca de Gráficos**
  - Instalar e configurar `Recharts` ou `Chart.js` (com `react-chartjs-2`).
- [ ] **2.2 Componente de Gráficos em Tempo Real**
  - Criar componente de gráfico de linha para **Uso de CPU** por cluster.
  - Criar componente de gráfico de área para **Alocação de Memória**.
  - Criar componente de gráfico para **Tráfego de Rede (In/Out)**.
  - Adicionar *Tooltips* interativos com detalhes exatos ao passar o mouse.
  - Implementar funcionalidade de zoom/pan para analisar períodos específicos de tempo.

---

## 💻 Sprint 3: Lista de Servidores, Filtros e Busca

- [ ] **3.1 Grid de Status de Servidores**
  - Criar os cards individuais de servidor (exibe nome, CPU%, Memória%, Disco% e status atual: *Online*, *Offline*, *Error*).
- [ ] **3.2 Sistema de Busca e Filtragem**
  - Implementar barra de pesquisa em tempo real para filtrar servidores por nome ou tag.
  - Criar filtros por botões de alternância (*pills*) para o status do servidor (*Online*, *Error*, *Warning*).
  - Garantir performance na filtragem utilizando `useMemo`.

---

## 🚨 Sprint 4: Alertas, Notificações e Logs

- [ ] **4.1 Painel de Alertas Críticos (*Recent Critical Alerts*)**
  - Criar componente de lista de alertas classificados por severidade (*Fatal*, *Critical*, *Warning*).
  - Adicionar botão de confirmação de alerta (*Acknowledge*) e visualizador rápido de logs.
- [ ] **4.2 Feed de Logs em Tempo Real (*Log Entries*)**
  - Criar console com scroll automático exibindo os últimos logs do sistema (ERROR, INFO, DEBUG).
  - Adicionar filtro rápido por tipo de log.

---

## 🧪 Sprint 5: Testes & Qualidade de Código

- [ ] **5.1 Testes Unitários e de Componentes (Vitest + React Testing Library)**
  - Testar a atualização do estado ao receber novos dados simulados.
  - Testar a lógica de busca e ordenação dos servidores.
  - Testar a alternância entre modo claro e escuro.
- [ ] **5.2 Otimizações de Performance**
  - Garantir o uso adequado de `React.memo` para evitar renderizações desnecessárias nos gráficos durante atualizações em tempo real.
  - Validar acessibilidade básica (contraste de cores, suporte a teclado).

---

## 🚀 Checklist Final para Envio/Portfólio

- [ ] Escrever um `README.md` completo com:
  - Gif/Screenshots do projeto.
  - Links para a demonstração ao vivo (*Vercel/Netlify*).
  - Instruções para rodar o projeto localmente (`npm install && npm run dev`).
  - Breve explicação da arquitetura e decisões de código tomadas.