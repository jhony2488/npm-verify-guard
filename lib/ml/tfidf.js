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

export function computeTfidfScore(tokens, idfMap, { threshold = 2.5 } = {}) {
  const tf = computeTf(tokens);
  let score = 0;

  for (const [term, tfValue] of tf.entries()) {
    const idfValue = idfMap.get(term) ?? 1;
    score += tfValue * idfValue;
  }

  return {
    score,
    suspicious: score >= threshold,
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
