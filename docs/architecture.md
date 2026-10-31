# Architecture

Overview of npm-verify-guard's architecture and component design.

---

## English

### Overview

npm-verify-guard is a CLI tool that scans npm dependencies for security threats using a multi-layered approach. The architecture is designed to be fast for postinstall hooks while providing deep analysis through optional scheduled scans.

### ML Triage Layers

The system uses a 3-layer ML triage approach for both code content and security news:

| Layer | Method                                       | When it runs  | Description                                                      |
| ----- | -------------------------------------------- | ------------- | ---------------------------------------------------------------- |
| 1     | Regex + SHA-256 blacklist                    | Every scan    | Fast heuristic detection of known patterns and malware hashes    |
| 2     | TF-IDF + Naive Bayes (code) / MLP (news)     | Every scan    | Statistical ML classification using pure JavaScript              |
| 3     | ONNX (CodeBERT / DistilBERT) or MLP fallback | `--deep` flag | Deep learning models via ONNX runtime or fallback to bundled MLP |

**Fallback Chain**: If ONNX runtime or models are unavailable, Layer 3 automatically uses the bundled MLP weights in `data/models/`.

### Component Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLI (cli.js)                         │
│  Command parsing, routing, and user interaction             │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
┌───────────────┐         ┌───────────────┐
│  Local Scan   │         │ External Scan │
│ (scan-local)  │         │(scan-external) │
└───────┬───────┘         └───────┬───────┘
        │                         │
        │                         │
        ▼                         ▼
┌───────────────┐         ┌───────────────┐
│  Layer 1      │         │   OSV API     │
│  Heuristics   │         │   + RSS       │
└───────┬───────┘         └───────┬───────┘
        │                         │
        ▼                         ▼
┌───────────────┐         ┌───────────────┐
│  Layer 2      │         │  Layer 2/3    │
│  TF-IDF +     │         │  News Triage  │
│  Naive Bayes  │         │  (MLP/ONNX)   │
└───────┬───────┘         └───────┬───────┘
        │                         │
        ▼                         ▼
┌───────────────┐         ┌───────────────┐
│  Layer 3      │         │  Report Gen   │
│  ONNX / MLP   │         │  (report.js)  │
└───────┬───────┘         └───────┬───────┘
        │                         │
        └────────────┬────────────┘
                     ▼
            ┌───────────────┐
            │  Findings     │
            │  Aggregation  │
            └───────────────┘
```

### Core Components

#### CLI (`lib/cli.js`)

- Parses command-line arguments
- Routes to appropriate handlers
- Manages blocking/non-blocking modes
- Coordinates scan execution

#### Local Scan (`lib/scan-local.js`)

- Walks `node_modules` directory
- Applies Layer 1 heuristic rules (regex patterns)
- Checks files against known malware SHA-256 hashes
- Scans lifecycle scripts in `package.json`
- Integrates with ML triage for Layers 2 and 3

**Heuristic Rules** (Layer 1):

- `eval-usage`: Detects `eval()` calls
- `function-constructor`: Detects `new Function()` with dynamic code
- `base64-buffer`: Detects large base64-encoded buffers
- `env-exfiltration`: Detects possible environment variable exfiltration
- `obfuscated-url`: Detects obfuscated outbound requests

#### External Scan (`lib/scan-external.js`)

- Queries OSV API for vulnerability reports
- Fetches RSS security news feeds
- Caches external data (1-hour TTL)
- Integrates with ML triage for news items

#### ML Triage - Code (`lib/ml/triage-code.js`)

- Tokenizes code content
- Applies TF-IDF vectorization
- Classifies with Naive Bayes (Layer 2)
- Optionally uses ONNX CodeBERT (Layer 3)
- Falls back to bundled MLP if ONNX unavailable

#### ML Triage - News (`lib/ml/triage-news.js`)

- Tokenizes news titles and descriptions
- Classifies with MLP (Layer 2)
- Optionally uses ONNX DistilBERT (Layer 3)
- Matches news items to dependency names

#### Configuration (`lib/config.js`)

- Loads global config from `~/.npm-verify/config.json`
- Loads project config from `.npm-verify.json`
- Manages paths and defaults
- Handles glob pattern matching for ignore rules

#### Hooks (`lib/hooks.js`)

- Manages npm lifecycle hooks (`postinstall`, `prestart`, `predev`, `pretest`)
- Initializes project configuration
- Injects hooks into `package.json`

#### Lock (`lib/lock.js`)

- Manages status file (`.npm-verify/status.json`)
- Tracks scan state (running, ok, failed)
- Implements staleness detection
- Coordinates blocking behavior

#### Scheduler (`lib/scheduler.js`)

- Installs OS-level hourly scheduler
- Windows: Uses `schtasks` command
- Linux/macOS: Adds cron entry
- Runs `npm-verify check --deep` periodically

#### Daemon (`lib/daemon.js`)

- Alternative to OS scheduler
- Runs as background Node process
- Monitors watched projects
- Handles graceful shutdown

#### Report (`lib/report.js`)

- Aggregates findings from all sources
- Calculates exit codes based on severity
- Formats and prints reports
- Saves report to `.npm-verify/report.json`

### Data Flow

#### Blocking Scan (postinstall)

```
npm install
    ↓
