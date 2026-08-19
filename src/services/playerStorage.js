const SNAPSHOT_PREFIX = 'dotasage:player-snapshot:';
const INDEX_KEY = 'dotasage:remembered-players';
const MAX_REMEMBERED = 8;

function validAccountId(value) {
  const text = String(value ?? '').trim();
  if (!/^\d+$/.test(text)) return null;
  const numeric = Number(text);
  return Number.isSafeInteger(numeric) && numeric > 0 && numeric <= 4294967295 ? text : null;
}

export function loadPlayerSnapshot(accountId) {
  const id = validAccountId(accountId);
  if (!id || typeof window === 'undefined') return null;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(`${SNAPSHOT_PREFIX}${id}`) || 'null');
    return parsed?.accountId === id ? parsed : null;
  } catch {
    return null;
  }
}

export function savePlayerSnapshot(accountId, snapshot = {}) {
  const id = validAccountId(accountId);
  if (!id || typeof window === 'undefined') return null;
  const existing = loadPlayerSnapshot(id) || {};
  const next = {
    ...existing,
    ...snapshot,
    accountId: id,
    savedAt: Date.now(),
  };
  try {
    window.localStorage.setItem(`${SNAPSHOT_PREFIX}${id}`, JSON.stringify(next));
    const current = listRememberedPlayers().filter(row => row.accountId !== id);
    const entry = {
      accountId: id,
      name: next.name || existing.name || `Dota ${id}`,
      avatar: next.avatar || existing.avatar || null,
      savedAt: next.savedAt,
    };
    window.localStorage.setItem(INDEX_KEY, JSON.stringify([entry, ...current].slice(0, MAX_REMEMBERED)));
    return next;
  } catch {
    return null;
  }
}

export function listRememberedPlayers() {
  if (typeof window === 'undefined') return [];
  try {
    const rows = JSON.parse(window.localStorage.getItem(INDEX_KEY) || '[]');
    return Array.isArray(rows) ? rows.filter(row => validAccountId(row?.accountId)).slice(0, MAX_REMEMBERED) : [];
  } catch {
    return [];
  }
}

export function forgetPlayerSnapshot(accountId) {
  const id = validAccountId(accountId);
  if (!id || typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(`${SNAPSHOT_PREFIX}${id}`);
    const next = listRememberedPlayers().filter(row => row.accountId !== id);
    window.localStorage.setItem(INDEX_KEY, JSON.stringify(next));
  } catch {}
}

export function forgetAllPlayerSnapshots() {
  if (typeof window === 'undefined') return;
  try {
    for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
      const key = window.localStorage.key(index);
      if (key?.startsWith(SNAPSHOT_PREFIX)) window.localStorage.removeItem(key);
    }
    window.localStorage.removeItem(INDEX_KEY);
  } catch {}
}
