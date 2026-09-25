import { compositionSynergyScore, heroBaseWinRate, pairCounterScore } from './scoring';
import { matchesLane } from './roleEligibility';

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const positions = ['safe', 'mid', 'off', 'support4', 'support5'];

function normalizedPopularity(stat, maxPicks) {
  const picks = Number(stat?.pub_pick || 0);
  if (!picks || !maxPicks) return 0;
  return clamp(Math.log10(picks + 1) / Math.log10(maxPicks + 1), 0, 1);
}

function metaSignal(stat) {
  const wr = heroBaseWinRate(stat);
  return clamp(0.5 + (wr - 0.5) * 8, 0, 1);
}

function roleGapSignal(hero, enemyHeroes) {
  const candidatePositions = positions.filter(position => matchesLane(hero, position));
  if (!candidatePositions.length) return 0.35;

  const gaps = candidatePositions.map(position => {
    const occupancy = enemyHeroes.filter(row => matchesLane(row, position)).length;
    if (occupancy === 0) return 1;
    if (occupancy === 1) return 0.45;
    return 0.12;
  });
  return Math.max(...gaps);
}

function threatIntoAllies(candidate, allies, matchupRows, statById) {
  if (!allies.length || !Array.isArray(matchupRows) || !matchupRows.length) {
    return { signal: 0.5, score: 0, evidence: 0 };
  }

  const pairs = [];
  for (const ally of allies) {
    const row = matchupRows.find(sample => Number(sample.hero_id) === Number(ally.id));
    const games = Number(row?.games_played || 0);
    if (!row || !games) continue;

    // Rows come from /heroes/{candidate}/matchups and row.wins belongs to the
    // queried candidate hero, so no inversion is needed here.
    const result = pairCounterScore({
      pairWins: Number(row.wins || 0),
      pairGames: games,
      candidateBase: heroBaseWinRate(statById.get(Number(candidate.id))),
      enemyBase: heroBaseWinRate(statById.get(Number(ally.id))),
    });
    pairs.push(result);
  }

  if (!pairs.length) return { signal: 0.5, score: 0, evidence: 0 };
  const weighted = pairs.reduce((sum, row) => sum + Number(row.score || 0) * Number(row.confidence || 0), 0);
  const weights = pairs.reduce((sum, row) => sum + Number(row.confidence || 0), 0) || 1;
  const score = clamp(weighted / weights, -10, 10);
  return { signal: clamp((score + 10) / 20, 0, 1), score, evidence: pairs.length };
}

export function forecastEnemyPicks({
  heroes = [],
  enemyHeroes = [],
  allyHeroes = [],
  usedIds = new Set(),
  statById = new Map(),
  matchupByCandidate = new Map(),
  limit = 6,
} = {}) {
  const maxPicks = Math.max(1, ...heroes.map(hero => Number(statById.get(Number(hero.id))?.pub_pick || 0)));

  return heroes
    .filter(hero => hero?.id && !usedIds.has(Number(hero.id)))
    .map(hero => {
      const stat = statById.get(Number(hero.id));
      const popularity = normalizedPopularity(stat, maxPicks);
      const meta = metaSignal(stat);
      const gap = roleGapSignal(hero, enemyHeroes);
      const synergy = clamp((compositionSynergyScore(hero, enemyHeroes) + 10) / 20, 0, 1);
      const threat = threatIntoAllies(hero, allyHeroes, matchupByCandidate.get(Number(hero.id)), statById);

      // This is a plausibility ranking, not a probability model. Popularity and
      // draft completion dominate; matchup threat becomes useful when evidence exists.
      const threatWeight = threat.evidence ? 0.18 : 0;
      const baseWeight = 1 - threatWeight;
      const score = (
        popularity * 0.34 +
        gap * 0.31 +
        synergy * 0.20 +
        meta * 0.15
      ) * baseWeight + threat.signal * threatWeight;

      return {
        hero,
        score,
        popularity,
        roleGap: gap,
        synergy,
        meta,
        threatScore: threat.score,
        threatEvidence: threat.evidence,
      };
    })
    .sort((a, b) => b.score - a.score || b.popularity - a.popularity || a.hero.localized_name.localeCompare(b.hero.localized_name))
    .slice(0, limit);
}

export function futureCounterScoreForCandidate({
  candidate,
  forecast = [],
  forecastMatrices = new Map(),
  statById = new Map(),
} = {}) {
  if (!candidate || !forecast.length) return { score: 0, evidence: 0 };

  const weighted = [];
  const forecastWeights = [1, 0.68, 0.42];

  forecast.slice(0, 3).forEach((prediction, index) => {
    const rows = forecastMatrices.get(Number(prediction.hero.id)) || [];
    const row = rows.find(sample => Number(sample.hero_id) === Number(candidate.id));
    const games = Number(row?.games_played || 0);
    if (!row || !games) return;

    // Rows are from the predicted enemy's perspective. For our candidate, wins
    // are the complement of the predicted enemy's wins.
    const result = pairCounterScore({
      pairWins: games - Number(row.wins || 0),
      pairGames: games,
      candidateBase: heroBaseWinRate(statById.get(Number(candidate.id))),
      enemyBase: heroBaseWinRate(statById.get(Number(prediction.hero.id))),
    });

    weighted.push({
      score: Number(result.score || 0),
      weight: forecastWeights[index] * Number(result.confidence || 0),
    });
  });

  if (!weighted.length) return { score: 0, evidence: 0 };
  const weightSum = weighted.reduce((sum, row) => sum + row.weight, 0) || 1;
  const score = clamp(weighted.reduce((sum, row) => sum + row.score * row.weight, 0) / weightSum, -10, 10);
  return { score, evidence: weighted.length };
}
