const BASE = 'https://api.opendota.com/api';

async function fetchJson(url, timeout = 7000) {
  const response = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'DotaSage/1.0' },
    signal: AbortSignal.timeout(timeout),
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
}

function abilityKeyForId(map, id) {
  const numeric = Number(id);
  const direct = map?.[String(numeric)];
  if (typeof direct === 'string') return direct;
  for (const [key, value] of Object.entries(map || {})) {
    if (Number(value) === numeric) return key;
  }
  return null;
}

function prettyAbility(key) {
  return String(key || '')
    .replace(/^special_bonus_/, 'Talent: ')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, ch => ch.toUpperCase());
}

function abilityImage(key, row) {
  const img = row?.img || '';
  if (/^https?:\/\//.test(img)) return img;
  if (img.startsWith('/')) return `https://cdn.cloudflare.steamstatic.com${img}`;
  return key
    ? `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/abilities/${key}.png`
    : null;
}

export default async function handler(req, res) {
  if (req.method && req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const heroId = Number(req.query?.heroId);
  if (!Number.isInteger(heroId) || heroId <= 0) {
    return res.status(400).json({ error: 'invalid_hero_id' });
  }

  try {
    const [heroMatches, abilityIds, abilities] = await Promise.all([
      fetchJson(`${BASE}/heroes/${heroId}/matches`, 6500),
      fetchJson(`${BASE}/constants/ability_ids`, 6500),
      fetchJson(`${BASE}/constants/abilities`, 6500).catch(() => ({})),
    ]);

    const matchIds = (Array.isArray(heroMatches) ? heroMatches : [])
      .map(row => Number(row?.match_id))
      .filter(Number.isFinite)
      .slice(0, 6);

    const details = await Promise.allSettled(
      matchIds.map(matchId => fetchJson(`${BASE}/matches/${matchId}`, 7500)),
    );

    const samples = [];
    for (const result of details) {
      if (result.status !== 'fulfilled') continue;
      const match = result.value;
      const player = (match?.players || []).find(row => Number(row?.hero_id) === heroId);
      if (!player) continue;

      const points = [];
      if (Array.isArray(player.ability_upgrades) && player.ability_upgrades.length) {
        for (const upgrade of player.ability_upgrades) {
          const key = abilityKeyForId(abilityIds, upgrade?.ability ?? upgrade?.ability_id);
          const level = Number(upgrade?.level);
          if (!key || key === 'generic_hidden' || !Number.isInteger(level) || level <= 0) continue;
          points.push({ level, key });
        }
      }

      // Older parsed records may only expose ordered IDs. Keep this as a fallback,
      // but prefer explicit hero levels whenever OpenDota supplies them.
      if (!points.length && Array.isArray(player.ability_upgrades_arr)) {
        player.ability_upgrades_arr.slice(0, 18).forEach((id, index) => {
          const key = abilityKeyForId(abilityIds, id);
          if (key && key !== 'generic_hidden') points.push({ level: index + 1, key });
        });
      }

      if (points.length >= 4) samples.push(points);
    }

    const levels = [];
    for (let level = 1; level <= 15; level += 1) {
      const votes = new Map();
      for (const points of samples) {
        for (const point of points.filter(row => row.level === level)) {
          votes.set(point.key, (votes.get(point.key) || 0) + 1);
        }
      }
      const winner = [...votes.entries()].sort((a, b) => b[1] - a[1])[0];
      if (!winner) continue;
      const [key, votesFor] = winner;
      const row = abilities?.[key] || {};
      const isTalent = key.startsWith('special_bonus_');
      levels.push({
        level,
        key,
        name: isTalent ? 'Talent' : (row?.dname || prettyAbility(key)),
        image: isTalent ? null : abilityImage(key, row),
        votes: votesFor,
        samples: samples.length,
      });
    }

    res.setHeader('Cache-Control', 'public, s-maxage=21600, stale-while-revalidate=43200');
    return res.status(200).json({
      provider: 'OpenDota parsed matches',
      heroId,
      samples: samples.length,
      levels,
    });
  } catch (error) {
    return res.status(200).json({
      provider: null,
      heroId,
      samples: 0,
      levels: [],
      error: error?.message || 'skill_build_unavailable',
    });
  }
}
