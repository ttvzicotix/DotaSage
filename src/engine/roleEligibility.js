export function matchesLane(hero, lane) {
  if (lane === 'all') return true;

  const lanes = (hero?.lanes || []).map(value => String(value).toLowerCase());
  const roles = (hero?.roles || []).map(value => String(value).toLowerCase());
  const hints = (hero?.roleHints || []).map(value => String(value).toLowerCase());
  const hasRole = role => roles.includes(role);
  const hasHint = role => hints.includes(role);
  const hasLane = laneName => lanes.includes(laneName);
  const isSupport = hasRole('support') || hasHint('support');

  // Curated lane data is authoritative when present. Valve/OpenDota role tags are
  // intentionally broad (e.g. Shadow Fiend/Mirana can carry) and are not position data.
  if (lane === 'safe') {
    if (lanes.length) return hasLane('safe') && (hasHint('carry') || (hasRole('carry') && !hasHint('support')));
    return hasRole('carry') && !isSupport;
  }
  if (lane === 'mid') {
    if (lanes.length) return hasLane('mid');
    return hasHint('mid') || (hasRole('carry') && hasRole('nuker') && !isSupport);
  }
  if (lane === 'off') {
    if (lanes.length) return hasLane('off');
    return hasHint('offlane') || (hasRole('durable') && (hasRole('initiator') || hasRole('disabler')));
  }
  if (lane === 'support4') {
    if (lanes.length) return isSupport && (hasLane('roam') || hasLane('off'));
    return isSupport && (hasRole('disabler') || hasRole('initiator') || hasRole('escape') || hasRole('nuker'));
  }
  if (lane === 'support5') {
    if (lanes.length) return isSupport && hasLane('safe');
    return isSupport && !hasRole('carry');
  }
  if (lane === 'jungle') return hasLane('jungle') || hasHint('jungle');
  if (lane === 'roam') {
    if (lanes.length) return hasLane('roam');
    return isSupport && (hasRole('escape') || hasRole('initiator') || hasRole('disabler'));
  }

  return true;
}