postinstall hook: npm-verify check --blocking
    ↓
Set status to "running"
    ↓
Layer 1: Heuristics + Hash blacklist (fast)
    ↓
Layer 2: TF-IDF + Naive Bayes (fast)
    ↓
Generate report
    ↓
If high severity threats: Set status to "failed", exit 1
Else: Set status to "ok", exit 0
```

#### Deep Scan (scheduler/daemon)

```
Scheduler triggers hourly
    ↓
npm-verify check --deep
    ↓
Layer 1: Heuristics + Hash blacklist
    ↓
Layer 2: TF-IDF + Naive Bayes / MLP
    ↓
Layer 3: ONNX CodeBERT / DistilBERT (slow, accurate)
    ↓
External: OSV API + RSS feeds
    ↓
Generate report
    ↓
Notify if threats detected
```

#### Gate (prestart/predev/pretest)

```
npm start
    ↓
prestart hook: npm-verify gate
    ↓
Check status file
    ↓
If status is "running": Block execution, exit 1
If status is "failed": Block execution, exit 1
If status is stale: Run quick verification
If status is "ok": Allow execution, exit 0
```

### Performance Considerations

- **Layer 1**: < 100ms per package (regex + hash lookup)
- **Layer 2**: < 500ms per package (TF-IDF + Naive Bayes)
- **Layer 3**: 1-5s per package (ONNX inference, optional)
- **External Scan**: Depends on network, cached for 1 hour
- **Postinstall**: Only Layers 1 + 2 to remain fast
- **Scheduler/Daemon**: All layers for deep analysis

### Security Design

- **No external deps at scan time**: Only `fast-xml-parser` for RSS
- **Hash-based detection**: SHA-256 hashes, not file contents
- **Graceful degradation**: External scan failures don't block unless `--blocking`
- **Configurable blocking**: Users can set `blockOnMedium` and `blockOnHigh`
- **Allowlist**: Users can suppress false positives via `allowPackages`

---

## Português

### Visão Geral

npm-verify-guard é uma ferramenta CLI que varre dependências npm em busca de ameaças de segurança usando uma abordagem em camadas. A arquitetura é projetada para ser rápida para hooks postinstall enquanto fornece análise profunda através de varreduras agendadas opcionais.

### Camadas de Triagem ML

O sistema usa uma abordagem de triagem ML de 3 camadas tanto para conteúdo de código quanto para notícias de segurança:

| Camada | Método                                         | Quando executa | Descrição                                                              |
| ------ | ---------------------------------------------- | -------------- | ---------------------------------------------------------------------- |
| 1      | Regex + blacklist SHA-256                      | Toda varredura | Detecção heurística rápida de padrões conhecidos e hashes de malware   |
| 2      | TF-IDF + Naive Bayes (código) / MLP (notícias) | Toda varredura | Classificação ML estatística usando JavaScript puro                    |
| 3      | ONNX (CodeBERT / DistilBERT) ou fallback MLP   | Flag `--deep`  | Modelos de deep learning via runtime ONNX ou fallback para MLP bundled |

**Cadeia de Fallback**: Se runtime ONNX ou modelos estiverem indisponíveis, a Camada 3 usa automaticamente os pesos MLP bundled em `data/models/`.

### Arquitetura de Componentes

```
┌─────────────────────────────────────────────────────────────┐
│                        CLI (cli.js)                         │
│  Parse de comandos, roteamento e interação do usuário       │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
┌───────────────┐         ┌───────────────┐
│  Local Scan   │         │ External Scan │
│ (scan-local)  │         │(scan-external) │
└───────┬───────┘         └───────┬───────┘
        │                         │
        │                         │
        ▼                         ▼
┌───────────────┐         ┌───────────────┐
│  Camada 1     │         │   API OSV     │
│  Heurísticas  │         │   + RSS       │
└───────┬───────┘         └───────┬───────┘
        │                         │
        ▼                         ▼
┌───────────────┐         ┌───────────────┐
│  Camada 2     │         │  Camada 2/3   │
│  TF-IDF +     │         │  Triagem News │
│  Naive Bayes  │         │  (MLP/ONNX)   │
└───────┬───────┘         └───────┬───────┘
        │                         │
        ▼                         ▼
┌───────────────┐         ┌───────────────┐
│  Camada 3     │         │  Geração de   │
│  ONNX / MLP   │         │  Relatório    │
└───────┬───────┘         └───────┬───────┘
        │                         │
        └────────────┬────────────┘
                     ▼
            ┌───────────────┐
            │  Findings     │
            │  Agregação    │
            └───────────────┘
