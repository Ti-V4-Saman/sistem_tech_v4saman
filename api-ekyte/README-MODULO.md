# 📦 Módulo eKyte BI (Time BRIU) — Guia de Integração

Este projeto foi estruturado como um **módulo plugável e reutilizável**, permitindo que você o integre em qualquer outro sistema de 4 formas diferentes:

1. **Como Módulo Express/Node.js** (plugar diretamente nas rotas do seu backend existente).
2. **Como Microfront-end / Iframe Incorporado** (embutir em React, Vue, Angular, Laravel, PHP, etc.).
3. **Como Biblioteca Analítica (SDK Programático)** (usar apenas as funções de dados e sincronização no seu código).
4. **Como API REST** (consumir os dados em qualquer linguagem: Python, PHP, C#, Java, Go, etc.).

---

## 🚀 Forma 1: Plugar no seu Backend Express / Node.js existente

Se o seu outro sistema é um backend Node.js (com Express), você pode importar e montar este módulo com apenas **3 linhas de código**:

```javascript
const express = require('express');
const { createEkyteBiModule } = require('./caminho/para/api-ekyte'); // ou nome do pacote npm

const app = express();

async function bootstrap() {
  // Inicializa o módulo (cria tabelas, agendador e rotas)
  const ekyteBi = await createEkyteBiModule({
    // Configurações opcionais:
    cronSchedule: '0 * * * *', // Coleta a cada 1h (passe false se não quiser cron automático)
    serveStatic: true,          // Serve o HTML, CSS e JS do dashboard automaticamente
    syncOnStartup: false,       // Disparar sincronização assim que o servidor subir?
  });

  // Monta em QUALQUER caminho que você desejar (ex: /ekyte-bi, /bi, /modulos/ekyte)
  app.use('/ekyte-bi', ekyteBi.router);

  app.listen(8080, () => {
    console.log('Sistema principal rodando em http://localhost:8080');
    console.log('Dashboard BI acessível em: http://localhost:8080/ekyte-bi');
  });
}

bootstrap();
```

### Usando o Banco de Dados do seu Sistema Principal:
Se você já tem uma conexão MySQL ou variáveis próprias no seu sistema, pode passar para o módulo:

```javascript
const ekyteBi = await createEkyteBiModule({
  dbConfig: {
    host: 'seu-mysql-host',
    port: 3306,
    user: 'seu_usuario',
    password: 'sua_password',
    database: 'ekyte_bi',
  },
  // OU passe seu pool existente:
  // pool: meuPoolMysql2Existente,
});
```

---

## 🖼️ Forma 2: Incorporar no Front-end de Outro Sistema (Iframe / Embed)

Se o seu outro sistema tem um front-end em **React, Next.js, Vue, Angular, Laravel (Blade), PHP, Django, etc.**, você pode deixar o BI rodando como microserviço e simplesmente incorporar a tela:

```html
<!-- Exemplo em qualquer página HTML ou componente React/Vue -->
<iframe 
  src="http://localhost:3000/?embed=true" 
  style="width: 100%; height: 90vh; border: none; border-radius: 8px;"
  title="BI Operacional Time BRIU">
</iframe>
```

### Parâmetros Especiais de Embed:
* **`?embed=true`**: Ativa o modo incorporado (ajusta margens e responsividade).
* **`?noheader=true`**: Oculta o cabeçalho superior do BI (ideal se o seu sistema principal já tiver sua própria barra de navegação/logo no topo).
  ```html
  <iframe src="http://localhost:3000/?embed=true&noheader=true" style="width: 100%; height: 100vh; border: none;"></iframe>
  ```

---

## 📊 Forma 3: Usar como SDK Programático (Consultas puras no Node.js)

Se você precisa apenas calcular métricas, gerar relatórios ou buscar dados nos seus próprios controladores sem abrir o dashboard visual:

```javascript
const { analytics, runFullSync } = require('./api-ekyte');

// 1. Obter dados completos do Dashboard (KPIs, gráficos, rankings):
const dashData = await analytics.getDashboardData({
  preset: 'thisWeek',        // 'thisWeek', 'lastWeek', 'today', '7d', 'thisMonth', etc.
  executor: 'Gabriel Guerra',// ou 'all'
  workspace: 'all',
  overdueStatus: 'all',      // 'NO_PRAZO', 'ALTERED_DUE_DATE', 'ALL_OVERDUE', etc.
});
console.log('Taxa de SLA:', dashData.kpis.slaComplianceRate);
console.log('Chamados com prazo alterado:', dashData.kpis.totalOverdueCount);

// 2. Obter lista paginada de tickets:
const tickets = await analytics.getPaginatedTickets({
  page: 1,
  pageSize: 50,
  overdueStatus: 'ALTERED_DUE_DATE', // Filtrar quem mexeu no prazo
});

// 3. Obter raio-x detalhado de um chamado (histórico de prazos, apontamentos, etapas):
const detalhe = await analytics.getTicketDetail(336597);

// 4. Disparar sincronização manual com o eKyte sob demanda:
await runFullSync('MANUAL_TRIGGER');
```

---

## 🌐 Forma 4: Consumo via API REST (Qualquer Linguagem)

Se o seu outro sistema foi feito em Python, PHP, C# (.NET), Ruby, etc., você pode consumir diretamente os endpoints REST que o módulo fornece:

| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/api/bi/dashboard?preset=thisWeek` | KPIs consolidados, funil por etapas, SLA e rankings |
| `GET` | `/api/bi/filters` | Metadados dinâmicos e opções de filtro (com 184 workspaces) |
| `GET` | `/api/bi/tickets?page=1&pageSize=30` | Tabela paginada com status, prazos originais e alterados |
| `GET` | `/api/bi/tickets/:id` | Histórico completo de etapas, apontamentos e auditoria do prazo |
| `GET` | `/api/bi/tickets/export` | Download de CSV com filtros aplicados |
| `POST` | `/api/bi/sync-now` | Disparo imediato da sincronização com a API do eKyte |
| `GET` | `/api/bi/sync-status` | Histórico e status das sincronizações executadas |

---

## ⚙️ Variáveis de Ambiente Necessárias (`.env`)

Ao implementar em outro ambiente, basta garantir as seguintes variáveis:

```ini
# API do eKyte
EKYTE_API_KEY="seu_token_aqui"
EKYTE_API_URL="https://api.ekyte.com/v1"

# Banco MySQL
DB_HOST="143.244.156.195"
DB_PORT=3306
DB_USER="root"
DB_PASS="sua_senha"
DB_NAME="ekyte_bi"

# Configurações do Módulo
PORT=3000
SYNC_CRON="0 * * * *" # A cada 1 hora
```

---

## 💻 Como continuar rodando de forma independente (Standalone)

O projeto continua 100% autônomo. Se quiser executá-lo diretamente:
```bash
npm start
```
Ele subirá na porta 3000 com o dashboard interativo completo em `http://localhost:3000`.

