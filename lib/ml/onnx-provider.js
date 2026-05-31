import { getOnnxModelPath } from './model-loader.js';
import { padFeatureVector } from './features.js';

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

export async function classifyWithOnnx(session, featureVector, mode) {
  const ort = await import('onnxruntime-node');
  const inputSize = mode === 'news' ? 128 : 256;
  const vector = padFeatureVector(featureVector, inputSize);
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
    label: probability > 0.5 ? 'malicious' : 'benign',
  };
}

function sigmoidFromLogits(logits) {
  const x = logits[0] ?? 0;
  if (x >= 0) {
    const z = Math.exp(-x);
    return 1 / (1 + z);
  }
  const z = Math.exp(x);
  return z / (1 + z);
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
