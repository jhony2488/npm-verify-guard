# Configuration Guide

How to configure npm-verify-guard for your projects.

---

## English

### Overview

npm-verify-guard uses two configuration files:

1. **Project Config**: `.npm-verify.json` in your project root
2. **Global Config**: `~/.npm-verify/config.json` for global settings

### Project Configuration

The project configuration file (`.npm-verify.json`) is created automatically when you run `npm-verify init`. You can customize it for your project's needs.

**Default Configuration:**

```json
{
  "allowPackages": [],
  "ignorePaths": ["**/test/**", "**/docs/**", "**/.bin/**"],
  "heuristics": {
    "maxFileSizeKb": 512
  },
  "external": {
    "enabled": true
  },
  "blockOnMedium": false,
  "blockOnHigh": true,
  "ml": {
    "enabled": true,
    "layer2Threshold": 0.7,
    "layer2MediumThreshold": 0.3,
    "layer3Threshold": 0.8,
    "tfidfThreshold": 2.5,
    "newsLayer2Threshold": 0.45,
    "newsLayer3Threshold": 0.8,
    "deepScanOnInstall": false,
    "useOnnx": true,
    "blockOnMedium": false
  }
}
```

#### Configuration Options

**`allowPackages` (array of strings)**

- Package names to skip during scanning
- Useful for trusted packages that trigger false positives
- Example: `["node-gyp", "some-build-tool"]`

**`ignorePaths` (array of strings)**

- Glob patterns for files/directories to ignore
- Default ignores test, docs, and .bin directories
- Example: `["**/test/**", "**/examples/**", "**/dist/**"]`

**`heuristics.maxFileSizeKb` (number)**

- Maximum file size to scan in kilobytes
- Larger files are skipped to improve performance
- Default: 512 KB

**`external.enabled` (boolean)**

- Enable/disable external vulnerability scanning (OSV API, RSS feeds)
- Default: true

**`blockOnMedium` (boolean)**

- Block installation/execution on medium-severity findings
- Default: false (only high severity blocks)

**`blockOnHigh` (boolean)**

- Block installation/execution on high-severity findings
- Default: true

**`ml.enabled` (boolean)**

- Enable ML triage (Layers 2 and 3)
- Default: true

**`ml.layer2Threshold` (number)**

- Threshold for Layer 2 (Naive Bayes) to trigger high severity
- Range: 0-1, higher = less sensitive
- Default: 0.7

**`ml.layer2MediumThreshold` (number)**

- Threshold for Layer 2 to trigger medium severity
- Range: 0-1, higher = less sensitive
- Default: 0.3

**`ml.layer3Threshold` (number)**

- Threshold for Layer 3 (ONNX/MLP) to trigger high severity
- Range: 0-1, higher = less sensitive
- Default: 0.8

**`ml.tfidfThreshold` (number)**

- TF-IDF score threshold for suspicious content
- Higher = fewer false positives, more false negatives
- Default: 2.5

**`ml.newsLayer2Threshold` (number)**

- Threshold for news MLP classification
- Default: 0.45

**`ml.newsLayer3Threshold` (number)**

- Threshold for news ONNX classification
- Default: 0.8

**`ml.deepScanOnInstall` (boolean)**

- Enable Layer 3 (ONNX) during postinstall
- Not recommended for performance reasons
- Default: false

**`ml.useOnnx` (boolean)**

- Use ONNX runtime for Layer 3 if available
- Falls back to bundled MLP if ONNX unavailable
- Default: true

**`ml.blockOnMedium` (boolean)**

- Block on medium-severity ML findings
- Overrides global `blockOnMedium` for ML specifically
- Default: false

### Global Configuration

The global configuration file (`~/.npm-verify/config.json`) manages settings across all projects.

**Default Configuration:**

```json
{
  "watchedProjects": [],
  "intervalHours": 1,
  "notifyOnThreat": true,
  "ml": {
    "useOnnx": true,
    "modelsDir": null
  }
}
```

#### Configuration Options

**`watchedProjects` (array of strings)**

- List of project paths to scan during scheduled checks
- Managed via `npm-verify watch add/remove/list`

**`intervalHours` (number)**

- Hours between scheduled scans
- Default: 1 (hourly)

