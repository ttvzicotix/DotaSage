import { FALLBACK_HEROES } from '../data/fallbackHeroes.js';

const BASE = 'https://api.opendota.com/api';
const HERO_CACHE_KEY = 'heroes:v3';
const matchupCache = new Map();
const evidenceCache = new Map();
const durationCache = new Map();
const itemPopularityCache = new Map();
let heroStatsCache = null;
let itemsCache = null;

const slugOverrides = {
  'Anti-Mage': 'antimage', 'Centaur Warrunner': 'centaur', Clockwerk: 'rattletrap', Doom: 'doom_bringer',
  Io: 'wisp', Kunkka: 'kunkka', Lifestealer: 'life_stealer', Magnus: 'magnataur', "Nature's Prophet": 'furion',
  Necrophos: 'necrolyte', 'Outworld Destroyer': 'obsidian_destroyer', 'Queen of Pain': 'queenofpain',
  'Shadow Fiend': 'nevermore', Timbersaw: 'shredder', 'Treant Protector': 'treant', Underlord: 'abyssal_underlord',
  Windranger: 'windrunner', 'Wraith King': 'skeleton_king', Zeus: 'zuus',
};

const fallbackById = new Map(FALLBACK_HEROES.map(hero => [Number(hero.id), hero]));
const fallbackByName = new Map(FALLBACK_HEROES.map(hero => [hero.localized_name, hero]));

function portraitSlug(hero) {
  if (hero.name?.startsWith('npc_dota_hero_')) return hero.name.replace('npc_dota_hero_', '');
  return slugOverrides[hero.localized_name] || hero.localized_name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

export function portraitUrl(hero) {
  return `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/${portraitSlug(hero)}.png`;
}

function cacheRead(key, ttlMs) {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(`dotasage:${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.savedAt || Date.now() - parsed.savedAt > ttlMs) {
      window.localStorage.removeItem(`dotasage:${key}`);
      return null;
    }
    return parsed.value;
  } catch { return null; }
}

function cacheWrite(key, value) {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(`dotasage:${key}`, JSON.stringify({ savedAt: Date.now(), value })); }
  catch { /* localStorage can be unavailable/private; memory cache still works */ }
}

export function clearPatchSensitiveCaches() {
  heroStatsCache = null;
  itemsCache = null;
  matchupCache.clear();
  evidenceCache.clear();
  durationCache.clear();
  itemPopularityCache.clear();
  if (typeof window === 'undefined') return;
  try {
    const exact = ['dotasage:heroes', 'dotasage:heroes:v2', 'dotasage:heroes:v3', 'dotasage:heroStats', 'dotasage:items'];
    exact.forEach(key => window.localStorage.removeItem(key));
    for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
      const key = window.localStorage.key(index);
      if (!key) continue;
      if (
        key.startsWith('dotasage:matchups:') ||
        key.startsWith('dotasage:evidence:') ||
        key.startsWith('dotasage:durations:') ||
        key.startsWith('dotasage:itemPopularity:')
      ) window.localStorage.removeItem(key);
    }
  } catch {}
}

export function clearPlayerCache(accountId) {
  if (!accountId || typeof window === 'undefined') return;
  const id = String(accountId);
  const exact = [`player:${id}`, `playerHeroes:${id}`, `wl:${id}`, `recent:${id}`].map(key => `dotasage:${key}`);
  try {
    exact.forEach(key => window.localStorage.removeItem(key));
    for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
      const key = window.localStorage.key(index);
      if (key?.startsWith(`dotasage:history:${id}:`)) window.localStorage.removeItem(key);
    }
  } catch {}
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function getJson(path, { ttlMs = 0, cacheKey = path, retries = 2 } = {}) {
  if (ttlMs) {
    const cached = cacheRead(cacheKey, ttlMs);
    if (cached != null) return cached;
  }
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(`${BASE}${path}`, { headers: { Accept: 'application/json' } });
      if (!response.ok) {
        const error = new Error(`OpenDota ${response.status}: ${path}`);
        error.status = response.status;
        throw error;
      }
      const value = await response.json();
      if (ttlMs) cacheWrite(cacheKey, value);
      return value;
    } catch (error) {
      lastError = error;
      if (attempt >= retries || (error?.status && error.status < 429)) break;
      await sleep(450 * (attempt + 1));
    }
  }
  throw lastError;
}

function withProviderTag(value, provider) {
  if (!provider || value == null) return value;
  if (Array.isArray(value)) return value.map(row => row && typeof row === 'object' ? { ...row, _provider: provider } : row);
  if (typeof value === 'object') return { ...value, _provider: provider };
  return value;
}

async function getPlayerResource(resource, accountId, { ttlMs = 0, cacheKey, take = 100, skip = 0, fallbackPath } = {}) {
  if (!accountId) return resource === 'profile' || resource === 'wl' ? null : [];
  if (ttlMs && cacheKey) {
    const cached = cacheRead(cacheKey, ttlMs);
    if (cached != null) return cached;
  }

  try {
    const query = new URLSearchParams({
      accountId: String(accountId),
      resource,
      take: String(take),
      skip: String(skip),
    });
    const response = await fetch(`/api/player?${query.toString()}`, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Provider router ${response.status}`);
    const payload = await response.json();
    const value = withProviderTag(payload?.data, payload?.provider);
    if (ttlMs && cacheKey) cacheWrite(cacheKey, value);
    return value;
  } catch (error) {
    console.warn(`DotaSage provider router unavailable for ${resource}; using direct OpenDota fallback.`, error);
    if (!fallbackPath) return resource === 'profile' || resource === 'wl' ? null : [];
    return getJson(fallbackPath, { ttlMs, cacheKey, retries: 2 });
  }
}

