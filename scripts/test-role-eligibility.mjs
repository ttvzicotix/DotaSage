import assert from 'node:assert/strict';
import { matchesLane } from '../src/engine/roleEligibility.js';

const shadowFiend = {
  localized_name: 'Shadow Fiend',
  roles: ['Carry', 'Nuker'],
  roleHints: ['mid'],
  lanes: ['mid'],
};
const mirana = {
  localized_name: 'Mirana',
  roles: ['Carry', 'Support', 'Escape', 'Nuker', 'Disabler'],
  roleHints: ['support', 'mid'],
  lanes: ['mid', 'roam'],
};
const antiMage = {
  localized_name: 'Anti-Mage',
  roles: ['Carry', 'Escape', 'Nuker'],
  roleHints: ['carry'],
  lanes: ['safe'],
};
const luna = {
  localized_name: 'Luna',
  roles: ['Carry', 'Nuker', 'Pusher'],
  roleHints: ['carry'],
  lanes: ['safe'],
};

assert.equal(matchesLane(shadowFiend, 'safe'), false, 'Shadow Fiend should not leak into Pos 1 from a generic Carry tag');
assert.equal(matchesLane(mirana, 'safe'), false, 'Mirana should not leak into Pos 1 from a generic Carry tag');
assert.equal(matchesLane(antiMage, 'safe'), true);
assert.equal(matchesLane(luna, 'safe'), true);
assert.equal(matchesLane(shadowFiend, 'mid'), true);
assert.equal(matchesLane(mirana, 'mid'), true);

console.log('Role eligibility regression: PASS');
