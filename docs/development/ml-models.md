# ML Models Guide

Understanding and managing the machine learning models in npm-verify-guard.

---

## English

### Overview

npm-verify-guard uses a 5-layer ML triage system:

- **Layer 1**: Regex + SHA-256 blacklist (heuristics, not ML)
- **Layer 1.5**: Sensitive data detection via regex (crypto, API keys, passwords) - pattern matching
- **Layer 2**: TF-IDF + Naive Bayes (code) / MLP (news) - pure JavaScript
- **Layer 2.5**: Code embedding similarity (Nomic Embed) - semantic pattern matching
- **Layer 3**: ONNX CodeBERT/DistilBERT or MLP fallback - deep learning
- **Layer 4**: Local LLM analysis (node-llama-cpp or OpenAI-compatible) - semantic understanding

### Model Types

#### Naive Bayes (Layer 2 - Code)

**Purpose**: Classify code content as benign or malicious

**Implementation**: Pure JavaScript in `lib/ml/naive-bayes.js`

**Training Data**: `data/training-samples.json`

**Model Weights**: Generated in `data/models/` by `scripts/generate-models.mjs`

**Performance**: Fast (< 100ms per file)

**Use Case**: Every scan (Layer 2)

#### Nomic Embed (Layer 2.5 - Code)

**Purpose**: Generate semantic code embeddings and compare against known malicious patterns

**Implementation**: ONNX runtime via `@agentix-e/embed-code-node` in `lib/ml/code-embedder.js`

**Model Source**: Downloaded on-demand via `npm-verify models download-embeddings`

**Model**: nomic-embed-code-v1.5.int8.onnx (137M params, ~137MB)

**Pattern Data**: `data/embedding-patterns.json` with pre-computed embeddings

**Performance**: Fast (~50-100ms per file)

**Use Case**: Every scan when enabled (Layer 2.5)

**Fallback**: If model unavailable, Layer 2.5 is skipped gracefully

#### MLP (Layer 2/3 - News & Code Fallback)

**Purpose**: Multi-layer perceptron for news classification and code fallback

**Implementation**: Pure JavaScript in `lib/ml/mlp.js`

**Training Data**: `data/training-samples.json`

**Model Weights**: Generated in `data/models/` by `scripts/generate-models.mjs`

**Performance**: Moderate (100-500ms per file)

**Use Case**: News triage (Layer 2), code fallback (Layer 3)

#### CodeBERT (Layer 3 - Code)

**Purpose**: Deep learning model for code analysis

**Implementation**: ONNX runtime (`onnxruntime-node`)

**Model Source**: Downloaded on-demand via `npm-verify models download`

**Model Location**: `~/.npm-verify/models/codebert-mini/`

**Performance**: Slower (1-5s per file)

**Use Case**: Deep scan with `--deep` flag (Layer 3)

**Fallback**: Automatically uses bundled MLP if ONNX unavailable

#### DistilBERT (Layer 3 - News)

**Purpose**: Deep learning model for news semantic analysis

**Implementation**: ONNX runtime (`onnxruntime-node`)

**Model Source**: Downloaded on-demand via `npm-verify models download`

**Model Location**: `~/.npm-verify/models/distilbert-news/`

**Performance**: Slower (1-5s per item)

**Use Case**: Deep scan with `--deep` flag (Layer 3)

**Fallback**: Automatically uses bundled MLP if ONNX unavailable

#### Local LLM (Layer 4 - Code)

**Purpose**: Advanced semantic analysis for code security and sensitive data detection

**Implementation**: Multi-provider support

- node-llama-cpp (direct llama.cpp binding)
- OpenAI-compatible API (Ollama, vLLM, LocalAI, etc.)

**Model Source**: User-configurable, downloaded on-demand

- node-llama-cpp: models in `~/.npm-verify/llm-models/`
- OpenAI-compatible: managed by external service

**Model Location**: `~/.npm-verify/llm-models/` (for node-llama-cpp)

**Performance**: Slowest (2-10s per file)

**Use Case**: Deep scan with `--deep` flag and `ml.enableLlm: true` (Layer 4)

**Fallback**: Automatically skipped if LLM unavailable

**Analysis Types**:

- Code security analysis (malicious patterns, exfiltration)
- Sensitive data detection (API keys, passwords, crypto addresses)

