const OPEN_DOTA = 'https://api.opendota.com/api';

function clean(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

export default async function handler(req, res) {
  if (req.method && req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const q = clean(req.query?.q);
  if (q.length < 2 || q.length > 64) {
    return res.status(400).json({ error: 'invalid_query' });
  }

  try {
    const response = await fetch(`${OPEN_DOTA}/search?q=${encodeURIComponent(q)}`, {
      headers: { Accept: 'application/json', 'User-Agent': 'DotaSage/1.0' },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error(`OpenDota search returned ${response.status}`);
    const rows = await response.json();
    const results = (Array.isArray(rows) ? rows : [])
      .filter(row => Number.isInteger(Number(row?.account_id)) && Number(row.account_id) > 0)
      .slice(0, 12)
      .map(row => ({
        accountId: Number(row.account_id),
        name: row.personaname || `Dota ${row.account_id}`,
        avatar: row.avatarfull || null,
        lastMatchTime: row.last_match_time || null,
        similarity: Number.isFinite(Number(row.similarity)) ? Number(row.similarity) : null,
        provider: 'OpenDota Search',
      }));

    res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=600');
    return res.status(200).json({ query: q, results });
  } catch (error) {
    return res.status(502).json({ error: 'search_unavailable', message: error?.message || 'unknown error' });
  }
}
