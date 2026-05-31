import { tokenizeCode, tokensToVector } from './tokenizer.js';
import { classifyMultinomialNB } from './naive-bayes.js';
import { computeTfidfScore } from './tfidf.js';
import { forwardMLP } from './mlp.js';
import { classifyWithOnnx, tryLoadOnnxSession } from './onnx-provider.js';
import { hashContent, loadCodeModels, getMlCache, setMlCacheEntry } from './model-loader.js';

export async function triageCodeContent(content, layer1Findings, options = {}) {
  const mlConfig = options.mlConfig ?? {};
  if (mlConfig.enabled === false) {
    return layer1Findings;
  }

  const contentHash = hashContent(content);
  const cache = await getMlCache();
  if (cache[contentHash] && !options.deepScan) {
    return mergeCachedResult(layer1Findings, cache[contentHash], options);
  }

  const models = await loadCodeModels();
  const tokens = tokenizeCode(content);
  const findings = [...layer1Findings];

  const hasBlockingLayer1 = layer1Findings.some((finding) => finding.blocking && finding.severity === 'high');
  if (hasBlockingLayer1) {
    return findings;
  }

  const tfidf = computeTfidfScore(tokens, models.idfMap, {
    threshold: mlConfig.tfidfThreshold ?? 2.5,
  });
  const nbResult = classifyMultinomialNB(tokens, models.nbModel);
  const layer2Threshold = mlConfig.layer2Threshold ?? 0.7;
  const mediumThreshold = mlConfig.layer2MediumThreshold ?? 0.3;

  let mlResult = {
    layer: 2,
    probability: nbResult.probability,
    tfidfScore: tfidf.score,
    label: nbResult.label,
    rule: 'ml-naive-bayes',
  };

  if (nbResult.probability < mediumThreshold && !tfidf.suspicious) {
    await setMlCacheEntry(contentHash, { ...mlResult, approved: true });
    return findings;
  }

  if (nbResult.probability >= mediumThreshold && nbResult.probability < layer2Threshold) {
    findings.push(buildMlFinding(mlResult, {
      severity: 'medium',
      blocking: mlConfig.blockOnMedium ?? false,
      detail: `Suspicious code probability: ${nbResult.probability.toFixed(2)} (Layer 2 Naive Bayes)`,
    }));
    await setMlCacheEntry(contentHash, { ...mlResult, approved: false });
    return findings;
  }

  if (nbResult.probability >= layer2Threshold || tfidf.suspicious) {
    if (options.deepScan) {
      const layer3 = await runLayer3Code(content, models, mlConfig);
      mlResult = layer3;
    } else {
      mlResult.probability = Math.max(nbResult.probability, tfidf.suspicious ? 0.75 : nbResult.probability);
    }

    const layer3Threshold = mlConfig.layer3Threshold ?? 0.8;
    if (mlResult.probability >= layer3Threshold || mlResult.label === 'malicious') {
      findings.push(
        buildMlFinding(mlResult, {
          severity: 'high',
          blocking: true,
          detail: `Malicious probability: ${mlResult.probability.toFixed(2)} (Layer ${mlResult.layer} ${mlResult.rule})`,
        }),
      );
    } else if (nbResult.probability >= mediumThreshold) {
      findings.push(
        buildMlFinding(mlResult, {
          severity: 'medium',
          blocking: mlConfig.blockOnMedium ?? false,
          detail: `Elevated suspicion: ${mlResult.probability.toFixed(2)} (Layer ${mlResult.layer})`,
        }),
      );
    }
  }

  await setMlCacheEntry(contentHash, { ...mlResult, approved: findings.length === layer1Findings.length });
  return findings;
}

async function runLayer3Code(content, models, mlConfig) {
  if (mlConfig.useOnnx !== false) {
    const onnx = await tryLoadOnnxSession('codebert-mini');
    if (onnx.available) {
      try {
        const result = await classifyWithOnnx(onnx.session, content, 'code');
        return {
          layer: 3,
          probability: result.probability,
          label: result.label,
          rule: 'ml-onnx-codebert',
        };
      } catch {
        // fall through to MLP
      }
    }
  }

  const vector = tokensToVector(tokenizeCode(content), models.codeMlpModel.vocabulary);
  const mlpResult = forwardMLP(vector, models.codeMlpModel);
  return {
    layer: 3,
    probability: mlpResult.probability,
    label: mlpResult.label,
    rule: 'ml-mlp',
  };
}

function buildMlFinding(mlResult, { severity, blocking, detail }) {
  return {
    severity,
    source: 'local',
    rule: mlResult.rule,
    detail,
    mlScore: mlResult.probability,
    mlLayer: mlResult.layer,
    blocking,
  };
}

function mergeCachedResult(layer1Findings, cached, options) {
  if (cached.approved) {
    return layer1Findings;
  }
  return [
    ...layer1Findings,
    buildMlFinding(cached, {
      severity: cached.probability >= (options.mlConfig?.layer3Threshold ?? 0.8) ? 'high' : 'medium',
      blocking: cached.probability >= (options.mlConfig?.layer3Threshold ?? 0.8),
      detail: `Cached ML result: ${cached.probability.toFixed(2)} (Layer ${cached.layer})`,
    }),
  ];
}
