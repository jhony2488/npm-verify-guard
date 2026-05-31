import { CODE_BIGRAMS, CODE_KEYWORDS, tokenizeCode, tokenizeText, normalizeVector, tokensToVector } from '../lib/ml/tokenizer.js';
import { trainMultinomialNB } from '../lib/ml/naive-bayes.js';
import { buildDocumentFrequency } from '../lib/ml/tfidf.js';
import { createSeededRandom, trainSimpleMLP } from '../lib/ml/mlp.js';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'data');
const modelsDir = join(dataDir, 'models');
const random = createSeededRandom(42);

const trainingSamples = JSON.parse(await readFile(join(dataDir, 'training-samples.json'), 'utf8'));
const threatKeywords = JSON.parse(await readFile(join(modelsDir, 'threat-keywords.json'), 'utf8'));

const benignCodeSamples = trainingSamples.code.benign;
const maliciousCodeSamples = trainingSamples.code.malicious;
const vocabulary = [...CODE_KEYWORDS, ...CODE_BIGRAMS.map((bigram) => `__bigram__:${bigram}`)];

const nbSamples = [
  ...benignCodeSamples.map((content) => ({ label: 'benign', tokens: tokenizeCode(content) })),
  ...maliciousCodeSamples.map((content) => ({ label: 'malicious', tokens: tokenizeCode(content) })),
];

const codeNbModel = trainMultinomialNB(nbSamples, vocabulary);
const corpusTokens = nbSamples.map((sample) => sample.tokens);
const documentFrequency = buildDocumentFrequency(corpusTokens);

const newsSamples = [
  ...trainingSamples.news.malicious.map((text) => ({ text, label: 1 })),
  ...trainingSamples.news.benign.map((text) => ({ text, label: 0 })),
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
  const input = normalizeVector(tokensToVector(tokens, newsVocab));
  return { input, label: sample.label };
});

const codeMlpSamples = [
  ...benignCodeSamples.map((content) => ({
    input: normalizeVector(tokensToVector(tokenizeCode(content), vocabulary)),
    label: 0,
  })),
  ...maliciousCodeSamples.map((content) => ({
    input: normalizeVector(tokensToVector(tokenizeCode(content), vocabulary)),
    label: 1,
  })),
];

const newsMlpModel = trainSimpleMLP(newsMlpSamples, newsVocab.length, 16, 600, 0.06, { random });
const codeMlpModel = trainSimpleMLP(codeMlpSamples, vocabulary.length, 20, 700, 0.08, { random });

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

console.log(
  `Models generated in data/models/ (${benignCodeSamples.length} benign + ${maliciousCodeSamples.length} malicious code samples)`,
);
