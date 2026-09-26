import fs from 'node:fs';
import assert from 'node:assert/strict';

const app = fs.readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const connect = fs.readFileSync(new URL('../src/components/CompactPlayerConnect.jsx', import.meta.url), 'utf8');
const grid = fs.readFileSync(new URL('../src/components/HeroGrid.jsx', import.meta.url), 'utf8');
const gameplan = fs.readFileSync(new URL('../src/components/GamePlan.jsx', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../src/styles/viewport-resilience.css', import.meta.url), 'utf8');

assert.equal(connect.includes('identity-v28'), true, 'connected player identity should render in the left rail');
assert.equal(connect.includes('player?.profile?.personaname'), true, 'left rail should prefer the resolved player name');
assert.equal(connect.includes('player?.profile?.avatarfull'), true, 'left rail should prefer the resolved player avatar');
assert.equal(app.includes('player={player} loading={profileLoading}'), true, 'App should pass resolved identity to the left rail');
assert.equal(app.includes('<PlayerProfile '), false, 'advanced profile should not be dumped below the draft');

assert.equal(grid.includes('beginnerMode ? 14 : 16'), true, 'quick picker should expose more heroes');
assert.equal(css.includes('overflow-x:auto!important'), true, 'quick picker should stay in a horizontal strip');
assert.equal(css.includes('flex:0 0 104px!important'), true, 'quick hero cards should stay compact');

assert.equal(gameplan.includes("['coach', 'COACH']"), true, 'advanced game plan should have Coach tab');
assert.equal(gameplan.includes("['build', 'BUILD']"), true, 'advanced game plan should have Build tab');
assert.equal(gameplan.includes("['map', 'MAP']"), true, 'advanced game plan should have Map tab');
assert.equal(gameplan.includes("['matchups', 'MATCHUPS']"), true, 'advanced game plan should have Matchups tab');
assert.equal(gameplan.includes("advancedTab === 'build'"), true, 'build workspace should be tab-scoped');
assert.equal(gameplan.includes('<SkillBuild hero={hero} />'), true, 'advanced Build must include level-by-level skill guidance');
assert.equal(gameplan.includes('<SimpleItemPlan'), true, 'advanced Build should use adaptive item paths');
assert.equal(gameplan.includes('THIS GAME IN 30 SECONDS'), false, 'old wall-of-text advanced briefing should be removed');

console.log('v0.28 layout regression: PASS');
