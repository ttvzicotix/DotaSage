import fs from 'node:fs';
import assert from 'node:assert/strict';

const advisor = fs.readFileSync(new URL('../src/components/RecommendationPanel.jsx', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const gameplan = fs.readFileSync(new URL('../src/components/GamePlan.jsx', import.meta.url), 'utf8');
const itemPlan = fs.readFileSync(new URL('../src/components/SimpleItemPlan.jsx', import.meta.url), 'utf8');
const styles = fs.readFileSync(new URL('../src/styles/viewport-resilience.css', import.meta.url), 'utf8');

assert.match(advisor, /const top = recommendations\[0\]/, 'the primary recommendation must be the first rank');
assert.match(advisor, /recommendations\.slice\(1,\s*9\)\.map\(/, 'render eight alternatives after the primary pick');
assert.match(advisor, /<PrimaryPick entry=\{top\}/, 'render the primary pick alongside alternatives');
assert.match(advisor, /className="advisor-controls-v27"[\s\S]*className="role-tabs-v27"[\s\S]*className="advisor-mode-tabs-v27"/, 'both selectors should share the advisor control bar');
assert.match(advisor, /className="role-tabs-v27" role="group" aria-label="Choose role"/, 'role selector needs an accessible group label');
assert.match(advisor, /className="advisor-mode-tabs-v27" role="group" aria-label="Choose recommendation strategy"/, 'mode selector needs an accessible group label');
assert.match(advisor, /aria-pressed=\{laneFilter === key\}/, 'position selection must be exposed to assistive technology');
assert.match(advisor, /aria-pressed=\{advisorMode === key\}/, 'strategy selection must be exposed to assistive technology');
assert.match(advisor, /onClick=\{\(\) => setLaneFilter\(key\)\}/, 'position buttons must update the filter');
assert.match(advisor, /onClick=\{\(\) => setAdvisorMode\(key\)\}/, 'strategy buttons must update the mode');
for (const mode of ['best', 'counter', 'meta', 'personal', 'learn']) {
  assert.ok(advisor.includes("['" + mode + "',"), 'recommendation strategy ' + mode + ' should remain selectable');
}
assert.equal((advisor.match(/\['(?:best|counter|meta|personal|learn)',/g) || []).length, 5, 'render all five modes exactly once');
assert.doesNotMatch(advisor, /<select value=\{advisorMode\}/, 'strategy should no longer be hidden in Details');
assert.match(app, /<RecommendationPanel[^>]*advisorMode=\{advisorMode\} setAdvisorMode=\{setAdvisorMode\}/, 'App must wire selection state to the component');
assert.match(app, /<GamePlan\b[^\n]*enemyItemPopularity=\{enemyItemPopularity\}/, 'enemy popularity should reach the item plan');
assert.match(gameplan, /conditionalItems\(hero, draft\.enemies \|\| \[\], allItems, observedCounts, enemyItemPopularity\)/, 'plan must call the tested recommendation engine');
assert.match(itemPlan, /conditionals\.slice\(0,\s*6\)/, 'six conditional pivots should be visible');
assert.match(styles, /\.advisor-mode-tabs-v27\s*\{/, 'mode styles should exist in the compact advisor');
assert.match(styles, /\.alt-picks-v27\s*\{/, 'alternative picks should have responsive compact styling');

console.log('Expanded nine-pick advisor, role/strategy controls and item-plan wiring: PASS');
