# ML Triage API

Documentation for the machine learning triage modules.

---

## English

### Overview

The ML triage system implements a 4-layer approach for analyzing code content and security news. Layers 1-2 use pure JavaScript ML (TF-IDF, Naive Bayes, MLP), Layer 2.5 uses code embedding similarity, and Layer 3 optionally uses ONNX runtime for deep learning models (CodeBERT, DistilBERT) with automatic fallback to bundled MLP weights.

### Code Triage

#### `triageCodeContent(content, layer1Findings, options)`

Analyzes code content using ML triage layers.

**Parameters:**

- `content` (string): Code content to analyze
- `layer1Findings` (array): Findings from Layer 1 heuristic rules
- `options` (object):
  - `mlConfig` (object): ML configuration
    - `enabled` (boolean): Enable ML (default: true)
    - `layer2Threshold` (number): Layer 2 threshold (default: 0.7)
    - `layer2MediumThreshold` (number): Medium threshold (default: 0.3)
    - `layer3Threshold` (number): Layer 3 threshold (default: 0.8)
    - `tfidfThreshold` (number): TF-IDF threshold (default: 2.5)
    - `blockOnMedium` (boolean): Block on medium severity (default: false)
    - `useOnnx` (boolean): Use ONNX if available (default: true)
    - `enableEmbeddings` (boolean): Enable code embedding similarity (default: true)
    - `embeddingThreshold` (number): Embedding similarity threshold (default: 0.8)
  - `deepScan` (boolean): Enable Layer 3 (default: false)
  - `skipCache` (boolean): Skip ML cache (default: false)

**Returns:** `Promise<Array>` - Array of findings with ML results

**Finding Structure:**

```javascript
{
  severity: 'high' | 'medium',
  source: 'local',
  rule: string,           // Rule ID (e.g., 'ml-naive-bayes', 'ml-onnx-codebert')
  detail: string,         // Human-readable description
  mlScore: number,        // ML probability score
  mlLayer: number,        // Layer number (2, 2.5, or 3)
  matchedPattern: string, // Matched pattern name (Layer 2.5 only)
  blocking: boolean
}
```

**Flow:**

1. **Layer 1 Input**: Accepts findings from heuristic rules
2. **Early Exit**: If Layer 1 has high-severity blocking findings, skip ML
3. **Cache Check**: Return cached result if available (unless `deepScan` or `skipCache`)
4. **Layer 2**:
   - Tokenize code
   - Compute TF-IDF score
   - Classify with Naive Bayes
   - Fuse scores with threshold-based logic
5. **Layer 2.5** (if threshold exceeded and embeddings enabled):
   - Generate code embedding using Nomic Embed model
   - Compare against known malicious pattern embeddings
   - Check similarity threshold
   - Return early if pattern matches
6. **Layer 3** (if `deepScan: true` and threshold exceeded):
   - Build feature vector
   - Try ONNX CodeBERT if available
   - Fallback to bundled MLP
7. **Cache Result**: Store in ML cache for future scans

**Layer 2 Rules:**

- `ml-naive-bayes`: Naive Bayes classification
- `ml-tfidf-nb-fusion`: TF-IDF + Naive Bayes fusion

**Layer 2.5 Rules:**

- `ml-embedding-similarity`: Code embedding similarity match

**Layer 3 Rules:**

- `ml-onnx-codebert`: ONNX CodeBERT classification
- `ml-mlp`: Bundled MLP fallback

**Example:**

```javascript
import { triageCodeContent } from './lib/ml/triage-code.js';

const findings = await triageCodeContent(codeContent, layer1Findings, {
  mlConfig: {
    enabled: true,
    layer2Threshold: 0.7,
    layer3Threshold: 0.8,
    useOnnx: true,
  },
  deepScan: false,
});
```

### News Triage

#### `triageNewsItems(items, dependencies, options)`

Analyzes security news items and correlates with project dependencies.

**Parameters:**

- `items` (array): RSS feed items
  - `title` (string): News title
  - `description` (string): News description
  - `link` (string): News URL
  - `pubDate` (string): Publication date
- `dependencies` (array): Project dependencies
  - `name` (string): Package name
  - `version` (string): Package version
- `options` (object):
  - `mlConfig` (object): ML configuration
    - `newsLayer2Threshold` (number): Layer 2 threshold (default: 0.45)
    - `newsLayer3Threshold` (number): Layer 3 threshold (default: 0.8)
    - `useOnnx` (boolean): Use ONNX if available (default: true)
  - `deepScan` (boolean): Enable Layer 3 (default: false)

