# Contributing Guide

Thank you for considering contributing to **npm-verify-guard**. This document describes the requirements and expected workflow for participating in the project.

---

## English

### Requirements

Before you begin, you need to have installed:

| Tool                           | Minimum Version          |
| ------------------------------ | ------------------------ |
| [Node.js](https://nodejs.org/) | 18.x                     |
| [npm](https://www.npmjs.com/)  | 9.x (included with Node) |
| [Git](https://git-scm.com/)    | 2.x                      |

Useful knowledge (not required):

- JavaScript ESM (`import` / `export`)
- Node.js CLI and npm lifecycle hooks (`postinstall`, `prestart`, etc.)
- Basic npm supply chain security concepts

### Environment Setup

```bash
git clone <url-of-your-fork>
cd npm-verification-packages
npm install
npm link   # optional: test the CLI globally
```

Verify everything works:

```bash
npm test
npm run lint
npm run format:check
node bin/npm-verify.js help
```

### Project Scripts

| Command                   | Description                                 |
| ------------------------- | ------------------------------------------- |
| `npm test`                | Run test suite (`node:test`)                |
| `npm run lint`            | Check ESLint                                |
| `npm run lint:fix`        | Fix automatic ESLint issues                 |
| `npm run format`          | Format code with Prettier                   |
| `npm run format:check`    | Validate formatting without modifying files |
| `npm run generate-models` | Regenerate ML weights in `data/models/`     |

**Before opening a PR**, all these commands must pass:

```bash
npm run lint
npm run format:check
npm test
```

### Git Hooks (Husky)

| Hook         | Action         |
| ------------ | -------------- |
| `pre-commit` | `npm run lint` |
| `pre-push`   | `npm test`     |

The `prepare` script configures Husky after `npm install`. If the local `.npmrc` has `ignore-scripts=true`, run `npx husky` manually after cloning.

### Code Principles

1. **Minimal dependencies** — prefer native Node modules (`fs`, `crypto`, `fetch`, `child_process`). New runtime dependencies require clear justification in the PR.
2. **ESM only** — use `"type": "module"` and `import`; do not add CommonJS (`require`).
3. **No over-engineering** — small, focused changes; avoid unnecessary abstractions.
4. **`postinstall` performance** — the `--blocking` path must remain fast (Layers 1 + 2). Layer 3 (`--deep`) is for daemon/scheduler only.
5. **Mandatory fallback** — features that depend on ONNX must degrade to pure JS ML when ONNX is unavailable.

### Repository Structure

```
bin/npm-verify.js       # CLI entrypoint
lib/                    # Core logic
lib/ml/                 # tokenizer, TF-IDF, Naive Bayes, MLP, triage, ONNX
data/                   # feeds, hashes, bundled JSON models
test/                   # tests and fixtures
scripts/                # utilities (e.g., generate-models.mjs)
```

### What You Can Contribute

| Area                             | Where to change                                                                              |
| -------------------------------- | -------------------------------------------------------------------------------------------- |
| Regex heuristics (Layer 1)       | `lib/scan-local.js`                                                                          |
| Math models (Layer 2/3 fallback) | `lib/ml/`, `data/models/`, `scripts/generate-models.mjs`                                     |
| ONNX classification (Layer 3)    | `lib/ml/onnx-provider.js`, `lib/ml/model-loader.js`                                          |
| External feeds and APIs          | `data/default-feeds.json`, `lib/scan-external.js`                                            |
| Known malware hashes             | `data/malware-hashes.json`, `data/malware-sources.json`, `scripts/update-malware-hashes.mjs` |
| Hooks and blocking               | `lib/hooks.js`, `lib/lock.js`, `lib/cli.js`                                                  |
| Scheduling (Windows/cron)        | `lib/scheduler.js`, `lib/daemon.js`                                                          |
| Documentation                    | `README.md`, this file                                                                       |

### ML Model Changes

If you modify training samples or vocabulary:

```bash
npm run generate-models
npm test
```

Include in the PR an explanation of the impact on false positives/negatives. Do not commit `.onnx` files — they are downloaded by the user via `npm-verify models download`.

### New Tests

- Use native `node:test` (no Jest/Mocha).
- Place fixtures in `test/fixtures/`.
- ML tests in `test/ml/`.
- Network mocking: inject `fetchFn` parameter in functions that accept it.

Minimal example:

```javascript
import test from 'node:test';
import assert from 'node:assert/strict';

test('describes expected behavior', () => {
  assert.equal(1 + 1, 2);
});
```

### Style and Formatting

- **ESLint**: flat config in `eslint.config.js`
- **Prettier**: config in `.prettierrc` (single quotes, trailing comma, printWidth 100)

Format before committing:

```bash
npm run format
```

### Contribution Workflow

1. **Fork** the repository and create a branch from `main`:
   ```bash
   git checkout -b feat/my-contribution
   ```
2. **Implement** the change with tests when applicable.
3. **Validate** lint, format, and tests (see section above).
4. **Commit** with clear messages in Portuguese or English:
   ```
   feat: add heuristic for suspicious dynamic import
   fix: handle empty ml-scores cache on first run
   docs: update scheduler setup for macOS
   ```
5. **Push** to your fork and open a **Pull Request** describing:
   - The problem or motivation
   - What was changed
   - How to test manually
   - Performance or false positive impact (if relevant)

### Pull Request Checklist

- [ ] `npm run lint` passes
- [ ] `npm run format:check` passes
- [ ] `npm test` passes
- [ ] New features have tests
- [ ] README or CONTRIBUTING updated (if needed)
- [ ] No runtime dependency added without justification
- [ ] No secret, `.env`, or sensitive data included

### Reporting Bugs

When opening an issue, include:

- Node version (`node -v`)
- OS (Windows / Linux / macOS)
- Command executed and full output
- Relevant content from `.npm-verify/status.json` or report (no secrets)

### Code of Conduct

Be respectful and constructive. Focus on the problem, not the person. Keep discussions technical and objective.

### License

By contributing, you agree that your changes will be licensed under the project's [MIT License](LICENSE).

---

## Português

### Requisitos

Antes de começar, você precisa ter instalado:

| Ferramenta                     | Versão mínima          |
| ------------------------------ | ---------------------- |
| [Node.js](https://nodejs.org/) | 18.x                   |
| [npm](https://www.npmjs.com/)  | 9.x (incluso com Node) |
| [Git](https://git-scm.com/)    | 2.x                    |

Conhecimentos úteis (não obrigatórios):

- JavaScript ESM (`import` / `export`)
- CLI Node.js e hooks do npm (`postinstall`, `prestart`, etc.)
- Conceitos básicos de segurança em supply chain npm

### Configuração do ambiente

```bash
git clone <url-do-seu-fork>
cd npm-verification-packages
npm install
npm link   # opcional: testar o CLI globalmente
```

Verifique se tudo funciona:

```bash
npm test
npm run lint
npm run format:check
node bin/npm-verify.js help
```

### Scripts do projeto

| Comando                   | Descrição                               |
| ------------------------- | --------------------------------------- |
| `npm test`                | Executa a suíte de testes (`node:test`) |
| `npm run lint`            | Verifica ESLint                         |
| `npm run lint:fix`        | Corrige problemas automáticos do ESLint |
| `npm run format`          | Formata o código com Prettier           |
| `npm run format:check`    | Valida formatação sem alterar arquivos  |
| `npm run generate-models` | Regenera pesos ML em `data/models/`     |

**Antes de abrir um PR**, todos estes comandos devem passar:

```bash
npm run lint
npm run format:check
npm test
```

### Git hooks (Husky)

| Hook         | Ação           |
| ------------ | -------------- |
| `pre-commit` | `npm run lint` |
| `pre-push`   | `npm test`     |

O script `prepare` configura o Husky após `npm install`. Se o `.npmrc` local tiver `ignore-scripts=true`, execute `npx husky` manualmente após clonar.

### Princípios de código

1. **Mínimo de dependências** — prefira módulos nativos do Node (`fs`, `crypto`, `fetch`, `child_process`). Novas dependências runtime exigem justificativa clara no PR.
2. **ESM only** — use `"type": "module"` e `import`; não adicione CommonJS (`require`).
3. **Sem over-engineering** — alterações pequenas e focadas; evite abstrações desnecessárias.
4. **Performance no `postinstall`** — o caminho `--blocking` deve permanecer rápido (Layers 1 + 2). Layer 3 (`--deep`) é para daemon/scheduler.
5. **Fallback obrigatório** — funcionalidades que dependem de ONNX devem degradar para modelos matemáticos em JS quando ONNX não estiver disponível.

### Estrutura do repositório

```
bin/npm-verify.js       # entrypoint CLI
lib/                    # lógica principal
lib/ml/                 # tokenizer, TF-IDF, Naive Bayes, MLP, triage, ONNX
data/                   # feeds, hashes, modelos JSON bundled
test/                   # testes e fixtures
scripts/                # utilitários (ex.: generate-models.mjs)
```

### O que você pode contribuir

| Área                                     | Onde alterar                                                                                 |
| ---------------------------------------- | -------------------------------------------------------------------------------------------- |
| Heurísticas regex (Layer 1)              | `lib/scan-local.js`                                                                          |
| Modelos matemáticos (Layer 2/3 fallback) | `lib/ml/`, `data/models/`, `scripts/generate-models.mjs`                                     |
| Classificação ONNX (Layer 3)             | `lib/ml/onnx-provider.js`, `lib/ml/model-loader.js`                                          |
| Feeds e APIs externas                    | `data/default-feeds.json`, `lib/scan-external.js`                                            |
| Hashes de malware conhecidos             | `data/malware-hashes.json`, `data/malware-sources.json`, `scripts/update-malware-hashes.mjs` |
| Hooks e bloqueio                         | `lib/hooks.js`, `lib/lock.js`, `lib/cli.js`                                                  |
| Agendamento (Windows/cron)               | `lib/scheduler.js`, `lib/daemon.js`                                                          |
| Documentação                             | `README.md`, este arquivo                                                                    |

### Alterações em modelos ML

Se modificar amostras de treino ou vocabulário:

```bash
npm run generate-models
npm test
```

Inclua no PR a explicação do impacto em falsos positivos/negativos. Não commite arquivos `.onnx` — eles são baixados pelo usuário via `npm-verify models download`.

### Novos testes

- Use `node:test` nativo (sem Jest/Mocha).
- Coloque fixtures em `test/fixtures/`.
- Testes ML em `test/ml/`.
- Mock de rede: injete `fetchFn` nas funções que aceitam essa opção.

Exemplo mínimo:

```javascript
import test from 'node:test';
import assert from 'node:assert/strict';

test('descreve o comportamento esperado', () => {
  assert.equal(1 + 1, 2);
});
```

### Estilo e formatação

- **ESLint**: config flat em `eslint.config.js`
- **Prettier**: config em `.prettierrc` (single quotes, trailing comma, printWidth 100)

Formate antes de commitar:

```bash
npm run format
```

### Fluxo de contribuição

1. **Fork** o repositório e crie uma branch a partir da `main`:
   ```bash
   git checkout -b feat/minha-contribuicao
   ```
2. **Implemente** a mudança com testes quando aplicável.
3. **Valide** lint, format e testes (ver seção acima).
4. **Commit** com mensagens claras em português ou inglês:
   ```
   feat: add heuristic for suspicious dynamic import
   fix: handle empty ml-scores cache on first run
   docs: update scheduler setup for macOS
   ```
5. **Push** para o seu fork e abra um **Pull Request** descrevendo:
   - O problema ou motivação
   - O que foi alterado
   - Como testar manualmente
   - Impacto em performance ou falsos positivos (se relevante)

### Checklist do Pull Request

- [ ] `npm run lint` passa
- [ ] `npm run format:check` passa
- [ ] `npm test` passa
- [ ] Novas funcionalidades têm testes
- [ ] README ou CONTRIBUTING atualizado (se necessário)
- [ ] Nenhuma dependência runtime adicionada sem justificativa
- [ ] Nenhum secret, `.env` ou dado sensível incluído

### Reportar bugs

Ao abrir uma issue, inclua:

- Versão do Node (`node -v`)
- SO (Windows / Linux / macOS)
- Comando executado e saída completa
- Conteúdo relevante de `.npm-verify/status.json` ou relatório (sem secrets)

### Código de conduta

Seja respeitoso e construtivo. Foque no problema, não na pessoa. Mantenha discussões técnicas e objetivas.

### Licença

Ao contribuir, você concorda que suas alterações serão licenciadas sob a [MIT License](LICENSE) do projeto.
