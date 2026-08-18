const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value));

function preferenceScore(entry) {
  if (!entry?.rating) return 50;
  return clamp((entry.rating - 1) * 25);
}

function experienceScore(games) {
  if (!games) return 0;
  return clamp((Math.log1p(games) / Math.log1p(150)) * 100);
}

function recencyScore(lastPlayed) {
  if (!lastPlayed) return 0;
  const days = Math.max(0, (Date.now() / 1000 - lastPlayed) / 86400);
  return clamp(Math.exp(-days / 220) * 100);
}

function performanceScore(wins, games) {
  if (!games) return 50;
  const priorGames = 20;
  const bayesWr = (wins + priorGames * 0.5) / (games + priorGames);
  return clamp(50 + (bayesWr - 0.5) * 250);
}

export function buildPersonalScores(playerHeroRows = [], manualPreferences = {}) {
  const byId = new Map(playerHeroRows.map(row => [Number(row.hero_id), row]));
  return hero => {
    const history = byId.get(Number(hero.id)) || {};
    const manual = manualPreferences[hero.localized_name];
    const components = {
      experience: experienceScore(Number(history.games || 0)),
      recency: recencyScore(Number(history.last_played || 0)),
      performance: performanceScore(Number(history.win || 0), Number(history.games || 0)),
      roleExperience: 50, // Filled once role-by-match parsing is added.
      currentPatch: Number(history.last_played || 0) >= Date.parse('2026-07-30') / 1000 ? 100 : 40,
      manualPreference: preferenceScore(manual),
    };
    const personalFit =
      components.experience * 0.30 +
      components.recency * 0.20 +
      components.performance * 0.15 +
      components.roleExperience * 0.15 +
      components.currentPatch * 0.10 +
      components.manualPreference * 0.10;
    return {
      score: clamp(personalFit),
      games: Number(history.games || 0),
      wins: Number(history.win || 0),
      lastPlayed: Number(history.last_played || 0),
      note: manual?.note || '',
      preference: manual?.rating || null,
      components,
    };
  };
}
