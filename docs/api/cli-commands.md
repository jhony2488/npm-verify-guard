# CLI Commands Reference

Complete reference for all npm-verify CLI commands.

---

## English

### Overview

npm-verify-guard provides a CLI interface for scanning npm dependencies, managing watched projects, configuring schedules, and managing ML models.

### Commands

#### `npm-verify init [--force]`

Initialize a project with npm lifecycle hooks and default configuration.

**Options:**

- `--force`: Overwrite existing configuration

**Actions:**

- Creates `.npm-verify.json` with default configuration
- Adds `postinstall` hook to run verification after `npm install`
- Adds `prestart`, `predev`, `pretest` hooks to block execution if threats detected
- Creates `.npm-verify/` directory for status and reports

**Example:**

```bash
npm-verify init
npm-verify init --force
```

---

#### `npm-verify check [--blocking] [--deep] [--local-only] [--external-only] [--all-watched] [--quiet]`

Run security verification on project dependencies.

**Options:**

- `--blocking`: Set status file and block on threats (used by postinstall hook)
- `--deep`: Enable Layer 3 ONNX models (slower, more accurate)
- `--local-only`: Scan node_modules only, skip external APIs
- `--external-only`: Query OSV and RSS only, skip local scan
- `--all-watched`: Scan all registered watched projects
- `--quiet`: Suppress output, only exit code

**Exit Codes:**

- `0`: Clean, no threats
- `1`: Threat detected / blocked
- `2`: Configuration or runtime error

**Example:**

```bash
# Standard scan (Layers 1 + 2)
npm-verify check

# Blocking scan for postinstall
npm-verify check --blocking

# Deep scan with ONNX (Layers 1 + 2 + 3)
npm-verify check --deep

# Local scan only
npm-verify check --local-only

# Scan all watched projects
npm-verify check --all-watched
```

---

#### `npm-verify gate`

Block project execution if verification failed or is stale.

**Usage:** Typically used in `prestart`, `predev`, `pretest` hooks

**Behavior:**

- If status is `running`: Block execution, exit 1
- If status is `failed`: Block execution, exit 1
- If status is stale (> 1 hour old): Run quick verification
- If status is `ok`: Allow execution, exit 0
- If project not monitored: Allow execution, exit 0

**Example:**

```bash
npm-verify gate
```

---

#### `npm-verify report`

Display the last verification report.

**Output:**

- Summary of findings by severity
- Detailed list of all findings
- ML scores and layer information
- Exit code based on severity

**Example:**

```bash
npm-verify report
```

---

#### `npm-verify models status|download`

Manage optional ONNX ML models.

**Subcommands:**

**status:** Check ONNX runtime and model availability

```bash
npm-verify models status
```

Output:

- ONNX runtime availability
- Models directory location
- Download status of each model
- Bundled ML models list

**download:** Download ONNX models from remote repository

```bash
npm-verify models download
```

Downloads:

- CodeBERT-mini model for code analysis
- DistilBERT model for news analysis

---

#### `npm-verify update-hashes [--dry-run] [--no-merge] [--concurrency N]`

Update malware hash database from OSV API.

**Options:**

- `--dry-run`: Collect hashes without writing to file
- `--no-merge`: Replace existing hashes instead of merging
- `--concurrency N`: Number of concurrent OSV API requests (default: 4)

**Actions:**

- Queries OSV API for npm packages with known vulnerabilities
- Extracts SHA-256 hashes from advisory reports
- Merges with existing `data/malware-hashes.json`
- Saves updated hash database

**Example:**

```bash
# Dry run to preview
npm-verify update-hashes --dry-run

# Update with 8 concurrent requests
npm-verify update-hashes --concurrency 8

# Replace instead of merge
npm-verify update-hashes --no-merge
```

---

#### `npm-verify watch add|remove|list [path]`

Manage watched projects for scheduled scans.

**Subcommands:**

**add:** Add a project to the watch list

```bash
npm-verify watch add /path/to/project
npm-verify watch add .  # Add current directory
```

**remove:** Remove a project from the watch list

```bash
npm-verify watch remove /path/to/project
```

**list:** List all watched projects

```bash
npm-verify watch list
```

---

#### `npm-verify scheduler install|uninstall|status`

Manage OS-level hourly scheduler.

**Subcommands:**

**install:** Install hourly scheduler

```bash
npm-verify scheduler install
```

- Windows: Creates Task Scheduler task
- Linux/macOS: Adds cron entry
- Runs `npm-verify check --deep --all-watched` hourly

**uninstall:** Remove hourly scheduler

```bash
npm-verify scheduler uninstall
```

**status:** Check scheduler status

