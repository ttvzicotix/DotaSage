import { useEffect, useRef, useState } from 'react';
import ScorePill from './ScorePill';
import { CURRENT_PATCH } from '../data/currentPatch';
import { fetchRecentMatches, fetchMatch, itemImageUrl } from '../services/openDota';
import { DEFAULT_PROFILE } from '../data/defaultProfile';
import { buildLaneMap, positionName } from '../engine/lanePrediction';
import { fetchLocalGameState, fetchLocalGsiHealth } from '../services/localGsi';

function signed(value) { const n = Number(value || 0); return `${n > 0 ? '+' : ''}${n.toFixed(1)}`; }

function HeroStrip({ label, heroes, type, ratings = new Map(), selfId }) {
  return <div className="plan-strip v06-plan-strip"><span>{label}<small>{type === 'ally' ? 'vs their five' : 'vs your five'}</small></span><div className="lineup-score-grid">{heroes.map(h => {
    const score = ratings.get(h.id) ?? 0;
    return <div className={`lineup-score-hero ${h.id === selfId ? 'self' : ''}`} key={h.id} title={`${h.localized_name}: ${signed(score)} against the opposing lineup`}>
      <img className={type} src={h.portrait} alt={h.localized_name} />
      <strong>{h.localized_name}</strong><b className={score >= 0 ? 'positive' : 'negative'}>{signed(score)}</b>
    </div>;
  })}</div></div>;
}

function LaneHero({ entry, selfId, lane }) {
  if (!entry?.hero) return null;
  return <div draggable className={`lane-map-hero ${entry.hero.id === selfId ? 'self' : ''}`} title={`${entry.hero.localized_name} · ${positionName(entry.position)} · drag to correct lane`} onDragStart={event => { event.dataTransfer.setData('text/dotasage-hero', String(entry.hero.id)); event.dataTransfer.effectAllowed = 'move'; }}>
    <img src={entry.hero.portrait} alt="" /><span><b>{entry.hero.localized_name}</b><small>{positionName(entry.position)} · {lane.toUpperCase()}</small></span><i>↕</i>
  </div>;
}

function applyLaneOverrides(map, overrides = {}) {
  const laneRows = ['top','mid','bottom'].map(lane => ({ lane, radiant: [], dire: [] }));
  for (const row of map.lanes) for (const side of ['radiant','dire']) for (const entry of row[side]) {
    const lane = overrides[entry.hero.id] || row.lane;
    const target = laneRows.find(x => x.lane === lane);
    if (target) target[side].push(entry);
  }
  return { ...map, lanes: laneRows };
}

function heroLane(map, heroId) {
  for (const row of map.lanes) for (const side of ['radiant','dire']) if (row[side].some(entry => Number(entry.hero.id) === Number(heroId))) return row.lane;
  return null;
}

function LanePredictionMap({ draft, playerSide, laneFilter, selfId, overrides, onMove }) {
  const base = buildLaneMap({ allies: draft.allies, enemies: draft.enemies, playerSide, selfId, selfFilter: laneFilter });
  const map = applyLaneOverrides(base, overrides);
  const ourLabel = map.ourSide.toUpperCase();
  const enemyLabel = map.enemySide.toUpperCase();
  const drop = (event, lane) => { event.preventDefault(); const id = Number(event.dataTransfer.getData('text/dotasage-hero')); if (id) onMove(id, lane); };
  const sideDrop = (row, side) => <div className={`lane-map-side ${side} lane-drop-zone`} onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect='move'; }} onDrop={event => drop(event, row.lane)}>{row[side].map(entry => <LaneHero key={`${row.lane}-${side}-${entry.hero.id}`} entry={entry} selfId={selfId} lane={row.lane} />)}</div>;
  return <section className="lane-map-card panel-card">
    <div className="lane-map-head"><div><div className="eyebrow">SIDE + LANE ASSIGNMENTS</div><h2>{ourLabel} vs {enemyLabel}</h2></div><div className="lane-map-actions"><div className={`side-chip ${map.ourSide}`}>YOU · {ourLabel}</div>{Object.keys(overrides || {}).length > 0 && <button className="ghost-button" onClick={() => onMove(null, null, true)}>RESET LANES</button>}</div></div>
    <div className="lane-map-board">
      <div className="lane-map-side-label radiant">RADIANT</div><div className="lane-map-center-label">DRAG TO CORRECT</div><div className="lane-map-side-label dire">DIRE</div>
      {map.lanes.map(row => <div className="lane-map-row" key={row.lane}>
        {sideDrop(row,'radiant')}
        <div className="lane-name"><b>{row.lane.toUpperCase()}</b><small>{row.lane === 'mid' ? 'MID' : row.lane === (playerSide === 'radiant' ? 'bottom' : 'top') ? 'YOUR SAFE LANE' : 'YOUR OFF LANE'}</small></div>
        {sideDrop(row,'dire')}
      </div>)}
    </div>
    <small className="lane-map-note">DotaSage predicts lanes first. If the guess is wrong, drag any hero into Top / Mid / Bottom. Lane coaching below updates from your corrected placement. This changes the Game Plan only, not the original draft.</small>
  </section>;
}

function hasRole(hero, role) { return (hero?.roles || []).some(r => String(r).toLowerCase() === role.toLowerCase()); }
function firstRole(heroes, role, fallback) { return heroes.find(h => hasRole(h, role)) || fallback || heroes[0]; }

function topItems(group = {}, itemConstants = {}, count = 8) {
  return Object.entries(group || {}).map(([id, uses]) => {
    const item = itemConstants?.[id] || itemConstants?.[Number(id)] || null;
    return { id, uses: Number(uses || 0), item };
  }).filter(x => x.item?.dname).sort((a,b)=>b.uses-a.uses).slice(0,count);
}

const normalize = value => String(value ?? '').replace(/^item_/, '').toLowerCase();

function enrichBuildTransitions(itemPhases = []) {
  const result = itemPhases.map(([name, entries]) => [name, entries.map(entry => ({ ...entry }))]);
  for (let i = 0; i < result.length; i += 1) {
    for (const source of result[i][1]) {
      const sourceKeys = new Set([normalize(source.id), normalize(source.item?.name), normalize(source.item?.dname)]);
      const sourceCost = Number(source.item?.cost || 0);
      if (sourceCost < 900) continue; // skip obvious small components such as Circlet/branches
      outer: for (let j = i + 1; j < result.length; j += 1) {
        for (const target of result[j][1]) {
          const components = Array.isArray(target.item?.components) ? target.item.components.map(normalize) : [];
          if (components.some(component => sourceKeys.has(component))) {
            source.buildsInto = target.item?.dname;
            break outer;
          }
        }
      }
    }
  }
  return result;
}

function inventoryActionNotes(itemPhases = []) {
  const notes = [];
  const seen = new Set();
  for (const [, entries] of itemPhases) for (const entry of entries) {
    if (seen.has(entry.id)) continue; seen.add(entry.id);
    if (entry.item?.disassemble === true || entry.item?.dismantle === true) notes.push({ key: `dis-${entry.id}`, text: `${entry.item.dname} is marked as disassemblable in the loaded item data. Consider the component split only when it advances the actual game build.` });
  }
  return notes.slice(0, 5);
}

function ItemRow({ title, entries }) {
  if (!entries.length) return null;
  return <div className="item-phase"><span>{title}</span><div>{entries.map(({id,item,uses,buildsInto}) => <div className="item-chip" key={id} title={`${item.dname} · popularity count ${uses.toLocaleString()}`}><img src={itemImageUrl(item)} alt="" /><b>{item.dname}</b>{buildsInto && <small className="build-arrow">→ {buildsInto}</small>}</div>)}</div></div>;
}

function uniqueItems(itemConstants = {}) {
  const seen = new Set(); const rows = [];
  Object.values(itemConstants || {}).forEach(item => {
    if (!item?.id || !item?.dname || seen.has(Number(item.id))) return;
    seen.add(Number(item.id)); rows.push(item);
  });
  return rows;
}

function findItem(itemConstants, names = []) {
  const wanted = names.map(name => String(name).toLowerCase());
  return uniqueItems(itemConstants).find(item => wanted.includes(String(item.dname || '').toLowerCase()) || wanted.includes(String(item.name || '').replace(/^item_/, '').toLowerCase()));
}

function itemLookup(itemConstants = {}) {
  const map = new Map();
  for (const item of uniqueItems(itemConstants)) {
    [item.id, item.name, item.dname].filter(Boolean).forEach(key => map.set(normalize(key), item));
  }
  return map;
}

function itemBuildsFrom(target, component, itemConstants, depth = 0, visited = new Set()) {
  if (!target || !component || depth > 5) return false;
  const componentKeys = new Set([component.id, component.name, component.dname].filter(Boolean).map(normalize));
  const components = Array.isArray(target.components) ? target.components.map(normalize) : [];
  if (components.some(key => componentKeys.has(key))) return true;
  const lookup = itemLookup(itemConstants);
  for (const key of components) {
    if (visited.has(key)) continue; visited.add(key);
    const child = lookup.get(key);
    if (child && itemBuildsFrom(child, component, itemConstants, depth + 1, visited)) return true;
  }
  return false;
}

const INTERMEDIATE_INVENTORY_NAMES = new Set([
  'Sacred Relic','Blade of Alacrity','Ogre Axe','Staff of Wizardry','Mithril Hammer','Demon Edge','Eaglesong','Reaver',
  'Mystic Staff','Ultimate Orb','Point Booster','Claymore','Broadsword','Quarterstaff','Javelin','Morbid Mask','Ring of Health',
  'Void Stone','Energy Booster','Vitality Booster','Platemail','Talisman of Evasion','Hyperstone'
]);

