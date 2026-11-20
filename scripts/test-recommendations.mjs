import assert from 'node:assert/strict';
import { diversifyRecommendations as rank } from '../src/engine/recommendations.js';
import { matchesLane } from '../src/engine/roleEligibility.js';
const row = (id, fit, roles, extra = {}) => ({hero: {id, roles, lanes: ['mid'], localized_name: String(id)}, score: {draftFit: fit, overall: fit, counterCoverage: 1, worstCounterScore: 0, ...extra}});
const strong = row(1, 9, ['Carry', 'Nuker']);
const similar = row(2, 8.9, ['Carry', 'Nuker']);
const distinct = row(3, 8.85, ['Initiator', 'Pusher']);
assert.deepEqual(rank([strong, similar, distinct]).map(x => x.hero.id), [1,3,2]);
assert.equal(rank([strong, row(4, 8.1, ['Support']), similar])[1].hero.id, 2, 'large score gap overrides novelty');
assert.equal(rank([strong, similar, {...distinct, score: {...distinct.score, counterCoverage: 0}}])[1].hero.id, 2, 'missing evidence cannot earn promotion');
assert.equal(rank([strong, similar, {...distinct, score: {...distinct.score, worstCounterScore: -8}}])[1].hero.id, 2);
assert.deepEqual(rank([distinct, strong, similar]), rank([similar, distinct, strong]), 'input order independent');
assert.equal(rank([strong, similar, distinct])[0].hero.id, 1, 'the numerical winner is never demoted');
// Changed empirical counter/synergy evidence changes the winner without a diversity quota.
assert.equal(rank([strong, {...distinct, score: {...distinct.score, draftFit: 9.5}}])[0].hero.id, 3);
const banned = new Set([1]);
assert.ok(rank([strong, similar, distinct].filter(x => !banned.has(x.hero.id) && matchesLane(x.hero, 'mid'))).every(x => x.hero.id !== 1));
assert.equal(rank([strong, similar].filter(x => matchesLane(x.hero, 'support5'))).length, 0);
assert.deepEqual(rank([]), []);
console.log('Deterministic diversity, eligibility, bans and evidence guardrails: PASS');

// Exercise the production counter + ally scoring on controlled empirical fixtures.
const { pairCounterScore, aggregateEnemyScore, compositionSynergyScore, draftFitScore } = await import('../src/engine/scoring.js');
const candidates = [row(10, 0, ['Carry', 'Nuker']), row(11, 0, ['Initiator', 'Durable']), row(12, 0, ['Pusher', 'Disabler'])];
function draftRanking(wins, allies = [], missing = false) {
  return rank(candidates.map((candidate, index) => {
    const pairs = missing && index === 2 ? [] : wins[index].map(pairWins => pairCounterScore({pairWins, pairGames: 1000}));
    const synergyScore = compositionSynergyScore(candidate.hero, allies);
    const counterCoverage = pairs.length / 3;
    const draftFit = draftFitScore({enemyScore: aggregateEnemyScore(pairs), synergyScore, metaScore: 5, counterEvidenceCount: pairs.length, counterCoverage, worstCounterScore: Math.min(0, ...pairs.map(pair => pair.score))});
    return {...candidate, pairs, score: {...candidate.score, draftFit, overall: draftFit, counterCoverage}};
  }));
}
// Each row represents evidence against three enemies in a composition.
const illusionDraft = [[540, 535, 530], [505, 510, 505], [490, 500, 510]];
const burstDraft = [[490, 495, 500], [540, 535, 530], [510, 505, 500]];
const pushDraft = [[500, 495, 500], [510, 500, 505], [540, 535, 530]];
assert.equal(draftRanking(illusionDraft)[0].hero.id, 10);
assert.equal(draftRanking(burstDraft)[0].hero.id, 11);
assert.equal(draftRanking(pushDraft)[0].hero.id, 12);
assert.notEqual(draftRanking(pushDraft, [], true)[0].hero.id, 12, 'missing pairs cannot retain fabricated advantage');
const noEnemy = allies => rank(candidates.map(candidate => {
  const fit = draftFitScore({enemyScore: 0, synergyScore: compositionSynergyScore(candidate.hero, allies), metaScore: 5});
  return {...candidate, score: {...candidate.score, draftFit: fit, overall: fit, counterCoverage: 0}};
}));
assert.notEqual(noEnemy([{roles: ['Carry']}])[0].hero.id, noEnemy([{roles: ['Initiator', 'Durable']}])[0].hero.id, 'allied composition changes fallback fit');
console.log('Enemy-composition and allied-synergy scoring integration: PASS');

assert.equal(draftRanking([[540,535,530],[505,510,505],[490,500,510]])[0].hero.id, draftRanking([[535,540,535],[510,505,510],[500,490,500]])[0].hero.id, 'the same hero remains first when evidence warrants it across drafts');

const pool = Array.from({length: 40}, (_, i) => row(100 + i, 8 - i * 0.005, ['Carry', 'Nuker']));
const first = rank(pool, pool.length).slice(0, 18);
const recentIds = first.slice(1).map(row => row.hero.id);
const second = rank(pool, pool.length, { recentIds }).slice(0, 18);
assert.equal(first[0].hero.id, second[0].hero.id, 'fresh alternatives preserve the strongest pick');
assert.ok(second.slice(1).filter(row => !recentIds.includes(row.hero.id)).length >= 12, 'near-equivalent pool should surface substantially new heroes');
assert.equal(new Set(second.map(row => row.hero.id)).size, second.length);
assert.deepEqual(rank(pool, pool.length, {recentIds}), rank([...pool].reverse(), pool.length, {recentIds}), 'history ranking remains deterministic');
assert.equal(rank([strong, similar, row(70, 7.5, ['Support'])], 18, {recentIds: [2]})[1].hero.id, 2, 'novelty cannot promote a clearly worse hero');
assert.equal(rank([strong, similar, {...distinct, score: {...distinct.score, counterCoverage: 0}}], 18, {recentIds:[2]})[1].hero.id, 2, 'freshness cannot override evidence coverage');
console.log('Repeat-exposure variety, uniqueness and quality bounds: PASS');
