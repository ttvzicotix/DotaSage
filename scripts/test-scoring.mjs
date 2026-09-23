import assert from 'node:assert/strict';
import {
  aggregateSynergyScore,
  draftFitScore,
  pairSynergyScore,
} from '../src/engine/scoring.js';

const noSample = pairSynergyScore({ pairWins: 0, pairGames: 0 });
assert.equal(noSample.score, 0);
assert.equal(noSample.confidence, 0);

const positive = pairSynergyScore({
  pairWins: 280,
  pairGames: 500,
  candidateBase: 0.50,
  allyBase: 0.50,
});
assert.ok(positive.score > 0, 'above-expected same-team win rate should score positively');
assert.equal(positive.confidence, 1);

const negative = pairSynergyScore({
  pairWins: 220,
  pairGames: 500,
  candidateBase: 0.50,
  allyBase: 0.50,
});
assert.ok(negative.score < 0, 'below-expected same-team win rate should score negatively');

const aggregate = aggregateSynergyScore([positive, positive]);
assert.ok(aggregate > 0 && aggregate <= 10);

const strongFit = draftFitScore({
  enemyScore: 2,
  synergyScore: 6,
  metaScore: 5,
  counterEvidenceCount: 4,
  counterCoverage: 1,
  worstCounterScore: 0,
});
const weakFit = draftFitScore({
  enemyScore: 2,
  synergyScore: -6,
  metaScore: 5,
  counterEvidenceCount: 4,
  counterCoverage: 1,
  worstCounterScore: 0,
});
assert.ok(strongFit > weakFit, 'ally synergy should still break close counter ties');

const betterCounter = draftFitScore({
  enemyScore: 6,
  synergyScore: -8,
  metaScore: 4,
  counterEvidenceCount: 4,
  counterCoverage: 1,
  worstCounterScore: 1,
});
const prettySynergyBadCounter = draftFitScore({
  enemyScore: -2,
  synergyScore: 10,
  metaScore: 9,
  counterEvidenceCount: 4,
  counterCoverage: 1,
  worstCounterScore: -5,
});
assert.ok(
  betterCounter > prettySynergyBadCounter,
  'verified counter advantage must dominate synergy/meta in BEST PICK',
);

const fullCoverage = draftFitScore({
  enemyScore: 3,
  synergyScore: 0,
  metaScore: 5,
  counterEvidenceCount: 4,
  counterCoverage: 1,
  worstCounterScore: 0,
});
const partialCoverage = draftFitScore({
  enemyScore: 3,
  synergyScore: 0,
  metaScore: 5,
  counterEvidenceCount: 2,
  counterCoverage: 0.5,
  worstCounterScore: 0,
});
assert.ok(fullCoverage > partialCoverage, 'missing matchup evidence should lower ranking confidence/score');

const noCounterData = draftFitScore({
  enemyScore: 0,
  synergyScore: 4,
  metaScore: 6,
  counterEvidenceCount: 0,
  counterCoverage: 0,
  worstCounterScore: 0,
});
assert.ok(noCounterData > 0, 'advisor should still provide a fallback before enemy evidence exists');

console.log('Empirical ally synergy scoring regression: PASS');
