import { tokenizeCode } from './tokenizer.js';
import { classifyMultinomialNB } from './naive-bayes.js';
import { computeTfidfScore } from './tfidf.js';
import { forwardMLP } from './mlp.js';
import { classifyWithOnnx, tryLoadOnnxSession } from './onnx-provider.js';
import { hashContent, loadCodeModels, getMlCache, setMlCacheEntry } from './model-loader.js';
import { buildCodeFeatureVector, fuseLayer2Scores } from './features.js';

export async function triageCodeContent(content, layer1Findings, options = {}) {
  const mlConfig = options.mlConfig ?? {};
  if (mlConfig.enabled === false) {
    return layer1Findings;
  }

  const models = await loadCodeModels();
  const tokens = tokenizeCode(content);
  const findings = [...layer1Findings];

  const hasBlockingLayer1 = layer1Findings.some((finding) => finding.blocking && finding.severity === 'high');
  if (hasBlockingLayer1) {
    return findings;
  }

  const contentHash = hashContent(content);
  const cache = await getMlCache();
  if (cache[contentHash] && !options.deepScan && !options.skipCache) {
    return mergeCachedResult(layer1Findings, cache[contentHash], options);
  }

  const tfidfThreshold = mlConfig.tfidfThreshold ?? models.tfidfModel.threshold ?? 2.5;
  const tfidf = computeTfidfScore(tokens, models.idfMap, { threshold: tfidfThreshold });
  const nbResult = classifyMultinomialNB(tokens, models.nbModel);
  const layer2Threshold = mlConfig.layer2Threshold ?? 0.7;
  const mediumThreshold = mlConfig.layer2MediumThreshold ?? 0.3;
  const fused = fuseLayer2Scores(nbResult, tfidf, { ...mlConfig, tfidfThreshold });

  let mlResult = {
    layer: 2,
    probability: fused.probability,
    tfidfScore: tfidf.score,
    label: fused.label,
    rule: tfidf.suspicious && nbResult.probability < layer2Threshold ? 'ml-tfidf-nb-fusion' : 'ml-naive-bayes',
  };

  if (fused.probability < mediumThreshold && !tfidf.suspicious) {
    await setMlCacheEntry(contentHash, { ...mlResult, approved: true });
    return findings;
  }

  if (fused.probability >= mediumThreshold && fused.probability < layer2Threshold && !tfidf.suspicious) {
    findings.push(
      buildMlFinding(mlResult, {
        severity: 'medium',
        blocking: mlConfig.blockOnMedium ?? false,
        detail: `Suspicious code probability: ${fused.probability.toFixed(2)} (Layer 2 fusion)`,
      }),
    );
    await setMlCacheEntry(contentHash, { ...mlResult, approved: false });
    return findings;
  }

  if (fused.probability >= layer2Threshold || tfidf.suspicious) {
    if (options.deepScan) {
      const layer3 = await runLayer3Code(content, models, mlConfig);
      mlResult = layer3;
    } else {
      mlResult = {
        ...mlResult,
        probability: fused.probability,
        label: fused.label,
        rule: 'ml-tfidf-nb-fusion',
      };
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
    } else if (fused.probability >= mediumThreshold) {
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
  const featureVector = buildCodeFeatureVector(content, models.codeMlpModel.vocabulary);

  if (mlConfig.useOnnx !== false) {
    const onnx = await tryLoadOnnxSession('codebert-mini');
    if (onnx.available) {
      try {
        const result = await classifyWithOnnx(onnx.session, featureVector, 'code');
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

  const mlpResult = forwardMLP(featureVector, models.codeMlpModel);
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

  const layer3Threshold = options.mlConfig?.layer3Threshold ?? 0.8;
  const isHigh = cached.probability >= layer3Threshold || cached.label === 'malicious';

  return [
    ...layer1Findings,
    buildMlFinding(cached, {
      severity: isHigh ? 'high' : 'medium',
      blocking: isHigh,
      detail: `Cached ML result: ${cached.probability.toFixed(2)} (Layer ${cached.layer})`,
    }),
  ];
}
