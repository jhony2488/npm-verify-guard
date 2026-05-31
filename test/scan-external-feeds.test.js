import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeFeedItems } from '../lib/scan-external.js';

test('normalizeFeedItems handles multiple RSS items', () => {
  const items = normalizeFeedItems({
    rss: {
      channel: {
        item: [
          { title: 'First', description: 'alpha' },
          { title: 'Second', description: 'beta' },
        ],
      },
    },
  });

  assert.equal(items.length, 2);
  assert.equal(items[1].title, 'Second');
});

test('normalizeFeedItems handles single item object', () => {
  const items = normalizeFeedItems({
    rss: {
      channel: {
        item: { title: 'Only one', description: 'single item feed' },
      },
    },
  });

  assert.equal(items.length, 1);
});

test('normalizeFeedItems extracts atom link href attribute', () => {
  const items = normalizeFeedItems({
    feed: {
      entry: {
        title: 'Atom entry',
        link: { '@_href': 'https://example.com/advisory' },
        summary: 'details',
        updated: '2026-01-01',
      },
    },
  });

  assert.equal(items[0].link, 'https://example.com/advisory');
});

test('normalizeFeedItems skips empty channel', () => {
  const items = normalizeFeedItems({ rss: { channel: {} } });
  assert.equal(items.length, 0);
});
