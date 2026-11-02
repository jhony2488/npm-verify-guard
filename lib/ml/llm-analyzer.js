import { homedir } from 'node:os';
import { join } from 'node:path';

let llamaProvider = null;
let openaiProvider = null;

const DEFAULT_PROMPTS = {
  codeAnalysis: `Analyze the following JavaScript code for security vulnerabilities and malicious behavior.
Respond with a JSON object with this exact structure:
{
  "isMalicious": boolean,
  "severity": "high" | "medium" | "low" | "none",
  "reasoning": string,
  "detectedPatterns": string[]
}

Code to analyze:
`,
  sensitiveData: `Analyze the following code for sensitive data leakage (API keys, passwords, cryptocurrency addresses, bank accounts, private keys).
Respond with a JSON object with this exact structure:
{
  "hasSensitiveData": boolean,
  "detectedTypes": string[],
  "severity": "high" | "medium" | "low" | "none",
  "reasoning": string
}

Code to analyze:
`,
};

export async function getLlmStatus() {
  const status = {
    nodeLlamaCppAvailable: false,
    openaiCompatibleAvailable: false,
    configuredProvider: null,
    modelsDir: join(homedir(), '.npm-verify', 'llm-models'),
  };

  try {
    await import('node-llama-cpp');
    status.nodeLlamaCppAvailable = true;
  } catch {
    // node-llama-cpp not installed
  }

  if (openaiProvider) {
    status.openaiCompatibleAvailable = true;
  }

  return status;
}

export async function initializeLlmProvider(config = {}) {
  const provider = config.provider ?? 'auto';

  if (provider === 'node-llama-cpp' || provider === 'auto') {
    try {
      const { getLlama } = await import('node-llama-cpp');
      llamaProvider = await getLlama();
      return { available: true, provider: 'node-llama-cpp' };
    } catch {
      if (provider === 'node-llama-cpp') {
        return {
          available: false,
          provider: 'node-llama-cpp',
          error: 'node-llama-cpp not installed',
        };
      }
    }
  }

  if (provider === 'openai-compatible' || provider === 'auto') {
    if (config.openaiApiUrl) {
      openaiProvider = {
        apiUrl: config.openaiApiUrl,
        apiKey: config.openaiApiKey,
        model: config.openaiModel ?? 'llama3',
      };
      return { available: true, provider: 'openai-compatible' };
    }
  }

  return { available: false, provider: null, error: 'No LLM provider configured' };
}

export async function analyzeCodeWithLlm(content, options = {}) {
  const config = options.config ?? {};
  const analysisType = options.analysisType ?? 'codeAnalysis';

  if (!llamaProvider && !openaiProvider) {
    const initResult = await initializeLlmProvider(config);
    if (!initResult.available) {
      return null;
    }
  }

  const prompt = DEFAULT_PROMPTS[analysisType] + content;

  try {
    if (llamaProvider) {
      return await analyzeWithNodeLlamaCpp(prompt, config);
    }

    if (openaiProvider) {
      return await analyzeWithOpenAiCompatible(prompt, config);
    }

    return null;
  } catch (error) {
    console.error(`LLM analysis failed: ${error.message}`);
    return null;
  }
}

async function analyzeWithNodeLlamaCpp(prompt, config) {
  try {
    const { LlamaChatSession } = await import('node-llama-cpp');
    const modelsDir = config.modelsDir ?? join(homedir(), '.npm-verify', 'llm-models');
    const modelPath = config.modelPath ?? join(modelsDir, 'model.gguf');

    const model = await llamaProvider.loadModel({
      modelPath,
    });

    const context = model.createContext();
    const session = new LlamaChatSession({
      contextSequence: context.getSequence(),
    });

    const response = await session.prompt(prompt);

    return parseLlmResponse(response);
  } catch (error) {
    console.error(`node-llama-cpp analysis failed: ${error.message}`);
    return null;
  }
}

async function analyzeWithOpenAiCompatible(prompt, config) {
  try {
    const apiUrl = config.apiUrl ?? openaiProvider.apiUrl;
    const apiKey = config.apiKey ?? openaiProvider.apiKey;
    const model = config.model ?? openaiProvider.model;

    const headers = {
      'Content-Type': 'application/json',
    };

    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const response = await fetch(`${apiUrl}/v1/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: 'You are a security analysis assistant. Respond only with valid JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.1,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI-compatible API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in API response');
    }

    return parseLlmResponse(content);
  } catch (error) {
    console.error(`OpenAI-compatible analysis failed: ${error.message}`);
    return null;
  }
}

function parseLlmResponse(response) {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return parsed;
  } catch {
    return null;
  }
}

export function convertLlmFindingToFinding(llmResult, context) {
  if (!llmResult) {
    return null;
  }

  const findings = [];

  if (llmResult.isMalicious && llmResult.severity !== 'none') {
    findings.push({
      severity: llmResult.severity === 'high' ? 'high' : 'medium',
      source: 'local',
      rule: 'llm-code-analysis',
      package: context.package,
      file: context.file,
      detail: `LLM analysis: ${llmResult.reasoning}`,
      mlScore: llmResult.severity === 'high' ? 0.9 : 0.6,
      mlLayer: 4,
      blocking: llmResult.severity === 'high',
    });
  }

  if (llmResult.hasSensitiveData && llmResult.severity !== 'none') {
    findings.push({
      severity: llmResult.severity === 'high' ? 'high' : 'medium',
      source: 'local',
      rule: 'llm-sensitive-data',
      package: context.package,
      file: context.file,
      detail: `LLM detected sensitive data: ${llmResult.detectedTypes?.join(', ') || 'unknown'}. ${llmResult.reasoning}`,
      mlScore: llmResult.severity === 'high' ? 0.9 : 0.6,
      mlLayer: 4,
      blocking: llmResult.severity === 'high',
    });
  }

  return findings;
}
