const HIGH_SIGNAL_KEYWORDS = [
  'eval',
  'child_process',
  'process.env',
  'buffer.from',
  'base64',
  'atob',
  'btoa',
  'fetch',
  'http.request',
  'https.request',
  'exec',
  'execsync',
  'spawn',
  'spawnSync',
  'webhook',
  'discord',
  'telegram',
  'wget',
  'curl',
  'powershell',
  'invoke-webrequest',
  'os.hostname',
  'os.userinfo',
  'api_key',
  'secret',
  'password',
];

const CONTEXT_KEYWORDS = [
  'require',
  'function',
  'crypto',
  'token',
  'dotenv',
  'fs.readfile',
  'fs.writefile',
];

const CODE_BIGRAMS = [
  'process.env fetch',
  'eval base64',
  'child_process exec',
  'buffer.from base64',
  'require child_process',
  'fetch process.env',
  'new function',
  'execsync spawn',
];

const CODE_KEYWORDS = [...HIGH_SIGNAL_KEYWORDS, ...CONTEXT_KEYWORDS];

export function tokenizeCode(content) {
  const normalized = content.toLowerCase().replace(/\s+/g, ' ');
  const tokens = new Map();

  for (const keyword of HIGH_SIGNAL_KEYWORDS) {
    const count = countOccurrences(normalized, keyword);
    if (count > 0) {
      tokens.set(keyword, count);
    }
  }

  for (const bigram of CODE_BIGRAMS) {
    const count = countOccurrences(normalized, bigram);
    if (count > 0) {
      tokens.set(`__bigram__:${bigram}`, count);
    }
  }

  if (hasSuspiciousContext(tokens, normalized)) {
    for (const keyword of CONTEXT_KEYWORDS) {
      const count = countOccurrences(normalized, keyword);
      if (count > 0) {
        tokens.set(keyword, count);
      }
    }
  }

  return tokens;
}

function hasSuspiciousContext(tokens, normalized) {
  if (tokens.size > 0) {
    return true;
  }

  return CODE_BIGRAMS.some((bigram) => countOccurrences(normalized, bigram) > 0);
}

export function tokenizeText(text, threatKeywords = {}) {
  const cleaned = stripHtml(text).toLowerCase();
  const words = cleaned.match(/[a-z0-9._-]+/g) ?? [];
  const tokens = new Map();

  for (const word of words) {
    tokens.set(word, (tokens.get(word) ?? 0) + 1);
  }

  for (const [level, phrases] of Object.entries(threatKeywords)) {
    for (const phrase of phrases ?? []) {
      const count = countOccurrences(cleaned, phrase.toLowerCase());
      if (count > 0) {
        tokens.set(`__threat__:${level}:${phrase}`, count);
      }
    }
  }

  return tokens;
}

export function tokensToVector(tokens, vocabulary) {
  const vector = new Array(vocabulary.length).fill(0);
  for (let i = 0; i < vocabulary.length; i += 1) {
    const term = vocabulary[i];
    vector[i] = tokens.get(term) ?? 0;
  }
  return vector;
}

export function normalizeVector(vector) {
  const total = vector.reduce((sum, value) => sum + value, 0) || 1;
  return vector.map((value) => value / total);
}

function countOccurrences(haystack, needle) {
  if (!needle) {
    return 0;
  }
  let count = 0;
  let index = haystack.indexOf(needle);
  while (index !== -1) {
    count += 1;
    index = haystack.indexOf(needle, index + needle.length);
  }
  return count;
}

function stripHtml(text) {
  return text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export { CODE_KEYWORDS, CODE_BIGRAMS, HIGH_SIGNAL_KEYWORDS, CONTEXT_KEYWORDS };
