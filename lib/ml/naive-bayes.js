export function trainMultinomialNB(samples, vocabulary) {
  const classCounts = { benign: 0, malicious: 0 };
  const termCounts = { benign: {}, malicious: {} };
  const totalTerms = { benign: 0, malicious: 0 };

  for (const sample of samples) {
    const label = sample.label;
    classCounts[label] += 1;

    for (const term of vocabulary) {
      const count = sample.tokens.get(term) ?? 0;
      if (count === 0) {
        continue;
      }
      termCounts[label][term] = (termCounts[label][term] ?? 0) + count;
      totalTerms[label] += count;
    }
  }

  const totalDocs = classCounts.benign + classCounts.malicious;
  const logPrior = {
    benign: Math.log((classCounts.benign + 1) / (totalDocs + 2)),
    malicious: Math.log((classCounts.malicious + 1) / (totalDocs + 2)),
  };

  const logLikelihood = { benign: {}, malicious: {} };
  const vocabSize = vocabulary.length;

  for (const label of ['benign', 'malicious']) {
    const denominator = totalTerms[label] + vocabSize;
    for (const term of vocabulary) {
      const numerator = (termCounts[label][term] ?? 0) + 1;
      logLikelihood[label][term] = Math.log(numerator / denominator);
    }
  }

  return {
    vocabulary,
    logPrior,
    logLikelihood,
    classCounts,
  };
}

export function classifyMultinomialNB(tokens, model) {
  const scores = { benign: model.logPrior.benign, malicious: model.logPrior.malicious };

  for (const term of model.vocabulary) {
    const count = tokens.get(term) ?? 0;
    if (count === 0) {
      continue;
    }
    scores.benign += count * model.logLikelihood.benign[term];
    scores.malicious += count * model.logLikelihood.malicious[term];
  }

  const maxScore = Math.max(scores.benign, scores.malicious);
  const expBenign = Math.exp(scores.benign - maxScore);
  const expMalicious = Math.exp(scores.malicious - maxScore);
  const total = expBenign + expMalicious;
  const maliciousProbability = expMalicious / total;

  return {
    label: maliciousProbability >= 0.5 ? 'malicious' : 'benign',
    probability: maliciousProbability,
    score: maliciousProbability,
  };
}
