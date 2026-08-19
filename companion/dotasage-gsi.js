import http from 'node:http';

const HOST = '127.0.0.1';
const PORT = 31982;
const TOKEN = 'dotasage-local-v1';
let latest = null;
let updatedAt = 0;
let postCount = 0;
let authFailures = 0;
let parseFailures = 0;
let lastPostAt = 0;
let lastError = null;

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
  res.setHeader('Cache-Control', 'no-store');
}

function nestedValues(obj) {
  if (!obj || typeof obj !== 'object') return [];
  return Object.values(obj).flatMap(v => (v && typeof v === 'object') ? [v, ...nestedValues(v)] : []);
}

function firstNamed(obj, prefix) {
  const candidates = [obj, ...nestedValues(obj)];
  return candidates.find(v => typeof v?.name === 'string' && v.name.startsWith(prefix)) || null;
}

function ownItems(payload) {
  const root = payload?.items;
  if (!root || typeof root !== 'object') return [];
  return Object.entries(root)
    .filter(([, value]) => value && typeof value === 'object' && typeof value.name === 'string')
    .map(([slot, value]) => ({
      name: value.name,
      slot,
      neutral: String(slot).toLowerCase().includes('neutral'),
      purchaser: value.purchaser ?? null,
      can_cast: value.can_cast ?? null,
      cooldown: value.cooldown ?? null,
    }))
    .filter(value => /^item_/.test(value.name));
}

function dotaAccountId(player) {
  const direct = player?.accountid ?? player?.account_id;
  if (/^\d+$/.test(String(direct ?? ''))) return String(direct);
  const steam = player?.steamid ?? player?.steam_id;
  try {
    const steam64 = BigInt(String(steam ?? ''));
    const base = 76561197960265728n;
    if (steam64 >= base) return String(steam64 - base);
  } catch {}
  return null;
}

function gameStateInfo(rawState) {
  const raw = String(rawState || '');
  const labels = {
    DOTA_GAMERULES_STATE_INIT: 'INITIALIZING',
    DOTA_GAMERULES_STATE_WAIT_FOR_PLAYERS_TO_LOAD: 'LOADING PLAYERS',
    DOTA_GAMERULES_STATE_HERO_SELECTION: 'HERO SELECTION',
    DOTA_GAMERULES_STATE_STRATEGY_TIME: 'STRATEGY TIME',
    DOTA_GAMERULES_STATE_TEAM_SHOWCASE: 'TEAM SHOWCASE',
    DOTA_GAMERULES_STATE_PRE_GAME: 'PRE-GAME',
    DOTA_GAMERULES_STATE_GAME_IN_PROGRESS: 'LIVE MATCH',
    DOTA_GAMERULES_STATE_POST_GAME: 'POST-GAME',
    DOTA_GAMERULES_STATE_DISCONNECT: 'DISCONNECTED',
  };
  const fallback = raw
    .replace(/^DOTA_GAMERULES_STATE_/, '')
    .replace(/_/g, ' ')
    .trim();
  return {
    label: labels[raw] || fallback || null,
    statsActive: raw === 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS' || raw === 'DOTA_GAMERULES_STATE_POST_GAME',
  };
}

function sanitize(payload) {
  const hero = payload?.hero && typeof payload.hero === 'object' ? payload.hero : firstNamed(payload?.hero, 'npc_dota_hero_');
  const player = payload?.player && typeof payload.player === 'object' ? payload.player : null;
  const map = payload?.map && typeof payload.map === 'object' ? payload.map : {};
  const gameState = gameStateInfo(map.game_state);
  const stat = value => gameState.statsActive ? (value ?? null) : null;
  return {
    connected: true,
    updatedAt,
    provider: payload?.provider ? { name: payload.provider.name, appid: payload.provider.appid, timestamp: payload.provider.timestamp } : null,
    map: {
      clock_time: map.clock_time ?? null,
      game_time: map.game_time ?? null,
      game_state: gameState.label,
      game_state_raw: map.game_state ?? null,
      stats_active: gameState.statsActive,
      matchid: map.matchid ?? null,
      daytime: map.daytime ?? null,
      roshan_state: map.roshan_state ?? null,
    },
    hero: hero ? {
      name: hero.name ?? null,
      level: hero.level ?? null,
      health: hero.health ?? null,
      max_health: hero.max_health ?? null,
      mana: hero.mana ?? null,
      max_mana: hero.max_mana ?? null,
      alive: hero.alive ?? null,
    } : null,
    player: player ? {
      account_id: dotaAccountId(player),
      kills: stat(player.kills),
      deaths: stat(player.deaths),
      assists: stat(player.assists),
      last_hits: stat(player.last_hits),
      denies: stat(player.denies),
      gold: stat(player.gold),
      gpm: stat(player.gpm),
      xpm: stat(player.xpm),
      net_worth: stat(player.net_worth),
      team_name: player.team_name ?? null,
      activity: player.activity ?? null,
    } : null,
    items: ownItems(payload),
  };
}

function health() {
  const ageMs = updatedAt ? Date.now() - updatedAt : null;
  return {
    ok: true,
    bridge: true,
    host: HOST,
    port: PORT,
    hasPayload: Boolean(latest),
    connected: Boolean(latest && ageMs <= 15000),
    ageMs,
    postCount,
    authFailures,
    parseFailures,
    lastPostAt,
    lastError,
  };
}

const server = http.createServer((req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  if (req.method === 'GET' && req.url === '/health') {
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify(health()));
  }
  if (req.method === 'GET' && req.url === '/state') {
    res.setHeader('Content-Type', 'application/json');
    const ageMs = updatedAt ? Date.now() - updatedAt : null;
    if (!latest || ageMs > 15000) return res.end(JSON.stringify({ bridge: true, connected: false, updatedAt, ageMs, postCount, lastError }));
    return res.end(JSON.stringify({ bridge: true, ...sanitize(latest), postCount }));
  }
  if (req.method === 'POST') {
    lastPostAt = Date.now();
    let body = '';
    req.on('data', chunk => { body += chunk; if (body.length > 2_000_000) req.destroy(); });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        if (payload?.auth?.token !== TOKEN) {
          authFailures += 1;
          lastError = 'POST received with wrong/missing auth token';
          console.log(`[GSI] POST rejected: auth token mismatch (${authFailures} total)`);
          res.writeHead(403); return res.end('forbidden');
        }
        latest = payload;
        updatedAt = Date.now();
        postCount += 1;
        lastError = null;
        if (postCount === 1 || postCount % 30 === 0) {
          console.log(`[GSI] Dota payload received (${postCount}) · hero=${payload?.hero?.name || 'pending'} · clock=${payload?.map?.clock_time ?? 'pending'}`);
        }
        res.writeHead(200, { 'Content-Type': 'text/plain' }); res.end('ok');
      } catch (error) {
        parseFailures += 1;
        lastError = `Invalid JSON payload: ${error?.message || 'unknown parse error'}`;
        console.log(`[GSI] POST parse failure: ${lastError}`);
        res.writeHead(400); res.end('bad json');
      }
    });
    return;
  }
  res.writeHead(404); res.end('not found');
});

server.listen(PORT, HOST, () => {
  console.log(`DotaSage Live Sync listening only on http://${HOST}:${PORT}`);
  console.log('Waiting for Dota 2 GSI. This bridge does not upload game state anywhere.');
  console.log('If Dota never sends a POST: verify the GSI cfg, fully restart Dota, then run scripts/windows/CHECK_LIVE_SYNC.bat.');
});
