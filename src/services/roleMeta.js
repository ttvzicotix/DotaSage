const cache = new Map();
const TTL = 30 * 60 * 1000;

const laneToPosition = {
  safe: 'POSITION_1',
  mid: 'POSITION_2',
  off: 'POSITION_3',
  support4: 'POSITION_4',
  support5: 'POSITION_5',
};

export function stratzPositionForLane(laneFilter) {
  return laneToPosition[laneFilter] || null;
}

export async function fetchRoleMeta(laneFilter) {
  const position = stratzPositionForLane(laneFilter);
  if (!position) return { provider: null, configured: false, position: null, rows: [] };

  const cached = cache.get(position);
  if (cached && Date.now() - cached.savedAt < TTL) return cached.value;

  try {
    const response = await fetch(`/api/meta?position=${encodeURIComponent(position)}`, {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`Role meta ${response.status}`);
    const value = await response.json();
    cache.set(position, { savedAt: Date.now(), value });
    return value;
  } catch {
    return { provider: null, configured: false, position, rows: [] };
  }
}
