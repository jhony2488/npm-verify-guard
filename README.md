# npm-verify-guard

Global CLI to verify npm dependencies for known vulnerabilities, supply-chain news, and suspicious code patterns in `node_modules`.

Built with minimal dependencies (`fast-xml-parser` for RSS). ML layers use pure JavaScript math; ONNX models are optional.

## ML triage layers

| Layer | Method                                       | When it runs                |
| ----- | -------------------------------------------- | --------------------------- |
| 1     | Regex + SHA-256 blacklist                    | Every scan                  |
| 2     | TF-IDF + Naive Bayes (code) / MLP (news)     | Every scan                  |
| 2.5   | Code embedding similarity (Nomic Embed)      | Every scan (if enabled)     |
| 3     | ONNX (CodeBERT / DistilBERT) or MLP fallback | `--deep` (daemon/scheduler) |

Fallback chain: if ONNX runtime or models are unavailable, Layer 3 automatically uses the bundled MLP weights. Layer 2.5 gracefully degrades if the embedding model is unavailable.

```bash
# Fast path (npm install postinstall): Layers 1 + 2
npm-verify check --blocking

# Deep path (hourly daemon/scheduler): Layers 1 + 2 + 3
npm-verify check --deep

# Optional ONNX models
npm-verify models status
npm-verify models download
```

## Features

- **Local scan**: heuristic detection of `eval`, `Function`, base64 payloads, env exfiltration, suspicious lifecycle scripts, and known malware hashes
- **External scan**: OSV API vulnerability lookup and RSS security news correlation
- **Install blocking**: `postinstall` hook runs verification and fails `npm install` on threats
- **Runtime gate**: `prestart` / `predev` / `pretest` hooks block project execution until verification passes
- **Hourly monitoring**: OS scheduler (Task Scheduler on Windows, cron on Linux/macOS) or optional Node daemon

## Requirements

- Node.js >= 18

## Install globally

```bash
cd npm-verification-packages
npm install
npm link
```

Or:

```bash
npm install -g .
```

## Quick start

### 1. Configure a project

```bash
cd /path/to/your/project
npm-verify init
npm-verify watch add .
```

This adds npm lifecycle hooks to `package.json` and creates `.npm-verify.json`.

### 2. Enable hourly checks

Preferred (OS scheduler):

```bash
npm-verify scheduler install
npm-verify scheduler status
```

Alternative (Node background process):

```bash
npm-verify daemon start
npm-verify daemon status
```

### 3. Normal workflow

Every `npm install` triggers:

```bash
npm-verify check --blocking
```

Every `npm start`, `npm run dev`, or `npm test` triggers:

```bash
npm-verify gate
```

Manual check:

```bash
npm-verify check
npm-verify report
```

## Commands

| Command                                           | Description                                          |
| ------------------------------------------------- | ---------------------------------------------------- |
| `npm-verify init [--force]`                       | Add hooks and default config to current project      |
| `npm-verify check [--blocking] [--deep]`          | Run local + external verification                    |
| `npm-verify models status\|download`              | Check or download optional ONNX models               |
| `npm-verify models download-embeddings`           | Download code embedding model                        |
| `npm-verify models generate-embeddings`           | Generate embeddings for malicious patterns           |
| `npm-verify check --local-only`                   | Scan `node_modules` only                             |
| `npm-verify check --external-only`                | Query OSV + RSS only                                 |
| `npm-verify check --all-watched`                  | Verify all registered projects                       |
| `npm-verify gate`                                 | Block execution if verification failed or is running |
| `npm-verify report`                               | Show last report                                     |
| `npm-verify watch add\|remove\|list [path]`       | Manage watched projects                              |
| `npm-verify scheduler install\|uninstall\|status` | OS hourly scheduler                                  |
| `npm-verify daemon start\|stop\|status`           | Background Node daemon                               |

## Exit codes

- `0` — clean
- `1` — threat detected / blocked
- `2` — configuration or runtime error

## Project config (`.npm-verify.json`)

```json
{
  "allowPackages": ["node-gyp"],
  "ignorePaths": ["**/test/**", "**/docs/**", "**/.bin/**"],
  "heuristics": { "maxFileSizeKb": 512 },
  "external": { "enabled": true },
  "blockOnMedium": false,
  "blockOnHigh": true,
  "ml": {
    "enabled": true,
    "layer2Threshold": 0.7,
    "layer3Threshold": 0.8,
    "deepScanOnInstall": false,
    "useOnnx": true,
    "enableEmbeddings": true,
    "embeddingThreshold": 0.8
  }
}
```

