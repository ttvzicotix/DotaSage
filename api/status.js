const PROVIDERS = {
  player: ['STRATZ', 'OpenDota', 'Steam Community'],
  matchup: ['STRATZ', 'OpenDota'],
  live: ['OpenDota Live', 'Manual / Local optional'],
};

export default async function handler(req, res) {
  if (req.method && req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const stratzConfigured = Boolean(process.env.STRATZ_TOKEN || process.env.STRATZ_API_TOKEN);

  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
  return res.status(200).json({
    stratzConfigured,
    providers: PROVIDERS,
    strategy: stratzConfigured ? 'multi-provider' : 'opendota-first-fallback',
    checkedAt: new Date().toISOString(),
  });
}
