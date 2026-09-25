import fs from 'node:fs';
import assert from 'node:assert/strict';

const app = fs.readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const grid = fs.readFileSync(new URL('../src/components/HeroGrid.jsx', import.meta.url), 'utf8');

assert.equal(
  grid.includes("(hero.roles || []).slice(0, 2).join(' · ')"),
  false,
  'quick hero cards should not print role tags over/under the portrait',
);

assert.equal(
  grid.includes('hero-card-v27-foot'),
  true,
  'hero actions should live in a separate footer',
);

assert.equal(
  grid.includes('onPrefetchEvidence'),
  true,
  'visible/search heroes should prefetch counter evidence',
);

assert.equal(
  app.includes('await Promise.all(draft.enemies.map'),
  false,
  'enemy counter refresh must not wait for an all-or-nothing batch',
);

assert.equal(
  app.includes('setEnemyMatrix(previous => new Map(previous).set(Number(hero.id), prefetched))'),
  true,
  'prefetched enemy evidence should seed the matrix before the draft update',
);

assert.equal(
  app.includes('if (beginnerMode || !draft.allies.length)'),
  true,
  'simple mode should skip nonessential empirical ally-synergy network work',
);

assert.equal(
  app.includes('if (beginnerMode || !selected.length)'),
  true,
  'simple mode should skip nonessential duration analytics',
);

console.log('Draft responsiveness regression: PASS');
