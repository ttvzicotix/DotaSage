import { normalizeDotaAccountId } from '../utils/dotaAccountId';

// Public default profile seed.
// Never hardcode a real account ID, player name, private preference, or local data here.
function storedAccountId() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem('dotasage:player-account-id');
    const normalized = normalizeDotaAccountId(raw);
    if (!normalized) return null;
    if (raw !== normalized) window.localStorage.setItem('dotasage:player-account-id', normalized);
    return normalized;
  } catch {
    return null;
  }
}

export const DEFAULT_PROFILE = {
  accountId: storedAccountId(),
  displayName: 'Player',
  manualPreferences: {},
};
