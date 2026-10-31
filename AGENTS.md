# AGENTS.md

Instructions for AI coding agents working on npm-verify-guard.

---

## English

### Project Overview

npm-verify-guard is a global CLI tool that verifies npm dependencies for known vulnerabilities, supply-chain news, and suspicious code patterns in `node_modules`. It uses a 3-layer ML triage system:

- **Layer 1**: Regex + SHA-256 blacklist (every scan)
- **Layer 2**: TF-IDF + Naive Bayes (code) / MLP (news) (every scan)
- **Layer 3**: ONNX (CodeBERT / DistilBERT) or MLP fallback (deep scan)

### Build and Test Commands

```bash
# Install dependencies
npm install

# Run tests
npm test

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Check formatting
npm run format:check

# Generate ML models
npm run generate-models

# Update malware hashes
npm run update-malware-hashes
```

### Code Conventions

- **ESM only**: Use `import`/`export`, never `require` or CommonJS
- **Type**: `"type": "module"` in package.json
- **Dependencies**: Minimal runtime dependencies - prefer Node.js native modules (`fs`, `crypto`, `fetch`, `child_process`)
- **Performance**: The `--blocking` path (Layers 1 + 2) must remain fast for postinstall hooks. Layer 3 (`--deep`) is for daemon/scheduler only
- **Fallback**: All ONNX-dependent features must degrade to pure JavaScript ML when ONNX is unavailable
- **ESLint**: Flat config in `eslint.config.js` with no unused vars (ignore `_` prefix)
- **Prettier**: Single quotes, trailing commas, 100 char line width (`.prettierrc`)

### Project Structure

```
bin/npm-verify.js       # CLI entrypoint
lib/                    # Core logic
  cli.js               # Command parser and routing
  config.js            # Configuration loading
  scan-local.js        # Local node_modules scanning (Layer 1 + ML)
  scan-external.js     # OSV API + RSS feeds (Layer 2 + ML)
  hooks.js             # npm lifecycle hooks management
  lock.js              # Status file management
  report.js            # Report generation
  scheduler.js         # OS scheduler (Task Scheduler / cron)
  daemon.js            # Background Node daemon
  watch.js             # Watched projects management
  ml/                  # ML triage modules
    tokenizer.js       # Tokenization
    tfidf.js           # TF-IDF vectorization
    naive-bayes.js     # Naive Bayes classifier
    mlp.js             # Multi-layer perceptron
    triage-code.js     # Code content triage
    triage-news.js     # News item triage
    onnx-provider.js   # ONNX runtime integration
    model-loader.js    # Model download/management
data/                   # Bundled data
  default-feeds.json   # RSS feed URLs and OSV API
  malware-hashes.json # Known malware SHA-256 hashes
  malware-sources.json # Hash source metadata
  training-samples.json # ML training samples
  models/              # Generated ML model weights (JSON)
test/                   # Test suite
  fixtures/            # Test fixtures
  helpers/             # Test utilities
  ml/                  # ML-specific tests
scripts/                # Utility scripts
  generate-models.mjs  # ML model generation
  update-malware-hashes.mjs # Hash sync from OSV
```

### Testing Guidelines

- Use `node:test` native module (no Jest/Mocha)
- Place fixtures in `test/fixtures/`
- Mock network calls by injecting `fetchFn` parameter
- Test ML behavior in `test/ml/`
- Always run `npm test` before committing
- Tests should be atomic and independent

### Security Considerations

- **Never commit secrets**: No `.env`, API keys, or sensitive data
- **Hash only**: Store SHA-256 hashes, never file contents for malware detection
- **Degrade gracefully**: External scans must fail non-blocking unless `--blocking` flag is set
- **Minimal attack surface**: Avoid eval, dynamic imports in production code
- **Supply chain focus**: Prioritize detecting supply chain attacks over general malware

### ML Model Guidelines

- **Bundled weights**: Pure JavaScript models (Naive Bayes, MLP) are bundled in `data/models/`
- **ONNX optional**: CodeBERT/DistilBERT models are downloaded on-demand via `npm-verify models download`
- **Training samples**: Edit `data/training-samples.json` and run `npm run generate-models`
- **Fallback required**: If ONNX runtime unavailable, use bundled MLP weights
- **Threshold tuning**: ML thresholds are configurable in `.npm-verify.json` (`ml.layer2Threshold`, `ml.layer3Threshold`)

### Git Hooks (Husky)

- `pre-commit`: Runs `npm run lint`
- `pre-push`: Runs `npm test`

### Important Gotchas

- **Windows scheduler**: Uses `schtasks` command, not cron
- **Linux/macOS scheduler**: Adds cron entry - ensure npm-verify is in PATH
- **postinstall bypass**: `npm install --ignore-scripts` bypasses protection
- **False positives**: Users can suppress via `allowPackages` in config
- **Performance**: Heuristic scanning is fast; ONNX inference is slower and optional

### When Adding Features

1. Check if a similar pattern exists in the codebase
2. Prefer native Node.js modules over new dependencies
3. Add tests in appropriate `test/` subdirectory
4. Update relevant documentation (README.md, docs/)
5. Run `npm run lint`, `npm run format:check`, and `npm test`
6. Ensure fallback behavior for optional dependencies (ONNX)

---

## Português

### Visão Geral do Projeto

npm-verify-guard é uma ferramenta CLI global que verifica dependências npm em busca de vulnerabilidades conhecidas, notícias de supply chain e padrões de código suspeitos em `node_modules`. Usa um sistema de triagem ML de 3 camadas:

- **Camada 1**: Regex + blacklist SHA-256 (toda varredura)
- **Camada 2**: TF-IDF + Naive Bayes (código) / MLP (notícias) (toda varredura)
- **Camada 3**: ONNX (CodeBERT / DistilBERT) ou fallback MLP (varredura profunda)

