const OPEN_DOTA = 'https://api.opendota.com/api';
const STRATZ = 'https://api.stratz.com/graphql';
const STEAM_ID64_BASE = 76561197960265728n;

const jsonHeaders = { Accept: 'application/json', 'User-Agent': 'DotaSage/1.0' };

function accountId(value) {
  const raw = String(value ?? '').trim();
  if (!/^\d+$/.test(raw)) return null;
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 && id <= 4294967295 ? id : null;
}

function steamId64(id) {
  return String(STEAM_ID64_BASE + BigInt(id));
}

async function fetchJson(url, options = {}, timeout = 5000) {
  const response = await fetch(url, {
    ...options,
    headers: { ...jsonHeaders, ...(options.headers || {}) },
    signal: AbortSignal.timeout(timeout),
  });
  if (!response.ok) {
    const error = new Error(`${response.status} ${response.statusText}`);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

async function openDota(resource, id, take = 100, skip = 0) {
  const path = resource === 'profile' ? `/players/${id}`
    : resource === 'wl' ? `/players/${id}/wl`
      : resource === 'heroes' ? `/players/${id}/heroes`
        : resource === 'recent' ? `/players/${id}/recentMatches`
          : `/players/${id}/matches?limit=${take}&offset=${skip}`;
  return fetchJson(`${OPEN_DOTA}${path}`);
}

async function stratzQuery(query, variables) {
  const token = process.env.STRATZ_TOKEN || process.env.STRATZ_API_TOKEN;
  if (!token) return null;
  const payload = await fetchJson(STRATZ, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  }, 6500);
  if (payload?.errors?.length) throw new Error(payload.errors[0]?.message || 'STRATZ GraphQL error');
  return payload?.data || null;
}

async function stratzProfile(id) {
  const data = await stratzQuery(`
    query DotaSagePlayer($id: Long!) {
      player(steamAccountId: $id) {
        matchCount
        winCount
        steamAccount {
          id
          name
          avatar
          profileUri
          isAnonymous
          seasonRank
          seasonLeaderboardRank
        }
      }
    }
  `, { id });
  const row = data?.player;
  if (!row?.steamAccount) return null;
  return {
    profile: {
      account_id: id,
      personaname: row.steamAccount.name || null,
      avatar: row.steamAccount.avatar || null,
      avatarmedium: row.steamAccount.avatar || null,
      avatarfull: row.steamAccount.avatar || null,
      profileurl: row.steamAccount.profileUri || null,
    },
    rank_tier: row.steamAccount.seasonRank || null,
    leaderboard_rank: row.steamAccount.seasonLeaderboardRank || null,
    _provider: 'STRATZ',
    _matchCount: Number(row.matchCount || 0),
    _winCount: Number(row.winCount || 0),
  };
}

async function stratzWinLoss(id) {
  const data = await stratzQuery(`
    query DotaSageWL($id: Long!) {
      player(steamAccountId: $id) { matchCount winCount }
    }
  `, { id });
  const row = data?.player;
  if (!row || !Number(row.matchCount || 0)) return null;
  const win = Number(row.winCount || 0);
  const total = Number(row.matchCount || 0);
  return { win, lose: Math.max(0, total - win), _provider: 'STRATZ' };
}

async function stratzMatches(id, take = 20, skip = 0) {
  const safeTake = Math.max(1, Math.min(100, Number(take || 20)));
  const data = await stratzQuery(`
    query DotaSageMatches($id: Long!, $take: Int!, $skip: Int!) {
      player(steamAccountId: $id) {
        matches(request: { take: $take, skip: $skip }) {
          id
          startDateTime
          durationSeconds
          didRadiantWin
          gameMode
          lobbyType
          players(steamAccountId: $id) {
            heroId
            kills
            deaths
            assists
            goldPerMinute
            experiencePerMinute
            numLastHits
            isVictory
          }
        }
      }
    }
  `, { id, take: safeTake, skip });
  const rows = data?.player?.matches;
  if (!Array.isArray(rows)) return null;
  return rows.map(match => {
    const p = match?.players?.[0] || {};
    const isRadiant = typeof p.isVictory === 'boolean' && typeof match.didRadiantWin === 'boolean'
      ? p.isVictory === match.didRadiantWin
      : true;
    return {
      match_id: match.id,
      player_slot: isRadiant ? 0 : 128,
      radiant_win: Boolean(match.didRadiantWin),
      hero_id: p.heroId || null,
      start_time: match.startDateTime || null,
      duration: match.durationSeconds || null,
      game_mode: match.gameMode ?? null,
      lobby_type: match.lobbyType ?? null,
      kills: p.kills ?? null,
      deaths: p.deaths ?? null,
      assists: p.assists ?? null,
      gold_per_min: p.goldPerMinute ?? null,
      xp_per_min: p.experiencePerMinute ?? null,
      last_hits: p.numLastHits ?? null,
      _provider: 'STRATZ',
    };
  });
}

async function stratzHeroes(id) {
  const rows = [];
  for (let skip = 0; skip < 500; skip += 100) {
    const batch = await stratzMatches(id, 100, skip);
    if (!batch?.length) break;
    rows.push(...batch);
    if (batch.length < 100) break;
  }
  if (!rows.length) return null;
  const totals = new Map();
  for (const row of rows) {
    if (!row.hero_id) continue;
    const current = totals.get(Number(row.hero_id)) || { hero_id: Number(row.hero_id), games: 0, win: 0 };
    current.games += 1;
    const radiant = Number(row.player_slot || 0) < 128;
    if (Boolean(row.radiant_win) === radiant) current.win += 1;
    totals.set(current.hero_id, current);
  }
  return [...totals.values()].sort((a, b) => b.games - a.games).map(row => ({ ...row, _provider: 'STRATZ' }));
}

function xmlText(xml, tag) {
  const cdata = xml.match(new RegExp(`<${tag}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`, 'i'));
  if (cdata) return cdata[1];
  const plain = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'i'));
  return plain ? plain[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>') : null;
}

