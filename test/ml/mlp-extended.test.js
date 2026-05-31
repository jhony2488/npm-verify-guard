import assert from 'node:assert/strict';
import test from 'node:test';
import { createSeededRandom, forwardMLP, trainSimpleMLP } from '../../lib/ml/mlp.js';

test('forwardMLP returns 0.5 probability for zero weights at zero input', () => {
  const model = {
    inputSize: 3,
    hiddenSize: 2,
    weightsHidden: [
      [0, 0, 0],
      [0, 0, 0],
    ],
    biasHidden: [0, 0],
    weightsOutput: [[0, 0]],
    biasOutput: [0],
  };

  const result = forwardMLP([0, 0, 0], model);
  assert.equal(result.probability, 0.5);
  assert.equal(result.label, 'benign');
});

test('trainSimpleMLP learns simple OR pattern deterministically', () => {
  const samples = [
    { input: [0, 0], label: 0 },
    { input: [1, 0], label: 1 },
    { input: [0, 1], label: 1 },
    { input: [1, 1], label: 1 },
  ];

  const model = trainSimpleMLP(samples, 2, 8, 1000, 0.1, { random: createSeededRandom(7) });
  const positive = forwardMLP([1, 1], model);
  const negative = forwardMLP([0, 0], model);

  assert.ok(positive.probability > negative.probability);
  assert.ok(positive.probability > 0.5);
  assert.ok(negative.probability < 0.5);
});
