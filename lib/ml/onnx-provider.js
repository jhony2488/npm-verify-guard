import { createHash } from 'node:crypto';
import { getOnnxModelPath } from './model-loader.js';

const sessionCache = new Map();

export async function tryLoadOnnxSession(modelName) {
  if (sessionCache.has(modelName)) {
    return sessionCache.get(modelName);
  }

  try {
    const ort = await import('onnxruntime-node');
    const modelPath = await getOnnxModelPath(modelName);
    if (!modelPath) {
      const result = { available: false, session: null };
      sessionCache.set(modelName, result);
      return result;
    }

    const session = await ort.InferenceSession.create(modelPath);
    const result = { available: true, session, ort };
    sessionCache.set(modelName, result);
    return result;
  } catch {
    const result = { available: false, session: null };
    sessionCache.set(modelName, result);
    return result;
  }
}

export async function classifyWithOnnx(session, text, mode) {
  const ort = (await import('onnxruntime-node'));
  const vector = vectorizeForOnnx(text, mode);
  const inputName = session.inputNames[0] ?? 'input';
  const feeds = {
    [inputName]: new ort.Tensor('float32', Float32Array.from(vector), [1, vector.length]),
  };

  const output = await session.run(feeds);
  const outputTensor = output[session.outputNames[0]];
  const data = [...outputTensor.data];
  const probability = mode === 'news' ? softmaxPositive(data) : sigmoidFromLogits(data);

  return {
    probability,
    label: probability >= 0.5 ? 'malicious' : 'benign',
  };
}

function vectorizeForOnnx(text, mode) {
  const normalized = text.toLowerCase().slice(0, 512);
  const size = mode === 'news' ? 128 : 256;
  const vector = new Array(size).fill(0);

  for (let i = 0; i < normalized.length; i += 1) {
    const code = normalized.charCodeAt(i);
    vector[i % size] += code / 255;
  }

  const hash = createHash('sha256').update(normalized).digest();
  for (let i = 0; i < Math.min(hash.length, size); i += 1) {
    vector[i] += hash[i] / 255;
  }

  const max = Math.max(...vector, 1);
  return vector.map((value) => value / max);
}

function sigmoidFromLogits(logits) {
  const x = logits[0] ?? 0;
  return 1 / (1 + Math.exp(-x));
}

function softmaxPositive(logits) {
  if (logits.length === 1) {
    return sigmoidFromLogits(logits);
  }
  const max = Math.max(...logits);
  const exps = logits.map((value) => Math.exp(value - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps[1] / sum || exps[0] / sum;
}