### Training Data

#### Location

`data/training-samples.json`

#### Structure

```json
{
  "code": [
    {
      "label": "benign",
      "content": "function add(a, b) { return a + b; }"
    },
    {
      "label": "malicious",
      "content": "eval(maliciousCode)"
    }
  ],
  "news": [
    {
      "label": "benign",
      "title": "New version released",
      "description": "Minor bug fixes and improvements"
    },
    {
      "label": "threat",
      "title": "Critical vulnerability in package",
      "description": "Update immediately to avoid exploitation"
    }
  ]
}
```

#### Adding Training Samples

1. Edit `data/training-samples.json`
2. Add samples to appropriate section (`code` or `news`)
3. Ensure balanced distribution of labels
4. Run model generation

### Local LLM Configuration

**Provider Selection**:

Configure in `.npm-verify.json` or `~/.npm-verify/config.json`:

```json
{
  "ml": {
    "enableLlm": true,
    "llm": {
      "provider": "auto",
      "modelPath": null,
      "openaiApiUrl": null,
      "openaiApiKey": null,
      "openaiModel": "llama3",
      "enableSensitiveData": true
    }
  }
}
```

**Provider Options**:

- `auto`: Try node-llama-cpp first, fall back to OpenAI-compatible
- `node-llama-cpp`: Use llama.cpp binding directly
- `openai-compatible`: Use OpenAI-compatible API service

**Model Recommendations**:

- Small (1-3B params): Fastest, ~1-2GB (e.g., Phi-3-mini, TinyLlama)
- Medium (7-8B params): Balanced, ~4-5GB (e.g., Llama-3.1-8B, Mistral-7B)
- Large (13B+ params): Most accurate, ~8GB+ (not recommended for automated scanning)

**Checking LLM Status**:

```bash
npm-verify llm status
```

Output:

- node-llama-cpp availability
- OpenAI-compatible provider status
- Models directory location
- Configured provider

### Generating Models

#### Regenerate ML Models

```bash
npm run generate-models
```

This script:

1. Loads training samples from `data/training-samples.json`
2. Tokenizes and processes samples
3. Trains Naive Bayes model for code
4. Trains MLP models for code and news
5. Saves weights to `data/models/`

#### Generate Code Embeddings

```bash
npm run generate-embeddings
```

This script:

1. Loads malicious code patterns from `data/embedding-patterns.json`
2. Initializes the Nomic Embed model
3. Generates embeddings for each pattern
4. Saves embeddings back to `data/embedding-patterns.json`

**Note**: Requires `@agentix-e/embed-code-node` to be installed and the embedding model to be downloaded.

#### Output Files

Generated in `data/models/`:

- `code-nb-model.json` - Naive Bayes weights for code
- `code-mlp-model.json` - MLP weights for code
- `news-mlp-model.json` - MLP weights for news
- `idf-map.json` - TF-IDF inverse document frequency map
- `threat-keywords.json` - Threat keyword list for news

### ONNX Models

#### Checking Status

```bash
npm-verify models status
```

Output:

- ONNX runtime availability
- Models directory location
- Download status of each model
- Bundled ML models list

#### Downloading Models

```bash
npm-verify models download
```

Downloads:

- CodeBERT-mini model (~50MB)
- DistilBERT model (~300MB)

#### Model Location

`~/.npm-verify/models/`

#### Removing Models

```bash
# Remove models directory
rm -rf ~/.npm-verify/models/
```

The tool will automatically fallback to bundled MLP models.

### Model Performance

#### Accuracy Estimates

| Model       | Accuracy | False Positive Rate | Speed     |
| ----------- | -------- | ------------------- | --------- |
| Naive Bayes | ~85%     | ~15%                | < 100ms   |
| MLP (Code)  | ~90%     | ~10%                | 100-500ms |
| CodeBERT    | ~95%     | ~5%                 | 1-5s      |
| MLP (News)  | ~85%     | ~15%                | 100-500ms |
| DistilBERT  | ~92%     | ~8%                 | 1-5s      |
| Local LLM   | ~97%     | ~3%                 | 2-10s     |

#### Threshold Tuning

Adjust thresholds in `.npm-verify.json`:

