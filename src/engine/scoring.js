const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

function log5(a, b) {
  const numerator = a * (1 - b);
  const denominator = numerator + (1 - a) * b;
  return denominator ? numerator / denominator : 0.5;
}

export function heroBaseWinRate(heroStat) {
  const wins = Number(heroStat?.pub_win || 0);
  const picks = Number(heroStat?.pub_pick || 0);
  return picks > 0 ? wins / picks : 0.5;
}

// Per-pair Advantage Score. The expectation is normalized for each hero's normal
// win rate (log5), so this measures the matchup rather than simply rewarding OP heroes.
// Pair display remains -10..+10; the full enemy score below accumulates raw
// adjusted advantage across every entered enemy, closer to DotaPicker/DotaBuffCP.
export function pairCounterScore({ pairWins, pairGames, candidateBase = 0.5, enemyBase = 0.5 }) {
  if (!pairGames) return { score: 0, confidence: 0, advantage: 0 };
  const actual = pairWins / pairGames;
  const expected = log5(candidateBase, enemyBase);
  const advantage = actual - expected;
  const sampleConfidence = clamp(Math.sqrt(pairGames / 500), 0.15, 1);
  const raw = (advantage / 0.06) * 10;
  return {
    score: clamp(raw * sampleConfidence, -10, 10),
    confidence: sampleConfidence,
    advantage,
    actual,
    expected,
    games: pairGames,
  };
}

// DotaPicker-style philosophy: advantages against selected enemies accumulate.
// The old DotaSage weighted average could make a 5-hero draft look too similar to
// a 1-hero draft. Here every verified matchup contributes signed evidence, then the
// total is scaled/clamped into the same -10..+10 display range.
export function aggregateEnemyScore(pairScores) {
  const usable = pairScores.filter(x => x && x.confidence > 0 && Number.isFinite(x.advantage));
  if (!usable.length) return 0;
  const adjustedPctSum = usable.reduce((sum, row) => sum + (row.advantage * 100 * row.confidence), 0);
  return clamp(adjustedPctSum, -10, 10);
}

const roleNeeds = ['carry', 'support', 'initiator', 'disabler', 'durable', 'nuker', 'pusher'];
const hasRole = (hero, role) => (hero?.roles || []).some(r => String(r).toLowerCase() === role);

function pairRoleSynergy(candidate, ally) {
  let s = 0;
  const c = role => hasRole(candidate, role);
  const a = role => hasRole(ally, role);

  // Complementary fight structure.
  if ((c('initiator') && (a('nuker') || a('disabler'))) || (a('initiator') && (c('nuker') || c('disabler')))) s += 1.35;
  if ((c('disabler') && a('carry')) || (a('disabler') && c('carry'))) s += 1.05;
  if ((c('support') && a('carry')) || (a('support') && c('carry'))) s += 0.75;
  if ((c('durable') && (a('nuker') || a('carry'))) || (a('durable') && (c('nuker') || c('carry')))) s += 0.55;
  if ((c('pusher') && (a('initiator') || a('carry'))) || (a('pusher') && (c('initiator') || c('carry')))) s += 0.45;

  // Redundancy penalties are intentionally mild. Dota drafts can support dual cores
  // or multiple initiators, but a candidate that only repeats what is already present
  // should not receive the same synergy credit as a complementary pick.
  if (c('carry') && a('carry') && !c('support') && !a('support')) s -= 0.45;
  if (c('support') && a('support') && !c('disabler') && !a('disabler')) s -= 0.20;
  return s;
}

// MODELED same-team synergy, centered at 0 and scaled -10..+10 so it can sit beside
// empirical counter advantage. This is not presented as population pair statistics.
// It intentionally accumulates across allies, matching the counter+synergy drafting
// philosophy, while filling structural holes also receives a bonus.
export function compositionSynergyScore(candidate, allies) {
  if (!allies.length) return 0;
  const currentRoles = new Set(allies.flatMap(h => h.roles || []).map(r => String(r).toLowerCase()));
  const candidateRoles = new Set((candidate.roles || []).map(r => String(r).toLowerCase()));
  const missingFilled = roleNeeds.filter(role => !currentRoles.has(role) && candidateRoles.has(role)).length;
  const pairSum = allies.reduce((sum, ally) => sum + pairRoleSynergy(candidate, ally), 0);
  const structural = missingFilled * 0.55;
  return clamp((pairSum + structural) * 1.35, -10, 10);
}

// Retained for older UI/logic callers that expect a 0..10 "team fit" value.
export function compositionFit(candidate, allies) {
  return clamp(5 + compositionSynergyScore(candidate, allies) / 2, 0, 10);
}

// Objective BEST PICK. Counter evidence is empirical from OpenDota, while our same-team
// synergy is still modeled. Until DotaSage has an empirical ally-pair dataset, verified
// counter evidence gets the larger share and meta is only a tiebreaker. Personal history
// does not rank BEST PICK.
export function draftFitScore({ enemyScore, synergyScore = 0, teamFit, metaScore = 5 }) {
  const counterAsTen = clamp((enemyScore + 10) / 2, 0, 10);
  const resolvedSynergy = Number.isFinite(synergyScore) ? synergyScore : ((Number(teamFit ?? 5) - 5) * 2);
  const synergyAsTen = clamp((resolvedSynergy + 10) / 2, 0, 10);
  return clamp(counterAsTen * 0.60 + synergyAsTen * 0.35 + metaScore * 0.05, 0, 10);
}

// Personal familiarity is still advisory. It is only used by FOR YOU / blended display,
// never to sort the default BEST PICK list.
export function overallRecommendation({ enemyScore, synergyScore = 0, teamFit, personalFit, metaScore = 5 }) {
  const draftFit = draftFitScore({ enemyScore, synergyScore, teamFit, metaScore });
  const personalAsTen = clamp(personalFit / 10, 0, 10);
  return clamp(draftFit * 0.92 + personalAsTen * 0.08, 0, 10);
}