### Comandos de Build e Teste

```bash
# Instalar dependências
npm install

# Executar testes
npm test

# Lint do código
npm run lint

# Corrigir problemas de lint
npm run lint:fix

# Formatar código
npm run format

# Verificar formatação
npm run format:check

# Gerar modelos ML
npm run generate-models

# Atualizar hashes de malware
npm run update-malware-hashes
```

### Convenções de Código

- **ESM apenas**: Use `import`/`export`, nunca `require` ou CommonJS
- **Tipo**: `"type": "module"` no package.json
- **Dependências**: Dependências runtime mínimas - prefira módulos nativos do Node (`fs`, `crypto`, `fetch`, `child_process`)
- **Performance**: O caminho `--blocking` (Camadas 1 + 2) deve permanecer rápido para hooks postinstall. Camada 3 (`--deep`) é para daemon/scheduler apenas
- **Fallback**: Todos os recursos dependentes de ONNX devem degradar para ML JavaScript puro quando ONNX não estiver disponível
- **ESLint**: Config flat em `eslint.config.js` sem vars não usadas (ignorar prefixo `_`)
- **Prettier**: Aspas simples, vírgulas finais, 100 caracteres de largura de linha (`.prettierrc`)

### Estrutura do Projeto

```
bin/npm-verify.js       # Entrypoint CLI
lib/                    # Lógica principal
  cli.js               # Parser de comandos e roteamento
  config.js            # Carregamento de configuração
  scan-local.js        # Varredura local de node_modules (Camada 1 + ML)
  scan-external.js     # API OSV + feeds RSS (Camada 2 + ML)
  hooks.js             # Gerenciamento de hooks de ciclo de vida npm
  lock.js              # Gerenciamento de arquivo de status
  report.js            # Geração de relatórios
  scheduler.js         # Scheduler do SO (Task Scheduler / cron)
  daemon.js            # Daemon Node em background
  watch.js             # Gerenciamento de projetos monitorados
  ml/                  # Módulos de triagem ML
    tokenizer.js       # Tokenização
    tfidf.js           # Vetorização TF-IDF
    naive-bayes.js     # Classificador Naive Bayes
    mlp.js             # Perceptron multicamadas
    triage-code.js     # Triagem de conteúdo de código
    triage-news.js     # Triagem de itens de notícias
    onnx-provider.js   # Integração ONNX runtime
    model-loader.js    # Download/gerenciamento de modelos
data/                   # Dados bundled
  default-feeds.json   # URLs de feeds RSS e API OSV
  malware-hashes.json # Hashes SHA-256 de malware conhecido
  malware-sources.json # Metadados de fontes de hash
  training-samples.json # Amostras de treino ML
  models/              # Pesos de modelos ML gerados (JSON)
test/                   # Suíte de testes
  fixtures/            # Fixtures de teste
  helpers/             # Utilitários de teste
  ml/                  # Testes específicos de ML
scripts/                # Scripts utilitários
  generate-models.mjs  # Geração de modelos ML
  update-malware-hashes.mjs # Sincronização de hashes do OSV
```

### Diretrizes de Teste

- Use módulo nativo `node:test` (sem Jest/Mocha)
- Coloque fixtures em `test/fixtures/`
- Mock de chamadas de rede injetando parâmetro `fetchFn`
- Teste comportamento ML em `test/ml/`
- Sempre execute `npm test` antes de commitar
- Testes devem ser atômicos e independentes

### Considerações de Segurança

- **Nunca commit secrets**: Sem `.env`, chaves de API ou dados sensíveis
- **Apenas hashes**: Armazene hashes SHA-256, nunca conteúdos de arquivo para detecção de malware
- **Degradação graciosa**: Varreduras externas devem falhar sem bloquear a menos que flag `--blocking` seja definida
- **Superfície de ataque mínima**: Evite eval, imports dinâmicos em código de produção
- **Foco em supply chain**: Priorize detecção de ataques de supply chain sobre malware geral

### Diretrizes de Modelos ML

- **Pesos bundled**: Modelos JavaScript puro (Naive Bayes, MLP) são bundled em `data/models/`
- **ONNX opcional**: Modelos CodeBERT/DistilBERT são baixados sob demanda via `npm-verify models download`
- **Amostras de treino**: Edite `data/training-samples.json` e execute `npm run generate-models`
- **Fallback obrigatório**: Se runtime ONNX indisponível, use pesos MLP bundled
- **Ajuste de threshold**: Thresholds ML são configuráveis em `.npm-verify.json` (`ml.layer2Threshold`, `ml.layer3Threshold`)

### Git Hooks (Husky)

- `pre-commit`: Executa `npm run lint`
- `pre-push`: Executa `npm test`

### Gotchas Importantes

- **Scheduler Windows**: Usa comando `schtasks`, não cron
- **Scheduler Linux/macOS**: Adiciona entrada cron - certifique-se que npm-verify está no PATH
- **Bypass postinstall**: `npm install --ignore-scripts` ignora proteção
- **Falsos positivos**: Usuários podem suprimir via `allowPackages` na config
- **Performance**: Varredura heurística é rápida; inferência ONNX é mais lenta e opcional

### Ao Adicionar Recursos

1. Verifique se padrão similar existe no codebase
2. Prefira módulos nativos do Node sobre novas dependências
3. Adicione testes no subdiretório `test/` apropriado
4. Atualize documentação relevante (README.md, docs/)
5. Execute `npm run lint`, `npm run format:check` e `npm test`
6. Garanta comportamento de fallback para dependências opcionais (ONNX)