function inventorySnapshots(itemPhases = [], itemConstants = {}) {
  const clean = entries => entries.filter(entry => !entry.item?.recipe && Number(entry.item?.cost || 0) >= 250 && !/tango|clarity|faerie|branch|ward|smoke|dust|teleport/i.test(entry.item?.dname || ''));
  const build = indexes => {
    // Prefer the newest phase first, but keep popularity ordering INSIDE each phase.
    // v0.13 reversed the entire array, which could accidentally promote low-frequency components.
    const ordered = indexes.slice().reverse().flatMap(index => clean(itemPhases[index]?.[1] || []));
    const seen = new Set(); const candidates = [];
    for (const entry of ordered) {
      const key = Number(entry.item?.id || entry.id); if (!key || seen.has(key)) continue;
      seen.add(key); candidates.push(entry);
    }
    const finalItems = candidates.filter(entry => {
      if (INTERMEDIATE_INVENTORY_NAMES.has(entry.item?.dname)) return false;
      return !candidates.some(other => other !== entry && itemBuildsFrom(other.item, entry.item, itemConstants));
    });
    return finalItems.slice(0, 6);
  };
  return [['EARLY INVENTORY', build([0,1])], ['CORE INVENTORY', build([1,2])], ['LATE INVENTORY', build([2,3])]];
}

function adaptiveInventory(baseEntries = [], conditionals = [], itemConstants = {}) {
  const priority = conditionals.filter(row => row.priority || /PHYSICAL DAMAGE|CONTROL STOPS|SUSTAIN IS WINNING|ILLUSIONS \/ SUMMONS/.test(row.title || '')).slice(0,2).map(row => ({ id: String(row.item.id), item: row.item, uses: Number.MAX_SAFE_INTEGER, reactive: true }));
  const candidates = [...priority, ...baseEntries];
  const seen = new Set(); const unique = [];
  for (const entry of candidates) {
    const id = Number(entry.item?.id || entry.id); if (!id || seen.has(id)) continue;
    seen.add(id); unique.push(entry);
  }
  return unique.filter(entry => !unique.some(other => other !== entry && itemBuildsFrom(other.item, entry.item, itemConstants))).slice(0, 6);
}

function resolveLiveOwnedItems(names = [], itemConstants = {}) {
  const lookup = itemLookup(itemConstants);
  const seen = new Set();
  return names.map(name => lookup.get(normalize(name))).filter(item => {
    const id = Number(item?.id || 0);
    if (!id || seen.has(id)) return false;
    seen.add(id); return true;
  });
}

function liveNextTargets(ownedItems = [], deepItemPhases = [], conditionals = [], itemConstants = {}) {
  if (!ownedItems.length) return [];
  const ownedIds = new Set(ownedItems.map(item => Number(item.id)));
  const reactive = conditionals.map(row => ({ id:String(row.item.id), item:row.item, uses:row.priority ? 1e15 : 1e14, reactive:true, reason:row.title }));
  const baseline = [...deepItemPhases.slice(2)].flatMap(([, entries]) => entries || []);
  const candidates = [...reactive, ...baseline].filter(entry => {
    const item = entry.item;
    if (!item?.id || item.recipe || ownedIds.has(Number(item.id))) return false;
    if (INTERMEDIATE_INVENTORY_NAMES.has(item.dname)) return false;
    // Do not recommend a component that is already contained in something you own.
    if (ownedItems.some(owned => itemBuildsFrom(owned, item, itemConstants))) return false;
    return true;
  });
  const scored = candidates.map(entry => ({
    ...entry,
    liveScore: (entry.reactive ? 1000 : 0) + (ownedItems.some(owned => itemBuildsFrom(entry.item, owned, itemConstants)) ? 250 : 0) + Math.log10(Math.max(1, Number(entry.uses || 1)))
  })).sort((a,b)=>b.liveScore-a.liveScore);
  const unique = []; const seen = new Set();
  for (const entry of scored) {
    const id = Number(entry.item?.id || 0); if (!id || seen.has(id)) continue;
    seen.add(id); unique.push(entry);
  }
  return unique.filter(entry => !unique.some(other => other !== entry && itemBuildsFrom(other.item, entry.item, itemConstants))).slice(0,6);
}

function buildPathRows(itemPhases = []) {
  const byName = new Map();
  itemPhases.forEach(([phase, entries]) => entries.forEach(entry => byName.set(String(entry.item?.dname || ''), { ...entry, phase })));
  const rows = []; const seen = new Set();
  itemPhases.forEach(([phase, entries]) => entries.forEach(entry => {
    if (!entry.buildsInto) return;
    const target = byName.get(entry.buildsInto);
    if (!target) return;
    const key = `${entry.id}->${target.id}`; if (seen.has(key)) return; seen.add(key);
    rows.push({ source: entry, target, fromPhase: phase, toPhase: target.phase });
  }));
  return rows.slice(0, 6);
}

function BuildPathBoard({ rows }) {
  if (!rows.length) return null;
  return <div className="build-path-board"><div className="eyebrow">UPGRADE PATHS</div><div>{rows.map(row => <div className="build-path-row" key={`${row.source.id}-${row.target.id}`}><img src={itemImageUrl(row.source.item)} alt=""/><span><b>{row.source.item.dname}</b><small>{row.fromPhase}</small></span><i>→</i><img src={itemImageUrl(row.target.item)} alt=""/><span><b>{row.target.item.dname}</b><small>{row.toPhase}</small></span></div>)}</div></div>;
}

const illusionNames = new Set(['Phantom Lancer','Naga Siren','Terrorblade','Chaos Knight','Meepo']);
const regenNames = new Set(['Huskar','Alchemist','Necrophos','Timbersaw','Bristleback','Morphling','Lifestealer']);
const evasionNames = new Set(['Phantom Assassin','Windranger']);

function conditionalItemAdvice(hero, draft, itemConstants, observedItems = []) {
  const enemies = draft.enemies || [];
  const countRole = role => enemies.filter(enemy => hasRole(enemy, role)).length;
  const core = hasRole(hero,'Carry') || hasRole(hero,'Nuker');
  const support = hasRole(hero,'Support');
  const observed = new Map(observedItems.map(row => [String(row.item?.dname || '').toLowerCase(), Number(row.count || 0)]));
  const observedCount = name => observed.get(String(name).toLowerCase()) || 0;
  const rules = [];
  const add = (condition, names, title, reason, priority = false) => {
    if (!condition) return;
    const item = findItem(itemConstants, names);
    if (!item || rules.some(row => row.item.id === item.id)) return;
    const row = { item, title, reason, priority };
    priority ? rules.unshift(row) : rules.push(row);
  };
  const butterflies = observedCount('Butterfly');
  add(butterflies > 0 && core, ['Monkey King Bar'], butterflies >= 2 ? `CRITICAL · ${butterflies} BUTTERFLIES OBSERVED` : 'BUTTERFLY OBSERVED', `Accuracy is now an observed problem, not a theoretical one. ${butterflies >= 2 ? 'Multiple enemy Butterflies make missed attacks a major damage loss. ' : ''}Move Monkey King Bar sharply up the damage-item queue if your job is to right-click these targets.`, true);
  const defensiveDispels = observedCount('Ghost Scepter') + observedCount("Eul's Scepter of Divinity") + observedCount("Eul's Scepter") + observedCount('Glimmer Cape');
  add(defensiveDispels > 0 && core, ['Nullifier'], 'DEFENSIVE ITEMS OBSERVED', 'Enemy saves/dispel-able defensive items are already denying physical kills. Nullifier becomes a concrete response rather than a generic luxury option.', true);
  const observedSustain = observedCount('Satanic') + observedCount('Heart of Tarrasque');
  add(observedSustain > 0, support ? ['Spirit Vessel'] : ['Eye of Skadi','Spirit Vessel'], 'HEAVY SUSTAIN OBSERVED', 'The enemy has committed real inventory slots to sustain. Move anti-heal higher if those resets are deciding fights.', true);
  add(countRole('Disabler') >= 2 || countRole('Nuker') >= 3, core ? ['Black King Bar'] : ['Force Staff','Glimmer Cape'], 'IF CONTROL STOPS YOUR ENTRY', core ? 'Prioritize a protected damage window when layered disables or magic burst are deciding fights.' : 'Buy space for yourself or a core instead of trying to tank the enemy control chain.');
  add(enemies.some(e => evasionNames.has(e.localized_name)), ['Monkey King Bar','Bloodthorn'], 'IF EVASION IS THE PROBLEM', 'Use a reliable accuracy answer when misses are materially preventing you from killing the target that matters.');
  add(enemies.some(e => illusionNames.has(e.localized_name)), core ? ['Mjollnir','Maelstrom','Battle Fury'] : ['Shiva’s Guard',"Shiva's Guard"], 'IF ILLUSIONS / SUMMONS TAKE OVER', 'Add repeatable area damage or control when clearing units is consuming the entire fight.');
  add(enemies.some(e => regenNames.has(e.localized_name)) || countRole('Durable') >= 3, support ? ['Spirit Vessel'] : ['Eye of Skadi',"Shiva's Guard",'Spirit Vessel'], 'IF SUSTAIN IS WINNING FIGHTS', 'Anti-heal and sustained pressure become higher value when targets repeatedly reset through your damage.');
  add(countRole('Initiator') >= 2, support ? ['Force Staff'] : ["Linken's Sphere",'Black King Bar'], 'IF YOU KEEP GETTING JUMPED', 'Itemize for the first enemy commitment so you can survive or reposition before your own timing disappears.');
  add(countRole('Carry') >= 2, support ? ['Ghost Scepter',"Heaven's Halberd"] : ['Butterfly',"Shiva's Guard"], 'IF PHYSICAL DAMAGE IS THE ISSUE', 'Shift a slot toward surviving right-click commitment if physical cores are the reason you cannot stay in the fight.');
  add(core, ['Nullifier'], 'IF DEFENSIVE ITEMS BLOCK KILLS', 'Consider a dispel answer when Ghost Scepter, Eul’s-type saves or similar defensive effects are repeatedly denying your target.');
  return rules.slice(0, 8);
}

