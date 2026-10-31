# Developer Setup Guide

How to set up a development environment for contributing to npm-verify-guard.

---

## English

### Prerequisites

- **Node.js**: >= 18.0.0
- **npm**: >= 9.0.0
- **Git**: >= 2.x
- **Code editor**: VS Code, WebStorm, or similar

### Fork and Clone

1. **Fork the repository** on GitHub
2. **Clone your fork:**

   ```bash
   git clone https://github.com/YOUR_USERNAME/npm-verify-guard.git
   cd npm-verify-guard
   ```

3. **Add upstream remote:**
   ```bash
   git remote add upstream https://github.com/jhony2488/npm-verify-guard.git
   ```

### Install Dependencies

```bash
npm install
```

This installs:

- Runtime dependencies: `fast-xml-parser`
- Dev dependencies: ESLint, Prettier, Husky
- Optional dependency: `onnxruntime-node` (if ONNX available)

### Link Globally

To test the CLI globally during development:

```bash
npm link
```

Now you can use `npm-verify` commands anywhere.

### Verify Installation

```bash
# Check version
npm-verify --version

# Run help
npm-verify help

# Run tests
npm test

# Run lint
npm run lint

# Check formatting
npm run format:check
```

### Development Workflow

#### 1. Create a Branch

```bash
git checkout -b feat/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

#### 2. Make Changes

Edit files in the appropriate directories:

- `lib/` - Core logic
- `data/` - Data files (models, feeds, hashes)
- `test/` - Tests
- `bin/` - CLI entrypoint

#### 3. Run Tests

```bash
# Run all tests
npm test

# Run specific test file
node --test test/cli-check.test.js
```

#### 4. Lint and Format

```bash
# Lint code
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Format code
npm run format

# Check formatting
npm run format:check
```

#### 5. Commit Changes

```bash
git add .
git commit -m "feat: add heuristic for suspicious pattern"
```

#### 6. Push and Create PR

```bash
git push origin feat/your-feature-name
```

Then create a Pull Request on GitHub.

### Project Structure

```
npm-verify-guard/
├── bin/
│   └── npm-verify.js       # CLI entrypoint
├── lib/
│   ├── cli.js              # Command parsing and routing
│   ├── config.js           # Configuration management
│   ├── scan-local.js       # Local scanning (Layer 1 + ML)
│   ├── scan-external.js    # External scanning (OSV + RSS)
│   ├── hooks.js            # npm lifecycle hooks
│   ├── lock.js             # Status file management
│   ├── report.js           # Report generation
│   ├── scheduler.js        # OS scheduler integration
│   ├── daemon.js           # Background daemon
│   ├── watch.js            # Watched projects
│   └── ml/                 # ML modules
│       ├── tokenizer.js
│       ├── tfidf.js
│       ├── naive-bayes.js
│       ├── mlp.js
│       ├── triage-code.js
│       ├── triage-news.js
│       ├── onnx-provider.js
│       └── model-loader.js
├── data/
│   ├── default-feeds.json  # RSS feeds and OSV API
│   ├── malware-hashes.json # Known malware hashes
│   ├── malware-sources.json # Hash source metadata
│   ├── training-samples.json # ML training data
│   └── models/             # Generated ML model weights
├── test/
│   ├── fixtures/           # Test fixtures
│   ├── helpers/            # Test utilities
│   ├── ml/                 # ML-specific tests
│   └── *.test.js           # Test files
├── scripts/
│   ├── generate-models.mjs # ML model generation
│   └── update-malware-hashes.mjs # Hash sync
├── .husky/                 # Git hooks
├── AGENTS.md               # AI agent instructions
├── CLAUDE.md               # Claude Code instructions
├── README.md               # User documentation
├── CONTRIBUTING.md         # Contribution guidelines
└── package.json
```

### Development Tools

#### ESLint

Configuration: `eslint.config.js`

Rules:

- Flat config format
- No unused variables (prefix with `_` to ignore)
- No console warnings (console allowed for CLI)
- Prettier integration

Run:

```bash
npm run lint
npm run lint:fix
```

#### Prettier

Configuration: `.prettierrc`

Settings:

- Single quotes
- Trailing commas
- 100 character line width
- No semicolons

Run:

```bash
npm run format
npm run format:check
```

#### Husky

Git hooks:

- `pre-commit`: Runs `npm run lint`
- `pre-push`: Runs `npm test`

Configuration: `.husky/`

### Testing

Test framework: Native `node:test` (no Jest/Mocha)

Run tests:

```bash
npm test
```

Test structure:

- `test/` - All test files
- `test/fixtures/` - Test data
- `test/helpers/` - Test utilities
- `test/ml/` - ML-specific tests

See [Testing Guide](testing.md) for details.

### Debugging

#### CLI Debugging

```bash
# Run with Node debugger
node --inspect bin/npm-verify.js check

