import { tokenizeCode, tokenizeText, tokensToVector, normalizeVector } from './tokenizer.js';

export { normalizeVector };

export function buildCodeFeatureVector(content, vocabulary) {
  return normalizeVector(tokensToVector(tokenizeCode(content), vocabulary));
}

export function buildNewsFeatureVector(text, vocabulary, threatKeywords) {
  return normalizeVector(tokensToVector(tokenizeText(text, threatKeywords), vocabulary));
}

export function fuseLayer2Scores(nbResult, tfidf, mlConfig = {}) {
  const threshold = mlConfig.tfidfThreshold ?? 2.5;
  const tfidfRatio = threshold > 0 ? tfidf.score / threshold : 0;
  const tfidfProbability = tfidf.suspicious
    ? Math.min(0.95, 0.55 + Math.min(tfidfRatio, 2) * 0.18 + (tfidf.maxTermScore ?? 0) * 0.05)
    : nbResult.probability;

  const probability = Math.min(1, Math.max(nbResult.probability, tfidf.suspicious ? tfidfProbability : 0));
  return {
    probability,
    label: probability > 0.5 ? 'malicious' : 'benign',
    tfidfBoost: tfidf.suspicious ? tfidfProbability : 0,
  };
}

export function padFeatureVector(vector, size) {
  if (vector.length >= size) {
    return vector.slice(0, size);
  }
  return [...vector, ...Array.from({ length: size - vector.length }, () => 0)];
}