```json
{
  "ml": {
    "layer2Threshold": 0.7,
    "layer3Threshold": 0.8,
    "newsLayer2Threshold": 0.45,
    "newsLayer3Threshold": 0.8
  }
}
```

**Guidelines:**

- Lower thresholds = more sensitive, more false positives
- Higher thresholds = less sensitive, more false negatives
- Start with defaults, adjust based on false positive rate

### Updating Malware Hashes

#### From OSV API

```bash
npm-verify update-hashes
```

This:

1. Queries OSV API for npm packages with vulnerabilities
2. Extracts SHA-256 hashes from advisory reports
3. Merges with existing `data/malware-hashes.json`
4. Saves updated hash database

#### Dry Run

```bash
npm-verify update-hashes --dry-run
```

Preview changes without writing to file.

#### Custom Concurrency

```bash
npm-verify update-hashes --concurrency 8
```

Increase concurrent API requests for faster updates.

### Testing Model Changes

After updating training data or regenerating models:

```bash
# Regenerate models
npm run generate-models

# Run tests
npm test

# Test on a real project
npm-verify check --deep
```

### Best Practices

1. **Balanced Training Data**: Ensure equal distribution of benign/malicious samples
2. **Test After Changes**: Always run tests after updating models
3. **Version Control**: Commit model weights when they change
4. **Document Changes**: Explain why training data was modified
5. **Monitor Performance**: Track false positive/negative rates in production

### Troubleshooting

#### Model Generation Fails

Check:

- `data/training-samples.json` is valid JSON
- Training samples are balanced
- No syntax errors in sample content

#### ONNX Download Fails

Check:

- Network connectivity
- Write permissions to `~/.npm-verify/models/`
- Sufficient disk space (~350MB)

#### High False Positive Rate

Adjust:

- Increase `layer2Threshold` and `layer3Threshold`
- Add more benign samples to training data
- Review and improve heuristic rules

#### High False Negative Rate

Adjust:

- Decrease `layer2Threshold` and `layer3Threshold`
- Add more malicious samples to training data
- Enable ONNX models for better accuracy

---

## Português

### Visão Geral

npm-verify-guard usa um sistema de triagem ML de 5 camadas:

- **Camada 1**: Regex + blacklist SHA-256 (heurísticas, não ML)
- **Camada 1.5**: Detecção de dados sensíveis via regex (crypto, chaves API, senhas) - padrões
- **Camada 2**: TF-IDF + Naive Bayes (código) / MLP (notícias) - JavaScript puro
- **Camada 2.5**: Similaridade de embeddings de código (Nomic Embed) - padrões semânticos
- **Camada 3**: ONNX CodeBERT/DistilBERT ou fallback MLP - deep learning
- **Camada 4**: Análise LLM local (node-llama-cpp ou OpenAI-compatible) - entendimento semântico

### Tipos de Modelo

#### Naive Bayes (Camada 2 - Código)

**Propósito**: Classificar conteúdo de código como benigno ou malicioso

**Implementação**: JavaScript puro em `lib/ml/naive-bayes.js`

**Dados de Treino**: `data/training-samples.json`

**Pesos do Modelo**: Gerados em `data/models/` por `scripts/generate-models.mjs`

**Performance**: Rápido (< 100ms por arquivo)

**Caso de Uso**: Toda varredura (Camada 2)

#### MLP (Camada 2/3 - Notícias e Fallback de Código)

**Propósito**: Perceptron multicamadas para classificação de notícias e fallback de código

**Implementação**: JavaScript puro em `lib/ml/mlp.js`

**Dados de Treino**: `data/training-samples.json`

**Pesos do Modelo**: Gerados em `data/models/` por `scripts/generate-models.mjs`

**Performance**: Moderado (100-500ms por arquivo)

**Caso de Uso**: Triagem de notícias (Camada 2), fallback de código (Camada 3)

#### CodeBERT (Camada 3 - Código)

**Propósito**: Modelo de deep learning para análise de código

**Implementação**: Runtime ONNX (`onnxruntime-node`)

**Fonte do Modelo**: Baixado sob demanda via `npm-verify models download`

**Localização do Modelo**: `~/.npm-verify/models/codebert-mini/`

**Performance**: Mais lento (1-5s por arquivo)

**Caso de Uso**: Varredura profunda com flag `--deep` (Camada 3)

**Fallback**: Usa automaticamente MLP bundled se ONNX indisponível