## Global config

Stored in `~/.npm-verify/config.json`:

```json
{
  "watchedProjects": [],
  "intervalHours": 1,
  "notifyOnThreat": true,
  "ml": {
    "useOnnx": true
  }
}
```

## Platform notes

### Windows

Scheduler uses `schtasks`:

```bash
npm-verify scheduler install
```

### Linux / macOS

Scheduler adds a cron entry:

```bash
npm-verify scheduler install
```

Ensure `npm-verify` is available in cron PATH (global install recommended).

## Limitations

- `npm install --ignore-scripts` bypasses `postinstall` protection
- Heuristic scanning may produce false positives; use `allowPackages` to suppress known safe packages
- External scans require network access; failures degrade to local-only mode when not blocking
- ONNX models are large and downloaded on demand to `~/.npm-verify/models/`
- Layer 2 precision is lower than Layer 3; tune thresholds in `.npm-verify.json`
- Code embedding model (Layer 2.5) requires optional `@agentix-e/embed-code-node` dependency
- ML models gracefully degrade when optional dependencies are unavailable

## Tests

```bash
npm test
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for environment setup, code standards, PR checklist, and contribution areas (heuristics, ML models, external feeds, hooks, scheduler).

Quick validation before a PR:

```bash
npm run lint
npm run format:check
npm test
```

## License

MIT

---

## Português

# npm-verify-guard

CLI global para verificar dependências npm em busca de vulnerabilidades conhecidas, notícias de supply chain e padrões de código suspeitos em `node_modules`.

Construído com dependências mínimas (`fast-xml-parser` para RSS). Camadas ML usam matemática JavaScript puro; modelos ONNX são opcionais.

## Camadas de triagem ML

| Camada | Método                                                  | Quando executa                 |
| ------ | ------------------------------------------------------- | ------------------------------ |
| 1      | Regex + blacklist SHA-256                               | Toda varredura                 |
| 2      | TF-IDF + Naive Bayes (código) / MLP (notícias)          | Toda varredura                 |
| 2.5    | Similaridade de embeddings de código (Nomic Embed)      | Toda varredura (se habilitado) |
| 3      | ONNX (CodeBERT / DistilBERT) ou fallback MLP            | `--deep` (daemon/scheduler)    |
| 4      | Análise LLM local (node-llama-cpp ou OpenAI-compatible) | `--deep` (opcional)            |

Cadeia de fallback: se runtime ONNX ou modelos não estiverem disponíveis, a Camada 3 usa automaticamente os pesos MLP bundled. A Camada 2.5 degrada graciosamente se o modelo de embedding não estiver disponível.

```bash
# Caminho rápido (postinstall npm install): Camadas 1 + 2
npm-verify check --blocking

# Caminho profundo (daemon/scheduler horário): Camadas 1 + 2 + 3
npm-verify check --deep

