# External Scan API

Documentation for the external vulnerability and news scanning module.

---

## English

### Overview

The `scan-external.js` module queries external sources for vulnerability reports and security news related to project dependencies. It interfaces with the OSV (Open Source Vulnerabilities) API and RSS security feeds, implementing Layers 2 and 3 of the ML triage system for news items.

### Main Function

#### `scanExternal(projectRoot, projectConfig, options)`

Queries external sources for security information about project dependencies.

**Parameters:**

- `projectRoot` (string): Absolute path to the project root directory
- `projectConfig` (object): Project configuration from `.npm-verify.json`
  - `external.enabled` (boolean): Enable/disable external scanning (default: true)
- `options` (object): Scan options
  - `fetchFn` (function): Fetch implementation for testing (default: globalThis.fetch)
  - `deepScan` (boolean): Enable Layer 3 deep scan (default: false)
  - `mlConfig` (object): Merged ML configuration

**Returns:** `Promise<Array>` - Array of finding objects

**Finding Object Structure:**

```javascript
{
  severity: 'high' | 'medium' | 'low',
  source: 'external',
  rule: string,           // Rule ID (e.g., 'osv-vulnerability', 'security-news-alert')
  package: string,         // Package name
  detail: string,          // Human-readable description
  blocking: boolean        // Whether this should block execution
}
```

**Example:**

```javascript
import { scanExternal } from './lib/scan-external.js';

const findings = await scanExternal('/path/to/project', projectConfig, {
  fetchFn: globalThis.fetch,
  deepScan: false,
  mlConfig: { enabled: true },
});

console.log(`Found ${findings.length} external threats`);
```

### OSV API Integration

The module queries the OSV API for known vulnerabilities in project dependencies.

**API Endpoint:** Configured in `data/default-feeds.json`

**Query Format:**

```json
{
  "package": {
    "name": "package-name",
    "ecosystem": "npm"
  },
  "version": "1.0.0"
}
```

**Batch Size:** 10 dependencies per batch to avoid rate limiting

**Severity Mapping:**

| OSV Severity              | Mapped Severity | Blocking |
| ------------------------- | --------------- | -------- |
| CRITICAL, HIGH, 9.x, 8.x  | high            | yes      |
| MEDIUM, MODERATE, 7.x-4.x | medium          | no       |
| Other                     | low             | no       |

**Finding Example:**

```javascript
{
  severity: 'high',
  source: 'external',
  rule: 'osv-vulnerability',
  package: 'lodash',
  detail: 'CVE-2021-23337: Prototype pollution in lodash',
  blocking: true
}
```

### RSS Feed Integration

The module fetches RSS security news feeds and correlates news items with project dependencies.

**Feed Sources:** Configured in `data/default-feeds.json`

**Cache TTL:** 1 hour (to avoid excessive network requests)

**Cache Location:** `~/.npm-verify/cache/advisories.json`

**Feed Parsing:**

- Uses `fast-xml-parser` library
- Supports RSS 2.0, Atom, and RDF formats
- Normalizes to standard structure: title, link, description, pubDate

**ML Triage:**

1. News items are tokenized and vectorized (TF-IDF)
2. MLP classification (Layer 2)
3. Optional ONNX DistilBERT classification (Layer 3) if `deepScan: true`
4. Correlated with dependency names

**Finding Example:**

```javascript
{
  severity: 'medium',
  source: 'external',
  rule: 'security-news-alert',
  package: 'axios',
  detail: 'Critical vulnerability discovered in axios - update immediately',
  blocking: false
}
```

### Dependency Loading

The module loads dependencies from the project in the following order:

1. **package-lock.json** (preferred): Reads exact versions from lockfile
2. **package.json** (fallback): Reads version ranges from package.json

**Sections Checked:**

- `dependencies`
- `devDependencies`
- `optionalDependencies`

**Version Normalization:** Removes `^` and `~` prefixes for OSV queries

### Degraded Mode

If external scanning fails (network error, API down, etc.):

- **Non-blocking mode**: Returns a low-severity finding about the degradation
- **Blocking mode**: Throws an error and fails the scan

**Degradation Finding:**

```javascript
{
  severity: 'low',
  source: 'external',
  rule: 'external-scan-degraded',
  detail: 'External scan failed: network error',
  blocking: false
}
```

### Configuration Options

**Project Config (`.npm-verify.json`):**

```json
{
  "external": {
    "enabled": true
  },
  "ml": {
    "enabled": true,
    "newsLayer2Threshold": 0.45,
    "newsLayer3Threshold": 0.8
  }
}
```

**Global Config (`~/.npm-verify/config.json`):**

```json
{
  "intervalHours": 1
}
```

### Testing

The module supports injection of a custom `fetchFn` for testing:

```javascript
// Mock fetch for testing
const mockFetch = async (url, options) => {
  if (url.includes('osv')) {
    return { ok: true, json: () => ({ vulns: [] }) };
  }
  return { ok: true, text: () => '<rss>...</rss>' };
};

const findings = await scanExternal(projectRoot, projectConfig, {
  fetchFn: mockFetch,
});
```

---

## Português

### Visão Geral

O módulo `scan-external.js` consulta fontes externas para relatórios de vulnerabilidade e notícias de segurança relacionadas às dependências do projeto. Interfaceia com a API OSV (Open Source Vulnerabilities) e feeds RSS de segurança, implementando Camadas 2 e 3 do sistema de triagem ML para itens de notícias.

