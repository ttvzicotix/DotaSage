import fs from 'node:fs';
import assert from 'node:assert/strict';

const grid = fs.readFileSync(new URL('../src/components/HeroGrid.jsx', import.meta.url), 'utf8');
const advisor = fs.readFileSync(new URL('../src/components/RecommendationPanel.jsx', import.meta.url), 'utf8');

assert.equal(grid.includes("(hero.roles || []).slice"), false, 'quick hero cards must not print role text');
assert.equal(grid.includes('hero-card-v27-art'), true, 'quick hero cards need a dedicated portrait container');
assert.equal(grid.includes('hero-card-v27-actions'), true, 'quick hero actions must live outside the portrait');

assert.equal(advisor.includes('pick-confidence-badge'), false, 'confidence must not overlay the recommendation portrait');
assert.equal(advisor.includes('TOP RECOMMENDATION'), false, 'simple advisor should not repeat recommendation labels');
assert.equal(advisor.includes('pick-card-v27'), true, 'v0.27 recommendation card should use conflict-free markup');
assert.equal(advisor.includes('enemy-forecast-v27'), true, 'next-pick forecast strip should be available');

console.log('v0.27 UI regression: PASS');
