const OPEN_DOTA = 'https://api.opendota.com/api';
const STEAM_COMMUNITY = 'https://steamcommunity.com';
const STEAM_ID64_BASE = 76561197960265728n;

function clean(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

function decodeHtml(value) {
  return String(value ?? '')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

function xmlText(xml, tag) {
  const cdata = xml.match(new RegExp('<' + tag + '><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></' + tag + '>', 'i'));
  if (cdata) return cdata[1];
  const plain = xml.match(new RegExp('<' + tag + '>([\\s\\S]*?)</' + tag + '>', 'i'));
  return plain ? decodeHtml(plain[1]) : null;
}

function accountIdFromSteam64(value) {
  try {
    const steam64 = BigInt(String(value ?? ''));
    if (steam64 <= STEAM_ID64_BASE) return null;
    const account = steam64 - STEAM_ID64_BASE;
    if (account <= 0n || account > 4294967295n) return null;
    return Number(account);
  } catch {
    return null;
  }
}

async function fetchText(url, options = {}, timeout = 5000) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; DotaSage/1.0; +https://dotasage.vercel.app)',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      ...(options.headers || {}),
    },
    signal: AbortSignal.timeout(timeout),
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return { text: await response.text(), headers: response.headers };
}

async function resolveSteamProfile(profileUrl, expectedName = null) {
  if (!/^https:\/\/steamcommunity\.com\/(id|profiles)\//i.test(profileUrl || '')) return null;
  const base = String(profileUrl).split('?')[0].replace(/\/+$/, '');
  try {
    const { text: xml } = await fetchText(`${base}?xml=1`, {}, 4500);
    const steam64 = xmlText(xml, 'steamID64');
    const accountId = accountIdFromSteam64(steam64);
    if (!accountId) return null;
    return {
      accountId,
      name: xmlText(xml, 'steamID') || expectedName || `Dota ${accountId}`,
      avatar: xmlText(xml, 'avatarFull') || xmlText(xml, 'avatarMedium') || null,
      lastMatchTime: null,
      similarity: null,
      provider: 'Steam Community Search',
      profileUrl: base,
    };
  } catch {
    return null;
  }
}

async function resolveVanity(query) {
  const raw = String(query || '').trim();
  const profileMatch = raw.match(/^https?:\/\/steamcommunity\.com\/(?:id|profiles)\/[^/?#]+/i);
  if (profileMatch) return resolveSteamProfile(profileMatch[0]);

  if (!/^[a-z0-9_-]{2,64}$/i.test(raw)) return null;
  return resolveSteamProfile(`${STEAM_COMMUNITY}/id/${encodeURIComponent(raw)}`, raw);
}

async function openDotaSearch(query) {
  const response = await fetch(`${OPEN_DOTA}/search?q=${encodeURIComponent(query)}`, {
    headers: { Accept: 'application/json', 'User-Agent': 'DotaSage/1.0' },
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error(`OpenDota search returned ${response.status}`);
  const rows = await response.json();
  return (Array.isArray(rows) ? rows : [])
    .filter(row => Number.isInteger(Number(row?.account_id)) && Number(row.account_id) > 0)
    .slice(0, 20)
    .map(row => ({
      accountId: Number(row.account_id),
      name: row.personaname || `Dota ${row.account_id}`,
      avatar: row.avatarfull || null,
      lastMatchTime: row.last_match_time || null,
      similarity: Number.isFinite(Number(row.similarity)) ? Number(row.similarity) : null,
      provider: 'OpenDota Search',
      profileUrl: null,
    }));
}

function sessionIdFromHeaders(headers) {
  const cookie = headers.get('set-cookie') || '';
  const match = cookie.match(/(?:^|[,;]\s*)sessionid=([^;,]+)/i);
  return match?.[1] || null;
}

async function steamCommunitySearch(query) {
  const landing = await fetchText(`${STEAM_COMMUNITY}/search/users/`, {}, 4500);
  const sessionId = sessionIdFromHeaders(landing.headers);
  if (!sessionId) return [];

  const params = new URLSearchParams({
    text: query,
    filter: 'users',
    sessionid: sessionId,
    steamid_user: 'false',
    page: '1',
  });
  const response = await fetch(`${STEAM_COMMUNITY}/search/SearchCommunityAjax?${params}`, {
    headers: {
      Accept: 'application/json, text/javascript, */*; q=0.01',
      'User-Agent': 'Mozilla/5.0 (compatible; DotaSage/1.0; +https://dotasage.vercel.app)',
      'X-Requested-With': 'XMLHttpRequest',
      Referer: `${STEAM_COMMUNITY}/search/users/`,
      Cookie: `sessionid=${sessionId}`,
    },
    signal: AbortSignal.timeout(5500),
  });
  if (!response.ok) throw new Error(`Steam Community search returned ${response.status}`);
  const payload = await response.json();
  const html = String(payload?.html || '');

  const candidates = [];
  const pattern = /<a\s+class=["']searchPersonaName["']\s+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = pattern.exec(html)) && candidates.length < 8) {
    candidates.push({ profileUrl: match[1], name: decodeHtml(match[2]) });
  }
  const resolved = await Promise.all(candidates.map(row => resolveSteamProfile(row.profileUrl, row.name)));
  return resolved.filter(Boolean);
}

function rankResult(row, query) {
  const q = query.toLowerCase();
  const name = String(row?.name || '').toLowerCase();
  let score = 0;
  if (name === q) score += 100;
  else if (name.startsWith(q)) score += 60;
  else if (name.includes(q)) score += 35;
  if (row.provider === 'Steam Vanity') score += 130;
  if (row.lastMatchTime) score += Math.max(0, 20 - (Date.now() - new Date(row.lastMatchTime).getTime()) / 86400000);
  return score;
}

export default async function handler(req, res) {
  if (req.method && req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const q = clean(req.query?.q);
  if (q.length < 2 || q.length > 128) {
    return res.status(400).json({ error: 'invalid_query' });
  }

  const [openDotaSettled, steamSettled, vanitySettled] = await Promise.allSettled([
    openDotaSearch(q),
    steamCommunitySearch(q),
    resolveVanity(q),
  ]);

  const attempts = [
    { provider: 'OpenDota Search', ok: openDotaSettled.status === 'fulfilled' },
    { provider: 'Steam Community Search', ok: steamSettled.status === 'fulfilled' },
    { provider: 'Steam Vanity', ok: vanitySettled.status === 'fulfilled', found: Boolean(vanitySettled.status === 'fulfilled' && vanitySettled.value) },
  ];

  const rows = [
    ...(vanitySettled.status === 'fulfilled' && vanitySettled.value ? [{ ...vanitySettled.value, provider: 'Steam Vanity' }] : []),
    ...(openDotaSettled.status === 'fulfilled' ? openDotaSettled.value : []),
    ...(steamSettled.status === 'fulfilled' ? steamSettled.value : []),
  ];

  const deduped = [];
  const seen = new Set();
  for (const row of rows) {
    if (!row?.accountId || seen.has(row.accountId)) continue;
    seen.add(row.accountId);
    deduped.push(row);
  }
  deduped.sort((a, b) => rankResult(b, q) - rankResult(a, q));

  if (!deduped.length && attempts.every(attempt => !attempt.ok)) {
    return res.status(502).json({ error: 'search_unavailable', attempts });
  }

  res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=600');
  return res.status(200).json({ query: q, results: deduped.slice(0, 20), attempts });
}