**`notifyOnThreat` (boolean)**

- Enable notifications when threats are detected
- Default: true

**`ml.useOnnx` (boolean)**

- Global preference for ONNX runtime
- Can be overridden per project
- Default: true

**`ml.modelsDir` (string or null)**

- Custom directory for ONNX models
- Default: null (uses `~/.npm-verify/models/`)

### Example Configurations

#### Strict Security

```json
{
  "allowPackages": [],
  "blockOnMedium": true,
  "blockOnHigh": true,
  "ml": {
    "layer2Threshold": 0.5,
    "layer3Threshold": 0.7,
    "useOnnx": true
  }
}
```

#### Permissive Development

```json
{
  "allowPackages": ["node-gyp", "webpack", "vite"],
  "blockOnMedium": false,
  "blockOnHigh": false,
  "ml": {
    "layer2Threshold": 0.9,
    "layer3Threshold": 0.95,
    "useOnnx": false
  }
}
```

#### Performance-Optimized

```json
{
  "heuristics": {
    "maxFileSizeKb": 256
  },
  "external": {
    "enabled": false
  },
  "ml": {
    "useOnnx": false,
    "deepScanOnInstall": false
  }
}
```

### Threshold Tuning Guide

**ML Thresholds:**

- Lower thresholds = more sensitive, more false positives
- Higher thresholds = less sensitive, more false negatives
- Start with defaults, adjust based on false positive rate

**Recommended Approach:**

1. Use default thresholds initially
2. Run scans on your project
3. Review findings for false positives
4. Adjust thresholds incrementally
5. Monitor for false negatives

**Testing Thresholds:**

```bash
# Test with current config
npm-verify check

# View ML scores in report
npm-verify report
```

---

## Português

### Visão Geral

npm-verify-guard usa dois arquivos de configuração:

1. **Config de Projeto**: `.npm-verify.json` no raiz do seu projeto
2. **Config Global**: `~/.npm-verify/config.json` para configurações globais

### Configuração de Projeto

O arquivo de configuração de projeto (`.npm-verify.json`) é criado automaticamente quando você executa `npm-verify init`. Você pode personalizá-lo para as necessidades do seu projeto.

**Configuração Padrão:**

```json
{
  "allowPackages": [],
  "ignorePaths": ["**/test/**", "**/docs/**", "**/.bin/**"],
  "heuristics": {
    "maxFileSizeKb": 512
  },
  "external": {
    "enabled": true
  },
  "blockOnMedium": false,
  "blockOnHigh": true,
  "ml": {
    "enabled": true,
    "layer2Threshold": 0.7,
    "layer2MediumThreshold": 0.3,
    "layer3Threshold": 0.8,
    "tfidfThreshold": 2.5,
    "newsLayer2Threshold": 0.45,
    "newsLayer3Threshold": 0.8,
    "deepScanOnInstall": false,
    "useOnnx": true,
    "blockOnMedium": false
  }
}
```

#### Opções de Configuração

**`allowPackages` (array de strings)**

- Nomes de pacotes para pular durante varredura
- Útil para pacotes confiáveis que acionam falsos positivos
- Exemplo: `["node-gyp", "some-build-tool"]`

**`ignorePaths` (array de strings)**

- Padrões glob para arquivos/diretórios para ignorar
- Padrão ignora diretórios test, docs e .bin
- Exemplo: `["**/test/**", "**/examples/**", "**/dist/**"]`

**`heuristics.maxFileSizeKb` (number)**

- Tamanho máximo de arquivo para varrer em kilobytes
- Arquivos maiores são pulados para melhorar performance
- Padrão: 512 KB

**`external.enabled` (boolean)**

- Habilitar/desabilitar varredura de vulnerabilidade externa (API OSV, feeds RSS)
- Padrão: true

**`blockOnMedium` (boolean)**

- Bloquear instalação/execução em findings de severidade média
- Padrão: false (apenas severidade alta bloqueia)

**`blockOnHigh` (boolean)**

- Bloquear instalação/execução em findings de severidade alta
- Padrão: true

**`ml.enabled` (boolean)**

- Habilitar triagem ML (Camadas 2 e 3)
- Padrão: true

