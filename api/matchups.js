const OPEN_DOTA = 'https://api.opendota.com/api';
const STRATZ = 'https://api.stratz.com/graphql';

async function json(url, options = {}, timeout = 6500) {
  const response = await fetch(url, {
    ...options,
    headers: { Accept: 'application/json', 'User-Agent': 'DotaSage/1.0', ...(options.headers || {}) },
    signal: AbortSignal.timeout(timeout),
  });
  if (!response.ok) {
    const error = new Error(`${response.status} ${response.statusText}`);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

async function openDota(heroId) {
  const rows = await json(`${OPEN_DOTA}/heroes/${heroId}/matchups`);
  return Array.isArray(rows) ? rows : [];
}

async function stratz(heroId) {
  const token = process.env.STRATZ_TOKEN || process.env.STRATZ_API_TOKEN;
  if (!token) return null;

  const query = `
    query DotaSageMatchups($hero: Short!, $bracket: [RankBracketBasicEnum!]) {
      heroStats {
        matchUp(heroId: $hero, bracketBasicIds: $bracket, take: 200) {
          vs { heroId2 winCount matchCount }
          with { heroId2 winCount matchCount }
        }
      }
    }
  `;
  const payload = await json(STRATZ, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      variables: { hero: heroId, bracket: ['DIVINE_IMMORTAL'] },
    }),
  });

  if (payload?.errors?.length) throw new Error(payload.errors[0]?.message || 'STRATZ GraphQL error');
  const block = payload?.data?.heroStats?.matchUp?.[0];
  const rows = Array.isArray(block?.vs) ? block.vs : [];
  return {
    rows: rows.map(row => ({
      hero_id: Number(row.heroId2),
      wins: Number(row.winCount || 0),
      games_played: Number(row.matchCount || 0),
      _provider: 'STRATZ',
    })),
    synergy: Array.isArray(block?.with) ? block.with.map(row => ({
      hero_id: Number(row.heroId2),
      wins: Number(row.winCount || 0),
      games_played: Number(row.matchCount || 0),
    })) : [],
  };
}

export default async function handler(req, res) {
  if (req.method && req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method_not_allowed' });
  }
  const heroId = Number(req.query?.heroId);
  if (!Number.isInteger(heroId) || heroId <= 0 || heroId > 1000) {
    return res.status(400).json({ error: 'invalid_hero_id' });
  }

  const attempts = [];
  try {
    const rows = await openDota(heroId);
    attempts.push({ provider: 'OpenDota', ok: true, useful: rows.length > 0 });
    if (rows.length) {
      res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=21600');
      return res.status(200).json({ provider: 'OpenDota', rows, synergy: [], attempts });
    }
  } catch (error) {
    attempts.push({ provider: 'OpenDota', ok: false, status: error?.status || null });
  }

  try {
    const fallback = await stratz(heroId);
    const configured = Boolean(process.env.STRATZ_TOKEN || process.env.STRATZ_API_TOKEN);
    attempts.push({ provider: 'STRATZ', configured, ok: Boolean(fallback), useful: Boolean(fallback?.rows?.length) });
    if (fallback?.rows?.length) {
      res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=21600');
      return res.status(200).json({ provider: 'STRATZ', ...fallback, attempts });
    }
  } catch (error) {
    attempts.push({ provider: 'STRATZ', configured: true, ok: false, message: error?.message || 'query_failed' });
  }

  return res.status(200).json({ provider: null, rows: [], synergy: [], attempts });
}