const OBSERVED_ITEM_SHORTLIST = ['Butterfly','Black King Bar',"Linken's Sphere",'Ghost Scepter',"Eul's Scepter of Divinity",'Glimmer Cape','Force Staff','Manta Style','Satanic','Heart of Tarrasque','Radiance','Crimson Guard','Pipe of Insight','Lotus Orb'];

function LiveEnemyItems({ itemConstants, counts, onChange }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);
  const items = uniqueItems(itemConstants).filter(item => !item.recipe && item.dname);
  const shortlist = OBSERVED_ITEM_SHORTLIST.map(name => findItem(itemConstants,[name])).filter(Boolean);
  const normalizedQuery = query.trim().toLowerCase();
  const results = normalizedQuery ? items.filter(item => String(item.dname).toLowerCase().includes(normalizedQuery)).sort((a,b)=>String(a.dname).localeCompare(String(b.dname))).slice(0,10) : shortlist;
  const add = item => {
    onChange(item.id, 1);
    setQuery('');
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };
  const remove = item => onChange(item.id, -1);
  const observedRows = Object.entries(counts).map(([id,count]) => ({ item: itemConstants?.[id] || itemConstants?.[Number(id)], count })).filter(row => row.item?.dname && row.count > 0);
  return <section className="plan-card wide observed-items-card">
    <div className="observed-items-head"><div><div className="eyebrow">LIVE MATCH ADJUSTMENT</div><h2>Enemy Items Observed</h2><p>Optional. Add only an item that materially changes your build; the adaptive inventory below updates immediately.</p></div><span>{observedRows.reduce((sum,row)=>sum+Number(row.count||0),0)} tracked</span></div>
    <div className="observed-item-search"><input ref={inputRef} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search enemy item… Butterfly, Satanic, Ghost…" /></div>
    <div className="observed-item-options">{results.map(item => <button key={item.id} onClick={()=>add(item)} title={`Add observed ${item.dname}`}><img src={itemImageUrl(item)} alt=""/><span>{item.dname}</span><b>+</b></button>)}</div>
    {observedRows.length > 0 && <div className="observed-item-active">{observedRows.map(({item,count}) => <div key={item.id}><img src={itemImageUrl(item)} alt=""/><span><b>{item.dname}</b><small>observed ×{count}</small></span><button onClick={()=>remove(item)} aria-label={`Remove one ${item.dname}`}>−</button><button onClick={()=>add(item)} aria-label={`Add another ${item.dname}`}>+</button></div>)}</div>}
    <small className="observed-item-note">Search clears and stays focused after every add. Ignore this entire box if the game is too busy; it is a reaction tool, not homework.</small>
  </section>;
}

function observedItemAdjustments(observedItems = []) {
  const counts = new Map(observedItems.map(row => [String(row.item?.dname || '').toLowerCase(), Number(row.count || 0)]));
  const count = name => counts.get(String(name).toLowerCase()) || 0;
  const notes = [];
  const add = (condition, title, text) => { if (condition) notes.push({ title, text }); };
  const butterflies = count('Butterfly');
  add(butterflies > 0, 'ACCURACY CHECK', `${butterflies} Butterfly${butterflies === 1 ? '' : 's'} observed. Right-click damage into those targets is less reliable until you answer evasion.`);
  const bkbs = count('Black King Bar');
  add(bkbs > 0, 'BKB WINDOWS', `${bkbs} enemy BKB${bkbs === 1 ? '' : 's'} observed. Do not spend the entire control/burst layer into active debuff immunity; track the duration and re-enter.`);
  const linkens = count("Linken's Sphere");
  add(linkens > 0, 'LINKEN BREAK', `${linkens} Linken's Sphere observed. Single-target initiation needs a deliberate pop spell/item before the disable that matters.`);
  const saves = count('Ghost Scepter') + count("Eul's Scepter of Divinity") + count('Glimmer Cape') + count('Force Staff');
  add(saves > 0, 'SAVE LAYER', `${saves} defensive save item${saves === 1 ? '' : 's'} observed. Target selection and Nullifier/dispels matter more than raw damage if kills keep getting reset.`);
  const sustain = count('Satanic') + count('Heart of Tarrasque');
  add(sustain > 0, 'SUSTAIN CHECK', `${sustain} major sustain item${sustain === 1 ? '' : 's'} observed. Coordinate burst/anti-heal instead of assuming the first health bar is the kill.`);
  const lotus = count('Lotus Orb');
  add(lotus > 0, 'LOTUS REFLECT', `${lotus} Lotus Orb observed. Check the buff before committing important targeted spells into a reflection.`);
  const crimson = count('Crimson Guard');
  const pipe = count('Pipe of Insight');
  add(crimson + pipe > 0, 'TEAM MITIGATION', `${crimson ? `${crimson} Crimson` : ''}${crimson && pipe ? ' · ' : ''}${pipe ? `${pipe} Pipe` : ''} observed. Their team has invested in damage mitigation, so fight length and target isolation matter more.`);
  return notes.slice(0, 5);
}

function LiveTacticalAdjustments({ rows }) {
  if (!rows.length) return null;
  return <section className="plan-card wide live-tactical-adjustments"><div className="eyebrow">OBSERVED ITEM IMPACT</div><h2>What changed in the fight</h2><div>{rows.map((row,i)=><article key={`${row.title}-${i}`}><b>{row.title}</b><p>{row.text}</p></article>)}</div><small>These adjustments use only enemy items you manually marked as observed.</small></section>;
}

function TimelineSnapshot({ title, entries }) {
  if (!entries.length) return null;
  return <div className="inventory-snapshot"><span>{title}</span><div>{entries.map(({id,item,reactive}) => <div className={reactive ? 'reactive-slot' : ''} key={id} title={`${item.dname}${reactive ? ' · reactive counter item' : ''}`}><img src={itemImageUrl(item)} alt="" /><small>{item.dname}{reactive ? ' · REACT' : ''}</small></div>)}</div></div>;
}

function roleTimeline(positionLabel, hero) {
  const label = String(positionLabel || '').toLowerCase();
  if (label.includes('support')) return [
    ['0–5', 'Protect lane equilibrium, contest pulls and identify whether your first resources belong in lane or on vision.'],
    ['5–10', 'Use catapult / rune / rotation windows to move with purpose; stack when the route makes it free.'],
    ['10–20', 'Play around the core that can actually take space. Vision should move with the next objective, not remain where the last fight happened.'],
    ['20+', 'Stay alive long enough to cast the spell or item the enemy lineup must respect. Position for the second wave of the fight.'],
  ];
  if (label.includes('safe')) return [
    ['0–7', 'Protect last hits and lane position first. Trade only when it improves access to the next wave.'],
    ['7–15', 'Choose the safest high-value farm triangle of lane + nearby camps; join only fights that protect territory or create an objective.'],
    ['15–30', 'Hit your first real item timing, then decide whether you are the fight starter, follow-up or split-pressure threat.'],
    ['30+', `Preserve ${hero.localized_name}'s buyback / objective windows and avoid being the first hero revealed without a reason.`],
  ];
  if (label.includes('mid')) return [
    ['0–6', 'Win the wave before trying to win the map. Preserve resources around rune and level timings.'],
    ['6–12', 'Push before rotating; if side lanes are not killable, convert control into farm, rune denial or vision instead.'],
    ['12–25', 'Play around the item / level that changes your kill pattern and pressure the side of the map containing the next objective.'],
    ['25+', 'Your job may shift from tempo to catch or damage. Re-evaluate who must show first each fight.'],
  ];
  if (label.includes('off')) return [
    ['0–7', 'Pressure the carry’s wave access while keeping enough HP to contest pulls, lotuses and the next wave.'],
    ['7–15', 'Turn your first durable / initiation timing into tower pressure or control of their farming area.'],
    ['15–30', 'Force fights where your initiation is easy to follow. Avoid showing the initiation tool on the wrong side of the map.'],
    ['30+', 'Your value may become vision, aura, counter-initiation or one key disable. Itemize for that job rather than generic tankiness.'],
  ];
  return [['EARLY','Protect the next wave and your next timing.'],['MID','Play around the strongest objective-producing hero on your team.'],['LATE','Track buyback, vision and who is allowed to show first.']];
}

