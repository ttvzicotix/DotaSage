const OPEN_DOTA_LIVE = 'https://api.opendota.com/api/live';
const STEAM_API = 'https://api.steampowered.com';

function numeric(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function accountOf(player) {
  return numeric(
    player?.account_id ??
    player?.accountId ??
    player?.accountid ??
    player?.steam_account_id ??
    player?.steamAccountId
  );
}

function heroOf(player) {
  return numeric(player?.hero_id ?? player?.heroId ?? player?.hero?.id);
}

function sideOf(player) {
  const team = numeric(player?.team_number ?? player?.teamNumber ?? player?.team);
  if (team === 2 || team === 0) return 'radiant';
  if (team === 3 || team === 1) return 'dire';
  const slot = numeric(player?.player_slot ?? player?.playerSlot);
  if (slot != null) return slot < 128 ? 'radiant' : 'dire';
  const text = String(player?.team_name ?? player?.teamName ?? '').toLowerCase();
  if (text.includes('radiant')) return 'radiant';
  if (text.includes('dire')) return 'dire';
  return null;
}

function playerRows(game) {
  const teamPlayers = Array.isArray(game?.teams)
    ? game.teams.flatMap(team => (team?.players || []).map(player => ({ ...player, team_number: team?.team_number ?? player?.team_number })))
    : [];
  const candidates = [
    game?.players,
    game?.scoreboard?.players,
    game?.scoreboard?.radiant?.players,
    game?.scoreboard?.dire?.players,
    game?.radiant_players,
    game?.dire_players,
    teamPlayers,
  ];
  return candidates.flatMap(rows => Array.isArray(rows) ? rows : []);
}

function normalizeGame(game, accountId, provider) {
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

  const gameTime = numeric(
    game?.game_time ??
    game?.gameTime ??
    game?.scoreboard?.duration ??
    game?.scoreboard?.game_time ??
    game?.match?.game_time
  );

  return {
    provider,
    matchId: String(game?.match_id ?? game?.matchId ?? game?.match?.match_id ?? ''),
    gameTimeSeconds: gameTime,
    selfSide: sideOf(self),
    selfHeroId: heroOf(self),
    radiant: radiant.slice(0, 5),
    dire: dire.slice(0, 5),
    coverage: rows.length,
    serverSteamId: String(game?.server_steam_id ?? game?.serverSteamId ?? game?.match?.server_steam_id ?? ''),
  };
}

async function fetchJson(url, timeout = 6500) {
  const response = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'DotaSage/1.0' },
    signal: AbortSignal.timeout(timeout),
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
}

async function scanOpenDota(accountId) {
  const payload = await fetchJson(OPEN_DOTA_LIVE);
  const games = Array.isArray(payload) ? payload
    : Array.isArray(payload?.games) ? payload.games
      : Array.isArray(payload?.data) ? payload.data
        : [];
  for (const game of games) {
    const match = normalizeGame(game, accountId, 'OpenDota Live');
    if (match) return { match, scanned: games.length };
  }
  return { match: null, scanned: games.length };
}

async function steamTopGames(key) {
  const requests = [
    [`${STEAM_API}/IDOTA2Match_570/GetTopLiveGame/v1/?key=${encodeURIComponent(key)}&partner=0`, 'top-0'],
    [`${STEAM_API}/IDOTA2Match_570/GetTopLiveGame/v1/?key=${encodeURIComponent(key)}&partner=1`, 'top-1'],
    [`${STEAM_API}/IDOTA2Match_570/GetTopLiveEventGame/v1/?key=${encodeURIComponent(key)}&partner=0`, 'event-0'],
  ];
  const settled = await Promise.allSettled(requests.map(([url]) => fetchJson(url, 5500)));
  const games = [];
  const seen = new Set();
  settled.forEach((result, index) => {
    if (result.status !== 'fulfilled') return;
    const payload = result.value;
    const rows = Array.isArray(payload?.game_list) ? payload.game_list
      : Array.isArray(payload?.result?.game_list) ? payload.result.game_list
        : [];
    for (const row of rows) {
      const keyValue = String(row?.match_id ?? row?.server_steam_id ?? `${index}-${games.length}`);
      if (seen.has(keyValue)) continue;
      seen.add(keyValue);
      games.push(row);
    }
  });
  return games;
}

async function enrichSteamMatch(match, key, accountId) {
  if (!match?.serverSteamId) return match;
  try {
    const payload = await fetchJson(
      `${STEAM_API}/IDOTA2MatchStats_570/GetRealtimeStats/v1/?key=${encodeURIComponent(key)}&server_steam_id=${encodeURIComponent(match.serverSteamId)}`,
      5500,
    );
    const normalized = normalizeGame(payload, accountId, 'Valve Realtime');
    return normalized || match;
  } catch {
    return match;
  }
}

async function scanSteam(accountId) {
  const key = process.env.STEAM_WEB_API_KEY || process.env.STEAM_API_KEY;
  if (!key) return { configured: false, match: null, scanned: 0 };
  const games = await steamTopGames(key);
  for (const game of games) {
    const match = normalizeGame(game, accountId, 'Valve Top Live');
    if (match) return { configured: true, match: await enrichSteamMatch(match, key, accountId), scanned: games.length };
  }
  return { configured: true, match: null, scanned: games.length };
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

  const attempts = [];
  let scannedGames = 0;

  try {
    const openDota = await scanOpenDota(accountId);
    scannedGames += openDota.scanned;
    attempts.push({ provider: 'OpenDota Live', ok: true, scanned: openDota.scanned, found: Boolean(openDota.match) });
    if (openDota.match) {
      res.setHeader('Cache-Control', 'public, s-maxage=5, stale-while-revalidate=10');
      return res.status(200).json({ found: true, match: openDota.match, scannedGames, attempts });
    }
  } catch (error) {
    attempts.push({ provider: 'OpenDota Live', ok: false, message: error?.message || 'scan_failed' });
  }

  try {
    const steam = await scanSteam(accountId);
    scannedGames += steam.scanned;
    attempts.push({ provider: 'Valve Top Live', ok: true, configured: steam.configured, scanned: steam.scanned, found: Boolean(steam.match) });
    if (steam.match) {
      res.setHeader('Cache-Control', 'public, s-maxage=5, stale-while-revalidate=10');
      return res.status(200).json({ found: true, match: steam.match, scannedGames, attempts });
    }
  } catch (error) {
    attempts.push({ provider: 'Valve Top Live', ok: false, configured: true, message: error?.message || 'scan_failed' });
  }

  res.setHeader('Cache-Control', 'public, s-maxage=5, stale-while-revalidate=10');
  return res.status(200).json({
    found: false,
    match: null,
    scannedGames,
    attempts,
    limitation: 'Browser-only providers expose top/watchable live games, not every ordinary matchmaking lobby.',
  });
}
