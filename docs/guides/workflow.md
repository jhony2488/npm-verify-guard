# Workflow Guide

Typical workflows and usage patterns for npm-verify-guard.

---

## English

### Overview

npm-verify-guard integrates into your development workflow through npm lifecycle hooks, providing automatic security checks during installation and execution.

### Standard Workflow

#### 1. Initial Setup

```bash
# Install globally
cd npm-verify-guard
npm install
npm link

# Configure your project
cd /path/to/your/project
npm-verify init
npm-verify watch add .
```

#### 2. Normal Development

After setup, npm-verify-guard runs automatically:

**On `npm install`:**

```bash
npm install some-package
# postinstall hook runs: npm-verify check --blocking
# If threats detected: installation fails
# If clean: installation succeeds
```

**On `npm start`, `npm run dev`, `npm test`:**

```bash
npm start
# prestart hook runs: npm-verify gate
# If verification failed/stale: blocks execution
# If verification ok: allows execution
```

#### 3. Manual Scans

```bash
# Run a manual scan
npm-verify check

# Run with deep analysis (Layer 3 ONNX)
npm-verify check --deep

# View the last report
npm-verify report
```

### Scheduled Monitoring

#### Option 1: OS Scheduler (Recommended)

```bash
# Install hourly scheduler
npm-verify scheduler install

# Check status
npm-verify scheduler status

# Uninstall when not needed
npm-verify scheduler uninstall
```

**What it does:**

- Runs `npm-verify check --deep --all-watched` hourly
- Uses OS-native scheduling (Task Scheduler on Windows, cron on Linux/macOS)
- No background process needed

#### Option 2: Node Daemon

```bash
# Start background daemon
npm-verify daemon start

# Check status
npm-verify daemon status

# Stop daemon
npm-verify daemon stop
```

**What it does:**

- Runs as background Node process
- Monitors watched projects
- Performs hourly deep scans
- Useful if OS scheduler is not available

### Handling Threats

#### When a Threat is Detected

1. **Review the report:**

   ```bash
   npm-verify report
   ```

2. **Assess the finding:**
   - Check the severity (high/medium/low)
   - Review the rule and detail
   - Check if it's a false positive

3. **Take action:**
   - **False positive**: Add to `allowPackages` in `.npm-verify.json`
   - **Real threat**: Update/remove the dependency
   - **Medium severity**: Configure `blockOnMedium` if needed

#### Example: Handling a False Positive

```bash
# View the report
npm-verify report

# Edit .npm-verify.json
{
  "allowPackages": ["suspicious-but-safe-package"]
}

# Re-run scan
npm-verify check
```

### Multiple Projects

#### Managing Watched Projects

```bash
# Add projects to watch list
npm-verify watch add /path/to/project1
npm-verify watch add /path/to/project2

# List watched projects
npm-verify watch list

# Remove a project
npm-verify watch remove /path/to/project1
```

#### Scanning All Projects

```bash
# Scan all watched projects
npm-verify check --all-watched

# Deep scan all watched projects
npm-verify check --deep --all-watched
```

### CI/CD Integration

#### GitHub Actions Example

```yaml
name: Security Scan

on: [push, pull_request]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm install -g npm-verify-guard
      - run: npm-verify check --blocking
```

#### GitLab CI Example

```yaml
security-scan:
  script:
    - npm install
    - npm install -g npm-verify-guard
    - npm-verify check --blocking
```

### Advanced Workflows

#### Updating Malware Hashes

```bash
# Update from OSV API
npm-verify update-hashes

# Dry run to preview
npm-verify update-hashes --dry-run

# Update with higher concurrency
npm-verify update-hashes --concurrency 8
```

#### Managing ONNX Models

```bash
# Check model status
npm-verify models status

# Download models
npm-verify models download

# Models are stored in ~/.npm-verify/models/
```

#### Custom Thresholds

```bash
# Edit .npm-verify.json
{
  "ml": {
    "layer2Threshold": 0.8,
    "layer3Threshold": 0.9
  }
}

# Test new thresholds
npm-verify check
```

### Troubleshooting Workflow

#### Installation Blocked

```bash
# Check why installation failed
npm-verify report

# If false positive, add to allowPackages
# If real threat, investigate the package
```

#### Verification Failed

```bash
# Check status
cat .npm-verify/status.json

# Re-run verification
npm-verify check

# If stale, gate will auto-verify
npm start
```

#### External Scan Degraded

```bash
# Check network connectivity
# External scan degrades gracefully
# Check if --blocking is causing issues
npm-verify check --local-only
```

---

## Português

### Visão Geral

npm-verify-guard integra ao seu fluxo de trabalho de desenvolvimento através de hooks de ciclo de vida npm, fornecendo verificações de segurança automáticas durante instalação e execução.

### Fluxo de Trabalho Padrão

#### 1. Configuração Inicial