function roleCoachTips(positionLabel, hero, threat, target) {
  const label = String(positionLabel || '').toLowerCase();
  const common = [
    threat ? `Before committing, account for ${threat.hero.localized_name}; it is your hardest verified matchup in this draft.` : 'Re-check enemy kill threat before showing on a dangerous wave.',
    target ? `When fights split, ${target.hero.localized_name} is your cleanest statistical matchup among the entered enemies.` : 'Prioritize targets you can actually reach without crossing the enemy control layer.',
  ];
  if (label.includes('hard support') || label.includes('support')) return [
    `If the lane is pushing and your core can safely hold, prepare a small-camp pull around :15 or :45. Skip the pull if leaving lane creates a kill window on your core.`,
    `When rotating past a neutral camp, look for a stack around :53–:55; exact aggro timing varies by camp and path.`,
    `If equilibrium is already good, protect or deward the pull area instead of pulling automatically. A pull is a tool, not a ritual.`,
    `Ward for the next threat: defensive vision when an initiator is missing; deeper vision when your lane is winning and your team can occupy that ground.`,
    ...common,
  ];
  if (label.includes('safe')) return [
    `Keep the lane meeting just outside your tower when possible. If your support pulls, manage the remaining enemy creeps rather than mindlessly shoving the next wave.`,
    `Move into nearby camps when you can clear them efficiently without surrendering a safe lane wave; do not jungle just because the clock reached a preset minute.`,
    `Before joining an early fight, ask whether the fight protects an objective or your farming area. Bad rotations cost two things: the fight and your acceleration.`,
    ...common,
  ];
  if (label.includes('mid')) return [
    `Use wave clear before important rune/rotation windows so leaving lane costs fewer creeps and forces the enemy mid to choose between following and farming.`,
    `If the side lanes are not killable, convert lane control into a nearby camp or vision move instead of forcing a low-percentage rotation.`,
    `Track which enemy support can reach mid first. Your matchup is not only 1v1 once supports disappear from lanes.`,
    ...common,
  ];
  if (label.includes('off')) return [
    `Pressure the carry's access to the wave, but do not trade your life merely to stand between them and creeps. Your HP is part of your lane control.`,
    `Contest or block the enemy small-camp pull when it would reset a lane you are winning.`,
    `A wave drag/cut is strongest when it forces the carry under tower or frees your support to move; avoid it when the enemy duo can collapse on you for free.`,
    ...common,
  ];
  if (label.includes('jungle')) return [
    `Plan camp movement so you arrive near a stack window around :53–:55 rather than walking past free efficiency.`,
    `Show in lane when your presence converts into a kill, tower or protected wave; otherwise preserve your acceleration and information advantage.`,
    ...common,
  ];
  if (label.includes('roam')) return [
    `Leave a lane because another play is higher value, not because roaming feels active. Stabilize the wave or communicate before disappearing.`,
    `Stack a camp around :53–:55 when the route naturally passes it; free economy is part of a good rotation.`,
    `Approach ganks through vision gaps and ask which spell must land first. A rotation that reveals early often only relieves pressure for the enemy.`,
    ...common,
  ];
  return [`Use the draft-relative matchup numbers above to decide who you can show against and who must be accounted for first.`, ...common];
}


function phaseForMinute(minute) {
  const m = Number(minute || 0);
  if (m < 10) return { key:'lane', label:'LANING', window:'0–10' };
  if (m < 20) return { key:'opening', label:'MAP OPENING', window:'10–20' };
  if (m < 35) return { key:'objectives', label:'OBJECTIVES', window:'20–35' };
  return { key:'late', label:'LATE GAME', window:'35+' };
}

function objectivePlan(minute, matchState, hero, converter) {
  const m = Number(minute || 0);
  const stateLead = matchState === 'ahead'
    ? 'You marked the game AHEAD: use the advantage to take territory before chasing kills.'
    : matchState === 'behind'
      ? 'You marked the game BEHIND: shove safe waves, reclaim vision in layers, then take the objective that does not require a blind walk.'
      : 'You marked the game EVEN: establish vision first, then force the objective that makes the enemy walk into you.';
  let next = '';
  if (m < 10) next = 'Lane resources → rune/rotation window → first tower pressure.';
  else if (m < 18) next = 'Outer tower pressure and control of the jungle entrances that connect the next two lanes.';
  else if (m < 23) next = 'Prepare the 20:00 Tormentor window while keeping Roshan approaches and the nearest valuable tower in mind.';
  else if (m < 35) next = 'Roshan / Tormentor / T2 pressure. Pick one objective and move your vision toward it before showing multiple heroes.';
  else next = 'Roshan before high ground when practical, then lanes + buyback discipline. A won fight should remove a building or secure the next Aegis window.';
  const conversion = converter?.localized_name && converter?.localized_name !== hero?.localized_name
    ? `${converter.localized_name} is the clearest structural conversion hero in your five; let won fights become map damage.`
    : `${hero?.localized_name || 'Your hero'} may need to help convert won fights directly rather than extending the chase.`;
  return { next, stateLead, conversion };
}

function visionPlan({ minute, matchState, playerSide, positionLabel }) {
  const phase = phaseForMinute(minute);
  const safe = playerSide === 'radiant' ? 'BOTTOM' : 'TOP';
  const off = playerSide === 'radiant' ? 'TOP' : 'BOTTOM';
  const support = /support|roam/i.test(String(positionLabel || ''));
  const observer = [];
  const deward = [];

  if (phase.key === 'lane') {
    observer.push(`${safe} safe-lane river / jungle entrance: see the support rotation before it reaches your core.`);
    observer.push(`${off} off-lane approach: protect the route your pos 3/4 uses to pressure or retreat.`);
    observer.push('Mid-river / rune approach when a support can place it without sacrificing lane control.');
    deward.push('Your pull-camp approach if the lane keeps resetting against you.');
    deward.push('Enemy pull/block area when denying that camp meaningfully changes lane equilibrium.');
    deward.push('Obvious lane high ground only when you have reason to believe vision is there; do not donate sentries blindly.');
  } else if (phase.key === 'opening') {
    observer.push('The jungle entrance behind the next outer tower your team wants to pressure.');
    observer.push('A river crossing that connects mid to the side of the map your cores are occupying.');
    observer.push('Defensive entrance behind your most valuable farming area if an enemy initiator is missing.');
    deward.push('Cliffs / ramps around the tower or jungle entrance you are about to occupy.');
    deward.push('Your own jungle entrances before your carry rotates into that farming area.');
    deward.push('Enemy defensive vision behind a tower before committing multiple heroes to the push.');
  } else if (phase.key === 'objectives') {
    observer.push('Roshan river approaches before your team groups there; vision should arrive before the heroes that hit Roshan.');
    observer.push('Enemy triangle / ancient-area entrance when AHEAD; your own triangle entrance when BEHIND.');
    observer.push('The path from the nearest live T2 into the objective area so rotations cannot enter unseen.');
    deward.push('High grounds and ramps immediately outside Roshan / Tormentor approaches.');
    deward.push('The jungle pocket your team is using as the staging area for the next smoke or objective.');
    deward.push('Enemy triangle access if your team is strong enough to occupy it; otherwise deward your own retreat path first.');
  } else {
    observer.push('Roshan / river approach that the enemy must cross before contesting Aegis.');
    observer.push('Enemy base-entry or high-ground approach only when your team can defend the ward and use the information.');
    observer.push('A defensive lane/jungle entrance that catches smoke movement when your team is split for buyback or wave pressure.');
    deward.push('Your base approaches and the high grounds that reveal heroes leaving base.');
    deward.push('Roshan staging ground before committing to Aegis or a high-ground push.');
    deward.push('Enemy high-ground vision before showing a core on the final approach.');
  }

  if (matchState === 'ahead') {
    observer.unshift('AHEAD: move one layer deeper than neutral vision. Ward the enemy route *into* the area you already control.');
    deward.unshift('AHEAD: remove defensive vision behind the objective so the enemy has to enter blind.');
  } else if (matchState === 'behind') {
    observer.unshift('BEHIND: prioritize your own ramps, farming entrances and smoke-warning vision before attempting deep wards.');
    deward.unshift('BEHIND: sentry your retreat / farming routes first. Deep dewarding without a smoke or numbers advantage is a feed risk.');
  } else {
    observer.unshift('EVEN: vision the contested entrance first. The next fight should start with information, not a face-check.');
  }

  return {
    phase,
    observer: observer.slice(0,4),
    deward: deward.slice(0,4),
    voice: support ? 'PLACE / DEWARD' : 'PLAY AROUND / REQUEST',
    note: support
      ? 'You are likely one of the heroes expected to physically move the vision line.'
      : 'As a core, the coaching goal is mostly where you should ask for vision and which warded territory you should farm/fight around.',
  };
}

function RunningClockText({ minute, clockStartedAt }) {
  const [seconds, setSeconds] = useState(() => Math.max(0, Math.floor(Number(minute || 0) * 60)));
  useEffect(() => {
    if (!clockStartedAt) { setSeconds(Math.max(0, Math.floor(Number(minute || 0) * 60))); return undefined; }
    const tick = () => setSeconds(Math.max(0, Math.floor((Date.now() - clockStartedAt) / 1000)));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [clockStartedAt, minute]);
  return <b>{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2,'0')}</b>;
}

