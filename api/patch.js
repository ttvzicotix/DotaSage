const PATCH_URL = 'https://www.dota2.com/datafeed/patchnoteslist?language=english';

export default async function handler(req, res) {
  if (req.method && req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  try {
    const response = await fetch(PATCH_URL, {
      headers: { Accept: 'application/json', 'User-Agent': 'DotaSage/1.0' },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error(`Valve patch feed returned ${response.status}`);
    const payload = await response.json();
    const patches = Array.isArray(payload?.patches) ? payload.patches : [];
    const latest = patches.at(-1);
    if (!latest?.patch_number) throw new Error('Valve patch feed returned no patches');

    const timestamp = Number(latest.patch_timestamp || 0);
    const released = timestamp
      ? new Date(timestamp * 1000).toISOString().slice(0, 10)
      : null;

    res.setHeader('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=86400');
    return res.status(200).json({
      id: latest.patch_number,
      released,
      source: 'Valve Dota 2 datafeed',
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(502).json({ error: 'patch_feed_unavailable', message: error?.message || 'unknown error' });
  }
}