# Or use ndb
npx ndb bin/npm-verify.js check
```

#### Unit Test Debugging

```bash
# Run specific test with inspection
node --inspect --test test/cli-check.test.js
```

#### Logging

Add console.log statements for debugging (console is allowed).

### Environment Variables

No required environment variables for development.

Optional:

- `NODE_ENV=development` - Development mode (not currently used)

### Common Development Tasks

#### Add a New Heuristic Rule

1. Edit `lib/scan-local.js`
2. Add rule to `HEURISTIC_RULES` array
3. Write test in `test/scan-local.test.js`
4. Run tests and lint

#### Update ML Training Data

1. Edit `data/training-samples.json`
2. Run `npm run generate-models`
3. Run tests to verify
4. Commit both files

#### Add a New CLI Command

1. Edit `lib/cli.js` - add command handler
2. Update help text in `printHelp()`
3. Write test in `test/cli-*.test.js`
4. Update documentation

#### Update RSS Feeds

1. Edit `data/default-feeds.json`
2. Test with `npm-verify check --external-only`
3. Commit changes

### Keeping Up to Date

```bash
# Fetch upstream changes
git fetch upstream

# Merge into your branch
git merge upstream/main

# Resolve conflicts if any
# Test changes
npm test
npm run lint
```

---

## Português

### Pré-requisitos

- **Node.js**: >= 18.0.0
- **npm**: >= 9.0.0
- **Git**: >= 2.x
- **Editor de código**: VS Code, WebStorm ou similar

### Fork e Clone

1. **Fork o repositório** no GitHub
2. **Clone seu fork:**

   ```bash
   git clone https://github.com/SEU_USUARIO/npm-verify-guard.git
   cd npm-verify-guard
   ```

3. **Adicione remote upstream:**
   ```bash
   git remote add upstream https://github.com/jhony2488/npm-verify-guard.git
   ```

### Instale Dependências

```bash
npm install
```

Isso instala:

- Dependências runtime: `fast-xml-parser`
- Dependências dev: ESLint, Prettier, Husky
- Dependência opcional: `onnxruntime-node` (se ONNX disponível)

### Link Globalmente

Para testar a CLI globalmente durante desenvolvimento:

```bash
npm link
```

Agora você pode usar comandos `npm-verify` em qualquer lugar.

### Verifique Instalação

```bash
# Verifique versão
npm-verify --version

# Execute help
npm-verify help

# Execute testes
npm test

# Execute lint
npm run lint

# Verifique formatação
npm run format:check
```

### Fluxo de Trabalho de Desenvolvimento

#### 1. Crie uma Branch

```bash
git checkout -b feat/seu-nome-de-feature
# ou
git checkout -b fix/sua-correcao-de-bug
```

#### 2. Faça Mudanças

Edite arquivos nos diretórios apropriados:

- `lib/` - Lógica principal
- `data/` - Arquivos de dados (modelos, feeds, hashes)
- `test/` - Testes
- `bin/` - Entrypoint CLI

#### 3. Execute Testes

```bash
# Execute todos os testes
npm test

# Execute arquivo de teste específico
node --test test/cli-check.test.js
```

#### 4. Lint e Formatação

```bash
# Lint do código
npm run lint

# Corrija problemas de lint automaticamente
npm run lint:fix

# Formate código
npm run format

