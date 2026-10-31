# Contributing Guide

How to contribute to npm-verify-guard.

---

## English

### Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/npm-verify-guard.git
   cd npm-verify-guard
   ```
3. **Install dependencies:**
   ```bash
   npm install
   ```
4. **Link globally:**
   ```bash
   npm link
   ```

See [Developer Setup Guide](setup.md) for detailed instructions.

### Contribution Areas

We welcome contributions in the following areas:

#### Heuristics (Layer 1)

Add new heuristic rules to detect suspicious patterns in `lib/scan-local.js`:

- File: `lib/scan-local.js`
- Add to `HEURISTIC_RULES` array
- Write tests in `test/scan-local.test.js`
- Document in `docs/api/scan-local.md`

#### ML Models (Layers 2/3)

Improve ML models by:

- Adding training samples to `data/training-samples.json`
- Regenerating models with `npm run generate-models`
- Tuning thresholds in configuration
- Testing accuracy improvements

See [ML Models Guide](ml-models.md) for details.

#### External Feeds

Add or update security news feeds:

- File: `data/default-feeds.json`
- Test with `npm-verify check --external-only`
- Document changes

#### Malware Hashes

Update malware hash database:

- Run `npm-verify update-hashes`
- Test with `npm-verify check --local-only`
- Commit updated `data/malware-hashes.json`

#### Hooks and Scheduler

Improve npm lifecycle hooks or OS scheduler integration:

- Files: `lib/hooks.js`, `lib/scheduler.js`, `lib/daemon.js`
- Write tests for new functionality
- Test on multiple platforms (Windows, Linux, macOS)

#### Documentation

Improve documentation:

- Update `README.md` for user-facing changes
- Update `docs/` for API changes
- Update `AGENTS.md` and `CLAUDE.md` for AI agents
- Add examples and use cases

### Pull Request Process

#### 1. Create a Branch

```bash
git checkout -b feat/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

Use conventional commit prefixes:

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `refactor:` Code refactoring
- `test:` Test changes
- `chore:` Maintenance tasks

#### 2. Make Changes

- Follow existing code patterns
- Add tests for new functionality
- Update relevant documentation
- Run lint and format

#### 3. Test Your Changes

```bash
# Run tests
npm test

# Run lint
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Check formatting
npm run format:check
```

#### 4. Commit Changes

```bash
git add .
git commit -m "feat: add heuristic for suspicious dynamic import"
```

Commit message format:

```
type: brief description

Optional detailed explanation

Co-Authored-By: Devin <158243242+devin-ai-integration[bot]@users.noreply.github.com>
```

#### 5. Push and Create PR

```bash
git push origin feat/your-feature-name
```

Create a Pull Request on GitHub with:

- Clear title
- Description of changes
- Testing instructions
- Related issues (if any)

### Code Standards

#### ESM Only

Use `import`/`export`, never `require` or CommonJS:

```javascript
// Good
import { readFile } from 'node:fs/promises';

// Bad
const fs = require('fs');
```

#### Minimal Dependencies

Prefer Node.js native modules:

- `fs`, `crypto`, `fetch`, `child_process`, `path`, `os`, etc.

New runtime dependencies require justification in the PR.

#### Performance

- Keep `--blocking` path fast (Layers 1 + 2 only)
- Layer 3 (`--deep`) is for daemon/scheduler only
- ONNX features must fallback to pure JS ML

#### Code Style

- ESLint config in `eslint.config.js`
- Prettier config in `.prettierrc`
- Single quotes, no semicolons, 100 char line width

#### Testing

- Use native `node:test` (no Jest/Mocha)
- Place fixtures in `test/fixtures/`
- Mock network calls with `fetchFn` parameter
- Write tests for new functionality

### Before Submitting

Checklist:

- [ ] `npm run lint` passes
- [ ] `npm run format:check` passes
- [ ] `npm test` passes
- [ ] New functionality has tests
- [ ] Documentation updated (README.md, docs/)
- [ ] No new runtime dependencies without justification
- [ ] No secrets, `.env`, or sensitive data included
- [ ] Commit messages follow conventional format

### Review Process

1. **Automated Checks**: CI runs tests and lint
2. **Code Review**: Maintainers review your changes
3. **Feedback**: Address review comments
4. **Approval**: Once approved, your PR will be merged

### Getting Help

- **Issues**: Open a GitHub issue for bugs or feature requests
- **Discussions**: Use GitHub Discussions for questions
- **Documentation**: Check `docs/` directory for guides

### Reporting Bugs

When reporting a bug, include:

- Node.js version (`node -v`)
- OS (Windows / Linux / macOS)
- Command executed and full output
- Relevant configuration (`.npm-verify.json`)
- Report content (`.npm-verify/report.json`)

### Feature Requests

When requesting a feature:

- Describe the problem you're trying to solve
- Explain why this feature would help
- Provide use cases and examples
- Consider if you can contribute the implementation

### License

By contributing, you agree that your changes will be licensed under the [MIT License](LICENSE) of the project.

---

## Português

### Começando

1. **Fork o repositório** no GitHub
2. **Clone seu fork:**
   ```bash
   git clone https://github.com/SEU_USUARIO/npm-verify-guard.git
   cd npm-verify-guard
   ```
3. **Instale dependências:**
   ```bash
   npm install
   ```
4. **Link globalmente:**
   ```bash
   npm link
   ```

Veja [Guia de Configuração de Desenvolvedor](setup.md) para instruções detalhadas.

### Áreas de Contribuição

Aceitamos contribuições nas seguintes áreas:

#### Heurísticas (Camada 1)

Adicione novas regras heurísticas para detectar padrões suspeitos em `lib/scan-local.js`:

- Arquivo: `lib/scan-local.js`
- Adicione ao array `HEURISTIC_RULES`
- Escreva testes em `test/scan-local.test.js`
- Documente em `docs/api/scan-local.md`

#### Modelos ML (Camadas 2/3)

Melhore modelos ML:

- Adicionando amostras de treino a `data/training-samples.json`
- Regenerando modelos com `npm run generate-models`
- Ajustando thresholds na configuração
- Testando melhorias de precisão

Veja [Guia de Modelos ML](ml-models.md) para detalhes.

#### Feeds Externos

Adicione ou atualize feeds de notícias de segurança:

- Arquivo: `data/default-feeds.json`
- Teste com `npm-verify check --external-only`
- Documente mudanças

#### Hashes de Malware

Atualize banco de dados de hash de malware:

- Execute `npm-verify update-hashes`
- Teste com `npm-verify check --local-only`
- Commit de `data/malware-hashes.json` atualizado

#### Hooks e Scheduler

Melhore hooks de ciclo de vida npm ou integração de scheduler do SO:

- Arquivos: `lib/hooks.js`, `lib/scheduler.js`, `lib/daemon.js`
- Escreva testes para nova funcionalidade
- Teste em múltiplas plataformas (Windows, Linux, macOS)

#### Documentação

Melhore documentação:

- Atualize `README.md` para mudanças voltadas ao usuário
- Atualize `docs/` para mudanças de API
- Atualize `AGENTS.md` e `CLAUDE.md` para agentes AI
- Adicione exemplos e casos de uso

### Processo de Pull Request

#### 1. Crie uma Branch

```bash
git checkout -b feat/seu-nome-de-feature
# ou
git checkout -b fix/sua-correcao-de-bug
```

Use prefixos de commit convencionais:

- `feat:` Nova funcionalidade
- `fix:` Correção de bug
- `docs:` Mudanças de documentação
- `refactor:` Refatoração de código
- `test:` Mudanças de teste
- `chore:` Tarefas de manutenção

#### 2. Faça Mudanças

- Siga padrões de código existentes
- Adicione testes para nova funcionalidade
- Atualize documentação relevante
- Execute lint e formatação

#### 3. Teste Suas Mudanças

```bash
# Execute testes
npm test

# Execute lint
npm run lint

# Corrija problemas de lint
npm run lint:fix

# Formate código
npm run format

# Verifique formatação
npm run format:check
```

#### 4. Commit de Mudanças

```bash
git add .
git commit -m "feat: add heuristic for suspicious dynamic import"
```

Formato de mensagem de commit:

```
tipo: descrição breve

Explicação detalhada opcional

Co-Authored-By: Devin <158243242+devin-ai-integration[bot]@users.noreply.github.com>
```

#### 5. Push e Crie PR

```bash
git push origin feat/seu-nome-de-feature
```

Crie um Pull Request no GitHub com:

- Título claro
- Descrição das mudanças
- Instruções de teste
- Issues relacionadas (se houver)

### Padrões de Código

#### Apenas ESM

Use `import`/`export`, nunca `require` ou CommonJS:

```javascript
# Bom
import { readFile } from 'node:fs/promises';

# Ruim
const fs = require('fs');
```

#### Dependências Mínimas

Prefira módulos nativos do Node:

- `fs`, `crypto`, `fetch`, `child_process`, `path`, `os`, etc.

Novas dependências runtime requerem justificativa no PR.

#### Performance

- Mantenha caminho `--blocking` rápido (apenas Camadas 1 + 2)
- Camada 3 (`--deep`) é para daemon/scheduler apenas
- Recursos ONNX devem ter fallback para ML JS puro

#### Estilo de Código

- Config ESLint em `eslint.config.js`
- Config Prettier em `.prettierrc`
- Aspas simples, sem ponto e vírgula, 100 caracteres de largura de linha

#### Testes

- Use `node:test` nativo (sem Jest/Mocha)
- Coloque fixtures em `test/fixtures/`
- Mock de chamadas de rede com parâmetro `fetchFn`
- Escreva testes para nova funcionalidade

### Antes de Submeter

Checklist:

- [ ] `npm run lint` passa
- [ ] `npm run format:check` passa
- [ ] `npm test` passa
- [ ] Nova funcionalidade tem testes
- [ ] Documentação atualizada (README.md, docs/)
- [ ] Sem novas dependências runtime sem justificativa
- [ ] Sem secrets, `.env` ou dados sensíveis incluídos
- [ ] Mensagens de commit seguem formato convencional

### Processo de Review

1. **Verificações Automáticas**: CI executa testes e lint
2. **Review de Código**: Mantenedores revisam suas mudanças
3. **Feedback**: Enderece comentários de review
4. **Aprovação**: Uma vez aprovado, seu PR será mergeado

### Obtendo Ajuda

- **Issues**: Abra uma issue no GitHub para bugs ou solicitações de feature
- **Discussions**: Use GitHub Discussions para perguntas
- **Documentação**: Verifique diretório `docs/` para guias

### Reportando Bugs

Ao reportar um bug, inclua:

- Versão do Node.js (`node -v`)
- SO (Windows / Linux / macOS)
- Comando executado e saída completa
- Configuração relevante (`.npm-verify.json`)
- Conteúdo do relatório (`.npm-verify/report.json`)

### Solicitações de Feature

Ao solicitar uma feature:

- Descreva o problema que você está tentando resolver
- Explique por que esta feature ajudaria
- Forneça casos de uso e exemplos
- Considere se você pode contribuir com a implementação

### Licença

Ao contribuir, você concorda que suas mudanças serão licenciadas sob a [Licença MIT](LICENSE) do projeto.
