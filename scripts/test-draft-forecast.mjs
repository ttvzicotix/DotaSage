import assert from 'node:assert/strict';
import { forecastEnemyPicks, futureCounterScoreForCandidate } from '../src/engine/draftForecast.js';

const enemyCarry = { id: 1, localized_name: 'Enemy Carry', lanes: ['safe'], roles: ['Carry'], roleHints: ['carry'] };
const offCandidate = { id: 2, localized_name: 'Off Candidate', lanes: ['off'], roles: ['Durable', 'Initiator'], roleHints: ['offlane'] };
const duplicateCarry = { id: 3, localized_name: 'Duplicate Carry', lanes: ['safe'], roles: ['Carry'], roleHints: ['carry'] };
const ally = { id: 4, localized_name: 'Our Hero', lanes: ['mid'], roles: ['Nuker'], roleHints: ['mid'] };

const heroes = [enemyCarry, offCandidate, duplicateCarry, ally];
const statById = new Map(heroes.map(hero => [hero.id, { id: hero.id, pub_pick: 1000, pub_win: 500 }]));

const forecast = forecastEnemyPicks({
  heroes,
  enemyHeroes: [enemyCarry],
  allyHeroes: [ally],
  usedIds: new Set([enemyCarry.id, ally.id]),
  statById,
  matchupByCandidate: new Map(),
  limit: 2,
});

assert.equal(forecast[0].hero.id, offCandidate.id, 'forecast should prefer filling an uncovered role over duplicating an occupied role');
assert.equal(forecast.some(row => row.hero.id === enemyCarry.id), false, 'used heroes must never be forecast');

const future = futureCounterScoreForCandidate({
  candidate: ally,
  forecast: [{ hero: offCandidate }, { hero: duplicateCarry }],
  forecastMatrices: new Map([
    [offCandidate.id, [{ hero_id: ally.id, games_played: 1000, wins: 650 }]],
  ]),
  statById,
});

assert.ok(future.evidence > 0, 'future risk should use forecast matchup evidence when available');
assert.ok(future.score < 0, 'a predicted enemy winning 65% of the pair should be a negative future matchup for our candidate');

console.log('Draft forecast regression: PASS');
