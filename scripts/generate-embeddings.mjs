import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { GLOBAL_MODELS_DIR } from '../lib/ml/model-loader.js';

async function generateEmbeddings() {
  try {
    const { NodeEmbedder } = await import('@agentix-e/embed-code-node');
    const patternFile = join(process.cwd(), 'data/embedding-patterns.json');
    const data = JSON.parse(await readFile(patternFile, 'utf8'));

    const modelPath = join(GLOBAL_MODELS_DIR, 'nomic-embed-code-v1.5.int8.onnx');
    const embedder = await NodeEmbedder.create({ modelPath });

    const patterns = [];
    for (const pattern of data.patterns) {
      console.log(`Generating embedding for: ${pattern.name}`);
      const embedding = await embedder.embed(pattern.code);
      patterns.push({
        name: pattern.name,
        description: pattern.description,
        embedding: Array.from(embedding),
      });
    }

    await embedder.dispose();

    const output = {
      patterns,
      generatedAt: new Date().toISOString(),
      model: 'nomic-embed-code-v1.5.int8',
    };

    await writeFile(patternFile, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
    console.log(`Generated ${patterns.length} embeddings`);
  } catch (error) {
    console.error('Failed to generate embeddings:', error.message);
    console.error('Make sure @agentix-e/embed-code-node is installed and the model is downloaded.');
    process.exit(1);
  }
}

generateEmbeddings();
