const CODE_KEYWORDS = [
  'eval',
  'function',
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
  'require',
  'fs.readfile',
  'fs.writefile',
  'crypto',
  'webhook',
  'discord',
  'telegram',
  'wget',
  'curl',
  'powershell',
  'invoke-webrequest',
  'os.hostname',
  'os.userinfo',
  'dotenv',
  'api_key',
  'secret',
  'password',
  'token',
];

const CODE_BIGRAMS = [
  'process.env fetch',
  'eval base64',
  'child_process exec',
  'buffer.from base64',
  'require child_process',
  'fetch process.env',
];

export function tokenizeCode(content) {
  const normalized = content.toLowerCase().replace(/\s+/g, ' ');
  const tokens = new Map();

  for (const keyword of CODE_KEYWORDS) {
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

  return tokens;
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

export { CODE_KEYWORDS, CODE_BIGRAMS };
