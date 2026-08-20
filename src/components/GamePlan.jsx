import { useEffect, useMemo, useRef, useState } from 'react';
import ScorePill from './ScorePill';
import MatchupAtlas from './MatchupAtlas';
import { CURRENT_PATCH } from '../data/currentPatch';
import { fetchRecentMatches, fetchMatch, itemImageUrl } from '../services/openDota';
import { DEFAULT_PROFILE } from '../data/defaultProfile';
import { buildLaneMap, positionName } from '../engine/lanePrediction';
import { fetchLocalGameState, fetchLocalGsiHealth } from '../services/localGsi';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const signed = value => {
  const n = Number(value || 0);
  return `${n > 0 ? '+' : ''}${n.toFixed(1)}`;
};
const normalize = value => String(value ?? '').replace(/^item_/, '').toLowerCase();
const searchNormalize = value => normalize(value).replace(/[^a-z0-9]+/g, '');
const hasRole = (hero, role) => (hero?.roles || []).some(row => String(row).toLowerCase() === String(role).toLowerCase());

const ITEM_ALIAS_TARGETS = {
  bm: ['blademail', 'blade_mail'],
  bkb: ['blackkingbar', 'black_king_bar'],
  mkb: ['monkeykingbar', 'monkey_king_bar'],
  bf: ['battlefury', 'battle_fury'],
  bfury: ['battlefury', 'battle_fury'],
  linken: ['linkenssphere', 'sphere'],
  linkens: ['linkenssphere', 'sphere'],
  manta: ['mantastyle', 'manta'],
  sny: ['sangeandyasha', 'sange_and_yasha'],
  deso: ['desolator'],
  daed: ['daedalus'],
  skadi: ['eyeofskadi', 'skadi'],
  shiva: ['shivasguard', 'shivas_guard'],
  shivas: ['shivasguard', 'shivas_guard'],
  lotus: ['lotusorb', 'lotus_orb'],
  pipe: ['pipeofinsight', 'pipe'],
  crimson: ['crimsonguard', 'crimson_guard'],
  force: ['forcestaff', 'force_staff'],
  fs: ['forcestaff', 'force_staff'],
  glimmer: ['glimmercape', 'glimmer_cape'],
  ghost: ['ghostscepter', 'ghost'],
  eul: ['eulsscepterofdivinity', 'cyclone'],
  euls: ['eulsscepterofdivinity', 'cyclone'],
  agh: ['aghanimsscepter', 'ultimate_scepter'],
  aghs: ['aghanimsscepter', 'ultimate_scepter'],
  shard: ['aghanimsshard', 'aghanims_shard'],
  hex: ['scytheofvyse', 'sheepstick'],
  sheep: ['scytheofvyse', 'sheepstick'],
  mjol: ['mjollnir'],
  mael: ['maelstrom'],
  ac: ['assaultcuirass', 'assault'],
  hh: ['heavenshalberd', 'heavens_halberd'],
  halberd: ['heavenshalberd', 'heavens_halberd'],
  vessel: ['spiritvessel', 'spirit_vessel'],
  null: ['nullifier'],
};

function uniqueItems(itemConstants = {}) {
  const seen = new Set();
  const rows = [];
  for (const item of Object.values(itemConstants || {})) {
    const id = Number(item?.id || 0);
    if (!id || !item?.dname || seen.has(id)) continue;
    seen.add(id);
    rows.push(item);
  }
  return rows;
}

function itemMatchesQuery(item, query) {
  const q = searchNormalize(query);
  if (!q) return true;
  const candidates = [item?.dname, item?.name, item?.key].filter(Boolean).map(searchNormalize);
  if (candidates.some(value => value.includes(q))) return true;
  const targets = ITEM_ALIAS_TARGETS[q];
  if (!targets) return false;
  const normalizedTargets = targets.map(searchNormalize);
  return candidates.some(value => normalizedTargets.some(target => value.includes(target) || target.includes(value)));
}

function itemLookup(items = []) {
  const map = new Map();
  for (const item of items) {
    for (const key of [item.id, item.name, item.key, item.dname].filter(Boolean)) map.set(normalize(key), item);
  }
  return map;
}

function itemBuildsFrom(target, component, lookup, depth = 0, visited = new Set()) {
  if (!target || !component || depth > 6) return false;
  const componentKey = normalize(component.name || component.key);
  if (!componentKey) return false;
  const components = Array.isArray(target.components) ? target.components.map(normalize) : [];
  if (components.includes(componentKey)) return true;
  for (const key of components) {
    if (visited.has(key)) continue;
    visited.add(key);
    const child = lookup.get(key);
    if (child && itemBuildsFrom(child, component, lookup, depth + 1, visited)) return true;
  }
  return false;
}

function topItems(group = {}, itemConstants = {}, count = 8) {
  return Object.entries(group || {})
    .map(([id, uses]) => ({ id: String(id), uses: Number(uses || 0), item: itemConstants?.[id] || itemConstants?.[Number(id)] || null }))
    .filter(row => row.item?.dname && !row.item?.recipe)
    .sort((a, b) => b.uses - a.uses)
    .slice(0, count);
}