# Verifique formatação
npm run format:check
```

#### 5. Commit de Mudanças

```bash
git add .
git commit -m "feat: add heuristic for suspicious pattern"
```

#### 6. Push e Crie PR

```bash
git push origin feat/seu-nome-de-feature
```

Então crie um Pull Request no GitHub.

### Estrutura do Projeto

```
npm-verify-guard/
├── bin/
│   └── npm-verify.js       # Entrypoint CLI
├── lib/
│   ├── cli.js              # Parse de comandos e roteamento
│   ├── config.js           # Gerenciamento de configuração
│   ├── scan-local.js       # Varredura local (Camada 1 + ML)
│   ├── scan-external.js    # Varredura externa (OSV + RSS)
│   ├── hooks.js            # Hooks de ciclo de vida npm
│   ├── lock.js             # Gerenciamento de arquivo de status
│   ├── report.js           # Geração de relatório
│   ├── scheduler.js        # Integração com scheduler do SO
│   ├── daemon.js           # Daemon em background
│   ├── watch.js            # Projetos monitorados
│   └── ml/                 # Módulos ML
│       ├── tokenizer.js
│       ├── tfidf.js
│       ├── naive-bayes.js
│       ├── mlp.js
│       ├── triage-code.js
│       ├── triage-news.js
│       ├── onnx-provider.js
│       └── model-loader.js
├── data/
│   ├── default-feeds.json  # Feeds RSS e API OSV
│   ├── malware-hashes.json # Hashes de malware conhecido
│   ├── malware-sources.json # Metadados de fonte de hash
│   ├── training-samples.json # Dados de treino ML
│   └── models/             # Pesos de modelo ML gerados
├── test/
│   ├── fixtures/           # Fixtures de teste
│   ├── helpers/            # Utilitários de teste
│   ├── ml/                 # Testes específicos de ML
│   └── *.test.js           # Arquivos de teste
├── scripts/
│   ├── generate-models.mjs # Geração de modelo ML
│   └── update-malware-hashes.mjs # Sincronização de hash
├── .husky/                 # Git hooks
├── AGENTS.md               # Instruções de agente AI
├── CLAUDE.md               # Instruções Claude Code
├── README.md               # Documentação de usuário
├── CONTRIBUTING.md         # Diretrizes de contribuição
└── package.json
```

### Ferramentas de Desenvolvimento

#### ESLint

Configuração: `eslint.config.js`

Regras:

- Config flat
- Sem vars não usadas (prefixe com `_` para ignorar)
- Sem avisos de console (console permitido para CLI)
- Integração Prettier

Execute:

```bash
npm run lint
npm run lint:fix
```

#### Prettier

Configuração: `.prettierrc`

Configurações:

- Aspas simples
- Vírgulas finais
- 100 caracteres de largura de linha
- Sem ponto e vírgula

Execute:

```bash
npm run format
npm run format:check
```

#### Husky

Git hooks:

- `pre-commit`: Executa `npm run lint`
- `pre-push`: Executa `npm test`

Configuração: `.husky/`

### Testes

Framework de teste: `node:test` nativo (sem Jest/Mocha)

Execute testes:

```bash
npm test
```

Estrutura de teste:

- `test/` - Todos os arquivos de teste
- `test/fixtures/` - Dados de teste
- `test/helpers/` - Utilitários de teste
- `test/ml/` - Testes específicos de ML

Veja [Guia de Testes](testing.md) para detalhes.

### Debugging

#### Debugging de CLI

```bash
# Execute com debugger Node
node --inspect bin/npm-verify.js check

# Ou use ndb
npx ndb bin/npm-verify.js check
```

#### Debugging de Teste Unitário

```bash
# Execute teste específico com inspeção
node --inspect --test test/cli-check.test.js
```

#### Logging

Adicione declarações console.log para debugging (console é permitido).

### Variáveis de Ambiente

Sem variáveis de ambiente requeridas para desenvolvimento.

Opcional:

- `NODE_ENV=development` - Modo de desenvolvimento (não usado atualmente)

### Tarefas Comuns de Desenvolvimento

#### Adicionar Nova Regra Heurística

1. Edite `lib/scan-local.js`
2. Adicione regra ao array `HEURISTIC_RULES`
3. Escreva teste em `test/scan-local.test.js`
4. Execute testes e lint

#### Atualizar Dados de Treino ML

1. Edite `data/training-samples.json`
2. Execute `npm run generate-models`
3. Execute testes para verificar
4. Commit ambos os arquivos

#### Adicionar Novo Comando CLI

1. Edite `lib/cli.js` - adicione handler de comando
2. Atualize texto de help em `printHelp()`
3. Escreva teste em `test/cli-*.test.js`
4. Atualize documentação

#### Atualizar Feeds RSS

1. Edite `data/default-feeds.json`
2. Teste com `npm-verify check --external-only`
3. Commit mudanças

### Mantendo Atualizado

```bash
# Busque mudanças upstream
git fetch upstream

# Mergue na sua branch
git merge upstream/main

# Resolva conflitos se houver
# Teste mudanças
npm test
npm run lint
```