export async function requestPlayerRefresh(accountId) {
  if (!accountId) return false;
  try {
    const response = await fetch(`${BASE}/players/${accountId}/refresh`, {
      method: 'POST',
      headers: { Accept: 'application/json' },
    });
    return response.ok;
  } catch {
    return false;
  }
}

function fallbackHeroRoster() {
  return FALLBACK_HEROES
    .filter(hero => hero?.id && hero?.localized_name)
    .map(hero => ({ ...hero, name: hero.name || hero.localized_name }));
}

export async function fetchHeroes() {
  try {
    const live = await getJson('/heroes', {
      ttlMs: 24 * 60 * 60 * 1000,
      cacheKey: HERO_CACHE_KEY,
    });

    if (!Array.isArray(live) || live.length < 100) {
      throw new Error(`Invalid OpenDota hero roster: ${Array.isArray(live) ? live.length : 'not-array'} rows`);
    }

    const roster = live
      .filter(hero => hero?.id && hero?.localized_name)
      .map(hero => {
        const fallback = fallbackById.get(Number(hero.id)) || fallbackByName.get(hero.localized_name) || {};
        return {
          ...fallback,
          ...hero,
          name: hero.name,
          lanes: fallback.lanes || [],
          roleHints: fallback.roleHints || fallback.roles || [],
        };
      });

    if (roster.length < 100) throw new Error(`Normalized hero roster too small: ${roster.length}`);
    return roster;
  } catch (error) {
    console.warn('OpenDota hero roster unavailable/invalid; using bundled fallback roster.', error);
    return fallbackHeroRoster();
  }
}

// Player resources go through the DotaSage provider router first. OpenDota remains
// the direct browser fallback so local development and provider outages still degrade cleanly.
export async function fetchPlayer(accountId) {
  return getPlayerResource('profile', accountId, {
    ttlMs: 10 * 60 * 1000,
    cacheKey: `player:${accountId}`,
    fallbackPath: `/players/${accountId}`,
  });
}
export async function fetchPlayerHeroes(accountId) {
  return getPlayerResource('heroes', accountId, {
    ttlMs: 10 * 60 * 1000,
    cacheKey: `playerHeroes:${accountId}`,
    take: 500,
    fallbackPath: `/players/${accountId}/heroes`,
  });
}
export async function fetchPlayerWinLoss(accountId) {
  return getPlayerResource('wl', accountId, {
    ttlMs: 10 * 60 * 1000,
    cacheKey: `wl:${accountId}`,
    fallbackPath: `/players/${accountId}/wl`,
  });
}
export async function fetchRecentMatches(accountId) {
  return getPlayerResource('recent', accountId, {
    ttlMs: 5 * 60 * 1000,
    cacheKey: `recent:${accountId}`,
    take: 20,
    fallbackPath: `/players/${accountId}/recentMatches`,
  });
}
export async function fetchMatch(matchId) { return getJson(`/matches/${matchId}`, { ttlMs: 12 * 60 * 60 * 1000, cacheKey: `match:${matchId}`, retries: 2 }); }

export async function fetchPlayerMatchHistory(accountId, { pageSize = 100, maxPages = 30 } = {}) {
  if (!accountId) return [];
  const all = []; const seen = new Set();
  let offset = 0;
  for (let page = 0; page < maxPages; page += 1) {
    const rows = await getPlayerResource('history', accountId, {
      ttlMs: 30 * 60 * 1000,
      cacheKey: `history:${accountId}:${pageSize}:${offset}`,
      take: pageSize,
      skip: offset,
      fallbackPath: `/players/${accountId}/matches?limit=${pageSize}&offset=${offset}`,
    });
    if (!Array.isArray(rows) || !rows.length) break;
    let added = 0;
    for (const row of rows) {
      const key = String(row.match_id ?? `${row.start_time}:${row.hero_id}`);
      if (seen.has(key)) continue;
      seen.add(key); all.push(row); added += 1;
    }
    offset += rows.length;
    if (!added || rows.length < pageSize) break;
  }
  return all;
}

export async function fetchHeroStats() {
  if (heroStatsCache) return heroStatsCache;
  heroStatsCache = await getJson('/heroStats', { ttlMs: 60 * 60 * 1000, cacheKey: 'heroStats' });
  return heroStatsCache;
}