function buildItemPhases(itemPopularity, itemConstants, count = 8) {
  if (!itemPopularity) return [];
  return [
    ['START', topItems(itemPopularity.start_game_items, itemConstants, count)],
    ['EARLY', topItems(itemPopularity.early_game_items, itemConstants, count)],
    ['CORE', topItems(itemPopularity.mid_game_items, itemConstants, count)],
    ['LATE', topItems(itemPopularity.late_game_items, itemConstants, count)],
  ];
}

function buildUpgradePaths(phases, lookup) {
  const paths = [];
  const seen = new Set();
  for (let i = 0; i < phases.length; i += 1) {
    for (const source of phases[i][1]) {
      if (Number(source.item?.cost || 0) < 850) continue;
      for (let j = i + 1; j < phases.length; j += 1) {
        const target = phases[j][1].find(row => itemBuildsFrom(row.item, source.item, lookup));
        if (!target) continue;
        const key = `${source.item.id}->${target.item.id}`;
        if (!seen.has(key)) {
          seen.add(key);
          paths.push({ source, target, from: phases[i][0], to: phases[j][0] });
        }
        break;
      }
    }
  }
  return paths.slice(0, 6);
}

const INTERMEDIATE_NAMES = new Set([
  'Sacred Relic', 'Blade of Alacrity', 'Ogre Axe', 'Staff of Wizardry', 'Mithril Hammer', 'Demon Edge',
  'Eaglesong', 'Reaver', 'Mystic Staff', 'Ultimate Orb', 'Point Booster', 'Claymore', 'Broadsword',
  'Quarterstaff', 'Javelin', 'Morbid Mask', 'Ring of Health', 'Void Stone', 'Energy Booster',
  'Vitality Booster', 'Platemail', 'Talisman of Evasion', 'Hyperstone',
]);

function inventoryTargets(phases, lookup) {
  const build = phaseIndexes => {
    const candidates = [];
    const seen = new Set();
    for (const index of [...phaseIndexes].reverse()) {
      for (const row of phases[index]?.[1] || []) {
        const id = Number(row.item?.id || row.id);
        if (!id || seen.has(id) || INTERMEDIATE_NAMES.has(row.item?.dname)) continue;
        seen.add(id);
        candidates.push(row);
      }
    }
    return candidates
      .filter(row => !candidates.some(other => other !== row && itemBuildsFrom(other.item, row.item, lookup)))
      .slice(0, 6);
  };
  return [
    ['EARLY', build([0, 1])],
    ['CORE', build([1, 2])],
    ['LATE', build([2, 3])],
  ];
}

function findItem(items, names = []) {
  const wanted = names.map(searchNormalize);
  return items.find(item => wanted.includes(searchNormalize(item.dname)) || wanted.includes(searchNormalize(item.name)));
}

function countEnemyRole(enemies, role) {
  return enemies.filter(hero => hasRole(hero, role)).length;
}

function conditionalItems(hero, enemies, items, observedCounts) {
  const rows = [];
  const core = hasRole(hero, 'Carry') || hasRole(hero, 'Nuker');
  const support = hasRole(hero, 'Support');
  const observed = name => {
    const item = findItem(items, [name]);
    return item ? Number(observedCounts[item.id] || 0) : 0;
  };
  const add = (condition, names, title, reason, priority = false) => {
    if (!condition) return;
    const item = findItem(items, names);
    if (!item || rows.some(row => row.item.id === item.id)) return;
    rows.push({ item, title, reason, priority });
  };

  add(observed('Butterfly') > 0 && core, ['Monkey King Bar'], 'ACCURACY NOW MATTERS', 'An observed Butterfly makes MKB a concrete response.', true);
  add(observed('Ghost Scepter') + observed("Eul's Scepter of Divinity") + observed('Glimmer Cape') > 0 && core, ['Nullifier'], 'SAVES ARE BLOCKING KILLS', 'Enemy defensive items are already resetting physical kill attempts.', true);
  add(observed('Satanic') + observed('Heart of Tarrasque') > 0, support ? ['Spirit Vessel'] : ['Eye of Skadi', 'Spirit Vessel'], 'SUSTAIN IS SHOWING', 'Observed sustain makes anti-heal more valuable.', true);
  add(countEnemyRole(enemies, 'Disabler') >= 2 || countEnemyRole(enemies, 'Nuker') >= 3, core ? ['Black King Bar'] : ['Force Staff', 'Glimmer Cape'], 'IF CONTROL STOPS YOUR JOB', core ? 'Protect the damage window.' : 'Create space for yourself or a core.');
  add(countEnemyRole(enemies, 'Initiator') >= 2, support ? ['Force Staff'] : ["Linken's Sphere", 'Black King Bar'], 'IF YOU KEEP GETTING JUMPED', 'Survive or redirect the first enemy commitment.');
  add(countEnemyRole(enemies, 'Carry') >= 2, support ? ['Ghost Scepter', "Heaven's Halberd"] : ['Butterfly', "Shiva's Guard"], 'IF PHYSICAL DAMAGE TAKES OVER', 'Shift a slot toward surviving right-click commitment.');
  add(enemies.some(enemy => ['Phantom Lancer', 'Naga Siren', 'Terrorblade', 'Chaos Knight', 'Meepo'].includes(enemy.localized_name)), core ? ['Mjollnir', 'Maelstrom', 'Battle Fury'] : ["Shiva's Guard"], 'IF ILLUSIONS TAKE OVER', 'Add repeatable area damage or control.');
  return rows.sort((a, b) => Number(b.priority) - Number(a.priority)).slice(0, 6);
}