```

### Componentes Principais

#### CLI (`lib/cli.js`)

- Parse argumentos de linha de comando
- Roteia para handlers apropriados
- Gerencia modos bloqueantes/não bloqueantes
- Coordena execução de varredura

#### Varredura Local (`lib/scan-local.js`)

- Percorre diretório `node_modules`
- Aplica regras heurísticas da Camada 1 (padrões regex)
- Verifica arquivos contra hashes SHA-256 de malware conhecido
- Varre scripts de ciclo de vida em `package.json`
- Integra com triagem ML para Camadas 2 e 3

**Regras Heurísticas** (Camada 1):

- `eval-usage`: Detecta chamadas `eval()`
- `function-constructor`: Detecta `new Function()` com código dinâmico
- `base64-buffer`: Detecta buffers codificados em base64 grandes
- `env-exfiltration`: Detecta possível exfiltração de variáveis de ambiente
- `obfuscated-url`: Detecta requisições de saída ofuscadas

#### Varredura Externa (`lib/scan-external.js`)

- Consulta API OSV para relatórios de vulnerabilidade
- Busca feeds RSS de notícias de segurança
- Cache dados externos (TTL de 1 hora)
- Integra com triagem ML para itens de notícias

#### Triagem ML - Código (`lib/ml/triage-code.js`)

- Tokeniza conteúdo de código
- Aplica vetorização TF-IDF
- Classifica com Naive Bayes (Camada 2)
- Opcionalmente usa ONNX CodeBERT (Camada 3)
- Fallback para MLP bundled se ONNX indisponível

#### Triagem ML - Notícias (`lib/ml/triage-news.js`)

- Tokeniza títulos e descrições de notícias
- Classifica com MLP (Camada 2)
- Opcionalmente usa ONNX DistilBERT (Camada 3)
- Corresponde itens de notícias a nomes de dependências

#### Configuração (`lib/config.js`)

- Carrega config global de `~/.npm-verify/config.json`
- Carrega config de projeto de `.npm-verify.json`
- Gerencia caminhos e padrões
- Manipula correspondência de padrões glob para regras de ignore

#### Hooks (`lib/hooks.js`)

- Gerencia hooks de ciclo de vida npm (`postinstall`, `prestart`, `predev`, `pretest`)
- Inicializa configuração de projeto
- Injeta hooks em `package.json`

#### Lock (`lib/lock.js`)

- Gerencia arquivo de status (`.npm-verify/status.json`)
- Rastreia estado de varredura (running, ok, failed)
- Implementa detecção de staleness
- Coordena comportamento de bloqueio

#### Scheduler (`lib/scheduler.js`)

- Instala scheduler horário de nível de SO
- Windows: Usa comando `schtasks`
- Linux/macOS: Adiciona entrada cron
- Executa `npm-verify check --deep` periodicamente

#### Daemon (`lib/daemon.js`)

- Alternativa ao scheduler do SO
- Executa como processo Node em background
- Monitora projetos monitorados
- Manipula shutdown gracioso

#### Relatório (`lib/report.js`)

- Agrega findings de todas as fontes
- Calcula códigos de saída baseados em severidade
- Formata e imprime relatórios
- Salva relatório em `.npm-verify/report.json`

### Fluxo de Dados

#### Varredura Bloqueante (postinstall)

```
npm install
    ↓
hook postinstall: npm-verify check --blocking
    ↓
Define status como "running"
    ↓
Camada 1: Heurísticas + blacklist de hash (rápido)
    ↓
Camada 2: TF-IDF + Naive Bayes (rápido)
    ↓
Gera relatório
    ↓
Se ameaças de alta severidade: Define status como "failed", exit 1
Senão: Define status como "ok", exit 0
```

#### Varredura Profunda (scheduler/daemon)

```
Scheduler dispara horariamente
    ↓
npm-verify check --deep
    ↓
Camada 1: Heurísticas + blacklist de hash
    ↓
Camada 2: TF-IDF + Naive Bayes / MLP
    ↓
Camada 3: ONNX CodeBERT / DistilBERT (lento, preciso)
    ↓
Externo: API OSV + feeds RSS
    ↓
Gera relatório
    ↓
Notifica se ameaças detectadas
```

#### Gate (prestart/predev/pretest)

```
npm start
    ↓
hook prestart: npm-verify gate
    ↓
Verifica arquivo de status
    ↓
Se status é "running": Bloqueia execução, exit 1
Se status é "failed": Bloqueia execução, exit 1
Se status é stale: Executa verificação rápida
Se status é "ok": Permite execução, exit 0
```

### Considerações de Performance

- **Camada 1**: < 100ms por pacote (regex + lookup de hash)
- **Camada 2**: < 500ms por pacote (TF-IDF + Naive Bayes)
- **Camada 3**: 1-5s por pacote (inferência ONNX, opcional)
- **Varredura Externa**: Depende de rede, cache por 1 hora
- **Postinstall**: Apenas Camadas 1 + 2 para permanecer rápido
- **Scheduler/Daemon**: Todas as camadas para análise profunda

### Design de Segurança

- **Sem dependências externas no momento da varredura**: Apenas `fast-xml-parser` para RSS
- **Detecção baseada em hash**: Hashes SHA-256, não conteúdos de arquivo
- **Degradação graciosa**: Falhas de varredura externa não bloqueiam a menos que `--blocking`
- **Bloqueio configurável**: Usuários podem definir `blockOnMedium` e `blockOnHigh`
- **Allowlist**: Usuários podem suprimir falsos positivos via `allowPackages`
