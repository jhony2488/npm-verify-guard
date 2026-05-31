# Guia de contribuição

Obrigado por considerar contribuir com o **npm-verify-guard**. Este documento descreve os requisitos e o fluxo esperado para participar do projeto.

## Requisitos

Antes de começar, você precisa ter instalado:

| Ferramenta | Versão mínima |
|------------|---------------|
| [Node.js](https://nodejs.org/) | 18.x |
| [npm](https://www.npmjs.com/) | 9.x (incluso com Node) |
| [Git](https://git-scm.com/) | 2.x |

Conhecimentos úteis (não obrigatórios):

- JavaScript ESM (`import` / `export`)
- CLI Node.js e hooks do npm (`postinstall`, `prestart`, etc.)
- Conceitos básicos de segurança em supply chain npm

## Configuração do ambiente

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

## Scripts do projeto

| Comando | Descrição |
|---------|-----------|
| `npm test` | Executa a suíte de testes (`node:test`) |
| `npm run lint` | Verifica ESLint |
| `npm run lint:fix` | Corrige problemas automáticos do ESLint |
| `npm run format` | Formata o código com Prettier |
| `npm run format:check` | Valida formatação sem alterar arquivos |
| `npm run generate-models` | Regenera pesos ML em `data/models/` |

**Antes de abrir um PR**, todos estes comandos devem passar:

```bash
npm run lint
npm run format:check
npm test
```

### Git hooks (Husky)

| Hook | Ação |
|------|------|
| `pre-commit` | `npm run lint` |
| `pre-push` | `npm test` |

O script `prepare` configura o Husky após `npm install`. Se o `.npmrc` local tiver `ignore-scripts=true`, execute `npx husky` manualmente após clonar.

## Princípios de código

1. **Mínimo de dependências** — prefira módulos nativos do Node (`fs`, `crypto`, `fetch`, `child_process`). Novas dependências runtime exigem justificativa clara no PR.
2. **ESM only** — use `"type": "module"` e `import`; não adicione CommonJS (`require`).
3. **Sem over-engineering** — alterações pequenas e focadas; evite abstrações desnecessárias.
4. **Performance no `postinstall`** — o caminho `--blocking` deve permanecer rápido (Layers 1 + 2). Layer 3 (`--deep`) é para daemon/scheduler.
5. **Fallback obrigatório** — funcionalidades que dependem de ONNX devem degradar para modelos matemáticos em JS quando ONNX não estiver disponível.

## Estrutura do repositório

```
bin/npm-verify.js       # entrypoint CLI
lib/                    # lógica principal
lib/ml/                 # tokenizer, TF-IDF, Naive Bayes, MLP, triage, ONNX
data/                   # feeds, hashes, modelos JSON bundled
test/                   # testes e fixtures
scripts/                # utilitários (ex.: generate-models.mjs)
```

## O que você pode contribuir

| Área | Onde alterar |
|------|--------------|
| Heurísticas regex (Layer 1) | `lib/scan-local.js` |
| Modelos matemáticos (Layer 2/3 fallback) | `lib/ml/`, `data/models/`, `scripts/generate-models.mjs` |
| Classificação ONNX (Layer 3) | `lib/ml/onnx-provider.js`, `lib/ml/model-loader.js` |
| Feeds e APIs externas | `data/default-feeds.json`, `lib/scan-external.js` |
| Hooks e bloqueio | `lib/hooks.js`, `lib/lock.js`, `lib/cli.js` |
| Agendamento (Windows/cron) | `lib/scheduler.js`, `lib/daemon.js` |
| Documentação | `README.md`, este arquivo |

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

## Estilo e formatação

- **ESLint**: config flat em `eslint.config.js`
- **Prettier**: config em `.prettierrc` (single quotes, trailing comma, printWidth 100)

Formate antes de commitar:

```bash
npm run format
```

## Fluxo de contribuição

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

## Checklist do Pull Request

- [ ] `npm run lint` passa
- [ ] `npm run format:check` passa
- [ ] `npm test` passa
- [ ] Novas funcionalidades têm testes
- [ ] README ou CONTRIBUTING atualizado (se necessário)
- [ ] Nenhuma dependência runtime adicionada sem justificativa
- [ ] Nenhum secret, `.env` ou dado sensível incluído

## Reportar bugs

Ao abrir uma issue, inclua:

- Versão do Node (`node -v`)
- SO (Windows / Linux / macOS)
- Comando executado e saída completa
- Conteúdo relevante de `.npm-verify/status.json` ou relatório (sem secrets)

## Código de conduta

Seja respeitoso e construtivo. Foque no problema, não na pessoa. Mantenha discussões técnicas e objetivas.

## Licença

Ao contribuir, você concorda que suas alterações serão licenciadas sob a [MIT License](LICENSE) do projeto.