**Returns:** `Promise<Array>` - Array of findings for relevant news

**Finding Structure:**

```javascript
{
  severity: 'high' | 'medium',
  source: 'external',
  rule: string,           // Rule ID (e.g., 'ml-news-mlp', 'ml-onnx-distilbert')
  package: string,         // Package name mentioned in news
  detail: string,          // News title
  mlScore: number,        // ML probability score
  mlLayer: number,        // Layer number (2 or 3)
  blocking: boolean
}
```

**Flow:**

1. **Text Extraction**: Combine title and description
2. **Dependency Matching**: Find mentioned dependencies
3. **Layer 2**:
   - Build feature vector with threat keywords
   - Classify with MLP
   - Check against threshold
4. **Layer 3** (if `deepScan: true` and threshold exceeded):
   - Try ONNX DistilBERT if available
   - Fallback to Layer 2 MLP result
5. **Correlation**: Match news to mentioned dependencies

**Classification Levels:**

- `ignore`: Below threshold, not relevant
- `medium`: Suspicious, non-blocking
- `critical`: High confidence, blocking

**Layer 2 Rule:** `ml-news-mlp`

**Layer 3 Rule:** `ml-onnx-distilbert`

**Example:**

```javascript
import { triageNewsItems } from './lib/ml/triage-news.js';

const findings = await triageNewsItems(newsItems, dependencies, {
  mlConfig: {
    newsLayer2Threshold: 0.45,
    newsLayer3Threshold: 0.8,
    useOnnx: true,
  },
  deepScan: false,
});
```

### ML Models

#### Code Models

**Naive Bayes (Layer 2):**

- Pure JavaScript implementation
- Trained on labeled code samples
- Fast inference (< 100ms per file)

**Nomic Embed (Layer 2.5):**

- Int8-quantized BERT model (137M params, ~137MB)
- Generates 768-dimensional code embeddings
- Uses ONNX runtime via `@agentix-e/embed-code-node`
- Compares code against known malicious pattern embeddings
- Fast inference (~50-100ms per file)
- Gracefully degrades if unavailable

**MLP (Layer 3 fallback):**

- Multi-layer perceptron in pure JavaScript
- Bundled weights in `data/models/`
- Trained on same dataset as CodeBERT

**CodeBERT (Layer 3):**

- Pre-trained transformer model
- ONNX runtime required
- Downloaded on-demand via `npm-verify models download`
- Higher accuracy but slower (1-5s per file)

#### News Models

**MLP (Layer 2):**

- Pure JavaScript implementation
- Trained on security news corpus
- Uses threat keyword features

**DistilBERT (Layer 3):**

- Pre-trained transformer model
- ONNX runtime required
- Downloaded on-demand
- Better semantic understanding

### Configuration

**ML Config Structure:**

```json
{
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
    "blockOnMedium": false,
    "enableEmbeddings": true,
    "embeddingThreshold": 0.8
  }
}
```

**Threshold Guidelines:**

- Lower thresholds = more sensitive, more false positives
- Higher thresholds = less sensitive, more false negatives
- Tune based on your project's tolerance for false positives

### Caching

ML results are cached by content hash to avoid redundant computation:

**Cache Location:** `~/.npm-verify/cache/ml-scores.json`

**Cache Behavior:**

- Cached results are returned unless `deepScan` or `skipCache` is set
- Cache includes approval status and ML score
- Improves performance for repeated scans

### ONNX Integration

**Status Check:**

```bash
npm-verify models status
```

**Download Models:**

```bash
npm-verify models download
```

**Download Embedding Model:**

```bash
npm-verify models download-embeddings
```

**Generate Embeddings for Patterns:**

```bash
npm-verify models generate-embeddings
```

**Models Directory:** `~/.npm-verify/models/`

**Fallback:** If ONNX runtime unavailable, automatically uses bundled MLP weights. If embedding model unavailable, Layer 2.5 is skipped gracefully.

---

## Português

### Visão Geral

O sistema de triagem ML implementa uma abordagem de 4 camadas para analisar conteúdo de código e notícias de segurança. Camadas 1-2 usam ML JavaScript puro (TF-IDF, Naive Bayes, MLP), Camada 2.5 usa similaridade de embeddings de código, e a Camada 3 opcionalmente usa runtime ONNX para modelos de deep learning (CodeBERT, DistilBERT) com fallback automático para pesos MLP bundled.

### Triagem de Código

#### `triageCodeContent(content, layer1Findings, options)`

Analisa conteúdo de código usando camadas de triagem ML.

