# Testing Guide

How to write and run tests for npm-verify-guard.

---

## English

### Overview

npm-verify-guard uses the native Node.js `node:test` module for testing. No external testing frameworks like Jest or Mocha are used.

### Running Tests

#### Run All Tests

```bash
npm test
```

This runs all test files in the `test/` directory.

#### Run Specific Test File

```bash
node --test test/cli-check.test.js
```

#### Run Tests with Node Inspector

```bash
node --inspect --test test/cli-check.test.js
```

### Test Structure

```
test/
├── fixtures/           # Test data and mock files
├── helpers/            # Test utility functions
├── ml/                 # ML-specific tests
├── bin-entry.test.js   # CLI entrypoint tests
├── cli-check.test.js   # Check command tests
├── cli-gate.test.js    # Gate command tests
├── cli-init.test.js    # Init command tests
├── config.test.js      # Configuration tests
├── scan-local.test.js  # Local scan tests
├── scan-external.test.js # External scan tests
└── ...
```

### Writing Tests

#### Basic Test Structure

```javascript
import test from 'node:test';
import assert from 'node:assert/strict';

test('describes the behavior', () => {
  assert.equal(1 + 1, 2);
});
```

#### Async Tests

```javascript
import test from 'node:test';
import assert from 'node:assert/strict';

test('async operation', async () => {
  const result = await someAsyncFunction();
  assert.equal(result, 'expected');
});
```

#### Test with Fixtures

```javascript
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

test('with fixture', async () => {
  const fixture = await readFile(join('test/fixtures', 'sample-package.json'), 'utf8');
  const parsed = JSON.parse(fixture);
  assert.equal(parsed.name, 'sample-package');
});
```

### Mocking Network Calls

Functions that make network calls accept a `fetchFn` parameter for testing:

```javascript
import test from 'node:test';
import assert from 'node:assert/strict';
import { scanExternal } from '../lib/scan-external.js';

test('external scan with mock fetch', async () => {
  const mockFetch = async (url, options) => {
    if (url.includes('osv')) {
      return { ok: true, json: () => ({ vulns: [] }) };
    }
    return { ok: true, text: () => '<rss>...</rss>' };
  };

  const findings = await scanExternal('/path/to/project', projectConfig, { fetchFn: mockFetch });

  assert.equal(findings.length, 0);
});
```

### Test Helpers

Create reusable test utilities in `test/helpers/`:

```javascript
// test/helpers/mock-config.js
export function createMockConfig(overrides = {}) {
  return {
    allowPackages: [],
    ignorePaths: ['**/test/**'],
    heuristics: { maxFileSizeKb: 512 },
    external: { enabled: true },
    blockOnMedium: false,
    blockOnHigh: true,
    ml: {
      enabled: true,
      layer2Threshold: 0.7,
      layer3Threshold: 0.8,
    },
    ...overrides,
  };
}
```

### ML Testing

ML-specific tests go in `test/ml/`:

```javascript
import test from 'node:test';
import assert from 'node:assert/strict';
import { triageCodeContent } from '../../lib/ml/triage-code.js';

test('ML triage returns findings for suspicious code', async () => {
  const suspiciousCode = 'eval(maliciousCode)';
  const findings = await triageCodeContent(suspiciousCode, [], {
    mlConfig: { enabled: true, layer2Threshold: 0.5 },
  });

  assert.ok(findings.length > 0);
  assert.equal(findings[0].source, 'local');
});
```

### Common Test Patterns

#### Testing CLI Commands

```javascript
import test from 'node:test';
import assert from 'node:assert/strict';
import { runCli } from '../lib/cli.js';

test('cli check command returns exit code 0 for clean scan', async () => {
  const exitCode = await runCli(['check', '--local-only']);
  assert.equal(exitCode, 0);
});
```

#### Testing Configuration Loading

```javascript
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProjectConfig } from '../lib/config.js';

test('loads default config when file missing', async () => {
  const config = await loadProjectConfig('/nonexistent/path');
  assert.ok(config.ml);
  assert.equal(config.ml.enabled, true);
});
```

#### Testing Heuristic Rules

```javascript
import test from 'node:test';
import assert from 'node:assert/strict';
import { HEURISTIC_RULES } from '../lib/scan-local.js';

test('eval heuristic matches eval() calls', () => {
  const rule = HEURISTIC_RULES.find((r) => r.id === 'eval-usage');
  const code = 'eval(someCode)';
  assert.ok(rule.pattern.test(code));
});
```

### Test Organization

1. **One test file per module**: e.g., `config.test.js` for `lib/config.js`
2. **Descriptive test names**: Explain what is being tested
3. **Independent tests**: Each test should run in isolation
4. **Arrange-Act-Assert**: Structure tests clearly

### Best Practices

1. **Use native `node:test`**: No Jest, Mocha, or other frameworks
2. **Mock network calls**: Use `fetchFn` parameter for testability
3. **Use fixtures**: Place test data in `test/fixtures/`
4. **Keep tests fast**: Avoid slow operations in tests
5. **Test edge cases**: Handle empty inputs, null, undefined
6. **Test error paths**: Verify error handling works correctly

### Before Committing

Run the full test suite:

```bash
npm test
```

Ensure all tests pass before committing.

### Continuous Integration

Tests run automatically on:

- `pre-push` git hook (Husky)
- CI/CD pipelines (if configured)

---

## Português

### Visão Geral

npm-verify-guard usa o módulo nativo do Node.js `node:test` para testes. Nenhum framework de teste externo como Jest ou Mocha é usado.

### Executando Testes

#### Execute Todos os Testes

```bash
npm test
```

