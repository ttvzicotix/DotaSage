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
  const configured = Boolean(process.env.STRATZ_TOKEN || process.env.STRATZ_API_TOKEN);

  if (configured) {
    try {
      const primary = await stratz(heroId);
      attempts.push({ provider: 'STRATZ', configured: true, ok: Boolean(primary), useful: Boolean(primary?.rows?.length) });
      if (primary?.rows?.length) {
        res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=21600');
        return res.status(200).json({ provider: 'STRATZ', ...primary, attempts });
      }
    } catch (error) {
      attempts.push({ provider: 'STRATZ', configured: true, ok: false, message: error?.message || 'query_failed' });
    }
  } else {
    attempts.push({ provider: 'STRATZ', configured: false, ok: false, useful: false });
  }

  try {
    const fallback = await openDota(heroId);
    const tagged = fallback.map(row => ({ ...row, _provider: row?._provider || 'OpenDota' }));
    attempts.push({ provider: 'OpenDota', ok: true, useful: tagged.length > 0 });
    if (tagged.length) {
      res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=21600');
      return res.status(200).json({ provider: 'OpenDota', rows: tagged, synergy: [], attempts });
    }
  } catch (error) {
    attempts.push({ provider: 'OpenDota', ok: false, status: error?.status || null });
  }

  return res.status(200).json({ provider: null, rows: [], synergy: [], attempts });
}
