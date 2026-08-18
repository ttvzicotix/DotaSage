const POSITIONS = ['safeCore', 'mid', 'offCore', 'support4', 'support5'];

function lowerSet(values = []) { return new Set((values || []).map(x => String(x).toLowerCase())); }
function hasRole(hero, role) { return lowerSet(hero?.roles).has(role.toLowerCase()); }
function hasHint(hero, hint) { return lowerSet(hero?.roleHints).has(hint.toLowerCase()); }
function hasLane(hero, lane) { return lowerSet(hero?.lanes).has(lane.toLowerCase()); }

// Whole-lineup role assignment. Live OpenDota role tags are broad, so DotaSage also
// uses our lane/role hints as priors. A hero can still land somewhere unusual, but a
// known mid should beat a generic durable initiator for mid when the five are solved together.
function positionScore(hero, position) {
  const carry = hasRole(hero, 'Carry') ? 1 : 0;
  const support = hasRole(hero, 'Support') ? 1 : 0;
  const nuker = hasRole(hero, 'Nuker') ? 1 : 0;
  const durable = hasRole(hero, 'Durable') ? 1 : 0;
  const initiator = hasRole(hero, 'Initiator') ? 1 : 0;
  const disabler = hasRole(hero, 'Disabler') ? 1 : 0;
  const escape = hasRole(hero, 'Escape') ? 1 : 0;
  const pusher = hasRole(hero, 'Pusher') ? 1 : 0;
  const ranged = String(hero?.attack_type || '').toLowerCase() === 'ranged' ? 1 : 0;
  const safeLane = hasLane(hero, 'safe') || hasHint(hero, 'carry');
  const midLane = hasLane(hero, 'mid') || hasHint(hero, 'mid');
  const offLane = hasLane(hero, 'off') || hasHint(hero, 'offlane') || hasHint(hero, 'off');
  const roamLane = hasLane(hero, 'roam') || hasHint(hero, 'roam');
  const supportHint = hasHint(hero, 'support');

  if (position === 'safeCore') {
    return carry * 4.2 + (safeLane ? 5.2 : 0) + escape * 1.1 + pusher * .7 - support * 1.5 - (supportHint ? 2.2 : 0);
  }
  if (position === 'mid') {
    // Mid priors are intentionally strong. This prevents Tide-type offlaners from
    // stealing mid from explicit mids such as Viper in otherwise ambiguous lineups.
    return (midLane ? 7.2 : 0) + nuker * 2.4 + ranged * .8 + carry * .8 + escape * .7 + disabler * .35
      - support * 1.8 - (supportHint && !midLane ? 2.5 : 0) - (durable && initiator && !midLane ? 2.4 : 0) - (offLane && !midLane ? 1.2 : 0);
  }
  if (position === 'offCore') {
    return (offLane ? 6.5 : 0) + durable * 3 + initiator * 3 + disabler * 1.1 + carry * .35
      - support * .5 - (midLane && !offLane ? 1.2 : 0);
  }
  if (position === 'support4') {
    return support * 3.2 + (roamLane ? 4.5 : 0) + disabler * 2 + initiator * 1.3 + nuker * .9 + escape * 1.0
      + (supportHint ? 1.8 : 0) - carry * 1.7;
  }
  if (position === 'support5') {
    return support * 4.1 + (supportHint ? 2.4 : 0) + (safeLane && support ? 2.0 : 0) + disabler * 1.0 + nuker * .4
      - carry * 2.4 - (midLane && !support ? 2.0 : 0);
  }
  return 0;
}

function permutations(rows) {
  if (rows.length <= 1) return [rows];
  const out = [];
  rows.forEach((row, index) => {
    const rest = [...rows.slice(0, index), ...rows.slice(index + 1)];
    for (const tail of permutations(rest)) out.push([row, ...tail]);
  });
  return out;
}

function laneFilterToPosition(filter) {
  if (filter === 'safe') return 'safeCore';
  if (filter === 'mid') return 'mid';
  if (filter === 'off') return 'offCore';
  if (filter === 'support4' || filter === 'roam') return 'support4';
  if (filter === 'support5') return 'support5';
  return null;
}

export function predictPositions(heroes = [], { selfId = null, selfFilter = 'all' } = {}) {
  const rows = heroes.slice(0, 5);
  if (!rows.length) return {};
  const positions = POSITIONS.slice(0, rows.length);
  const anchorPosition = selfId ? laneFilterToPosition(selfFilter) : null;
  let best = null;

  for (const perm of permutations(rows)) {
    if (anchorPosition && positions.includes(anchorPosition)) {
      const anchorIndex = positions.indexOf(anchorPosition);
      if (perm[anchorIndex]?.id !== selfId) continue;
    }
    let score = 0;
    positions.forEach((position, index) => { score += positionScore(perm[index], position); });
    if (!best || score > best.score) best = { perm, score };
  }

  const chosen = best?.perm || rows;
  return Object.fromEntries(positions.map((position, index) => [position, chosen[index]]).filter(([, hero]) => hero));
}

export function buildLaneMap({ allies = [], enemies = [], playerSide = 'radiant', selfId = null, selfFilter = 'all' } = {}) {
  const ourSide = playerSide === 'dire' ? 'dire' : 'radiant';
  const enemySide = ourSide === 'radiant' ? 'dire' : 'radiant';
  const ours = predictPositions(allies, { selfId, selfFilter });
  const theirs = predictPositions(enemies);

  const sideLane = (side, position) => {
    if (position === 'mid') return 'mid';
    const safe = position === 'safeCore' || position === 'support5';
    if (side === 'radiant') return safe ? 'bottom' : 'top';
    return safe ? 'top' : 'bottom';
  };

  const laneRows = ['top', 'mid', 'bottom'].map(lane => ({ lane, radiant: [], dire: [] }));
  const addSide = (assignment, side) => {
    Object.entries(assignment).forEach(([position, hero]) => {
      const lane = sideLane(side, position);
      const row = laneRows.find(x => x.lane === lane);
      if (row) row[side].push({ hero, position });
    });
  };
  addSide(ours, ourSide);
  addSide(theirs, enemySide);

  return { ourSide, enemySide, ours, theirs, lanes: laneRows };
}

export const positionName = position => ({
  safeCore: 'POS 1', mid: 'POS 2', offCore: 'POS 3', support4: 'POS 4', support5: 'POS 5',
}[position] || position);
