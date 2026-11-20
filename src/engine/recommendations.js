// Best Pick only: preserve numerical winner; diversify within a 0.60/10
// window of each remaining numerical leader, never against the global winner.
// Roles describe strategy, not lane eligibility (which is applied upstream).
const roles = row => new Set((row.hero.roles || []).map(role => role.toLowerCase()));
const similarity = (a, b) => {
  const left = roles(a), right = roles(b);
  const union = new Set([...left, ...right]);
  return union.size ? [...left].filter(role => right.has(role)).length / union.size : 1;
};
const compare = (a, b) => b.score.draftFit - a.score.draftFit || b.score.overall - a.score.overall || Number(a.hero.id) - Number(b.hero.id);
const coverage = row => Number(row.score.counterCoverage ?? 0);
export function diversifyRecommendations(input, limit = 18, { recentIds = [] } = {}) {
  const recent = new Set(recentIds.map(Number));
  const remaining = [...input].sort(compare);
  if (!remaining.length) return [];
  const selected = [{ ...remaining.shift(), rankingReason: 'Highest draft-fit score' }];
  while (remaining.length && selected.length < limit) {
    const leader = remaining[0];
    const viable = remaining.filter(row =>
      leader.score.draftFit - row.score.draftFit <= 0.60 &&
      coverage(row) >= coverage(leader) &&
      Number(row.score.worstCounterScore ?? 0) >= Math.min(-4, Number(leader.score.worstCounterScore ?? 0))
    );
    const utility = row => row.score.draftFit - 0.45 * selected.reduce((sum, other) => sum + similarity(row, other), 0) / selected.length - (recent.has(Number(row.hero.id)) ? 0.55 : 0);
    viable.sort((a, b) => utility(b) - utility(a) || compare(a, b));
    const chosen = viable[0] || leader;
    const traits = [...roles(chosen)].filter(role => !selected.some(row => roles(row).has(role)));
    selected.push({ ...chosen, rankingReason: chosen !== leader
      ? `${!recent.has(Number(chosen.hero.id)) && recent.size ? 'Fresh alternative' : 'Different approach'}${traits.length ? ` · ${traits.slice(0, 2).join(' + ')}` : ''}`
      : `Strong fit${traits.length ? ` · ${traits.slice(0, 2).join(' + ')}` : ''}` });
    remaining.splice(remaining.indexOf(chosen), 1);
  }
  return [...selected, ...remaining];
}