function observedImpact(observedCounts, items) {
  const count = name => {
    const item = findItem(items, [name]);
    return item ? Number(observedCounts[item.id] || 0) : 0;
  };
  const rows = [];
  if (count('Butterfly')) rows.push('Butterfly observed: accuracy is a real problem now.');
  if (count('Black King Bar')) rows.push('BKB observed: track immunity windows before spending control.');
  if (count("Linken's Sphere")) rows.push("Linken's observed: plan a deliberate pop before the targeted spell that matters.");
  if (count('Ghost Scepter') + count("Eul's Scepter of Divinity") + count('Glimmer Cape') + count('Force Staff')) rows.push('Save items observed: target selection and dispel answers matter more than raw damage.');
  if (count('Satanic') + count('Heart of Tarrasque')) rows.push('Major sustain observed: coordinate burst and anti-heal instead of assuming the first health bar is the kill.');
  if (count('Crimson Guard') + count('Pipe of Insight')) rows.push('Team mitigation observed: expect longer fights and value isolation more.');
  return rows.slice(0, 4);
}

function applyLaneOverrides(map, overrides = {}) {
  const rows = ['top', 'mid', 'bottom'].map(lane => ({ lane, radiant: [], dire: [] }));
  for (const row of map.lanes) {
    for (const side of ['radiant', 'dire']) {
      for (const entry of row[side]) {
        const lane = overrides[entry.hero.id] || row.lane;
        rows.find(candidate => candidate.lane === lane)?.[side].push(entry);
      }
    }
  }
  return { ...map, lanes: rows };
}

function heroLane(map, heroId) {
  for (const row of map.lanes) {
    if (row.radiant.some(entry => Number(entry.hero.id) === Number(heroId)) || row.dire.some(entry => Number(entry.hero.id) === Number(heroId))) return row.lane;
  }
  return null;
}

function effectivePosition(lane, playerSide, laneFilter, fallback) {
  if (!lane) return fallback;
  if (lane === 'mid') return 'POSITION 2 · MID';
  const safe = playerSide === 'radiant' ? 'bottom' : 'top';
  if (lane === safe) return laneFilter === 'support5' ? 'POSITION 5 · HARD SUPPORT' : 'POSITION 1 · SAFE LANE';
  return ['support4', 'roam'].includes(laneFilter) ? 'POSITION 4 · SUPPORT' : 'POSITION 3 · OFFLANE';
}

function LaneBoard({ map, selfId, overrides, onMove }) {
  const drop = (event, lane) => {
    event.preventDefault();
    const id = Number(event.dataTransfer.getData('text/dotasage-hero'));
    if (id) onMove(id, lane);
  };
  const side = (row, team) => <div className={`gpv2-lane-side ${team}`} onDragOver={event => event.preventDefault()} onDrop={event => drop(event, row.lane)}>
    {row[team].map(entry => <div className={`gpv2-lane-hero ${entry.hero.id === selfId ? 'self' : ''}`} key={`${row.lane}-${team}-${entry.hero.id}`} draggable onDragStart={event => event.dataTransfer.setData('text/dotasage-hero', String(entry.hero.id))}>
      <img src={entry.hero.portrait} alt="" />
      <span><b>{entry.hero.localized_name}</b><small>{positionName(entry.position)}</small></span>
    </div>)}
  </div>;
  return <section className="gpv2-card gpv2-lanes">
    <div className="gpv2-card-head"><div><span>LANE MAP</span><strong>Drag any hero to correct the prediction</strong></div>{Object.keys(overrides).length > 0 && <button onClick={() => onMove(null, null, true)}>RESET</button>}</div>
    <div className="gpv2-lane-board">
      <div className="gpv2-lane-label radiant">RADIANT</div><div /><div className="gpv2-lane-label dire">DIRE</div>
      {map.lanes.map(row => <div className="gpv2-lane-row" key={row.lane}>{side(row, 'radiant')}<div className="gpv2-lane-name">{row.lane.toUpperCase()}</div>{side(row, 'dire')}</div>)}
    </div>
  </section>;
}

function phaseForMinute(minute) {
  const m = Number(minute || 0);
  if (m < 10) return ['LANING', '0–10'];
  if (m < 20) return ['MAP OPENING', '10–20'];
  if (m < 35) return ['OBJECTIVES', '20–35'];
  return ['LATE GAME', '35+'];
}