function MatchStateBoard({ minute, onMinute, state, onState, clockStartedAt, onToggleClock, onResetClock }) {
  const phase = phaseForMinute(minute);
  return <section className="match-state-board panel-card">
    <div className="match-state-head"><div><div className="eyebrow">LIVE MATCH CONTEXT</div><h2>{phase.label} <small>{phase.window} min</small></h2></div><div className="match-minute"><RunningClockText minute={minute} clockStartedAt={clockStartedAt} /><span>{clockStartedAt ? 'local clock running' : 'manual / live-sync minute'}</span></div></div>
    <div className="match-state-controls">
      <div className="minute-control"><button onClick={()=>onMinute(Math.max(0,minute-1))}>−</button><input type="range" min="0" max="120" step="1" value={Math.min(120, Math.round(minute))} onChange={e=>onMinute(Number(e.target.value))}/><button onClick={()=>onMinute(Math.min(120,minute+1))}>+</button><button className={clockStartedAt?'clock active':'clock'} onClick={onToggleClock}>{clockStartedAt?'PAUSE CLOCK':'START MATCH CLOCK'}</button><button className="clock-reset" onClick={onResetClock}>RESET 0:00</button></div>
      <div className="state-toggle"><span>GAME STATE</span>{['ahead','even','behind'].map(x=><button key={x} className={state===x?`active ${x}`:''} onClick={()=>onState(x)}>{x.toUpperCase()}</button>)}</div>
    </div>
    <small className="match-state-note">A different completed draft now resets this automatically. The seconds display is isolated so it does not repaint the full Game Plan every second.</small>
  </section>;
}

function cleanConsoleName(value = '') {
  return String(value).replace(/^npc_dota_hero_/, '').replace(/^item_/, '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function LiveSyncCard({ state, health, itemConstants, enabled, onConnect, onDisconnect }) {
  const connected = Boolean(state?.connected);
  const bridgeOnline = Boolean(state?.bridge || health?.bridge || health?.ok);
  const items = (state?.items || []).map(row => {
    const key = normalize(row.name);
    const item = itemConstants?.[key] || Object.values(itemConstants || {}).find(candidate => normalize(candidate?.name) === key);
    return { ...row, item };
  }).filter(row => row.item?.dname || row.name);
  const normalItems = items.filter(row => !row.neutral);
  const neutralItems = items.filter(row => row.neutral);
  const postCount = Number(state?.postCount ?? health?.postCount ?? 0);
  const ageMs = Number(state?.ageMs ?? health?.ageMs);
  const ageText = Number.isFinite(ageMs) ? (ageMs < 1000 ? '<1s' : `${Math.round(ageMs / 1000)}s`) : '—';

  if (!enabled) return <section className="live-sync-card plan-card wide permission-gate">
    <div className="live-sync-head"><div><div className="eyebrow">LOCAL LIVE SYNC · OPTIONAL</div><h2>Connect Dota 2 on this computer</h2></div><span><i />NOT CONNECTED</span></div>
    <div className="local-permission-explainer">
      <div><b>WHAT THIS CONNECTS TO</b><p>Only the DotaSage companion running on <code>127.0.0.1:31982</code> on this computer.</p></div>
      <div><b>WHAT IT READS</b><p>Your Valve-provided local GSI state such as hero, level, match clock, K/D/A and your inventory.</p></div>
      <div><b>WHAT IT DOES NOT DO</b><p>It does not scan other devices on your network and the local bridge does not upload your live game state to DotaSage servers.</p></div>
    </div>
    <div className="live-permission-actions"><button className="primary-button" onClick={onConnect}>CONNECT LIVE SYNC</button><small>Chrome may then ask for permission to access local services/devices. That browser prompt is for this localhost connection.</small></div>
  </section>;

  return <section className={`live-sync-card plan-card wide ${connected ? 'connected' : bridgeOnline ? 'waiting' : ''}`}>
    <div className="live-sync-head"><div><div className="eyebrow">LOCAL LIVE SYNC · BETA</div><h2>{connected ? 'Dota is connected' : bridgeOnline ? 'Bridge online · waiting for Dota' : 'Local bridge not running'}</h2></div><div className="live-sync-status-actions"><span className={connected || bridgeOnline ? 'online' : ''}><i />{connected ? 'DOTA CONNECTED' : bridgeOnline ? 'BRIDGE ONLINE' : 'BRIDGE OFFLINE'}</span><button className="ghost-button" onClick={onDisconnect}>DISCONNECT</button></div></div>
    {connected ? <>
      <div className="live-sync-grid">
        <div><small>HERO</small><strong>{state?.hero?.name ? cleanConsoleName(state.hero.name) : 'Waiting…'}</strong><span>{state?.hero?.level != null ? `Level ${state.hero.level}` : 'level pending'}</span></div>
        <div><small>GAME CLOCK</small><strong>{Number.isFinite(Number(state?.map?.clock_time)) ? `${Math.floor(Math.max(0,Number(state.map.clock_time))/60)}:${String(Math.max(0,Number(state.map.clock_time))%60).padStart(2,'0')}` : '—'}</strong><span>{state?.map?.game_state || 'state pending'}</span></div>
        <div><small>K / D / A</small><strong>{state?.player ? `${state.player.kills ?? '–'} / ${state.player.deaths ?? '–'} / ${state.player.assists ?? '–'}` : '—'}</strong><span>{state?.player?.gpm != null ? `${state.player.gpm} GPM · ${state.player.xpm ?? '–'} XPM` : 'player stats pending'}</span></div>
        <div className="live-owned-items"><small>YOUR LIVE ITEMS · AUTO</small><div>{normalItems.length ? normalItems.slice(0,9).map((row,i)=><span key={`${row.slot || row.name}-${i}`} title={row.item?.dname || cleanConsoleName(row.name)}>{row.item && <img src={itemImageUrl(row.item)} alt=""/>}<b>{row.item?.dname || cleanConsoleName(row.name)}</b></span>) : <em>Waiting for inventory data…</em>}</div>{neutralItems.length > 0 && <div className="live-neutral-row"><small>NEUTRAL</small>{neutralItems.map((row,i)=><span key={`${row.slot || row.name}-neutral-${i}`}>{row.item && <img src={itemImageUrl(row.item)} alt=""/>}<b>{row.item?.dname || cleanConsoleName(row.name)}</b></span>)}</div>}</div>
      </div>
      <div className="live-diagnostics"><span>GSI POSTS <b>{postCount}</b></span><span>PAYLOAD AGE <b>{ageText}</b></span><span>LEVEL <b>{state?.hero?.level ?? 'pending'}</b></span><span>ITEM ROWS <b>{items.length}</b></span></div>
    </> : <div className="live-sync-offline"><p>{bridgeOnline ? <>The local bridge is healthy, but Dota has not sent fresh match state yet. Keep <b>START_DOTASAGE_BRIDGE.bat</b> open, fully restart Dota after GSI installation, then enter Demo Hero or a match. <b>CHECK_LIVE_SYNC.bat</b> will show whether Dota is posting.</> : <>Start <b>START_DOTASAGE_BRIDGE.bat</b>. The hosted site stays at <b>dotasage.vercel.app</b>; the bridge launcher no longer starts another local website.</>}</p><small>Your own inventory and level are automatic when Valve GSI supplies them. Enemy inventories remain observation-driven rather than hidden-state automation.</small><div className="live-diagnostics"><span>GSI POSTS <b>{postCount}</b></span><span>LAST PAYLOAD <b>{ageText}</b></span></div></div>}
  </section>;
}

function LocalLiveSyncPanel({ itemConstants, onOwnItems, onLiveMinute }) {
  const [enabled, setEnabled] = useState(() => { try { return sessionStorage.getItem('dotasage:live-sync-enabled') === '1'; } catch { return false; } });
  const [state, setState] = useState({ bridge: false, connected: false });
  const [health, setHealth] = useState({ bridge: false, ok: false });
  const lastItemSignature = useRef('');
  const lastMinuteBucket = useRef(null);
  const ownItemsCallback = useRef(onOwnItems);
  const liveMinuteCallback = useRef(onLiveMinute);
  useEffect(() => { ownItemsCallback.current = onOwnItems; liveMinuteCallback.current = onLiveMinute; });
  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    const poll = async () => {
      const [next, nextHealth] = await Promise.all([fetchLocalGameState(), fetchLocalGsiHealth()]);
      if (cancelled) return;
      setState(next || { bridge:false, connected:false });
      setHealth(nextHealth || { bridge:false, ok:false });
      if (!next?.connected) return;
      const itemNames = (next.items || []).filter(row => !row.neutral).map(row => normalize(row.name)).filter(Boolean).sort();
      const itemSignature = itemNames.join('|');
      if (itemSignature !== lastItemSignature.current) {
        lastItemSignature.current = itemSignature;
        ownItemsCallback.current?.(itemNames);
      }
      const seconds = Number(next?.map?.clock_time);
      if (Number.isFinite(seconds) && seconds >= 0) {
        const minuteBucket = Math.floor(seconds / 30); // coaching state only needs a coarse update
        if (minuteBucket !== lastMinuteBucket.current) {
          lastMinuteBucket.current = minuteBucket;
          liveMinuteCallback.current?.(seconds / 60);
        }
      }
    };
    poll();
    const timer = window.setInterval(poll, 2500);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [enabled]);
  const connect = () => { try { sessionStorage.setItem('dotasage:live-sync-enabled','1'); } catch {} setEnabled(true); };
  const disconnect = () => { try { sessionStorage.removeItem('dotasage:live-sync-enabled'); } catch {} setEnabled(false); setState({bridge:false,connected:false}); setHealth({bridge:false,ok:false}); ownItemsCallback.current?.([]); };
  return <LiveSyncCard state={state} health={health} itemConstants={itemConstants} enabled={enabled} onConnect={connect} onDisconnect={disconnect} />;
}

