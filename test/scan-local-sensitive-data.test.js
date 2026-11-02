import test from 'node:test';
import assert from 'node:assert/strict';
import { SENSITIVE_DATA_RULES } from '../lib/scan-local.js';

test('SENSITIVE_DATA_RULES is defined', () => {
  assert.ok(Array.isArray(SENSITIVE_DATA_RULES));
  assert.ok(SENSITIVE_DATA_RULES.length > 0);
});

test('BTC address pattern matches', () => {
  const rule = SENSITIVE_DATA_RULES.find((r) => r.id === 'btc-address');
  assert.ok(rule);

  const validBtc = 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh';
  const legacyBtc = '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa';

  assert.ok(rule.pattern.test(validBtc));
  assert.ok(rule.pattern.test(legacyBtc));
  assert.strictEqual(rule.severity, 'medium');
});

test('ETH address pattern matches', () => {
  const rule = SENSITIVE_DATA_RULES.find((r) => r.id === 'eth-address');
  assert.ok(rule);

  const validEth = '0x71C7656EC7ab88b098defB751B7401B5f6d8976F';

  assert.ok(rule.pattern.test(validEth));
  assert.strictEqual(rule.severity, 'medium');
});

test('AWS access key pattern matches', () => {
  const rule = SENSITIVE_DATA_RULES.find((r) => r.id === 'aws-access-key');
  assert.ok(rule);

  const validKey = 'AKIAIOSFODNN7EXAMPLE';

  assert.ok(rule.pattern.test(validKey));
  assert.strictEqual(rule.severity, 'high');
});

test('GitHub token pattern matches', () => {
  const rule = SENSITIVE_DATA_RULES.find((r) => r.id === 'github-token');
  assert.ok(rule);

  const validToken = 'ghp_1234567890abcdefghijklmnopqrstuv';
  const classicToken = 'ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';

  assert.ok(rule.pattern.test(validToken) || rule.pattern.test(classicToken));
  assert.strictEqual(rule.severity, 'high');
});

test('Stripe API key pattern matches', () => {
  const rule = SENSITIVE_DATA_RULES.find((r) => r.id === 'stripe-api-key');
  assert.ok(rule);

  const validKey = ['sk', '_live_', '51Mxexamplekeyabcdefghijklmnopqrstuv'].join('');

  assert.ok(rule.pattern.test(validKey));
  assert.strictEqual(rule.severity, 'high');
});

test('Slack token pattern matches', () => {
  const rule = SENSITIVE_DATA_RULES.find((r) => r.id === 'slack-token');
  assert.ok(rule);

  const validToken = ['xox', 'b-', '1234567890-1234567890123-abcdEFGHijklMNOP'].join('');

  assert.ok(rule.pattern.test(validToken));
  assert.strictEqual(rule.severity, 'high');
});

test('Password in code pattern matches', () => {
  const rule = SENSITIVE_DATA_RULES.find((r) => r.id === 'password-in-code');
  assert.ok(rule);

  const withPassword = "const password = 'MySecretPassword123'";
  const withPasswd = "passwd = 'anotherpassword'";

  assert.ok(rule.pattern.test(withPassword));
  assert.ok(rule.pattern.test(withPasswd));
  assert.strictEqual(rule.severity, 'high');
});

test('API key pattern matches', () => {
  const rule = SENSITIVE_DATA_RULES.find((r) => r.id === 'api-key-pattern');
  assert.ok(rule);

  const withApiKey = "const apiKey = 'sk_1234567890abcdefghijklmnopqrstuv'";
  const withApikey = "apikey = 'anotherkey12345678901234567890'";

  assert.ok(rule.pattern.test(withApiKey));
  assert.ok(rule.pattern.test(withApikey));
  assert.strictEqual(rule.severity, 'high');
});

test('Private key pattern matches', () => {
  const rule = SENSITIVE_DATA_RULES.find((r) => r.id === 'private-key');
  assert.ok(rule);

  const withKey = '-----BEGIN RSA PRIVATE KEY-----';

  assert.ok(rule.pattern.test(withKey));
  assert.strictEqual(rule.severity, 'high');
});

test('SSH key pattern matches', () => {
  const rule = SENSITIVE_DATA_RULES.find((r) => r.id === 'ssh-key');
  assert.ok(rule);

  const withSsh = 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQC';
  const withEd25519 = 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI';

  assert.ok(rule.pattern.test(withSsh));
  assert.ok(rule.pattern.test(withEd25519));
  assert.strictEqual(rule.severity, 'high');
});

test('Credit card pattern matches', () => {
  const rule = SENSITIVE_DATA_RULES.find((r) => r.id === 'credit-card');
  assert.ok(rule);

  const visa = '4111111111111111';
  const mastercard = '5555555555554444';
  const amex = '378282246310005';

  assert.ok(rule.pattern.test(visa));
  assert.ok(rule.pattern.test(mastercard));
  assert.ok(rule.pattern.test(amex));
  assert.strictEqual(rule.severity, 'high');
});

test('IBAN pattern matches', () => {
  const rule = SENSITIVE_DATA_RULES.find((r) => r.id === 'iban');
  assert.ok(rule);

  const validIban = 'GB82WEST12345698765432';

  assert.ok(rule.pattern.test(validIban));
  assert.strictEqual(rule.severity, 'medium');
});

test('Patterns do not match false positives', () => {
  const rules = SENSITIVE_DATA_RULES;

  const safeCode = `
    const user = 'john';
    const token = 'abc123';
    const key = 'value';
    const pass = 'test';
  `;

  for (const rule of rules) {
    const matches = safeCode.match(rule.pattern);
    assert.strictEqual(matches, null, `Rule ${rule.id} should not match safe code`);
  }
});

test('All rules have required fields', () => {
  for (const rule of SENSITIVE_DATA_RULES) {
    assert.ok(typeof rule.id === 'string');
    assert.ok(typeof rule.severity === 'string');
    assert.ok(rule.severity === 'high' || rule.severity === 'medium');
    assert.ok(rule.pattern instanceof RegExp);
    assert.ok(typeof rule.message === 'string');
  }
});
