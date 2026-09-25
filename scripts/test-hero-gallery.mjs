import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('../src/components/HeroGrid.jsx', import.meta.url), 'utf8');

assert.equal(
  source.includes("{query.trim() && <div className=\"quick-hero-shelf"),
  false,
  'hero gallery must not disappear when search is empty',
);

assert.equal(
  source.includes('persistent-hero-gallery'),
  true,
  'persistent hero gallery should render in the normal draft view',
);

assert.equal(
  source.includes("laneFilter === 'all' ? allHeroes : roleHeroes"),
  true,
  'default gallery should use role-relevant heroes when a role is selected',
);

console.log('Hero gallery regression: PASS');
