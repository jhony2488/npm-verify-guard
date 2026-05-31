export function sigmoid(x) {
  return 1 / (1 + Math.exp(-x));
}

export function relu(x) {
  return Math.max(0, x);
}

export function matVecMul(matrix, vector) {
  return matrix.map((row) => row.reduce((sum, weight, index) => sum + weight * (vector[index] ?? 0), 0));
}

export function forwardMLP(input, model) {
  const hidden = matVecMul(model.weightsHidden, input).map((value, index) =>
    relu(value + (model.biasHidden[index] ?? 0)),
  );
  const outputRaw = matVecMul(model.weightsOutput, hidden)[0] + (model.biasOutput[0] ?? 0);
  const probability = sigmoid(outputRaw);

  return {
    probability,
    label: probability >= 0.5 ? 'malicious' : 'benign',
    hidden,
  };
}

export function trainSimpleMLP(samples, inputSize, hiddenSize = 8, epochs = 200, learningRate = 0.05) {
  const weightsHidden = Array.from({ length: hiddenSize }, () =>
    Array.from({ length: inputSize }, () => (Math.random() - 0.5) * 0.2),
  );
  const biasHidden = Array.from({ length: hiddenSize }, () => 0);
  const weightsOutput = [Array.from({ length: hiddenSize }, () => (Math.random() - 0.5) * 0.2)];
  const biasOutput = [0];

  for (let epoch = 0; epoch < epochs; epoch += 1) {
    for (const sample of samples) {
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
        weightsOutput[0][j] -= learningRate * error * hidden[j];
      }
      biasOutput[0] -= learningRate * error;

      for (let j = 0; j < hiddenSize; j += 1) {
        const hiddenError = error * weightsOutput[0][j] * (hiddenPre[j] > 0 ? 1 : 0);
        for (let i = 0; i < inputSize; i += 1) {
          weightsHidden[j][i] -= learningRate * hiddenError * sample.input[i];
        }
        biasHidden[j] -= learningRate * hiddenError;
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
