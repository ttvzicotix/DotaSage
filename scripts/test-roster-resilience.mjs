import fs from 'node:fs';
import assert from 'node:assert/strict';

const app = fs.readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const service = fs.readFileSync(new URL('../src/services/openDota.js', import.meta.url), 'utf8');
const fallbackSource = fs.readFileSync(new URL('../src/data/fallbackHeroes.js', import.meta.url), 'utf8');

assert.equal(
  app.includes('Promise.all([fetchHeroes(), fetchHeroStats()])'),
  false,
  'hero roster must not fail just because heroStats fails',
);

assert.equal(
  app.includes('Promise.allSettled(['),
  true,
  'hero roster and stats should settle independently',
);

assert.equal(
  service.includes("const HERO_CACHE_KEY = 'heroes:v3'"),
  true,
  'hero roster must use a fresh cache namespace',
);

assert.equal(
  service.includes('live.length < 100'),
  true,
  'empty/truncated live hero rosters must be rejected',
);

const start = fallbackSource.indexOf('[');
const end = fallbackSource.lastIndexOf('].map');
const json = end > start
  ? fallbackSource.slice(start, end + 1)
  : fallbackSource.slice(start, fallbackSource.lastIndexOf(']') + 1);
const fallback = JSON.parse(json).filter(hero => hero?.id && hero?.localized_name);
assert.ok(fallback.length >= 120, `bundled fallback roster unexpectedly small: ${fallback.length}`);

console.log(`Hero roster resilience regression: PASS (${fallback.length} fallback heroes)`);