function roleCheckpoints(positionLabel, hero) {
  const role = String(positionLabel || '').toLowerCase();
  if (role.includes('support')) return [
    ['0–5', 'Protect equilibrium and contest pull access.'],
    ['5–10', 'Use rune/catapult windows; stack when the route is free.'],
    ['10–20', 'Move vision with the core that can take space.'],
    ['20+', 'Stay alive for the spell/item the fight requires.'],
  ];
  if (role.includes('safe')) return [
    ['0–7', 'Protect last hits and lane position first.'],
    ['7–15', 'Take the safest valuable wave + nearby camps.'],
    ['15–30', 'Use the first real item timing to choose fights.'],
    ['30+', `Preserve ${hero.localized_name}'s buyback and objective windows.`],
  ];
  if (role.includes('mid')) return [
    ['0–6', 'Win the wave before trying to win the map.'],
    ['6–12', 'Push before rotating; do not force dead side lanes.'],
    ['12–25', 'Pressure around the item/level that changes your kill pattern.'],
    ['25+', 'Re-evaluate whether your job is tempo, catch or damage.'],
  ];
  return [
    ['0–7', 'Pressure lane access without donating your HP.'],
    ['7–15', 'Turn durability/initiation into tower or jungle control.'],
    ['15–30', 'Force fights where your initiation is easy to follow.'],
    ['30+', 'Itemize for aura, catch or counter-initiation, not generic tankiness.'],
  ];
}

function objectiveCall(minute, state, converter) {
  const m = Number(minute || 0);
  const prefix = state === 'ahead' ? 'AHEAD: take territory before chasing.' : state === 'behind' ? 'BEHIND: shove safe waves and reclaim vision in layers.' : 'EVEN: establish information before forcing the next fight.';
  let next = 'Lane resources → rune/rotation → first tower.';
  if (m >= 10 && m < 20) next = 'Outer tower + jungle entrance control.';
  else if (m >= 20 && m < 35) next = 'Roshan / Tormentor / T2: choose one and move vision first.';
  else if (m >= 35) next = 'Roshan, buyback discipline, then high ground.';
  return `${prefix} ${next}${converter?.localized_name ? ` ${converter.localized_name} is your clearest conversion hero.` : ''}`;
}

function visionCall(minute, state) {
  const phase = phaseForMinute(minute)[0];
  if (state === 'behind') return `${phase}: protect your own ramps, farming entrances and smoke-warning vision before attempting deep wards.`;
  if (state === 'ahead') return `${phase}: move one layer deeper and ward the enemy route into the area you already control.`;
  return `${phase}: ward the contested entrance around the next objective so the fight starts with information instead of a face-check.`;
}

function LiveBar({ itemConstants, onMinute }) {
  const [enabled, setEnabled] = useState(() => {
    try { return sessionStorage.getItem('dotasage:live-sync-enabled') === '1'; } catch { return false; }
  });
  const [state, setState] = useState({ bridge: false, connected: false });
  const [health, setHealth] = useState({ bridge: false, ok: false });
  const minuteRef = useRef(null);
  const onMinuteRef = useRef(onMinute);
  useEffect(() => { onMinuteRef.current = onMinute; }, [onMinute]);

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    const poll = async () => {
      const [next, nextHealth] = await Promise.all([fetchLocalGameState(), fetchLocalGsiHealth()]);
      if (cancelled) return;
      setState(next || { bridge: false, connected: false });
      setHealth(nextHealth || { bridge: false, ok: false });
      const seconds = Number(next?.map?.clock_time);
      if (next?.connected && Number.isFinite(seconds) && seconds >= 0) {
        const bucket = Math.floor(seconds / 30);
        if (bucket !== minuteRef.current) {
          minuteRef.current = bucket;
          onMinuteRef.current?.(seconds / 60);
        }
      }
    };
    poll();
    const timer = window.setInterval(poll, 2500);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [enabled]);

  if (!enabled) return <section className="gpv2-live-gate gpv2-card"><div><span>LOCAL LIVE SYNC · OPTIONAL</span><strong>Use your own live clock, hero, K/D/A and inventory</strong></div><button onClick={() => { try { sessionStorage.setItem('dotasage:live-sync-enabled', '1'); } catch {} setEnabled(true); }}>CONNECT</button></section>;

  const bridge = Boolean(state.bridge || health.bridge || health.ok);
  const connected = Boolean(state.connected);
  const clock = Number(state?.map?.clock_time);
  const clockText = Number.isFinite(clock) ? `${Math.floor(Math.max(0, clock) / 60)}:${String(Math.max(0, clock) % 60).padStart(2, '0')}` : '—';
  const liveItems = (state.items || []).filter(row => !row.neutral).slice(0, 6).map(row => {
    const key = normalize(row.name);
    return itemConstants?.[key] || itemConstants?.[`item_${key}`] || itemConstants?.[row.name] || null;
  }).filter(Boolean);
  return <section className={`gpv2-livebar gpv2-card ${connected ? 'connected' : ''}`}>
    <div className="gpv2-live-state"><span>{connected ? 'DOTA CONNECTED' : bridge ? 'BRIDGE ONLINE' : 'BRIDGE OFFLINE'}</span><strong>{state?.hero?.name ? String(state.hero.name).replace(/^npc_dota_hero_/, '').replace(/_/g, ' ') : 'Live Sync'}</strong><small>{state?.hero?.level != null ? `LVL ${state.hero.level}` : 'level pending'}</small></div>
    <div><span>CLOCK</span><strong>{clockText}</strong><small>{state?.map?.game_state || 'state pending'}</small></div>
    <div><span>K / D / A</span><strong>{state?.player ? `${state.player.kills ?? '–'} / ${state.player.deaths ?? '–'} / ${state.player.assists ?? '–'}` : '—'}</strong><small>{state?.player?.gpm != null ? `${state.player.gpm} GPM · ${state.player.xpm ?? '–'} XPM` : 'stats pending'}</small></div>
    <div className="gpv2-live-items"><span>YOUR ITEMS</span><div>{liveItems.length ? liveItems.map(item => <img key={item.id} src={itemImageUrl(item)} title={item.dname} alt="" />) : <small>inventory pending</small>}</div></div>
    <button className="gpv2-disconnect" onClick={() => { try { sessionStorage.removeItem('dotasage:live-sync-enabled'); } catch {} setEnabled(false); }}>OFF</button>
  </section>;
}