async function steamCommunityProfile(id) {
  const sid64 = steamId64(id);
  const response = await fetch(`https://steamcommunity.com/profiles/${sid64}?xml=1`, {
    headers: { 'User-Agent': 'DotaSage/1.0' },
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) return null;
  const xml = await response.text();
  const name = xmlText(xml, 'steamID');
  const avatar = xmlText(xml, 'avatarFull') || xmlText(xml, 'avatarMedium');
  if (!name && !avatar) return null;
  return {
    profile: {
      account_id: id,
      personaname: name || `Dota ${id}`,
      avatar: avatar,
      avatarmedium: avatar,
      avatarfull: avatar,
      profileurl: `https://steamcommunity.com/profiles/${sid64}`,
    },
    rank_tier: null,
    _provider: 'Steam Community',
  };
}

function useful(resource, data) {
  if (resource === 'profile') return Boolean(data?.profile?.personaname || data?.profile?.avatarfull || data?.rank_tier);
  if (resource === 'wl') return Number(data?.win || 0) + Number(data?.lose || 0) > 0;
  return Array.isArray(data) && data.length > 0;
}

export default async function handler(req, res) {
  if (req.method && req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const id = accountId(req.query?.accountId);
  const resource = ['profile', 'wl', 'heroes', 'recent', 'history'].includes(String(req.query?.resource))
    ? String(req.query.resource)
    : 'profile';
  const take = Math.max(1, Math.min(500, Number(req.query?.take || (resource === 'recent' ? 20 : 100))));
  const skip = Math.max(0, Number(req.query?.skip || 0));
  if (!id) return res.status(400).json({ error: 'invalid_account_id' });

  const attempts = [];
  const stratzConfigured = Boolean(process.env.STRATZ_TOKEN || process.env.STRATZ_API_TOKEN);

  if (stratzConfigured) {
    try {
      let primary = null;
      if (resource === 'profile') primary = await stratzProfile(id);
      else if (resource === 'wl') primary = await stratzWinLoss(id);
      else if (resource === 'heroes') primary = await stratzHeroes(id);
      else if (resource === 'recent') primary = await stratzMatches(id, Math.min(take, 50), skip);
      else if (resource === 'history') primary = await stratzMatches(id, take, skip);
      attempts.push({ provider: 'STRATZ', ok: Boolean(primary), configured: true, useful: useful(resource, primary) });
      if (useful(resource, primary)) {
        res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=600');
        return res.status(200).json({ provider: 'STRATZ', data: primary, attempts });
      }
    } catch (error) {
      attempts.push({ provider: 'STRATZ', ok: false, configured: true, message: error?.message || 'query_failed' });
    }
  } else {
    attempts.push({ provider: 'STRATZ', ok: false, configured: false, useful: false });
  }

  try {
    const fallback = await openDota(resource, id, take, skip);
    attempts.push({ provider: 'OpenDota', ok: true, useful: useful(resource, fallback) });
    if (useful(resource, fallback)) {
      res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=600');
      return res.status(200).json({ provider: 'OpenDota', data: fallback, attempts });
    }
  } catch (error) {
    attempts.push({ provider: 'OpenDota', ok: false, status: error?.status || null });
  }

  if (resource === 'profile') {
    try {
      const fallback = await steamCommunityProfile(id);
      attempts.push({ provider: 'Steam Community', ok: Boolean(fallback), useful: useful(resource, fallback) });
      if (useful(resource, fallback)) {
        res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=3600');
        return res.status(200).json({ provider: 'Steam Community', data: fallback, attempts });
      }
    } catch (error) {
      attempts.push({ provider: 'Steam Community', ok: false, message: error?.message || 'profile_failed' });
    }
  }

  return res.status(200).json({ provider: null, data: resource === 'profile' || resource === 'wl' ? null : [], attempts });
}
