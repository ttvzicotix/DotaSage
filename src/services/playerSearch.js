export async function searchPlayers(query) {
  const q = String(query ?? '').trim();
  if (q.length < 2) return [];
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 6500);
  try {
    const response = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Player search ${response.status}`);
    const payload = await response.json();
    return Array.isArray(payload?.results) ? payload.results : [];
  } finally {
    window.clearTimeout(timer);
  }
}