# Modelos ONNX opcionais
npm-verify models status
npm-verify models download
```

## Recursos

- **Varredura local**: detecção heurística de `eval`, `Function`, payloads base64, exfiltração de env, scripts de ciclo de vida suspeitos e hashes de malware conhecidos
- **Varredura externa**: consulta de vulnerabilidades API OSV e correlação de notícias de segurança RSS
- **Bloqueio de instalação**: hook `postinstall` executa verificação e falha `npm install` em ameaças
- **Gate de runtime**: hooks `prestart` / `predev` / `pretest` bloqueiam execução do projeto até verificação passar
- **Monitoramento horário**: scheduler de SO (Task Scheduler no Windows, cron no Linux/macOS) ou daemon Node opcional

## Requisitos

- Node.js >= 18

## Instalar globalmente

```bash
cd npm-verification-packages
npm install
npm link
```

Ou:

```bash
npm install -g .
```

## Início rápido

### 1. Configure um projeto

```bash
cd /caminho/para/seu/projeto
npm-verify init
npm-verify watch add .
```

Isso adiciona hooks de ciclo de vida npm ao `package.json` e cria `.npm-verify.json`.

### 2. Habilite verificações horárias

Preferido (scheduler de SO):

```bash
npm-verify scheduler install
npm-verify scheduler status
```

Alternativa (processo em background Node):

```bash
npm-verify daemon start
npm-verify daemon status
```

### 3. Fluxo de trabalho normal

Todo `npm install` aciona:

```bash
npm-verify check --blocking
```

Todo `npm start`, `npm run dev` ou `npm test` aciona:

```bash
npm-verify gate
```

Verificação manual:

```bash
npm-verify check
npm-verify report
```

## Comandos

| Comando                                           | Descrição                                               |
| ------------------------------------------------- | ------------------------------------------------------- |
| `npm-verify init [--force]`                       | Adiciona hooks e config padrão ao projeto atual         |
| `npm-verify check [--blocking] [--deep]`          | Executa verificação local + externa                     |
| `npm-verify models status\|download`              | Verifica ou baixa modelos ONNX opcionais                |
| `npm-verify models download-embeddings`           | Baixa modelo de embeddings de código                    |
| `npm-verify models generate-embeddings`           | Gera embeddings para padrões maliciosos                 |
| `npm-verify check --local-only`                   | Varre apenas `node_modules`                             |
| `npm-verify check --external-only`                | Consulta apenas OSV + RSS                               |
| `npm-verify check --all-watched`                  | Verifica todos os projetos registrados                  |
| `npm-verify gate`                                 | Bloqueia execução se verificação falhou ou está rodando |
| `npm-verify report`                               | Mostra último relatório                                 |
| `npm-verify watch add\|remove\|list [path]`       | Gerencia projetos monitorados                           |
| `npm-verify scheduler install\|uninstall\|status` | Scheduler horário de SO                                 |
| `npm-verify daemon start\|stop\|status`           | Daemon Node em background                               |
| `npm-verify llm status\|download\|configure`      | Gerencia integração LLM local (Camada 4)                |

## Códigos de saída

- `0` — limpo
- `1` — ameaça detectada / bloqueada
- `2` — erro de configuração ou runtime

## Config de projeto (`.npm-verify.json`)

```json
{
  "allowPackages": ["node-gyp"],
  "ignorePaths": ["**/test/**", "**/docs/**", "**/.bin/**"],
  "heuristics": { "maxFileSizeKb": 512 },
  "external": { "enabled": true },
  "blockOnMedium": false,
  "blockOnHigh": true,
  "ml": {
    "enabled": true,
    "layer2Threshold": 0.7,
    "layer3Threshold": 0.8,
    "deepScanOnInstall": false,
    "useOnnx": true,
    "enableEmbeddings": true,
    "embeddingThreshold": 0.8,
    "enableLlm": false,
    "llm": {
      "provider": "auto",
      "openaiApiUrl": null,
      "openaiModel": "llama3"
    }
  }
}
```

## Config global

Armazenado em `~/.npm-verify/config.json`:

```json
{
  "watchedProjects": [],
  "intervalHours": 1,
  "notifyOnThreat": true,
  "ml": {
    "useOnnx": true
  }
}
```

## Notas de plataforma

### Windows

Scheduler usa `schtasks`:

```bash
npm-verify scheduler install
```

### Linux / macOS

Scheduler adiciona entrada cron:

```bash
npm-verify scheduler install
```

Certifique-se que `npm-verify` está disponível no PATH do cron (instalação global recomendada).

## Limitações

- `npm install --ignore-scripts` ignora proteção `postinstall`
- Varredura heurística pode produzir falsos positivos; use `allowPackages` para suprimir pacotes conhecidos seguros
- Varreduras externas requerem acesso de rede; falhas degradam para modo local-only quando não bloqueante
- Modelos ONNX são grandes e baixados sob demanda para `~/.npm-verify/models/`
- Precisão da Camada 2 é menor que Camada 3; ajuste thresholds em `.npm-verify.json`
- Modelo de embeddings de código (Camada 2.5) requer dependência opcional `@agentix-e/embed-code-node`
- Modelos ML degradam graciosamente quando dependências opcionais não estão disponíveis
- LLM local (Camada 4) requer modelos grandes (1-3GB) e dependências opcionais

## Testes

```bash
npm test
```

## Contribuindo

Veja [CONTRIBUTING.md](CONTRIBUTING.md) para configuração de ambiente, padrões de código, checklist de PR e áreas de contribuição (heurísticas, modelos ML, feeds externos, hooks, scheduler).

Validação rápida antes de um PR:

```bash
npm run lint
npm run format:check
npm test
```

## Licença

MIT