**Parâmetros:**

- `content` (string): Conteúdo de código para analisar
- `layer1Findings` (array): Findings de regras heurísticas da Camada 1
- `options` (object):
  - `mlConfig` (object): Configuração ML
    - `enabled` (boolean): Habilitar ML (padrão: true)
    - `layer2Threshold` (number): Threshold da Camada 2 (padrão: 0.7)
    - `layer2MediumThreshold` (number): Threshold médio (padrão: 0.3)
    - `layer3Threshold` (number): Threshold da Camada 3 (padrão: 0.8)
    - `tfidfThreshold` (number): Threshold TF-IDF (padrão: 2.5)
    - `blockOnMedium` (boolean): Bloquear em severidade média (padrão: false)
    - `useOnnx` (boolean): Usar ONNX se disponível (padrão: true)
    - `enableEmbeddings` (boolean): Habilitar similaridade de embeddings de código (padrão: true)
    - `embeddingThreshold` (number): Threshold de similaridade de embedding (padrão: 0.8)
  - `deepScan` (boolean): Habilitar Camada 3 (padrão: false)
  - `skipCache` (boolean): Pular cache ML (padrão: false)

**Retorna:** `Promise<Array>` - Array de findings com resultados ML

**Estrutura do Finding:**

```javascript
{
  severity: 'high' | 'medium',
  source: 'local',
  rule: string,           // ID da regra (ex: 'ml-naive-bayes', 'ml-onnx-codebert')
  detail: string,         // Descrição legível por humanos
  mlScore: number,        // Score de probabilidade ML
  mlLayer: number,        // Número da camada (2, 2.5, ou 3)
  matchedPattern: string, // Nome do padrão correspondido (apenas Camada 2.5)
  blocking: boolean
}
```

**Fluxo:**

1. **Entrada da Camada 1**: Aceita findings de regras heurísticas
2. **Saída Antecipada**: Se Camada 1 tem findings bloqueantes de alta severidade, pula ML
3. **Verificação de Cache**: Retorna resultado em cache se disponível (a menos que `deepScan` ou `skipCache`)
4. **Camada 2**:
   - Tokeniza código
   - Computa score TF-IDF
   - Classifica com Naive Bayes
   - Fusiona scores com lógica baseada em threshold
5. **Camada 2.5** (se threshold excedido e embeddings habilitados):
   - Gera embedding de código usando modelo Nomic Embed
   - Compara contra embeddings de padrões maliciosos conhecidos
   - Verifica threshold de similaridade
   - Retorna antecipadamente se padrão corresponder
6. **Camada 3** (se `deepScan: true` e threshold excedido):
   - Constrói vetor de features
   - Tenta ONNX CodeBERT se disponível
   - Fallback para MLP bundled
7. **Cache de Resultado**: Armazena em cache ML para varreduras futuras

**Regras da Camada 2:**

- `ml-naive-bayes`: Classificação Naive Bayes
- `ml-tfidf-nb-fusion`: Fusão TF-IDF + Naive Bayes

**Regras da Camada 2.5:**

- `ml-embedding-similarity`: Correspondência de similaridade de embedding

**Regras da Camada 3:**

- `ml-onnx-codebert`: Classificação ONNX CodeBERT
- `ml-mlp`: Fallback MLP bundled

**Exemplo:**

```javascript
import { triageCodeContent } from './lib/ml/triage-code.js';

const findings = await triageCodeContent(codeContent, layer1Findings, {
  mlConfig: {
    enabled: true,
    layer2Threshold: 0.7,
    layer3Threshold: 0.8,
    useOnnx: true,
  },
  deepScan: false,
});
```

### Triagem de Notícias

#### `triageNewsItems(items, dependencies, options)`

Analisa itens de notícias de segurança e correlaciona com dependências do projeto.

**Parâmetros:**

- `items` (array): Itens de feed RSS
  - `title` (string): Título da notícia
  - `description` (string): Descrição da notícia
  - `link` (string): URL da notícia
  - `pubDate` (string): Data de publicação
- `dependencies` (array): Dependências do projeto
  - `name` (string): Nome do pacote
  - `version` (string): Versão do pacote
- `options` (object):
  - `mlConfig` (object): Configuração ML
    - `newsLayer2Threshold` (number): Threshold da Camada 2 (padrão: 0.45)
    - `newsLayer3Threshold` (number): Threshold da Camada 3 (padrão: 0.8)
    - `useOnnx` (boolean): Usar ONNX se disponível (padrão: true)
  - `deepScan` (boolean): Habilitar Camada 3 (padrão: false)