Isso executa todos os arquivos de teste no diretório `test/`.

#### Execute Arquivo de Teste Específico

```bash
node --test test/cli-check.test.js
```

#### Execute Testes com Node Inspector

```bash
node --inspect --test test/cli-check.test.js
```

### Estrutura de Teste

```
test/
├── fixtures/           # Dados de teste e arquivos mock
├── helpers/            # Funções utilitárias de teste
├── ml/                 # Testes específicos de ML
├── bin-entry.test.js   # Testes de entrypoint CLI
├── cli-check.test.js   # Testes de comando check
├── cli-gate.test.js    # Testes de comando gate
├── cli-init.test.js    # Testes de comando init
├── config.test.js      # Testes de configuração
├── scan-local.test.js  # Testes de varredura local
├── scan-external.test.js # Testes de varredura externa
└── ...
```

### Escrevendo Testes

#### Estrutura Básica de Teste

```javascript
import test from 'node:test';
import assert from 'node:assert/strict';

test('descreve o comportamento', () => {
  assert.equal(1 + 1, 2);
});
```

#### Testes Assíncronos

```javascript
import test from 'node:test';
import assert from 'node:assert/strict';

test('operação assíncrona', async () => {
  const result = await someAsyncFunction();
  assert.equal(result, 'expected');
});
```

#### Teste com Fixtures

```javascript
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

test('com fixture', async () => {
  const fixture = await readFile(join('test/fixtures', 'sample-package.json'), 'utf8');
  const parsed = JSON.parse(fixture);
  assert.equal(parsed.name, 'sample-package');
});
```

### Mock de Chamadas de Rede

Funções que fazem chamadas de rede aceitam um parâmetro `fetchFn` para testes:

```javascript
import test from 'node:test';
import assert from 'node:assert/strict';
import { scanExternal } from '../lib/scan-external.js';

test('varredura externa com mock fetch', async () => {
  const mockFetch = async (url, options) => {
    if (url.includes('osv')) {
      return { ok: true, json: () => ({ vulns: [] }) };
    }
    return { ok: true, text: () => '<rss>...</rss>' };
  };

  const findings = await scanExternal('/caminho/para/projeto', projectConfig, {
    fetchFn: mockFetch,
  });

  assert.equal(findings.length, 0);
});
```

### Helpers de Teste

Crie utilitários de teste reutilizáveis em `test/helpers/`:

```javascript
// test/helpers/mock-config.js
export function createMockConfig(overrides = {}) {
  return {
    allowPackages: [],
    ignorePaths: ['**/test/**'],
    heuristics: { maxFileSizeKb: 512 },
    external: { enabled: true },
    blockOnMedium: false,
    blockOnHigh: true,
    ml: {
      enabled: true,
      layer2Threshold: 0.7,
      layer3Threshold: 0.8,
    },
    ...overrides,
  };
}
```

### Testes ML

Testes específicos de ML vão em `test/ml/`:

```javascript
import test from 'node:test';
import assert from 'node:assert/strict';
import { triageCodeContent } from '../../lib/ml/triage-code.js';

test('triagem ML retorna findings para código suspeito', async () => {
  const suspiciousCode = 'eval(maliciousCode)';
  const findings = await triageCodeContent(suspiciousCode, [], {
    mlConfig: { enabled: true, layer2Threshold: 0.5 },
  });

  assert.ok(findings.length > 0);
  assert.equal(findings[0].source, 'local');
});
```

### Padrões Comuns de Teste

#### Testando Comandos CLI

```javascript
import test from 'node:test';
import assert from 'node:assert/strict';
import { runCli } from '../lib/cli.js';

test('comando check CLI retorna código de saída 0 para varredura limpa', async () => {
  const exitCode = await runCli(['check', '--local-only']);
  assert.equal(exitCode, 0);
});
```

#### Testando Carregamento de Configuração

```javascript
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProjectConfig } from '../lib/config.js';

test('carrega config padrão quando arquivo ausente', async () => {
  const config = await loadProjectConfig('/caminho/inexistente');
  assert.ok(config.ml);
  assert.equal(config.ml.enabled, true);
});
```

#### Testando Regras Heurísticas

```javascript
import test from 'node:test';
import assert from 'node:assert/strict';
import { HEURISTIC_RULES } from '../lib/scan-local.js';

test('heurística eval corresponde chamadas eval()', () => {
  const rule = HEURISTIC_RULES.find((r) => r.id === 'eval-usage');
  const code = 'eval(someCode)';
  assert.ok(rule.pattern.test(code));
});
```

### Organização de Testes

1. **Um arquivo de teste por módulo**: ex: `config.test.js` para `lib/config.js`
2. **Nomes de teste descritivos**: Explique o que está sendo testado
3. **Testes independentes**: Cada teste deve rodar em isolamento
4. **Arrange-Act-Assert**: Estruture testes claramente

### Melhores Práticas

1. **Use `node:test` nativo**: Sem Jest, Mocha ou outros frameworks
2. **Mock de chamadas de rede**: Use parâmetro `fetchFn` para testabilidade
3. **Use fixtures**: Coloque dados de teste em `test/fixtures/`
4. **Mantenha testes rápidos**: Evite operações lentas em testes
5. **Teste casos de borda**: Lidar com entradas vazias, null, undefined
6. **Teste caminhos de erro**: Verifique que tratamento de erro funciona corretamente

### Antes de Commitar

Execute a suíte completa de testes:

```bash
npm test
```

Certifique-se que todos os testes passam antes de commitar.

### Integração Contínua

Testes executam automaticamente em:

- Git hook `pre-push` (Husky)
- Pipelines CI/CD (se configurado)