```bash
# Instale globalmente
cd npm-verify-guard
npm install
npm link

# Configure seu projeto
cd /caminho/para/seu/projeto
npm-verify init
npm-verify watch add .
```

#### 2. Desenvolvimento Normal

Após configuração, npm-verify-guard executa automaticamente:

**Em `npm install`:**

```bash
npm install some-package
# hook postinstall executa: npm-verify check --blocking
# Se ameaças detectadas: instalação falha
# Se limpo: instalação sucesso
```

**Em `npm start`, `npm run dev`, `npm test`:**

```bash
npm start
# hook prestart executa: npm-verify gate
# Se verificação falhou/stale: bloqueia execução
# Se verificação ok: permite execução
```

#### 3. Varreduras Manuais

```bash
# Execute uma varredura manual
npm-verify check

# Execute com análise profunda (Camada 3 ONNX)
npm-verify check --deep

# Veja o último relatório
npm-verify report
```

### Monitoramento Agendado

#### Opção 1: Scheduler do SO (Recomendado)

```bash
# Instale scheduler horário
npm-verify scheduler install

# Verifique status
npm-verify scheduler status

# Desinstale quando não necessário
npm-verify scheduler uninstall
```

**O que faz:**

- Executa `npm-verify check --deep --all-watched` horariamente
- Usa agendamento nativo do SO (Task Scheduler no Windows, cron no Linux/macOS)
- Sem processo de background necessário

#### Opção 2: Daemon Node

```bash
# Inicie daemon em background
npm-verify daemon start

# Verifique status
npm-verify daemon status

# Pare daemon
npm-verify daemon stop
```

**O que faz:**

- Executa como processo Node em background
- Monitora projetos monitorados
- Executa varreduras profundas horárias
- Útil se scheduler do SO não está disponível

### Lidando com Ameaças

#### Quando uma Ameaça é Detectada

1. **Revise o relatório:**

   ```bash
   npm-verify report
   ```

2. **Avalie o finding:**
   - Verifique a severidade (high/medium/low)
   - Revise a regra e detalhe
   - Verifique se é um falso positivo

3. **Tome ação:**
   - **Falso positivo**: Adicione a `allowPackages` em `.npm-verify.json`
   - **Ameaça real**: Atualize/remova a dependência
   - **Severidade média**: Configure `blockOnMedium` se necessário

#### Exemplo: Lidando com Falso Positivo

```bash
# Veja o relatório
npm-verify report

# Edite .npm-verify.json
{
  "allowPackages": ["suspicious-but-safe-package"]
}

# Execute varredura novamente
npm-verify check
```

### Múltiplos Projetos

#### Gerenciando Projetos Monitorados

```bash
# Adicione projetos à lista de monitoramento
npm-verify watch add /caminho/para/projeto1
npm-verify watch add /caminho/para/projeto2

# Liste projetos monitorados
npm-verify watch list

# Remova um projeto
npm-verify watch remove /caminho/para/projeto1
```

#### Varrendo Todos os Projetos

```bash
# Varra todos os projetos monitorados
npm-verify check --all-watched

# Varredura profunda de todos os projetos monitorados
npm-verify check --deep --all-watched
```

### Integração CI/CD

#### Exemplo GitHub Actions

```yaml
name: Security Scan

on: [push, pull_request]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm install -g npm-verify-guard
      - run: npm-verify check --blocking
```

#### Exemplo GitLab CI

```yaml
security-scan:
  script:
    - npm install
    - npm install -g npm-verify-guard
    - npm-verify check --blocking
```

### Fluxos de Trabalho Avançados

#### Atualizando Hashes de Malware

```bash
# Atualize da API OSV
npm-verify update-hashes

# Dry run para visualizar
npm-verify update-hashes --dry-run

# Atualize com concorrência mais alta
npm-verify update-hashes --concurrency 8
```

#### Gerenciando Modelos ONNX

```bash
# Verifique status do modelo
npm-verify models status

# Baixe modelos
npm-verify models download

# Modelos são armazenados em ~/.npm-verify/models/
```

#### Thresholds Customizados

```bash
# Edite .npm-verify.json
{
  "ml": {
    "layer2Threshold": 0.8,
    "layer3Threshold": 0.9
  }
}

# Teste novos thresholds
npm-verify check
```

### Solução de Problemas no Fluxo de Trabalho

#### Instalação Bloqueada

```bash
# Verifique por que instalação falhou
npm-verify report

# Se falso positivo, adicione a allowPackages
# Se ameaça real, investigue o pacote
```

#### Verificação Falhou

```bash
# Verifique status
cat .npm-verify/status.json

# Execute verificação novamente
npm-verify check

# Se stale, gate irá auto-verificar
npm start
```

#### Varredura Externa Degradada

```bash
# Verifique conectividade de rede
# Varredura externa degrada graciosamente
# Verifique se --blocking está causando problemas
npm-verify check --local-only
```