#### DistilBERT (Camada 3 - Notícias)

**Propósito**: Modelo de deep learning para análise semântica de notícias

**Implementação**: Runtime ONNX (`onnxruntime-node`)

**Fonte do Modelo**: Baixado sob demanda via `npm-verify models download`

**Localização do Modelo**: `~/.npm-verify/models/distilbert-news/`

**Performance**: Mais lento (1-5s por item)

**Caso de Uso**: Varredura profunda com flag `--deep` (Camada 3)

**Fallback**: Usa automaticamente MLP bundled se ONNX indisponível

#### LLM Local (Camada 4 - Código)

**Propósito**: Análise semântica avançada para segurança de código e detecção de dados sensíveis

**Implementação**: Suporte multi-provider

- node-llama-cpp (binding direto do llama.cpp)
- API OpenAI-compatible (Ollama, vLLM, LocalAI, etc.)

**Fonte do Modelo**: Configurável pelo usuário, baixado sob demanda

- node-llama-cpp: modelos em `~/.npm-verify/llm-models/`
- OpenAI-compatible: gerenciado por serviço externo

**Localização do Modelo**: `~/.npm-verify/llm-models/` (para node-llama-cpp)

**Performance**: Mais lento (2-10s por arquivo)

**Caso de Uso**: Varredura profunda com flag `--deep` e `ml.enableLlm: true` (Camada 4)

**Fallback**: Automaticamente pulado se LLM indisponível

**Tipos de Análise**:

- Análise de segurança de código (padrões maliciosos, exfiltração)
- Detecção de dados sensíveis (chaves API, senhas, endereços crypto)

### Dados de Treino

#### Localização

`data/training-samples.json`

#### Estrutura

```json
{
  "code": [
    {
      "label": "benign",
      "content": "function add(a, b) { return a + b; }"
    },
    {
      "label": "malicious",
      "content": "eval(maliciousCode)"
    }
  ],
  "news": [
    {
      "label": "benign",
      "title": "Nova versão lançada",
      "description": "Correções de bugs menores e melhorias"
    },
    {
      "label": "threat",
      "title": "Vulnerabilidade crítica no pacote",
      "description": "Atualize imediatamente para evitar exploração"
    }
  ]
}
```

#### Adicionando Amostras de Treino

1. Edite `data/training-samples.json`
2. Adicione amostras à seção apropriada (`code` ou `news`)
3. Certifique-se de distribuição balanceada de labels
4. Execute geração de modelo

### Configuração LLM Local

**Seleção de Provider**:

Configure em `.npm-verify.json` ou `~/.npm-verify/config.json`:

```json
{
  "ml": {
    "enableLlm": true,
    "llm": {
      "provider": "auto",
      "modelPath": null,
      "openaiApiUrl": null,
      "openaiApiKey": null,
      "openaiModel": "llama3",
      "enableSensitiveData": true
    }
  }
}
```

**Opções de Provider**:

- `auto`: Tenta node-llama-cpp primeiro, fallback para OpenAI-compatible
- `node-llama-cpp`: Usa binding do llama.cpp diretamente
- `openai-compatible`: Usa serviço de API OpenAI-compatible

**Recomendações de Modelo**:

- Pequeno (1-3B params): Mais rápido, ~1-2GB (ex: Phi-3-mini, TinyLlama)
- Médio (7-8B params): Balanceado, ~4-5GB (ex: Llama-3.1-8B, Mistral-7B)
- Grande (13B+ params): Mais preciso, ~8GB+ (não recomendado para varredura automatizada)

**Verificando Status LLM**:

```bash
npm-verify llm status
```

Saída:

- Disponibilidade de node-llama-cpp
- Status de provider OpenAI-compatible
- Localização do diretório de modelos
- Provider configurado

### Gerando Modelos

#### Regenerar Modelos ML

```bash
npm run generate-models
```

Este script:

1. Carrega amostras de treino de `data/training-samples.json`
2. Tokeniza e processa amostras
3. Treina modelo Naive Bayes para código
4. Treina modelos MLP para código e notícias
5. Salva pesos em `data/models/`

#### Arquivos de Saída

Gerados em `data/models/`:

