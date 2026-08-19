import { FALLBACK_HEROES } from '../data/fallbackHeroes';

const BASE = 'https://api.opendota.com/api';
const matchupCache = new Map();
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

export async function fetchHeroes() {
  try {
    const live = await getJson('/heroes', { ttlMs: 24 * 60 * 60 * 1000, cacheKey: 'heroes' });
    return live.map(hero => {
      const fallback = fallbackById.get(Number(hero.id)) || fallbackByName.get(hero.localized_name) || {};
      return {
        ...fallback,
        ...hero,
        name: hero.name,
        lanes: fallback.lanes || [],
        roleHints: fallback.roles || [],
      };
    });
  } catch (error) {
    console.warn('OpenDota hero roster unavailable; using fallback identity list.', error);
    return FALLBACK_HEROES.map(hero => ({ ...hero, name: hero.name || hero.localized_name }));
  }
}

// The public build ships without a hardcoded player identity. These helpers return
// neutral values until a player explicitly connects a public Dota account ID.
export async function fetchPlayer(accountId) {
  if (!accountId) return null;
  return getJson(`/players/${accountId}`, { ttlMs: 10 * 60 * 1000, cacheKey: `player:${accountId}` });
}
export async function fetchPlayerHeroes(accountId) {
  if (!accountId) return [];
  return getJson(`/players/${accountId}/heroes`, { ttlMs: 10 * 60 * 1000, cacheKey: `playerHeroes:${accountId}` });
}
export async function fetchPlayerWinLoss(accountId) {
  if (!accountId) return null;
  return getJson(`/players/${accountId}/wl`, { ttlMs: 10 * 60 * 1000, cacheKey: `wl:${accountId}` });
}
export async function fetchRecentMatches(accountId) {
  if (!accountId) return [];
  return getJson(`/players/${accountId}/recentMatches`, { ttlMs: 5 * 60 * 1000, cacheKey: `recent:${accountId}` });
}
export async function fetchMatch(matchId) { return getJson(`/matches/${matchId}`, { ttlMs: 12 * 60 * 60 * 1000, cacheKey: `match:${matchId}`, retries: 2 }); }

export async function fetchPlayerMatchHistory(accountId, { pageSize = 500, maxPages = 30 } = {}) {
  if (!accountId) return [];
  const all = []; const seen = new Set();
  let offset = 0;
  for (let page = 0; page < maxPages; page += 1) {
    const rows = await getJson(`/players/${accountId}/matches?limit=${pageSize}&offset=${offset}`, {
      ttlMs: 30 * 60 * 1000,
      cacheKey: `history:${accountId}:${pageSize}:${offset}`,
      retries: 2,
    });
    if (!Array.isArray(rows) || !rows.length) break;
    let added = 0;
    for (const row of rows) {
      const key = String(row.match_id ?? `${row.start_time}:${row.hero_id}`);
      if (seen.has(key)) continue;
      seen.add(key); all.push(row); added += 1;
    }
    // Advance by what the API actually returned, not what we requested. Some endpoints/services cap page sizes.
    offset += rows.length;
    if (!added) break;
  }
  return all;
}

export async function fetchHeroStats() {
  if (heroStatsCache) return heroStatsCache;
  heroStatsCache = await getJson('/heroStats', { ttlMs: 60 * 60 * 1000, cacheKey: 'heroStats' });
  return heroStatsCache;
}

export async function fetchHeroMatchups(heroId) {
  if (matchupCache.has(heroId)) return matchupCache.get(heroId);
  const data = await getJson(`/heroes/${heroId}/matchups`, { ttlMs: 6 * 60 * 60 * 1000, cacheKey: `matchups:${heroId}` });
  matchupCache.set(heroId, data);
  return data;
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