### Função Principal

#### `scanExternal(projectRoot, projectConfig, options)`

Consulta fontes externas por informações de segurança sobre dependências do projeto.

**Parâmetros:**

- `projectRoot` (string): Caminho absoluto para o diretório raiz do projeto
- `projectConfig` (object): Configuração do projeto de `.npm-verify.json`
  - `external.enabled` (boolean): Habilitar/desabilitar varredura externa (padrão: true)
- `options` (object): Opções de varredura
  - `fetchFn` (function): Implementação de fetch para testes (padrão: globalThis.fetch)
  - `deepScan` (boolean): Habilita varredura profunda da Camada 3 (padrão: false)
  - `mlConfig` (object): Configuração ML mesclada

**Retorna:** `Promise<Array>` - Array de objetos de finding

**Estrutura do Objeto Finding:**

```javascript
{
  severity: 'high' | 'medium' | 'low',
  source: 'external',
  rule: string,           // ID da regra (ex: 'osv-vulnerability', 'security-news-alert')
  package: string,         // Nome do pacote
  detail: string,          // Descrição legível por humanos
  blocking: boolean        // Se isso deve bloquear execução
}
```

**Exemplo:**

```javascript
import { scanExternal } from './lib/scan-external.js';

const findings = await scanExternal('/caminho/para/projeto', projectConfig, {
  fetchFn: globalThis.fetch,
  deepScan: false,
  mlConfig: { enabled: true },
});

console.log(`Encontradas ${findings.length} ameaças externas`);
```

### Integração com API OSV

O módulo consulta a API OSV por vulnerabilidades conhecidas nas dependências do projeto.

**Endpoint da API:** Configurado em `data/default-feeds.json`

**Formato da Query:**

```json
{
  "package": {
    "name": "package-name",
    "ecosystem": "npm"
  },
  "version": "1.0.0"
}
```

**Tamanho do Lote:** 10 dependências por lote para evitar limitação de taxa

**Mapeamento de Severidade:**

| Severidade OSV            | Severidade Mapeada | Bloqueio |
| ------------------------- | ------------------ | -------- |
| CRITICAL, HIGH, 9.x, 8.x  | high               | sim      |
| MEDIUM, MODERATE, 7.x-4.x | medium             | não      |
| Outro                     | low                | não      |

**Exemplo de Finding:**

```javascript
{
  severity: 'high',
  source: 'external',
  rule: 'osv-vulnerability',
  package: 'lodash',
  detail: 'CVE-2021-23337: Poluição de protótipo em lodash',
  blocking: true
}
```

### Integração com Feed RSS

O módulo busca feeds RSS de notícias de segurança e correlaciona itens de notícias com dependências do projeto.

**Fontes de Feed:** Configuradas em `data/default-feeds.json`

**TTL do Cache:** 1 hora (para evitar requisições de rede excessivas)

**Localização do Cache:** `~/.npm-verify/cache/advisories.json`

**Parse de Feed:**

- Usa biblioteca `fast-xml-parser`
- Suporta formatos RSS 2.0, Atom e RDF
- Normaliza para estrutura padrão: title, link, description, pubDate

**Triagem ML:**

1. Itens de notícias são tokenizados e vetorizados (TF-IDF)
2. Classificação MLP (Camada 2)
3. Classificação opcional ONNX DistilBERT (Camada 3) se `deepScan: true`
4. Correlacionados com nomes de dependências

**Exemplo de Finding:**

```javascript
{
  severity: 'medium',
  source: 'external',
  rule: 'security-news-alert',
  package: 'axios',
  detail: 'Vulnerabilidade crítica descoberta em axios - atualize imediatamente',
  blocking: false
}
```

### Carregamento de Dependências

O módulo carrega dependências do projeto na seguinte ordem:

1. **package-lock.json** (preferido): Lê versões exatas do lockfile
2. **package.json** (fallback): Lê intervalos de versão do package.json

**Seções Verificadas:**

- `dependencies`
- `devDependencies`
- `optionalDependencies`

**Normalização de Versão:** Remove prefixos `^` e `~` para queries OSV

### Modo Degradado

Se a varredura externa falhar (erro de rede, API fora, etc.):

- **Modo não bloqueante**: Retorna um finding de baixa severidade sobre a degradação
- **Modo bloqueante**: Lança um erro e falha a varredura

**Finding de Degradação:**

```javascript
{
  severity: 'low',
  source: 'external',
  rule: 'external-scan-degraded',
  detail: 'Varredura externa falhou: erro de rede',
  blocking: false
}
```

### Opções de Configuração

**Config de Projeto (`.npm-verify.json`):**

```json
{
  "external": {
    "enabled": true
  },
  "ml": {
    "enabled": true,
    "newsLayer2Threshold": 0.45,
    "newsLayer3Threshold": 0.8
  }
}
```

**Config Global (`~/.npm-verify/config.json`):**

```json
{
  "intervalHours": 1
}
```

### Testes

O módulo suporta injeção de um `fetchFn` customizado para testes:

```javascript
// Mock fetch para testes
const mockFetch = async (url, options) => {
  if (url.includes('osv')) {
    return { ok: true, json: () => ({ vulns: [] }) };
  }
  return { ok: true, text: () => '<rss>...</rss>' };
};

const findings = await scanExternal(projectRoot, projectConfig, {
  fetchFn: mockFetch,
});
```
