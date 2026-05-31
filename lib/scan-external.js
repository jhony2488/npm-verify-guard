import { readFile, writeFile } from 'node:fs/promises';
import { XMLParser } from 'fast-xml-parser';
import { GLOBAL_CACHE_DIR, ensureGlobalDirs, fileExists, getDataPath, getProjectPaths, loadGlobalConfig } from './config.js';
import { triageNewsItems } from './ml/triage-news.js';

const CACHE_FILE = `${GLOBAL_CACHE_DIR}/advisories.json`;
const CACHE_TTL_MS = 60 * 60 * 1000;
const OSV_BATCH_SIZE = 10;

export async function scanExternal(projectRoot, projectConfig, options = {}) {
  if (projectConfig.external?.enabled === false) {
    return [];
  }

  const fetchFn = options.fetchFn ?? globalThis.fetch;
  const dependencies = await loadDependencies(projectRoot);
  const findings = [];

  if (dependencies.length === 0) {
    return findings;
  }

  const osvFindings = await queryOsv(dependencies, fetchFn);
  findings.push(...osvFindings);

  const newsFindings = await queryNewsFeeds(dependencies, fetchFn, options);
  findings.push(...newsFindings);

  return findings;
}

async function loadDependencies(projectRoot) {
  const paths = getProjectPaths(projectRoot);
  const deps = new Map();

  if (await fileExists(paths.packageLock)) {
    const lock = JSON.parse(await readFile(paths.packageLock, 'utf8'));
    if (lock.packages) {
      for (const [pkgPath, meta] of Object.entries(lock.packages)) {
        if (!meta.version || pkgPath === '') {
          continue;
        }
        const name = pkgPath.replace(/^node_modules\//, '');
        deps.set(name, meta.version);
      }
    }
  }

  if (deps.size === 0 && (await fileExists(paths.packageJson))) {
    const pkg = JSON.parse(await readFile(paths.packageJson, 'utf8'));
    for (const section of ['dependencies', 'devDependencies', 'optionalDependencies']) {
      for (const [name, version] of Object.entries(pkg[section] ?? {})) {
        deps.set(name, version.replace(/^[\^~]/, ''));
      }
    }
  }

  return [...deps.entries()].map(([name, version]) => ({ name, version }));
}

async function queryOsv(dependencies, fetchFn) {
  const feeds = JSON.parse(await readFile(getDataPath('default-feeds.json'), 'utf8'));
  const findings = [];

  for (let i = 0; i < dependencies.length; i += OSV_BATCH_SIZE) {
    const chunk = dependencies.slice(i, i + OSV_BATCH_SIZE);
    const responses = await Promise.all(
      chunk.map(async (dep) => {
        const response = await fetchFn(feeds.osvApi, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            package: { name: dep.name, ecosystem: 'npm' },
            version: dep.version,
          }),
        });

        if (!response.ok) {
          throw new Error(`OSV API error (${response.status}) for ${dep.name}`);
        }

        return { dep, data: await response.json() };
      }),
    );

    for (const { dep, data } of responses) {
      for (const vuln of data.vulns ?? []) {
        const severity = mapOsvSeverity(vuln);
        findings.push({
          severity,
          source: 'external',
          rule: 'osv-vulnerability',
          package: dep.name,
          detail: `${vuln.id}: ${vuln.summary ?? 'Known vulnerability'}`,
          blocking: severity === 'high',
        });
      }
    }
  }

  return findings;
}

function mapOsvSeverity(vuln) {
  const score = vuln.severity?.[0]?.score ?? '';
  if (/CRITICAL|HIGH|9\.|8\./i.test(score) || /critical|high/i.test(vuln.summary ?? '')) {
    return 'high';
  }
  if (/MEDIUM|MODERATE|7\.|6\.|5\.|4\./i.test(score)) {
    return 'medium';
  }
  return 'low';
}

async function queryNewsFeeds(dependencies, fetchFn, options = {}) {
  const cache = await loadCache();
  let items;

  if (cache && Date.now() - cache.updatedAt < CACHE_TTL_MS) {
    items = cache.items;
  } else {
    const feeds = JSON.parse(await readFile(getDataPath('default-feeds.json'), 'utf8'));
    const parser = new XMLParser({ ignoreAttributes: false });
    items = [];

    for (const feedUrl of feeds.rssFeeds ?? []) {
      try {
        const response = await fetchFn(feedUrl);
        if (!response.ok) {
          continue;
        }
        const xml = await response.text();
        const parsed = parser.parse(xml);
        const feedItems = normalizeFeedItems(parsed);
        items.push(...feedItems);
      } catch {
        // degraded mode: skip failed feed
      }
    }

    await saveCache(items);
  }

  const globalConfig = await loadGlobalConfig();
  const mlConfig = { ...globalConfig.ml, ...options.mlConfig };

  return triageNewsItems(items, dependencies, {
    deepScan: options.deepScan,
    mlConfig,
  });
}

function normalizeFeedItems(parsed) {
  const channel = parsed.rss?.channel ?? parsed.feed ?? parsed['rdf:RDF']?.channel;
  const rawItems = channel?.item ?? channel?.entry ?? [];
  const list = Array.isArray(rawItems) ? rawItems : [rawItems];

  return list
    .filter(Boolean)
    .map((item) => ({
      title: item.title?.['#text'] ?? item.title ?? '',
      link: item.link?.['@_href'] ?? item.link ?? '',
      description: item.description ?? item.summary ?? item['content:encoded'] ?? '',
      pubDate: item.pubDate ?? item.updated ?? item.published ?? '',
    }));
}

function matchNewsAlerts(items, dependencies) {
  const depNames = dependencies.map((dep) => dep.name);
  const findings = [];

  for (const item of items) {
    const haystack = `${item.title} ${item.description}`.toLowerCase();
    for (const depName of depNames) {
      if (haystack.includes(depName.toLowerCase())) {
        findings.push({
          severity: 'medium',
          source: 'external',
          rule: 'security-news-alert',
          package: depName,
          detail: item.title,
          blocking: false,
        });
      }
    }
  }

  return findings;
}

async function loadCache() {
  if (!(await fileExists(CACHE_FILE))) {
    return null;
  }

  return JSON.parse(await readFile(CACHE_FILE, 'utf8'));
}

async function saveCache(items) {
  await ensureGlobalDirs();
  await writeFile(
    CACHE_FILE,
    `${JSON.stringify({ updatedAt: Date.now(), items }, null, 2)}\n`,
    'utf8',
  );
}

export { loadDependencies, matchNewsAlerts, normalizeFeedItems };
