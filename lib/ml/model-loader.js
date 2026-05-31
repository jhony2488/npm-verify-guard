import { readFile, writeFile, access, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { getDataPath, GLOBAL_CACHE_DIR, GLOBAL_DIR, ensureGlobalDirs, fileExists } from '../config.js';

const ML_CACHE_FILE = join(GLOBAL_CACHE_DIR, 'ml-scores.json');
export const GLOBAL_MODELS_DIR = join(GLOBAL_DIR, 'models');

export const ONNX_MODELS = {
  'codebert-mini': {
    fileName: 'codebert-mini.onnx',
    url: 'https://huggingface.co/onnx-models/codebert-base-mlm/resolve/main/model.onnx',
  },
  'distilbert-news': {
    fileName: 'distilbert-news.onnx',
    url: 'https://huggingface.co/onnx-models/distilbert-base-uncased/resolve/main/model.onnx',
  },
};

let cachedModels = null;

export async function loadCodeModels() {
  if (cachedModels) {
    return cachedModels;
  }

  const [nbModel, tfidfModel, codeMlpModel, threatKeywords] = await Promise.all([
    readJson(getDataPath('models/code-nb-model.json')),
    readJson(getDataPath('models/code-tfidf-idf.json')),
    readJson(getDataPath('models/code-mlp-model.json')),
    readJson(getDataPath('models/threat-keywords.json')),
  ]);

  cachedModels = {
    nbModel,
    tfidfModel,
    codeMlpModel,
    threatKeywords,
    idfMap: computeIdfMap(tfidfModel),
  };

  return cachedModels;
}

export async function loadNewsMlpModel() {
  return readJson(getDataPath('models/news-mlp-model.json'));
}

function computeIdfMap(tfidfModel) {
  const idfMap = new Map();
  const { documentFrequency, totalDocuments } = tfidfModel;
  for (const [term, docCount] of Object.entries(documentFrequency)) {
    idfMap.set(term, Math.log((totalDocuments + 1) / (docCount + 1)) + 1);
  }
  return idfMap;
}

async function readJson(path) {
  const raw = await readFile(path, 'utf8');
  return JSON.parse(raw);
}

export async function getMlCache() {
  await ensureGlobalDirs();
  if (!(await fileExists(ML_CACHE_FILE))) {
    return {};
  }
  try {
    const raw = await readFile(ML_CACHE_FILE, 'utf8');
    if (!raw.trim()) {
      return {};
    }
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export async function setMlCacheEntry(contentHash, entry) {
  await ensureGlobalDirs();
  const cache = await getMlCache();
  cache[contentHash] = entry;
  await writeFile(ML_CACHE_FILE, `${JSON.stringify(cache, null, 2)}\n`, 'utf8');
}

export function hashContent(content) {
  return createHash('sha256').update(content).digest('hex');
}

export async function getOnnxModelPath(modelName) {
  const meta = ONNX_MODELS[modelName];
  if (!meta) {
    return null;
  }
  await mkdir(GLOBAL_MODELS_DIR, { recursive: true });
  return join(GLOBAL_MODELS_DIR, meta.fileName);
}

export async function isOnnxModelDownloaded(modelName) {
  const modelPath = await getOnnxModelPath(modelName);
  if (!modelPath) {
    return false;
  }
  return fileExists(modelPath);
}

export async function getModelsStatus() {
  let onnxRuntimeAvailable = false;
  try {
    await import('onnxruntime-node');
    onnxRuntimeAvailable = true;
  } catch {
    onnxRuntimeAvailable = false;
  }

  const onnxModels = {};
  for (const name of Object.keys(ONNX_MODELS)) {
    onnxModels[name] = await isOnnxModelDownloaded(name);
  }

  return {
    onnxRuntimeAvailable,
    onnxModels,
    modelsDir: GLOBAL_MODELS_DIR,
    bundledModels: [
      'code-nb-model.json',
      'code-tfidf-idf.json',
      'code-mlp-model.json',
      'news-mlp-model.json',
    ],
  };
}

export async function downloadOnnxModels(onProgress) {
  await mkdir(GLOBAL_MODELS_DIR, { recursive: true });
  const results = [];

  for (const [name, meta] of Object.entries(ONNX_MODELS)) {
    const dest = join(GLOBAL_MODELS_DIR, meta.fileName);
    if (await fileExists(dest)) {
      results.push({ name, status: 'skipped', path: dest });
      continue;
    }

    onProgress?.(`Downloading ${name}...`);
    try {
      const response = await fetch(meta.url);
      if (!response.ok) {
        results.push({ name, status: 'failed', error: `HTTP ${response.status}` });
        continue;
      }
      const buffer = Buffer.from(await response.arrayBuffer());
      await writeFile(dest, buffer);
      results.push({ name, status: 'downloaded', path: dest });
    } catch (error) {
      results.push({ name, status: 'failed', error: error.message });
    }
  }

  return results;
}

export async function ensureOnnxRuntime() {
  try {
    await access(await import.meta.resolve('onnxruntime-node'));
    return true;
  } catch {
    return false;
  }
}
