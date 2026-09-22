const OPEN_DOTA_LIVE = 'https://api.opendota.com/api/live';

function numeric(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function accountOf(player) {
  return numeric(
    player?.account_id ??
    player?.accountId ??
    player?.steam_account_id ??
    player?.steamAccountId
  );
}

function heroOf(player) {
  return numeric(player?.hero_id ?? player?.heroId ?? player?.hero?.id);
}

function sideOf(player) {
  const team = numeric(player?.team_number ?? player?.teamNumber ?? player?.team);
  if (team === 2) return 'radiant';
  if (team === 3) return 'dire';
  const slot = numeric(player?.player_slot ?? player?.playerSlot);
  if (slot != null) return slot < 128 ? 'radiant' : 'dire';
  const text = String(player?.team_name ?? player?.teamName ?? '').toLowerCase();
  if (text.includes('radiant')) return 'radiant';
  if (text.includes('dire')) return 'dire';
  return null;
}

function playerRows(game) {
  const candidates = [
    game?.players,
    game?.scoreboard?.players,
    game?.scoreboard?.radiant?.players,
    game?.scoreboard?.dire?.players,
    game?.radiant_players,
    game?.dire_players,
  ];
  return candidates.flatMap(rows => Array.isArray(rows) ? rows : []);
}

function normalizeGame(game, accountId) {
  const rows = playerRows(game);
  const self = rows.find(player => accountOf(player) === accountId);
  if (!self) return null;

  const radiant = [];
  const dire = [];
  for (const player of rows) {
    const heroId = heroOf(player);
    const side = sideOf(player);
    if (!heroId || !side) continue;
    const target = side === 'radiant' ? radiant : dire;
    if (!target.includes(heroId)) target.push(heroId);
  }

  const selfSide = sideOf(self);
  const selfHeroId = heroOf(self);
  const gameTime = numeric(
    game?.game_time ??
    game?.gameTime ??
    game?.scoreboard?.duration ??
    game?.scoreboard?.game_time
  );

  return {
    provider: 'OpenDota Live',
    matchId: String(game?.match_id ?? game?.matchId ?? ''),
    gameTimeSeconds: gameTime,
    selfSide,
    selfHeroId,
    radiant: radiant.slice(0, 5),
    dire: dire.slice(0, 5),
    coverage: rows.length,
  };
}

export default async function handler(req, res) {
  if (req.method && req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method_not_allowed' });
  }
  const accountId = Number(req.query?.accountId);
  if (!Number.isInteger(accountId) || accountId <= 0) {
    return res.status(400).json({ error: 'invalid_account_id' });
  }

  try {
    const response = await fetch(OPEN_DOTA_LIVE, {
      headers: { Accept: 'application/json', 'User-Agent': 'DotaSage/1.0' },
      signal: AbortSignal.timeout(6500),
    });
    if (!response.ok) throw new Error(`OpenDota live returned ${response.status}`);
    const payload = await response.json();
    const games = Array.isArray(payload) ? payload
      : Array.isArray(payload?.games) ? payload.games
        : Array.isArray(payload?.data) ? payload.data
          : [];

    let match = null;
    for (const game of games) {
      match = normalizeGame(game, accountId);
      if (match) break;
    }

    res.setHeader('Cache-Control', 'public, s-maxage=5, stale-while-revalidate=10');
    return res.status(200).json({
      found: Boolean(match),
      match,
      scannedGames: games.length,
      limitation: 'OpenDota live contains top/watchable ongoing games, not every public matchmaking lobby.',
    });
  } catch (error) {
    return res.status(502).json({ error: 'live_provider_unavailable', message: error?.message || 'unknown error' });
  }
}