**`ml.layer2Threshold` (number)**

- Threshold para Camada 2 (Naive Bayes) para acionar severidade alta
- Faixa: 0-1, mais alto = menos sensível
- Padrão: 0.7

**`ml.layer2MediumThreshold` (number)**

- Threshold para Camada 2 para acionar severidade média
- Faixa: 0-1, mais alto = menos sensível
- Padrão: 0.3

**`ml.layer3Threshold` (number)**

- Threshold para Camada 3 (ONNX/MLP) para acionar severidade alta
- Faixa: 0-1, mais alto = menos sensível
- Padrão: 0.8

**`ml.tfidfThreshold` (number)**

- Threshold de score TF-IDF para conteúdo suspeito
- Mais alto = menos falsos positivos, mais falsos negativos
- Padrão: 2.5

**`ml.newsLayer2Threshold` (number)**

- Threshold para classificação MLP de notícias
- Padrão: 0.45

**`ml.newsLayer3Threshold` (number)**

- Threshold para classificação ONNX de notícias
- Padrão: 0.8

**`ml.deepScanOnInstall` (boolean)**

- Habilitar Camada 3 (ONNX) durante postinstall
- Não recomendado por razões de performance
- Padrão: false

**`ml.useOnnx` (boolean)**

- Usar runtime ONNX para Camada 3 se disponível
- Fallback para MLP bundled se ONNX indisponível
- Padrão: true

**`ml.blockOnMedium` (boolean)**

- Bloquear em findings ML de severidade média
- Sobrescreve `blockOnMedium` global especificamente para ML
- Padrão: false

### Configuração Global

O arquivo de configuração global (`~/.npm-verify/config.json`) gerencia configurações através de todos os projetos.

**Configuração Padrão:**

```json
{
  "watchedProjects": [],
  "intervalHours": 1,
  "notifyOnThreat": true,
  "ml": {
    "useOnnx": true,
    "modelsDir": null
  }
}
```

#### Opções de Configuração

**`watchedProjects` (array de strings)**

- Lista de caminhos de projeto para varrer durante verificações agendadas
- Gerenciado via `npm-verify watch add/remove/list`

**`intervalHours` (number)**

- Horas entre varreduras agendadas
- Padrão: 1 (horário)

**`notifyOnThreat` (boolean)**

- Habilitar notificações quando ameaças são detectadas
- Padrão: true

**`ml.useOnnx` (boolean)**

- Preferência global para runtime ONNX
- Pode ser sobrescrito por projeto
- Padrão: true

**`ml.modelsDir` (string ou null)**

- Diretório customizado para modelos ONNX
- Padrão: null (usa `~/.npm-verify/models/`)

### Configurações de Exemplo

#### Segurança Estrita

```json
{
  "allowPackages": [],
  "blockOnMedium": true,
  "blockOnHigh": true,
  "ml": {
    "layer2Threshold": 0.5,
    "layer3Threshold": 0.7,
    "useOnnx": true
  }
}
```

#### Desenvolvimento Permissivo

```json
{
  "allowPackages": ["node-gyp", "webpack", "vite"],
  "blockOnMedium": false,
  "blockOnHigh": false,
  "ml": {
    "layer2Threshold": 0.9,
    "layer3Threshold": 0.95,
    "useOnnx": false
  }
}
```

#### Otimizado para Performance

```json
{
  "heuristics": {
    "maxFileSizeKb": 256
  },
  "external": {
    "enabled": false
  },
  "ml": {
    "useOnnx": false,
    "deepScanOnInstall": false
  }
}
```

### Guia de Ajuste de Threshold

**Thresholds ML:**

- Thresholds mais baixos = mais sensível, mais falsos positivos
- Thresholds mais altos = menos sensível, mais falsos negativos
- Comece com padrões, ajuste baseado na taxa de falsos positivos

**Abordagem Recomendada:**

1. Use thresholds padrão inicialmente
2. Execute varreduras no seu projeto
3. Revise findings por falsos positivos
4. Ajuste thresholds incrementalmente
5. Monitore por falsos negativos

**Testando Thresholds:**

```bash
# Teste com config atual
npm-verify check

# Veja scores ML no relatório
npm-verify report
```
