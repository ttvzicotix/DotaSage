export async function fetchOnlineLive(accountId) {
  if (!accountId) return { found: false, reason: 'no_account' };
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 7000);
  try {
    const response = await fetch(`/api/live?accountId=${encodeURIComponent(accountId)}`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Online live scan ${response.status}`);
    return await response.json();
  } catch (error) {
    return { found: false, error: error?.message || 'online scan unavailable' };
  } finally {
    window.clearTimeout(timer);
  }
}