function MatchContext({ minute, state, onMinute, onState }) {
  const [phase, window] = phaseForMinute(minute);
  return <section className="gpv2-match-context gpv2-card">
    <div><span>MATCH CONTEXT</span><strong>{phase}</strong><small>{window} min</small></div>
    <div className="gpv2-minute"><button onClick={() => onMinute(clamp(minute - 1, 0, 120))}>−</button><b>{Math.floor(minute)}:{String(Math.floor((minute % 1) * 60)).padStart(2, '0')}</b><button onClick={() => onMinute(clamp(minute + 1, 0, 120))}>+</button></div>
    <input type="range" min="0" max="120" value={Math.round(minute)} onChange={event => onMinute(Number(event.target.value))} />
    <div className="gpv2-state-buttons">{['ahead', 'even', 'behind'].map(value => <button key={value} className={state === value ? `active ${value}` : ''} onClick={() => onState(value)}>{value.toUpperCase()}</button>)}</div>
  </section>;
}

function ThreatList({ title, rows, loading, error, positive = false }) {
  return <section className={`gpv2-side-card ${positive ? 'positive' : 'negative'}`}>
    <div className="gpv2-side-title"><span>{positive ? 'OPPORTUNITIES' : 'MATCHUP RISK'}</span><strong>{title}</strong></div>
    {loading ? <p>Loading verified matchup samples…</p> : error ? <p>Matchup source unavailable.</p> : rows.length ? rows.map(row => <div className="gpv2-matchup-row" key={row.hero.id}><img src={row.hero.portrait} alt="" /><span><b>{row.hero.localized_name}</b><small>{Number(row.games || 0).toLocaleString()} samples</small></span><strong>{signed(row.score)}</strong></div>) : <p>No verified matchup samples yet.</p>}
  </section>;
}

function ObservedItems({ items, counts, onChange }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);
  const shortlist = useMemo(() => ['Butterfly', 'Black King Bar', "Linken's Sphere", 'Blade Mail', 'Ghost Scepter', 'Glimmer Cape', 'Manta Style', 'Satanic', 'Crimson Guard', 'Pipe of Insight'].map(name => findItem(items, [name])).filter(Boolean), [items]);
  const results = useMemo(() => {
    if (!query.trim()) return shortlist;
    return items.filter(item => !item.recipe && itemMatchesQuery(item, query)).sort((a, b) => String(a.dname).localeCompare(String(b.dname))).slice(0, 12);
  }, [items, query, shortlist]);
  const active = useMemo(() => Object.entries(counts).map(([id, count]) => ({ item: items.find(row => Number(row.id) === Number(id)), count })).filter(row => row.item && Number(row.count) > 0), [counts, items]);
  const add = item => { onChange(item.id, 1); setQuery(''); window.setTimeout(() => inputRef.current?.focus(), 0); };
  return <section className="gpv2-observed gpv2-card">
    <div className="gpv2-card-head"><div><span>ENEMY ITEMS OBSERVED</span><strong>Search names or aliases: bm, bkb, mkb, linken, euls…</strong></div><small>{active.reduce((sum, row) => sum + Number(row.count || 0), 0)} tracked</small></div>
    <input ref={inputRef} value={query} onChange={event => setQuery(event.target.value)} placeholder="Try bm for Blade Mail…" />
    <div className="gpv2-observed-options">{results.map(item => <button key={item.id} onClick={() => add(item)}><img src={itemImageUrl(item)} alt="" /><span>{item.dname}</span><b>+</b></button>)}</div>
    {active.length > 0 && <div className="gpv2-observed-active">{active.map(({ item, count }) => <div key={item.id}><img src={itemImageUrl(item)} alt="" /><span><b>{item.dname}</b><small>×{count}</small></span><button onClick={() => onChange(item.id, -1)}>−</button><button onClick={() => onChange(item.id, 1)}>+</button></div>)}</div>}
  </section>;
}

