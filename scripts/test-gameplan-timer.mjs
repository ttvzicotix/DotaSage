import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('../src/components/GamePlan.jsx', import.meta.url), 'utf8');

assert.equal(
  source.includes('const [phase, window] = phaseForMinute(minute)'),
  false,
  'MatchContext must never shadow the browser window object',
);

assert.equal(
  source.includes('window.setInterval'),
  true,
  'manual timer should still use the browser interval API',
);

assert.equal(
  source.includes('const [phase, phaseWindow] = phaseForMinute(minute)'),
  true,
  'phase label should use a non-global variable name',
);

console.log('Game Plan timer regression: PASS');