function VisionObjectiveBoard({ minute, matchState, playerSide, positionLabel, hero, converter }) {
  const vision = visionPlan({ minute, matchState, playerSide, positionLabel });
  const objective = objectivePlan(minute, matchState, hero, converter);
  return <section className="vision-objective-card plan-card wide">
    <div className="vision-objective-head"><div><div className="eyebrow">VISION + MAP CONTROL · {vision.phase.label}</div><h2>Where the next information should come from</h2></div><span>{vision.voice}</span></div>
    <div className="vision-grid">
      <div className="vision-column observer"><h3>OBSERVER / INFORMATION</h3>{vision.observer.map((text,i)=><div key={i}><b>{i+1}</b><p>{text}</p></div>)}</div>
      <div className="vision-column sentry"><h3>SENTRY / DEWARD</h3>{vision.deward.map((text,i)=><div key={i}><b>{i+1}</b><p>{text}</p></div>)}</div>
      <aside className="objective-call"><div className="eyebrow">NEXT CONVERSION</div><strong>{objective.next}</strong><p>{objective.stateLead}</p><small>{objective.conversion}</small></aside>
    </div>
    <small className="vision-caveat">Zone-level coaching, not an exact ward-pin guarantee. Current map geometry changes can make a historically good cliff or tree pocket unsafe; use the zone + objective logic first.</small>
  </section>;
}

function retroCoach(match, hero) {
  if (!match) return [];
  const player = (match.players || []).find(p => Number(p.account_id) === Number(DEFAULT_PROFILE.accountId)) || (match.players || []).find(p => Number(p.hero_id) === Number(hero.id));
  if (!player) return ['Parsed match detail loaded, but DotaSage could not confidently identify your player row.'];
  const minutes = Math.max(1, Number(match.duration || 0) / 60);
  const deaths = Number(player.deaths || 0); const kills = Number(player.kills || 0); const assists = Number(player.assists || 0);
  const lhpm = Number(player.last_hits || 0) / minutes;
  const tips = [];
  const deathTimes = (player.deaths_log || []).map(x => Number(x.time ?? x)).filter(Number.isFinite);
  const earlyDeaths = deathTimes.filter(t => t >= 0 && t < 600).length;
  const midDeaths = deathTimes.filter(t => t >= 600 && t < 1800).length;
  const lateDeaths = deathTimes.filter(t => t >= 1800).length;
  if (deaths >= 7) tips.push(`${deaths} deaths is the clearest review target. Re-open the first avoidable death before changing your build: repeated deaths usually erase more tempo than a small item optimization recovers.`);
  if (midDeaths >= 3) tips.push(`${midDeaths} recorded deaths landed between 10–30 minutes. That points the review toward mid-game map choice / fight entry rather than the lane alone.`);
  if (lateDeaths >= 2) tips.push(`${lateDeaths} recorded deaths came after 30 minutes. In late fights, review whether you showed first, fought without buyback information, or committed before the enemy control layer was used.`);
  if (earlyDeaths >= 2) tips.push(`${earlyDeaths} recorded deaths happened before 10 minutes. Check lane equilibrium, support rotations and whether early trades were actually buying access to the next wave.`);
  const carryLike = hasRole(hero,'Carry');
  const laneEfficiency = Number(player.lane_efficiency || 0);
  if (laneEfficiency >= .52 && midDeaths >= 2) tips.push(`Your recorded lane efficiency was ${(laneEfficiency * 100).toFixed(0)}%, while ${midDeaths} deaths came later in the 10–30 minute window. That is a strong clue that the lane itself was not the main failure point; review the first two post-lane rotations and where your XP/farm route broke.`);
  const levels = (match.players || []).map(p => Number(p.level || 0)).filter(x => x > 0);
  const avgLevel = levels.length ? levels.reduce((a,b)=>a+b,0) / levels.length : 0;
  if (avgLevel && Number(player.level || 0) + 1.5 < avgLevel) tips.push(`You finished level ${player.level || '–'} while the lobby average was about ${avgLevel.toFixed(1)}. Review whether repeated rotations/fights traded away too many solo waves and camps; creating space is valuable, but a mid/core can still starve itself of the next power spike.`);
  if (carryLike && minutes >= 25 && lhpm < 6) tips.push(`Your last-hit pace was about ${lhpm.toFixed(1)}/min. For a core in a ${Math.round(minutes)}-minute game, review the 10–25 minute farm route and which fights pulled you away from safe waves/camps.`);
  if (Number(player.gold_per_min || 0) > 0) tips.push(`Economy snapshot: ${player.gold_per_min} GPM, ${player.xp_per_min ?? '–'} XPM, ${player.last_hits ?? '–'} last hits. Compare this to the timing when the game started feeling harder rather than judging only the final K/D/A.`);
  if (kills + assists >= Math.max(8, deaths * 3)) tips.push(`You still participated in ${kills + assists} kills with ${deaths} deaths. The review should focus on preserving the strong windows you created, not rewriting the whole game plan.`);
  if (!tips.length) tips.push('The basic box score does not expose one obvious failure mode. Use the OpenDota match page/replay to review the first major momentum swing, item timing and your positioning in the next two fights.');
  return tips.slice(0,5);
}

function PostMatchFeedback({ hero, draft }) {
  const [saved, setSaved] = useState(false); const [rating, setRating] = useState(''); const [note, setNote] = useState('');
  const [latest, setLatest] = useState(null); const [detail, setDetail] = useState(null); const [matchLookup, setMatchLookup] = useState('idle');
  async function findLatest() {
    setMatchLookup('loading'); setDetail(null);
    try {
      const rows = await fetchRecentMatches(DEFAULT_PROFILE.accountId);
      const row = [...(rows || [])].sort((a,b)=>Number(b.start_time||0)-Number(a.start_time||0)).find(match => Number(match.hero_id) === Number(hero.id));
      if (!row) { setMatchLookup('missing'); return; }
      const radiant = Number(row.player_slot || 0) < 128;
      const won = Boolean(row.radiant_win) === radiant;
      const base = { ...row, won }; setLatest(base);
      try { setDetail(await fetchMatch(row.match_id)); } catch { /* recent row still useful if parse detail lags */ }
      setMatchLookup('found');
    } catch { setMatchLookup('error'); }
  }
  const review = retroCoach(detail, hero);
  function save() {
    try {
      const key = 'dotasage:local-feedback'; const existing = JSON.parse(localStorage.getItem(key) || '[]');
      existing.unshift({ savedAt: Date.now(), heroId: hero.id, hero: hero.localized_name, allies: draft.allies.map(h=>h.id), enemies: draft.enemies.map(h=>h.id), rating, note: note.slice(0,1000), match: latest ? { match_id: latest.match_id, won: latest.won, kills: latest.kills, deaths: latest.deaths, assists: latest.assists, duration: latest.duration } : null });
      localStorage.setItem(key, JSON.stringify(existing.slice(0,50))); setSaved(true);
    } catch { setSaved(true); }
  }
  return <section id="post-match-review" className="post-match-feedback plan-card wide"><div className="feedback-title"><span><b>AFTER THE MATCH</b> Review + optional feedback</span><small>always visible · saved only on this device</small></div><div className="feedback-body"><p>Pull the latest public match for this hero and DotaSage will give a small retroactive review from the parsed stats that are actually available.</p>
    <div className="post-match-import"><button onClick={findLatest} disabled={matchLookup==='loading'}>{matchLookup==='loading'?'CHECKING OPENDOTA…':'FIND MY LATEST '+hero.localized_name.toUpperCase()+' MATCH'}</button>{latest&&<div className="imported-match"><strong>{latest.won?'WIN':'LOSS'} · {latest.kills}/{latest.deaths}/{latest.assists}</strong><span>{Math.round(Number(latest.duration||0)/60)} min · match {latest.match_id}</span></div>}{matchLookup==='missing'&&<small>No recent public {hero.localized_name} match is indexed yet. OpenDota can lag behind the client.</small>}{matchLookup==='error'&&<small>Could not query recent matches right now.</small>}</div>
    {latest && <div className="retro-review"><div className="eyebrow">RETRO COACH · HEURISTIC REVIEW</div><h3>{detail ? 'What the parsed match suggests' : 'Match found · detailed parse still pending'}</h3>{detail ? review.map((tip,i)=><div key={i}><b>{i+1}</b><p>{tip}</p></div>) : <p>Open the match in OpenDota or try again after it finishes parsing for richer timing / event data.</p>}<small>These are transparent heuristics from available match stats, not proof of why the game was won or lost.</small></div>}
    <div className="feedback-ratings">{['1','2','3','4','5'].map(x=><button key={x} className={rating===x?'active':''} onClick={()=>setRating(x)}>{x}</button>)}</div><textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Anything the coach got right or wrong? Pick quality, item timing, lane, wards, target priority…" /><button className="primary-button" onClick={save}>{saved ? 'SAVED LOCALLY ✓' : 'SAVE ON THIS DEVICE'}</button><small>No account upload in v0.15. Imported match data and feedback remain local in this build.</small></div></section>;
}

function manualPositionLabel(lane, playerSide, laneFilter, fallback) {
  if (!lane) return fallback;
  if (lane === 'mid') return 'POSITION 2 · MID';
  const safeLane = playerSide === 'radiant' ? 'bottom' : 'top';
  if (lane === safeLane) return laneFilter === 'support5' ? 'POSITION 5 · HARD SUPPORT' : 'POSITION 1 · SAFE LANE';
  return ['support4','roam'].includes(laneFilter) ? 'POSITION 4 · SUPPORT' : 'POSITION 3 · OFFLANE';
}

