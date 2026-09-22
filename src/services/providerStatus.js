let cached = null;
let cachedAt = 0;
const TTL = 60_000;

export async function fetchProviderStatus() {
  if (cached && Date.now() - cachedAt < TTL) return cached;
  try {
    const response = await fetch('/api/status', {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(`Provider status ${response.status}`);
    cached = await response.json();
    cachedAt = Date.now();
    return cached;
  } catch {
    return {
      stratzConfigured: false,
      providers: {
        player: ['OpenDota', 'Steam Community'],
        matchup: ['OpenDota'],
        live: ['OpenDota Live', 'Manual'],
      },
      strategy: 'degraded',
      checkedAt: null,
    };
  }
}