**Retorna:** `Promise<Array>` - Array de findings para notícias relevantes

**Estrutura do Finding:**

```javascript
{
  severity: 'high' | 'medium',
  source: 'external',
  rule: string,           // ID da regra (ex: 'ml-news-mlp', 'ml-onnx-distilbert')
  package: string,         // Nome do pacote mencionado na notícia
  detail: string,          // Título da notícia
  mlScore: number,        // Score de probabilidade ML
  mlLayer: number,        // Número da camada (2 ou 3)
  blocking: boolean
}
```

**Fluxo:**

1. **Extração de Texto**: Combina título e descrição
2. **Correspondência de Dependências**: Encontra dependências mencionadas
3. **Camada 2**:
   - Constrói vetor de features com palavras-chave de ameaça
   - Classifica com MLP
   - Verifica contra threshold
4. **Camada 3** (se `deepScan: true` e threshold excedido):
   - Tenta ONNX DistilBERT se disponível
   - Fallback para resultado MLP da Camada 2
5. **Correlação**: Corresponde notícias a dependências mencionadas

**Níveis de Classificação:**

- `ignore`: Abaixo do threshold, não relevante
- `medium`: Suspeito, não bloqueante
- `critical`: Alta confiança, bloqueante

**Regra da Camada 2:** `ml-news-mlp`

**Regra da Camada 3:** `ml-onnx-distilbert`

**Exemplo:**

```javascript
import { triageNewsItems } from './lib/ml/triage-news.js';

const findings = await triageNewsItems(newsItems, dependencies, {
  mlConfig: {
    newsLayer2Threshold: 0.45,
    newsLayer3Threshold: 0.8,
    useOnnx: true,
  },
  deepScan: false,
});
```

### Modelos ML

#### Modelos de Código

**Naive Bayes (Camada 2):**

- Implementação JavaScript puro
- Treinado em amostras de código rotuladas
- Inferência rápida (< 100ms por arquivo)

**Nomic Embed (Camada 2.5):**

- Modelo BERT quantizado int8 (137M params, ~137MB)
- Gera embeddings de código de 768 dimensões
- Usa runtime ONNX via `@agentix-e/embed-code-node`
- Compara código contra embeddings de padrões maliciosos conhecidos
- Inferência rápida (~50-100ms por arquivo)
- Degrada graciosamente se indisponível

**MLP (Fallback da Camada 3):**

- Perceptron multicamadas em JavaScript puro
- Pesos bundled em `data/models/`
- Treinado no mesmo dataset que CodeBERT

**CodeBERT (Camada 3):**

- Modelo transformer pré-treinado
- Runtime ONNX requerido
- Baixado sob demanda via `npm-verify models download`
- Maior precisão mas mais lento (1-5s por arquivo)

#### Modelos de Notícias

**MLP (Camada 2):**

- Implementação JavaScript puro
- Treinado em corpus de notícias de segurança
- Usa features de palavras-chave de ameaça

**DistilBERT (Camada 3):**

- Modelo transformer pré-treinado
- Runtime ONNX requerido
- Baixado sob demanda
- Melhor compreensão semântica

### Configuração

**Estrutura de Config ML:**

```json
{
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
    "blockOnMedium": false,
    "enableEmbeddings": true,
    "embeddingThreshold": 0.8
  }
}
```

**Diretrizes de Threshold:**

- Thresholds mais baixos = mais sensível, mais falsos positivos
- Thresholds mais altos = menos sensível, mais falsos negativos
- Ajuste baseado na tolerância do seu projeto a falsos positivos

### Cache

Resultados ML são cacheados por hash de conteúdo para evitar computação redundante:

**Localização do Cache:** `~/.npm-verify/cache/ml-scores.json`

**Comportamento do Cache:**

- Resultados em cache são retornados a menos que `deepScan` ou `skipCache` seja definido
- Cache inclui status de aprovação e score ML
- Melhora performance para varreduras repetidas

### Integração ONNX

**Verificação de Status:**

```bash
npm-verify models status
```

**Download de Modelos:**

```bash
npm-verify models download
```

**Download de Modelo de Embedding:**

```bash
npm-verify models download-embeddings
```

**Gerar Embeddings para Padrões:**

```bash
npm-verify models generate-embeddings
```

**Diretório de Modelos:** `~/.npm-verify/models/`

**Fallback:** Se runtime ONNX indisponível, usa automaticamente pesos MLP bundled. Se modelo de embedding indisponível, Camada 2.5 é pulada graciosamente.