function ItemLab({ phases, targets, paths, conditionals, impacts, loading }) {
  if (loading) return <section className="gpv2-card gpv2-itemlab"><div className="gpv2-card-head"><div><span>ITEM LAB</span><strong>Loading OpenDota item evidence…</strong></div></div></section>;
  return <section className="gpv2-card gpv2-itemlab">
    <div className="gpv2-card-head"><div><span>ITEM LAB</span><strong>Popular purchases + recipe-safe targets + situational responses</strong></div><small>OpenDota popularity ≠ literal six-slot build</small></div>
    <div className="gpv2-item-main">
      <div className="gpv2-phase-stack">{phases.map(([phase, rows]) => <div className="gpv2-phase" key={phase}><span>{phase}</span><div>{rows.slice(0, 7).map(row => <div key={row.id}><img src={itemImageUrl(row.item)} alt="" /><small>{row.item.dname}</small></div>)}</div></div>)}</div>
      <aside className="gpv2-target-stack"><span>INVENTORY SHAPES</span>{targets.map(([phase, rows]) => <div key={phase}><b>{phase}</b><div>{rows.map(row => <img key={row.item.id} src={itemImageUrl(row.item)} title={row.item.dname} alt="" />)}</div></div>)}</aside>
    </div>
    {paths.length > 0 && <div className="gpv2-paths"><span>VERIFIED RECIPE PATHS</span><div>{paths.map(path => <div key={`${path.source.item.id}-${path.target.item.id}`}><img src={itemImageUrl(path.source.item)} alt="" /><b>{path.source.item.dname}</b><i>→</i><img src={itemImageUrl(path.target.item)} alt="" /><b>{path.target.item.dname}</b></div>)}</div></div>}
    {(conditionals.length > 0 || impacts.length > 0) && <div className="gpv2-item-responses">
      <div>{conditionals.map(row => <article className={row.priority ? 'priority' : ''} key={row.item.id}><img src={itemImageUrl(row.item)} alt="" /><span><b>{row.title}</b><strong>{row.item.dname}</strong><small>{row.reason}</small></span></article>)}</div>
      {impacts.length > 0 && <aside><span>WHAT CHANGED</span>{impacts.map((text, index) => <p key={index}>{text}</p>)}</aside>}
    </div>}
  </section>;
}

function CompactPostMatch({ hero }) {
  const [status, setStatus] = useState('idle');
  const [match, setMatch] = useState(null);
  const [detail, setDetail] = useState(null);
  async function load() {
    if (!DEFAULT_PROFILE.accountId) { setStatus('no-profile'); return; }
    setStatus('loading'); setMatch(null); setDetail(null);
    try {
      const rows = await fetchRecentMatches(DEFAULT_PROFILE.accountId);
      const latest = [...(rows || [])].sort((a, b) => Number(b.start_time || 0) - Number(a.start_time || 0)).find(row => Number(row.hero_id) === Number(hero.id));
      if (!latest) { setStatus('missing'); return; }
      setMatch(latest);
      try { setDetail(await fetchMatch(latest.match_id)); } catch {}
      setStatus('found');
    } catch { setStatus('error'); }
  }
  const player = detail?.players?.find(row => Number(row.account_id) === Number(DEFAULT_PROFILE.accountId));
  const review = [];
  if (player) {
    if (Number(player.deaths || 0) >= 7) review.push(`${player.deaths} deaths: review the first avoidable death before rewriting the build.`);
    if (Number(player.gold_per_min || 0)) review.push(`${player.gold_per_min} GPM · ${player.xp_per_min ?? '–'} XPM · ${player.last_hits ?? '–'} last hits.`);
    if (!review.length) review.push('No single box-score failure dominates. Review the first major momentum swing and the next two fights.');
  }
  return <details id="post-match-review" className="gpv2-post gpv2-card"><summary><span><b>POST-MATCH</b> Review the latest public {hero.localized_name} match</span><strong>⌄</strong></summary><div><button onClick={load} disabled={status === 'loading'}>{status === 'loading' ? 'CHECKING…' : 'FIND LATEST MATCH'}</button>{status === 'no-profile' && <p>Connect a Dota ID first.</p>}{status === 'missing' && <p>No recent public match for this hero was returned.</p>}{status === 'error' && <p>OpenDota could not be queried right now.</p>}{match && <p><b>Match {match.match_id}</b> · {match.kills}/{match.deaths}/{match.assists} · {Math.round(Number(match.duration || 0) / 60)} min</p>}{review.map((text, index) => <p key={index}>{text}</p>)}</div></details>;
}

