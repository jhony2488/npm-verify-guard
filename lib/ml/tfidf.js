export function computeTf(tokens) {
  const total = [...tokens.values()].reduce((sum, count) => sum + count, 0) || 1;
  const tf = new Map();
  for (const [term, count] of tokens.entries()) {
    tf.set(term, count / total);
  }
  return tf;
}

export function computeIdf(documentFrequency, totalDocuments) {
  const idf = new Map();
  for (const [term, docCount] of Object.entries(documentFrequency)) {
    idf.set(term, Math.log((totalDocuments + 1) / (docCount + 1)) + 1);
  }
  return idf;
}

export function buildIdfMap(tfidfModel) {
  return computeIdf(tfidfModel.documentFrequency ?? {}, tfidfModel.totalDocuments ?? 0);
}

export function computeTfidfScore(tokens, idfMap, { threshold = 2.5 } = {}) {
  const tf = computeTf(tokens);
  let weightedSum = 0;
  let maxTermScore = 0;
  let matchedTerms = 0;

  for (const [term, tfValue] of tf.entries()) {
    const idfValue = idfMap.get(term);
    if (idfValue === undefined) {
      continue;
    }

    const termScore = tfValue * idfValue;
    weightedSum += termScore;
    maxTermScore = Math.max(maxTermScore, termScore);
    matchedTerms += 1;
  }

  const tokenCount = [...tf.values()].reduce((sum, count) => sum + count, 0) || 1;
  const normalizedSum = weightedSum / Math.sqrt(tokenCount);
  const score = maxTermScore * 0.65 + normalizedSum * 0.35;
  const maxThreshold = threshold * 0.75;

  return {
    score,
    maxTermScore,
    matchedTerms,
    suspicious: score >= threshold || maxTermScore >= maxThreshold,
  };
}

export function buildDocumentFrequency(corpusTokensList) {
  const df = {};
  for (const tokens of corpusTokensList) {
    const uniqueTerms = new Set(tokens.keys());
    for (const term of uniqueTerms) {
      df[term] = (df[term] ?? 0) + 1;
    }
  }
  return df;
}
