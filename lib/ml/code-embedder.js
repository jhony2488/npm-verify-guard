import { cosineSimilarity } from './mlp.js';
import { GLOBAL_MODELS_DIR } from './model-loader.js';
import { fileExists } from '../config.js';

let embedderInstance = null;
let patternEmbeddings = null;

/**
 * Initialize the code embedder with the nomic-embed-code model
 * Returns false if the optional dependency is not available
 */
export async function initializeEmbedder() {
  try {
    const { NodeEmbedder } = await import('@agentix-e/embed-code-node');
    const modelPath = `${GLOBAL_MODELS_DIR}/nomic-embed-code-v1.5.int8.onnx`;

    if (!(await fileExists(modelPath))) {
      console.warn('Embedding model not found. Run "npm-verify models download-embeddings" to download.');
      return false;
    }

    embedderInstance = await NodeEmbedder.create({
      modelPath,
    });

    // Load known malicious pattern embeddings
    await loadPatternEmbeddings();

    return true;
  } catch (error) {
    // Module not installed or other error
    return false;
  }
}

/**
 * Generate embedding for code content
 */
export async function embedCode(content) {
  if (!embedderInstance) {
    const initialized = await initializeEmbedder();
    if (!initialized) {
      throw new Error('Embedding model not available');
    }
  }

  try {
    const embedding = await embedderInstance.embed(content);
    return embedding;
  } catch (error) {
    throw new Error(`Failed to generate embedding: ${error.message}`);
  }
}

/**
 * Compare code embedding against known malicious patterns
 * Returns similarity score (0-1, higher = more similar)
 */
export async function compareWithMaliciousPatterns(content) {
  if (!patternEmbeddings || patternEmbeddings.length === 0) {
    return { similarity: 0, matchedPattern: null };
  }

  try {
    const embedding = await embedCode(content);
    let maxSimilarity = 0;
    let matchedPattern = null;

    for (const pattern of patternEmbeddings) {
      const similarity = cosineSimilarity(embedding, pattern.embedding);
      if (similarity > maxSimilarity) {
        maxSimilarity = similarity;
        matchedPattern = pattern.name;
      }
    }

    return { similarity: maxSimilarity, matchedPattern };
  } catch (error) {
    return { similarity: 0, matchedPattern: null };
  }
}

/**
 * Dispose of embedder resources
 */
export async function disposeEmbedder() {
  if (embedderInstance) {
    await embedderInstance.dispose();
    embedderInstance = null;
  }
}

/**
 * Load pre-computed embeddings for known malicious patterns
 */
async function loadPatternEmbeddings() {
  try {
    const { readFile } = await import('node:fs/promises');
    const { getDataPath } = await import('../config.js');
    const patternFile = getDataPath('embedding-patterns.json');

    if (!(await fileExists(patternFile))) {
      patternEmbeddings = [];
      return;
    }

    const content = await readFile(patternFile, 'utf8');
    const data = JSON.parse(content);
    patternEmbeddings = data.patterns || [];
  } catch {
    patternEmbeddings = [];
  }
}

/**
 * Check if embedder is available
 */
export function isEmbedderAvailable() {
  return embedderInstance !== null;
}
