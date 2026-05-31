import { readFile } from 'node:fs/promises';
import { forwardMLP } from './mlp.js';
import { classifyWithOnnx, tryLoadOnnxSession } from './onnx-provider.js';
import { getDataPath } from '../config.js';
import { loadNewsMlpModel } from './model-loader.js';
import { buildNewsFeatureVector } from './features.js';

let threatKeywordsCache = null;

export async function triageNewsItems(items, dependencies, options = {}) {
  const mlConfig = options.mlConfig ?? {};
  const depNames = dependencies.map((dep) => dep.name);
  const findings = [];

  for (const item of items) {
    const text = `${item.title} ${item.description}`;
    const mentioned = depNames.filter((name) => text.toLowerCase().includes(name.toLowerCase()));

    const classification = await classifyNewsText(text, {
      deepScan: options.deepScan,
      mlConfig,
    });

    if (classification.level === 'ignore') {
      continue;
    }

    const targets = mentioned.length > 0 ? mentioned : extractPackageMentions(text, depNames);
    if (targets.length === 0) {
      continue;
    }

    for (const packageName of targets) {
      findings.push({
        severity: classification.level === 'critical' ? 'high' : 'medium',
        source: 'external',
        rule: classification.rule,
        package: packageName,
        detail: item.title,
        mlScore: classification.probability,
        mlLayer: classification.layer,
        blocking: classification.level === 'critical',
      });
    }
  }

  return findings;
}

export async function classifyNewsText(text, options = {}) {
  const mlConfig = options.mlConfig ?? {};
  const keywords = await loadThreatKeywords();
  const newsModel = await loadNewsMlpModel();
  const vector = buildNewsFeatureVector(text, newsModel.vocabulary, keywords);
  const layer2 = forwardMLP(vector, newsModel);

  const layer2Threshold = mlConfig.newsLayer2Threshold ?? 0.45;
  if (layer2.probability < layer2Threshold) {
    return { level: 'ignore', probability: layer2.probability, layer: 2, rule: 'ml-news-mlp' };
  }

  if (options.deepScan && mlConfig.useOnnx !== false) {
    const onnx = await tryLoadOnnxSession('distilbert-news');
    if (onnx.available) {
      try {
        const result = await classifyWithOnnx(onnx.session, vector, 'news');
        return mapNewsProbability(result.probability, 3, 'ml-onnx-distilbert', mlConfig);
      } catch {
        // fallback below
      }
    }
  }

  return mapNewsProbability(layer2.probability, options.deepScan ? 3 : 2, 'ml-news-mlp', mlConfig);
}

function mapNewsProbability(probability, layer, rule, mlConfig = {}) {
  const criticalThreshold = mlConfig.newsLayer3Threshold ?? 0.8;
  const mediumThreshold = mlConfig.newsLayer2Threshold ?? 0.45;

  if (probability >= criticalThreshold) {
    return { level: 'critical', probability, layer, rule };
  }
  if (probability >= mediumThreshold) {
    return { level: 'medium', probability, layer, rule };
  }
  return { level: 'ignore', probability, layer, rule };
}

function extractPackageMentions(text, depNames) {
  const lower = text.toLowerCase();
  return depNames.filter((name) => lower.includes(name.toLowerCase()));
}

async function loadThreatKeywords() {
  if (threatKeywordsCache) {
    return threatKeywordsCache;
  }
  const raw = await readFile(getDataPath('models/threat-keywords.json'), 'utf8');
  threatKeywordsCache = JSON.parse(raw);
  return threatKeywordsCache;
}
