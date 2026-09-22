const STRATZ = 'https://api.stratz.com/graphql';
const OPEN_DOTA_HEROES = 'https://api.opendota.com/api/heroes';

const POSITIONS = new Set([
  'POSITION_1',
  'POSITION_2',
  'POSITION_3',
  'POSITION_4',
  'POSITION_5',
]);

async function fetchJson(url, options = {}, timeout = 6500) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: 'application/json',
      'User-Agent': 'DotaSage/1.0',
      ...(options.headers || {}),
    },
    signal: AbortSignal.timeout(timeout),
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
}

export default async function handler(req, res) {
  if (req.method && req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const position = String(req.query?.position || '').toUpperCase();
  if (!POSITIONS.has(position)) {
    return res.status(400).json({ error: 'invalid_position' });
  }

  const token = process.env.STRATZ_TOKEN || process.env.STRATZ_API_TOKEN;
  if (!token) {
    return res.status(200).json({ provider: null, configured: false, position, rows: [] });
  }

  try {
    const heroes = await fetchJson(OPEN_DOTA_HEROES, {}, 5000);
    const heroIds = (Array.isArray(heroes) ? heroes : [])
      .map(hero => Number(hero?.id))
      .filter(id => Number.isInteger(id) && id > 0 && id < 1000);

    const query = `
      query DotaSageRoleMeta($heroes: [Short!], $pos: [MatchPlayerPositionType!], $br: [RankBracket!]) {
        heroStats {
          winWeek(heroIds: $heroes, positionIds: $pos, bracketIds: $br, take: 200) {
            heroId
            matchCount
            winCount
          }
        }
      }
    `;

    const payload = await fetchJson(STRATZ, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: {
          heroes: heroIds,
          pos: [position],
          br: ['DIVINE', 'IMMORTAL'],
        },
      }),
    }, 8000);

    if (payload?.errors?.length) throw new Error(payload.errors[0]?.message || 'STRATZ GraphQL error');

    const rows = Array.isArray(payload?.data?.heroStats?.winWeek)
      ? payload.data.heroStats.winWeek.map(row => ({
          hero_id: Number(row.heroId),
          games: Number(row.matchCount || 0),
          wins: Number(row.winCount || 0),
          _provider: 'STRATZ',
          _position: position,
        }))
      : [];

    res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=21600');
    return res.status(200).json({
      provider: 'STRATZ',
      configured: true,
      position,
      brackets: ['DIVINE', 'IMMORTAL'],
      rows,
    });
  } catch (error) {
    return res.status(200).json({
      provider: null,
      configured: true,
      position,
      rows: [],
      error: error?.message || 'role_meta_unavailable',
    });
  }
}
