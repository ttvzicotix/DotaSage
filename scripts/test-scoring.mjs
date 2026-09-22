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

const strongFit = draftFitScore({ enemyScore: 2, synergyScore: 6, metaScore: 5 });
const weakFit = draftFitScore({ enemyScore: 2, synergyScore: -6, metaScore: 5 });
assert.ok(strongFit > weakFit, 'empirical ally synergy should affect draft ranking directionally');

console.log('Empirical ally synergy scoring regression: PASS');