export default function GamePlan({ draft, playerSide = 'radiant', laneFilter = 'all', lineupRatings, selectedScore, pairBreakdown, pairLoading, pairError, onBack, positionLabel, itemPopularity, itemConstants, itemLoading }) {
  const hero = draft.self;
  const [laneOverrides, setLaneOverrides] = useState(() => { try { return JSON.parse(sessionStorage.getItem('dotasage:lane-overrides') || '{}'); } catch { return {}; } });
  const moveLane = (id, lane, reset = false) => setLaneOverrides(current => { const next = reset ? {} : { ...current, [id]: lane }; try { sessionStorage.setItem('dotasage:lane-overrides', JSON.stringify(next)); } catch {} return next; });
  const [observedCounts, setObservedCounts] = useState(() => { try { return JSON.parse(sessionStorage.getItem('dotasage:observed-enemy-items') || '{}'); } catch { return {}; } });
  const [liveOwnItemNames, setLiveOwnItemNames] = useState([]);
  const changeObservedItem = (id, delta) => setObservedCounts(current => { const next = { ...current }; const value = Math.max(0, Number(next[id] || 0) + delta); if (value) next[id] = value; else delete next[id]; try { sessionStorage.setItem('dotasage:observed-enemy-items', JSON.stringify(next)); } catch {} return next; });
  const observedItems = Object.entries(observedCounts).map(([id,count]) => ({ item: itemConstants?.[id] || itemConstants?.[Number(id)], count })).filter(row => row.item?.dname && row.count > 0);
  const [matchMinute, setMatchMinuteState] = useState(() => { try { return Number(sessionStorage.getItem('dotasage:match-minute') || 0); } catch { return 0; } });
  const [matchState, setMatchStateState] = useState(() => { try { return sessionStorage.getItem('dotasage:match-state') || 'even'; } catch { return 'even'; } });
  const [clockStartedAt, setClockStartedAt] = useState(() => { try { const raw = Number(sessionStorage.getItem('dotasage:match-clock-start') || 0); return raw || null; } catch { return null; } });
  const matchSignature = [...draft.allies, ...draft.enemies].map(row => Number(row.id)).filter(Boolean).sort((a,b)=>a-b).join('-') + `|self:${hero?.id || 0}`;
  const persistMinute = next => { setMatchMinuteState(next); try { sessionStorage.setItem('dotasage:match-minute', String(next)); } catch {} };
  const setMatchMinute = value => { const next = Math.max(0, Math.min(120, Number(value || 0))); persistMinute(next); if (clockStartedAt) { const start = Date.now() - next * 60000; setClockStartedAt(start); try { sessionStorage.setItem('dotasage:match-clock-start', String(start)); } catch {} } };
  const setMatchMinuteFromLive = value => { const next = Math.max(0, Math.min(120, Number(value || 0))); persistMinute(next); if (clockStartedAt) setClockStartedAt(null); try { sessionStorage.removeItem('dotasage:match-clock-start'); } catch {} };
  const setMatchState = value => { setMatchStateState(value); try { sessionStorage.setItem('dotasage:match-state', value); } catch {} };
  const resetMatchClock = () => { setClockStartedAt(null); persistMinute(0); try { sessionStorage.removeItem('dotasage:match-clock-start'); } catch {} };
  const toggleMatchClock = () => { if (clockStartedAt) { setClockStartedAt(null); try { sessionStorage.removeItem('dotasage:match-clock-start'); } catch {} } else { const start = Date.now() - matchMinute * 60000; setClockStartedAt(start); try { sessionStorage.setItem('dotasage:match-clock-start', String(start)); } catch {} } };

  // A genuinely new ten-hero draft starts a fresh match context automatically.
  // Swapping Radiant/Dire or correcting which team is yours does not reset it because
  // the signature is based on the hero set, not screen-side ordering.
  useEffect(() => {
    if (!hero || draft.allies.length + draft.enemies.length < 2) return;
    let previous = '';
    try { previous = sessionStorage.getItem('dotasage:match-signature') || ''; } catch {}
    if (previous === matchSignature) return;
    setLaneOverrides({});
    setObservedCounts({});
    setLiveOwnItemNames([]);
    setMatchStateState('even');
    setClockStartedAt(null);
    setMatchMinuteState(0);
    try {
      sessionStorage.setItem('dotasage:match-signature', matchSignature);
      ['dotasage:lane-overrides','dotasage:observed-enemy-items','dotasage:match-clock-start'].forEach(key => sessionStorage.removeItem(key));
      sessionStorage.setItem('dotasage:match-minute', '0');
      sessionStorage.setItem('dotasage:match-state', 'even');
    } catch {}
  }, [matchSignature]);

  // Coarse coaching-time updates only. The visible seconds tick inside RunningClockText,
  // so the large Game Plan does not rerender every second while the user scrolls.
  useEffect(() => {
    if (!clockStartedAt) return undefined;
    const tick = () => persistMinute(Math.max(0, Math.min(120, (Date.now() - clockStartedAt) / 60000)));
    tick();
    const timer = window.setInterval(tick, 30000);
    return () => window.clearInterval(timer);
  }, [clockStartedAt]);
  if (!hero) return null;
  const correctedLaneMap = applyLaneOverrides(buildLaneMap({ allies: draft.allies, enemies: draft.enemies, playerSide, selfId: hero.id, selfFilter: laneFilter }), laneOverrides);
  const selfLane = heroLane(correctedLaneMap, hero.id);
  const effectivePositionLabel = manualPositionLabel(selfLane, playerSide, laneFilter, positionLabel);
  const enemySide = playerSide === 'radiant' ? 'dire' : 'radiant';
  const laneOpponents = correctedLaneMap.lanes.find(row => row.lane === selfLane)?.[enemySide]?.map(entry => entry.hero) || [];
  const known = (pairBreakdown || []).filter(x => Number(x.games || 0) > 0 && Number(x.confidence || 0) > 0);
  const biggestThreats = [...known].sort((a,b)=>a.score-b.score).slice(0,3); const bestTargets = [...known].sort((a,b)=>b.score-a.score).slice(0,3);
  const threat = biggestThreats[0]; const target = bestTargets[0];
  const opener = firstRole(draft.allies.filter(h=>h.id!==hero.id), 'Initiator', hero); const layer = firstRole(draft.allies.filter(h=>h.id!==opener?.id), 'Disabler', firstRole(draft.allies, 'Nuker', hero)); const converter = firstRole(draft.allies, 'Pusher', firstRole(draft.allies, 'Carry', hero));
  const vs = selectedScore?.enemyScore ?? 0; const laneTone = vs >= 4 ? 'statistically favorable into the entered enemy draft' : vs <= -4 ? 'statistically pressured by the entered enemy draft' : 'fairly neutral into the entered enemy draft';
  const rawPhases = itemPopularity ? [['START',topItems(itemPopularity.start_game_items,itemConstants,8)],['EARLY',topItems(itemPopularity.early_game_items,itemConstants,8)],['MID / CORE',topItems(itemPopularity.mid_game_items,itemConstants,8)],['LATE',topItems(itemPopularity.late_game_items,itemConstants,8)]] : [];
  // Deep phase data is used for recipe/inventory resolution. The visible purchase rows stay compact.
  const deepRawPhases = itemPopularity ? [['START',topItems(itemPopularity.start_game_items,itemConstants,36)],['EARLY',topItems(itemPopularity.early_game_items,itemConstants,36)],['MID / CORE',topItems(itemPopularity.mid_game_items,itemConstants,36)],['LATE',topItems(itemPopularity.late_game_items,itemConstants,36)]] : [];
  const itemPhases = enrichBuildTransitions(rawPhases); const deepItemPhases = enrichBuildTransitions(deepRawPhases);
  const actionNotes = inventoryActionNotes(deepItemPhases);
  const snapshots = inventorySnapshots(deepItemPhases, itemConstants);
  const buildPaths = buildPathRows(deepItemPhases);
  const conditionals = conditionalItemAdvice(hero, draft, itemConstants, observedItems);
  const liveAdjustments = observedItemAdjustments(observedItems);
  const coachTips = [...liveAdjustments.map(row => `${row.title}: ${row.text}`), ...roleCoachTips(effectivePositionLabel, hero, threat, target)];
  const adaptiveLate = adaptiveInventory(snapshots.find(([title])=>title === 'LATE INVENTORY')?.[1] || [], conditionals, itemConstants);
  const timeline = roleTimeline(effectivePositionLabel, hero);
  const liveOwnedItems = resolveLiveOwnedItems(liveOwnItemNames, itemConstants);
  const liveTargets = liveNextTargets(liveOwnedItems, deepItemPhases, conditionals, itemConstants);
  const radiantHeroes = playerSide === 'radiant' ? draft.allies : draft.enemies;
  const direHeroes = playerSide === 'dire' ? draft.allies : draft.enemies;
  const radiantRatings = playerSide === 'radiant' ? lineupRatings?.allies : lineupRatings?.enemies;
  const direRatings = playerSide === 'dire' ? lineupRatings?.allies : lineupRatings?.enemies;

  return <main className="game-plan">
    <div className="game-plan-top"><div className="game-plan-top-actions"><button className="ghost-button" onClick={onBack}>← Back to Draft</button><button className="ghost-button post-review-jump" onClick={()=>document.getElementById('post-match-review')?.scrollIntoView({behavior:'smooth',block:'start'})}>POST-MATCH REVIEW ↓</button></div><div className="plan-status"><span />GAME PLAN · LIVE DRAFT CONTEXT</div></div>
    <section className="hero-plan-banner panel-card"><img src={hero.portrait} alt="" /><div className="banner-copy"><div className="eyebrow">YOUR HERO · {playerSide.toUpperCase()} · PATCH {CURRENT_PATCH.id}</div><h1>{hero.localized_name}</h1><p>{effectivePositionLabel} · {(hero.roles || []).join(' · ')}</p></div><div className="banner-scores"><ScorePill label="VS ENEMY" value={selectedScore?.enemyScore} signed /><ScorePill label="TEAM FIT" value={selectedScore?.teamFit} /><ScorePill label="PERSONAL" value={selectedScore?.personalFit != null ? selectedScore.personalFit / 10 : null} /><ScorePill label="RECOMMEND" value={selectedScore?.overall} /></div></section>
    <section className="plan-context panel-card map-side-context"><HeroStrip label={`RADIANT · ${playerSide === 'radiant' ? 'YOUR TEAM' : 'ENEMY'}`} heroes={radiantHeroes} type={playerSide === 'radiant' ? 'ally' : 'enemy'} ratings={radiantRatings} selfId={hero.id} /><HeroStrip label={`DIRE · ${playerSide === 'dire' ? 'YOUR TEAM' : 'ENEMY'}`} heroes={direHeroes} type={playerSide === 'dire' ? 'ally' : 'enemy'} ratings={direRatings} selfId={hero.id} /></section>
    <LanePredictionMap draft={draft} playerSide={playerSide} laneFilter={laneFilter} selfId={hero.id} overrides={laneOverrides} onMove={moveLane} />
    <MatchStateBoard minute={matchMinute} onMinute={setMatchMinute} state={matchState} onState={setMatchState} clockStartedAt={clockStartedAt} onToggleClock={toggleMatchClock} onResetClock={resetMatchClock} />
    <LocalLiveSyncPanel itemConstants={itemConstants} onOwnItems={setLiveOwnItemNames} onLiveMinute={setMatchMinuteFromLive} />
    <div className="plan-grid">
      <VisionObjectiveBoard minute={matchMinute} matchState={matchState} playerSide={playerSide} positionLabel={effectivePositionLabel} hero={hero} converter={converter} />
      <section className="plan-card threat-card"><div className="eyebrow">MATCHUP MAP</div><h2>Biggest Threats</h2>{pairLoading?<p className="data-state">Loading {hero.localized_name}'s direct matchup table…</p>:pairError?<p className="data-state error">Matchup API unavailable right now. No fake 0.0 scores shown.</p>:biggestThreats.length?biggestThreats.map(x=><div className="threat-row" key={x.hero.id}><img src={x.hero.portrait} alt=""/><div><strong>{x.hero.localized_name}</strong><span>{x.games.toLocaleString()} matchup samples</span></div><b>{signed(x.score)}</b></div>):<p className="data-state">Add enemies or wait for verified matchup samples.</p>}</section>
      <section className="plan-card target-card"><div className="eyebrow">OPPORTUNITIES</div><h2>Best Matchups</h2>{pairLoading?<p className="data-state">Calculating statistical edges…</p>:bestTargets.length?bestTargets.map(x=><div className="threat-row" key={x.hero.id}><img src={x.hero.portrait} alt=""/><div><strong>{x.hero.localized_name}</strong><span>{x.games.toLocaleString()} matchup samples</span></div><b>{signed(x.score)}</b></div>):<p className="data-state">No verified matchup samples available yet.</p>}</section>
      <section className="plan-card coach-card wide"><div className="eyebrow">COACH QUEUE</div><h2>Things to Think About This Game</h2><div className="coach-tip-grid">{coachTips.slice(0,6).map((tip,i)=><div key={i}><b>{String(i+1).padStart(2,'0')}</b><p>{tip}</p></div>)}</div><small className="coach-caveat">Pull/stack windows are practical baseline timings; exact pathing can vary by side, camp and map geometry.</small></section><section className="plan-card wide game-timeline-card"><div className="eyebrow">GAME TIMELINE</div><h2>Role checkpoints</h2><div className="game-timeline">{timeline.map(([time,text])=><div key={time}><b>{time}</b><p>{text}</p></div>)}</div></section>
      <section className="plan-card"><div className="eyebrow">LANING / EARLY PLAN</div><h2>{effectivePositionLabel}</h2><p className="plan-lead">{hero.localized_name} is <b>{laneTone}</b>.</p>{laneOpponents.length > 0 && <p className="lane-opponents"><b>Corrected lane:</b> {selfLane?.toUpperCase()} · expected opponents: {laneOpponents.map(x=>x.localized_name).join(' + ')}</p>}<ul className="plan-bullets"><li>{threat?`Respect ${threat.hero.localized_name}: your lowest verified matchup here is ${signed(threat.score)}.`:'No verified enemy matchup has loaded yet.'}</li><li>{target?`Your cleanest statistical pressure matchup is ${target.hero.localized_name} (${signed(target.score)}).`:'Target priority will sharpen as matchup data loads.'}</li><li>Use the matchup score as context, not permission to ignore lane partners, rotations or item timings.</li></ul></section>
      <LiveEnemyItems itemConstants={itemConstants} counts={observedCounts} onChange={changeObservedItem} />
      <LiveTacticalAdjustments rows={liveAdjustments} />
      <section className="plan-card item-plan"><div className="eyebrow">ITEMIZATION</div><h2>Build + contingency board</h2>{itemLoading?<p className="data-state">Loading item popularity and item assets…</p>:itemPhases.some(([,items])=>items.length)?<><div className="item-plan-layout"><div className="item-phase-stack">{itemPhases.map(([phase,items])=><ItemRow key={phase} title={phase} entries={items}/>)}<BuildPathBoard rows={buildPaths}/><div className="inventory-snapshots">{snapshots.map(([title,items])=><TimelineSnapshot key={title} title={title} entries={items}/>)}{liveTargets.length > 0 && <div className="live-target-wrap"><TimelineSnapshot title="LIVE NEXT TARGETS" entries={liveTargets}/><small>Automatic from your GSI inventory. Prioritizes useful upgrades and high-priority reactive items you do not already own.</small></div>}{adaptiveLate.length > 0 && <div className="adaptive-inventory-wrap"><TimelineSnapshot title="ADAPTIVE LATE TARGET" entries={adaptiveLate}/><small>Changes when a tracked enemy item creates a high-priority counter response.</small></div>}</div><p className="item-disclaimer">Purchase rows come from OpenDota popularity data. Inventory targets use a deeper recipe pass and intentionally suppress raw components such as Sacred Relic. They are planning shapes, not proof that six items were held together in one match.</p></div><aside className="inventory-notes"><div className="eyebrow">INVENTORY ACTIONS</div><h3>Dismantle · Sell · Convert</h3>{actionNotes.length?actionNotes.map(note=><p key={note.key}>{note.text}</p>):<p>No meaningful dismantle/sell action is justified by the loaded data. Obvious recipe components stay visual instead of becoming fake coaching notes.</p>}<small>DotaSage does not invent sell timings from popularity alone.</small></aside></div>{conditionals.length>0&&<div className="conditional-items"><div className="conditional-head"><div className="eyebrow">IF THE GAME CHANGES</div><h3>Situational counter options</h3></div><div className="conditional-item-grid">{conditionals.map(({item,title,reason,priority})=><div key={item.id} className={`conditional-item ${priority?'priority':''}`}><img src={itemImageUrl(item)} alt=""/><div><b>{title}</b><strong>{item.dname}</strong><p>{reason}</p></div></div>)}</div><small>Modeled response options from the entered lineup and live item constants; not empirical item win-rate claims.</small></div>}</>:<p className="data-state">Item popularity is unavailable for this hero right now.</p>}</section>
      <section className="plan-card wide"><div className="eyebrow">COMPOSITION MODEL</div><h2>How Your Five Wants to Fight</h2>{liveAdjustments.length > 0 && <p className="fight-live-note"><b>LIVE ADJUSTMENT:</b> {liveAdjustments[0].text}</p>}<div className="fight-flow"><div><b>1</b><span>OPEN</span><strong>{opener?.localized_name||'Initiator'} creates the first commitment</strong></div><i>→</i><div><b>2</b><span>LAYER</span><strong>{layer?.localized_name||'Control'} follows with control / burst</strong></div><i>→</i><div><b>3</b><span>YOUR ENTRY</span><strong>{hasRole(hero,'Initiator')?`${hero.localized_name} can start or re-enter`:`${hero.localized_name} enters after key control is committed`}</strong></div><i>→</i><div><b>4</b><span>CONVERT</span><strong>{converter?.localized_name||hero.localized_name} turns the win into tower · Roshan · map</strong></div></div><p className="model-note">Role/composition modeling, not an empirical claim about exact spell order yet.</p></section>
      <section className="plan-card wide win-condition"><div className="eyebrow">WIN CONDITION</div><h2>What Actually Wins This Draft</h2><p>{hasRole(draft.allies.find(h=>h.id===hero.id),'Carry')?`Give ${hero.localized_name} clean entry windows instead of forcing them to show first. `:`Use ${hero.localized_name}'s role to enable the lineup's first clean engagement. `}{threat?`Track ${threat.hero.localized_name}, your hardest entered matchup, before committing. `:''}{hasRole(converter,'Pusher')?`Your lineup has explicit pushing tools through ${converter.localized_name}, so convert won fights immediately.`:'After won fights, prioritize the safest objective rather than drifting into low-value chases.'}</p></section>
      <PostMatchFeedback hero={hero} draft={draft} />
    </div>
  </main>;
}