export async function fetchHeroEvidence(heroId) {
  if (evidenceCache.has(heroId)) return evidenceCache.get(heroId);
  const cacheKey = `evidence:${heroId}`;
  const cached = cacheRead(cacheKey, 6 * 60 * 60 * 1000);
  if (cached != null) {
    evidenceCache.set(heroId, cached);
    matchupCache.set(heroId, cached.matchups || []);
    return cached;
  }

  try {
    const response = await fetch(`/api/matchups?heroId=${encodeURIComponent(heroId)}`, {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`Matchup router ${response.status}`);
    const payload = await response.json();
    const provider = payload?.provider || null;
    const matchups = Array.isArray(payload?.rows)
      ? payload.rows.map(row => ({ ...row, _provider: row._provider || provider }))
      : [];
    const synergy = Array.isArray(payload?.synergy)
      ? payload.synergy.map(row => ({ ...row, _provider: row._provider || provider }))
      : [];
    if (matchups.length || synergy.length) {
      const value = { provider, matchups, synergy, attempts: payload?.attempts || [] };
      cacheWrite(cacheKey, value);
      evidenceCache.set(heroId, value);
      matchupCache.set(heroId, matchups);
      return value;
    }
  } catch (error) {
    console.warn('DotaSage matchup provider router unavailable; using direct OpenDota fallback.', error);
  }

  const matchups = await getJson(`/heroes/${heroId}/matchups`, {
    ttlMs: 6 * 60 * 60 * 1000,
    cacheKey: `matchups:${heroId}`,
  });
  const tagged = Array.isArray(matchups) ? matchups.map(row => ({ ...row, _provider: 'OpenDota' })) : [];
  const value = { provider: 'OpenDota', matchups: tagged, synergy: [], attempts: [] };
  cacheWrite(cacheKey, value);
  evidenceCache.set(heroId, value);
  matchupCache.set(heroId, tagged);
  return value;
}

export async function fetchHeroMatchups(heroId) {
  if (matchupCache.has(heroId)) return matchupCache.get(heroId);
  const evidence = await fetchHeroEvidence(heroId);
  return evidence.matchups || [];
}

export async function fetchHeroDurations(heroId) {
  if (durationCache.has(heroId)) return durationCache.get(heroId);
  const data = await getJson(`/heroes/${heroId}/durations`, { ttlMs: 12 * 60 * 60 * 1000, cacheKey: `durations:${heroId}` });
  durationCache.set(heroId, data);
  return data;
}

export async function fetchHeroItemPopularity(heroId) {
  if (itemPopularityCache.has(heroId)) return itemPopularityCache.get(heroId);
  const data = await getJson(`/heroes/${heroId}/itemPopularity`, { ttlMs: 12 * 60 * 60 * 1000, cacheKey: `itemPopularity:${heroId}` });
  itemPopularityCache.set(heroId, data);
  return data;
}

function stripItemPrefix(value) {
  return String(value ?? '').replace(/^item_/, '');
}

export function normalizeItemConstants(raw = {}) {
  const entries = Object.entries(raw || {}).filter(([, item]) => item && typeof item === 'object');
  const keyById = new Map();
  for (const [key, item] of entries) {
    if (item?.id != null) keyById.set(String(Number(item.id)), stripItemPrefix(item.name || key));
  }

  const normalizeComponent = component => {
    let value = component;
    if (value && typeof value === 'object') value = value.name ?? value.key ?? value.id;
    const stripped = stripItemPrefix(value);
    if (!stripped) return null;
    if (/^\d+$/.test(stripped)) return keyById.get(String(Number(stripped))) || stripped;
    return stripped;
  };

  const indexed = {};
  for (const [rawKey, rawItem] of entries) {
    const key = stripItemPrefix(rawItem.name || rawKey);
    const item = {
      ...rawItem,
      // dotaconstants recipes use canonical internal names (for example `pers`,
      // `ultimate_orb`, `blink`). Keep that namespace explicit so recipe code
      // never has to guess from display names or numeric IDs.
      name: key,
      key,
      components: Array.isArray(rawItem.components)
        ? rawItem.components.map(normalizeComponent).filter(Boolean)
        : rawItem.components,
    };
    indexed[key] = item;
    indexed[`item_${key}`] = item;
    if (item.id != null) indexed[String(Number(item.id))] = item;
  }
  return indexed;
}

export async function fetchItems() {
  if (itemsCache) return itemsCache;
  const raw = await getJson('/constants/items', { ttlMs: 24 * 60 * 60 * 1000, cacheKey: 'items' });
  itemsCache = normalizeItemConstants(raw);
  return itemsCache;
}

export function itemImageUrl(item) {
  const img = item?.img || '';
  if (/^https?:\/\//.test(img)) return img;
  if (img.startsWith('/')) return `https://cdn.cloudflare.steamstatic.com${img}`;
  const slug = item?.name || item?.dname?.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  return slug ? `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/items/${slug}.png` : '';
}
