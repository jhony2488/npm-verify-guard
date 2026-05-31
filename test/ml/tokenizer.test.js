import assert from 'node:assert/strict';
import test from 'node:test';
import { tokenizeText, tokensToVector, tokenizeCode } from '../../lib/ml/tokenizer.js';

test('tokenizeText strips HTML and lowercases tokens', () => {
  const tokens = tokenizeText('<b>Critical</b> RCE in npm', {});
  assert.ok(tokens.get('critical') >= 1);
  assert.ok(tokens.get('rce') >= 1);
  assert.ok(tokens.get('npm') >= 1);
});

test('tokenizeText adds threat keyword tokens', () => {
  const keywords = { high: ['remote code execution'] };
  const tokens = tokenizeText('remote code execution in library', keywords);
  assert.ok(tokens.has('__threat__:high:remote code execution'));
});

test('tokensToVector maps vocabulary to counts', () => {
  const tokens = new Map([
    ['eval', 2],
    ['fetch', 1],
  ]);
  const vector = tokensToVector(tokens, ['eval', 'fetch', 'missing']);
  assert.deepEqual(vector, [2, 1, 0]);
});

test('tokenizeCode ignores unrelated identifiers', () => {
  const tokens = tokenizeCode('const username = "alice"; return username.length;');
  assert.equal(tokens.get('eval'), undefined);
  assert.equal(tokens.get('fetch'), undefined);
});
