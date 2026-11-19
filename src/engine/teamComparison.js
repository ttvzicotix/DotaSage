import { compositionSynergyScore } from './scoring.js';
export const sampleGames = row => Number(row?.games_played || row?.games || 0);
const valid = row => sampleGames(row) > 0 && Number.isFinite(Number(row?.wins)) && Number(row.wins) >= 0 && Number(row.wins) <= sampleGames(row);
export function matchupEdge(rows, enemyId) {
  const samples = rows.filter(valid);
  const total = samples.reduce((acc, row) => ({ games: acc.games + sampleGames(row), wins: acc.wins + Number(row.wins) }), { games: 0, wins: 0 });
  const row = samples.find(sample => Number(sample.hero_id) === Number(enemyId));
  if (!row || !total.games) return null;
  const winRate = Number(row.wins) / sampleGames(row);
  return { edge: 100 * (winRate - total.wins / total.games), games: sampleGames(row), winRate, provider: row._provider || null };
}
export function alliedPair(member, other, evidence) {
  const forward = evidence.get(Number(member.id))?.synergy || [];
  const reverse = evidence.get(Number(other.id))?.synergy || [];
  const row = forward.find(row => Number(row.hero_id) === Number(other.id) && valid(row)) || reverse.find(row => Number(row.hero_id) === Number(member.id) && valid(row));
  const memberRoles = new Set((member.roles || []).map(role => role.toLowerCase()));
  const partnerRoles = (other.roles || []).filter(role => !memberRoles.has(role.toLowerCase()));
  return { other, n: row ? sampleGames(row) : 0, winRate: row ? Number(row.wins) / sampleGames(row) * 100 : null,
    modeled: compositionSynergyScore(member, [other]),
    explanation: partnerRoles.length ? `Adds ${partnerRoles.join(', ').toLowerCase()} to your role mix.` : 'Overlapping roles; watch farm and initiation needs.' };
}
export function draftTeam(hero, allies) {
  return [hero, ...allies].filter(Boolean).filter((row, i, arr) => arr.findIndex(item => Number(item.id) === Number(row.id)) === i).slice(0, 5);
}
