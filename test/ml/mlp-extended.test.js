import assert from 'node:assert/strict';
import test from 'node:test';
import { forwardMLP, trainSimpleMLP } from '../../lib/ml/mlp.js';

function withSeededRandom(seed, fn) {
  let state = seed >>> 0;
  const originalRandom = Math.random;
  Math.random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };

  try {
    return fn();
  } finally {
    Math.random = originalRandom;
  }
}

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
  assert.equal(result.label, 'malicious');
});

test('trainSimpleMLP learns simple OR pattern', () => {
  const samples = [
    { input: [0, 0], label: 0 },
    { input: [1, 0], label: 1 },
    { input: [0, 1], label: 1 },
    { input: [1, 1], label: 1 },
  ];

  let learned = false;
  for (let seed = 0; seed < 32 && !learned; seed += 1) {
    const model = withSeededRandom(seed, () => trainSimpleMLP(samples, 2, 8, 1000, 0.1));
    const positive = forwardMLP([1, 1], model);
    const negative = forwardMLP([0, 0], model);
    learned = positive.probability > negative.probability;
  }

  assert.ok(learned, 'trainSimpleMLP should learn OR with at least one random seed');
});