```bash
npm-verify scheduler status
```

---

#### `npm-verify daemon start|stop|status`

Manage background Node daemon (alternative to OS scheduler).

**Subcommands:**

**start:** Start background daemon

```bash
npm-verify daemon start
```

- Runs as background process
- Monitors watched projects
- Performs hourly deep scans

**stop:** Stop background daemon

```bash
npm-verify daemon stop
```

**status:** Check daemon status

```bash
npm-verify daemon status
```

---

#### `npm-verify llm status|download|configure`

Manage local LLM integration for Layer 4 deep analysis.

**Subcommands:**

**status:** Check LLM provider availability and configuration

```bash
npm-verify llm status
```

Output:

- node-llama-cpp availability
- OpenAI-compatible provider status
- Models directory location
- Configured provider

**download:** Download LLM model from URL

```bash
npm-verify llm download [model-url]
```

- Downloads model to `~/.npm-verify/llm-models/`
- Model URL is optional (can specify in config)
- Supports .gguf and other llama.cpp formats

**configure:** Configure LLM provider settings

```bash
npm-verify llm configure --provider auto --api-url http://localhost:11434 --model llama3
```

Options:

- `--provider`: Provider type (auto, node-llama-cpp, openai-compatible)
- `--api-url`: OpenAI-compatible API URL
- `--api-key`: API key for OpenAI-compatible service
- `--model`: Model name (e.g., llama3, phi-3-mini)

---

#### `npm-verify version` / `npm-verify --version` / `npm-verify -V`

Display npm-verify-guard version.

**Example:**

```bash
npm-verify version
npm-verify --version
npm-verify -V
```

---

#### `npm-verify help` / `npm-verify --help` / `npm-verify -h`

Display help information.

**Example:**

```bash
npm-verify help
npm-verify --help
npm-verify -h
```

---

## Português

### Visão Geral

npm-verify-guard fornece uma interface CLI para varrer dependências npm, gerenciar projetos monitorados, configurar agendamentos e gerenciar modelos ML.

### Comandos

#### `npm-verify init [--force]`

Inicializa um projeto com hooks de ciclo de vida npm e configuração padrão.

**Opções:**

- `--force`: Sobrescrever configuração existente

**Ações:**

- Cria `.npm-verify.json` com configuração padrão
- Adiciona hook `postinstall` para executar verificação após `npm install`
- Adiciona hooks `prestart`, `predev`, `pretest` para bloquear execução se ameaças detectadas
- Cria diretório `.npm-verify/` para status e relatórios

**Exemplo:**

```bash
npm-verify init
npm-verify init --force
```

---

#### `npm-verify check [--blocking] [--deep] [--local-only] [--external-only] [--all-watched] [--quiet]`

Executa verificação de segurança nas dependências do projeto.

**Opções:**

- `--blocking`: Define arquivo de status e bloqueia em ameaças (usado por hook postinstall)
- `--deep`: Habilita modelos ONNX da Camada 3 (mais lento, mais preciso)
- `--local-only`: Varre apenas node_modules, pula APIs externas
- `--external-only`: Consulta apenas OSV e RSS, pula varredura local
- `--all-watched`: Varre todos os projetos monitorados registrados
- `--quiet`: Suprime saída, apenas código de saída

**Códigos de Saída:**

- `0`: Limpo, sem ameaças
- `1`: Ameaça detectada / bloqueada
- `2`: Erro de configuração ou runtime

**Exemplo:**

```bash
# Varredura padrão (Camadas 1 + 2)
npm-verify check

# Varredura bloqueante para postinstall
npm-verify check --blocking

# Varredura profunda com ONNX (Camadas 1 + 2 + 3)
npm-verify check --deep

# Varredura local apenas
npm-verify check --local-only

# Varrer todos os projetos monitorados
npm-verify check --all-watched
```

---

#### `npm-verify gate`

Bloqueia execução do projeto se verificação falhou ou está stale.

**Uso:** Tipicamente usado em hooks `prestart`, `predev`, `pretest`

**Comportamento:**

- Se status é `running`: Bloqueia execução, exit 1
- Se status é `failed`: Bloqueia execução, exit 1
- Se status é stale (> 1 hora): Executa verificação rápida
- Se status é `ok`: Permite execução, exit 0
- Se projeto não monitorado: Permite execução, exit 0

**Exemplo:**

```bash
npm-verify gate
```

---

#### `npm-verify report`

Exibe o último relatório de verificação.

**Saída:**

- Resumo de findings por severidade
- Lista detalhada de todos os findings
- Scores ML e informações de camada
- Código de saída baseado em severidade

**Exemplo:**