- `code-nb-model.json` - Pesos Naive Bayes para código
- `code-mlp-model.json` - Pesos MLP para código
- `news-mlp-model.json` - Pesos MLP para notícias
- `idf-map.json` - Mapa de frequência inversa de documento TF-IDF
- `threat-keywords.json` - Lista de palavras-chave de ameaça para notícias

### Modelos ONNX

#### Verificando Status

```bash
npm-verify models status
```

Saída:

- Disponibilidade de runtime ONNX
- Localização do diretório de modelos
- Status de download de cada modelo
- Lista de modelos ML bundled

#### Baixando Modelos

```bash
npm-verify models download
```

Downloads:

- Modelo CodeBERT-mini (~50MB)
- Modelo DistilBERT (~300MB)

#### Localização do Modelo

`~/.npm-verify/models/`

#### Removendo Modelos

```bash
# Remova diretório de modelos
rm -rf ~/.npm-verify/models/
```

A ferramenta fará fallback automaticamente para modelos ML bundled.

### Performance de Modelo

#### Estimativas de Precisão

| Modelo         | Precisão | Taxa de Falso Positivo | Velocidade |
| -------------- | -------- | ---------------------- | ---------- |
| Naive Bayes    | ~85%     | ~15%                   | < 100ms    |
| MLP (Código)   | ~90%     | ~10%                   | 100-500ms  |
| CodeBERT       | ~95%     | ~5%                    | 1-5s       |
| MLP (Notícias) | ~85%     | ~15%                   | 100-500ms  |
| DistilBERT     | ~92%     | ~8%                    | 1-5s       |
| LLM Local      | ~97%     | ~3%                    | 2-10s      |

#### Ajuste de Threshold

Ajuste thresholds em `.npm-verify.json`:

```json
{
  "ml": {
    "layer2Threshold": 0.7,
    "layer3Threshold": 0.8,
    "newsLayer2Threshold": 0.45,
    "newsLayer3Threshold": 0.8
  }
}
```

**Diretrizes:**

- Thresholds mais baixos = mais sensível, mais falsos positivos
- Thresholds mais altos = menos sensível, mais falsos negativos
- Comece com padrões, ajuste baseado na taxa de falsos positivos

### Atualizando Hashes de Malware

#### Da API OSV

```bash
npm-verify update-hashes
```

Isso:

1. Consulta API OSV por pacotes npm com vulnerabilidades
2. Extrai hashes SHA-256 de relatórios de advisory
3. Mescla com `data/malware-hashes.json` existente
4. Salva banco de dados de hash atualizado

#### Dry Run

```bash
npm-verify update-hashes --dry-run
```

Visualize mudanças sem escrever no arquivo.

#### Concorrência Customizada

```bash
npm-verify update-hashes --concurrency 8
```

Aumente requisições API concorrentes para atualizações mais rápidas.

### Testando Mudanças de Modelo

Após atualizar dados de treino ou regenerar modelos:

```bash
# Regenerar modelos
npm run generate-models

# Execute testes
npm test

# Teste em um projeto real
npm-verify check --deep
```

### Melhores Práticas

1. **Dados de Treino Balanceados**: Certifique-se de distribuição igual de amostras benignas/maliciosas
2. **Teste Após Mudanças**: Sempre execute testes após atualizar modelos
3. **Controle de Versão**: Commit pesos de modelo quando mudarem
4. **Documente Mudanças**: Explique por que dados de treino foram modificados
5. **Monitore Performance**: Acompanhe taxas de falso positivo/negativo em produção

### Solução de Problemas

#### Geração de Modelo Falha

Verifique:

- `data/training-samples.json` é JSON válido
- Amostras de treino estão balanceadas
- Sem erros de sintaxe no conteúdo da amostra

#### Download ONNX Falha

Verifique:

- Conectividade de rede
- Permissões de escrita em `~/.npm-verify/models/`
- Espaço em disco suficiente (~350MB)

#### Alta Taxa de Falso Positivo

Ajuste:

- Aumente `layer2Threshold` e `layer3Threshold`
- Adicione mais amostras benignas aos dados de treino
- Revise e melhore regras heurísticas

#### Alta Taxa de Falso Negativo

Ajuste:

- Diminua `layer2Threshold` e `layer3Threshold`
- Adicione mais amostras maliciosas aos dados de treino
- Habilite modelos ONNX para melhor precisão