export default function GamePlan({
  draft,
  playerSide = 'radiant',
  laneFilter = 'all',
  lineupRatings,
  selectedScore,
  pairBreakdown,
  pairLoading,
  pairError,
  onBack,
  positionLabel,
  itemPopularity,
  itemConstants,
  itemLoading,
}) {
  const hero = draft.self;
  const [laneOverrides, setLaneOverrides] = useState(() => { try { return JSON.parse(sessionStorage.getItem('dotasage:lane-overrides') || '{}'); } catch { return {}; } });
  const [observedCounts, setObservedCounts] = useState(() => { try { return JSON.parse(sessionStorage.getItem('dotasage:observed-enemy-items') || '{}'); } catch { return {}; } });
  const [minute, setMinuteState] = useState(() => { try { return Number(sessionStorage.getItem('dotasage:match-minute') || 0); } catch { return 0; } });
  const [matchState, setMatchStateState] = useState(() => { try { return sessionStorage.getItem('dotasage:match-state') || 'even'; } catch { return 'even'; } });

  const setMinute = value => {
    const next = clamp(Number(value || 0), 0, 120);
    setMinuteState(next);
    try { sessionStorage.setItem('dotasage:match-minute', String(next)); } catch {}
  };
  const setMatchState = value => {
    setMatchStateState(value);
    try { sessionStorage.setItem('dotasage:match-state', value); } catch {}
  };
  const moveLane = (id, lane, reset = false) => setLaneOverrides(current => {
    const next = reset ? {} : { ...current, [id]: lane };
    try { sessionStorage.setItem('dotasage:lane-overrides', JSON.stringify(next)); } catch {}
    return next;
  });
  const changeObserved = (id, delta) => setObservedCounts(current => {
    const next = { ...current };
    const count = Math.max(0, Number(next[id] || 0) + delta);
    if (count) next[id] = count; else delete next[id];
    try { sessionStorage.setItem('dotasage:observed-enemy-items', JSON.stringify(next)); } catch {}
    return next;
  });

  const allItems = useMemo(() => uniqueItems(itemConstants), [itemConstants]);
  const lookup = useMemo(() => itemLookup(allItems), [allItems]);
  const phases = useMemo(() => buildItemPhases(itemPopularity, itemConstants, 10), [itemPopularity, itemConstants]);
  const deepPhases = useMemo(() => buildItemPhases(itemPopularity, itemConstants, 36), [itemPopularity, itemConstants]);
  const paths = useMemo(() => buildUpgradePaths(deepPhases, lookup), [deepPhases, lookup]);
  const targets = useMemo(() => inventoryTargets(deepPhases, lookup), [deepPhases, lookup]);
  const conditionals = useMemo(() => hero ? conditionalItems(hero, draft.enemies || [], allItems, observedCounts) : [], [hero, draft.enemies, allItems, observedCounts]);
  const impacts = useMemo(() => observedImpact(observedCounts, allItems), [observedCounts, allItems]);

  if (!hero) return null;

  const baseMap = buildLaneMap({ allies: draft.allies, enemies: draft.enemies, playerSide, selfId: hero.id, selfFilter: laneFilter });
  const laneMap = applyLaneOverrides(baseMap, laneOverrides);
  const selfLane = heroLane(laneMap, hero.id);
  const roleLabel = effectivePosition(selfLane, playerSide, laneFilter, positionLabel);
  const enemySide = playerSide === 'radiant' ? 'dire' : 'radiant';
  const laneOpponents = laneMap.lanes.find(row => row.lane === selfLane)?.[enemySide]?.map(entry => entry.hero) || [];
  const knownPairs = (pairBreakdown || []).filter(row => Number(row.games || 0) > 0 && Number(row.confidence || 0) > 0);
  const threats = [...knownPairs].sort((a, b) => a.score - b.score).slice(0, 3);
  const opportunities = [...knownPairs].sort((a, b) => b.score - a.score).slice(0, 3);
  const threat = threats[0];
  const target = opportunities[0];
  const opener = draft.allies.find(ally => ally.id !== hero.id && hasRole(ally, 'Initiator')) || hero;
  const layer = draft.allies.find(ally => ally.id !== opener.id && hasRole(ally, 'Disabler')) || draft.allies.find(ally => hasRole(ally, 'Nuker')) || hero;
  const converter = draft.allies.find(ally => hasRole(ally, 'Pusher')) || draft.allies.find(ally => hasRole(ally, 'Carry')) || hero;
  const checkpoints = roleCheckpoints(roleLabel, hero);
  const laneTone = Number(selectedScore?.enemyScore || 0) >= 4 ? 'favorable' : Number(selectedScore?.enemyScore || 0) <= -4 ? 'pressured' : 'roughly neutral';
  const coach = [
    laneOpponents.length ? `Expected ${selfLane?.toUpperCase()} lane: ${laneOpponents.map(row => row.localized_name).join(' + ')}.` : 'Lane opponents are not confidently assigned yet.',
    threat ? `Respect ${threat.hero.localized_name}: hardest verified entered matchup (${signed(threat.score)}).` : 'No verified matchup threat has loaded yet.',
    target ? `${target.hero.localized_name} is your cleanest verified pressure matchup (${signed(target.score)}).` : 'Target priority will sharpen when matchup samples load.',
    objectiveCall(minute, matchState, converter),
  ];
  const winCondition = `${hasRole(hero, 'Carry') ? `Give ${hero.localized_name} a clean entry instead of showing first.` : `Use ${hero.localized_name}'s role to enable the first clean engagement.`} ${threat ? `Account for ${threat.hero.localized_name} before committing.` : ''} Convert the won fight with ${converter.localized_name} into a tower, Roshan or map control instead of extending the chase.`;

  const radiant = playerSide === 'radiant' ? draft.allies : draft.enemies;
  const dire = playerSide === 'dire' ? draft.allies : draft.enemies;
  const ratingMap = side => side === playerSide ? lineupRatings?.allies : lineupRatings?.enemies;

  return <main className="gpv2 game-plan">
    <div className="gpv2-toolbar"><button onClick={onBack}>← BACK TO DRAFT</button><span>GAME PLAN · PATCH {CURRENT_PATCH.id}</span><button onClick={() => document.getElementById('post-match-review')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>POST-MATCH ↓</button></div>

    <section className="gpv2-hero-brief">
      <img src={hero.portrait} alt="" />
      <div className="gpv2-hero-copy"><span>YOUR HERO · {playerSide.toUpperCase()}</span><h1>{hero.localized_name}</h1><p>{roleLabel} · {laneTone} into the entered enemy draft</p></div>
      <div className="gpv2-scores"><ScorePill label="VS ENEMY" value={selectedScore?.enemyScore} signed /><ScorePill label="TEAM FIT" value={selectedScore?.teamFit} /><ScorePill label="PERSONAL" value={selectedScore?.personalFit != null ? selectedScore.personalFit / 10 : null} /><ScorePill label="RECOMMEND" value={selectedScore?.overall} /></div>
    </section>

    <section className="gpv2-lineups">
      {[['RADIANT', radiant, ratingMap('radiant')], ['DIRE', dire, ratingMap('dire')]].map(([label, heroes, ratings]) => <div key={label}><span>{label} · {label.toLowerCase() === playerSide ? 'YOUR TEAM' : 'ENEMY'}</span><div>{heroes.map(row => <article className={row.id === hero.id ? 'self' : ''} key={row.id}><img src={row.portrait} alt="" /><small>{row.localized_name}</small><b>{signed(ratings?.get(row.id) ?? 0)}</b></article>)}</div></div>)}
    </section>

    <MatchContext minute={minute} state={matchState} onMinute={setMinute} onState={setMatchState} />
    <LiveBar itemConstants={itemConstants} onMinute={setMinute} />

    <div className="gpv2-command">
      <div className="gpv2-command-main">
        <section className="gpv2-card gpv2-briefing">
          <div className="gpv2-card-head"><div><span>THIS GAME IN 30 SECONDS</span><strong>The high-signal version of the old wall of cards</strong></div></div>
          <div className="gpv2-brief-grid">
            <div><span>LANE / EARLY</span><strong>{laneOpponents.length ? `${selfLane?.toUpperCase()} vs ${laneOpponents.map(row => row.localized_name).join(' + ')}` : roleLabel}</strong><p>{hero.localized_name} is {laneTone} by the loaded direct-matchup evidence. Protect the next wave before forcing a rotation.</p></div>
            <div className="win"><span>WIN CONDITION</span><strong>Fight clean, then convert</strong><p>{winCondition}</p></div>
          </div>
          <div className="gpv2-coach-list">{coach.map((text, index) => <div key={index}><b>{String(index + 1).padStart(2, '0')}</b><p>{text}</p></div>)}</div>
        </section>
        <LaneBoard map={laneMap} selfId={hero.id} overrides={laneOverrides} onMove={moveLane} />
      </div>

      <aside className="gpv2-intel-rail">
        <ThreatList title="Biggest threats" rows={threats} loading={pairLoading} error={pairError && !knownPairs.length} />
        <ThreatList title="Best matchups" rows={opportunities} loading={pairLoading} error={false} positive />
        <section className="gpv2-side-card gpv2-checkpoints"><div className="gpv2-side-title"><span>ROLE TIMELINE</span><strong>Checkpoints</strong></div>{checkpoints.map(([time, text]) => <div key={time}><b>{time}</b><p>{text}</p></div>)}</section>
        <section className="gpv2-side-card gpv2-fight"><div className="gpv2-side-title"><span>FIGHT SEQUENCE</span><strong>How your five wants to enter</strong></div>{[['OPEN', opener], ['LAYER', layer], ['YOUR ENTRY', hero], ['CONVERT', converter]].map(([label, row], index) => <div key={`${label}-${index}`}><b>{index + 1}</b><span><small>{label}</small><strong>{row?.localized_name || 'Team'}</strong></span></div>)}</section>
      </aside>
    </div>

    <div className="gpv2-map-info">
      <section className="gpv2-card"><span>VISION</span><strong>Where the next information should come from</strong><p>{visionCall(minute, matchState)}</p></section>
      <section className="gpv2-card"><span>NEXT CONVERSION</span><strong>Turn the next win into something permanent</strong><p>{objectiveCall(minute, matchState, converter)}</p></section>
    </div>

    <MatchupAtlas hero={hero} enemies={draft.enemies || []} />
    <ObservedItems items={allItems} counts={observedCounts} onChange={changeObserved} />
    <ItemLab phases={phases} targets={targets} paths={paths} conditionals={conditionals} impacts={impacts} loading={itemLoading} />
    <CompactPostMatch hero={hero} />
  </main>;
}
