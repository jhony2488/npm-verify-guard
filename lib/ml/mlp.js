export function sigmoid(x) {
  if (x >= 0) {
    const z = Math.exp(-x);
    return 1 / (1 + z);
  }
  const z = Math.exp(x);
  return z / (1 + z);
}

export function relu(x) {
  return Math.max(0, x);
}

export function matVecMul(matrix, vector) {
  return matrix.map((row) => row.reduce((sum, weight, index) => sum + weight * (vector[index] ?? 0), 0));
}

export function createSeededRandom(seed = 42) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

export function forwardMLP(input, model) {
  const hidden = matVecMul(model.weightsHidden, input).map((value, index) =>
    relu(value + (model.biasHidden[index] ?? 0)),
  );
  const outputRaw = matVecMul(model.weightsOutput, hidden)[0] + (model.biasOutput[0] ?? 0);
  const probability = sigmoid(outputRaw);

  return {
    probability,
    label: probability > 0.5 ? 'malicious' : 'benign',
    hidden,
  };
}

export function trainSimpleMLP(
  samples,
  inputSize,
  hiddenSize = 8,
  epochs = 200,
  learningRate = 0.05,
  options = {},
) {
  const random = options.random ?? Math.random;
  const weightsHidden = initializeMatrix(hiddenSize, inputSize, inputSize, hiddenSize, random);
  const biasHidden = Array.from({ length: hiddenSize }, () => 0);
  const weightsOutput = [initializeRow(hiddenSize, hiddenSize, 1, random)];
  const biasOutput = [0];
  const shuffled = [...samples];

  for (let epoch = 0; epoch < epochs; epoch += 1) {
    const epochLearningRate = learningRate / (1 + epoch * 0.0015);
    shuffleInPlace(shuffled, random);

    for (const sample of shuffled) {
      const hiddenPre = matVecMul(weightsHidden, sample.input).map(
        (value, index) => value + biasHidden[index],
      );
      const hidden = hiddenPre.map(relu);
      const outputPre = hidden.reduce(
        (sum, value, index) => sum + value * weightsOutput[0][index],
        biasOutput[0],
      );
      const output = sigmoid(outputPre);
      const error = output - sample.label;

      for (let j = 0; j < hiddenSize; j += 1) {
        weightsOutput[0][j] -= epochLearningRate * error * hidden[j];
      }
      biasOutput[0] -= epochLearningRate * error;

      for (let j = 0; j < hiddenSize; j += 1) {
        const hiddenError = error * weightsOutput[0][j] * (hiddenPre[j] > 0 ? 1 : 0);
        for (let i = 0; i < inputSize; i += 1) {
          weightsHidden[j][i] -= epochLearningRate * hiddenError * sample.input[i];
        }
        biasHidden[j] -= epochLearningRate * hiddenError;
      }
    }
  }

  return {
    inputSize,
    hiddenSize,
    weightsHidden,
    biasHidden,
    weightsOutput,
    biasOutput,
  };
}

function initializeMatrix(rows, cols, fanIn, fanOut, random) {
  return Array.from({ length: rows }, () => initializeRow(cols, fanIn, fanOut, random));
}

function initializeRow(cols, fanIn, fanOut, random) {
  const limit = Math.sqrt(6 / (fanIn + fanOut));
  return Array.from({ length: cols }, () => (random() * 2 - 1) * limit);
}

function shuffleInPlace(items, random) {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }
}