```bash
npm-verify report
```

---

#### `npm-verify models status|download`

Gerencia modelos ML ONNX opcionais.

**Subcomandos:**

**status:** Verifica disponibilidade de runtime ONNX e modelos

```bash
npm-verify models status
```

Saída:

- Disponibilidade de runtime ONNX
- Localização do diretório de modelos
- Status de download de cada modelo
- Lista de modelos ML bundled

**download:** Baixa modelos ONNX de repositório remoto

```bash
npm-verify models download
```

Downloads:

- Modelo CodeBERT-mini para análise de código
- Modelo DistilBERT para análise de notícias

---

#### `npm-verify update-hashes [--dry-run] [--no-merge] [--concurrency N]`

Atualiza banco de dados de hash de malware da API OSV.

**Opções:**

- `--dry-run`: Coleta hashes sem escrever no arquivo
- `--no-merge`: Substitui hashes existentes em vez de mesclar
- `--concurrency N`: Número de requisições API OSV concorrentes (padrão: 4)

**Ações:**

- Consulta API OSV por pacotes npm com vulnerabilidades conhecidas
- Extrai hashes SHA-256 de relatórios de advisory
- Mescla com `data/malware-hashes.json` existente
- Salva banco de dados de hash atualizado

**Exemplo:**

```bash
# Dry run para visualizar
npm-verify update-hashes --dry-run

# Atualizar com 8 requisições concorrentes
npm-verify update-hashes --concurrency 8

# Substituir em vez de mesclar
npm-verify update-hashes --no-merge
```

---

#### `npm-verify watch add|remove|list [path]`

Gerencia projetos monitorados para varreduras agendadas.

**Subcomandos:**

**add:** Adiciona um projeto à lista de monitoramento

```bash
npm-verify watch add /caminho/para/projeto
npm-verify watch add .  # Adiciona diretório atual
```

**remove:** Remove um projeto da lista de monitoramento

```bash
npm-verify watch remove /caminho/para/projeto
```

**list:** Lista todos os projetos monitorados

```bash
npm-verify watch list
```

---

#### `npm-verify scheduler install|uninstall|status`

Gerencia scheduler horário de nível de SO.

**Subcomandos:**

**install:** Instala scheduler horário

```bash
npm-verify scheduler install
```

- Windows: Cria tarefa do Task Scheduler
- Linux/macOS: Adiciona entrada cron
- Executa `npm-verify check --deep --all-watched` horariamente

**uninstall:** Remove scheduler horário

```bash
npm-verify scheduler uninstall
```

**status:** Verifica status do scheduler

```bash
npm-verify scheduler status
```

---

#### `npm-verify daemon start|stop|status`

Gerencia daemon Node em background (alternativa ao scheduler do SO).

**Subcomandos:**

**start:** Inicia daemon em background

```bash
npm-verify daemon start
```

- Executa como processo em background
- Monitora projetos monitorados
- Executa varreduras profundas horárias

**stop:** Para daemon em background

```bash
npm-verify daemon stop
```

**status:** Verifica status do daemon

```bash
npm-verify daemon status
```

---

#### `npm-verify llm status|download|configure`

Gerencia integração LLM local para análise profunda da Camada 4.

**Subcomandos:**

**status:** Verifica disponibilidade e configuração do provider LLM

```bash
npm-verify llm status
```

Saída:

- Disponibilidade de node-llama-cpp
- Status de provider OpenAI-compatible
- Localização do diretório de modelos
- Provider configurado

**download:** Baixa modelo LLM de URL

```bash
npm-verify llm download [model-url]
```

- Baixa modelo para `~/.npm-verify/llm-models/`
- URL do modelo é opcional (pode especificar na config)
- Suporta formatos .gguf e outros do llama.cpp

**configure:** Configura configurações do provider LLM

```bash
npm-verify llm configure --provider auto --api-url http://localhost:11434 --model llama3
```

Opções:

- `--provider`: Tipo de provider (auto, node-llama-cpp, openai-compatible)
- `--api-url`: URL de API OpenAI-compatible
- `--api-key`: Chave de API para serviço OpenAI-compatible
- `--model`: Nome do modelo (ex: llama3, phi-3-mini)

---

#### `npm-verify version` / `npm-verify --version` / `npm-verify -V`

Exibe versão do npm-verify-guard.

**Exemplo:**

```bash
npm-verify version
npm-verify --version
npm-verify -V
```

---

#### `npm-verify help` / `npm-verify --help` / `npm-verify -h`

Exibe informações de ajuda.

**Exemplo:**

```bash
npm-verify help
npm-verify --help
npm-verify -h
```
